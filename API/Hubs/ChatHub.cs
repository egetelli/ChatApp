using System;
using System.Collections.Concurrent;
using API.Data;
using API.DTOs;
using API.Extensions;
using API.Modals;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace API.Hubs;

[Authorize]
public class ChatHub(UserManager<AppUser> userManager, AppDbContext context) : Hub
{
    public static readonly ConcurrentDictionary<string, OnlineUserDto> onlineUsers = new();

    public override async Task OnConnectedAsync()
    {
        // 1. Gelen isteğin detaylarını al.
        var httpContext = Context.GetHttpContext();
        // 2. Eğer kullanıcı URL'de ?senderId=... ile geldiyse (yani direkt bir sohbeti açtıysa) o ID'yi al.
        var receiverId = httpContext?.Request.Query["senderId"].ToString();
        // 3. Bağlanan kişinin kim olduğunu (UserName) ve bağlantı kimliğini (ConnectionId) al.
        var userName = Context.User!.Identity!.Name!;
        var currentUser = await userManager.FindByNameAsync(userName);
        var connectionId = Context.ConnectionId;
        // 4. Bu kişi zaten listede var mı? Varsa bağlantı ID'sini güncelle. Yoksa yeni bir kayıt oluştur.
        if (onlineUsers.ContainsKey(userName))
        {
            onlineUsers[userName] = connectionId;
        }
        // 5. Yoksa yeni bir "Online Kullanıcı" objesi oluştur ve listeye ekle.
        // ... (User bilgileri dolduruluyor)
        else
        {
            var user = new OnlineUserDto
            {
                ConnectionId = connectionId,
                UserName = userName,
                ProfileImage = currentUser!.ProfileImage,
                FullName = currentUser!.FullName
            };

            onlineUsers.TryAdd(userName, user);
            // 6. ÖNEMLİ: Odaya giren kişi HARİÇ herkese "Bakın bu kullanıcı geldi" diye haber ver.
            await Clients.AllExcept(connectionId).SendAsync("Notify",
            currentUser);
        }

        var userGroups = await context.GroupMembers
            .Where(gm => gm.UserId == currentUser!.Id)
            .Select(gm => gm.GroupId)
            .ToListAsync();
        foreach (var groupId in userGroups)
        {
            await Groups.AddToGroupAsync(connectionId, "Group_" + groupId);
        }

        // 7. Eğer kullanıcı direkt bir sohbet penceresiyle geldiyse, eski mesajları yükle.
        if (!string.IsNullOrEmpty(receiverId))
        {
            // DÜZELTME: İkinci parametre (groupId) varsayılan null olduğu için hata vermez.
            await LoadMessages(receiverId);
        }
        // 8. Bağlanan kişiye "İşte güncel online kullanıcı listesi" de ve listeyi gönder.
        await Clients.All.SendAsync("OnlineUsers", await GetAllUsers());
    }

    public async Task LoadMessages(string? recipientId, int? groupId = null, int pageNumber = 1)
    {
        int pageSize = 10;
        var userName = Context.User!.Identity!.Name!;
        var currentUser = await userManager.FindByNameAsync(userName);

        if (currentUser is null) return;

        IQueryable<Message> query = context.Messages;

        // Filtreleme Mantığı
        if (groupId.HasValue)
        {
            query = query.Where(x => x.GroupId == groupId.Value);
        }
        else if (!string.IsNullOrEmpty(recipientId))
        {
            query = query.Where(x => x.ReceiverId == currentUser.Id && x.SenderId == recipientId
                                 || x.SenderId == currentUser.Id && x.ReceiverId == recipientId);
        }
        else
        {
            // İkisi de yoksa mesaj döndürme
            return;
        }

        // DÜZELTME 2: 'context.Messages' yerine yukarıda hazırladığımız 'query' değişkenini kullandık.
        List<MessageResponseDto> messages = await query
            .OrderByDescending(x => x.CreatedDate)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .OrderBy(x => x.CreatedDate)
            .Select(x => new MessageResponseDto
            {
                Id = x.Id,
                Content = x.Content,
                CreatedDate = x.CreatedDate,
                ReceiverId = x.ReceiverId,
                SenderId = x.SenderId,

                // Grup ve Dosya Bilgileri
                GroupId = x.GroupId,
                MessageType = x.MessageType,
                AttachmentUrl = x.AttachmentUrl,
                AttachmentName = x.AttachmentName
            })
            .ToListAsync();

        // Okundu Bilgisi (Sadece birebir mesajlar için)
        if (!groupId.HasValue)
        {
            foreach (var message in messages)
            {
                var msg = await context.Messages.FirstOrDefaultAsync(x => x.Id == message.Id);
                if (msg != null && msg.ReceiverId == currentUser.Id)
                {
                    msg.IsRead = true;
                }
            }
            await context.SaveChangesAsync();
        }

        await Clients.User(currentUser.Id).SendAsync("ReceiveMessageList", messages);
    }

