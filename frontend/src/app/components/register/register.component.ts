import { Component, OnDestroy, inject } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { AuthService } from '../../services/auth.service';

const AVAILABLE_ROLES = [
  { label: 'Organisation Admin', value: 'ORG_ADMIN' },
  { label: 'Teacher',            value: 'TEACHER'   },
  { label: 'Student',            value: 'STUDENT'   }
];

const passwordsMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password        = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword
    ? { passwordsMismatch: true }
    : null;
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    SelectModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);
  private readonly fb          = inject(FormBuilder);
  private readonly destroy$    = new Subject<void>();

  readonly availableRoles = AVAILABLE_ROLES;

  readonly registerForm: FormGroup = this.fb.group(
    {
      fullName:        ['', [Validators.required, Validators.maxLength(100)]],
      tenantSlug:      ['', Validators.required],
      email:           ['', [Validators.required, Validators.email]],
      password:        ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      roleCode:        ['', Validators.required]
    },
    { validators: passwordsMatchValidator }
  );

  loading = false;
  errorMessage: string | null = null;

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.loading = true;
    this.errorMessage = null;

    const { confirmPassword, ...requestPayload } = this.registerForm.getRawValue();

    this.authService.register(requestPayload).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/verify-email'], {
          queryParams: {
            email:      requestPayload.email,
            tenantSlug: requestPayload.tenantSlug
          }
        });
      },
      error: (err: Error) => {
        this.loading = false;
        this.errorMessage = err.message;
      }
    });
  }

  get passwordsMismatch(): boolean {
    return (
      this.registerForm.hasError('passwordsMismatch') &&
      !!this.registerForm.get('confirmPassword')?.touched
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
