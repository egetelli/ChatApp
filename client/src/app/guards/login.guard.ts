import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    // Eğer zaten giriş yapmışsa, Login sayfasını engelle VE Chat'e gönder
    return router.createUrlTree(['/chat']);
  }

  // Giriş yapmamışsa Login sayfasına girmesine izin ver
  return true;
};
