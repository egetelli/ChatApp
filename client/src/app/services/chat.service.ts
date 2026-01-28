import { inject, Injectable, signal } from '@angular/core';
import { User } from '../models/user';
import { AuthService } from './auth.service';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
} from '@microsoft/signalr';
import { Message } from '../models/message';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:5000/api/chat';
  private hubUrl = 'http://localhost:5000/hubs/chat';

  onlineUsers = signal<User[]>([]);
  // currentOpenedChat şu an sadece User tutuyor. İlerde Grup objesi için generic yapılabilir.
  currentOpenedChat = signal<User | null>(null);

  chatMessages = signal<Message[]>([]);
  isLoading = signal<boolean>(true);

  private hubConnection?: HubConnection;

  // -------------------------------------------------------------------------
  // 1. BAĞLANTIYI BAŞLATMA (Grup Desteği ile)
  // -------------------------------------------------------------------------
  startConnection(token: string, groupId?: string, senderId?: string) {
    // URL'i dinamik oluşturuyoruz
    let url = this.hubUrl;

    // Eğer bir kişiyle konuşuyorsak senderId, grupla konuşuyorsak groupId ekliyoruz
    if (senderId) {
      url += `?senderId=${senderId}`;
    } else if (groupId) {
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

    // --- SIGNALR LISTENERS (Dinleyiciler) ---

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

    this.hubConnection.on('NotifyTypingToUser', (senderUserName) => {
      // Typing görselleştirmesi
      this.handleTypingVisuals(senderUserName);
    });

    this.hubConnection.on('ReceiveMessageList', (messages) => {
      this.chatMessages.set(messages);
      this.isLoading.set(false);
    });

    this.hubConnection.on('ReceiveNewMessage', (message: Message) => {
      document.title = '(1) Yeni Mesaj';
      this.chatMessages.update((msgs) => [...msgs, message]);
    });
  }

  // Typing animasyonu için yardımcı metod
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
  // 3. MESAJ GÖNDERME
  // -------------------------------------------------------------------------
  sendMessage(
    content: string,
    type: 'Text' | 'Image' | 'File' = 'Text',
    fileUrl?: string,
    fileName?: string,
    groupId?: number, // Opsiyonel: Grup ID'si
  ) {
    const messagePayload = {
      receiverId: this.currentOpenedChat()?.id, // Birebir ise
      groupId: groupId, // Grup ise
      content: content,
      messageType: type,
      attachmentUrl: fileUrl,
      attachmentName: fileName,
    };

    // Ekrana geçici olarak ekle (Optimistic UI)
    this.chatMessages.update((messages) => [
      ...messages,
      {
        ...messagePayload,
        senderId: this.authService.currentLoggedInUser!.id,
        createdDate: new Date().toString(),
        isRead: false,
        id: 0,
      } as any,
    ]);

    this.hubConnection
      ?.invoke('SendMessage', messagePayload)
      .then((id) => console.log('Mesaj iletildi', id))
      .catch((error) => console.log(error));
  }

  // -------------------------------------------------------------------------
  // 4. DİĞER YARDIMCI METODLAR
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

  // Backend imzası: LoadMessages(string? recipientId, int? groupId, int pageNumber)
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

    // Backend imzası: NotifyTyping(string? recipientUserName, int? groupId)
    this.hubConnection
      ?.invoke('NotifyTyping', recipientUserName, groupId || null)
      .catch((error) => console.log(error));
  }
}
