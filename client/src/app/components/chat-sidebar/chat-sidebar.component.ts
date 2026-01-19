import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { ChatService } from '../../services/chat.service';

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
  router = inject(Router);
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
  ngOnInit(): void {
    this.chatService.startConnection(this.authService.getAccessToken!);
  }
}
