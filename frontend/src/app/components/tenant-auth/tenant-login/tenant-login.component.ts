import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../../services/auth.service';
import { TenantContextService } from '../../../services/tenant-context.service';

@Component({
  selector: 'app-tenant-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, PasswordModule],
  templateUrl: './tenant-login.component.html',
  styleUrls: ['./tenant-login.component.scss']
})
export class TenantLoginComponent implements OnInit, OnDestroy {
  private readonly fb            = inject(FormBuilder);
  private readonly authService   = inject(AuthService);
  private readonly router        = inject(Router);
  private readonly route         = inject(ActivatedRoute);
  private readonly tenantContext = inject(TenantContextService);
  private readonly destroy$      = new Subject<void>();

  private readonly slug = this.resolveSlug();

  readonly loginForm = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  readonly isLoading = signal(false);
  readonly errorMsg  = signal<string | null>(null);

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) this.router.navigate(['/dashboard']);
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMsg.set(null);

    const { email, password } = this.loginForm.getRawValue();
    this.authService.login({ tenantSlug: this.slug, email: email!, password: password! })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  ()           => { this.isLoading.set(false); this.router.navigate(['/dashboard']); },
        error: (err: Error) => { this.isLoading.set(false); this.errorMsg.set(err.message); }
      });
  }

  get registerLink(): string { return this.tenantContext.authPath('register'); }
  get forgotLink():   string { return this.tenantContext.authPath('forgot-password'); }

  private resolveSlug(): string {
    let snapshot = this.route.snapshot;
    while (snapshot) {
      const slug = snapshot.paramMap.get('slug');
      if (slug) return slug;
      if (!snapshot.parent) break;
      snapshot = snapshot.parent;
    }
    return this.tenantContext.slug();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
