import { AfterViewChecked, Component, ElementRef, inject, ViewChild } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { DatePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';

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
}
