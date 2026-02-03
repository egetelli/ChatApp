💬 Modern Real-Time Chat ApplicationBu proje, modern web teknolojileri kullanılarak geliştirilmiş, yüksek performanslı ve ölçeklenebilir bir gerçek zamanlı mesajlaşma uygulamasıdır. Kullanıcıların bireysel sohbetler etmesine, gruplar kurmasına, medya paylaşmasına ve anlık bildirimler almasına olanak tanır.🚀 Proje HakkındaBu uygulama, Backend tarafında .NET Minimal APIs ve SignalR mimarisinin hafifliği ve hızı üzerine kurulmuştur. Frontend tarafında ise Angular'ın güçlü bileşen yapısı ve TailwindCSS'in esnek tasarım yetenekleri kullanılarak modern bir arayüz sunulmuştur.Veritabanı işlemleri Entity Framework Core ile Code-First yaklaşımı kullanılarak yönetilmektedir.✨ Temel Özellikler🔌 Gerçek Zamanlı İletişimSignalR Entegrasyonu: Mesajlar, bildirimler ve durum güncellemeleri (online/offline) anlık olarak iletilir.Canlı Durum Takibi: Kullanıcıların çevrimiçi/çevrimdışı durumları ve "yazıyor..." göstergeleri.👥 Grup ve Bireysel SohbetÖzel Mesajlaşma: Kullanıcılar arası güvenli birebir sohbet.Grup Yönetimi: Grup oluşturma, üye ekleme/çıkarma.Rol Yönetimi: Grup yöneticisi atama (Admin yetkisi verme).📁 Medya ve Dosya PaylaşımıGörsel ve Dosya Gönderimi: Sohbet içerisinde resim ve belge paylaşımı.Görsel Önizleme: Gönderilen resimlerin sohbet balonunda şık sunumu.Profil Yönetimi: Kullanıcı profil fotoğrafı yükleme ve otomatik avatar (UI Avatars) desteği.🛠 Arayüz ve DeneyimResponsive Tasarım: TailwindCSS sayesinde tüm cihazlarda kusursuz görünüm.Sonsuz Kaydırma (Infinite Scroll): Geçmiş mesajları "Daha Fazla Yükle" özelliği ile performanslı listeleme.Modern Bileşenler: Angular Material ve özel Tailwind bileşenleri.🏗 Teknoloji Yığını (Tech Stack)Proje, endüstri standardı en güncel teknolojiler kullanılarak geliştirilmiştir.🔙 Backend (.NET Core)Framework: .NET 8API Mimarisi: Minimal APIs (Hafif ve hızlı endpoint tanımlamaları)Gerçek Zamanlı İletişim: SignalR (WebSockets)ORM: Entity Framework CoreVeritabanı: SQL Server (MSSQL)Kimlik Doğrulama: JWT (JSON Web Token) Bearer AuthenticationDosya Yönetimi: Statik dosya sunucusu (Static Files)front Frontend (Angular)Framework: Angular 17+ (Standalone Components, Signals, Control Flow @if, @for)Stil Kütüphanesi: TailwindCSSHTTP İstekleri: Angular HttpClient & InterceptorsUI Bileşenleri: Angular Material (Dialog, Snackbar, Icon)Reaktif Programlama: RxJS📂 Proje KurulumuProjeyi yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin.Ön Gereksinimler.NET 8 SDKNode.js (LTS sürümü önerilir)SQL Server (veya LocalDB)1. Backend KurulumuBash# Backend klasörüne gidin
cd API

# Bağımlılıkları yükleyin
dotnet restore

# appsettings.json dosyasındaki ConnectionString'i kendi veritabanınıza göre düzenleyin.

# Veritabanını oluşturun (Migration)
dotnet ef database update

# Uygulamayı başlatın
dotnet run
# API http://localhost:5000 adresinde çalışacaktır.
2. Frontend KurulumuBash# Frontend klasörüne gidin
cd Client

# Bağımlılıkları yükleyin
npm install

# Uygulamayı başlatın
ng serve
# Uygulama http://localhost:4200 adresinde çalışacaktır.
📷 Ekran GörüntüleriSohbet EkranıGrup Yönetimi(Buraya projenin ekran görüntülerini ekleyebilirsiniz)🔧 YapılandırmaVeritabanı BağlantısıAPI/appsettings.json dosyasında DefaultConnection alanını güncelleyin:JSON"ConnectionStrings": {
  "DefaultConnection": "Server=localhost;Database=ChatAppDb;Trusted_Connection=True;TrustServerCertificate=True;"
}
JWT AyarlarıToken üretimi için appsettings.json içinde TokenKey alanının güvenli bir değer olduğundan emin olun.🤝 Katkıda BulunmaBu projeyi Forklayın.Yeni bir özellik dalı oluşturun (git checkout -b feature/YeniOzellik).Değişikliklerinizi commit edin (git commit -m 'Yeni özellik eklendi').Dalınızı Push edin (git push origin feature/YeniOzellik).Bir Pull Request oluşturun.📄 LisansBu proje MIT lisansı ile lisanslanmıştır.
