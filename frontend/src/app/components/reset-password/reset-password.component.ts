import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidatorFn
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../services/auth.service';

const RESEND_COOLDOWN_SECS = 60;

const passwordsMatchValidator: ValidatorFn = (group: AbstractControl) => {
  const newPassword    = group.get('newPassword')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return newPassword && confirmPassword && newPassword !== confirmPassword
    ? { passwordsMismatch: true }
    : null;
};

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    InputTextModule,
    PasswordModule,
    ButtonModule
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);
  private readonly route       = inject(ActivatedRoute);
  private readonly fb          = inject(FormBuilder);
  private readonly destroy$    = new Subject<void>();

  private resendTimer: ReturnType<typeof setInterval> | null = null;

  readonly resetForm: FormGroup = this.fb.group(
    {
      otp:             ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      newPassword:     ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    },
    { validators: passwordsMatchValidator }
  );

  email       = '';
  tenantSlug  = '';
  maskedEmail = '';

  resetting    = false;
  resending    = false;
  cooldown     = RESEND_COOLDOWN_SECS;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  get passwordsMismatch(): boolean {
    return (
      !!this.resetForm.hasError('passwordsMismatch') &&
      !!this.resetForm.get('confirmPassword')?.touched
    );
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.email      = params.get('email')      ?? '';
    this.tenantSlug = params.get('tenantSlug') ?? '';

    if (!this.email || !this.tenantSlug) {
      this.router.navigate(['/forgot-password']);
      return;
    }

    this.maskedEmail = this.maskEmail(this.email);
    this.startCooldown();
  }

  onSubmit(): void {
    if (this.resetForm.invalid) return;

    this.resetting    = true;
    this.errorMessage = null;

    const { otp, newPassword } = this.resetForm.getRawValue();

    this.authService.resetPassword({
      email:       this.email,
      tenantSlug:  this.tenantSlug,
      otp,
      newPassword
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.resetting      = true;
        this.successMessage = 'Password reset successfully! Redirecting to sign in…';
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err: Error) => {
        this.resetting    = false;
        this.errorMessage = err.message;
        this.resetForm.get('otp')?.reset();
      }
    });
  }

  onOtpInput(event: Event): void {
    const input = (event.target as HTMLInputElement).value;
    if (/^\d{6}$/.test(input)) {
      this.onSubmit();
    }
  }

  onResend(): void {
    if (this.cooldown > 0) return;

    this.resending    = true;
    this.errorMessage = null;

    this.authService.resendResetOtp({
      email:      this.email,
      tenantSlug: this.tenantSlug
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.resending = false;
        this.startCooldown();
      },
      error: (err: Error) => {
        this.resending    = false;
        this.errorMessage = err.message;
      }
    });
  }

  get resendLabel(): string {
    return this.cooldown > 0 ? `Resend in ${this.cooldown}s` : 'Resend OTP';
  }

  private startCooldown(): void {
    this.cooldown = RESEND_COOLDOWN_SECS;
    if (this.resendTimer) clearInterval(this.resendTimer);

    this.resendTimer = setInterval(() => {
      this.cooldown--;
      if (this.cooldown <= 0) {
        clearInterval(this.resendTimer!);
        this.resendTimer = null;
      }
    }, 1000);
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain || local.length <= 2) return email;
    return `${local.slice(0, 2)}${'*'.repeat(Math.min(local.length - 2, 4))}@${domain}`;
  }

  ngOnDestroy(): void {
    if (this.resendTimer) clearInterval(this.resendTimer);
    this.destroy$.next();
    this.destroy$.complete();
  }
}
