using System;
using API.Modals;

namespace API.DTOs;

public class MessageRequestDto
{
    public int Id { get; set; }
    public string? SenderId { get; set; }
    public string? ReceiverId { get; set; }
    public string? Content { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedDate { get; set; }
    public int? GroupId { get; set; }

    public MessageType MessageType { get; set; } = MessageType.Text;

    // Dosyanın sunucudaki yolu (Örn: /uploads/resim.jpg)
    public string? AttachmentUrl { get; set; }

    // Dosyanın orijinal adı (Örn: odevi.pdf)
    public string? AttachmentName { get; set; }


    public string? SenderProfileImage { get; set; }
    public string? SenderFullName { get; set; }
    public string? SenderUserName { get; set; }
}
