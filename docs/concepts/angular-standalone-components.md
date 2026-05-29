# Angular Standalone Components

## What it is

Before Angular 14, every component had to be declared inside an `NgModule`. The module system was Angular's way of grouping components, services, and pipes, and controlling what each component could see (via `imports: []` on the module).

**Standalone components** eliminate NgModules entirely. Each component declares its own dependencies directly in its `@Component` decorator's `imports: []` array. This makes components self-contained, portable, and easier to understand — you can read one component file and know exactly what it depends on.

## Why we use it in ClassNova

ClassNova was started after Angular 17 when standalone is the recommended default. Using NgModules would be going against the framework's direction. Standalone components are:
- Simpler — no module file to maintain alongside every component.
- Lazily loadable by default — the router can load individual components without module wrappers.
- Easier to tree-shake — unused components are not bundled.

**Rule:** Every Angular component in this project must be standalone (`standalone: true`). NgModules are forbidden (CLAUDE.md strict rule #4).

## How we use it — with examples

**A standalone component:**

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-students',
  standalone: true,                           // ← required
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    TableModule,
  ],
  templateUrl: './students.component.html',
  styleUrl: './students.component.scss',
})
export class StudentsComponent { ... }
```

**What goes in `imports: []`?**
- Other standalone components you use in the template (e.g. `ShellComponent`)
- Angular directives/pipes (`CommonModule`, `RouterModule`, `ReactiveFormsModule`)
- PrimeNG/Material component modules (`ButtonModule`, `TableModule`)
- You do NOT list services here — services are provided via `inject()` or `providers: []`

**Routing to a standalone component** (`app.routes.ts`):

```typescript
{
  path: 'students',
  loadComponent: () =>
    import('./components/students/students.component')
      .then(m => m.StudentsComponent),
  canActivate: [authGuard]
}
```

`loadComponent` lazy-loads the component without any module wrapper — the router handles it directly.

**Bootstrapping the app** (`main.ts`):

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig);
// No NgModule at the root level either
```

## Key rules / gotchas

- **`standalone: true` on every component** — no exceptions (Rule #4).
- **Import what you use** — if a directive or PrimeNG component appears in your template, it must be in `imports: []`.
- **`CommonModule` vs individual imports** — `CommonModule` gives you `*ngIf`, `*ngFor`, etc. Alternatively import them individually (`NgIf`, `NgFor`) for slightly smaller bundles.
- **Services go in `providers` or are `providedIn: 'root'`** — never in `imports: []`.
- **The `AppComponent` itself is standalone** — the app boots directly from `bootstrapApplication`.

## Where to find it in the codebase

Every `.component.ts` file in `frontend/src/app/components/` uses `standalone: true`. See any component for a canonical example.
