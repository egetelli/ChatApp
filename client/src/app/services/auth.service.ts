import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, of, tap, switchMap, catchError, map } from 'rxjs';
import { ApiResponse } from '../models/api-response';
import { User } from '../models/user';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = 'http://localhost:5000/api/account';
  private tokenKey = 'token';
  private userKey = 'user';

  private httpClient = inject(HttpClient);
  private router = inject(Router);

  // Reaktif State: Kullanıcı bilgisini burada tutuyoruz
  currentUser = signal<User | null>(this.getUserFromStorage());

  constructor() {
    // Uygulama ilk açıldığında token varsa ama user yoksa user'ı çekebilirsin (Opsiyonel)
  }

  register(data: FormData): Observable<ApiResponse<string>> {
    return this.httpClient
      .post<ApiResponse<string>>(`${this.baseUrl}/register`, data)
      .pipe(
        tap((response) => {
          if (response.isSuccess) {
            localStorage.setItem(this.tokenKey, response.data);
            // Register sonrası otomatik login sayılacaksa user'ı da çekmelisin
          }
        }),
      );
  }

  login(email: string, password: string): Observable<void> {
    return this.httpClient
      .post<ApiResponse<string>>(`${this.baseUrl}/login`, { email, password })
      .pipe(
        // 1. Token geldi, kaydet
        tap((response) => {
          if (response.isSuccess) {
            localStorage.setItem(this.tokenKey, response.data);
          }
        }),
        // 2. Hemen ardından 'me' endpointine git (SwitchMap önceki akışı bırakıp buna geçer)
        switchMap(() => this.me()),
        // 3. Sonuç olarak void döndür (Componentin detayı bilmesine gerek yok)
        map(() => void 0),
      );
  }

  // Interceptor olduğu için artık header eklememize gerek yok!
  me(): Observable<User> {
    return this.httpClient.get<ApiResponse<User>>(`${this.baseUrl}/me`).pipe(
      map((response) => response.data), // Sadece user datasını al
      tap((user) => {
        this.setUserToStorage(user);
        this.currentUser.set(user); // Sinyali güncelle, tüm uygulama haberdar olsun
      }),
    );
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUser.set(null); // Sinyali sıfırla
    this.router.navigate(['/login']);
  }

  get getAccessToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    // Sadece token varlığı yetmez, currentUser sinyali de dolu olmalı
    return !!this.getAccessToken;
  }

  // Helper: Storage işlemleri
  private getUserFromStorage(): User | null {
    const userStr = localStorage.getItem(this.userKey);
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  private setUserToStorage(user: User) {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }
}
