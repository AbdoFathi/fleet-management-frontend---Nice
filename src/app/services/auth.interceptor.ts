import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const token = authService.getStoredToken();
  
  // Add token to request if available and not a public endpoint
  let authReq = req;
  if (token && !req.url.includes('/public/')) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError(error => {
      if (error.status === 401 && !req.url.includes('/public/') && !isRefreshing) {
        return handleUnauthorized(authReq, next, authService);
      }
      return throwError(() => error);
    })
  );
};

function handleUnauthorized(req: HttpRequest<any>, next: HttpHandlerFn, authService: AuthService) {
  if (isRefreshing) {
    return throwError(() => new Error('Token refresh in progress'));
  }

  isRefreshing = true;

  return authService.refreshToken().pipe(
    switchMap(response => {
      isRefreshing = false;
      const newReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${response.accessToken}`
        }
      });
      return next(newReq);
    }),
    catchError(error => {
      isRefreshing = false;
      authService.logout().subscribe();
      return throwError(() => error);
    })
  );
}