import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, OnChanges, SimpleChanges,
  inject, signal, PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { StudentService } from '../../../services/student.service';
import {
  StudentDetail,
  CreateStudentRequest,
  UpdateStudentRequest,
  LoginCredentials
} from '../../../models/student.models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    ButtonModule, InputTextModule, TextareaModule, DialogModule, ToastModule, TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './student-form.component.html',
  styleUrls: ['./student-form.component.scss']
})
export class StudentFormComponent implements OnInit, OnDestroy, OnChanges {
  @Input() studentId: string | null = null;
  @Input() visible = false;
  @Output() saved  = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  private readonly fb             = inject(FormBuilder);
  private readonly studentService = inject(StudentService);
  private readonly messageService = inject(MessageService);
  private readonly platformId     = inject(PLATFORM_ID);
  private readonly destroy$       = new Subject<void>();

  readonly apiBase          = environment.apiBaseUrl.replace('/api', '');
  readonly isLoading        = signal(false);
  readonly isSaving         = signal(false);
  readonly isUploading      = signal(false);
  readonly errorMessage     = signal<string | null>(null);
  readonly newCredentials   = signal<LoginCredentials | null>(null);
  readonly showCredentials  = signal(false);

  readonly currentPhoto        = signal<string | null>(null);
  readonly pendingPhotoFile    = signal<File | null>(null);
  readonly pendingPhotoPreview = signal<string | null>(null);

  private hasSaved = false;

  readonly form = this.fb.group({
    fullName:     ['', [Validators.required, Validators.maxLength(200)]],
    email:        ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
    admissionNo:  ['', [Validators.required, Validators.maxLength(50)]],
    guardianName: ['', [Validators.required, Validators.maxLength(200)]],
    guardianPhone:['', [Validators.required, Validators.maxLength(20)]],
    dateOfBirth:  [''],
    schoolName:   ['', Validators.maxLength(200)],
    address:      ['', Validators.maxLength(500)],
  });

  get isEditMode(): boolean { return !!this.studentId; }
  get dialogTitle(): string { return this.isEditMode ? 'Edit Student' : 'Add Student'; }

  get submitLabel(): string {
    if (this.isSaving() || this.isUploading()) return 'Saving…';
    return this.isEditMode ? 'Save Changes' : 'Add Student';
  }

  get avatarPhotoUrl(): string | null {
    if (this.isEditMode) return this.resolveUrl(this.currentPhoto());
    return this.pendingPhotoPreview();
  }

  get avatarInitials(): string {
    return this.initials(this.form.get('fullName')?.value ?? '');
  }

