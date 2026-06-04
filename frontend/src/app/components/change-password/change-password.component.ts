import { Component, OnDestroy, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPwd     = control.get('newPassword')?.value;
  const confirmPwd = control.get('confirmPassword')?.value;
  return newPwd && confirmPwd && newPwd !== confirmPwd ? { passwordsMismatch: true } : null;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    ButtonModule, InputTextModule, PasswordModule, DialogModule, ToastModule
  ],
  providers: [MessageService],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent implements OnDestroy {
  @Output() passwordChanged = new EventEmitter<void>();

  private readonly authService    = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly fb             = inject(FormBuilder);
  private readonly destroy$       = new Subject<void>();

  readonly isSaving     = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    currentPassword:  ['', [Validators.required]],
    newPassword:      ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword:  ['', [Validators.required]]
  }, { validators: passwordsMatchValidator });

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.isSaving.set(true);
    this.errorMessage.set(null);

    this.authService.changePassword({
      currentPassword: raw.currentPassword ?? '',
      newPassword:     raw.newPassword     ?? ''
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.authService.clearFirstLogin();
          this.isSaving.set(false);
          this.passwordChanged.emit();
        },
        error: (err: Error) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.message);
        }
      });
  }

  fieldError(fieldName: string): string | null {
    const control = this.form.get(fieldName);
    if (!control || !control.touched || !control.invalid) return null;
    if (control.errors?.['required'])   return 'This field is required.';
    if (control.errors?.['minlength'])  return 'Password must be at least 8 characters.';
    return null;
  }

  get passwordsMismatch(): boolean {
    return !!this.form.errors?.['passwordsMismatch'] &&
           !!this.form.get('confirmPassword')?.touched;
  }
}
