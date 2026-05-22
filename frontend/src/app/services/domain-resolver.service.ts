import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { TenantBranding } from '../models/branding.models';
import { TenantContextService } from './tenant-context.service';
import { BrandingService } from './branding.service';

@Injectable({ providedIn: 'root' })
export class DomainResolverService {
  private readonly http            = inject(HttpClient);
  private readonly platformId      = inject(PLATFORM_ID);
  private readonly tenantContext   = inject(TenantContextService);
  private readonly brandingService = inject(BrandingService);

  resolve(): Observable<void> {
    if (!isPlatformBrowser(this.platformId)) return of(undefined);

    const hostname = window.location.hostname;

    return this.http.get<TenantBranding>(
      `${environment.apiBaseUrl}/tenant/by-domain?hostname=${encodeURIComponent(hostname)}`
    ).pipe(
      tap(branding => {
        this.tenantContext.setContext(branding.slug, true);
        this.brandingService.sideloadBranding(branding);
      }),
      map(() => undefined),
      catchError(() => of(undefined))
    );
  }
}
