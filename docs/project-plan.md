# ClassNova — Project Plan & Progress Tracker

> **Rule:** This file is updated before AND after every feature implementation.
> Never start a feature without a row in the plan. Never finish one without marking it done
> and linking the feature doc. This is the single source of truth for project state.

**Last updated:** 2026-06-25 (Payment junction table refactor done — `payments` + `payment_line_items`; single `POST /api/payments` endpoint; receipt auto-detects single vs combined layout; all payment views show one row per payment with line items stacked in Fee Plan cell.)

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
| 1.4 | Tenant creation API | ✅ Done | [platform-admin.md](features/platform-admin.md) | `POST /api/tenant`; secured — PLATFORM_ADMIN only |
| 1.13 | Platform Admin dashboard | ✅ Done | [platform-admin.md](features/platform-admin.md) | `/admin/login`, tenant list, create tenant; `platformAdminGuard`; `POST /api/auth/platform-login`; `GET /api/tenant` |
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
| 2.3 | Student management UI | ✅ Done | [student-management.md](features/student-management.md) | List, add, edit, status toggle, photo upload; ORG_ADMIN + TEACHER |
| 2.4 | Teacher management UI | ✅ Done | [teacher-management.md](features/teacher-management.md) | List, add, edit, status toggle, photo upload; ORG_ADMIN only |

---

## Phase 3 — Academic Structure

| # | Feature | Status | Feature Doc | Notes |
|---|---|---|---|---|
| 3.1 | Academic Year management | ✅ Done | [academic-structure.md](features/academic-structure.md) | CRUD + activate; client-side endDate > startDate validation |
| 3.2 | Class management | ✅ Done | [academic-structure.md](features/academic-structure.md) | CRUD + status toggle; filtered by AY |
| 3.3 | Batch / Section management | ✅ Done | [academic-structure.md](features/academic-structure.md) | CRUD + status toggle; startTime/endTime; dates validated against AY range; branch assignment |
| 3.4 | Subject management | ✅ Done | [academic-structure.md](features/academic-structure.md) | CRUD + delete guard (409 if assigned) |
| 3.5 | Batch-Subject-Teacher assignment | ✅ Done | [academic-structure.md](features/academic-structure.md) | Backend + UI tab; AY→Batch filter; subject+teacher dropdowns with search |
| 3.6 | Student enrollment in batches | ✅ Done | [academic-structure.md](features/academic-structure.md) | Backend + UI tab; student search; AY→class/batch filter; toggle active |
| 3.7 | Academic structure UI | ✅ Done | [academic-structure.md](features/academic-structure.md) | 6 tabs: Academic Years, Classes, Batches, Subjects, Assignments, Enrollments |
| 3.8 | Branch management | ✅ Done | — | Full CRUD at /settings/branches; name/code uniqueness; status toggle; MapUrl for directions; SettingsShellComponent with Branding \| Branches nav |

**DB migrations applied (Phase 3):**
- `20260531063355_AddBatchTimingFields` *(rolled back — superseded)*
- `20260531083132_AddBatchTimingAndBranchMapUrl` — adds `start_time`, `end_time` to `batches`; `map_url` to `branches`

**Cross-cutting improvements (2026-05-31):**
- All 6 academic controllers standardised to `{ success, data, error }` response envelope
- All 6 academic frontend services updated to `ApiResponse<T>` generic type
- Batch dates validated against academic year date range (backend + frontend)
- Batch time range validated (endTime > startTime)

---

## Phase 4 — Attendance

