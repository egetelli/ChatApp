using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace API.Hubs;

[Authorize]
public class VideoChatHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        Console.WriteLine("Connected UserIdentifier: " + Context.UserIdentifier);
        await base.OnConnectedAsync();
    }

    public async Task SendOffer(string receiverId, string offer)
    {
        await Clients.User(receiverId).SendAsync("ReceiveOffer", Context.UserIdentifier, offer);
    }

    public async Task SendAnswer(string receiverId, string answer)
    {
        await Clients.User(receiverId).SendAsync("ReceiveAnswer", Context.UserIdentifier, answer);
    }

    public async Task SendIceCandidate(string receiverId, string candidate)
    {
        await Clients.User(receiverId).SendAsync("ReceiveIceCandidate", Context.UserIdentifier, candidate);
    }

    public async Task EndCall(string receiverId)
    {
        await Clients.User(receiverId).SendAsync("CallEnded");
    }
}
