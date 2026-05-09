import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../services/auth.service';

const RESEND_COOLDOWN_SECS = 60;

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, InputTextModule, ButtonModule],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss']
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);
  private readonly route       = inject(ActivatedRoute);
  private readonly fb          = inject(FormBuilder);
  private readonly destroy$    = new Subject<void>();

  private resendTimer: ReturnType<typeof setInterval> | null = null;

  readonly otpForm: FormGroup = this.fb.group({
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  email      = '';
  tenantSlug = '';
  maskedEmail = '';

  verifying   = false;
  resending   = false;
  cooldown    = RESEND_COOLDOWN_SECS;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.email      = params.get('email')      ?? '';
    this.tenantSlug = params.get('tenantSlug') ?? '';

    if (!this.email || !this.tenantSlug) {
      this.router.navigate(['/register']);
      return;
    }

    this.maskedEmail = this.maskEmail(this.email);
    this.startCooldown();
  }

  onSubmit(): void {
    if (this.otpForm.invalid) return;

    this.verifying    = true;
    this.errorMessage = null;

    this.authService.verifyEmail({
      email:      this.email,
      tenantSlug: this.tenantSlug,
      otp:        this.otpForm.getRawValue().otp
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.verifying      = true;
        this.successMessage = 'Email verified! Redirecting to sign in…';
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err: Error) => {
        this.verifying    = false;
        this.errorMessage = err.message;
        this.otpForm.reset();
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

    this.authService.resendOtp({
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
