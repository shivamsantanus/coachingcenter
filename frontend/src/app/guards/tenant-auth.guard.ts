import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TenantContextService } from '../services/tenant-context.service';

export const tenantAuthGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService   = inject(AuthService);
  const router        = inject(Router);
  const tenantContext = inject(TenantContextService);

  // Allow any logged-in non-platform-admin user (ORG_ADMIN, TEACHER, STUDENT)
  if (authService.isLoggedIn() && authService.getRole() !== 'PLATFORM_ADMIN') {
    return true;
  }

  // Unauthenticated (or PLATFORM_ADMIN trying to access a tenant shell):
  // Redirect to the tenant login on ClassNova domain, or /login on custom domain.

  if (tenantContext.isCustomDomain()) {
    return router.createUrlTree(['/login']);
  }

  // Walk up the route snapshot tree to find the :slug param
  let snapshot: ActivatedRouteSnapshot | null = route;
  while (snapshot) {
    const slug = snapshot.paramMap.get('slug');
    if (slug) return router.createUrlTree([`/t/${slug}/login`]);
    snapshot = snapshot.parent;
  }

  // Fallback — slug not found in route tree (shouldn't happen)
  return router.createUrlTree(['/login']);
};
