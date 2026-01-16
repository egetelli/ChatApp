import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthServiceService } from '../services/auth-service.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse } from '../modals/api-response';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [
    MatFormField,
    MatLabel,
    MatError,
    MatIcon,
    FormsModule,
    MatInputModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email!: string;
  password!: string;

  private authService = inject(AuthServiceService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  hide = signal(false);
  login() {
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.snackBar.open('Logged in successfully', 'Close');
      },
      error: (error: HttpErrorResponse) => {
        let err = error.error as ApiResponse<string>;
        this.snackBar.open(err.error, 'Close', {
          duration: 3000,
        });
      },
      complete: () => {
        this.router.navigate(['/']);
      },
    });
  }
  togglePassword(event: MouseEvent) {
    this.hide.set(!this.hide());
  }
}
