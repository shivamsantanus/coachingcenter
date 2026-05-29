# Angular Signals

## What it is

Signals are Angular's reactive primitive for managing state. A signal is a value wrapper that notifies Angular when it changes, so only the parts of the template that read that signal re-render — instead of Angular checking the entire component tree (zone.js change detection).

Three core functions:
- `signal(initialValue)` — creates a writable signal.
- `computed(() => ...)` — derives a read-only signal from other signals; auto-recalculates when dependencies change.
- `effect(() => ...)` — runs a side-effect whenever its signal dependencies change.

## Why we use it in ClassNova

Signals are Angular 17+'s recommended state primitive. They replace `BehaviorSubject` + `async pipe` for component-local state, are more readable than RxJS for simple UI state, and give better performance because Angular knows exactly which parts of the template to update.

We use them for: loading states, error messages, list data, form visibility toggles, and computed values in components.

## How we use it — with examples

**Basic signal in a component:**

```typescript
import { signal, computed } from '@angular/core';

// Writable signals
students     = signal<StudentDto[]>([]);
isLoading    = signal(false);
errorMessage = signal<string | null>(null);
searchQuery  = signal('');

// Computed signal — auto-updates when students or searchQuery changes
filteredStudents = computed(() =>
  this.students().filter(s =>
    s.fullName.toLowerCase().includes(this.searchQuery().toLowerCase())
  )
);
```

**Reading a signal** — call it like a function:

```typescript
if (this.isLoading()) return;   // reading
const list = this.students();   // reading
```

**Writing to a signal:**

```typescript
this.isLoading.set(true);
this.students.set(responseData);
this.errorMessage.set(null);

// Update based on current value
this.students.update(current => [...current, newStudent]);
```

**In the template — signals are called with `()`:**

```html
@if (isLoading()) {
  <p-progressSpinner />
}
@for (student of filteredStudents(); track student.id) {
  <div>{{ student.fullName }}</div>
}
```

## Key rules / gotchas

- **Signals are for local component state only** — shared state across components lives in a service, using `signal()` at the service level or RxJS `BehaviorSubject`.
- **Always call a signal to read it** — `this.isLoading` is the signal object; `this.isLoading()` is the value. Forgetting the `()` in a template is a common bug.
- **`computed()` is lazy and memoised** — it only recalculates when one of its dependencies changes and something reads it.
- **Do not mutate objects inside a signal** — always create a new object/array with `set()` or `update()`. Direct mutation won't trigger re-renders.
- **`effect()` should be used sparingly** — prefer `computed()` for derived state. `effect()` is for side-effects (logging, syncing to localStorage).

## Where to find it in the codebase

| Location | Purpose |
|---|---|
| `frontend/src/app/components/students/` | Heavy signal usage — list, loading, error, search |
| `frontend/src/app/services/auth.service.ts` | `currentUser` signal for shared auth state |
| Any component `.ts` file | Local state patterns |
