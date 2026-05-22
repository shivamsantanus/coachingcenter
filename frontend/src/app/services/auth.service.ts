import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  LoginRequest,
  RegisterRequest,
  AuthData,
  AuthContext,
  VerifyEmailRequest,
  ResendOtpRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  PlatformLoginRequest
} from '../models/auth.models';

interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authUrl = `${environment.apiBaseUrl}/auth`;
  private readonly contextKey = 'auth_context';

  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private get storage(): Storage | null {
    return isPlatformBrowser(this.platformId) ? localStorage : null;
  }

  platformLogin(credentials: PlatformLoginRequest): Observable<AuthData> {
    return this.http
      .post<ApiEnvelope<AuthData>>(`${this.authUrl}/platform-login`, credentials)
      .pipe(
        map(envelope => {
          if (!envelope.success || !envelope.data) {
            throw new Error(envelope.error ?? 'Login failed.');
          }
          return envelope.data;
        }),
        tap(authData => this.saveContext(authData)),
        catchError(err => {
          const message = err?.error?.error ?? err?.message ?? 'Login failed. Please try again.';
          return throwError(() => new Error(message));
        })
      );
  }

  login(credentials: LoginRequest): Observable<AuthData> {
    return this.http
      .post<ApiEnvelope<AuthData>>(`${this.authUrl}/login`, credentials)
      .pipe(
        map(envelope => {
          if (!envelope.success || !envelope.data) {
            throw new Error(envelope.error ?? 'Login failed.');
          }
          return envelope.data;
        }),
        tap(authData => this.saveContext(authData)),
        catchError(err => {
          const message = err?.error?.error ?? err?.message ?? 'Login failed. Please try again.';
          return throwError(() => new Error(message));
        })
      );
  }

  register(request: RegisterRequest): Observable<{ message: string }> {
    return this.http
      .post<ApiEnvelope<{ message: string }>>(`${this.authUrl}/register`, request)
      .pipe(
        map(envelope => {
          if (!envelope.success || !envelope.data) {
            throw new Error(envelope.error ?? 'Registration failed.');
          }
          return envelope.data;
        }),
        catchError(err => {
          const message = err?.error?.error ?? err?.message ?? 'Registration failed. Please try again.';
          return throwError(() => new Error(message));
        })
      );
  }

  verifyEmail(request: VerifyEmailRequest): Observable<{ message: string }> {
    return this.http
      .post<ApiEnvelope<{ message: string }>>(`${this.authUrl}/verify-email`, request)
      .pipe(
        map(envelope => {
          if (!envelope.success || !envelope.data) {
            throw new Error(envelope.error ?? 'Verification failed.');
          }
          return envelope.data;
        }),
        catchError(err => {
          const message = err?.error?.error ?? err?.message ?? 'Verification failed. Please try again.';
          return throwError(() => new Error(message));
        })
      );
  }

  resendOtp(request: ResendOtpRequest): Observable<{ message: string }> {
    return this.http
      .post<ApiEnvelope<{ message: string }>>(`${this.authUrl}/resend-otp`, request)
      .pipe(
        map(envelope => {
          if (!envelope.success || !envelope.data) {
            throw new Error(envelope.error ?? 'Resend failed.');
          }
          return envelope.data;
        }),
        catchError(err => {
          const message = err?.error?.error ?? err?.message ?? 'Could not resend OTP. Please try again.';
          return throwError(() => new Error(message));
        })
      );
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<{ message: string }> {
    return this.http
      .post<ApiEnvelope<{ message: string }>>(`${this.authUrl}/forgot-password`, request)
      .pipe(
        map(envelope => {
          if (!envelope.success || !envelope.data) {
            throw new Error(envelope.error ?? 'Request failed.');
          }
          return envelope.data;
        }),
        catchError(err => {
          const message = err?.error?.error ?? err?.message ?? 'Unable to reach the server. Please try again.';
          return throwError(() => new Error(message));
        })
      );
  }

  resetPassword(request: ResetPasswordRequest): Observable<{ message: string }> {
    return this.http
      .post<ApiEnvelope<{ message: string }>>(`${this.authUrl}/reset-password`, request)
      .pipe(
        map(envelope => {
          if (!envelope.success || !envelope.data) {
            throw new Error(envelope.error ?? 'Password reset failed.');
          }
          return envelope.data;
        }),
        catchError(err => {
          const message = err?.error?.error ?? err?.message ?? 'Password reset failed. Please try again.';
          return throwError(() => new Error(message));
        })
      );
  }

  resendResetOtp(request: ForgotPasswordRequest): Observable<{ message: string }> {
    return this.http
      .post<ApiEnvelope<{ message: string }>>(`${this.authUrl}/resend-reset-otp`, request)
      .pipe(
        map(envelope => {
          if (!envelope.success || !envelope.data) {
            throw new Error(envelope.error ?? 'Resend failed.');
          }
          return envelope.data;
        }),
        catchError(err => {
          const message = err?.error?.error ?? err?.message ?? 'Could not resend OTP. Please try again.';
          return throwError(() => new Error(message));
        })
      );
  }

  logout(): void {
    this.storage?.removeItem(this.contextKey);
  }

  isLoggedIn(): boolean {
    return !!this.getContext()?.token;
  }

  getToken(): string | null {
    return this.getContext()?.token ?? null;
  }

  getRole(): string | null {
    return this.getContext()?.role ?? null;
  }

  getTenantSlug(): string | null {
    return this.getContext()?.tenantSlug ?? null;
  }

  getFullName(): string | null {
    return this.getContext()?.fullName ?? null;
  }

  getContext(): AuthContext | null {
    const raw = this.storage?.getItem(this.contextKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthContext;
    } catch {
      return null;
    }
  }

  private saveContext(authData: AuthData): void {
    this.storage?.setItem(this.contextKey, JSON.stringify(authData));
  }
}
