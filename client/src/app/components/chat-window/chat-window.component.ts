import { Component, inject } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { TitleCasePipe } from '@angular/common';
import { MatIcon } from "@angular/material/icon";
import { FormsModule } from '@angular/forms';
import { ChatBoxComponent } from "../chat-box/chat-box.component";

@Component({
  selector: 'app-chat-window',
  imports: [TitleCasePipe, MatIcon, FormsModule, ChatBoxComponent],
  templateUrl: './chat-window.component.html',
  styles: ``
})
export class ChatWindowComponent {
  chatService = inject(ChatService);
  message: string = '';

  sendMessage(){
    
  }
}
