# Angular Route Guards

## What it is

A route guard is a function (or class) that Angular runs before activating a route. It returns `true` to allow navigation, `false` to block it, or a `UrlTree` to redirect somewhere else. Guards protect routes from being accessed by users who shouldn't see them.

Angular 15+ recommends **functional guards** — plain functions, not classes — which is what this project uses exclusively.

## Why we use it in ClassNova

ClassNova has multiple auth layers:
- **`authGuard`** — blocks unauthenticated users from the main app shell.
- **`platformAdminGuard`** — blocks non-PLATFORM_ADMIN users from the `/admin` routes.
- **`tenantAuthGuard`** — protects tenant-specific routes (`/t/:slug/*`) requiring the user to be logged in to that specific tenant.
- **`redirectIfLoggedInGuard`** — prevents logged-in users from revisiting the login page.

## How we use it — with examples

**Functional guard definition:**

```typescript
// frontend/src/app/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  if (authService.isAuthenticated()) return true;
  return router.createUrlTree(['/login']);   // redirect, not just false
};
```

**Applying a guard to routes** (`app.routes.ts`):

```typescript
{
  path: '',
  component: ShellComponent,
  canActivate: [authGuard],       // guard on the parent applies to all children
  children: [
    { path: 'dashboard', component: DashboardComponent },
    { path: 'students',  component: StudentsComponent },
  ]
}
```

**`canMatch` guard** — used for custom-domain routing to match a route group only when a tenant is resolved:

```typescript
export const tenantDomainGuard: CanMatchFn = () => {
  const tenantContext = inject(TenantContextService);
  return tenantContext.hasResolvedTenant();
};
```

**Redirecting logged-in users away from login:**

```typescript
export const redirectIfLoggedInGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  if (!authService.isAuthenticated()) return true;
  return router.createUrlTree(['/dashboard']);
};
```

## Key rules / gotchas

- **Always return a `UrlTree` for redirects**, not `false`. Returning `false` just stops navigation without sending the user anywhere useful.
- **Use `inject()` inside the guard function** — guards are called in an injection context so `inject()` works.
- **`canActivate` vs `canMatch`** — `canActivate` runs after the route is matched; `canMatch` runs before and can exclude a route entirely from matching. Use `canMatch` when you want the router to try the next route in the list if the guard returns false.
- **Guards are composable** — `canActivate: [authGuard, roleGuard]` runs both; all must pass.
- **No class-based guards** in this project — functional guards only (cleaner, no need for `CanActivate` interface).

## Where to find it in the codebase

| Location | Purpose |
|---|---|
| `frontend/src/app/guards/auth.guard.ts` | Main auth check — redirects to `/login` |
| `frontend/src/app/guards/tenant-auth.guard.ts` | Tenant-scoped auth for `/t/:slug` routes |
| `frontend/src/app/guards/redirect-if-logged-in.guard.ts` | Prevents re-visiting login when already authenticated |
| `frontend/src/app/app.routes.ts` | All guard assignments |
