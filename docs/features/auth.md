# Feature: Authentication — Login, Signup & Branch Selection

**Status:** In Progress  
**Last updated:** 2026-05-13

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

### 1.3 Branch Selection (Multi-Branch Users)

- After credentials are verified, the server checks how many **ACTIVE** `TenantUserRole` rows exist for that user+tenant combination
- **Single branch or no branch restriction (`branch_id = NULL`):**
  - JWT is issued immediately — no extra step
  - `branch_id = NULL` in JWT means the user can see **all branches** (typically ORG_ADMIN)
- **Multiple branch assignments:**
  - Server returns a `requiresBranchSelection: true` response with a list of available branches
  - Login page renders a **branch dropdown** without re-entering credentials
  - User selects a branch and resubmits — server issues JWT scoped to that branch
  - `branch_id` is embedded in the JWT claim so every API call is automatically branch-scoped

```
Login flow with branch selection:

STEP 1 — Credentials
  User enters: tenantSlug + email + password
                      ↓
  Server verifies tenant + user + password
                      ↓
  ┌─────────────────────────────────────┐
  │ How many branch assignments?        │
  ├─────────────────────────────────────┤
  │ 0 or 1 (or branch_id = NULL)        │  →  JWT issued → Dashboard
  │ 2+                                  │  →  Branch list returned
  └─────────────────────────────────────┘

STEP 2 — Branch Selection (only if multiple branches)
  User sees branch dropdown (pre-populated from server)
  User selects branch → Submit
                      ↓
  Server issues JWT with selected branch_id embedded
                      ↓
  Dashboard (branch-scoped)
```

- ORG_ADMIN with `branch_id = NULL` lands on dashboard with an **"All Branches"** global view
- ORG_ADMIN can use a **branch filter** inside the dashboard to narrow down to one branch — this is a UI preference, not a re-login
- A teacher assigned to multiple branches **must** pick one branch at login; they would log out and back in to switch branches

### 1.4 Out of scope (this iteration)
- Password reset / forgot password
- Email verification
- Token refresh
- OAuth / social auth
- Tenant onboarding (creating a new tenant)
- Account lockout / brute-force protection
- In-dashboard branch switching (user must log out and log in to change branch context)

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

This endpoint handles **both steps** of the login flow via the optional `branchId` field.

**Request — Step 1 (credentials only)**
```json
{
  "tenantSlug": "bright-future",
  "email": "admin@example.com",
  "password": "secret123"
}
```

**Response — Step 1A: Single/no branch → JWT issued immediately (200)**
```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "role": "ORG_ADMIN",
    "tenantSlug": "bright-future",
    "tenantName": "Bright Future Academy",
    "fullName": "Shivam Kumar",
    "branchId": null,
    "branchName": null,
    "requiresBranchSelection": false
  },
  "error": null
}
```

**Response — Step 1B: Multiple branches → branch selection required (200)**
```json
{
  "success": true,
  "data": {
    "token": null,
    "requiresBranchSelection": true,
    "branches": [
      { "id": "uuid-b1", "name": "HQ Main Campus" },
      { "id": "uuid-b2", "name": "City Branch" }
    ]
  },
  "error": null
}
```

**Request — Step 2 (credentials + selected branch)**
```json
{
  "tenantSlug": "bright-future",
  "email": "admin@example.com",
  "password": "secret123",
  "branchId": "uuid-b1"
}
```

**Response — Step 2: JWT issued scoped to selected branch (200)**
```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "role": "TEACHER",
    "tenantSlug": "bright-future",
    "tenantName": "Bright Future Academy",
    "fullName": "Priya Nair",
    "branchId": "uuid-b1",
    "branchName": "HQ Main Campus",
    "requiresBranchSelection": false
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

**Failure — branch not assigned to user — 403**
```json
{
  "success": false,
  "data": null,
  "error": "You do not have access to the selected branch."
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
  email:      string;
  password:   string;
  branchId?:  string;   // only sent in Step 2
}

export interface BranchOption {
  id:   string;
  name: string;
}

export interface LoginResponse {
  token:                    string | null;
  role:                     string | null;
  tenantSlug:               string | null;
  tenantName:               string | null;
  fullName:                 string | null;
  branchId:                 string | null;
  branchName:               string | null;
  requiresBranchSelection:  boolean;
  branches:                 BranchOption[];  // populated only when requiresBranchSelection = true
}

export interface RegisterRequest {
  fullName:   string;
  tenantSlug: string;
  email:      string;
  password:   string;
  roleCode:   string;
}

