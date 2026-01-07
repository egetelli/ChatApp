using System;
using Microsoft.AspNetCore.Identity;

namespace API.Modals;

public class AppUser : IdentityUser
{
    public string? FullName { get; set; }
    public string? ProfileImage { get; set; }
}
