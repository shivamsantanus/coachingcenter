import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TenantContextService } from '../services/tenant-context.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService   = inject(AuthService);
  const router        = inject(Router);
  const tenantContext = inject(TenantContextService);

  const token     = authService.getToken();
  const authedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Only treat 401 as "session expired" when we actually sent a token.
      // Auth endpoints (login, register, forgot-password, etc.) are anonymous —
      // a 401 from those means "wrong credentials", not "expired session".
      // Without this guard the login component gets destroyed before its error
      // callback fires, leaving the user with a silent no-op on bad credentials.
      if (err.status === 401 && authedReq.headers.has('Authorization')) {
        const slug = tenantContext.slug() || authService.getTenantSlug();
        authService.logout();

        if (tenantContext.isCustomDomain()) {
          router.navigate(['/login']);
        } else if (slug) {
          router.navigate([`/t/${slug}/login`]);
        } else {
          router.navigate(['/login']);
        }
      }
      return throwError(() => err);
    })
  );
};
