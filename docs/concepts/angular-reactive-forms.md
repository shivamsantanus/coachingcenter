# Angular Reactive Forms

## What it is

Reactive Forms is Angular's approach to building forms where the form model is defined entirely in TypeScript (not in the HTML template). You create a `FormGroup` containing `FormControl`s, each with its own validators, then bind them to template inputs with directives like `formControlName`.

The alternative — Template-Driven Forms — defines the model in the HTML with `ngModel`. Reactive Forms are preferred in complex apps because they are more testable, more explicit, and fully type-safe in Angular 14+.

## Why we use it in ClassNova

ClassNova forms (login, register, student add/edit, branding editor) have multi-step validation, conditional fields, and async submission state. Reactive Forms let us:
- Define all validation rules in TypeScript where they are easy to test and reuse.
- Read the form state (`valid`, `dirty`, `touched`, `errors`) programmatically.
- Reset or patch the form from API responses without two-way binding complexity.
- Keep the component's template lean — HTML just binds to a model, it doesn't own it.

## How we use it — with examples

**Creating a form with `FormBuilder`:**

```typescript
import { inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

private fb = inject(FormBuilder);

loginForm = this.fb.group({
  email:    ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required, Validators.minLength(8)]],
});
```

**Binding to the template:**

```html
<form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
  <input pInputText formControlName="email" />
  @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
    <small class="error">Valid email required</small>
  }
  <p-password formControlName="password" [feedback]="false" />
  <p-button type="submit" label="Login" [disabled]="loginForm.invalid" />
</form>
```

**Submitting — reading values:**

```typescript
onSubmit(): void {
  if (this.loginForm.invalid) return;
  const { email, password } = this.loginForm.value;
  // email and password are typed as string | null | undefined (typed forms)
}
```

**Patching values from an API response (edit mode):**

```typescript
this.studentForm.patchValue({
  fullName:    student.fullName,
  admissionNo: student.admissionNo,
  // Only patch fields you want to set; others keep their current value
});

// Or reset the entire form to new values:
this.studentForm.reset({ fullName: student.fullName, ... });
```

**Checking validity in the template:**

```html
<!-- Disable submit when form is invalid or saving -->
<p-button [disabled]="studentForm.invalid || isSaving()" label="Save" />
```

## Key rules / gotchas

- **No Template-Driven Forms (`ngModel`)** in this project — Reactive Forms only (per CLAUDE.md).
- **Use `inject(FormBuilder)`** not constructor injection — consistent with the rest of the codebase.
- **Typed forms** — `this.loginForm.value.email` is typed as `string | null | undefined` in strict mode. Use `!` or null-coalescing when you're sure the control exists.
- **`patchValue` vs `setValue`** — `setValue` requires all fields; `patchValue` only updates the ones you provide.
- **Mark as touched before showing errors** — validators run immediately, but error messages should only appear after the user has interacted with the field (`touched: true`).
- **Reset after successful submit** — call `this.form.reset()` after a successful save to clear dirty state.

## Where to find it in the codebase

| Location | Purpose |
|---|---|
| `frontend/src/app/components/login/login.component.ts` | Login form |
| `frontend/src/app/components/tenant-auth/tenant-register/` | Register form |
| `frontend/src/app/components/students/student-form/` | Add/edit student form |
| `frontend/src/app/components/settings/branding-editor/` | Multi-tab branding form |