| # | Feature | Status | Feature Doc | Notes |
|---|---|---|---|---|
| 4.1 | Attendance recording API | ✅ Done | [attendance.md](features/attendance.md) | `POST /api/attendance/mark` — bulk upsert; ORG_ADMIN + TEACHER |
| 4.2 | Attendance summary API | ✅ Done | [attendance.md](features/attendance.md) | `GET /api/attendance/summary` — aggregate per student/batch/date range |
| 4.3 | Attendance UI — mark attendance | ✅ Done | [attendance.md](features/attendance.md) | AY → batch → date; P/A/L/E toggles; bulk mark-all; live counts (signals); save |
| 4.5 | Monthly attendance report | ✅ Done | [attendance.md](features/attendance.md) | `GET /api/attendance/monthly-report`; 2-page matrix print; org logo in header; PDF filename from org+batch+month |
| 4.4 | Attendance UI (student view) | ✅ Done | — | Student dashboard + `GET /api/students/my-dashboard` + `my-enrollments`; attendance page shows only student's own report; monthly report scoped to student's row on backend |
| 4.6 | Teacher batch-scoped attendance | ✅ Done | — | TEACHER sees only assigned batches (via BatchSubjectTeacher); backend guard on mark + read + report |
| 4.7 | Teacher self attendance — check-in/out | ✅ Done | [teacher-attendance.md](features/teacher-attendance.md) | TEACHER checks in/out on dashboard; auto-sets PRESENT; lazy-close on login for forgotten checkouts |
| 4.8 | Teacher attendance admin page | ✅ Done | [teacher-attendance.md](features/teacher-attendance.md) | ORG_ADMIN page (`/teacher-attendance`); date picker → all active teachers; mark/override status + times; bulk mark-all present; audit trail for overrides; monthly report tab with Print |
| 4.9 | Teacher attendance API | ✅ Done | [teacher-attendance.md](features/teacher-attendance.md) | `teacher_attendances` table; check-in/out + my-today + my-history + my-report (TEACHER); admin/daily + admin/mark + admin/monthly-report (ORG_ADMIN); hourly background job closes open check-ins |

**DB migrations applied (Phase 4):**
- `20260531142407_AddAttendance` — creates `attendances` table with unique index on (tenant_id, batch_id, student_id, date)
- `AddTeacherAttendance` — creates `teacher_attendances` table with unique index on (tenant_id, teacher_id, date); audit columns (modified_by_id, modified_at, original_check_in, original_check_out)

---

## Phase 5 — Fees

| # | Feature | Status | Feature Doc | Notes |
|---|---|---|---|---|
| 5.1 | Fee plan management API | ✅ Done | [fees.md](features/fees.md) | CRUD + status toggle + delete guard (409 if payments exist); ORG_ADMIN only |
| 5.2 | Payment recording API | ✅ Done | [fees.md](features/fees.md) | Record + list (filter by student/plan/date) + delete; system_id RCT prefix; future-date guard |
| 5.3 | Fee dashboard UI | ✅ Done | [fees.md](features/fees.md) | /fees route; Fee Plans tab (CRUD, scope by batch/branch); Payments tab (student search, history, record dialog) |
| 5.4 | Dashboard stats — real counts | ✅ Done | — | Students, Teachers, Active Batches, Fees This Month wired to `GET /api/dashboard/stats` |
| 5.5 | Fee Collection — monthly register | ✅ Done | — | Month navigator (< Month Year >); Due/Paid/Balance columns; Paid/Partial/Pending status; no-fee-plan warning chip; button-triggered load; Export CSV |
| 5.6 | Payment History — cascading filters + export | ✅ Done | — | AY → Class → Batch (all optional except AY); date range; button-triggered Search; Export CSV |
| 5.7 | Student detail page + payment history | ✅ Done | — | `/students/:id`; Profile tab (personal/guardian/system info); Payments tab (fee plan + date filter, Search, Export CSV); View button on student list |
| 5.8 | Shared ExportService + CSV exports | ✅ Done | [fees.md](features/fees.md) | `ExportService` with `exportCsv<T>()` + `downloadCsv()`; CSV on Fee Collection, Payment History, Student Detail, Students list, Teachers list |
| 5.9 | Phase 5 responsive design | ✅ Done | — | Filters stack full-width on mobile (≤640px); load/search buttons full-width; summary strip hides dividers + export button stretches; fee collection dialog `maxWidth: calc(100vw - 2rem)`; student info-list single-column at 480px |
| 5.10 | Multiple fee plans per batch | ✅ Done | [fees.md](features/fees.md) | Backend: `ToList()` + `Sum()` across all linked plans; frontend: `p-multiselect` with per-plan editable amounts; `forkJoin` creates one payment record per plan; plan chips in summary strip |
| 5.11 | Payment receipt (print / PDF) | ✅ Done | [payment-receipt.md](features/payment-receipt.md) | `ReceiptService.printReceipt()` writes a self-contained HTML page in a new tab; auto-triggers `window.print()`; Print button added to Payment History tab + Student Detail payments tab |
| 5.12 | Student fee portal | ✅ Done | [student-fee-portal.md](features/student-fee-portal.md) | Student dashboard gains Overview + Fees tabs; Fees tab: fee plan summary cards (total paid per plan, count, last date) + full payment history table with per-row Print Receipt; `GET /api/students/my-fees` scoped to logged-in student; lazy-loaded on first tab activation |
| 5.13 | Payment junction table refactor | ✅ Done | [payment-junction-table.md](features/payment-junction-table.md) | `payments` table split into `payments` + `payment_line_items`; single `POST /api/payments` records N plans in one atomic transaction; `totalAmount` on payment; receipt auto-detects single vs combined layout from `lineItems.length`; all three payment views (Fee Collection, Payment History, Student Detail, Student Dashboard) show one row per payment with line items stacked |

