import { Component, inject, signal } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ChatService } from '../../services/chat.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/user';
import { GroupMember } from '../../models/group-member';
import { AuthService } from '../../services/auth.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-chat-right-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    TitleCasePipe,
    FormsModule,
    MatProgressSpinner,
  ],
  templateUrl: './chat-right-sidebar.component.html',
})
export class ChatRightSidebarComponent {
  chatService = inject(ChatService);
  snackBar = inject(MatSnackBar);
  authService = inject(AuthService);

  // Modal Kontrolü
  isAddMemberModalOpen = false;
  // Üye Ekleme Formu için
  searchTerm: string = '';
  searchResults: User[] = []; // Aramadan dönen kullanıcılar
  selectedUsers: Set<string> = new Set(); // Seçilen kullanıcı adları (Set ile unique tutuyoruz)

  //Üye yönetimi değişkenleri
  isMembersModalOpen = false;
  isLoadingMembers = false;
  groupMembers: GroupMember[] = [];
  amIAdmin = false;

  // --- GRUPTAN AYRILMA ---
  leaveGroup(groupId: number) {
    if (!confirm('Bu gruptan ayrılmak istediğinize emin misiniz?')) return;

    this.chatService.leaveGroup(groupId).subscribe({
      next: () => {
        this.snackBar.open('Gruptan ayrıldınız.', 'Tamam', { duration: 3000 });
        this.chatService.currentOpenedGroup.set(null); // Sohbeti kapat
        this.chatService.getGroups(); // Listeyi yenile
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Hata oluştu', 'Kapat', {
          duration: 3000,
        });
      },
    });
  }

  //Üye listeleme modalı
  openMembersModal() {
    const currentGroup = this.chatService.currentOpenedGroup();
    if (!currentGroup) return;

    this.isMembersModalOpen = true;
    this.isLoadingMembers = true;

    this.chatService.getGroupMembers(currentGroup.groupId).subscribe({
      next: (res: any) => {
        this.groupMembers = res;
        this.checkMyRole();
        this.isLoadingMembers = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoadingMembers = false;
        this.snackBar.open('Üye listesi yüklenemedi', 'Kapat', {
          duration: 3000,
        });
      },
    });
  }

  //Listede kendini bulup Admin miyim kontrolü yapma
  checkMyRole() {
    const myUserId = this.authService.currentUser()?.id;
    const myMemberRecord = this.groupMembers.find((m) => m.userId === myUserId);

    this.amIAdmin = myMemberRecord ? myMemberRecord.isAdmin : false;
  }

  closeMembersModal() {
    this.isMembersModalOpen = false;
  }

  makeAdmin(targetUserId: string) {
    const currentGroup = this.chatService.currentOpenedGroup();
    if (!currentGroup) return;

    if (!confirm('Bu kullanıcıyı yönetici yapmak istediğinize emin misiniz?'))
      return;

    this.chatService
      .makeGroupAdmin(currentGroup.groupId, targetUserId)
      .subscribe({
        next: (res: any) => {
          this.snackBar.open('Kullanıcı yönetici yapıldı.', 'Tamam', {
            duration: 3000,
          });

          // --- [DÜZELTME] Anlık Güncelleme ---
          // Backend'e gitmek yerine listedeki o kişiyi bul ve yetkisini değiştir
          const member = this.groupMembers.find(
            (m) => m.userId === targetUserId,
          );
          if (member) {
            member.isAdmin = true;
          }
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Hata oluştu.', 'Kapat', {
            duration: 3000,
          });
        },
      });
  }

  // --- ÜYE EKLEME MODALI ---
  openAddMemberModal() {
    this.isAddMemberModalOpen = true;
    this.searchTerm = '';
    this.selectedUsers.clear();
    this.searchResults = [];
    // İstersen burada varsayılan olarak online kullanıcıları listeyebilirsin
    // this.searchResults = this.chatService.onlineUsers();
  }

  closeAddMemberModal() {
    this.isAddMemberModalOpen = false;
  }

  // Kullanıcı Arama (Simülasyon - Gerçekte backend'e istek atılmalı)
  onSearchInput() {
    if (this.searchTerm.length < 2) {
      this.searchResults = [];
      return;
    }

    // NOT: Burada backend search endpoint'i çağırmak en doğrusu.
    // Örnek olarak onlineUsers içinden filtreliyorum ama gerçekte tüm DB'den aranmalı.
    // this.chatService.searchUsers(this.searchTerm).subscribe(res => this.searchResults = res);

    // Geçici Çözüm (Online olanlardan ara):
    this.searchResults = this.chatService
      .onlineUsers()
      .filter(
        (u) =>
          u.fullName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          u.userName.toLowerCase().includes(this.searchTerm.toLowerCase()),
      );
  }

  toggleUserSelection(userName: string) {
    if (this.selectedUsers.has(userName)) {
      this.selectedUsers.delete(userName);
    } else {
      this.selectedUsers.add(userName);
    }
  }

  // --- [YENİ] YÖNETİCİLİĞİ GERİ AL ---
  revokeAdmin(targetUserId: string) {
    const currentGroup = this.chatService.currentOpenedGroup();
    if (!currentGroup) return;

    if (
      !confirm(
        'Bu kullanıcının yöneticilik yetkisini almak istediğinize emin misiniz?',
      )
    )
      return;

    this.chatService
      .revokeGroupAdmin(currentGroup.groupId, targetUserId)
      .subscribe({
        next: (res: any) => {
          this.snackBar.open('Yöneticilik yetkisi alındı.', 'Tamam', {
            duration: 3000,
          });

          // --- [DÜZELTME] Anlık Güncelleme ---
          const member = this.groupMembers.find(
            (m) => m.userId === targetUserId,
          );
          if (member) {
            member.isAdmin = false;
          }
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Hata oluştu.', 'Kapat', {
            duration: 3000,
          });
        },
      });
  }

  // --- [YENİ] GRUPTAN AT (KICK) ---
  kickUser(targetUserId: string) {
    const currentGroup = this.chatService.currentOpenedGroup();
    if (!currentGroup) return;

    if (!confirm('Bu kullanıcıyı gruptan çıkarmak istediğinize emin misiniz?'))
      return;

    this.chatService.kickMember(currentGroup.groupId, targetUserId).subscribe({
      next: (res: any) => {
        this.snackBar.open('Kullanıcı gruptan çıkarıldı.', 'Tamam', {
          duration: 3000,
        });

        // --- [DÜZELTME] Anlık Güncelleme ---
        // 1. Kullanıcıyı listeden sil
        this.groupMembers = this.groupMembers.filter(
          (m) => m.userId !== targetUserId,
        );

        // 2. Üstteki "Üye Sayısı"nı güncelle (Signal)
        this.chatService.currentOpenedGroup.set({
          ...currentGroup,
          memberCount: (currentGroup.memberCount || 1) - 1,
        });
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Hata oluştu.', 'Kapat', {
          duration: 3000,
        });
      },
    });
  }

  submitAddMembers(groupId: number) {
    if (this.selectedUsers.size === 0) return;

    const userNamesArray = Array.from(this.selectedUsers);
    const addedCount = this.selectedUsers.size; // Eklenen kişi sayısı

    this.chatService.addMembersToGroup(groupId, userNamesArray).subscribe({
      next: (res: any) => {
        this.snackBar.open(res.message || 'Üyeler eklendi', 'Tamam', {
          duration: 3000,
        });
        this.closeAddMemberModal();

        // --- GÜNCELLEME BURADA BAŞLIYOR ---

        // 1. Sol Menüdeki Listeyi Yenile (MemberCount veritabanından güncel gelir)
        this.chatService.getGroups();

        // 2. Şu an açık olan grubun üye sayısını el ile artır (Anlık tepki için)
        // Böylece F5 atmadan sağ paneldeki sayı artar.
        const currentGroup = this.chatService.currentOpenedGroup();
        if (currentGroup && currentGroup.groupId === groupId) {
          this.chatService.currentOpenedGroup.set({
            ...currentGroup,
            memberCount: (currentGroup.memberCount || 0) + addedCount,
          });
        }
        // --- GÜNCELLEME BİTTİ ---
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Ekleme başarısız', 'Kapat', {
          duration: 3000,
        });
      },
    });
  }
}
