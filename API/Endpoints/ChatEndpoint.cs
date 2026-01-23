using System;

namespace API.Endpoints;

public static class ChatEndpoint
{
    public static RouteGroupBuilder MapChatEndpoint(this WebApplication app)
    {
        //1. Api Grup oluşturma
        var group = app.MapGroup("/api/chat").WithTags("chat");

        //2. Upload Endpoint'i
        // IWebHostEnvironment: wwwroot yolunu bulmak için otomatik inject edilir.
        // IFormFile: Yüklenen dosyayı temsil eder.
        group.MapPost("/upload", async (IWebHostEnvironment environment, IFormFile file) =>
        {
            // A. Dosya Kontrolü: Dosya seçilmiş mi?
            if (file is null || file.Length == 0)
            {
                // Projenizdeki Response yapısına göre hata dönüşü
                // Örnek: return Results.BadRequest(Response<string>.Failure("Lütfen bir dosya seçiniz."));
                return Results.BadRequest(new { message = "Lütfen bir dosya seçiniz." });
            }

            // B. Klasör Yolu: wwwroot/uploads
            // IWebHostEnvironment servisi sayesinde kök dizini buluyoruz.
            var uploadsFolder = Path.Combine(environment.WebRootPath, "uploads");

            // Eğer klasör yoksa oluşturuyoruz
            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            // C. Benzersiz dosya ismi oluşturma
            // Aynı isimli dosyalar çakışmasın diye başına GUID ekliyoruz.
            string uniqueFileName = Guid.NewGuid().ToString() + "_" + file.FileName;

            // Dosyanın kaydedileceği tam fiziksel yol
            string filePath = Path.Combine(uploadsFolder, uniqueFileName);

            // D. Dosyayı fiziksel olarak kaydetme
            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(fileStream);
            }

            // E. Frontend'e dönecek url
            // Tarayıcının erişebileceği yol: /uploads/benzersiz_isim.jpg
            var fileUrl = $"/uploads/{uniqueFileName}";

            //Başarılı sonuç dönüyoruz
            return Results.Ok(new
            {
                url = fileUrl,
                originalName = file.FileName,
            });
        }).DisableAntiforgery();

        return group;
    }
}
