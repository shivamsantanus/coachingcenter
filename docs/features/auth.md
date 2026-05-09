# Feature: Authentication — Login & Signup

**Status:** In Progress  
**Last updated:** 2026-05-09

---

## 1. Requirements

### 1.1 Login
- A user must supply their **Organization ID** (tenant slug), **email**, and **password**
- The tenant must exist and be **ACTIVE**
- The user must exist, belong to that tenant, and have an **ACTIVE** role assignment
- On success the client receives a **JWT** (8-hour expiry) plus display context (role, tenant name, full name)
- The token is stored in `localStorage` under the key `auth_context`
- All subsequent API requests attach the token via the `Authorization: Bearer` header
- On failure a human-readable error message is shown in-form — no redirect

### 1.2 Signup (User Registration)
- A prospective user supplies: **full name**, **Organization ID**, **email**, **password**, **confirm password**, and **role**
- Allowed self-signup roles: `ORG_ADMIN`, `TEACHER`, `STUDENT` — `PLATFORM_ADMIN` is never available for self-signup
- The tenant must exist and be **ACTIVE** before a user can register against it
- Email must be unique globally across all users
- Password must be at least 8 characters
- Confirm password must match password
- On success the user is redirected to `/login` with a success banner
- On failure a human-readable error is shown in-form

### 1.3 Navigation
- Login page has a "Don't have an account? Sign up" link → `/register`
- Register page has an "Already have an account? Sign in" link → `/login`
- Both pages are publicly accessible (no auth guard)

### 1.4 Out of scope (this iteration)
- Password reset / forgot password
- Email verification
- Token refresh
- OAuth / social auth
- Tenant onboarding (creating a new tenant)
- Account lockout / brute-force protection

---

## 2. Implementation Plan

### Backend (fixes only — endpoints already exist)
1. Wrap all three `AuthController` responses in the standard `{ success, data, error }` envelope
2. Convert `SaveChanges()` → `SaveChangesAsync()` and make action methods `async Task<IActionResult>`
3. Keep existing validation logic unchanged

### Frontend
1. Create `src/environments/environment.ts` and `environment.prod.ts`
2. Wire up `fileReplacements` in `angular.json` for the production build
3. Move auth interfaces to `src/app/models/auth.models.ts`
4. Update `AuthService`:
   - Replace hardcoded URL with `environment.apiBaseUrl`
   - Add `RegisterRequest` interface
   - Add `register()` method
   - Unwrap `data` field from the new standard API envelope
   - Add `catchError` to `login()` and `register()`
5. Fix `LoginComponent`:
   - Replace constructor injection with `inject()`
   - Add `OnDestroy` + `takeUntil(destroy$)` for subscription cleanup
   - Add link to `/register`
6. Create `RegisterComponent` (new file)
7. Add `/register` route to `app.routes.ts`

---

## 3. API Contract

### POST `/api/auth/login`

**Request**
```json
{
  "tenantSlug": "bright-future",
  "email": "admin@example.com",
  "password": "secret123"
}
```

**Success — 200**
```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "role": "ORG_ADMIN",
    "tenantSlug": "bright-future",
    "tenantName": "Bright Future Academy",
    "fullName": "Shivam Kumar"
  },
  "error": null
}
```

**Failure — 401**
```json
{
  "success": false,
  "data": null,
  "error": "Invalid email or password."
}
```

---

### POST `/api/auth/register`

**Request**
```json
{
  "fullName": "Shivam Kumar",
  "tenantSlug": "bright-future",
  "email": "shivam@example.com",
  "password": "secret123",
  "roleCode": "ORG_ADMIN"
}
```

**Success — 200**
```json
{
  "success": true,
  "data": { "message": "User registered successfully." },
  "error": null
}
```

**Failure — 400**
```json
{
  "success": false,
  "data": null,
  "error": "Email is already registered."
}
```

---

### GET `/api/auth/me` _(requires Bearer token)_

**Success — 200**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "fullName": "Shivam Kumar",
    "email": "shivam@example.com",
    "tenantId": "uuid",
    "tenantSlug": "bright-future",
    "role": "ORG_ADMIN"
  },
  "error": null
}
```

---

## 4. Data Models

### Frontend — `src/app/models/auth.models.ts`

```typescript
export interface LoginRequest {
  tenantSlug: string;
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  tenantSlug: string;
  email: string;
  password: string;
  roleCode: string;
}

