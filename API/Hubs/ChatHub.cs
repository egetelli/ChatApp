using System;

using System.Collections.Concurrent;

using API.Data;

using API.DTOs;

using API.Extensions;

using API.Modals;

using API.Models;

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

        var httpContext = Context.GetHttpContext();

        var receiverId = httpContext?.Request.Query["senderId"].ToString();

        var groupIdString = httpContext?.Request.Query["groupId"].ToString();

        var userName = Context.User!.Identity!.Name!;

        var currentUser = await userManager.FindByNameAsync(userName);

        var connectionId = Context.ConnectionId;



        if (onlineUsers.ContainsKey(userName))

        {

            onlineUsers[userName].ConnectionId = connectionId;

        }

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

            await Clients.AllExcept(connectionId).SendAsync("Notify", currentUser);

        }



        // Kullanıcının üye olduğu grupların odalarına (SignalR Groups) ekle

        var userGroups = await context.GroupMembers

            .Where(gm => gm.UserId == currentUser!.Id)

            .Select(gm => gm.GroupId)

            .ToListAsync();



        foreach (var groupId in userGroups)

        {

            await Groups.AddToGroupAsync(connectionId, "Group_" + groupId);

        }



        // Eğer kullanıcı direkt bir sohbetle geldiyse mesajları yükle

        if (!string.IsNullOrEmpty(receiverId))

        {

            // İkinci parametre (groupId) varsayılan null olduğu için artık hata vermez

            await LoadMessages(receiverId);

        }

        else if (!string.IsNullOrEmpty(groupIdString) && int.TryParse(groupIdString, out int openedGroupId))

        {

            await LoadMessages(null, openedGroupId);

        }



        await Clients.All.SendAsync("OnlineUsers", await GetAllUsers());

    }



    // DÜZELTME 1: groupId = null diyerek varsayılan değer atadık.

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

            // Sadece bu grubun mesajlarını getir

            query = query.Where(x => x.GroupId == groupId.Value);

        }

        else if (!string.IsNullOrEmpty(recipientId))

        {

            // Sadece bu kişiyle olan 1-1 mesajları getir

            query = query.Where(x => (x.ReceiverId == currentUser.Id && x.SenderId == recipientId)

                                  || (x.SenderId == currentUser.Id && x.ReceiverId == recipientId));

        }

        else

        {

            return;

        }



        // DÜZELTME 2: 'context.Messages' yerine yukarıda hazırladığımız 'query' değişkenini kullandık!

        // Eski kodunda burası context.Messages.Where(...) şeklindeydi ve yukarıdaki if/else boşa gidiyordu.

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

                GroupId = x.GroupId,

                MessageType = x.MessageType,

                AttachmentUrl = x.AttachmentUrl,

                AttachmentName = x.AttachmentName

            })

            .ToListAsync();



        // Okundu bilgisi (Sadece birebir mesajlar için)

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

            newMsg.GroupId = messageDto.GroupId.Value;

            context.Messages.Add(newMsg);

            await context.SaveChangesAsync();



            await Clients.Group("Group_" + messageDto.GroupId.Value).SendAsync("ReceiveNewMessage", newMsg);

        }

        else

        {

            newMsg.ReceiverId = messageDto.ReceiverId;

            context.Messages.Add(newMsg);

            await context.SaveChangesAsync();



            await Clients.User(messageDto.ReceiverId!).SendAsync("ReceiveNewMessage", newMsg);

            await Clients.Caller.SendAsync("ReceiveNewMessage", newMsg);

        }

    }



    public async Task NotifyTyping(string? recipientUserName, int? groupId = null)

    {

        var senderUserName = Context.User!.Identity!.Name!;



        if (groupId.HasValue)

        {

            await Clients.OthersInGroup("Group_" + groupId.Value).SendAsync("NotifyTypingToUser", senderUserName, groupId);

        }

        else if (!string.IsNullOrEmpty(recipientUserName))

        {

            var connectionId = onlineUsers.Values

                .FirstOrDefault(x => string.Equals(x.UserName, recipientUserName, StringComparison.OrdinalIgnoreCase))

                ?.ConnectionId;



            if (connectionId != null)

            {

                await Clients.Client(connectionId).SendAsync("NotifyTypingToUser", senderUserName);

            }

        }

    }



    public override async Task OnDisconnectedAsync(Exception? exception)

    {

        var userName = Context.User!.Identity!.Name!;

        onlineUsers.TryRemove(userName!, out _);

        await Clients.All.SendAsync("OnlineUsers", await GetAllUsers());

        await base.OnDisconnectedAsync(exception);

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

            UnreadCount = context.Messages.Count(x => x.ReceiverId == username && x.SenderId == u.Id && !x.IsRead)

        }).OrderByDescending(u => u.IsOnline)

        .ToListAsync();



        return users;

    }

}