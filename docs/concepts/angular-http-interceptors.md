# Angular HTTP Interceptors

## What it is

An HTTP interceptor is middleware for Angular's `HttpClient`. Every HTTP request made by the app passes through the interceptor pipeline before being sent, and every response passes back through it. Interceptors are ideal for cross-cutting concerns: attaching auth tokens, logging, error handling, or retrying requests.

Angular 15+ supports **functional interceptors** — plain functions instead of classes.

## Why we use it in ClassNova

Every API call to the ClassNova backend needs an `Authorization: Bearer <token>` header. Without an interceptor, we'd have to manually add the header in every service method. The interceptor attaches the token once, centrally, automatically.

## How we use it — with examples

**The auth interceptor** (`frontend/src/app/interceptors/auth.interceptor.ts`):

```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    // Clone the request — HttpRequest is immutable
    const authenticatedRequest = request.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(authenticatedRequest);
  }

  return next(request);   // no token — pass through unchanged (public endpoints)
};
```

**Registering the interceptor** (`app.config.ts`):

```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    ...
  ]
};
```

**How it flows:**

```
Component calls service.getStudents()
  → HttpClient sends GET /api/students
    → authInterceptor runs: clones request, adds Authorization header
      → request reaches the backend with token attached
        → response flows back through interceptor (no modification needed)
          → service .subscribe() receives the response
```

## Key rules / gotchas

- **`HttpRequest` is immutable** — always clone it with `request.clone(...)` before modifying. Never mutate the original.
- **`auth.interceptor.ts` is in the Out of Scope list in CLAUDE.md** — do not modify it without explicit instruction.
- **Public endpoints** (tenant branding, OTP verification) still pass through the interceptor — the `if (token)` check ensures the header is only attached when a token exists.
- **Order matters** — if multiple interceptors are registered, they run in the order listed in `withInterceptors([...])`.
- **Functional interceptors use `inject()`** — the function runs in an injection context, so `inject(AuthService)` works without a constructor.

## Where to find it in the codebase

| Location | Purpose |
|---|---|
| `frontend/src/app/interceptors/auth.interceptor.ts` | Bearer token attachment |
| `frontend/src/app/app.config.ts` | Interceptor registration via `withInterceptors` |
