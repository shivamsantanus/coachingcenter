import { Component, OnDestroy, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, InputTextModule, PasswordModule, ButtonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);
  private readonly fb          = inject(FormBuilder);
  private readonly destroy$    = new Subject<void>();

  readonly loginForm: FormGroup = this.fb.group({
    tenantSlug: ['', Validators.required],
    email:      ['', [Validators.required, Validators.email]],
    password:   ['', Validators.required]
  });

  loading      = false;
  errorMessage: string | null = null;

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading      = true;
    this.errorMessage = null;

    this.authService.login(this.loginForm.getRawValue()).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.loading = false;
        this.redirectAfterLogin();
      },
      error: (err: Error) => {
        this.loading      = false;
        this.errorMessage = err.message;
      }
    });
  }

  private redirectAfterLogin(): void {
    const role = this.authService.getRole();
    if (role === 'PLATFORM_ADMIN') {
      this.router.navigate(['/admin/tenants']);
      return;
    }
    const slug = this.authService.getTenantSlug();
    if (slug) {
      this.router.navigate([`/t/${slug}/dashboard`]);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
