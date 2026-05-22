import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-platform-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, PasswordModule],
  templateUrl: './platform-admin-login.component.html',
  styleUrls: ['./platform-admin-login.component.scss']
})
export class PlatformAdminLoginComponent implements OnInit, OnDestroy {
  private readonly fb          = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);
  private readonly destroy$    = new Subject<void>();

  readonly loginForm = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  readonly isLoading = signal(false);
  readonly errorMsg  = signal<string | null>(null);

  ngOnInit(): void {
    if (this.authService.isLoggedIn() && this.authService.getRole() === 'PLATFORM_ADMIN') {
      this.router.navigate(['/admin/tenants']);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMsg.set(null);

    const { email, password } = this.loginForm.getRawValue();

    this.authService.platformLogin({ email: email!, password: password! })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  () => { this.isLoading.set(false); this.router.navigate(['/admin/tenants']); },
        error: (err: Error) => { this.isLoading.set(false); this.errorMsg.set(err.message); }
      });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
