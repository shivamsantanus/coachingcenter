# Tenant-Branded Auth Pages

## Status: In Progress

## Requirements

Every coaching centre gets branded login / register / password-reset pages at:

| URL | Purpose |
|---|---|
| `/t/:slug/login` | Sign in with org branding |
| `/t/:slug/register` | Student self-registration |
| `/t/:slug/verify-email` | OTP verification after registration |
| `/t/:slug/forgot-password` | Request password-reset OTP |
| `/t/:slug/reset-password` | Enter OTP + new password |

- Left panel shows the org's logo, brand name, and primary colour
- No "Organisation ID" field — slug comes from the route
- `roleCode` is hardcoded to `STUDENT` for self-registration
- "Sign In" and "Enroll Now" CTAs on the landing page link to tenant auth pages
- Generic `/login` and `/register` routes remain as a fallback for direct navigation

## Architecture

`TenantAuthComponent` is a **routing shell** — it loads branding and renders the branded
left panel. Child routes (`login`, `register`, …) render in its `<router-outlet>`.

```
/t/:slug  (component-less parent)
  ├── ''           → LandingPageComponent        (pathMatch: 'full')
  └── ''           → TenantAuthComponent         (shell — loads branding)
        ├── login           → TenantLoginComponent
        ├── register        → TenantRegisterComponent
        ├── verify-email    → TenantVerifyEmailComponent
        ├── forgot-password → TenantForgotPasswordComponent
        └── reset-password  → TenantResetPasswordComponent
```

## Slug access pattern

`TenantAuthComponent` reads slug from `route.snapshot.parent` (one level up from the
component-less `t/:slug` route).

Child components traverse `ActivatedRoute.snapshot` upward until `slug` param is found.

## API contract (no backend changes)

All existing auth endpoints are reused — the `tenantSlug` field is populated from the
route param instead of a form field.

| Endpoint | Used by |
|---|---|
| `POST /api/auth/login` | TenantLoginComponent |
| `POST /api/auth/register` | TenantRegisterComponent (roleCode: STUDENT) |
| `POST /api/auth/verify-email` | TenantVerifyEmailComponent |
| `POST /api/auth/resend-otp` | TenantVerifyEmailComponent |
| `POST /api/auth/forgot-password` | TenantForgotPasswordComponent |
| `POST /api/auth/reset-password` | TenantResetPasswordComponent |
| `POST /api/auth/resend-reset-otp` | TenantResetPasswordComponent |

## Edge cases

- Direct navigation to `/t/unknown/login` → TenantAuthComponent sets `notFound = true`,
  shows "Organisation not found" message
- Already-logged-in user → TenantLoginComponent redirects to `/dashboard`
- Email passed between verify-email / reset-password pages via query param `?email=`
