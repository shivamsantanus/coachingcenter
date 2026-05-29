# Multi-Tenancy Pattern

## What it is

Multi-tenancy means a single running instance of the application serves multiple independent customers ("tenants") while keeping their data completely isolated. Each tenant thinks they have a private app, but they share the same database, API server, and Angular frontend.

There are three common strategies:
1. **Separate databases per tenant** — strongest isolation, expensive to manage.
2. **Separate schemas per tenant** — moderate isolation, complex migrations.
3. **Shared schema with tenant_id column** — simplest to operate; every table has a `tenant_id` FK. This is what ClassNova uses.

## Why we use it in ClassNova

ClassNova serves many coaching centres. Each centre is a tenant. We use the shared-schema approach because:
- One database is far easier to back up, migrate, and monitor than hundreds.
- EF Core migrations apply to all tenants at once.
- `tenant_id` filtering is simple to enforce in every query.

## How we use it — with examples

**Every table has `tenant_id`:**

```sql
-- Example from the students table
id          uuid    PRIMARY KEY,
tenant_id   uuid    NOT NULL REFERENCES tenants(id),
full_name   text    NOT NULL,
...
```

**Extracting `tenant_id` from the JWT claim in every controller:**

```csharp
// In any controller action — never skip this
var tenantId = User.GetTenantId();   // Guid, from JWT claim via ClaimsPrincipalExtensions
```

**Every DB query is scoped to the tenant:**

```csharp
// ✅ Correct
var students = await _db.Students
    .Where(s => s.TenantId == tenantId)
    .ToListAsync();

// ❌ Wrong — never do a cross-tenant query
var allStudents = await _db.Students.ToListAsync();
```

**Tenant resolution on the frontend** — the slug in the URL (`/t/:slug`) identifies the tenant. `TenantContextService` stores the resolved tenant so all components can read it.

**Custom domain routing** — `DomainResolverService` runs at app startup via `APP_INITIALIZER`. It calls `GET /api/tenant/by-domain` with the current hostname. If it resolves to a tenant, all navigation uses that tenant's slug automatically.

## Key rules / gotchas

- **Every single DB query must filter by `tenantId`** — this is Rule 8 and Rule 12 in CLAUDE.md. An unscoped query would leak one tenant's data to another.
- **Tenant isolation is enforced at the service layer**, not just the controller. Any service method that writes data must assert the tenantId matches before saving.
- **Slug vs ID** — the slug (e.g. `bright-minds`) is the public identifier used in URLs and JWT. The `tenant_id` (UUID) is the internal FK used in DB queries.
- **`PLATFORM_ADMIN` is cross-tenant** — only this role can query across tenants. All other roles (`ORG_ADMIN`, `TEACHER`, `STUDENT`) are strictly single-tenant.
- **Tenant status check at login** — `AuthController` rejects login if `tenant.IsActive == false`.

## Where to find it in the codebase

| Location | Purpose |
|---|---|
| `backend/ClassNovaApi/Data/AppDbContext.cs` | All 22+ DbSets, each entity has `TenantId` |
| `backend/ClassNovaApi/Extensions/ClaimsPrincipalExtensions.cs` | `GetTenantId()` helper |
| `backend/ClassNovaApi/Controllers/TenantController.cs` | Tenant onboarding, branding, by-domain lookup |
| `frontend/src/app/services/tenant-context.service.ts` | Tenant state on the frontend |
| `frontend/src/app/guards/tenant-auth.guard.ts` | Slug-scoped route protection |
