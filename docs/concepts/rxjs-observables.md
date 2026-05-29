# RxJS Observables

## What it is

RxJS (Reactive Extensions for JavaScript) is a library for composing asynchronous and event-based programs using **Observables** — streams of values over time. An Observable emits zero or more values and then either completes or errors. You react to those emissions by subscribing.

Key concepts:
- `Observable<T>` — the stream (cold by default — nothing runs until subscribed).
- `subscribe({ next, error, complete })` — starts the stream and handles each event.
- **Operators** — pure functions like `map`, `filter`, `switchMap`, `catchError`, `takeUntil` that transform the stream without subscribing.
- `Subject` / `BehaviorSubject` — hot Observables you can push values into manually.

## Why we use it in ClassNova

Angular's `HttpClient` returns Observables, so every API call in the app is an Observable. RxJS gives us powerful tools to transform, cancel, combine, and clean up those async operations — far beyond what a plain Promise offers.

## How we use it — with examples

**Basic HTTP call in a service:**

```typescript
getStudents(tenantId: string): Observable<ApiResponse<StudentDto[]>> {
  return this.http.get<ApiResponse<StudentDto[]>>(
    `${environment.apiBaseUrl}/students`,
    { headers: this.authHeaders() }
  ).pipe(
    catchError(error => {
      console.error('Failed to load students', error);
      return throwError(() => error);
    })
  );
}
```

**Subscribing in a component with cleanup:**

```typescript
private destroy$ = new Subject<void>();

ngOnInit(): void {
  this.isLoading.set(true);
  this.studentService.getStudents()
    .pipe(takeUntil(this.destroy$))   // auto-unsubscribes on component destroy
    .subscribe({
      next: response => {
        if (response.success) this.students.set(response.data);
        else this.errorMessage.set(response.error);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load students.');
        this.isLoading.set(false);
      }
    });
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
```

**Common operators used in this project:**

| Operator | What it does |
|---|---|
| `pipe(...)` | Chains operators on an Observable |
| `catchError(fn)` | Handles errors in the stream; must return a new Observable |
| `takeUntil(destroy$)` | Cancels subscription when `destroy$` emits |
| `switchMap(fn)` | Maps to a new Observable, cancels previous if a new value arrives (great for search) |
| `map(fn)` | Transforms each emitted value |
| `tap(fn)` | Side-effect without changing the stream (useful for logging) |

**`BehaviorSubject` for shared state in a service:**

```typescript
private _currentUser = new BehaviorSubject<AuthContext | null>(null);
currentUser$ = this._currentUser.asObservable();   // expose as read-only

setUser(user: AuthContext): void {
  this._currentUser.next(user);
}
```

## Key rules / gotchas

- **Always unsubscribe** — every `.subscribe()` in a component must use `takeUntil(this.destroy$)` or prefer `AsyncPipe` in the template (Rule 7).
- **Never subscribe inside a subscribe** — use `switchMap`, `mergeMap`, or `concatMap` instead.
- **`catchError` must return an Observable** — return `of(fallbackValue)` or `throwError(() => err)`.
- **`HttpClient` Observables auto-complete** after one emission — you don't need to unsubscribe from a single HTTP call, but `takeUntil` doesn't hurt.
- **`switchMap` cancels in-flight requests** — ideal for search-as-you-type; not suitable when you need all results (use `mergeMap` then).

## Where to find it in the codebase

| Location | Purpose |
|---|---|
| `frontend/src/app/services/*.service.ts` | All services return Observables via `HttpClient` |
| `frontend/src/app/components/students/` | `takeUntil` + `destroy$` pattern |
| `frontend/src/app/services/auth.service.ts` | `BehaviorSubject` for shared auth state |
