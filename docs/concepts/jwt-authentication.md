# JWT Authentication

## What it is

JWT (JSON Web Token) is a compact, self-contained token format for securely transmitting identity information between a client and a server. A JWT is a Base64-encoded string made of three parts separated by dots: `header.payload.signature`. The server signs the token with a secret key; the client stores it and sends it back on every request. The server verifies the signature — no database lookup needed to authenticate.

## Why we use it in ClassNova

ClassNova is a multi-tenant SaaS. Every API call must know *which tenant* the user belongs to and *what role* they have. JWT lets us bake `tenant_id`, `tenant_slug`, and `role` directly into the token at login time. The server reads those claims from the token on every request — no extra DB round trip to resolve the tenant or role.

## How we use it — with examples

**Issuing the token** (`backend/ClassNovaApi/Controllers/AuthController.cs`):

```csharp
var claims = new List<Claim>
{
    new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
    new Claim("tenant_id",   tenant.Id.ToString()),
    new Claim("tenant_slug", tenant.Slug),
    new Claim("role",        userRole.Role.Name),
    new Claim("full_name",   user.FullName)
};

var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
var token = new JwtSecurityToken(
    issuer:   _config["Jwt:Issuer"],
    audience: _config["Jwt:Audience"],
    claims:   claims,
    expires:  DateTime.UtcNow.AddHours(8),
    signingCredentials: creds
);
```

**Reading claims in controllers** (`backend/ClassNovaApi/Extensions/ClaimsPrincipalExtensions.cs`):

```csharp
// Never parse claims directly in a controller — always use these helpers
var tenantId = User.GetTenantId();   // Guid
var userId   = User.GetUserId();     // Guid
var role     = User.GetRole();       // string e.g. "ORG_ADMIN"
```

**Storing and sending the token** (`frontend/src/app/services/auth.service.ts`):

```typescript
// Stored in localStorage under key 'auth_context'
localStorage.setItem('auth_context', JSON.stringify(authContext));

// auth.interceptor.ts attaches it automatically to every request:
// Authorization: Bearer <token>
```

## Key rules / gotchas

- **8-hour expiry** — tokens expire after 8 hours (`AddHours(8)`). No refresh token mechanism yet; users must log in again.
- **Tenant claims are baked in at login** — if a user's role changes, the old token is still valid until it expires. For sensitive role changes this is a known limitation to address later.
- **Secret key lives in `appsettings.json` / env vars** — never hardcode `Jwt:Key` in source.
- **`DateTime.UtcNow`** is used for expiry — never local time, to avoid timezone bugs.
- **`ClaimsPrincipalExtensions`** is the only place that parses claims — controllers call the helpers, never `User.FindFirst("tenant_id")` directly.

## Where to find it in the codebase

| Location | Purpose |
|---|---|
| `backend/ClassNovaApi/Controllers/AuthController.cs` | Token issuance (login endpoint) |
| `backend/ClassNovaApi/Extensions/ClaimsPrincipalExtensions.cs` | Claim reading helpers |
| `frontend/src/app/services/auth.service.ts` | Token storage + AuthContext |
| `frontend/src/app/interceptors/auth.interceptor.ts` | Bearer token attachment |
| `backend/ClassNovaApi/appsettings.json` | Jwt:Key / Issuer / Audience config keys |
