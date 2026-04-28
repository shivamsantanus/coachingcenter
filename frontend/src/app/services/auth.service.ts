import { Injectable } from '@angular/core';
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

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => this.saveContext(response))
    );
  }

  logout(): void {
    localStorage.removeItem(this.contextKey);
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
    const raw = localStorage.getItem(this.contextKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthContext;
    } catch {
      return null;
    }
  }

  private saveContext(response: LoginResponse): void {
    localStorage.setItem(this.contextKey, JSON.stringify(response));
  }
}
