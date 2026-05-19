import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, InputTextModule, ButtonModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);
  private readonly fb          = inject(FormBuilder);
  private readonly destroy$    = new Subject<void>();

  readonly requestForm: FormGroup = this.fb.group({
    tenantSlug: ['', Validators.required],
    email:      ['', [Validators.required, Validators.email]]
  });

  loading      = false;
  submitted    = false;
  errorMessage: string | null = null;

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    if (this.requestForm.invalid) return;

    this.loading      = true;
    this.errorMessage = null;

    this.authService.forgotPassword(this.requestForm.getRawValue())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading   = false;
          this.submitted = true;

          const { email, tenantSlug } = this.requestForm.getRawValue();
          setTimeout(() => {
            this.router.navigate(['/reset-password'], {
              queryParams: { email, tenantSlug }
            });
          }, 2000);
        },
        error: (err: Error) => {
          this.loading      = false;
          this.errorMessage = err.message;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