  ngOnInit(): void {
    if (this.isEditMode && this.studentId) {
      this.loadStudent(this.studentId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['studentId'] && !changes['studentId'].firstChange) {
      this.resetState();
      if (this.studentId) this.loadStudent(this.studentId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.revokePendingPreview();
  }

  private resetState(): void {
    this.form.reset();
    this.errorMessage.set(null);
    this.currentPhoto.set(null);
    this.newCredentials.set(null);
    this.showCredentials.set(false);
    this.revokePendingPreview();
    this.pendingPhotoFile.set(null);
    this.pendingPhotoPreview.set(null);
    this.hasSaved = false;
  }

  private revokePendingPreview(): void {
    const url = this.pendingPhotoPreview();
    if (url && isPlatformBrowser(this.platformId)) URL.revokeObjectURL(url);
  }

  private loadStudent(studentId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.studentService.getStudent(studentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (student: StudentDetail) => {
          this.isLoading.set(false);
          this.currentPhoto.set(student.photoUrl);
          this.form.patchValue({
            fullName:     student.fullName,
            admissionNo:  student.admissionNo,
            guardianName: student.guardianName,
            guardianPhone:student.guardianPhone,
            dateOfBirth:  student.dateOfBirth ?? '',
            schoolName:   student.schoolName ?? '',
            address:      student.address,
          });
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.message);
        }
      });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.isSaving.set(true);
    this.errorMessage.set(null);

    if (this.isEditMode && this.studentId) {
      this.saveUpdate(this.studentId, raw);
    } else {
      this.saveCreate(raw);
    }
  }

  private saveCreate(raw: typeof this.form.value): void {
    const request: CreateStudentRequest = {
      fullName:      raw.fullName      ?? '',
      email:         raw.email         ?? '',
      admissionNo:   raw.admissionNo   ?? '',
      guardianName:  raw.guardianName  ?? '',
      guardianPhone: raw.guardianPhone ?? '',
      address:       raw.address       ?? '',
      dateOfBirth:   raw.dateOfBirth   || null,
      schoolName:    raw.schoolName?.trim() || null,
      branchId:      null,
    };

    this.studentService.createStudent(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.isSaving.set(false);
          this.hasSaved = true;

          this.newCredentials.set({
            fullName:        result.fullName,
            loginEmail:      result.loginEmail,
            oneTimePassword: result.oneTimePassword
          });
          this.showCredentials.set(true);

          const photo = this.pendingPhotoFile();
          if (photo) this.uploadPhotoAfterCreate(result.id, photo);
        },
        error: (err: Error) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.message);
        }
      });
  }

  private uploadPhotoAfterCreate(studentId: string, photo: File): void {
    this.isUploading.set(true);

    this.studentService.uploadPhoto(studentId, photo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.isUploading.set(false); },
        error: (err: Error) => {
          this.isUploading.set(false);
          this.messageService.add({
            severity: 'warn', summary: 'Photo upload failed', detail: err.message
          });
        }
      });
  }

  private saveUpdate(studentId: string, raw: typeof this.form.value): void {
    const request: UpdateStudentRequest = {
      fullName:      raw.fullName      ?? undefined,
      admissionNo:   raw.admissionNo   ?? undefined,
      guardianName:  raw.guardianName  ?? undefined,
      guardianPhone: raw.guardianPhone ?? undefined,
      address:       raw.address       ?? '',
      dateOfBirth:   raw.dateOfBirth   || null,
      schoolName:    raw.schoolName?.trim() ?? '',
    };

    this.studentService.updateStudent(studentId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.hasSaved = true;
          this.messageService.add({
            severity: 'success', summary: 'Student updated',
            detail: 'Changes have been saved.'
          });
          setTimeout(() => this.saved.emit(), 800);
        },
        error: (err: Error) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.message);
        }
      });
  }

  onCredentialsDismissed(): void {
    this.showCredentials.set(false);
    this.saved.emit();
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.messageService.add({
        severity: 'success', summary: 'Copied', detail: 'Copied to clipboard.', life: 1500
      });
    });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.messageService.add({ severity: 'warn', summary: 'Invalid file type', detail: 'Only JPG, PNG, or WebP.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.messageService.add({ severity: 'warn', summary: 'File too large', detail: 'Image must be smaller than 2 MB.' });
      return;
    }

    if (this.isEditMode && this.studentId) {
      this.uploadPhotoNow(this.studentId, file);
    } else {
      this.revokePendingPreview();
      this.pendingPhotoFile.set(file);
      if (isPlatformBrowser(this.platformId)) {
        this.pendingPhotoPreview.set(URL.createObjectURL(file));
      }
    }
  }

  private uploadPhotoNow(studentId: string, file: File): void {
    this.isUploading.set(true);
    this.studentService.uploadPhoto(studentId, file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.isUploading.set(false);
          this.currentPhoto.set(result.photoUrl);
          this.messageService.add({ severity: 'success', summary: 'Photo uploaded', detail: 'Student photo updated.' });
        },
        error: (err: Error) => {
          this.isUploading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Upload failed', detail: err.message });
        }
      });
  }

  onClose(): void {
    if (this.hasSaved) this.saved.emit();
    else this.closed.emit();
  }

  onDialogVisibleChange(isVisible: boolean): void {
    if (!isVisible) this.closed.emit();
  }

  private resolveUrl(url: string | null): string | null {
    if (!url) return null;
    return url.startsWith('http') ? url : `${this.apiBase}${url}`;
  }

  initials(name: string): string {
    return (name || '').split(' ').slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('');
  }

  fieldError(fieldName: string): string | null {
    const control = this.form.get(fieldName);
    if (!control || !control.touched || !control.invalid) return null;
    if (control.errors?.['required'])  return 'This field is required.';
    if (control.errors?.['email'])     return 'Enter a valid email address.';
    if (control.errors?.['maxlength']) return `Too long (max ${control.errors['maxlength'].requiredLength} chars).`;
    return 'Invalid value.';
  }
}
