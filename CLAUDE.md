# CLAUDE.md — ClassNova Project Context

**ClassNova** is a multi-tenant SaaS platform for coaching centres.
It handles student and teacher management, academic scheduling, fee tracking, exam results,
attendance, and tenant onboarding — all scoped per tenant with role-based access.

> **Project Plan:** [`docs/project-plan.md`](docs/project-plan.md) is the living progress tracker.
> **Read it at the start of every session. Update it before and after every feature.**

---

## Solution Structure

```
Coaching Centre App/
├── ClassNova.sln
├── backend/
│   └── ClassNovaApi/           # ASP.NET Core 9 Web API
│       ├── Controllers/        # Thin HTTP controllers
│       ├── Models/             # EF Core entities + request/response DTOs
│       ├── Data/               # AppDbContext + seed logic
│       ├── Extensions/         # ClaimsPrincipal helpers, service registration
│       ├── Migrations/         # EF Core migration files
│       ├── appsettings.json
│       └── ClassNovaApi.csproj
├── frontend/                   # Angular 20 SPA
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/     # Feature UI components (login, dashboard, shell, ...)
│   │   │   ├── services/       # Injectable services (auth, students, teachers, ...)
│   │   │   ├── guards/         # Route guards
│   │   │   ├── interceptors/   # HTTP interceptors (auth token attachment)
│   │   │   ├── models/         # TypeScript interfaces for API contracts
│   │   │   ├── app.config.ts
│   │   │   └── app.routes.ts
│   │   └── styles.scss
│   ├── package.json
│   └── angular.json
└── docs/
    ├── mvp-scope.md
    ├── db-design-v1.md
    ├── features/               # One .md file per feature (created before coding)
    └── concepts/               # One .md file per technology/concept used (Rule 23)
```

---

## Backend

- **Framework**: .NET 9.0 / ASP.NET Core Web API
- **ORM**: EF Core 9.0 with Npgsql (PostgreSQL)
- **Naming**: Snake_case columns via `EFCore.NamingConventions`
- **Auth**: JWT Bearer tokens (8 h expiry), BCrypt password hashing
- **Claims**: Custom claims `tenant_id`, `tenant_slug`, `role` extracted via `ClaimsPrincipalExtensions`
- **Serialization**: System.Text.Json (default in .NET 9)

### Key Backend Files

| File | Purpose |
|---|---|
| `Data/AppDbContext.cs` | EF Core context — 14+ DbSets, all FK cascades set to Restrict |
| `Extensions/ClaimsPrincipalExtensions.cs` | `GetTenantId()`, `GetUserId()`, `GetRole()` helpers |
| `Controllers/AuthController.cs` | Register, login, `/me` — issues JWT |
| `Controllers/StudentsController.cs` | Student CRUD, photo upload, status toggle |
| `Controllers/TeachersController.cs` | Teacher CRUD, status toggle |
| `Controllers/TenantController.cs` | Tenant onboarding, public branding endpoint |

### Authorization Roles

| Role | Scope |
|---|---|
| `PLATFORM_ADMIN` | Cross-tenant; tenant management |
| `ORG_ADMIN` | Full access within own tenant |
| `TEACHER` | Own data + assigned batches/subjects |
| `STUDENT` | Own profile only |

---

## Frontend

- **Framework**: Angular 20.2 (standalone components, signals)
- **UI Library**: PrimeNG 20.0.1 (Aura theme) + Angular Material 20.2.1
- **Language**: TypeScript (strict mode — `"strict": true` in tsconfig)
- **State**: Angular Signals for local state; services for shared state
- **HTTP**: `HttpClient` + `auth.interceptor.ts` (auto-attaches Bearer token)
- **Routing**: Functional route guards (`authGuard`)
- **Forms**: Reactive Forms (`FormBuilder` / `FormGroup`)

### Key Frontend Files

| File | Purpose |
|---|---|
| `app/app.config.ts` | Bootstrap: HTTP client, PrimeNG theme, router |
| `app/app.routes.ts` | Route definitions; shell wraps all protected routes |
| `app/guards/auth.guard.ts` | Redirects unauthenticated users to `/login` |
| `app/interceptors/auth.interceptor.ts` | Appends `Authorization: Bearer {token}` |
| `app/services/auth.service.ts` | Login/logout, `AuthContext` stored in localStorage |
| `app/components/login/` | Login page — tenant slug + email + password |
| `app/components/shell/` | Nav shell — role-based menu visibility |
| `app/components/dashboard/` | Dashboard stat cards |

### API URL Configuration

Backend base URL must come from `environment.ts` / `environment.prod.ts` — never hardcode it.

