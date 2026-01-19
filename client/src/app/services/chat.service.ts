import { inject, Injectable, signal } from '@angular/core';
import { User } from '../models/user';
import { AuthService } from './auth.service';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
} from '@microsoft/signalr';
import { Message } from '../models/message';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private authService = inject(AuthService);
  private hubUrl = 'http://localhost:5000/hubs/chat';
  onlineUsers = signal<User[]>([]);
  currentOpenedChat = signal<User | null>(null);
  chatMessages = signal<Message[]>([]);
  isLoading = signal<boolean>(true);

  private hubConnection?: HubConnection;

  startConnection(token: string, senderId?: string) {
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${this.hubUrl}?senderId=${senderId || ''}`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('Connection started');
      })
      .catch((error) => {
        console.log('Connection or login error', error);
      });

    this.hubConnection!.on('OnlineUsers', (user: User[]) => {
      console.log(user);
      this.onlineUsers.update(() =>
        user.filter(
          (user) =>
            user.userName !== this.authService.currentLoggedInUser?.userName,
        ),
      );
    });

    this.hubConnection!.on("ReceiveMessageList", (message) => {
      this.chatMessages.update(messages => [...message,...messages]);
      this.isLoading.update(() => false);
    })
  }

  async stopConnection() {
    // 2. Bağlantı var mı VE Durumu "Bağlantı Kesildi" değil mi?
    // (Bağlıysa, Bağlanıyorsa veya Yeniden Bağlanıyorsa durdurmalıyız)
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

  status(userName: string): string {
    const currentChatUser = this.currentOpenedChat();
    if (!currentChatUser) {
      return 'offline';
    }

    const onlineUser = this.onlineUsers().find(
      (user) => user.userName === userName,
    );

    return onlineUser?.isTyping ? 'Typing...' : this.isUserOnline();
  }

  isUserOnline(): string {
    let onlineUser = this.onlineUsers().find(
      (user) => user.userName === this.currentOpenedChat()?.userName,
    );
    return onlineUser?.isOnline ? 'online' : this.currentOpenedChat()!.userName;
  }

  loadMessages(pageNumber: number){
    this.hubConnection?.invoke("LoadMessages", this.currentOpenedChat()?.id, pageNumber)
    .then()
    .catch()
    .finally(() => {
      this.isLoading.update(() => false);
    })
  }
}
