# Feature: Tenant Landing Page & Configurable Branding

**Status:** Done  
**Last updated:** 2026-05-19

---

## 1. Requirements

- Every tenant (coaching centre) gets a **public landing page** at `/t/:slug` — no login required
- The landing page uses a **fixed-section template**; the ORG_ADMIN fills in content via a settings form (no drag-drop builder)
- The **primary colour and accent colour** are applied as CSS custom properties throughout the entire app — login page, shell nav, dashboard, and landing page all reflect the tenant's brand
- The landing page is composed of 7 fixed sections; each section can be individually toggled visible/hidden
- **Hero, About, Offerings, Contact** — content entered manually by the ORG_ADMIN
- **Teachers section** — when enabled, pulls teacher records directly from the `teachers` table (no manual entry)
- **Gallery** — up to 8 images uploaded by the ORG_ADMIN
- **Social links** — WhatsApp, Instagram, YouTube, Facebook
- A "Sign In" button on the landing page links to the existing `/login` page (the user then enters their slug)
- Landing page content is stored as a single JSONB column (`landing_page_json`) on `tenant_settings` — no new table needed
- Two new colour fields added to `tenant_settings`: `accent_color` (second brand colour)
- `GET /api/tenant/{slug}` (already public) is extended to return the new fields
- A new authenticated endpoint `PUT /api/tenant/branding` lets ORG_ADMIN save branding + landing page content
- The Angular app applies CSS variables immediately after loading branding, so the theme affects every page in the session

### Out of scope
- Subdomain-based routing (`tenant.classnova.com`) — deferred to Phase 9.5 deployment
- Drag-drop page builder or custom section ordering
- Student/parent enquiry form on the landing page (future)
- SEO meta tags / Open Graph (future)
- Custom fonts per tenant (future)

---

## 2. Flow

```
Public user visits /t/bright-minds
  ↓
LandingPageComponent loads
  ↓ GET /api/tenant/bright-minds
  ← { brandName, logoUrl, primaryColor, accentColor, landingPage: { hero, about, ... } }
  ↓
CSS custom properties set on :root  →  theme applied globally
  ↓
Sections rendered (only isVisible: true sections shown)
  ↓
"Sign In" CTA → /login  (user enters slug there, existing flow)

---

ORG_ADMIN edits their landing page:
  App shell → Settings → Branding & Landing Page
  ↓
LandingPageEditorComponent (Phase 9.3)
  User fills hero, about, offerings, toggles sections, uploads gallery images
  ↓ PUT /api/tenant/branding
  ← 200 OK
  ↓
Changes visible immediately at /t/:slug
```

---

## 3. DB Changes

### Changes to `tenant_settings`

Two new nullable columns added via migration:

| Column | Type | Notes |
|---|---|---|
| `accent_color` | `varchar(7)` | Hex code e.g. `#FF6B35`; nullable |
| `landing_page_json` | `jsonb` | Structured landing page content; nullable (means "not configured yet") |

No new tables. No changes to existing columns.

### `landing_page_json` Shape

```json
{
  "hero": {
    "headline": "Learn. Grow. Excel.",
    "tagline": "Quality coaching since 2015",
    "bannerImageUrl": "https://cdn.classnova.app/tenants/bright-minds/banner.jpg",
    "ctaText": "Enroll Now"
  },
  "about": {
    "isVisible": true,
    "description": "We are a leading coaching centre specialising in JEE and NEET preparation.",
    "foundedYear": 2015,
    "studentCount": 850
  },
  "offerings": {
    "isVisible": true,
    "items": [
      { "title": "JEE Mains", "note": "2-year intensive program" },
      { "title": "NEET Preparation", "note": "1-year crash course" },
      { "title": "Class 10 Boards", "note": "All subjects" }
    ]
  },
  "teachersSection": {
    "isVisible": true
  },
  "gallery": {
    "isVisible": true,
    "imageUrls": [
      "https://cdn.classnova.app/tenants/bright-minds/gallery/1.jpg"
    ]
  },
  "contact": {
    "isVisible": true,
    "phone": "+91 98765 43210",
    "email": "info@brightminds.com",
    "address": "123 Main Street, Bhubaneswar, Odisha 751001",
    "mapsEmbedUrl": "https://maps.google.com/embed?..."
  },
  "social": {
    "whatsapp": "+919876543210",
    "instagram": "https://instagram.com/brightminds",
    "youtube": "https://youtube.com/@brightminds",
    "facebook": "https://facebook.com/brightminds"
  }
}
```

**Constraints enforced in C# DTO (not DB):**
- `offerings.items`: max 6 items; each title max 60 chars, note max 100 chars
- `gallery.imageUrls`: max 8 URLs
- `hero.headline`: max 80 chars
- `hero.tagline`: max 120 chars
- `about.description`: max 500 chars
- All URL fields: must start with `https://` or be null

---

## 4. API Contract

