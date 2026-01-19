import { Component, inject } from '@angular/core';
import { MatButtonModule } from "@angular/material/button";
import { MatIcon, MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chat-sidebar',
  imports: [MatButtonModule, MatIcon, MatIconModule, MatMenuModule],
  templateUrl: './chat-sidebar.component.html',
  styles: ``
})
export class ChatSidebarComponent {
  authService = inject(AuthService);
  router = inject(Router);
  logout(){
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
