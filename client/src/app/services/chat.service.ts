import { inject, Injectable, signal } from '@angular/core';
import { User } from '../models/user';
import { AuthService } from './auth.service';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
} from '@microsoft/signalr';
import { Message } from '../models/message';
import { HttpClient } from '@angular/common/http'; // HttpHeaders'a artık gerek yok
import { Group } from '../models/group';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:5000/api/chat';
  private groupUrl = 'http://localhost:5000/api/group';
  private hubUrl = 'http://localhost:5000/hubs/chat';

  onlineUsers = signal<User[]>([]);
  myGroups = signal<Group[]>([]);

  currentOpenedChat = signal<User | null>(null);
  currentOpenedGroup = signal<Group | null>(null);

  chatMessages = signal<Message[]>([]);
  isLoading = signal<boolean>(true);

  private hubConnection?: HubConnection;

  // -------------------------------------------------------------------------
  // 1. BAĞLANTIYI BAŞLATMA (BURASI KALMAK ZORUNDA)
  // SignalR, HttpClient kullanmadığı için Interceptor buraya işlemez.
  // -------------------------------------------------------------------------
  startConnection(token: string, groupId?: string, senderId?: string) {
    let url = this.hubUrl;

    if (senderId) {
      url += `?senderId=${senderId}`;
    } else if (groupId) {
      url += `?groupId=${groupId}`;
    }

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => token, // Burası mecburi
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('SignalR Bağlantısı Başladı.');
        this.getGroups();
      })
      .catch((error) => {
        console.log('Bağlantı hatası:', error);
      });

    this.registerListeners();
  }

  private registerListeners() {
    if (!this.hubConnection) return;

    this.hubConnection.on('Notify', (user: User) => {
      if (user.userName === this.authService.currentUser()?.userName) return;

      Notification.requestPermission().then((result) => {
        if (result == 'granted') {
          new Notification('Yeni Giriş 🌐', {
            body: user.fullName + ' çevrimiçi oldu.',
            icon: user.profileImage || undefined,
          });
        }
      });
    });

    this.hubConnection.on('OnlineUsers', (users: User[]) => {
      this.onlineUsers.update(() =>
        users.filter(
          (u) => u.userName !== this.authService.currentUser()?.userName,
        ),
      );
    });

    this.hubConnection.on('NotifyTypingToUser', (senderUserName) => {
      this.handleTypingVisuals(senderUserName);
    });

    this.hubConnection.on('ReceiveMessageList', (messages) => {
      this.chatMessages.set(messages);
      this.isLoading.set(false);
    });

    this.hubConnection.on('ReceiveNewMessage', (message: Message) => {
      const isChatOpen =
        this.currentOpenedChat() &&
        (this.currentOpenedChat()?.id === message.senderId ||
          this.currentOpenedChat()?.id === message.receiverId);

      const isGroupOpen =
        this.currentOpenedGroup() &&
        this.currentOpenedGroup()?.groupId === message.groupId;

      if (isChatOpen || isGroupOpen) {
        this.chatMessages.update((msgs) => [...msgs, message]);
      } else {
        console.log('Yeni mesaj var (Arkaplanda):', message);
        document.title = '(1) Yeni Mesaj';
      }
    });
  }

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
  // HTTP ISTEKLERİ (ARTIK Header YOK - Interceptor Hallediyor)
  // -------------------------------------------------------------------------

  uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string; originalName: string }>(
      `${this.apiUrl}/upload`,
      formData,
    );
  }

  createGroup(groupData: {
    groupName: string;
    description: string;
    groupKey: string;
    isPrivate: boolean;
    groupImage: string;
  }) {
    // SADECE POST! Header yok.
    return this.http.post(`${this.groupUrl}/create`, groupData);
  }

  getGroups() {
    // Header yok.
    this.http.get<Group[]>(`${this.groupUrl}/my-groups`).subscribe({
      next: (groups) => {
        this.myGroups.set(groups);
      },
      error: (err) => console.error('Gruplar çekilemedi:', err),
    });
  }

  sendMessage(
    content: string,
    type: 'Text' | 'Image' | 'File' = 'Text',
    fileUrl?: string,
    fileName?: string,
  ) {
    const activeUser = this.currentOpenedChat();
    const activeGroup = this.currentOpenedGroup();

    if (!activeUser && !activeGroup) {
      console.error('Açık bir sohbet yok!');
      return;
    }

    const messagePayload = {
      receiverId: activeUser ? activeUser.id : null,
      groupId: activeGroup ? activeGroup.groupId : null,
      content: content,
      messageType: type,
      attachmentUrl: fileUrl,
      attachmentName: fileName,
    };

    this.hubConnection
      ?.invoke('SendMessage', messagePayload)
      .catch((error) => console.error('Mesaj gönderme hatası:', error));
  }

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

  loadMessages(pageNumber: number) {
    const activeUser = this.currentOpenedChat();
    const activeGroup = this.currentOpenedGroup();

    if (!activeUser && !activeGroup) return;

    this.isLoading.set(true);

    const userId = activeUser ? activeUser.id : null;
    const groupId = activeGroup ? activeGroup.groupId : null;

    this.hubConnection
      ?.invoke('LoadMessages', userId, groupId, pageNumber)
      .catch((err) => {
        console.error('Mesajlar yüklenirken hata:', err);
        this.isLoading.set(false);
      });
  }

  notifyTyping(groupId?: number) {
    const recipientUserName = this.currentOpenedChat()?.userName;

    this.hubConnection
      ?.invoke('NotifyTyping', recipientUserName, groupId || null)
      .catch((error) => console.log(error));
  }

  addMembersToGroup(groupId: number, userNames: string[]) {
    // Header yok.
    return this.http.post(`${this.groupUrl}/${groupId}/add-members`, {
      userNames,
    });
  }

  leaveGroup(groupId: number) {
    // Header yok.
    const currentUserId = this.authService.currentUser()?.id;
    return this.http.delete(
      `${this.groupUrl}/${groupId}/remove-member/${currentUserId}`,
    );
  }

  searchUsers(query: string) {
    // Header yok.
    return this.http.get<User[]>(`${this.apiUrl}/search-users?query=${query}`);
  }

  makeGroupAdmin(groupId: number, targetUserId: string) {
    // Header yok.
    return this.http.put(
      `${this.groupUrl}/${groupId}/make-admin/${targetUserId}`,
      {},
    );
  }

  getGroupMembers(groupId: number) {
    // Header yok.
    return this.http.get<any[]>(`${this.groupUrl}/${groupId}/members`);
  }
}