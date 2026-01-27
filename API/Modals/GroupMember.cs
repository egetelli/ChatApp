using System.Text.RegularExpressions;
using API.Modals;

namespace API.Models; // Namespace "Models" olsun, Modals (pencere) değil :)

public class GroupMember
{
    // İlişkiler
    public int GroupId { get; set; }
    public Group Group { get; set; } = null!;

    public string UserId { get; set; } = string.Empty;
    public AppUser User { get; set; } = null!;

    // Ekstra Bilgiler (İşte burası hayat kurtarır)
    public bool IsAdmin { get; set; } = false; // Kullanıcı yönetici mi?
    public DateTime JoinedDate { get; set; } = DateTime.UtcNow; // Ne zaman katıldı?
}