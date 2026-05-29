import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const redirectIfLoggedInGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  if (!authService.isLoggedIn()) return true;

  const role = authService.getRole();
  if (role === 'PLATFORM_ADMIN') {
    return router.createUrlTree(['/admin/tenants']);
  }
  const slug = authService.getTenantSlug();
  if (slug) {
    return router.createUrlTree([`/t/${slug}/dashboard`]);
  }
  return true; // logged in but no resolvable destination — let the component handle it
};
