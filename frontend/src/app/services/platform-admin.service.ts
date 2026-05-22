import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { TenantSummary, CreateTenantPayload } from '../models/tenant-admin.models';

interface ApiEnvelope<T> {
  success: boolean;
  data:    T | null;
  error:   string | null;
}

@Injectable({ providedIn: 'root' })
export class PlatformAdminService {
  private readonly http       = inject(HttpClient);
  private readonly tenantUrl  = `${environment.apiBaseUrl}/tenant`;

  getTenants(): Observable<TenantSummary[]> {
    return this.http
      .get<ApiEnvelope<TenantSummary[]>>(this.tenantUrl)
      .pipe(
        map(envelope => {
          if (!envelope.success || !envelope.data) {
            throw new Error(envelope.error ?? 'Failed to load tenants.');
          }
          return envelope.data;
        }),
        catchError(err => {
          const message = err?.error?.error ?? err?.message ?? 'Failed to load tenants.';
          return throwError(() => new Error(message));
        })
      );
  }

  updateTenantStatus(id: string, status: 'ACTIVE' | 'SUSPENDED'): Observable<void> {
    return this.http
      .patch<{ success: boolean; error: string | null }>(`${this.tenantUrl}/${id}/status`, { status })
      .pipe(
        map(envelope => {
          if (!envelope.success) throw new Error(envelope.error ?? 'Failed to update status.');
        }),
        catchError(err => {
          const message = err?.error?.error ?? err?.message ?? 'Failed to update status.';
          return throwError(() => new Error(message));
        })
      );
  }

  deleteTenant(id: string): Observable<void> {
    return this.http
      .delete<{ success: boolean; error: string | null }>(`${this.tenantUrl}/${id}`)
      .pipe(
        map(envelope => {
          if (!envelope.success) throw new Error(envelope.error ?? 'Failed to delete tenant.');
        }),
        catchError(err => {
          const message = err?.error?.error ?? err?.message ?? 'Failed to delete tenant.';
          return throwError(() => new Error(message));
        })
      );
  }

  createTenant(payload: CreateTenantPayload): Observable<TenantSummary> {
    return this.http
      .post<ApiEnvelope<TenantSummary>>(this.tenantUrl, payload)
      .pipe(
        map(envelope => {
          if (!envelope.success || !envelope.data) {
            throw new Error(envelope.error ?? 'Failed to create tenant.');
          }
          return envelope.data;
        }),
        catchError(err => {
          const message = err?.error?.error ?? err?.message ?? 'Failed to create tenant.';
          return throwError(() => new Error(message));
        })
      );
  }
}
