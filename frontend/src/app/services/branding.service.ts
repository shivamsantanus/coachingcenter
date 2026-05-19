import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, map, catchError } from 'rxjs';
import { environment } from '../../environments/environment';
import { TenantBranding, TeacherPreview } from '../models/branding.models';

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