---

## Database

- **Engine**: PostgreSQL
- **ORM**: EF Core 9.0 with Npgsql provider
- **Column naming**: Automatic snake_case via `UseSnakeCaseNamingConvention()`
- **Migrations**: `backend/ClassNovaApi/Migrations/` — do not edit manually

### Core Tables

| Table | Key Columns |
|---|---|
| `tenants` | `id`, `name`, `slug` (unique), `is_active` |
| `tenant_settings` | `tenant_id`, branding fields, timezone, currency |
| `tenant_features` | `tenant_id`, `feature_code`, `is_enabled` |
| `users` | `id`, `tenant_id`, `email`, `password_hash`, `full_name` |
| `tenant_user_roles` | `user_id`, `tenant_id`, `role_id`, `branch_id` |
| `students` | `tenant_id`, `admission_no` (unique per tenant), `status` |
| `teachers` | `tenant_id`, `employee_code` (unique per tenant), `status` |
| `academic_years`, `classes`, `batches`, `subjects` | All scoped by `tenant_id` |
| `fee_plans`, `payments`, `student_enrollments` | Decimal (10,2) for monetary values |
| `exams`, `exam_subjects`, `marks` | Exam results per tenant |
| `audit_logs` | `action`, `entity_type`, `entity_id`, `metadata_json` (JSONB) |

### ⚠️ DB Rules

- NEVER modify EF Core entities or `AppDbContext` without asking first
- NEVER edit migration files manually — always use `dotnet ef migrations add`
- New schema changes require a new migration script; never alter existing ones
- All new tables must include a `tenant_id` foreign key — no tenant-unscoped tables

### System ID Rules

Every entity that represents a real-world object (Teacher, Student, Branch, Batch, Class, Academic Year, Fee Plan, Payment, Exam) must carry a `system_id` column generated at creation time. Internal junction/log tables (attendance, marks, enrollments, audit logs) use UUID only.

**Format:** `{TenantCode}-{PREFIX}-{UnixMs}-{UUID[0..3]}` — e.g. `BF-CNS-1748600123456-A3F2`

| Entity | Prefix |
|---|---|
| Teacher | `CNT` |
| Student | `CNS` |
| ORG_ADMIN user | `CNA` |
| Branch | `BRN` |
| Batch | `BAT` |
| Class | `CLS` |
| Academic Year | `ACY` |
| Fee Plan | `FPL` |
| Payment / Receipt | `RCT` |
| Exam | `EXM` |

**Column type:** `char(28)` — the format is always exactly 28 characters; fixed-length is faster for unique index lookups than varchar.

**Generation:** Server-side at row creation using `SystemIdService.Generate(tenantCode, prefix, entityId)`. Never generate on the frontend, never allow client to supply it.

**Critical performance rules — must never be violated:**
- `system_id` is NEVER a primary key — PK stays `uuid` on every table
- `system_id` is NEVER used as a foreign key — all FK references use the UUID PK
- `system_id` has ONE unique index — no additional indexes on this column
- `system_id` is a display/reference field only — never used in JOIN conditions
- Violating these rules causes index bloat and slower JOINs at scale

---

## Auth Flow

1. Client sends `{ tenantSlug, email, password }` to `POST /api/auth/login`
2. Server validates tenant is active, user exists in that tenant, password matches BCrypt hash
3. Server returns JWT with claims: `sub` (userId), `tenant_id`, `tenant_slug`, `role`, `full_name`
4. Client stores `AuthContext` in localStorage (`auth_context` key)
5. `auth.interceptor.ts` attaches `Authorization: Bearer {token}` to all subsequent requests
6. Controllers extract tenant/user/role via `ClaimsPrincipalExtensions` helpers

---

## Dev Commands

```bash
# ── Backend ────────────────────────────────────────────────────
# Restore packages
dotnet restore

# Build
dotnet build ClassNova.sln

# Run API (default: http://localhost:5188)
dotnet run --project backend/ClassNovaApi

# Add EF Core migration
dotnet ef migrations add <MigrationName> --project backend/ClassNovaApi

# Apply migrations to DB
dotnet ef database update --project backend/ClassNovaApi

# ── Frontend ───────────────────────────────────────────────────
# Install dependencies
cd frontend && npm install

# Start dev server (http://localhost:4200)
cd frontend && npm start

# Build for production
cd frontend && npm run build

# Run tests
cd frontend && npm test
```

---

## Environment Variables

Never hardcode secrets — always use config or environment variables:

```
# PostgreSQL
ConnectionStrings__DefaultConnection=

# JWT
Jwt__Key=
Jwt__Issuer=
Jwt__Audience=

# App
ASPNETCORE_ENVIRONMENT=Development
```