### GET `/api/tenant/{slug}` — Extended (no auth)

Already exists. Extended to include `accentColor` and `landingPage`.

**Response — 200**
```json
{
  "name": "Bright Minds Academy",
  "slug": "bright-minds",
  "status": "ACTIVE",
  "brandName": "Bright Minds",
  "logoUrl": "https://cdn.../logo.png",
  "primaryColor": "#1A73E8",
  "accentColor": "#FF6B35",
  "landingPage": {
    "hero": { "headline": "...", "tagline": "...", "bannerImageUrl": "...", "ctaText": "..." },
    "about": { "isVisible": true, "description": "...", "foundedYear": 2015, "studentCount": 850 },
    "offerings": { "isVisible": true, "items": [{ "title": "JEE Mains", "note": "..." }] },
    "teachersSection": { "isVisible": true },
    "gallery": { "isVisible": true, "imageUrls": ["..."] },
    "contact": { "isVisible": true, "phone": "...", "email": "...", "address": "...", "mapsEmbedUrl": "..." },
    "social": { "whatsapp": "...", "instagram": "...", "youtube": "...", "facebook": "..." }
  }
}
```

`landingPage` is `null` when the tenant has not configured their page yet. The `LandingPageComponent` shows a "Coming soon" placeholder in that case.

**Error — 404**
```json
{ "success": false, "data": null, "error": "Tenant not found." }
```

---

### PUT `/api/tenant/branding` — New (ORG_ADMIN only)

Authenticated. Updates branding fields and landing page content for the calling user's tenant.

**Request**
```json
{
  "brandName": "Bright Minds Academy",
  "logoUrl": "https://cdn.../logo.png",
  "primaryColor": "#1A73E8",
  "accentColor": "#FF6B35",
  "landingPage": { ... }
}
```

All fields are optional — partial updates are merged. `landingPage: null` clears the landing page content.

**Response — 200**
```json
{
  "success": true,
  "data": { "message": "Branding updated successfully." },
  "error": null
}
```

**Error — 400**
```json
{ "success": false, "data": null, "error": "Primary colour must be a valid hex code." }
```

**Error — 403**
```json
{ "success": false, "data": null, "error": "Only ORG_ADMIN can update branding." }
```

---

### GET `/api/tenant/teachers-preview` — New (no auth)

Returns a lightweight list of active teachers for the landing page teachers section. No sensitive fields.

**Query params:** `slug` (required)

**Response — 200**
```json
{
  "success": true,
  "data": [
    {
      "fullName": "Dr. Priya Sharma",
      "subject": "Physics",
      "photoUrl": "https://cdn.../photo.jpg",
      "qualification": "M.Sc, B.Ed"
    }
  ],
  "error": null
}
```

Returns only `ACTIVE` teachers for the given tenant. Returns max 8 teachers (sorted by `created_at` ascending — oldest/most senior first).

---

## 5. CSS Theming

When the Angular app loads any page for a tenant (landing page, login, or app shell), after the branding API call resolves, apply:

```typescript
// In BrandingService.applyTheme(branding: TenantBranding)
const root = document.documentElement;
if (branding.primaryColor) {
  root.style.setProperty('--brand-primary', branding.primaryColor);
}
if (branding.accentColor) {
  root.style.setProperty('--brand-accent', branding.accentColor);
}
```

PrimeNG Aura uses CSS variable overrides. Map our brand variables to PrimeNG's palette variables in `styles.scss`:

```scss
:root {
  --p-primary-color: var(--brand-primary, #1A73E8);
  --p-primary-contrast-color: #ffffff;
}
```

This means buttons, nav highlights, focus rings, and badges all inherit the tenant's primary colour with zero per-component changes.

---

## 6. Angular Components & Services

### New: `BrandingService`

Singleton service responsible for:
- Fetching `GET /api/tenant/{slug}` and caching the result in a signal
- Calling `applyTheme()` to inject CSS variables
- Exposing `branding$` signal for components to read brand data reactively

`AuthService` calls `BrandingService.loadBranding(slug)` during login — so the theme is applied for the full app session too.

### New: `LandingPageComponent` (`/t/:slug`)

- Standalone, no auth guard
- On init: calls `BrandingService.loadBranding(slug)` from route param
- If `landingPage` is null → shows a minimal "coming soon" card with logo + name + "Sign In" button
- Renders each section only if `isVisible: true`
- Teachers section: calls `GET /api/tenant/teachers-preview?slug=...` only when `teachersSection.isVisible`
- "Sign In" button navigates to `/login`

### New: `LandingPageEditorComponent` (Phase 9.3)

- Lives inside the app shell (authenticated, ORG_ADMIN only)
- Tab-based form: Branding → Hero → About → Offerings → Teachers → Gallery → Contact → Social
- On save: calls `PUT /api/tenant/branding`
- Preview button opens `/t/:slug` in a new tab

---

## 7. Backend Implementation

### New: `BrandingService.cs`

