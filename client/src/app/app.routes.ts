import { Routes } from '@angular/router';
import { loginGuard } from './guards/login.guard';
import { ChatComponent } from './chat/chat.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // 1. KURAL: Uygulama ilk açıldığında (localhost:4200/) Login'e git
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },

  // Standart Sayfalar
  {
    path: 'chat',
    component: ChatComponent,
    canActivate: [authGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./register/register.component').then((x) => x.RegisterComponent),
    canActivate: [loginGuard],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then((x) => x.LoginComponent),
    canActivate: [loginGuard],
  },

  // 2. KURAL: Bilinmeyen bir adrese gidilirse (Örn: /deneme) Chat'e git
  // Not: Eğer kullanıcı giriş yapmamışsa, Chat'teki authGuard onu tekrar Login'e atar.
  {
    path: '**',
    redirectTo: 'chat',
    pathMatch: 'full',
  },
];