Frontend API base URL lives in `environment.ts`:

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:5188/api'
};
```

---

## Code Conventions

### Backend (C# / .NET)

- Follow existing patterns in `Controllers/` and `Extensions/`
- Use constructor dependency injection — never `new` a service manually
- Controllers are thin: validate input → call service → return result. Zero business logic.
- Use `ClaimsPrincipalExtensions` to read tenant/user/role — never parse claims directly
- Always scope DB queries to `tenantId` extracted from claims
- Use `DateTime.UtcNow` for all timestamps — never local time
- Status fields use UPPER_SNAKE_CASE strings: `"ACTIVE"`, `"INACTIVE"`, `"DRAFT"`
- Return the standard response envelope (see Rule 14 below)
- Use `[Required]`, `[MaxLength]`, `[Range]` attributes on all request DTOs
- Use `ILogger<T>` for logging — never `Console.Write` / `Console.WriteLine`
- Decimal columns for money: `HasPrecision(10, 2)`
- No raw SQL — EF Core LINQ only; raw SQL only when explicitly approved

### Frontend (Angular / TypeScript)

- **Standalone components only** — no NgModules (`standalone: true` on every component)
- Use Angular **Signals** for local component state; services for shared/cross-component state
- Use **PrimeNG** components first; Angular Material second — do not introduce other UI libraries
- Use **Reactive Forms** (`FormBuilder` / `FormGroup`) — no template-driven forms
- Use **RxJS observables** for async — no raw Promises unless unavoidable
- Always unsubscribe: `takeUntil(this.destroy$)` in `ngOnDestroy`, or prefer `AsyncPipe`
- Define a TypeScript **interface** for every API request body and response shape — in `models/`
- Use `inject()` function for dependency injection (not constructor injection)
- Use `isPlatformBrowser()` before accessing `localStorage` (SSR compatibility)
- All date/time formatting: use Angular `DatePipe` or native `Intl` — no Moment.js dependency yet
- API base URL from `environment.ts` only — never inline strings
- **Never use `::ng-deep`** in component SCSS files — see Rule 21 below

---

## Coding Standards — Always Follow

### 1. Feature Documentation First

Before writing a single line of code for any new feature:
- Create a feature document in `docs/features/<feature-name>.md`
- Must include: **Requirements**, **Step-by-step implementation plan**, **API contract**, **Edge cases**, **Test cases**
- Update the document as implementation evolves
- A feature is NOT complete until the document reflects the final state

### 2. No `any` in TypeScript

- `any` is forbidden except when an external library forces it or data is genuinely unshapeable
- Every `any` must have an inline comment: `// any: <reason>`

### 3. Meaningful Names — No Abbreviations

- Banned names everywhere: `data`, `temp`, `value`, `result`, `res`, `obj`, `d`, `val`, `x`, `item`, `tmp`
- Names must describe intent — a reviewer should understand purpose without reading implementation
- **TypeScript**: `camelCase` for variables/functions, `PascalCase` for classes/interfaces/enums
- **C#**: `camelCase` for parameters/locals, `PascalCase` for methods/properties/classes, `_camelCase` for private fields

### 4. Functions Must Be Small

- Target < 30–40 lines per function/method
- If longer: extract each distinct step into its own well-named private method
- One concept per function — a function that does more than one thing must be split

### 5. Keep Components Small and Focused

- A component has a single responsibility — rendering + user interaction only
- Business logic belongs in services; a component with business logic must be refactored
- If a component or service class exceeds ~200–300 lines, split it

### 6. Always Handle Async Errors

- No unhandled observable errors — every pipe must have `catchError`
- No unhandled Promises — every `.then()` must have a `.catch()`
- Backend: every service method that can throw must handle or explicitly re-throw with context

### 7. Observable / Subscription Hygiene

- Every component that subscribes manually must implement `OnDestroy` + `takeUntil(this.destroy$)`
- Prefer `AsyncPipe` in templates over manual subscriptions
- Never subscribe inside a `subscribe` — use `switchMap`, `mergeMap`, or `concatMap`

### 8. Multi-Tenant Isolation is Non-Negotiable

- Every DB query must be filtered by `tenantId` from the authenticated user's claims
- Never return or mutate data belonging to a different tenant
- Add a tenant ID assertion at the service layer before any write operation

### 9. No Business Logic in Controllers

- Controllers: validate input → call service → return result. That is all.
- No `AppDbContext` in controllers — always go through a service or repository

### 10. Never Expose EF Entities via API

