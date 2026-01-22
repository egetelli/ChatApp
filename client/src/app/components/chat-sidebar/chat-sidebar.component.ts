import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse } from '../../models/api-response';
import { Observable } from 'rxjs';
import { User } from '../../models/user';

@Component({
  selector: 'app-chat-sidebar',
  imports: [
    MatButtonModule,
    MatIcon,
    MatIconModule,
    MatMenuModule,
    TitleCasePipe,
  ],
  templateUrl: './chat-sidebar.component.html',
  styles: ``,
})
export class ChatSidebarComponent implements OnInit {
  authService = inject(AuthService);
  chatService = inject(ChatService);
  snackBar = inject(MatSnackBar);
  router = inject(Router);
  logout(): void {
    // authService.logout() artık Observable<boolean> döndüğü için .subscribe() çalışacaktır
    this.authService.logout().subscribe({
      next: (result: boolean) => {
        // Çıkış işlemi başarılı (result burada 'true' dönecektir)
        this.chatService.stopConnection();
        this.snackBar.open('Logged out successfully', 'Close', {
          duration: 3000,
        });
      },
      error: (error: HttpErrorResponse) => {
        // Hata durumu
        const err = error.error as ApiResponse<string>;
        this.snackBar.open(err?.error || 'Logout error', 'Close', {
          duration: 3000,
        });

        // Hata olsa bile güvenli tarafta kalmak için temizle ve yönlendir
        this.chatService.stopConnection();
        this.router.navigate(['/login']);
      },
      complete: () => {
        // İşlem bittiğinde login sayfasına yönlendir
        this.router.navigate(['/login']);
      },
    });
  }
  ngOnInit(): void {
    this.chatService.startConnection(this.authService.getAccessToken!);
  }

  openedChatWindow(user: User) {
    // 1. Eğer zaten bu kullanıcıyla konuşuyorsak işlem yapma (Opsiyonel)
    if (this.chatService.currentOpenedChat()?.id === user.id) return;

    // 2. Seçili kullanıcıyı güncelle
    this.chatService.currentOpenedChat.set(user);

    // 3. --- KRİTİK NOKTA ---
    // Önceki kullanıcının mesajlarını temizle!
    // Eğer bunu yapmazsan, gelen yeni mesajlar eskilerin üstüne eklenir.
    this.chatService.chatMessages.set([]);

    // 4. Yükleniyor animasyonunu başlat
    this.chatService.isLoading.set(true);

    // 5. Şimdi yeni kullanıcının mesajlarını iste (Sayfa 1)
    this.chatService.loadMessages(1);
  }
}
