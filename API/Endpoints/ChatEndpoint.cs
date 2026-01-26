using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using System;
using System.IO;
using System.Threading.Tasks;
using System.Security.Cryptography; // Hashing için gerekli

public static class ChatEndpoint
{
    public static RouteGroupBuilder MapChatEndpoint(this WebApplication app)
    {
        var group = app.MapGroup("/api/chat").WithTags("Chat");

        // -----------------------------------------------------------------------
        // 1. DOWNLOAD ENDPOINT (Değişiklik yok, aynı kalıyor)
        // -----------------------------------------------------------------------
        group.MapGet("/download/{fileName}", async (
            HttpContext context,
            IWebHostEnvironment env,
            string fileName
        ) =>
        {
            const long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

            fileName = Path.GetFileName(fileName);
            var webRoot = env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var uploadsFolder = Path.Combine(webRoot, "uploads");
            var filePath = Path.Combine(uploadsFolder, fileName);

            if (!System.IO.File.Exists(filePath))
                return Results.NotFound("Dosya bulunamadı");

            var fileInfo = new FileInfo(filePath);

            if (fileInfo.Length > MAX_FILE_SIZE)
                return Results.StatusCode(StatusCodes.Status413PayloadTooLarge);

            // İndirirken orijinal ismini bulmaya çalışamayız çünkü hashledik.
            // Frontend zaten "attachmentName"i biliyor ve indirme isteğini o isimle yapıyor.
            // Burası sadece binary akışı sağlar.

            var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read, 64 * 1024, true);

            return Results.File(
                stream,
                contentType: "application/octet-stream",
                fileDownloadName: fileName, // Frontend'deki 'download' attribute'u asıl ismi belirler
                enableRangeProcessing: true
            );
        });

        // -----------------------------------------------------------------------
        // 2. UPLOAD ENDPOINT (HASHING İLE GÜNCELLENDİ)
        // -----------------------------------------------------------------------
        group.MapPost("/upload", async (IWebHostEnvironment environment, IFormFile file) =>
        {
            if (file is null || file.Length == 0)
            {
                return Results.BadRequest(new { message = "Lütfen bir dosya seçiniz." });
            }

            var uploadsFolder = Path.Combine(environment.WebRootPath, "uploads");
            if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

            // --- DEĞİŞİKLİK BAŞLANGICI ---

            // 1. Dosyanın uzantısını al (.jpg, .pdf vs.)
            var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();

            // 2. Dosyanın içeriğinin Hash'ini hesapla (SHA-256)
            string fileHash;
            using (var sha256 = SHA256.Create())
            {
                // Dosya akışını açıp hashliyoruz
                using (var stream = file.OpenReadStream())
                {
                    var hashBytes = await sha256.ComputeHashAsync(stream);
                    // Byte dizisini string'e çevir (örn: "A1B2C3...")
                    fileHash = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
                }
            }

            // 3. Yeni dosya adı: Hash + Uzantı
            // Örn: "8a45d...f9a.png"
            string uniqueFileName = fileHash + fileExtension;
            string filePath = Path.Combine(uploadsFolder, uniqueFileName);
            string fileUrl = $"/uploads/{uniqueFileName}";

            // 4. BU DOSYA DAHA ÖNCE YÜKLENMİŞ Mİ?
            if (System.IO.File.Exists(filePath))
            {
                // Zaten varsa tekrar kaydetme! Var olanın URL'ini dön.
                // Bu sayede diskten tasarruf ederiz.
                return Results.Ok(new
                {
                    url = fileUrl,
                    originalName = file.FileName,
                    message = "Dosya zaten sunucuda mevcut, tekrar yüklenmedi." // Bilgi amaçlı
                });
            }

            // 5. Yoksa fiziksel olarak kaydet
            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(fileStream);
            }

            // --- DEĞİŞİKLİK BİTİŞİ ---

            return Results.Ok(new
            {
                url = fileUrl,
                originalName = file.FileName
            });

        }).DisableAntiforgery();

        return group;
    }
}