- API responses must use DTOs — never return raw EF Core entity objects
- Map entity → DTO explicitly in the service layer
- DTOs live in `Models/` alongside the relevant controller

### 11. Standard API Response Envelope

Every endpoint must return this structure:

```json
{
  "success": true | false,
  "data": <payload> | null,
  "error": null | "<message>"
}
```

- Success: `success: true`, `data: <result>`, `error: null`
- Failure: `success: false`, `data: null`, `error: "<human-readable message>"`
- Never return bare strings, raw status codes, or inconsistently shaped responses

### 12. Validate All Input at the API Boundary

- Every client-supplied value is untrusted — validate with data annotations or FluentValidation
- Reject and return a structured error before data reaches the service layer
- File uploads: validate extension (JPG/PNG/WebP) and size (max 2 MB) before processing

### 13. Never Swallow Errors

- No empty `catch` blocks — ever
- Every caught exception must be logged with context or re-thrown with additional context
- Backend: log via `ILogger` then return structured error response
- Frontend: surface to the user or log to a monitoring service

### 14. Async/Await — No Blocking Calls

- Backend: never use `.Result`, `.Wait()`, or `.GetAwaiter().GetResult()` on async methods
- Frontend: no mixing raw Promises and RxJS at the same call site — pick one
- All async paths must propagate exceptions — never fire-and-forget without error handling

### 15. Structured Logging

- Log all significant operations: entry to major flows, external calls, state changes, errors
- Log levels: `Information` for normal flow, `Warning` for recoverable issues, `Error` for failures
- Never log: passwords, JWT tokens, full request bodies that may contain sensitive data

### 16. No Code Duplication

- Same logic in two places → extract into a shared service, utility, or helper
- Frontend shared code: new service in `services/` or shared utility function
- Backend shared code: `Extensions/` or a helper class in `ClassNovaApi`
- Copy-pasting is always a flag to stop and refactor

### 17. No Hardcoding

- No magic numbers, magic strings, or inline URLs
- Frontend: use `environment.ts` for config; named constants for repeated literals
- Backend: `appsettings.json` / environment variables; `const` or `enum` for fixed values

### 18. No `console.log` in Committed Code

- Remove all `console.log`, `console.warn`, `console.error` before committing
- Backend: use `ILogger<T>`; Frontend: surface errors to the user or use a logging service

### 19. Do Not Mutate Shared State Directly

- Components read from services — they never write to shared state directly; call a service method
- Backend: service methods return new values or update DB through EF Core — no global mutable variables

### 21. No `::ng-deep` in Component SCSS

`::ng-deep` is deprecated and breaks Angular's style encapsulation. It also leads to uncontrolled global leakage and will be fully removed from Angular.

**The rule:** All PrimeNG (and Angular Material) internal style overrides must live in `styles.scss` as global rules — never inside a component's SCSS file.

**The pattern:**
1. Add a `styleClass="some-hook"` attribute to the PrimeNG component in the template. PrimeNG applies this class to the root rendered element (e.g., `<div class="p-select some-hook">`).
2. In `styles.scss`, target it without any host scoping: `.p-select.some-hook { ... }`.

**What is allowed in component SCSS (no deep needed):**
- Styling the Angular host element selector: `:host { ... }`
- Styling child HTML elements: `.my-class { ... }`
- Styling PrimeNG *host element tags* (not their internals): `p-button { display: block; }` — this targets the Angular component element, not its shadow DOM

### 22. No `!important` — Use PrimeNG Design Tokens

`!important` is forbidden everywhere in this codebase. Once used, every override on top of it also needs `!important`, creating an unwinnable specificity war.

**The correct approach for PrimeNG overrides:**

Override the component's CSS design token in `:root` inside `styles.scss`. PrimeNG reads its own tokens internally, so no selector fight occurs.

```scss
/* ❌ Never */
.p-inputtext { background: #ffffff !important; }

/* ✅ Always */
:root { --p-inputtext-background: #ffffff; }
```

Token naming pattern: `--p-<component>-<property>`
Examples: `--p-inputtext-background`, `--p-datatable-header-cell-background`, `--p-select-border-color`

For properties with no token (font-family, transitions), use plain CSS selectors — they work fine because `darkModeSelector: '.dark-mode'` in `app.config.ts` means PrimeNG never auto-applies dark styles.

**Dark mode rule:** `darkModeSelector` is set to `'.dark-mode'`. Dark theme only activates when you explicitly add `.dark-mode` to `<html>`. Never change this to `system` or `media`.

### 23. Parallel Concept Documentation

Every technology, pattern, or non-trivial concept introduced in this project must have a corresponding learning doc in `docs/concepts/`.

