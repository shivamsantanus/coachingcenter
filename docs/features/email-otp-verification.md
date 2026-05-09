# Feature: Email OTP — Registration Verification

**Status:** Planned  
**Last updated:** 2026-05-09  
**Depends on:** `auth.md` (login & signup feature)

---

## 1. Overview

After a user registers, their account is created but marked **unverified**.
A 6-digit OTP is generated, hashed, and emailed to them.
They must enter that OTP on a verification page before they can log in.
Accounts that are not verified within the OTP window cannot authenticate.

Login MFA (OTP on every login) is explicitly **out of scope** for this iteration.

---

## 2. Requirements

### Functional
- On successful registration, automatically send a 6-digit OTP to the registered email
- Redirect the user to a `/verify-email` page after registration
- The `/verify-email` page accepts the OTP and submits it to the backend
- On valid OTP → mark account as verified, allow login
- On invalid OTP → show error, allow retry (up to 5 attempts before OTP is invalidated)
- Provide a "Resend OTP" button with a 60-second cooldown timer
- Login is blocked for any user whose email is not verified — return a clear error
- OTP expires after **15 minutes**
- A resend is rate-limited to **3 sends per email per hour**

### Non-functional
- OTP is **never stored in plaintext** — SHA-256 hash stored in DB
- OTP is **single-use** — deleted immediately on successful verification
- Email provider is **pluggable** — abstracted behind an interface so dev can use console logging and prod can use SendGrid/SES without changing business logic
- In development (`ASPNETCORE_ENVIRONMENT=Development`), the OTP is logged to the console instead of sending a real email — no external dependency for local dev

### Out of scope
- OTP on every login (login MFA) — planned for a later iteration
- Password reset via OTP — separate feature
- SMS OTP

---

## 3. Database Changes

> ⚠️ Requires a new EF Core migration. Do NOT modify existing migration files.

### New table: `email_verifications`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → `users.id` | Restrict delete |
| `otp_hash` | `varchar(64)` | SHA-256 hex of the 6-digit OTP |
| `expires_at` | `timestamptz` | `UtcNow + 15 minutes` |
| `attempt_count` | `int` default 0 | Incremented on each failed verify attempt |
| `send_count` | `int` default 1 | Incremented on each resend |
| `last_sent_at` | `timestamptz` | Used to enforce resend rate limit |
| `created_at` | `timestamptz` | |

One row per pending verification per user. On resend: update existing row (new hash, new expiry, increment `send_count`). On successful verify: delete the row.

### Change to `users` table

Add column:

| Column | Type | Default | Notes |
|---|---|---|---|
| `is_email_verified` | `bool` | `false` | Set to `true` after OTP verified |

> **Why a separate table instead of columns on `users`?**
> Keeping verification state in its own table means the `User` entity stays clean.
> It also makes it trivial to query "how many pending verifications are there?" for monitoring,
> and the row is simply deleted on success — no null columns left on the user record.

---

## 4. Implementation Plan

### Backend

1. **Add `IsEmailVerified` to `User` entity** and `EmailVerification` entity + `DbSet` to `AppDbContext`
   _(Ask before modifying — per CLAUDE.md rule)_
2. **Run migration:** `dotnet ef migrations add AddEmailOtpVerification`
3. **Create `IEmailService` interface** in `Extensions/` or a new `Services/` folder:
   ```csharp
   Task SendOtpAsync(string toEmail, string fullName, string otp);
   ```
4. **Create `ConsoleEmailService`** (dev) — logs OTP via `ILogger`, no real send
5. **Create `SmtpEmailService`** (prod) — sends via MailKit or SendGrid; registered conditionally based on `ASPNETCORE_ENVIRONMENT`
6. **Register email service** in `Program.cs` based on environment
7. **Create `OtpService`** — generates OTP, hashes it, saves to DB, calls `IEmailService`
8. **Update `AuthController.Register`** — call `OtpService` after saving user; set `IsEmailVerified = false`
9. **Update `AuthController.Login`** — return 403 with structured error if `!user.IsEmailVerified`
10. **Add `POST /api/auth/verify-email`** endpoint
11. **Add `POST /api/auth/resend-otp`** endpoint

### Frontend

12. **Add `VerifyEmailComponent`** at `/verify-email`
13. **Update `RegisterComponent`** — on success, navigate to `/verify-email` passing email + tenantSlug as query params
14. **Update `app.routes.ts`** — add `/verify-email` as a public route
15. **Add `verifyEmail()` and `resendOtp()` methods** to `AuthService`
16. **Add interfaces** to `auth.models.ts`: `VerifyEmailRequest`, `ResendOtpRequest`
17. **Update feature doc** to reflect final state

---

## 5. API Contract

### POST `/api/auth/verify-email`

**Request**
```json
{
  "email": "shivam@example.com",
  "tenantSlug": "bright-future",
  "otp": "482910"
}
```

**Success — 200**
```json
{
  "success": true,
  "data": { "message": "Email verified successfully. You can now sign in." },
  "error": null
}
```

**Failure — 400 (wrong OTP)**
```json
{
  "success": false,
  "data": null,
  "error": "Invalid OTP. 3 attempts remaining."
}
```

**Failure — 400 (OTP expired)**
```json
{
  "success": false,
  "data": null,
  "error": "OTP has expired. Please request a new one."
}
```

**Failure — 400 (too many attempts)**
```json
{
  "success": false,
  "data": null,
  "error": "Too many failed attempts. Please request a new OTP."
}
```

---

