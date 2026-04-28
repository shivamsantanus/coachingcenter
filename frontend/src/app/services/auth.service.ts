import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface LoginRequest {
  email: string;
  password: string;
  tenantSlug: string;
}

export interface LoginResponse {
  token: string;
  role: string;
  tenantSlug: string;
  tenantName: string;
  fullName: string;
}

export interface AuthContext {
  token: string;
  role: string;
  tenantSlug: string;
  tenantName: string;
  fullName: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = 'http://localhost:5188/api/auth';
  private readonly contextKey = 'auth_context';

  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  private get storage(): Storage | null {
    return isPlatformBrowser(this.platformId) ? localStorage : null;
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => this.saveContext(response))
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

  private saveContext(response: LoginResponse): void {
    this.storage?.setItem(this.contextKey, JSON.stringify(response));
  }
}