**The rule:** When you write code that uses a concept for the first time (or uses it in a meaningfully new way), create or update `docs/concepts/<concept-name>.md` in the same session — not later.

**What counts as a concept worth documenting:**
- A library or framework (PrimeNG, EF Core, RxJS, JWT, BCrypt, Angular Signals…)
- A design pattern (multi-tenancy, route guards, HTTP interceptors, reactive forms…)
- A backend technique (JWT claims, password hashing, DTO mapping, LINQ queries…)
- A frontend technique (Signals, AsyncPipe, takeUntil, CSS design tokens…)
- A platform concept (EF Core migrations, snake_case naming, response envelopes…)

**What each concept doc must contain:**

```markdown
# <Concept Name>

## What it is
One short paragraph — plain-English definition, no jargon.

## Why we use it in ClassNova
Specific reason: what problem it solves in this project.

## How we use it — with examples
Concrete code snippets pulled from this codebase.

## Key rules / gotchas
Bullet list of things that tripped us up or are easy to get wrong.

## Where to find it in the codebase
File paths + line context so you can navigate straight to it.
```

**Index:** `docs/concepts/INDEX.md` lists every concept doc — update it whenever you add a new one.

**This runs in parallel with feature development.** A concept doc does not block a feature, but the feature is not fully "done" until its new concepts are documented.

### 20. Feature Completion Checklist

A feature is NOT complete until ALL of the following are true:

- [ ] Feature document created/updated in `docs/features/`
- [ ] Code follows all rules in this document
- [ ] All error paths handled — no swallowed exceptions, no empty catch blocks
- [ ] API uses the standard response envelope and DTOs
- [ ] No `console.log`, no magic strings, no unexplained `any`
- [ ] Observable subscriptions cleaned up (Angular)
- [ ] Manual test of the happy path and at least one error/edge case
- [ ] New concepts/technologies introduced are documented in `docs/concepts/`

---

## Strict Rules — Always Follow

1. ❌ **Never modify EF Core entities, `AppDbContext`, or migrations** without asking first
2. ❌ **Never write plain JavaScript** — TypeScript only on the frontend
3. ❌ **Never install new npm or NuGet packages** without confirming first
4. ❌ **Never use NgModules** — all Angular components must be standalone
5. ❌ **Never use `any` in TypeScript** without an inline comment explaining why
6. ❌ **Never leave subscriptions open** — every manual subscription must be cleaned up in `ngOnDestroy`
7. ❌ **Never put business logic in controllers or components** — controllers delegate to services; components are UI only
8. ❌ **Never expose raw EF entities via API** — always map to a DTO first
9. ❌ **Never use `.Result` or `.Wait()`** on async methods in the backend
10. ❌ **Never swallow exceptions** — no empty catch blocks
11. ❌ **Never hardcode the API base URL** — always use `environment.ts`
12. ❌ **Never write a tenant-unscoped DB query** — always filter by `tenantId`
13. ❌ **Never use `::ng-deep`** in component SCSS — all PrimeNG overrides belong in `styles.scss`; use `styleClass` to add a CSS hook to the component's rendered root element
14. ❌ **Never use `!important`** — use PrimeNG design tokens in `:root` instead; see Rule 22
15. ✅ Always create a feature document in `docs/features/` before starting implementation
16. ✅ Always check how similar features are implemented before writing new code
17. ✅ Always be tenant-aware — every query, service method, and response must respect tenant boundaries
18. ✅ Always return the standard API response envelope `{ success, data, error }`
19. ✅ Ask before refactoring existing working code
20. ✅ Always create or update a concept doc in `docs/concepts/` when a new technology or pattern is introduced — see Rule 23
21. ❌ **Never use `system_id` as a primary key or foreign key** — it is a display/reference field only; all PKs and FKs must use UUID
22. ❌ **Never generate `system_id` on the frontend** — always generated server-side by `SystemIdService` at creation time
23. ❌ **Never use `varchar` for `system_id` columns** — always `char(28)`; the format is fixed-length and fixed-length columns have faster index lookups
24. ✅ Every entity that represents a real-world object must have a `system_id char(28)` — see System ID Rules in the DB section above

---

## Out of Scope — Do NOT touch unless explicitly told

- `Data/AppDbContext.cs` — DB context configuration and seed logic
- `Migrations/` — EF Core migration files
- `appsettings.json` / `appsettings.Development.json` — connection strings and secrets
- `app.config.ts` — Angular bootstrap configuration
- `auth.interceptor.ts` — token attachment logic
- `auth.guard.ts` — route protection logic
- Any environment or CI/CD configuration files
