import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse } from '../../models/api-response';
import { User } from '../../models/user';
import { TypingIndicatorComponent } from '../typing-indicator/typing-indicator.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { Group } from '../../models/group';

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TitleCasePipe,
    TypingIndicatorComponent,
    CommonModule,
    MatProgressSpinnerModule,
    FormsModule,
  ],
  templateUrl: './chat-sidebar.component.html',
  styles: ``,
})
export class ChatSidebarComponent implements OnInit {
  authService = inject(AuthService);
  chatService = inject(ChatService);
  snackBar = inject(MatSnackBar);
  router = inject(Router);

  // --- MODAL KONTROLÜ ---
  // HTML'deki @if(isGroupModalOpen) bloğunu kontrol eder
  isGroupModalOpen = false;

  // Form Verileri
  groupData = {
    groupName: '',
    description: '',
    groupKey: '',
    isPrivate: false,
    groupImage: '',
  };

  selectedImageFile: File | null = null;
  selectedImagePreview: string | null = null;
  isLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    if (this.authService.getAccessToken) {
      this.chatService.startConnection(this.authService.getAccessToken);
      this.chatService.getGroups();
    }
  }

  // --- MODAL YÖNETİMİ (AÇMA/KAPAMA) ---

  openGroupModal() {
    this.isGroupModalOpen = true;
    this.errorMessage = ''; // Her açılışta hata mesajını temizle
  }

  closeGroupModal() {
    this.isGroupModalOpen = false;
    // İsterseniz modal kapandığında formu temizlemek için resetForm()'u burada da çağırabilirsiniz.
    // this.resetForm();
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: (result: boolean) => {
        this.chatService.stopConnection();
        this.snackBar.open('Başarıyla çıkış yapıldı', 'Kapat', {
          duration: 3000,
        });
      },
      error: (error: HttpErrorResponse) => {
        const err = error.error as ApiResponse<string>;
        this.snackBar.open(err?.error || 'Çıkış hatası', 'Kapat', {
          duration: 3000,
        });
        this.chatService.stopConnection();
        this.router.navigate(['/login']);
      },
      complete: () => {
        this.router.navigate(['/login']);
      },
    });
  }

  openedChatWindow(user: User) {
    // Kendi kendine veya zaten açık olan sohbete tıklanırsa işlem yapma
    if (this.chatService.currentOpenedChat()?.id === user.id) return;
    this.chatService.currentOpenedGroup.set(null);
    this.chatService.currentOpenedChat.set(user);
    this.chatService.chatMessages.set([]);
    this.chatService.isLoading.set(true);
    this.chatService.loadMessages(1);
  }

  openGroupChat(group: Group) {
    // Eğer zaten bu grup açıksa işlem yapma
    if (this.chatService.currentOpenedGroup()?.groupId === group.groupId)
      return;

    // 1. Sinyalleri Güncelle
    // Açık olan kişisel sohbeti kapat (null yap)
    this.chatService.currentOpenedChat.set(null);
    // Grubu Set et (Artık aktif olan bu)
    this.chatService.currentOpenedGroup.set(group);

    // 2. UI Hazırlığı
    this.chatService.chatMessages.set([]); // Eski mesajları temizle
    this.chatService.isLoading.set(true); // Yükleniyor göster

    // 3. Mesajları Yükle
    // loadGroupMessages YERİNE loadMessages çağırıyoruz.
    // Parametre göndermiyoruz çünkü yukarıda (1. adımda) grubu set ettik, servis onu görecek.
    this.chatService.loadMessages(1);
  }

  onGroupImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedImageFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.selectedImagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  // --- GRUP OLUŞTURMA ---

  createGroup() {
    if (!this.groupData.groupName) {
      this.errorMessage = 'Lütfen bir grup adı giriniz.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Eğer resim seçildiyse önce resmi yükle, sonra grubu oluştur
    if (this.selectedImageFile) {
      this.chatService.uploadFile(this.selectedImageFile).subscribe({
        next: (res) => {
          this.groupData.groupImage = res.url;
          this.submitGroup();
        },
        error: (err) => {
          this.errorMessage = 'Resim yüklenirken hata oluştu.';
          this.isLoading = false;
        },
      });
    } else {
      // Resim yoksa direkt oluştur
      this.submitGroup();
    }
  }

  submitGroup() {
    this.chatService.createGroup(this.groupData).subscribe({
      next: (res) => {
        this.isLoading = false;

        // Modalı kapat ve formu temizle
        this.closeGroupModal();
        this.resetForm();

        this.snackBar.open('Grup başarıyla oluşturuldu!', 'Tamam', {
          duration: 3000,
        });
        this.chatService.getGroups();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Grup oluşturulamadı.';
      },
    });
  }

  // Form verilerini sıfırlama yardımcı metodu
  resetForm() {
    this.groupData = {
      groupName: '',
      description: '',
      groupKey: '',
      isPrivate: false,
      groupImage: '',
    };
    this.selectedImageFile = null;
    this.selectedImagePreview = null;
  }
}