**DB migrations applied (Phase 5):**
- `20260625133218_RefactorPaymentToJunctionTable` — creates `payment_line_items` table; migrates existing flat payment data; drops `fee_plan_id` + `session_id` from `payments`; renames `amount_paid` → `total_amount`

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
| 7.1 | Class schedule API | 💡 Backlog | — | Weekly timetable per batch; per-day overrides for batch default timing |
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
| 9.1 | Real dashboard stats | ✅ Done | — | Dashboard cards wired to `GET /api/dashboard/stats` — students, teachers, batches, fees this month |
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
| 10.6 | BrandingEditorComponent (/settings/branding) | ✅ Done | [branding-editor.md](features/branding-editor.md) | 8-tab form; ORG_ADMIN only; save + preview; now inside SettingsShellComponent |
| 10.7 | Achievements section — landing page + editor | ✅ Done | [tenant-landing-page.md](features/tenant-landing-page.md) | AchievementItem DTO; achievement-card UI; editor tab (max 12) |
| 10.8 | Tenant-branded auth pages (/t/:slug/login etc.) | ✅ Done | [tenant-auth-pages.md](features/tenant-auth-pages.md) | TenantAuthComponent shell + 5 child forms; branded left panel; slug-scoped routing |
| 10.9 | Custom domain routing | ✅ Done | — | custom_domain column + migration; GET /api/tenant/by-domain; TenantContextService; DomainResolverService (APP_INITIALIZER); canMatch guard; all nav uses authPath() |

---

## Phase 11 — Teacher Dashboard & Payments

> Brainstormed 2026-06-02. Not yet scoped for implementation — captured here so ideas are not lost.

