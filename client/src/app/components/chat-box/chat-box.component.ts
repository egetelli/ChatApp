import {
  AfterViewChecked,
  Component,
  ElementRef,
  inject,
  ViewChild,
} from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { DatePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient, HttpErrorResponse } from '@angular/common/http'; // 1. HttpClient Import Edildi

@Component({
  selector: 'app-chat-box',
  imports: [MatProgressSpinner, DatePipe, MatIcon],
  templateUrl: './chat-box.component.html',
  styles: [
    `
      .chat-box {
        scroll-behavior: smooth;
        padding: 10px;
        background-color: #f5f5f5;
        display: flex;
        flex-direction: column;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        height: 82vh;
        border-radius: 5px;

        /* overflow-y: scroll yerine auto kullan. 
         Böylece içerik taşmıyorsa scrollbar hiç oluşmaz. */
        overflow-y: auto;

        /* Firefox için (Webkit çalışmazsa) */
        scrollbar-width: thin;
        scrollbar-color: transparent transparent; /* Varsayılan gizli */
      }

      /* Firefox için Hover Durumu */
      .chat-box:hover {
        scrollbar-color: gray transparent;
      }

      /* --- CHROME, EDGE, SAFARI AYARLARI --- */

      /* Scrollbar'ın genel genişliği */
      .chat-box::-webkit-scrollbar {
        width: 6px;
      }

      /* Scrollbar'ın arka planı (yol) */
      .chat-box::-webkit-scrollbar-track {
        background-color: transparent;
      }

      /* Scrollbar'ın kendisi (tutulan çubuk) - VARSAYILAN GİZLİ */
      .chat-box::-webkit-scrollbar-thumb {
        background-color: transparent; /* Görünmez yapıyoruz */
        border-radius: 10px;
      }

      /* Mouse .chat-box'ın üzerine gelince çubuk rengini değiştir */
      .chat-box:hover::-webkit-scrollbar-thumb {
        background-color: #bbbbbb; /* Hafif gri */
      }

      /* Scrollbar'ın üzerine gelince rengi koyulaştır */
      .chat-box::-webkit-scrollbar-thumb:hover {
        background-color: #555; /* Koyu gri */
      }
    `,
  ],
})
export class ChatBoxComponent implements AfterViewChecked {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;
  chatService = inject(ChatService);
  authService = inject(AuthService);
  snackBar = inject(MatSnackBar);
  http = inject(HttpClient); // 2. HttpClient Inject Edildi

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      // Chat kutusunun scrollunu en aşağı itiyoruz
      this.myScrollContainer.nativeElement.scrollTop =
        this.myScrollContainer.nativeElement.scrollHeight;
    } catch (err) {
      // İlk yüklemede hata vermemesi için boş bırakılabilir
    }
  }

  downloadFile(attachmentUrl?: string) {
    if (!attachmentUrl) {
      this.snackBar.open('Dosya bulunamadı ❌', 'Kapat', { duration: 3000 });
      return;
    }

    const fileName = attachmentUrl.split('/').pop();
    if (!fileName) {
      this.snackBar.open('Dosya adı çözümlenemedi ❌', 'Kapat', {
        duration: 3000,
      });
      return;
    }

    const url = `http://localhost:5000/api/chat/download/${fileName}`;

    // 1. Önce HEAD isteği ile kontrol et (Angular HttpClient ile)
    this.http.head(url, { observe: 'response' }).subscribe({
      next: (res) => {
        // Kontrol başarılıysa (200 OK), indirmeyi başlat
        this.triggerDownload(url, fileName);
      },
      error: (error: HttpErrorResponse) => {
        // Hata Yönetimi
        let errorMessage = 'İndirme sırasında bir hata oluştu';

        if (error.status === 404) {
          errorMessage = 'Dosya sunucuda bulunamadı (404) ❌';
        } else if (error.status === 413) {
          errorMessage = 'Dosya boyutu çok büyük! (50MB Sınırı) ⚠️';
        } else if (error.status === 0) {
          // CORS veya Network hatası (Backend 413 döndüğünde CORS header yoksa buraya düşer)
          errorMessage = 'Sunucu bağlantı hatası veya dosya çok büyük ⚠️';
        }

        this.snackBar.open(errorMessage, 'Kapat', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      },
    });
  }

  // Yardımcı Metod: Gerçek indirmeyi tetikler
  private triggerDownload(url: string, fileName: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
