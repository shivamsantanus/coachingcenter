# ClassNova — Concept Documentation Index

> **Rule:** Update this index every time you add or rename a concept doc.
> Every non-trivial technology or pattern used in this project must have an entry here.
> See Rule 23 in CLAUDE.md for the full convention.

---

## Backend Concepts

| Concept | Doc | Used in |
|---|---|---|
| JWT Authentication | [jwt-authentication.md](jwt-authentication.md) | `AuthController`, `auth.service.ts` |
| BCrypt Password Hashing | [bcrypt-password-hashing.md](bcrypt-password-hashing.md) | `AuthController` |
| EF Core ORM | [ef-core-orm.md](ef-core-orm.md) | All controllers/services, `AppDbContext` |
| ASP.NET Core Response Envelope | [response-envelope.md](response-envelope.md) | Every controller |
| Multi-Tenancy Pattern | [multi-tenancy.md](multi-tenancy.md) | Every DB query, every controller |
| DTO Mapping | [dto-mapping.md](dto-mapping.md) | All API responses |

## Frontend Concepts

| Concept | Doc | Used in |
|---|---|---|
| Angular Signals | [angular-signals.md](angular-signals.md) | All components |
| RxJS Observables | [rxjs-observables.md](rxjs-observables.md) | All services and async components |
| Angular Reactive Forms | [angular-reactive-forms.md](angular-reactive-forms.md) | Login, register, student/teacher forms |
| Angular Route Guards | [angular-route-guards.md](angular-route-guards.md) | `auth.guard.ts`, `platformAdminGuard`, `tenantAuthGuard` |
| Angular HTTP Interceptors | [angular-http-interceptors.md](angular-http-interceptors.md) | `auth.interceptor.ts` |
| PrimeNG Component Library | [primeng.md](primeng.md) | All UI components |
| CSS Design Tokens | [css-design-tokens.md](css-design-tokens.md) | `styles.scss`, tenant theming |
| Angular Standalone Components | [angular-standalone-components.md](angular-standalone-components.md) | Every Angular component |
