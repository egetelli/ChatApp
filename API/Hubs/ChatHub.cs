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
        // 7. Eğer kullanıcı direkt bir sohbet penceresiyle geldiyse, eski mesajları yükle.
        if (!string.IsNullOrEmpty(receiverId))
        {
            await LoadMessages(receiverId);
        }
        // 8. Bağlanan kişiye "İşte güncel online kullanıcı listesi" de ve listeyi gönder.
        await Clients.All.SendAsync("OnlineUsers", await GetAllUsers());
    }

    public async Task LoadMessages(string recipientId, int pageNumber = 1)
    {
        int pageSize = 10;
        // ... (Kullanıcı kontrolü)
        var userName = Context.User!.Identity!.Name!;
        var currentUser = await userManager.FindByNameAsync(userName);

        if(currentUser is null)
        {
            return;
        }
        // 1. Veritabanından mesajları çek.
        // Mantık: (Gönderen BEN ve Alan O) VEYA (Gönderen O ve Alan BEN) olan mesajları getir.
        List<MessageResponseDto> messages = await context.Messages
        .Where(x => x.ReceiverId == currentUser!.Id && x.SenderId ==
        recipientId || x.SenderId == currentUser!.Id && x.ReceiverId == recipientId)
        .OrderByDescending(x => x.CreatedDate)
        .Skip((pageNumber - 1)* pageSize)
        .Take(pageSize)
        .OrderBy(x => x.CreatedDate)
        .Select(x => new MessageResponseDto
        {
            Id = x.Id,
            Content = x.Content,
            CreatedDate = x.CreatedDate,
            ReceiverId = x.ReceiverId,
            SenderId = x.SenderId
        })
        .ToListAsync();
        // 2. "Görüldü" (Okundu) İşlemi
        // Eğer karşıdan gelen mesajları şu an çekiyorsam, onları "Okundu" olarak işaretle.
        foreach (var message in messages)
        {
            var msg = await context.Messages.FirstOrDefaultAsync(x => x.Id == message.Id);
            // ... Eğer mesaj bana gelmişse IsRead = true yap ve kaydet.
            if(msg != null && msg.ReceiverId == currentUser.Id)
            {
                msg.IsRead = true;
                await context.SaveChangesAsync();
            }
        }
        // 3. Mesaj listesini SADECE isteği yapan kişiye gönder (Clients.User).
        await Clients.User(currentUser.Id)
        .SendAsync("ReceiveMessageList", messages);
    }

    public async Task SendMessage(MessageRequestDto message)
    {
        var senderId = Context.User!.Identity!.Name;
        var recipientId = message.ReceiverId;
        // 1. Mesajı veritabanı nesnesine (Entity) çevir.
        var newMsg = new Message
        {
            Sender = await userManager.FindByNameAsync(senderId!),
            Receiver = await userManager.FindByIdAsync(recipientId!),
            IsRead = false,
            CreatedDate = DateTime.UtcNow,
            Content = message.Content,
        };
        // 2. Veritabanına kaydet (Kalıcılık için şart).
        context.Messages.Add(newMsg);
        await context.SaveChangesAsync();
        // 3. SIGNALR BÜYÜSÜ: Mesajı veritabanına yazdık ama karşı tarafın ekranına ANINDA düşmesi lazım.
        // Clients.User(recipientId) -> Sadece alıcı ID'ye sahip kişinin ekranına "ReceiveNewMessage" komutu yolla.
        await Clients.User(recipientId!).SendAsync("ReceiveNewMessage", newMsg);
    }

    public async Task NotifyTyping(string recipientUserName)
    {
        var senderUserName = Context.User!.Identity!.Name!;

        if(senderUserName is null)
        {
            return;
        }
        // 1. Kime yazıyorum? Onun kullanıcı adını bul.
        // 2. O kullanıcı şu an online mı? (onlineUsers sözlüğüne bak).
        var connectionId = onlineUsers.Values.FirstOrDefault(x => x.UserName == recipientUserName)?.ConnectionId;

        // 3. Eğer online ise, onun bağlantısına "NotifyTypingToUser" sinyali gönder.
        // "Bak şu an sana biri (senderUserName) bir şeyler yazıyor" de.
        if(connectionId != null)
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