| # | Feature | Status | Feature Doc | Notes |
|---|---|---|---|---|
| 11.1 | Teacher class log (daily entry by ORG_ADMIN) | 💡 Backlog | — | New `teacher_class_logs` table; ORG_ADMIN logs which teacher took which batch, duration/class count; source of truth for earnings |
| 11.2 | Teacher transaction ledger | 💡 Backlog | — | New `teacher_transactions` table; types: EARNING (auto from class log), ADVANCE (manual), PAYMENT (settlement), ADJUSTMENT; `system_id char(28)` with prefix `TST` |
| 11.3 | Teacher pay rate fields | 💡 Backlog | — | Add `PerClassRate`, `PerHourRate`, `MonthlySalary` to Teacher model; SalaryType drives which rate is used; MONTHLY teachers can still log extra classes |
| 11.4 | Teacher dashboard — today's schedule | 💡 Backlog | — | Show assigned batches with start_time/end_time for today; student count per batch |
| 11.5 | Teacher dashboard — payment summary card | 💡 Backlog | — | Earnings this month, advances taken, balance due; recent transactions list |
| 11.6 | Teacher dashboard — stats widgets | 💡 Backlog | — | Total active batches, total students across batches, subjects taught |
| 11.7 | Teacher rating system | 💡 Backlog | — | New `teacher_ratings` table; student rates teacher once per batch (upsert); 1–5 stars + optional comment; teacher sees avg + distribution only (anonymous); ORG_ADMIN sees full list with student identities |
| 11.8 | Teacher dashboard — rating card | 💡 Backlog | — | Display avg rating, total count, star distribution breakdown |

---

## Cross-cutting — System IDs

| # | Feature | Status | Feature Doc | Notes |
|---|---|---|---|---|
| X.1 | System ID design + rules | ✅ Done | [system-id.md](features/system-id.md) | `char(28)`, format `{TC}-{PREFIX}-{UnixMs}-{UUID4}`, rules in CLAUDE.md |
| X.2 | `tenants.code` + `system_id` migration | ✅ Done | [system-id.md](features/system-id.md) | `20260601182306_AddSystemIds` — 11 tables updated; existing rows backfilled via SQL |
| X.3 | SystemIdService | ✅ Done | [system-id.md](features/system-id.md) | Static service; `Generate()` + `DeriveTenantCode()`; prefix constants |
| X.4 | Wire SystemId into all Create actions | ✅ Done | — | Students, Teachers, Branches, Batches, Classes, AcademicYears, Tenants, Users (OTP verify) |
| X.5 | Teacher + Student user auto-creation | ✅ Done | — | `Email` added to Teacher/Student; User + TenantUserRole auto-created on entity create; `IsFirstLogin = true`; one-time password shown in credentials dialog; existing seeded records still have null UserId |

## Cross-cutting — Role-Based Navigation

| # | Feature | Status | Feature Doc | Notes |
|---|---|---|---|---|
| N.1 | NavigationItem + RoleNavPermission models | ✅ Done | [role-nav-permissions.md](features/role-nav-permissions.md) | Global nav items seeded at startup; per-tenant role permissions |
| N.2 | `navigation_items` + `role_nav_permissions` migration | ✅ Done | — | `20260602183910_AddRoleNavPermissions` |
| N.3 | NavigationController | ✅ Done | [role-nav-permissions.md](features/role-nav-permissions.md) | `GET /my-nav`, `GET /permissions`, `PUT /permissions` |
| N.4 | Shell — dynamic nav from API | ✅ Done | — | Shell calls `GET /my-nav` on init; shimmer skeleton during load; fallback to Dashboard on error |
| N.5 | RolePermissionsComponent | ✅ Done | — | Settings → Role Permissions; toggle matrix (TEACHER / STUDENT); optimistic UI; saves on toggle |
| N.6 | API guards remain hard-coded | ✅ Decision | — | Nav toggle is UX only; backend role checks never moved to DB |

## Cross-cutting — Auth Improvements

| # | Feature | Status | Notes |
|---|---|---|---|
| A.1 | First-login forced password change | ✅ Done | `IsFirstLogin` on User; `POST /api/auth/change-password`; non-dismissible shell dialog; clears flag on success |
| A.2 | Teacher/Student credential delivery | ✅ Done | One-time password shown in dialog after create; copy buttons; warning "cannot be retrieved again" |

## Phase 12 — Responsive Design & PWA

> Decision (2026-06-07): Make every page mobile-friendly so teachers (and others) can use the app on phone/tablet without a separate native app. Layer a PWA on top for home-screen install + offline basics.

