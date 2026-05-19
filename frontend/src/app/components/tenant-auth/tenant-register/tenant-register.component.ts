import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-tenant-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, PasswordModule],
  templateUrl: './tenant-register.component.html',
  styleUrls: ['./tenant-register.component.scss']
})
export class TenantRegisterComponent implements OnInit, OnDestroy {
  private readonly fb          = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);
  private readonly route       = inject(ActivatedRoute);
  private readonly destroy$    = new Subject<void>();

  private readonly slug = this.resolveSlug();

  readonly registerForm = this.fb.group({
    fullName:        ['', [Validators.required, Validators.maxLength(100)]],
    email:           ['', [Validators.required, Validators.email]],
    password:        ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  }, { validators: this.passwordMatch });

  readonly isLoading = signal(false);
  readonly errorMsg  = signal<string | null>(null);

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) this.router.navigate(['/dashboard']);
  }

  onSubmit(): void {
    if (this.registerForm.invalid || this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMsg.set(null);

    const { fullName, email, password } = this.registerForm.getRawValue();
    this.authService.register({
      tenantSlug: this.slug,
      fullName:   fullName!,
      email:      email!,
      password:   password!,
      roleCode:   'STUDENT',
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate([`/t/${this.slug}/verify-email`], { queryParams: { email: email! } });
        },
        error: (err: Error) => { this.isLoading.set(false); this.errorMsg.set(err.message); }
      });
  }

  get loginLink(): string { return `/t/${this.slug}/login`; }

  private passwordMatch(group: AbstractControl) {
    const pw  = group.get('password')?.value;
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
    return '';
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
