import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../../services/auth.service';
import { TenantContextService } from '../../../services/tenant-context.service';

@Component({
  selector: 'app-tenant-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, PasswordModule],
  templateUrl: './tenant-reset-password.component.html',
  styleUrls: ['./tenant-reset-password.component.scss']
})
export class TenantResetPasswordComponent implements OnInit, OnDestroy {
  private readonly fb            = inject(FormBuilder);
  private readonly authService   = inject(AuthService);
  private readonly router        = inject(Router);
  private readonly route         = inject(ActivatedRoute);
  private readonly tenantContext = inject(TenantContextService);
  private readonly destroy$      = new Subject<void>();

  private readonly slug = this.resolveSlug();

  readonly email       = signal('');
  readonly isLoading   = signal(false);
  readonly isResending = signal(false);
  readonly errorMsg    = signal<string | null>(null);
  readonly successMsg  = signal<string | null>(null);

  readonly resetForm = this.fb.group({
    otp:             ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    newPassword:     ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  }, { validators: this.passwordMatch });

  ngOnInit(): void {
    this.email.set(this.route.snapshot.queryParamMap.get('email') ?? '');
    if (!this.email()) this.router.navigate([this.tenantContext.authPath('forgot-password')]);
  }

  onSubmit(): void {
    if (this.resetForm.invalid || this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMsg.set(null);

    const { otp, newPassword } = this.resetForm.getRawValue();
    this.authService.resetPassword({
      tenantSlug:  this.slug,
      email:       this.email(),
      otp:         otp!,
      newPassword: newPassword!,
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate([this.tenantContext.authPath('login')]);
        },
        error: (err: Error) => { this.isLoading.set(false); this.errorMsg.set(err.message); }
      });
  }

  resendOtp(): void {
    if (this.isResending()) return;
    this.isResending.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    this.authService.resendResetOtp({ tenantSlug: this.slug, email: this.email() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isResending.set(false);
          this.successMsg.set('A new reset code has been sent.');
        },
        error: (err: Error) => { this.isResending.set(false); this.errorMsg.set(err.message); }
      });
  }

  get loginLink(): string { return this.tenantContext.authPath('login'); }

  private passwordMatch(group: AbstractControl) {
    const pw  = group.get('newPassword')?.value;
    const cpw = group.get('confirmPassword')?.value;
    return pw && cpw && pw !== cpw ? { passwordMismatch: true } : null;
  }

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
