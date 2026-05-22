import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, map, catchError } from 'rxjs';
import { environment } from '../../environments/environment';
import { TenantBranding, TeacherPreview, UpdateBrandingRequest } from '../models/branding.models';

interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly http       = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  readonly branding  = signal<TenantBranding | null>(null);
  readonly isLoading = signal(false);

  loadBranding(slug: string): Observable<TenantBranding | null> {
    const cached = this.branding();
    if (cached?.slug === slug) return of(cached);

    this.isLoading.set(true);

    return this.http.get<TenantBranding>(`${environment.apiBaseUrl}/tenant/${slug}`).pipe(
      tap(brandingData => {
        this.branding.set(brandingData);
        this.applyTheme(brandingData);
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.isLoading.set(false);
        return of(null);
      })
    );
  }

  sideloadBranding(brandingData: TenantBranding): void {
    this.branding.set(brandingData);
    this.applyTheme(brandingData);
  }

  loadTeachersPreview(slug: string): Observable<TeacherPreview[]> {
    return this.http
      .get<ApiEnvelope<TeacherPreview[]>>(
        `${environment.apiBaseUrl}/tenant/teachers-preview`,
        { params: { slug } }
      )
      .pipe(
        map(envelope => envelope.data ?? []),
        catchError(() => of([] as TeacherPreview[]))
      );
  }

  applyTheme(brandingData: TenantBranding): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const root = document.documentElement;
    if (brandingData.primaryColor) {
      root.style.setProperty('--brand-primary', brandingData.primaryColor);
      root.style.setProperty('--cn-primary', brandingData.primaryColor);
    }
    if (brandingData.accentColor) {
      root.style.setProperty('--brand-accent', brandingData.accentColor);
      root.style.setProperty('--cn-accent', brandingData.accentColor);
    }
  }

  saveBranding(request: UpdateBrandingRequest): Observable<{ message: string }> {
    return this.http
      .put<{ success: boolean; data: { message: string } | null; error: string | null }>(
        `${environment.apiBaseUrl}/tenant/branding`,
        request
      )
      .pipe(
        map(envelope => {
          if (!envelope.success || !envelope.data) {
            throw new Error(envelope.error ?? 'Failed to save branding.');
          }
          return envelope.data;
        }),
        catchError(err => {
          const message = err?.error?.error ?? err?.message ?? 'Failed to save branding.';
          throw new Error(message);
        })
      );
  }

  clearTheme(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const root = document.documentElement;
    root.style.removeProperty('--brand-primary');
    root.style.removeProperty('--brand-accent');
    root.style.removeProperty('--cn-primary');
    root.style.removeProperty('--cn-accent');
    this.branding.set(null);
  }
}
