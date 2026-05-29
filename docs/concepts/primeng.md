# PrimeNG Component Library

## What it is

PrimeNG is a rich UI component library for Angular. It provides 90+ pre-built components — buttons, inputs, tables, dialogs, menus, date pickers, file uploaders, and more — all styled consistently. It uses a theming system based on **CSS design tokens** (CSS custom properties) so you can customise the look by overriding variables rather than fighting specificity.

ClassNova uses **PrimeNG 20.0.1** with the **Aura theme**.

## Why we use it in ClassNova

Building accessible, polished UI components from scratch is expensive. PrimeNG gives us production-ready components that work with Angular's standalone component model and integrate cleanly with Reactive Forms via `ControlValueAccessor`. The Aura theme looks modern and is fully customisable via design tokens.

## How we use it — with examples

**Importing a component** (standalone — no NgModule needed):

```typescript
import { ButtonModule }   from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule }    from 'primeng/table';

@Component({
  standalone: true,
  imports: [ButtonModule, InputTextModule, TableModule, ...],
})
```

**Common components used in ClassNova:**

| Component | Import | Tag |
|---|---|---|
| Button | `ButtonModule` | `<p-button>` |
| Input text | `InputTextModule` | `<input pInputText>` |
| Password | `PasswordModule` | `<p-password>` |
| Data table | `TableModule` | `<p-table>` |
| Dialog | `DialogModule` | `<p-dialog>` |
| File upload | `FileUploadModule` | `<p-fileUpload>` |
| Select | `SelectModule` | `<p-select>` |
| Toast | `ToastModule` | `<p-toast>` |
| Progress spinner | `ProgressSpinnerModule` | `<p-progressSpinner>` |

**Overriding styles — the correct way (Rule 21 + 22):**

```html
<!-- 1. Add a styleClass hook to the PrimeNG component -->
<p-select styleClass="tenant-select" ... />
```

```scss
/* 2. In styles.scss — never in a component SCSS file */
.p-select.tenant-select .p-select-label {
  font-weight: 600;
}

/* For design-token overrides, use :root */
:root {
  --p-button-primary-background: #4f46e5;
  --p-inputtext-border-color: #d1d5db;
}
```

**Using PrimeNG with Reactive Forms:**

```html
<!-- PrimeNG inputs implement ControlValueAccessor — bind with formControlName directly -->
<p-password formControlName="password" [feedback]="false" toggleMask />
<p-select   formControlName="role"     [options]="roleOptions" optionLabel="label" />
```

**Toast notifications** (via `MessageService`):

```typescript
private messageService = inject(MessageService);

// In a method:
this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Student updated.' });
this.messageService.add({ severity: 'error',   summary: 'Error', detail: response.error });
```

## Key rules / gotchas

- **Never use `::ng-deep`** in component SCSS to override PrimeNG internals — use `styleClass` + `styles.scss` instead (Rule 21).
- **Never use `!important`** — override design tokens in `:root` instead (Rule 22).
- **Token naming pattern**: `--p-<component>-<property>` e.g. `--p-inputtext-background`, `--p-button-primary-background`.
- **Dark mode**: `darkModeSelector` is set to `'.dark-mode'` — PrimeNG dark styles only activate when `.dark-mode` is on `<html>`. Never change this to `system`.
- **PrimeNG is preferred over Angular Material** — use PrimeNG first; Material only for things PrimeNG doesn't provide.

## Where to find it in the codebase

| Location | Purpose |
|---|---|
| `frontend/src/styles.scss` | All PrimeNG token overrides and global styleClass hooks |
| `frontend/src/app/app.config.ts` | PrimeNG theme registration (`providePrimeNG`) |
| Any component `.ts` file | PrimeNG imports in the `imports: []` array |