export interface AuthData {
  token: string;
  role: string;
  tenantSlug: string;
  tenantName: string;
  fullName: string;
}

export interface AuthContext {
  token: string;
  role: string;
  tenantSlug: string;
  tenantName: string;
  fullName: string;
}
```

### Backend — existing models (no changes needed)
- `LoginRequest.cs` — `TenantSlug`, `Email`, `Password`
- `AuthRequest.cs` — `FullName`, `Email`, `Password`, `TenantSlug`, `RoleCode`

---

## 5. Component Specification

### LoginComponent (`/login`)

| Field | Type | Validation |
|---|---|---|
| Organization ID | text | required |
| Email | email | required, email format |
| Password | password | required |

- Shows field-level error messages on touched + invalid
- Shows API error banner on failed submit
- Loading spinner on submit button while request in flight
- "Don't have an account? Sign up" link → `/register`
- On success: navigate to `/dashboard`

---

### RegisterComponent (`/register`)

| Field | Type | Validation |
|---|---|---|
| Full Name | text | required |
| Organization ID | text | required |
| Email | email | required, email format |
| Password | password | required, minLength 8 |
| Confirm Password | password | required, must match password |
| Role | select | required; options: ORG_ADMIN, TEACHER, STUDENT |

- Shows field-level error messages on touched + invalid
- Shows API error banner on failed submit
- Loading spinner on submit button while request in flight
- "Already have an account? Sign in" link → `/login`
- On success: show green success banner, redirect to `/login` after 2 seconds

---

## 6. Edge Cases

| Scenario | Expected Behaviour |
|---|---|
| Tenant slug does not exist | Error: "Tenant not found." |
| Tenant exists but is INACTIVE | Error: "Tenant is not active." |
| Login — wrong password | Error: "Invalid email or password." (do not reveal which field is wrong) |
| Login — user not linked to tenant | Error: "User does not have access to this tenant." |
| Login — user account inactive | Error: "Account is inactive." |
| Register — email already taken globally | Error: "Email is already registered." |
| Register — passwords do not match | Client-side validation before API call |
| Register — password < 8 chars | Client-side validation before API call |
| Register — invalid role code | Error: "Invalid role code." |
| Expired JWT on protected route | Interceptor sends request; 401 response → guard redirects to `/login` |
| User navigates to `/login` while already logged in | Redirect to `/dashboard` |
| User navigates to `/dashboard` while not logged in | Auth guard redirects to `/login` |
| Network error during login/register | Error: "Unable to reach the server. Please try again." |

---

## 7. Test Cases

### Login — Happy Path
1. Enter valid tenant slug, email, and password → navigates to `/dashboard`
2. Auth context saved in `localStorage` with correct token, role, tenantSlug, tenantName, fullName
3. All subsequent API requests include `Authorization: Bearer <token>` header

### Login — Error Paths
4. Wrong password → error banner "Invalid email or password."
5. Unknown tenant slug → error banner "Tenant not found."
6. Inactive tenant → error banner "Tenant is not active."
7. User has no role in tenant → error banner "User does not have access to this tenant."
8. Submit with empty fields → form invalid, button disabled, field errors shown
9. Submit with invalid email format → field error shown, no API call

### Register — Happy Path
10. Fill all valid fields, matching passwords → success banner, redirected to `/login`
11. User record created in DB, `TenantUserRole` row created with ACTIVE status
12. Registered user can immediately log in with the new credentials

### Register — Error Paths
13. Passwords do not match → client-side error, no API call
14. Password shorter than 8 characters → client-side error, no API call
15. Email already registered → error banner "Email is already registered."
16. Unknown tenant slug → error banner "Tenant not found."
17. Submit with empty fields → form invalid, button disabled, field errors shown

### Auth Guard
18. Unauthenticated user visits `/dashboard` → redirected to `/login`
19. Authenticated user visits `/login` → redirected to `/dashboard`
20. Logout clears `localStorage`, next route navigation redirects to `/login`
