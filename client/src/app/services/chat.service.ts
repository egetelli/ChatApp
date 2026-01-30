import { inject, Injectable, signal } from '@angular/core';
import { User } from '../models/user';
import { AuthService } from './auth.service';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
} from '@microsoft/signalr';
import { Message } from '../models/message';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Group } from '../models/group';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:5000/api/chat';
  private groupUrl = 'http://localhost:5000/api/group'; // Grup işlemleri için Base URL
  private hubUrl = 'http://localhost:5000/hubs/chat';

  onlineUsers = signal<User[]>([]);
  myGroups = signal<Group[]>([]);
  // currentOpenedChat hem User hem de Grup bilgisi tutabileceği için tipini genişletebiliriz
  // Şimdilik User üzerinden gidiyoruz, ileride Group modelini de ekleriz.
  currentOpenedChat = signal<User | null>(null);
  currentOpenedGroup = signal<Group | null>(null);

  chatMessages = signal<Message[]>([]);
  isLoading = signal<boolean>(true);

  private hubConnection?: HubConnection;

  // -------------------------------------------------------------------------
  // 1. BAĞLANTIYI BAŞLATMA (Grup Desteği Eklendi)
  // -------------------------------------------------------------------------
  startConnection(token: string, groupId?: string, senderId?: string) {
    // URL'i dinamik oluşturuyoruz
    let url = this.hubUrl;

    if (senderId) {
      // Birebir sohbet geçmişi için
      url += `?senderId=${senderId}`;
    } else if (groupId) {
      // Grup sohbet geçmişi için (Backend'de eklediğimiz mantık)
      url += `?groupId=${groupId}`;
    }

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('SignalR Bağlantısı Başladı. URL:', url);
        this.getGroups();
      })
      .catch((error) => {
        console.log('Bağlantı hatası:', error);
      });

    // --- LİSTENER'LAR (Dinleyiciler) ---

    this.registerListeners();
  }

  private registerListeners() {
    if (!this.hubConnection) return;
    this.hubConnection.on('Notify', (user: User) => {
      Notification.requestPermission().then((result) => {
        if (result == 'granted') {
          new Notification('Yeni Giriş 🌐', {
            body: user.fullName + ' çevrimiçi oldu.',
            icon: user.profileImage,
          });
        }
      });
    });

    this.hubConnection.on('OnlineUsers', (users: User[]) => {
      this.onlineUsers.update(() =>
        users.filter(
          (u) => u.userName !== this.authService.currentLoggedInUser?.userName,
        ),
      );
    });

    this.hubConnection.on('NotifyTypingToUser', (senderUserName) => {
      this.handleTypingVisuals(senderUserName);
    });

    // --- MESAJ LİSTESİ GELDİĞİNDE ---
    this.hubConnection.on('ReceiveMessageList', (messages) => {
      this.chatMessages.set(messages);
      this.isLoading.set(false);
    });

    // --- YENİ MESAJ GELDİĞİNDE (KRİTİK KONTROL) ---
    this.hubConnection.on('ReceiveNewMessage', (message: Message) => {
      // 1. Gelen mesaj şu an açık olan KİŞİDEN mi geliyor?
      const isChatOpen =
        this.currentOpenedChat() &&
        (this.currentOpenedChat()?.id === message.senderId ||
          this.currentOpenedChat()?.id === message.receiverId);

      // 2. Gelen mesaj şu an açık olan GRUPTAN mı geliyor?
      const isGroupOpen =
        this.currentOpenedGroup() &&
        this.currentOpenedGroup()?.groupId === message.groupId;

      // Sadece ilgili pencere açıksa mesajı listeye ekle
      if (isChatOpen || isGroupOpen) {
        this.chatMessages.update((msgs) => [...msgs, message]);
        // Scroll'u aşağı kaydırmak için bir event fırlatılabilir veya component effect kullanabilir.
      } else {
        // Başka bir yerden mesaj geldi, belki bildirim (toast) gösterebilirsin
        console.log('Yeni mesaj var (Arkaplanda):', message);
        document.title = '(1) Yeni Mesaj';
      }
    });
  }

  // Helper: Typing kodunu temiz tutmak için ayırdım
  private handleTypingVisuals(senderUserName: string) {
    this.onlineUsers.update((users) =>
      users.map((user) => {
        if (user.userName.toLowerCase() === senderUserName.toLowerCase()) {
          return { ...user, isTyping: true };
        }
        return user;
      }),
    );
    setTimeout(() => {
      this.onlineUsers.update((users) =>
        users.map((user) => {
          if (user.userName.toLowerCase() === senderUserName.toLowerCase()) {
            return { ...user, isTyping: false };
          }
          return user;
        }),
      );
    }, 3000);
  }

  async stopConnection() {
    if (
      this.hubConnection &&
      this.hubConnection.state !== HubConnectionState.Disconnected
    ) {
      try {
        await this.hubConnection.stop();
        console.log('SignalR bağlantısı durduruldu.');
      } catch (error) {
        console.error('Bağlantı durdurulurken hata:', error);
      }
    }
  }

  // -------------------------------------------------------------------------
  // 2. DOSYA YÜKLEME
  // -------------------------------------------------------------------------
  uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string; originalName: string }>(
      `${this.apiUrl}/upload`,
      formData,
    );
  }

  // -------------------------------------------------------------------------
  // 3. GRUP İŞLEMLERİ (YENİ EKLENEN BÖLÜM)
  // -------------------------------------------------------------------------
  createGroup(groupData: {
    groupName: string;
    description: string;
    groupKey: string;
    isPrivate: boolean;
    groupImage: string;
  }) {
    // Backend: POST /api/group/create
    const token = localStorage.getItem('token'); // Veya senin authService.accessToken

    // 2. Header oluştur
    const headers = { Authorization: `Bearer ${token}` };

    // 3. İsteği header ile gönder
    return this.http.post(`${this.groupUrl}/create`, groupData, {
      headers: headers,
    });
  }

  getGroups() {
    // 1. Token'ı LocalStorage'dan al
    // DİKKAT: Giriş yaparken kaydettiğin isim 'token' mı, 'accessToken' mı? Kontrol et.
    const token = localStorage.getItem('token');

    // 2. Header (Başlık) ayarlarını oluştur
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    // 3. İsteği headers opsiyonu ile gönder
    this.http
      .get<Group[]>(`${this.groupUrl}/my-groups`, { headers: headers })
      .subscribe({
        next: (groups) => {
          this.myGroups.set(groups); // Sinyali güncelle
        },
        error: (err) => console.error('Gruplar çekilemedi:', err),
      });
  }

  // -------------------------------------------------------------------------
  // 4. MESAJ GÖNDERME (Grup Desteği Eklendi)
  // -------------------------------------------------------------------------
  sendMessage(
    content: string,
    type: 'Text' | 'Image' | 'File' = 'Text',
    fileUrl?: string,
    fileName?: string,
  ) {
    // 1. O an açık olanları kontrol et
    const activeUser = this.currentOpenedChat();
    const activeGroup = this.currentOpenedGroup();

    // Eğer ne kişi ne de grup açıksa hata ver ve çık
    if (!activeUser && !activeGroup) {
      console.error('Açık bir sohbet yok!');
      return;
    }

    // 2. Payload'ı hazırla (ID mantığı burada kuruluyor)
    const messagePayload = {
      // Kişi açıksa onun ID'si, değilse null
      receiverId: activeUser ? activeUser.id : null,

      // Grup açıksa onun ID'si, değilse null (BURASI EKSİKTİ)
      groupId: activeGroup ? activeGroup.groupId : null,

      content: content,
      messageType: type,
      attachmentUrl: fileUrl,
      attachmentName: fileName,
    };

    console.log('Mesaj Gönderiliyor...', messagePayload); // Kontrol için log

    // 3. Backend'e gönder
    this.hubConnection
      ?.invoke('SendMessage', messagePayload)
      .catch((error) => console.error('Mesaj gönderme hatası:', error));
  }

  // -------------------------------------------------------------------------
  // 5. DİĞER YARDIMCI METODLAR
  // -------------------------------------------------------------------------
  status(userName: string): string {
    if (this.currentOpenedGroup()) return '';
    const currentChatUser = this.currentOpenedChat();
    if (!currentChatUser) return 'offline';

    const onlineUser = this.onlineUsers().find((u) => u.userName === userName);
    return onlineUser?.isTyping
      ? 'Yazıyor...'
      : onlineUser?.isOnline
        ? 'online'
        : 'offline';
  }

  isUserOnline(): string {
    let onlineUser = this.onlineUsers().find(
      (user) => user.userName === this.currentOpenedChat()?.userName,
    );
    return onlineUser?.isOnline ? 'online' : this.currentOpenedChat()!.userName;
  }

  // LoadMessages metodunu Backend imzasına uydurduk: (recipientId, groupId, page)
  loadMessages(pageNumber: number) {
    // 1. O an açık olanları sinyallerden al
    const activeUser = this.currentOpenedChat();
    const activeGroup = this.currentOpenedGroup();

    // Eğer ikisi de yoksa işlem yapma
    if (!activeUser && !activeGroup) return;

    // Loading başlat (UI'da spinner dönsün)
    this.isLoading.set(true);

    // 2. ID'leri belirle
    // Eğer User açıksa ID'sini al, Group null olsun.
    // Eğer Group açıksa ID'sini al, User null olsun.
    const userId = activeUser ? activeUser.id : null;
    const groupId = activeGroup ? activeGroup.groupId : null;

    // 3. Backend'e İstek At
    // İmza: LoadMessages(string? recipientId, int? groupId, int pageNumber)
    this.hubConnection
      ?.invoke('LoadMessages', userId, groupId, pageNumber)
      .catch((err) => {
        console.error('Mesajlar yüklenirken hata:', err);
        this.isLoading.set(false);
      });
    // Not: Başarılı olursa 'ReceiveMessageList' listener'ı loading'i false yapacak.
  }

  notifyTyping(groupId?: number) {
    const recipientUserName = this.currentOpenedChat()?.userName;

    this.hubConnection
      ?.invoke('NotifyTyping', recipientUserName, groupId || null)
      .catch((error) => console.log(error));
  }

  // 1. TOPLU ÜYE EKLEME
  addMembersToGroup(groupId: number, userNames: string[]) {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http.post(
      `${this.groupUrl}/${groupId}/add-members`,
      { userNames }, // Body: { userNames: ["ahmet", "mehmet"] }
      { headers },
    );
  }

  // 2. GRUPTAN AYRILMA (Kendi isteğiyle)
  leaveGroup(groupId: number) {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const currentUserId = this.authService.currentLoggedInUser?.id;

    // Backend'deki remove-member endpointi 'targetUserId' istiyor.
    // Kendimizi sildiğimiz için kendi ID'mizi yolluyoruz.
    return this.http.delete(
      `${this.groupUrl}/${groupId}/remove-member/${currentUserId}`,
      { headers },
    );
  }

  searchUsers(query: string) {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<User[]>(`${this.apiUrl}/search-users?query=${query}`, {
      headers,
    });
  }
}
