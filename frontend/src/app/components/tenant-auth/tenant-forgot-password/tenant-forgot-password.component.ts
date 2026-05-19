import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-tenant-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule],
  templateUrl: './tenant-forgot-password.component.html',
  styleUrls: ['./tenant-forgot-password.component.scss']
})
export class TenantForgotPasswordComponent implements OnDestroy {
  private readonly fb          = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);
  private readonly route       = inject(ActivatedRoute);
  private readonly destroy$    = new Subject<void>();

  private readonly slug = this.resolveSlug();

  readonly forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly isLoading  = signal(false);
  readonly errorMsg   = signal<string | null>(null);

  onSubmit(): void {
    if (this.forgotForm.invalid || this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMsg.set(null);

    const email = this.forgotForm.getRawValue().email!;
    this.authService.forgotPassword({ tenantSlug: this.slug, email })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate([`/t/${this.slug}/reset-password`], { queryParams: { email } });
        },
        error: (err: Error) => { this.isLoading.set(false); this.errorMsg.set(err.message); }
      });
  }

  get loginLink(): string { return `/t/${this.slug}/login`; }

  private resolveSlug(): string {
    let snapshot = this.route.snapshot;
    while (snapshot) {
      const slug = snapshot.paramMap.get('slug');
      if (slug) return slug;
      if (!snapshot.parent) break;
      snapshot = snapshot.parent;
    }
    return '';
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