    public async Task SendMessage(MessageRequestDto messageDto)
    {
        var userName = Context.User!.Identity!.Name!;
        var sender = await userManager.FindByNameAsync(userName);

        var newMsg = new Message
        {
            SenderId = sender!.Id,
            Content = messageDto.Content,
            MessageType = messageDto.MessageType,
            AttachmentUrl = messageDto.AttachmentUrl,
            AttachmentName = messageDto.AttachmentName,
            CreatedDate = DateTime.UtcNow,
            IsRead = false
        };

        if (messageDto.GroupId.HasValue)
        {
            // Grup Mesajı
            newMsg.GroupId = messageDto.GroupId.Value;
            context.Messages.Add(newMsg);
            await context.SaveChangesAsync();

            await Clients.Group("Group_" + messageDto.GroupId.Value).SendAsync("ReceiveNewMessage", newMsg);
        }
        else
        {
            // Birebir Mesaj
            newMsg.ReceiverId = messageDto.ReceiverId;
            context.Messages.Add(newMsg);
            await context.SaveChangesAsync();

            await Clients.User(messageDto.ReceiverId!).SendAsync("ReceiveNewMessage", newMsg);
            await Clients.Caller.SendAsync("ReceiveNewMessage", newMsg);
        }
    }

    public async Task NotifyTyping(string recipientUserName)
    {
        var senderUserName = Context.User!.Identity!.Name!;

        if (senderUserName is null)
        {
            return;
        }
        // 1. Kime yazıyorum? Onun kullanıcı adını bul.
        // 2. O kullanıcı şu an online mı? (onlineUsers sözlüğüne bak).
        var connectionId = onlineUsers.Values
        .FirstOrDefault(x => string.Equals(x.UserName, recipientUserName, StringComparison.OrdinalIgnoreCase))
        ?.ConnectionId;

        // 3. Eğer online ise, onun bağlantısına "NotifyTypingToUser" sinyali gönder.
        // "Bak şu an sana biri (senderUserName) bir şeyler yazıyor" de.
        if (connectionId != null)
        {
            await Clients.Client(connectionId).SendAsync("NotifyTypingToUser",
            senderUserName);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userName = Context.User!.Identity!.Name!;
        onlineUsers.TryRemove(userName!, out _);
        await Clients.All.SendAsync("OnlineUsers", await GetAllUsers());
    }

    private async Task<IEnumerable<OnlineUserDto>> GetAllUsers()
    {
        var username = Context.User!.GetUserName();

        var onlineUsersSet = new HashSet<string>(onlineUsers.Keys);

        var users = await userManager.Users.Select(u => new OnlineUserDto
        {
            Id = u.Id,
            UserName = u.UserName,
            FullName = u.FullName,
            ProfileImage = u.ProfileImage,
            IsOnline = onlineUsersSet.Contains(u.UserName!),
            UnreadCount = context.Messages.Count(x => x.ReceiverId == username &&
            x.SenderId == u.Id && !x.IsRead)
        }).OrderByDescending(u => u.IsOnline)
        .ToListAsync();

        return users;
    }
}
