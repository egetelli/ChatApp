import { Component, inject, signal } from '@angular/core';
import { AuthServiceService } from '../services/auth-service.service';
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-register',
  imports: [MatFormFieldModule, FormsModule, MatButtonModule, MatInputModule, MatIconModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  email!: string;
  password!: string;
  fullName!: string;
  profilePicture: string = 'https://randomuser.me/api/portraits/lego/5.jpg';
  profileImage: File | null = null;

  authService = inject(AuthServiceService);
  hide = signal(true);

  togglePassword(event: MouseEvent){
    this.hide.set(!this.hide());
  }

  onFileSelected(event:any){
    const file:File = event.target.files[0];

    this.profileImage = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.profilePicture = e.target!.result as string;
      console.log(e.target?.result);
    };
    reader.readAsDataURL(file);
    console.log(this.profilePicture);
  }
}
