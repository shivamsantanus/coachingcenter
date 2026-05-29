# CSS Design Tokens

## What it is

CSS design tokens are CSS custom properties (`--variable-name`) used as named, reusable values for visual properties like colours, spacing, typography, and shadows. Instead of writing `background: #4f46e5` in three places, you write `background: var(--brand-primary)` and set the value once. Changing the token changes the look everywhere instantly.

PrimeNG uses design tokens internally — every component reads from `--p-*` variables. This means you can customise PrimeNG's entire visual style just by overriding those variables, without touching any component markup or CSS selectors.

## Why we use it in ClassNova

ClassNova is multi-tenant with per-tenant branding (accent colour, logo, etc.). We need to change the app's visual theme at runtime based on which tenant the user belongs to. CSS variables are the ideal mechanism — JavaScript can write to them, and all components that read them update immediately.

## How we use it — with examples

**Setting a design token at runtime** (`BrandingService` / Angular):

```typescript
// applyTheme() is called in ShellComponent on init
applyTheme(accentColor: string): void {
  document.documentElement.style.setProperty('--brand-accent', accentColor);
  document.documentElement.style.setProperty('--p-button-primary-background', accentColor);
}
```

**Using a token in SCSS:**

```scss
/* styles.scss */
:root {
  --brand-accent: #4f46e5;          /* default; overridden at runtime per tenant */
  --p-inputtext-border-color: #d1d5db;
  --p-button-primary-background: var(--brand-accent);
}
```

**In component templates — tokens work in inline styles too:**

```html
<div [style.borderColor]="'var(--brand-accent)'">...</div>
```

**PrimeNG token naming pattern:**

```
--p-<component>-<variant>-<property>
--p-button-primary-background
--p-inputtext-border-color
--p-datatable-header-cell-background
--p-select-border-color
```

Find all PrimeNG tokens in the Aura theme source or the PrimeNG docs.

## Key rules / gotchas

- **Never use `!important`** (Rule 22) — override a token instead. Token changes have no specificity war.
- **`:root` is the right place** for global token overrides in `styles.scss`.
- **`document.documentElement.style.setProperty`** changes the inline style on `<html>` at runtime, which takes precedence over `:root` declarations — this is how per-tenant theming works.
- **Dark mode** is controlled by the `.dark-mode` class on `<html>` — PrimeNG dark tokens activate only when that class is present (set via `darkModeSelector: '.dark-mode'` in `app.config.ts`).
- **Fallback values** — `var(--my-token, #defaultValue)` provides a fallback if the token is not set.

## Where to find it in the codebase

| Location | Purpose |
|---|---|
| `frontend/src/styles.scss` | All token declarations and PrimeNG overrides |
| `frontend/src/app/app.config.ts` | `darkModeSelector` config |
| `frontend/src/app/services/auth.service.ts` | `applyTheme()` — runtime token setting |
| `frontend/src/app/components/shell/shell.component.ts` | Calls `applyTheme()` on init |
