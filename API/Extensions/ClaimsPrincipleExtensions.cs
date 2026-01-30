using System;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt; // Bu kütüphane projenin içinde vardır, yoksa string olarak "sub" yazacağız.

namespace API.Extensions;

public static class ClaimsPrincipleExtensions
{
    public static string GetUserName(this ClaimsPrincipal user)
    {
        // Önce standart isme bak, bulamazsan "unique_name" veya "name" alanlarına bak
        var username = user.FindFirstValue(ClaimTypes.Name)
                       ?? user.FindFirstValue("name")
                       ?? user.FindFirstValue("unique_name");

        if (string.IsNullOrEmpty(username))
            throw new Exception("Cannot get username");

        return username;
    }

    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        // 1. Adım: Standart .NET Claim yapısına bak
        var id = user.FindFirstValue(ClaimTypes.NameIdentifier);

        // 2. Adım: Eğer boşsa, JWT standartı olan "sub" (Subject) alanına bak
        if (string.IsNullOrEmpty(id))
        {
            id = user.FindFirstValue("sub");
        }

        // 3. Adım: Eğer hala boşsa, basitçe "id" olarak kaydedilmiş olabilir, ona bak
        if (string.IsNullOrEmpty(id))
        {
            id = user.FindFirstValue("id");
        }

        // 4. Adım: Hiçbiri yoksa hata fırlat
        if (string.IsNullOrEmpty(id))
        {
            throw new Exception("Cannot get userid - Token içerisinde ID bilgisi bulunamadı.");
        }

        return Guid.Parse(id);
    }
}