| # | Feature | Status | Feature Doc | Notes |
|---|---|---|---|---|
| 12.1 | Responsive audit — inventory all pages | ✅ Done | — | Audited all routes; shell and main feature pages identified as needing work |
| 12.2 | Global layout — shell & nav responsive | ✅ Done | — | Hamburger button in header; sidebar slides in as off-canvas drawer with backdrop on mobile; closes on nav click or backdrop tap; resize auto-closes |
| 12.3 | Dashboard responsive | ✅ Done | — | Already uses `repeat(auto-fill, minmax(220px, 1fr))` — no changes needed |
| 12.4 | Student management responsive | ✅ Done | — | Table card gets `overflow-x: auto`; `min-width: 640px` on table forces scroll; page header stacks on mobile; dialog already `max-width: 95vw` (goes full-width on mobile via styles.scss) |
| 12.5 | Teacher management responsive | ✅ Done | — | Same fixes as 12.4 |
| 12.6 | Academic structure responsive | ✅ Done | — | Uses PrimeNG p-tablist; global `.p-tablist` overflow-x added in styles.scss |
| 12.7 | Attendance marking responsive | ✅ Done | — | Tab bar scrollable; filters stack vertically; P/A/L/E buttons grow to 2.75rem (44px) for touch; sheet toolbar stacks |
| 12.8 | Teacher dashboard responsive | ✅ Done | — | Stats strip → 2-column grid; check-in card stacks vertically; avatar + name scale down |
| 12.9 | Teacher attendance admin page responsive | ✅ Done | — | Header + controls stack; tab bar scrollable; time/note inputs go full width on mobile |
| 12.10 | Settings pages responsive | ✅ Done | — | Branches: table scroll + min-width + header stack + dialog edge-to-edge on mobile; Role Permissions: matrix scroll + legend wrap + 44px touch toggles; Branding Editor: mobile padding + field-sm full-width + actions wrap |
| 12.11 | Login / auth pages responsive | ✅ Done | — | _forms.scss: host padding reduced on ≤480px; h2 uses clamp(1.375rem, 4vw, 1.625rem); left brand panel already hides at 860px |
| 12.12 | Landing page responsive | ✅ Done | — | Section padding 5rem→3rem on mobile; section-title uses clamp(); contact grid breakpoint 680→768px; hero min-height reduced; floating buttons respect safe-area-inset-bottom; carousel responsiveOptions already set in TS |
| 12.13 | PWA setup | 📋 Planned | — | `@angular/pwa` service worker; manifest (icon, name, theme_color); offline fallback page |

**Responsive breakpoints to target:**

| Label | Width |
|---|---|
| Mobile | < 768 px |
| Tablet | 768 – 1024 px |
| Desktop | > 1024 px |

---

## What to Work on Next

**Just completed (2026-06-05) — Phase 4 complete:**
- Student dashboard (`GET /api/students/my-dashboard`) — welcome bar, enrolled batches, attendance % per batch
- Student attendance view — report-only mode, batches loaded from enrollments, monthly report scoped to own row
- Batch date-range enforcement — dashboard hides out-of-range batches; mark attendance rejects out-of-range dates
- Calendar marked-date highlights — green dates in the date picker where attendance is already recorded
- STUDENT default nav now includes `attendance`

**Next in priority order:**
1. **Phase 6 — Exams** — exam management, marks entry, report cards (DB models exist)
2. **Phase 12 — PWA (12.13)** — `@angular/pwa` service worker, manifest, offline fallback — last remaining Phase 12 item
3. **Phase 9.2** — Audit log viewer
4. **Fee concessions** (deferred from Phase 5) — `student_fee_concessions` table; UI in fee collection + student detail

---

## How to Use This File

1. Before starting any feature: add a row with `📋 Planned` and create the feature doc in `docs/features/`
2. When work starts: change status to `🔄 In Progress`
3. When done: change status to `✅ Done` and link the feature doc
4. When blocked: change to `❌ Blocked` and add a note explaining what's needed
5. Keep "What to Work on Next" updated so context is never lost between sessions
