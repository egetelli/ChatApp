import { Component } from '@angular/core';
import { MatButtonModule } from "@angular/material/button";
import { MatIcon, MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";

@Component({
  selector: 'app-chat-sidebar',
  imports: [MatButtonModule, MatIcon, MatIconModule, MatMenuModule],
  templateUrl: './chat-sidebar.component.html',
  styles: ``
})
export class ChatSidebarComponent {

}
