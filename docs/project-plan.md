# ClassNova — Project Plan & Progress Tracker

> **Rule:** This file is updated before AND after every feature implementation.
> Never start a feature without a row in the plan. Never finish one without marking it done
> and linking the feature doc. This is the single source of truth for project state.

**Last updated:** 2026-05-19

---

## Legend

| Status | Meaning |
|---|---|
| ✅ Done | Fully implemented, tested, feature doc written |
| 🔄 In Progress | Work has started |
| 📋 Planned | Scoped and ready to start |
| 💡 Backlog | Identified but not yet scoped |
| ❌ Blocked | Cannot proceed — dependency or decision pending |

---

## Phase 1 — Foundation (Infrastructure + Auth)

| # | Feature | Status | Feature Doc | Notes |
|---|---|---|---|---|
| 1.1 | Database schema design | ✅ Done | [db-design-v1.md](db-design-v1.md) | 22 tables, all tenant-scoped |
| 1.2 | MVP scope definition | ✅ Done | [mvp-scope.md](mvp-scope.md) | Roles, workflows, out-of-scope |
| 1.3 | EF Core initial migration | ✅ Done | — | `20260427184021_InitialCreate` |
| 1.4 | Tenant creation API | ✅ Done | — | `POST /api/tenant`; public endpoint |
| 1.5 | Tenant branding endpoint | ✅ Done | — | `GET /api/tenant/{slug}`; used by login page |
| 1.6 | User registration + login (JWT) | ✅ Done | [auth.md](features/auth.md) | 8-hour JWT, BCrypt hashing, claims: tenant_id/role/full_name |
| 1.7 | Email OTP verification | ✅ Done | [email-otp-verification.md](features/email-otp-verification.md) | SHA-256 hashed OTP, 15-min expiry, rate-limited resend (3/hr, 60s cooldown) |
| 1.8 | Angular auth flow (login UI) | ✅ Done | [auth.md](features/auth.md) | LoginComponent, PrimeNG, reactive forms, localStorage context |
| 1.9 | Angular register + verify-email UI | ✅ Done | [email-otp-verification.md](features/email-otp-verification.md) | RegisterComponent, VerifyEmailComponent, OTP countdown, auto-submit |
| 1.12 | Forgot password (OTP-based reset) | ✅ Done | [forgot-password.md](features/forgot-password.md) | PasswordResetService, ForgotPasswordComponent, ResetPasswordComponent, anti-enumeration |
| 1.10 | Shell layout + route guards | ✅ Done | — | ShellComponent with role-based nav, authGuard |
| 1.11 | Dashboard placeholder | ✅ Done | — | Stat cards (placeholder data), tenant/user context displayed |

**DB migrations applied:**
- `20260427184021_InitialCreate`
- `20260505184204_AddFullNameAndPhotoToStudentsTeachers`
- `20260509061113_AddEmailOtpVerification`
- `20260510092350_UsePendingRegistrations`
- `20260519144346_AddPasswordResetOtp`

---

## Phase 2 — Core People Management

| # | Feature | Status | Feature Doc | Notes |
|---|---|---|---|---|
| 2.1 | Student CRUD API | ✅ Done | — | Paginated list, search, status toggle, photo upload (2 MB / JPG/PNG/WebP) |
| 2.2 | Teacher CRUD API | ✅ Done | — | Paginated list, search, status toggle, photo upload |
| 2.3 | Student management UI | 📋 Planned | — | List, add, edit, status toggle, photo; ORG_ADMIN only |
| 2.4 | Teacher management UI | 📋 Planned | — | List, add, edit, status toggle, photo; ORG_ADMIN only |

> **Note:** Backend endpoints for Students and Teachers are fully implemented. Angular UI is the next step.

---

## Phase 3 — Academic Structure

| # | Feature | Status | Feature Doc | Notes |
|---|---|---|---|---|
| 3.1 | Academic Year management | 📋 Planned | — | CRUD for academic years per tenant |
| 3.2 | Class management | 📋 Planned | — | CRUD for classes (grades) per tenant |
| 3.3 | Batch / Section management | 📋 Planned | — | CRUD for batches within classes |
| 3.4 | Subject management | 📋 Planned | — | CRUD for subjects per tenant |
| 3.5 | Batch-Subject-Teacher assignment | 📋 Planned | — | Assign teachers to subjects within batches |
| 3.6 | Student enrollment in batches | 📋 Planned | — | Enroll students into class/batch |
| 3.7 | Academic structure UI | 💡 Backlog | — | Admin UI for all the above |

> DB models exist for all academic structure tables. Controllers not yet created.

---

## Phase 4 — Attendance

| # | Feature | Status | Feature Doc | Notes |
|---|---|---|---|---|
| 4.1 | Attendance recording API | 💡 Backlog | — | Teacher marks attendance per batch/date |
| 4.2 | Attendance summary API | 💡 Backlog | — | Aggregate per student/batch/date range |
| 4.3 | Attendance UI (teacher) | 💡 Backlog | — | Mark attendance by batch |
| 4.4 | Attendance UI (student view) | 💡 Backlog | — | Student views own attendance % |

