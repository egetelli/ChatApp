using System.Text;
using API.Data;
using API.Endpoints;
using API.Modals;
using API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

//Uygulamanın temelini (konfigürasyon, loglama vb.) hazırlar. Bir nevi inşaata başlamadan önceki iskele kurulumudur.
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(
    options =>
    {
        options.AddDefaultPolicy(builder =>
        {
            builder.WithOrigins("http://localhost:4200", "https://localhost:4200")
            .AllowAnyHeader().AllowAnyMethod().AllowCredentials();
        });
    }
);

//appsettings.json dosyasındaki "JWTSettings" bölümünü okur. Token üretirken ve çözerken kullanacağın gizli anahtarı (Secret Key) buradan alacağız.
var JwtSetting = builder.Configuration.GetSection("JWTSettings");

//AddDbContext: Uygulamanın veritabanı ile konuşmasını sağlar.
//UseSqlite: Hafif bir veritabanı olan SQLite kullanılacağını belirtir. Veritabanı dosyasının adı chat.db olacaktır.
builder.Services.AddDbContext<AppDbContext>(x => x.UseSqlite("Data Source=chat.db"));

//AddIdentityCore: .NET'in hazır kullanıcı yönetim sistemini (Login, Register işlemleri için) projeye ekler. AppUser senin özel kullanıcı sınıfındır.
//AddEntityFrameworkStores: Kullanıcı verilerini (şifre, email vb.) yukarıda tanımladığın AppDbContext üzerinden veritabanında saklamasını söyler.
builder.Services.AddIdentityCore<AppUser>()
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

builder.Services.AddScoped<TokenService>();

//AddAuthentication: Sisteme "Ben kimlik doğrulama yapacağım" der.
builder.Services.AddAuthentication(opt =>
{
    opt.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme; //Sisteme, "Kullanıcıları tanımak için Cookie değil, JWT Token beklemelisin" kuralını koyar.
    opt.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    opt.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(option =>
{
    option.SaveToken = true; // Token sunucuda saklansın mı? (Genelde false olabilir ama true da kalabilir)
    option.RequireHttpsMetadata = false;
    option.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true, // "İmza anahtarını mutlaka kontrol et" (Sahte tokenları engeller).
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes // Kontrol edilecek o gizli anahtar budur.
        (JwtSetting.GetSection("SecurityKey").Value!)),
        ValidateIssuer = false, // Token'ı kimin dağıttığını kontrol etme (Geliştirme aşamasında kolaylık).
        ValidateAudience = false, // Token'ın kime verildiğini kontrol etme.
    };

    option.Events = new JwtBearerEvents
    {
      OnMessageReceived = context =>
      {
          var accessToken = context.Request.Query["access_token"];
          var path = context.HttpContext.Request.Path;

          if(!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
          {
              context.Token = accessToken;
          }

          return Task.CompletedTask;
      }  
    };
});
builder.Services.AddAuthorization();
// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddSignalR();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // Sadece geliştirme modundaysan API dökümantasyonunu aktif et.
}

app.UseCors(x => x.AllowAnyHeader().AllowAnyMethod()
                .AllowCredentials().WithOrigins("http://localhost:4200", "https://localhost:4200"));

app.UseHttpsRedirection(); // HTTP isteklerini zorla HTTPS'e çevirir (Güvenlik).
app.UseAuthentication(); // 1. ÖNCE KİMLİK KONTROLÜ: "Sen kimsin? Token'ın geçerli mi?"
app.UseAuthorization(); // 2. SONRA YETKİ KONTROLÜ: "Senin bu sayfaya girmeye iznin var mı?"
app.UseStaticFiles();
app.MapAccountEndpoint();

app.Run(); // Uygulamayı başlat ve istekleri dinlemeye başla.