using System;

namespace API.Endpoints;

public static class ChatEndpoint
{
    public static RouteGroupBuilder MapChatEndpoint(this WebApplication app)
    {
        //1. Api Grup oluşturma
        var group = app.MapGroup("/api/chat").WithTags("chat");
        group.MapGet("/download/{fileName}", async (
            HttpContext context,
            IWebHostEnvironment env,
            string fileName
        ) =>
        {
            const long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

            // Güvenlik
            fileName = Path.GetFileName(fileName);

            var webRoot = env.WebRootPath
                        ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

            var uploadsFolder = Path.Combine(webRoot, "uploads");
            var filePath = Path.Combine(uploadsFolder, fileName);

            if (!System.IO.File.Exists(filePath))
                return Results.NotFound("Dosya bulunamadı");

            var fileInfo = new FileInfo(filePath);

            // 🚨 BOYUT KONTROLÜ
            if (fileInfo.Length > MAX_FILE_SIZE)
                return Results.StatusCode(StatusCodes.Status413PayloadTooLarge);

            var originalFileName = fileName.Contains('_')
                ? fileName[(fileName.IndexOf('_') + 1)..]
                : fileName;

            var stream = new FileStream(
                filePath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                bufferSize: 64 * 1024,
                useAsync: true
            );

            return Results.File(
                stream,
                contentType: "application/octet-stream",
                fileDownloadName: originalFileName,
                enableRangeProcessing: true // 🔥 kritik satır
            );
        });



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