---

## Phase 5 — Fees

| # | Feature | Status | Feature Doc | Notes |
|---|---|---|---|---|
| 5.1 | Fee plan management API | 💡 Backlog | — | Create/manage fee structures per tenant |
| 5.2 | Payment recording API | 💡 Backlog | — | Record payments, outstanding calculations |
| 5.3 | Fee dashboard UI | 💡 Backlog | — | Outstanding fees, payment history |

> DB models (`FeePlan`, `Payment`) exist. No controllers yet.

---

## Phase 6 — Exams & Results

| # | Feature | Status | Feature Doc | Notes |
|---|---|---|---|---|
| 6.1 | Exam management API | 💡 Backlog | — | Create exams, assign subjects + max marks |
| 6.2 | Marks entry API | 💡 Backlog | — | Enter marks per student per subject |
| 6.3 | Results / report card API | 💡 Backlog | — | Aggregate results, pass/fail determination |
| 6.4 | Exam & results UI | 💡 Backlog | — | Admin/teacher exam management + student results view |

> DB models (`Exam`, `ExamSubject`, `Mark`) exist. No controllers yet.

---

## Phase 7 — Timetable / Schedule

| # | Feature | Status | Feature Doc | Notes |
|---|---|---|---|---|
| 7.1 | Class schedule API | 💡 Backlog | — | Weekly timetable per batch |
| 7.2 | Timetable UI | 💡 Backlog | — | Visual schedule grid |

> `ClassSchedule` DB model exists. No controller yet.

---

## Phase 8 — Platform Admin

| # | Feature | Status | Feature Doc | Notes |
|---|---|---|---|---|
| 8.1 | Tenant listing API (PLATFORM_ADMIN) | 💡 Backlog | — | Cross-tenant tenant management |
| 8.2 | Feature flag management | 💡 Backlog | — | Enable/disable features per tenant |
| 8.3 | Platform admin UI | 💡 Backlog | — | Admin portal for managing all tenants |

---

## Phase 9 — Polish & Production Readiness

| # | Feature | Status | Feature Doc | Notes |
|---|---|---|---|---|
| 9.1 | Real dashboard stats | 💡 Backlog | — | Wire dashboard cards to actual DB counts |
| 9.2 | Audit log viewer | 💡 Backlog | — | View audit trail per tenant |
| 9.3 | Tenant settings UI | 💡 Backlog | — | Logo, timezone, currency, label customisation |
| 9.4 | Error monitoring (frontend) | 💡 Backlog | — | Replace console.log with proper error surfaces |
| 9.5 | Production build + deployment | 💡 Backlog | — | Docker, env vars, reverse proxy config |

---

## Phase 10 — Tenant Landing Pages & Branding

| # | Feature | Status | Feature Doc | Notes |
|---|---|---|---|---|
| 10.1 | DB migration: accent_color + landing_page_json | ✅ Done | [tenant-landing-page.md](features/tenant-landing-page.md) | Add 2 columns to tenant_settings |
| 10.2 | Backend: extend GET /api/tenant/{slug} | ✅ Done | [tenant-landing-page.md](features/tenant-landing-page.md) | Return accentColor + landingPage |
| 10.3 | Backend: PUT /api/tenant/branding + teachers-preview | ✅ Done | [tenant-landing-page.md](features/tenant-landing-page.md) | BrandingService + 2 new controller actions |
| 10.4 | Angular BrandingService + CSS variable theming | ✅ Done | [tenant-landing-page.md](features/tenant-landing-page.md) | applyTheme() wired into shell on init |
| 10.5 | LandingPageComponent (/t/:slug) | ✅ Done | [tenant-landing-page.md](features/tenant-landing-page.md) | Public, no auth, all 7 sections |
| 10.6 | LandingPageEditorComponent (ORG_ADMIN settings) | 📋 Planned | [tenant-landing-page.md](features/tenant-landing-page.md) | Tab-based form; depends on 9.3 |

---

## What to Work on Next

**Immediate next steps (Phase 2 continuation):**

1. **Student management UI** (Feature 2.3) — create `docs/features/student-management.md` first
   *(Forgot password flow is complete — backend + frontend + migration all done)*
2. **Teacher management UI** (Feature 2.4) — create `docs/features/teacher-management.md` first
3. Then move into Phase 3 (Academic Structure) — start with backend controllers before UI

---

## How to Use This File

1. Before starting any feature: add a row with `📋 Planned` and create the feature doc in `docs/features/`
2. When work starts: change status to `🔄 In Progress`
3. When done: change status to `✅ Done` and link the feature doc
4. When blocked: change to `❌ Blocked` and add a note explaining what's needed
5. Keep "What to Work on Next" updated so context is never lost between sessions
