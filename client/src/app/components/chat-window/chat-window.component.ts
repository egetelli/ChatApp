import { Component, inject } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { TitleCasePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ChatBoxComponent } from '../chat-box/chat-box.component';

@Component({
  selector: 'app-chat-window',
  imports: [TitleCasePipe, MatIcon, FormsModule, ChatBoxComponent],
  templateUrl: './chat-window.component.html',
  styles: ``,
})
export class ChatWindowComponent {
  chatService = inject(ChatService);
  message: string = '';

  sendMessage() {
    // 1. Mesajın başındaki ve sonundaki gereksiz boşlukları temizle
    const cleanMessage = this.message?.trim();

    // 2. Eğer temizlenmiş hali boşsa (yani kullanıcı sadece space'e basmışsa) dur.
    if (!cleanMessage) return;

    // 3. Servise temizlenmiş mesajı gönder
    this.chatService.sendMessage(cleanMessage);

    // 4. Input kutusunu sıfırla
    this.message = '';
  }
}
