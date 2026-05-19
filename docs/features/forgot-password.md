# Feature: Forgot Password (OTP-Based Reset)

**Status:** In Progress  
**Last updated:** 2026-05-19

---

## 1. Requirements

- A user who has forgotten their password can request a reset using their **Organization ID** and **email**
- A 6-digit OTP is sent to the user's registered email address
- The OTP expires in **15 minutes**, allows a maximum of **5 verification attempts**, and can be resent up to **3 times per hour** with a **60-second cooldown** between resends
- After OTP verification, the user submits a new password (min 8 chars + confirmation)
- On success the user is redirected to `/login` with a success banner
- The forgot-password and resend endpoints are **anti-enumeration**: they always return the same success response regardless of whether the email/tenant exists — no information is leaked
- `PLATFORM_ADMIN` accounts are not visible via this flow (they have no tenant slug)
- Only verified, active users can reset their password (unverified pending registrations are ignored)
- The OTP is single-use — verified once, the record is deleted immediately

### Out of scope
- Magic link / email link reset (OTP is consistent with existing verification flow)
- Admin-initiated forced password reset
- Password history checks

---

## 2. Flow

```
/login
  ↓ "Forgot password?"
/forgot-password
  User enters: Organization ID + email
  POST /api/auth/forgot-password
  Server: finds user, creates PasswordResetOtp record, sends OTP email
  → always responds 200 (anti-enumeration)
  ↓ redirect to
/reset-password?email=...&tenantSlug=...
  User enters: OTP + new password + confirm password
  POST /api/auth/reset-password
  Server: verifies OTP, updates user.PasswordHash, deletes OTP record
  → 200 success → redirect to /login
  → 400 failure → error banner, stay on page
  ↓ "Resend OTP" button (rate-limited, 60s cooldown)
  POST /api/auth/resend-reset-otp
```

---

## 3. API Contract

### POST `/api/auth/forgot-password`

**Request**
```json
{ "tenantSlug": "bright-future", "email": "shivam@example.com" }
```

**Response — always 200 (anti-enumeration)**
```json
{
  "success": true,
  "data": { "message": "If an account with that email exists, a reset code has been sent." },
  "error": null
}
```

---

### POST `/api/auth/reset-password`

**Request**
```json
{
  "tenantSlug": "bright-future",
  "email": "shivam@example.com",
  "otp": "482910",
  "newPassword": "NewSecret123!"
}
```

**Success — 200**
```json
{
  "success": true,
  "data": { "message": "Password reset successfully. You can now sign in." },
  "error": null
}
```

**Failure — 400**
```json
{ "success": false, "data": null, "error": "Invalid or expired OTP." }
```

---

### POST `/api/auth/resend-reset-otp`

**Request**
```json
{ "tenantSlug": "bright-future", "email": "shivam@example.com" }
```

**Response — always 200 (anti-enumeration on success; 429 on rate limit)**
```json
{
  "success": true,
  "data": { "message": "If an account with that email exists, a new code has been sent." },
  "error": null
}
```

**Rate limited — 429**
```json
{ "success": false, "data": null, "error": "Please wait before requesting another OTP." }
```

---

## 4. Data Model

### Backend — `PasswordResetOtp.cs`

```csharp
public Guid     Id           // PK
public string   Email        // indexed (one active reset per email+tenant)
public Guid     UserId       // FK → users (the user to reset)
public Guid     TenantId     // FK → tenants (scopes the reset to a tenant)
public string   OtpHash      // SHA-256(salt + otp)
public string   OtpSalt      // crypto-random base64
public DateTime ExpiresAt
public int      AttemptCount
public int      SendCount
public DateTime LastSentAt
public DateTime CreatedAt
```

Unique index: `(email, tenant_id)` — one active reset per user+tenant at any time.

---

## 5. Component Specification

### ForgotPasswordComponent (`/forgot-password`)

| Field | Type | Validation |
|---|---|---|
| Organization ID | text | required |
| Email | email | required, email format |

- On submit: `POST /api/auth/forgot-password`
- Always shows the same success info message after submit (anti-enumeration): "If an account with that email exists, a reset code has been sent."
- After showing the info message, navigates to `/reset-password?email=...&tenantSlug=...` after 2 seconds
- Loading spinner on submit button while request in flight
- "Back to sign in" link → `/login`

### ResetPasswordComponent (`/reset-password`)

| Field | Type | Validation |
|---|---|---|
| Verification Code | text | required, exactly 6 digits |
| New Password | password | required, minLength 8 |
| Confirm Password | password | required, must match new password |

- Reads `email` and `tenantSlug` from query params on init; redirects to `/forgot-password` if missing
- Shows masked email in instruction text (e.g. `sh***@example.com`)
- Auto-submits when 6th digit is entered in OTP field
- "Resend OTP" button: 60-second cooldown countdown; calls `POST /api/auth/resend-reset-otp`
- On success: shows green banner "Password reset successfully!", redirects to `/login` after 2 seconds
- On failure: shows error banner, OTP field cleared, stays on page
- "Back to sign in" link → `/login`

---

## 6. Edge Cases

| Scenario | Expected Behaviour |
|---|---|
| Email does not exist in tenant | Anti-enumeration: 200 response, no email sent |
| Tenant slug does not exist | Anti-enumeration: 200 response, no email sent |
| User is not verified / is inactive | Anti-enumeration: 200 response, no email sent |
| Second forgot-password request while one is active | Old OTP record replaced, new OTP issued |
| OTP expired (>15 min) | Error: "Invalid or expired OTP." OTP record deleted |
| Too many wrong attempts (5) | Error: "Too many failed attempts. Please request a new code." OTP record deleted |
| Resend within 60s cooldown | 429: "Please wait before requesting another OTP." |
| Resend >3 times in 1 hour | 429: "Too many OTP requests. Please try again later." |
| New password same as form confirm but < 8 chars | Client-side validation, no API call |
| Passwords don't match | Client-side validation, no API call |
| Valid OTP + new password | Password hash updated, OTP record deleted, redirect to /login |

---

## 7. Test Cases

### Happy Path
1. Enter valid Organization ID + email → info message shown → navigate to /reset-password
2. Enter valid 6-digit OTP + matching new passwords → success banner → redirect to /login
3. User can log in with new password immediately after reset
4. Old password no longer works after reset

### Error Paths
5. Wrong OTP → error banner, attempt count decremented, OTP field cleared
6. Expired OTP → error "Invalid or expired OTP."
7. 5 wrong attempts → error "Too many failed attempts. Please request a new code."
8. Resend within cooldown → resend button disabled, countdown visible
9. New password < 8 chars → client-side error, no API call
10. Passwords don't match → client-side error, no API call
11. Unknown email / tenant → same info banner shown (no leak)
12. Missing query params on /reset-password → redirect to /forgot-password
