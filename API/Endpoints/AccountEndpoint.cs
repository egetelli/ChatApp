using System;
using API.Common;
using API.DTOs;
using API.Modals;
using API.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace API.Endpoints;

public static class AccountEndpoint
{
    public static RouteGroupBuilder MapAccountEndpoint(this WebApplication app)
    {
        var group = app.MapGroup("/api/account").WithTags("account");

        group.MapPost("/register", async (HttpContext context, UserManager<AppUser> userManager,
        [FromForm] string fullName, [FromForm] string email,
        [FromForm] string password, [FromForm] string userName, [FromForm] IFormFile? profileImage) =>
        {
            var userFromDb = await userManager.FindByEmailAsync(email);

            if (userFromDb is not null)
            {
                return Results.BadRequest(Response<string>.Failure("User already exists."));
            }

            if (profileImage is null)
            {
                return Results.BadRequest(Response<string>.Failure("Profile image is required."));
            }

            var picture = await FileUpload.Upload(profileImage);
            picture = $"{context.Request.Scheme}://{context.Request.Host}/uploads/{picture}";

            var user = new AppUser
            {
                Email = email,
                FullName = fullName,
                UserName = userName,
                ProfileImage = picture,
            };

            var result = await userManager.CreateAsync(user, password);

            if (!result.Succeeded)
            {
                return Results.BadRequest(Response<string>.Failure(result.
                Errors.Select(x => x.Description).FirstOrDefault()!));
            }

            return Results.Ok(Response<string>.Success("", "User created successfully"));
        }).DisableAntiforgery();

        group.MapPost("/login", async (UserManager<AppUser> userManager, TokenService tokenService, LoginDto dto) =>
        {
            if (dto is null)
            {
                return Results.BadRequest(
                    Response<string>.Failure("Invalid login details!")
                );
            }

            var user = await userManager.FindByEmailAsync(dto.Email);

            if (user is null)
            {
                return Results.BadRequest(
                    Response<string>.Failure("User not found!")
                );
            }

            var result = await userManager.CheckPasswordAsync(user!, dto.Password);

            if (!result)
            {
                return Results.BadRequest(
                    Response<string>.Failure("Invalid password!")
                );
            }
            
            var token = tokenService.GenerateToken(user.Id, user.UserName!);

            return Results.Ok(Response<string>.Success(token, "Login successfully"));
        });
        return group;
    }
}



// MapAccountEndpoint için açıklama

// 1. Yapısal ve Yönlendirme Bileşenleri
// Bu kısımlar uygulamanın "adres defterini" ve genel yapısını kurar.

// WebApplication app:

// Bu, ASP.NET Core uygulamanızın kendisidir. Uygulamanın çalışması, istekleri dinlemesi ve yanıt vermesi için gereken her şey (konfigürasyon, servisler, middleware'ler) bu nesnenin içindedir.

// this WebApplication app ifadesi, bu metodun bir Extension Method (Genişletme Metodu) olduğunu gösterir. Yani Program.cs içinde app.MapAccountEndpoint() şeklinde çağırabilirsiniz.

// MapGroup("/api/account"):

// Uç noktaları (endpoint) gruplamaya yarar.

// Her seferinde /api/account/register, /api/account/login yazmak yerine; ana grubu /api/account olarak tanımlarsınız. İçindeki tüm rotalar bu öneki otomatik alır.

// Örnek: group.MapPost("/register", ...) dediğinizde, oluşan adres aslında /api/account/register olur.

// RouteGroupBuilder:

// MapGroup metodunun geriye döndürdüğü nesnedir.

// Bu nesne, oluşturduğunuz gruba toplu özellikler eklemenizi sağlar.

// Örneğin: .WithTags("account") dediğinizde, Swagger dokümantasyonunda bu gruptaki tüm metodlar "account" başlığı altında toplanır. Ayrıca tüm gruba yetkilendirme (authorization) veya filtreler eklemek için de kullanılır.

// 2. Parametreler ve Servisler (Dependency Injection & Binding)
// Bu kısımlar, metoda gelen veriyi ve işi yapacak araçları temsil eder.

// HttpContext context:

// O anki HTTP isteğiyle ilgili her şeyi barındıran nesnedir.

// İsteği yapan kullanıcının IP adresi, tarayıcı bilgisi (User-Agent), Header'lar, Cookie'ler ve Response (yanıt) nesnesi bunun içindedir.

// Not: Senin kodunda parametre olarak istenmiş ama kod bloğu içinde kullanılmamış. Eğer özel bir header okumayacaksanız burada gereksiz olabilir.

// UserManager<AppUser> userManager:

// ASP.NET Core Identity kütüphanesinin kalbidir.

// Kullanıcı oluşturma (CreateAsync), şifre hash'leme, veritabanında kullanıcı arama (FindByEmailAsync), şifre doğrulama gibi karmaşık güvenlik işlemlerini sizin yerinize yapar. Sizi SQL sorgusu yazmaktan kurtarır.

// [FromForm]:

// Bu bir Binding Attribute'tür. API'ye, verinin nereden geleceğini söyler.

// [FromForm], verinin multipart/form-data veya x-www-form-urlencoded olarak (yani klasik HTML form yapısında) geleceğini belirtir.

// Genellikle dosya yükleme işlemleri dışında, modern API'lerde veri JSON formatında gönderildiği için [FromBody] kullanılması daha yaygındır.

// Kodun Çalışma Mantığı (Özet)
// Kontrol: userManager kullanılarak verilen email ile kayıtlı bir kullanıcı var mı bakılır. Varsa 400 Bad Request döner.

// Hazırlık: Yeni bir AppUser nesnesi oluşturulur.

// Kayıt: userManager.CreateAsync(user, password) metodu çağrılır. Bu metod, şifreyi otomatik olarak güvenli bir şekilde hash'ler ve kullanıcıyı veritabanına kaydeder.

// Sonuç: İşlem başarısızsa (örn. şifre çok basitse) hatalar döndürülür; başarılıysa 200 OK ve başarı mesajı döner.