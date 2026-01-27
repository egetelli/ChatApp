using System;
using System.ComponentModel.DataAnnotations;

namespace API.DTOs;

public class CreateGroupDto
{
    [Required]
    public string GroupName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? GroupImage { get; set; } // Resmin URL'i buraya gelecek
    public bool IsPrivate { get; set; } = false;
    public string? GroupKey { get; set; }
}
