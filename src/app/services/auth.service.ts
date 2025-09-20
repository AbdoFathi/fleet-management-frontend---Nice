import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError, timer, Subscription } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { UserInfo } from '../models/user.model';
import { ApiResponse } from '../models/api-response.model';
import { 
  LoginRequest, 
  LoginResponse, 
  RefreshTokenResponse
} from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_BASE = 'http://localhost:8080/api/auth';
  private readonly TOKEN_KEY = 'access_token';

  private currentUserSubject = new BehaviorSubject<UserInfo | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private tokenRefreshTimer: Subscription | null = null;

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const token = this.getStoredToken();
    if (token && !this.isTokenExpired(token)) {
      const userInfo = this.getStoredUserInfo();
      if (userInfo) {
        this.setUserAuthenticated(userInfo, token);

        // حساب وقت الانتهاء من JWT
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiryTime = payload.exp * 1000;
        const now = Date.now();
        const refreshInterval = expiryTime - now - 10_000; // 10 ثواني قبل الانتهاء

        this.startTokenRefreshTimer(refreshInterval);
      }
    } else {
      this.clearAuth();
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.API_BASE}/public/login`, credentials, {
      withCredentials: true
    }).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.handleLoginSuccess(response.data);
        }
      }),
      catchError(this.handleError.bind(this)),
      switchMap(response => {
        if (response.success && response.data) {
          return [response.data];
        }
        throw new Error(response.message || 'Login failed');
      })
    );
  }

  private handleLoginSuccess(loginResponse: LoginResponse): void {
    // Store token and user info
    localStorage.setItem(this.TOKEN_KEY, loginResponse.accessToken);
    localStorage.setItem('user_info', JSON.stringify(loginResponse.userInfo));
    
    // Update subjects
    this.setUserAuthenticated(loginResponse.userInfo, loginResponse.accessToken);
    
    // حساب وقت الانتهاء من الـ response مباشرة
    if (loginResponse.expiresAt) {
      const expiryTime = new Date(loginResponse.expiresAt).getTime();
      const now = Date.now();
      const refreshInterval = expiryTime - now - 10_000; // 10 ثواني قبل الانتهاء

      this.startTokenRefreshTimer(refreshInterval);
    } else {
      // fallback لو السيرفر ما رجع expiresAt → نستخرجه من JWT
      const payload = JSON.parse(atob(loginResponse.accessToken.split('.')[1]));
      const expiryTime = payload.exp * 1000;
      const now = Date.now();
      const refreshInterval = expiryTime - now - 10_000;

      this.startTokenRefreshTimer(refreshInterval);
    }
  }

  private setUserAuthenticated(userInfo: UserInfo, token: string): void {
    this.currentUserSubject.next(userInfo);
    this.isAuthenticatedSubject.next(true);
  }

  refreshToken(): Observable<RefreshTokenResponse> {
    return this.http.post<ApiResponse<RefreshTokenResponse>>(`${this.API_BASE}/public/refresh-token-cookie`, {}, {
      withCredentials: true
    }).pipe(
      tap(response => {
        if (response.success && response.data) {
          localStorage.setItem(this.TOKEN_KEY, response.data.accessToken);

          // إعادة ضبط المؤقت بناءً على التوكن الجديد
          const payload = JSON.parse(atob(response.data.accessToken.split('.')[1]));
          const expiryTime = payload.exp * 1000;
          const now = Date.now();
          const refreshInterval = expiryTime - now - 10_000;

          this.startTokenRefreshTimer(refreshInterval);
        }
      }),
      catchError(error => {
        this.handleRefreshError();
        return throwError(() => error);
      }),
      switchMap(response => {
        if (response.success && response.data) {
          return [response.data];
        }
        throw new Error('Token refresh failed');
      })
    );
  }

  private startTokenRefreshTimer(intervalMs: number): void {
    this.clearTokenRefreshTimer();

    if (intervalMs > 0) {
      this.tokenRefreshTimer = timer(intervalMs, intervalMs).subscribe(() => {
        this.refreshToken().subscribe({
          error: () => this.handleRefreshError()
        });
      });
    }
  }

  private clearTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      this.tokenRefreshTimer.unsubscribe();
      this.tokenRefreshTimer = null;
    }
  }

  private handleRefreshError(): void {
    console.warn('Token refresh failed, logging out user');
    this.logout().subscribe();
  }

  logout(): Observable<any> {
    const token = this.getStoredToken();
    
    return this.http.post<ApiResponse<void>>(`${this.API_BASE}/logout-device`, {
      accessToken: token
    }, {
      withCredentials: true
    }).pipe(
      catchError(() => []), // Ignore logout errors
      tap(() => this.handleLogoutSuccess())
    );
  }

  private handleLogoutSuccess(): void {
    this.clearAuth();
    this.router.navigate(['/login']);
  }

  private clearAuth(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem('user_info');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.clearTokenRefreshTimer();
  }

  getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getStoredUserInfo(): UserInfo | null {
    const userInfoStr = localStorage.getItem('user_info');
    return userInfoStr ? JSON.parse(userInfoStr) : null;
  }

  getCurrentUser(): UserInfo | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000;
      return Date.now() > expiry;
    } catch {
      return true;
    }
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.roles?.includes(role) || false;
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some(role => this.hasRole(role));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'حدث خطأ غير متوقع';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.status === 0) {
      errorMessage = 'تعذر الاتصال بالخادم';
    } else if (error.status >= 500) {
      errorMessage = 'خطأ في الخادم';
    }

    return throwError(() => new Error(errorMessage));
  }
}
