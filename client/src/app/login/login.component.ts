import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse } from '../models/api-response';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [
    MatFormField,
    MatLabel,
    MatError,
    MatIcon,
    FormsModule,
    MatInputModule,
    RouterLink,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email!: string;
  password!: string;

  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  hide = signal(false);

  login() {
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        // me() serviste zincirleme çağrıldı, user set edildi.
        // Sadece yönlendirme yapıyoruz.
        this.router.navigate(['/chat']);
        this.snackBar.open('Giriş başarılı', 'Kapat', { duration: 2000 });
      },
      error: (error: HttpErrorResponse) => {
        // Backend'den gelen hata formatına göre burayı düzenle
        const message = error.error?.message || 'Giriş başarısız';
        this.snackBar.open(message, 'Kapat', { duration: 3000 });
      },
    });
  }
  togglePassword(event: MouseEvent) {
    this.hide.set(!this.hide());
  }
}
