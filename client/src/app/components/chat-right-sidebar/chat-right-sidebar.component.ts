import { Component, inject } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-chat-right-sidebar',
  imports: [TitleCasePipe, MatIcon, CommonModule],
  templateUrl: './chat-right-sidebar.component.html',
  styles: ``,
})
export class ChatRightSidebarComponent {
  chatService = inject(ChatService);
}
