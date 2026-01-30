import { Component, inject } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ChatBoxComponent } from '../chat-box/chat-box.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-chat-window',
  imports: [TitleCasePipe, MatIcon, FormsModule, ChatBoxComponent, CommonModule],
  templateUrl: './chat-window.component.html',
  styles: ``,
})
export class ChatWindowComponent {
  chatService = inject(ChatService);
  snackBar = inject(MatSnackBar);
  message: string = '';

  sendMessage() {
    const cleanMessage = this.message?.trim();
    if (!cleanMessage) return;

    this.chatService.sendMessage(cleanMessage);
    this.message = '';
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    const type = file.type.startsWith('image/') ? 'Image' : 'File';

    this.chatService.uploadFile(file).subscribe({
      next: (response) => {
        const content = type === 'Image' ? '📷 Fotoğraf' : '📁 Dosya';
        this.chatService.sendMessage(
          content,
          type,
          response.url,
          response.originalName,
        );
      },
      error: (err: HttpErrorResponse) => {
        console.error('Dosya yükleme hatası:', err);

        let errorMessage = 'Dosya yüklenirken bir hata oluştu ❌';

        // STATUS 0: Sunucu bağlantıyı kestiğinde (ERR_CONNECTION_RESET) veya CORS hatasında döner.
        // Genellikle dosya boyutu backend limitini aştığında olur.
        if (err.status === 0) {
          errorMessage =
            'Sunucu bağlantıyı reddetti. Dosya çok büyük olabilir! ⚠️';
        } else if (err.status === 413) {
          errorMessage = 'Dosya boyutu izin verilenden fazla! ⚠️';
        } else if (err.status === 400) {
          errorMessage = err.error?.message || 'Geçersiz istek ❌';
        }

        // DÜZELTME: panelClass kaldırıldı, standart görünüm kullanılacak
        this.snackBar.open(errorMessage, 'Kapat', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      },
    });

    event.target.value = '';
  }
}
