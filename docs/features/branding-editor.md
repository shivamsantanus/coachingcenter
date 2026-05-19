# Feature: Branding & Landing Page Editor

**Status:** Done  
**Last updated:** 2026-05-19  
**Depends on:** [tenant-landing-page.md](tenant-landing-page.md) — API and DB already done

---

## 1. Requirements

- ORG_ADMIN can configure their organisation's landing page and branding from inside the app
- Editor lives at `/settings/branding` — a child route of the authenticated shell
- Accessible only to `ORG_ADMIN`; other roles are redirected to `/dashboard`
- Form is pre-populated with existing branding data loaded from `GET /api/tenant/{slug}`
- A single "Save Changes" button sends the full form via `PUT /api/tenant/branding`
- A "Preview" button opens `/t/{slug}` in a new tab
- Inline success/error feedback shown after save — no page reload
- Colour inputs use a native colour-picker + hex text field (synced)

### Out of scope
- Image file upload (URLs entered manually for now; file upload is Phase 9.3+)
- Per-tab independent save
- Live preview panel (Preview button opens a new tab instead)

---

## 2. Route & Access

| Route | Component | Guard |
|---|---|---|
| `/settings` | redirects to `/settings/branding` | `authGuard` (inherited from shell) |
| `/settings/branding` | `BrandingEditorComponent` | `authGuard` + ORG_ADMIN role check in component |

The shell's Settings nav item already points to `/settings`.

---

## 3. Tab Structure

| Tab | Fields |
|---|---|
| **Branding** | Brand name, Logo URL, Primary colour, Accent colour |
| **Hero** | Headline (80 chars), Tagline (120 chars), Banner image URL, CTA button text |
| **About** | Visibility toggle, Description (500 chars), Founded year, Student count |
| **Offerings** | Visibility toggle, Dynamic list of up to 6 items (title + note each) |
| **Teachers** | Visibility toggle only (pulls from DB automatically) |
| **Gallery** | Visibility toggle, Dynamic list of up to 8 image URLs |
| **Contact** | Visibility toggle, Phone, Email, Address, Google Maps embed URL |
| **Social** | WhatsApp number, Instagram URL, YouTube URL, Facebook URL |

---

## 4. API Used

| Method | Endpoint | Purpose |
|---|---|---|
| `GET /api/tenant/{slug}` | Public — already exists | Pre-populate form on load |
| `PUT /api/tenant/branding` | Authenticated, ORG_ADMIN | Save form data |

---

## 5. Edge Cases

| Scenario | Behaviour |
|---|---|
| Non-ORG_ADMIN visits `/settings/branding` | Redirected to `/dashboard` |
| Tenant has no existing landing page config | Form loads with empty fields, no error |
| Save succeeds | Green success message shown for 3 seconds |
| Save fails (invalid hex colour, etc.) | Red error message shows API error text |
| Offerings list at 6 items | "Add Course" button disabled |
| Gallery list at 8 URLs | "Add Photo" button disabled |

---

## 6. Test Cases

1. ORG_ADMIN navigates to Settings → lands on Branding tab
2. Existing branding data is pre-filled in the form
3. Change primary colour → save → preview → colour applied to landing page
4. Add 3 offerings → save → preview → offerings section shows 3 cards
5. Toggle About section off → save → preview → about section not visible
6. Try to add a 7th offering → Add button is disabled
7. Save with invalid hex colour → error message shown, no navigation
8. Non-ORG_ADMIN accesses route directly → redirected to dashboard
