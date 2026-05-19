import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-tenant-verify-email',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule],
  templateUrl: './tenant-verify-email.component.html',
  styleUrls: ['./tenant-verify-email.component.scss']
})
export class TenantVerifyEmailComponent implements OnInit, OnDestroy {
  private readonly fb          = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);
  private readonly route       = inject(ActivatedRoute);
  private readonly destroy$    = new Subject<void>();

  private readonly slug = this.resolveSlug();

  readonly email     = signal('');
  readonly isLoading = signal(false);
  readonly isResending = signal(false);
  readonly errorMsg  = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);

  readonly otpForm = this.fb.group({
    otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  ngOnInit(): void {
    this.email.set(this.route.snapshot.queryParamMap.get('email') ?? '');
    if (!this.email()) this.router.navigate([`/t/${this.slug}/register`]);
  }

  onSubmit(): void {
    if (this.otpForm.invalid || this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMsg.set(null);

    this.authService.verifyEmail({
      tenantSlug: this.slug,
      email:      this.email(),
      otp:        this.otpForm.getRawValue().otp!,
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate([`/t/${this.slug}/login`]);
        },
        error: (err: Error) => { this.isLoading.set(false); this.errorMsg.set(err.message); }
      });
  }

  resendOtp(): void {
    if (this.isResending()) return;
    this.isResending.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    this.authService.resendOtp({ tenantSlug: this.slug, email: this.email() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isResending.set(false);
          this.successMsg.set('A new code has been sent to your email.');
        },
        error: (err: Error) => { this.isResending.set(false); this.errorMsg.set(err.message); }
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
