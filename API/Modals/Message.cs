using System;

namespace API.Modals;

public class Message
{
    public int Id { get; set; }
    public string? SenderId { get; set; }
    public string? ReceiverId { get; set; }
    public string? Content { get; set; }
    public DateTime CreatedDate { get; set; }
    public bool IsRead { get; set; }
    public AppUser? Sender { get; set; }
    public AppUser? Receiver { get; set; }

    // --- YENİ EKLENEN ALANLAR ---
    public MessageType MessageType { get; set; } = MessageType.Text; // Varsayılan: Text
    public string? AttachmentUrl { get; set; } // Dosyanın sunucudaki yolu
    public string? AttachmentName { get; set; } // Dosyanın orijinal adı (örn: ödev.pdf)
}

public enum MessageType
{
    Text = 1,
    Image = 2,
    File = 3
}