Service layer for `PUT /api/tenant/branding`. Responsible for:
- Deserializing and validating `LandingPageContent` DTO
- Serialising to JSON and writing to `tenant_settings.landing_page_json`
- Enforcing all field-level constraints (max lengths, URL format, max items)

### New: `LandingPageContent.cs` (DTO)

Typed C# record matching the JSON shape above. Used for both API request deserialization and response serialization. Not an EF entity.

### Updated: `TenantController.cs`

- `GetTenant` extended to include `accentColor` and `landingPage` in the projection
- New `UpdateBranding` action: `[Authorize] [HttpPut("branding")]` — role-checked, tenant-scoped
- New `GetTeachersPreview` action: `[AllowAnonymous] [HttpGet("teachers-preview")]`

---

## 8. Implementation Order

| Step | Task | Notes |
|---|---|---|
| 1 | Create migration: add `accent_color` + `landing_page_json` to `tenant_settings` | Confirm with user before running |
| 2 | Update `TenantSettings.cs` model with new properties | Ask before modifying |
| 3 | Create `LandingPageContent.cs` DTO with validation attributes | New file, safe to create |
| 4 | Create `BrandingService.cs` (backend) | New file |
| 5 | Update `TenantController.GetTenant` to return new fields | Small extension |
| 6 | Add `TenantController.UpdateBranding` endpoint | New action |
| 7 | Add `TenantController.GetTeachersPreview` endpoint | New action |
| 8 | Create Angular `BrandingService` + `applyTheme` | New service |
| 9 | Wire `BrandingService` into existing login flow | Small change to `AuthService` |
| 10 | Add CSS variable mappings to `styles.scss` | Small change |
| 11 | Build `LandingPageComponent` | New component |
| 12 | Add `/t/:slug` route to `app.routes.ts` | Small change |
| 13 | Build `LandingPageEditorComponent` | New component (Phase 9.3) |

---

## 9. Edge Cases

| Scenario | Expected Behaviour |
|---|---|
| Tenant has no `landing_page_json` | `landingPage: null` in API response; component shows minimal "coming soon" card |
| Tenant is inactive (`status != ACTIVE`) | `GET /api/tenant/{slug}` returns 400; landing page shows "This organisation is not active" |
| Tenant slug does not exist | 404; Angular router shows a generic "Page not found" |
| `primaryColor` is null/not set | CSS variable not injected; app uses default PrimeNG Aura theme colour |
| `teachersSection.isVisible: true` but no active teachers | Teachers section renders an empty state: "No teachers listed yet" |
| `offerings.items` has 0 entries but section is visible | Offerings section hidden regardless of `isVisible` flag |
| Gallery images fail to load | `onerror` on `<img>` hides the broken image slot; remaining images fill the grid |
| ORG_ADMIN sends `primaryColor: "#XYZ"` (invalid hex) | 400: "Primary colour must be a valid 6-digit hex code." |
| ORG_ADMIN sends > 6 offerings items | 400: "Offerings list cannot exceed 6 items." |
| ORG_ADMIN sends > 8 gallery URLs | 400: "Gallery cannot exceed 8 images." |
| `mapsEmbedUrl` contains non-Google Maps URL | Accepted (we cannot validate this safely without fetching); CSP `frame-src` restricts what can actually embed |
| Non-ORG_ADMIN calls `PUT /api/tenant/branding` | 403 returned |
| `PUT /api/tenant/branding` called by ORG_ADMIN of Tenant A with Tenant B's slug | Not applicable — tenant is always taken from JWT claims, never from the request body |

---

## 10. Test Cases

### Happy Path
1. Visit `/t/bright-minds` — landing page renders with correct brand name, logo, hero text
2. Primary colour from DB is applied as CSS variable; buttons and nav reflect it
3. Offerings section shows all configured items (max 6)
4. Teachers section shows active teachers from DB (max 8)
5. Gallery renders uploaded photos
6. Contact section shows phone, email, address
7. Social icons link to configured URLs (open in new tab)
8. "Sign In" button navigates to `/login`
9. ORG_ADMIN saves branding via `PUT /api/tenant/branding` → 200
10. Change is reflected immediately on `/t/:slug` after reload

### Error / Edge Cases
11. Tenant with no `landing_page_json` → minimal "coming soon" card shown
12. Inactive tenant slug → "organisation is not active" message shown
13. Unknown slug → generic 404 page
14. Section with `isVisible: false` → section not rendered in DOM
15. `offerings.items` empty but `isVisible: true` → section does not render
16. Gallery image URL returns 404 → broken image slot hidden
17. `PUT /api/tenant/branding` with invalid hex colour → 400 with field-level error message
18. `PUT /api/tenant/branding` called by a TEACHER role → 403
19. `GET /api/tenant/teachers-preview?slug=...` for tenant with no active teachers → `data: []`, 200
20. Theme CSS variables applied before first paint — no flash of default colour on landing page
