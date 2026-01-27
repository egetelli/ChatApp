using API.Modals;
using API.Models;

public class Group
{
    public int Id { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public string? GroupKey { get; set; }
    public string? Description { get; set; }
    public bool IsPrivate { get; set; } = false;
    public string? GroupImage { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    public string CreatorId { get; set; } = string.Empty;
    public AppUser? Creator { get; set; }

    public ICollection<GroupMember> GroupMembers { get; set; } = new List<GroupMember>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}