export interface AuthContext {
  token:      string;
  role:       string;
  tenantSlug: string;
  tenantName: string;
  fullName:   string;
  branchId:   string | null;   // null = all branches (ORG_ADMIN)
  branchName: string | null;
}
```

### Backend — model changes needed

**`LoginRequest.cs`** — add `BranchId`:
```csharp
public string  TenantSlug { get; set; }
public string  Email      { get; set; }
public string  Password   { get; set; }
public Guid?   BranchId   { get; set; }   // null on Step 1, populated on Step 2
```

**New `BranchOption.cs` DTO** (response only):
```csharp
public string Id   { get; set; }
public string Name { get; set; }
```

**New `LoginResponse.cs` DTO**:
```csharp
public string?            Token                   { get; set; }
public string?            Role                    { get; set; }
public string?            TenantSlug              { get; set; }
public string?            TenantName              { get; set; }
public string?            FullName                { get; set; }
public string?            BranchId                { get; set; }
public string?            BranchName              { get; set; }
public bool               RequiresBranchSelection { get; set; }
public List<BranchOption> Branches                { get; set; } = [];
```

---

## 5. Component Specification

### LoginComponent (`/login`)

The login page has **two visual states** managed by a signal `branchSelectionMode`.

**State 1 — Credentials form (default)**

| Field | Type | Validation |
|---|---|---|
| Organization ID | text | required |
| Email | email | required, email format |
| Password | password | required |

- On submit: calls `POST /api/auth/login` with credentials only
- If `requiresBranchSelection = false` → store `AuthContext`, navigate to `/dashboard`
- If `requiresBranchSelection = true` → switch to **State 2** (branch dropdown appears inline, credentials fields remain visible but disabled)
- Shows API error banner on failed submit
- Loading spinner on submit button while request in flight
- "Don't have an account? Sign up" link → `/register`

**State 2 — Branch selection (appears inline after Step 1)**

| Field | Type | Validation |
|---|---|---|
| Select Branch | dropdown | required; options populated from server response |

- Dropdown lists all branches returned by Step 1 response
- "Confirm Branch" button triggers Step 2 → `POST /api/auth/login` with `branchId`
- "Back" link → resets to State 1 (clears branch list, re-enables credential fields)
- On success: store `AuthContext` (now includes `branchId` + `branchName`), navigate to `/dashboard`
- Shows API error banner on failed submit

**UI flow sketch:**
```
┌──────────────────────────────────────────┐
│  Organization ID  [ bright-future      ] │  ← disabled in State 2
│  Email            [ admin@example.com  ] │  ← disabled in State 2
│  Password         [ ••••••••           ] │  ← disabled in State 2
│                                          │
│  ── appears only in State 2 ──           │
│  Select Branch    [ HQ Main Campus  ▼  ] │
│                                          │
│  [ Login / Confirm Branch ]  [ Back ]    │
└──────────────────────────────────────────┘
```

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
| Login — user has exactly 1 branch assignment | JWT issued directly, no branch picker shown |
| Login — user has `branch_id = NULL` (ORG_ADMIN) | JWT issued directly with `branchId: null`, sees all branches in dashboard |
| Login — user has 2+ branch assignments | Step 1 returns `requiresBranchSelection: true` with branch list |
| Login Step 2 — `branchId` not in user's assignments | Error 403: "You do not have access to the selected branch." |
| Login Step 2 — `branchId` is valid but branch is INACTIVE | Error: "This branch is currently inactive." |
| User tampers with branch list and submits unlisted branchId | Server re-validates against DB; returns 403 |
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

### Branch Selection — Happy Path
18. User with 2 branch assignments logs in → Step 1 returns `requiresBranchSelection: true` with 2 branches
19. User selects "HQ Main Campus" → Step 2 returns JWT with `branchId` = HQ id
20. `AuthContext` stored in localStorage includes `branchId` and `branchName`
21. All subsequent API requests are scoped to HQ branch only
22. User with `branch_id = NULL` (ORG_ADMIN) → Step 1 issues JWT immediately, no branch picker
23. User with exactly 1 branch assignment → Step 1 issues JWT immediately, no branch picker

### Branch Selection — Error Paths
24. User submits a `branchId` they are not assigned to → 403 "You do not have access to the selected branch."
25. User submits a `branchId` for an INACTIVE branch → error shown, branch picker stays visible
26. User clicks "Back" on branch picker → credential fields re-enabled, branch list cleared, ready for new attempt

### Auth Guard
27. Unauthenticated user visits `/dashboard` → redirected to `/login`
28. Authenticated user visits `/login` → redirected to `/dashboard`
29. Logout clears `localStorage`, next route navigation redirects to `/login`
