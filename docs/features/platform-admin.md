# Platform Admin — Feature Document

## Requirements

A ClassNova super admin (PLATFORM_ADMIN role) must be able to:
1. Log in at `/admin/login` using email + password (no tenant slug)
2. View a list of all tenants on the platform
3. Create a new tenant (org details, branding defaults, contact info)

Delete and edit are deferred to a later phase.

---

## Roles

| Role | Scope |
|---|---|
| `PLATFORM_ADMIN` | Cross-tenant access — ClassNova staff only |
| `ORG_ADMIN` | Full access within their own tenant |

Platform admins are seeded directly into the DB via a one-time SQL insert or Postman call.
They must have a `TenantUserRole` row pointing to the system "classnova" tenant with role code `PLATFORM_ADMIN`.

---

## Implementation Plan

### Backend

1. `POST /api/auth/platform-login` — takes `{ email, password }`, verifies PLATFORM_ADMIN role, issues JWT with `tenant_id = Guid.Empty`, `tenant_slug = "classnova"`
2. `GET /api/tenant` — list all tenants; requires PLATFORM_ADMIN
3. `POST /api/tenant` — secured; changed from `[AllowAnonymous]` to `[Authorize]` + PLATFORM_ADMIN check

### Frontend

| Route | Component | Guard |
|---|---|---|
| `/admin/login` | `PlatformAdminLoginComponent` | none (public) |
| `/admin` | redirect → `/admin/tenants` | `platformAdminGuard` |
| `/admin/tenants` | `TenantListComponent` | `platformAdminGuard` |
| `/admin/tenants/new` | `CreateTenantComponent` | `platformAdminGuard` |

---

## API Contract

### POST /api/auth/platform-login
**Request**
```json
{ "email": "admin@classnova.in", "password": "secret" }
```
**Response 200**
```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "role": "PLATFORM_ADMIN",
    "tenantSlug": "classnova",
    "tenantName": "ClassNova Platform",
    "fullName": "Super Admin"
  },
  "error": null
}
```

### GET /api/tenant
Requires: `Authorization: Bearer <platform_admin_jwt>`

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "ABC Coaching",
      "slug": "abc-coaching",
      "organizationType": "COACHING_CENTRE",
      "status": "ACTIVE",
      "primaryContactEmail": "owner@abc.com",
      "primaryContactName": "Owner Name",
      "planCode": null,
      "createdAt": "2026-05-22T10:00:00Z"
    }
  ],
  "error": null
}
```

### POST /api/tenant
Same request body as before; now requires PLATFORM_ADMIN JWT.

---

## Edge Cases

- Non-PLATFORM_ADMIN user trying to call platform-login → 401
- Unverified email → 401
- Inactive user account → 401
- Non-PLATFORM_ADMIN JWT hitting GET/POST /api/tenant → 403
- Slug already taken → 400 with descriptive error

---

## Test Cases

1. Platform admin logs in with correct credentials → receives JWT, redirected to `/admin/tenants`
2. Wrong password → 401, error shown on login form
3. ORG_ADMIN tries to call `POST /api/auth/platform-login` → 401 Access denied
4. Tenant list shows all tenants ordered newest first
5. Create tenant with valid data → tenant appears in list
6. Create tenant with duplicate slug → validation error shown
7. Navigating to `/admin/tenants` without login → redirected to `/admin/login`
8. Navigating to `/admin/tenants` as ORG_ADMIN → redirected to `/admin/login`