### POST `/api/auth/resend-otp`

**Request**
```json
{
  "email": "shivam@example.com",
  "tenantSlug": "bright-future"
}
```

**Success — 200**
```json
{
  "success": true,
  "data": { "message": "A new OTP has been sent to your email." },
  "error": null
}
```

**Failure — 429 (rate limited)**
```json
{
  "success": false,
  "data": null,
  "error": "Please wait before requesting another OTP."
}
```

> **Note:** Both endpoints return the same shape whether the email exists or not.
> Never confirm or deny whether a given email is registered — that is a user enumeration risk.

---

### Updated: POST `/api/auth/login`

New failure case added:

**Failure — 403 (email not verified)**
```json
{
  "success": false,
  "data": null,
  "error": "Please verify your email before signing in."
}
```

---

## 6. New Models

### Backend — `EmailVerification.cs`
```csharp
public class EmailVerification
{
    public Guid Id             { get; set; }
    public Guid UserId         { get; set; }
    public string OtpHash      { get; set; } = string.Empty;
    public DateTime ExpiresAt  { get; set; }
    public int AttemptCount    { get; set; }
    public int SendCount       { get; set; }
    public DateTime LastSentAt { get; set; }
    public DateTime CreatedAt  { get; set; }
    public User User           { get; set; } = null!;
}
```

### Backend — Request DTOs
```csharp
// VerifyEmailRequest.cs
public class VerifyEmailRequest
{
    [Required] public string Email      { get; set; } = string.Empty;
    [Required] public string TenantSlug { get; set; } = string.Empty;
    [Required][StringLength(6, MinimumLength = 6)] public string Otp { get; set; } = string.Empty;
}

// ResendOtpRequest.cs
public class ResendOtpRequest
{
    [Required] public string Email      { get; set; } = string.Empty;
    [Required] public string TenantSlug { get; set; } = string.Empty;
}
```

### Frontend — additions to `auth.models.ts`
```typescript
export interface VerifyEmailRequest {
  email: string;
  tenantSlug: string;
  otp: string;
}

export interface ResendOtpRequest {
  email: string;
  tenantSlug: string;
}
```

---

## 7. Security Rules

| Rule | Detail |
|---|---|
| OTP format | 6 digits, numeric only (`000000`–`999999`) |
| OTP storage | SHA-256 hex hash — never plaintext |
| OTP expiry | 15 minutes from generation |
| OTP lifetime | Single-use — deleted on successful verify |
| Attempt limit | 5 failed attempts → OTP invalidated, user must resend |
| Resend rate limit | Max 3 sends per email per hour (checked via `send_count` + `last_sent_at`) |
| Resend cooldown | Frontend enforces 60-second wait between resend button clicks |
| Error messages | Never reveal whether an email is registered on resend |
| Dev environment | OTP logged via `ILogger.Information` — no real email sent |

---

## 8. Component Specification — `VerifyEmailComponent` (`/verify-email`)

- Reads `email` and `tenantSlug` from URL query params on init
- If either param is missing, redirects to `/register`
- Displays the email address the OTP was sent to (masked: `sh***@example.com`)
- Single 6-digit OTP input (accepts numeric input only; auto-submits or has a "Verify" button)
- Shows error message on invalid OTP with remaining attempts count
- "Resend OTP" button — disabled for 60 seconds after page load or last resend; shows countdown
- On success: shows confirmation banner, redirects to `/login` after 2 seconds

---

## 9. Edge Cases

| Scenario | Expected Behaviour |
|---|---|
| User registers but never verifies, tries to log in | 403 — "Please verify your email before signing in." with link to `/verify-email` |
| User navigates directly to `/verify-email` with no query params | Redirect to `/register` |
| OTP entered correctly but expired | Error: "OTP has expired. Please request a new one." |
| OTP entered incorrectly 5 times | OTP invalidated; error: "Too many failed attempts. Please request a new OTP." |
| User clicks Resend within 60 seconds | Button disabled with countdown — no API call |
| User requests resend more than 3 times in an hour | 429 — "Please wait before requesting another OTP." |
| User registers same email twice (second registration fails) | Existing behaviour — 400 "Email is already registered." |
| User re-registers after failing to verify (edge case: previous unverified account) | Existing unverified row remains; registration fails. Consider adding a cleanup job later. |
| Email delivery fails silently | OTP is still saved to DB; user can use Resend to trigger another send |

---

## 10. Test Cases

### Registration → Verification Happy Path
1. Register with valid details → redirected to `/verify-email?email=...&tenant=...`
2. Check email (or dev console) → 6-digit OTP received
3. Enter correct OTP → success banner → redirected to `/login`
4. Log in with credentials → access granted

### OTP Validation
5. Enter wrong OTP → error with remaining attempts count
6. Enter wrong OTP 5 times → OTP invalidated, must resend
7. Wait 15 minutes → enter previously valid OTP → "OTP has expired"
8. Enter OTP with correct value after expiry → "OTP has expired"

### Resend
9. Click Resend immediately → button disabled (60-second countdown shown)
10. Click Resend after cooldown → new OTP sent, attempt count reset
11. Resend 3 times within an hour → 4th attempt returns 429

### Login Gate
12. Unverified user attempts login → 403 with verification prompt
13. Verified user attempts login → success (existing login tests still pass)

### Navigation / Edge Cases
14. Navigate to `/verify-email` with no query params → redirected to `/register`
15. After successful verification, back-navigate to `/verify-email` → OTP row deleted, any OTP attempt returns "OTP has expired"
