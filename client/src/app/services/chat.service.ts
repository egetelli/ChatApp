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
      })
      .catch((error) => {
        console.log('Bağlantı hatası:', error);
      });

    // --- LİSTENER'LAR (Dinleyiciler) ---

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

    this.hubConnection.on('OnlineUsers', (user: User[]) => {
      this.onlineUsers.update(() =>
        user.filter(
          (u) => u.userName !== this.authService.currentLoggedInUser?.userName,
        ),
      );
    });

    // Typing olayını hem grup hem kişi için dinle
    this.hubConnection.on('NotifyTypingToUser', (senderUserName) => {
      this.handleTypingVisuals(senderUserName);
    });

    this.hubConnection.on('ReceiveMessageList', (messages) => {
      this.chatMessages.set(messages); // Listeyi tamamen yenile
      this.isLoading.set(false);
    });

    this.hubConnection.on('ReceiveNewMessage', (message: Message) => {
      document.title = '(1) Yeni Mesaj';
      this.chatMessages.update((msgs) => [...msgs, message]);
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
    // Opsiyonel: Eğer o an grup açıksa ID'sini göndeririz
    groupId?: number,
  ) {
    const messagePayload = {
      receiverId: this.currentOpenedChat()?.id, // Birebir ise
      groupId: groupId, // Grup ise (Backend bunu kontrol ediyor)
      content: content,
      messageType: type,
      attachmentUrl: fileUrl,
      attachmentName: fileName,
    };

    this.hubConnection
      ?.invoke('SendMessage', messagePayload)
      .then((id) => console.log('Mesaj iletildi', id))
      .catch((error) => console.log(error));
  }

  // -------------------------------------------------------------------------
  // 5. DİĞER YARDIMCI METODLAR
  // -------------------------------------------------------------------------
  status(userName: string): string {
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
  loadMessages(pageNumber: number, groupId?: number) {
    const recipientId = this.currentOpenedChat()?.id;

    // Eğer grup ID varsa recipientId null gitmeli, yoksa tam tersi
    this.hubConnection
      ?.invoke(
        'LoadMessages',
        groupId ? null : recipientId,
        groupId || null,
        pageNumber,
      )
      .then()
      .catch()
      .finally(() => {
        this.isLoading.update(() => false);
      });
  }

  notifyTyping(groupId?: number) {
    const recipientUserName = this.currentOpenedChat()?.userName;

    this.hubConnection
      ?.invoke('NotifyTyping', recipientUserName, groupId || null)
      .catch((error) => console.log(error));
  }
}
