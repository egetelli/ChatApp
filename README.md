Harika bir proje ortaya çıkardık! Emeklerini güzelce sunacak, profesyonel, modern ve detaylı bir `README.md` dosyasını senin için hazırladım.

Bunu projenin kök dizinine `README.md` olarak kaydedebilirsin.

---

# 💬 Modern Real-Time Chat Application

Bu proje, modern web teknolojileri kullanılarak geliştirilmiş, yüksek performanslı ve ölçeklenebilir bir **gerçek zamanlı mesajlaşma uygulamasıdır**. Kullanıcıların bireysel sohbetler etmesine, gruplar kurmasına, medya paylaşmasına ve anlık bildirimler almasına olanak tanır.

## 🚀 Proje Hakkında

Bu uygulama, Backend tarafında **.NET Minimal APIs** ve **SignalR** mimarisinin hafifliği ve hızı üzerine kurulmuştur. Frontend tarafında ise **Angular**'ın güçlü bileşen yapısı ve **TailwindCSS**'in esnek tasarım yetenekleri kullanılarak modern bir arayüz sunulmuştur.

Veritabanı işlemleri **Entity Framework Core** ile Code-First yaklaşımı kullanılarak yönetilmektedir.

## ✨ Temel Özellikler

### 🔌 Gerçek Zamanlı İletişim

* **SignalR Entegrasyonu:** Mesajlar, bildirimler ve durum güncellemeleri (online/offline) anlık olarak iletilir.
* **Canlı Durum Takibi:** Kullanıcıların çevrimiçi/çevrimdışı durumları ve "yazıyor..." göstergeleri.

### 👥 Grup ve Bireysel Sohbet

* **Özel Mesajlaşma:** Kullanıcılar arası güvenli birebir sohbet.
* **Grup Yönetimi:** Grup oluşturma, üye ekleme/çıkarma.
* **Rol Yönetimi:** Grup yöneticisi atama (Admin yetkisi verme).

### 📁 Medya ve Dosya Paylaşımı

* **Görsel ve Dosya Gönderimi:** Sohbet içerisinde resim ve belge paylaşımı.
* **Görsel Önizleme:** Gönderilen resimlerin sohbet balonunda şık sunumu.
* **Profil Yönetimi:** Kullanıcı profil fotoğrafı yükleme ve otomatik avatar (UI Avatars) desteği.

### 🛠 Arayüz ve Deneyim

* **Responsive Tasarım:** TailwindCSS sayesinde tüm cihazlarda kusursuz görünüm.
* **Sonsuz Kaydırma (Infinite Scroll):** Geçmiş mesajları "Daha Fazla Yükle" özelliği ile performanslı listeleme.
* **Modern Bileşenler:** Angular Material ve özel Tailwind bileşenleri.

---

## 🏗 Teknoloji Yığını (Tech Stack)

Proje, endüstri standardı en güncel teknolojiler kullanılarak geliştirilmiştir.

### 🔙 Backend (.NET Core)

* **Framework:** .NET 8
* **API Mimarisi:** **Minimal APIs** (Hafif ve hızlı endpoint tanımlamaları)
* **Gerçek Zamanlı İletişim:** **SignalR** (WebSockets)
* **ORM:** **Entity Framework Core**
* **Veritabanı:** SQL Server (MSSQL)
* **Kimlik Doğrulama:** JWT (JSON Web Token) Bearer Authentication
* **Dosya Yönetimi:** Statik dosya sunucusu (Static Files)

### front Frontend (Angular)

* **Framework:** Angular 17+ (Standalone Components, Signals, Control Flow `@if`, `@for`)
* **Stil Kütüphanesi:** **TailwindCSS**
* **HTTP İstekleri:** Angular `HttpClient` & Interceptors
* **UI Bileşenleri:** Angular Material (Dialog, Snackbar, Icon)
* **Reaktif Programlama:** RxJS

---

## 📂 Proje Kurulumu

Projeyi yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin.

### Ön Gereksinimler

* [.NET 8 SDK](https://dotnet.microsoft.com/download)
* [Node.js](https://nodejs.org/) (LTS sürümü önerilir)
* [SQL Server](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) (veya LocalDB)

### 1. Backend Kurulumu

```bash
# Backend klasörüne gidin
cd API

# Bağımlılıkları yükleyin
dotnet restore

# appsettings.json dosyasındaki ConnectionString'i kendi veritabanınıza göre düzenleyin.

# Veritabanını oluşturun (Migration)
dotnet ef database update

# Uygulamayı başlatın
dotnet run
# API http://localhost:5000 adresinde çalışacaktır.

```

### 2. Frontend Kurulumu

```bash
# Frontend klasörüne gidin
cd Client

# Bağımlılıkları yükleyin
npm install

# Uygulamayı başlatın
ng serve
# Uygulama http://localhost:4200 adresinde çalışacaktır.

```

---

## 📷 Ekran Görüntüleri

| Sohbet Ekranı | Grup Yönetimi |
| --- | --- |
|  |  |
| *(eklenecek)* |  |

---

## 🔧 Yapılandırma

### Veritabanı Bağlantısı

`API/appsettings.json` dosyasında `DefaultConnection` alanını güncelleyin:

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost;Database=ChatAppDb;Trusted_Connection=True;TrustServerCertificate=True;"
}

```

### JWT Ayarları

Token üretimi için `appsettings.json` içinde `TokenKey` alanının güvenli bir değer olduğundan emin olun.

---

## 🤝 Katkıda Bulunma

1. Bu projeyi Forklayın.
2. Yeni bir özellik dalı oluşturun (`git checkout -b feature/YeniOzellik`).
3. Değişikliklerinizi commit edin (`git commit -m 'Yeni özellik eklendi'`).
4. Dalınızı Push edin (`git push origin feature/YeniOzellik`).
5. Bir Pull Request oluşturun.

---

## 📄 Lisans

Bu proje [MIT](https://www.google.com/search?q=LICENSE) lisansı ile lisanslanmıştır.
