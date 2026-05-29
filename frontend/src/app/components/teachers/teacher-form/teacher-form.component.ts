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
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TeacherService } from '../../../services/teacher.service';
import { TeacherDetail, CreateTeacherRequest, UpdateTeacherRequest } from '../../../models/teacher.models';
import { environment } from '../../../../environments/environment';

interface SalaryOption { label: string; value: string; }

@Component({
  selector: 'app-teacher-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    ButtonModule, InputTextModule, SelectModule, DialogModule, ToastModule
  ],
  providers: [MessageService],
  templateUrl: './teacher-form.component.html',
  styleUrls: ['./teacher-form.component.scss']
})
export class TeacherFormComponent implements OnInit, OnDestroy, OnChanges {
  @Input() teacherId: string | null = null;
  @Input() visible = false;
  @Output() saved  = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  private readonly fb             = inject(FormBuilder);
  private readonly teacherService = inject(TeacherService);
  private readonly messageService = inject(MessageService);
  private readonly platformId     = inject(PLATFORM_ID);
  private readonly destroy$       = new Subject<void>();

  readonly apiBase     = environment.apiBaseUrl.replace('/api', '');
  readonly isLoading   = signal(false);
  readonly isSaving    = signal(false);
  readonly isUploading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly currentPhoto        = signal<string | null>(null);
  readonly pendingPhotoFile    = signal<File | null>(null);
  readonly pendingPhotoPreview = signal<string | null>(null);

  private hasSaved = false;

  readonly salaryOptions: SalaryOption[] = [
    { label: 'Monthly',   value: 'MONTHLY'  },
    { label: 'Per class', value: 'PER_CLASS' },
  ];

  readonly form = this.fb.group({
    fullName:      ['', [Validators.required, Validators.maxLength(200)]],
    employeeCode:  ['', [Validators.required, Validators.maxLength(50)]],
    qualification: ['', Validators.maxLength(200)],
    salaryType:    ['' as string],
  });

  get isEditMode(): boolean { return !!this.teacherId; }
  get dialogTitle(): string { return this.isEditMode ? 'Edit Teacher' : 'Add Teacher'; }

  get submitLabel(): string {
    if (this.isSaving() || this.isUploading()) return 'Saving…';
    return this.isEditMode ? 'Save Changes' : 'Add Teacher';
  }

  get avatarPhotoUrl(): string | null {
    if (this.isEditMode) return this.resolveUrl(this.currentPhoto());
    return this.pendingPhotoPreview();
  }

  get avatarInitials(): string {
    return this.initials(this.form.get('fullName')?.value ?? '');
  }

  ngOnInit(): void {
    if (this.isEditMode && this.teacherId) {
      this.loadTeacher(this.teacherId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['teacherId'] && !changes['teacherId'].firstChange) {
      this.resetState();
      if (this.teacherId) this.loadTeacher(this.teacherId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.revokePendingPreview();
  }

  private resetState(): void {
    this.form.reset({ salaryType: '' });
    this.errorMessage.set(null);
    this.currentPhoto.set(null);
    this.revokePendingPreview();
    this.pendingPhotoFile.set(null);
    this.pendingPhotoPreview.set(null);
    this.hasSaved = false;
  }

  private revokePendingPreview(): void {
    const url = this.pendingPhotoPreview();
    if (url && isPlatformBrowser(this.platformId)) URL.revokeObjectURL(url);
  }

  private loadTeacher(teacherId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.teacherService.getTeacher(teacherId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (teacher: TeacherDetail) => {
          this.isLoading.set(false);
          this.currentPhoto.set(teacher.photoUrl);
          this.form.patchValue({
            fullName:      teacher.fullName,
            employeeCode:  teacher.employeeCode,
            qualification: teacher.qualification ?? '',
            salaryType:    teacher.salaryType ?? '',
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

    if (this.isEditMode && this.teacherId) {
      this.saveUpdate(this.teacherId, raw);
    } else {
      this.saveCreate(raw);
    }
  }

  private saveCreate(raw: typeof this.form.value): void {
    const request: CreateTeacherRequest = {
      fullName:      raw.fullName      ?? '',
      employeeCode:  raw.employeeCode  ?? '',
      qualification: raw.qualification || null,
      salaryType:    raw.salaryType    || null,
      branchId:      null,
    };

    this.teacherService.createTeacher(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.isSaving.set(false);
          this.hasSaved = true;

          const photo = this.pendingPhotoFile();
          if (photo) {
            this.uploadPhotoAfterCreate(result.id, result.fullName, photo);
          } else {
            this.messageService.add({
              severity: 'success', summary: 'Teacher added',
              detail: `${result.fullName} has been added.`
            });
            setTimeout(() => this.saved.emit(), 800);
          }
        },
        error: (err: Error) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.message);
        }
      });
  }

  private uploadPhotoAfterCreate(teacherId: string, fullName: string, photo: File): void {
    this.isUploading.set(true);

    this.teacherService.uploadPhoto(teacherId, photo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isUploading.set(false);
          this.messageService.add({
            severity: 'success', summary: 'Teacher added',
            detail: `${fullName} has been added with photo.`
          });
          setTimeout(() => this.saved.emit(), 800);
        },
        error: (err: Error) => {
          this.isUploading.set(false);
          this.messageService.add({
            severity: 'warn', summary: 'Teacher added',
            detail: `Teacher created but photo upload failed: ${err.message}`
          });
          setTimeout(() => this.saved.emit(), 1200);
        }
      });
  }

  private saveUpdate(teacherId: string, raw: typeof this.form.value): void {
    const request: UpdateTeacherRequest = {
      fullName:      raw.fullName      ?? undefined,
      employeeCode:  raw.employeeCode  ?? undefined,
      qualification: raw.qualification || null,
      salaryType:    raw.salaryType    || null,
    };

    this.teacherService.updateTeacher(teacherId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.hasSaved = true;
          this.messageService.add({
            severity: 'success', summary: 'Teacher updated',
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

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.messageService.add({
        severity: 'warn', summary: 'Invalid file type',
        detail: 'Only JPG, PNG, or WebP images are allowed.'
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.messageService.add({
        severity: 'warn', summary: 'File too large',
        detail: 'Image must be smaller than 2 MB.'
      });
      return;
    }

    if (this.isEditMode && this.teacherId) {
      this.uploadPhotoNow(this.teacherId, file);
    } else {
      this.revokePendingPreview();
      this.pendingPhotoFile.set(file);
      if (isPlatformBrowser(this.platformId)) {
        this.pendingPhotoPreview.set(URL.createObjectURL(file));
      }
    }
  }

  private uploadPhotoNow(teacherId: string, file: File): void {
    this.isUploading.set(true);

    this.teacherService.uploadPhoto(teacherId, file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.isUploading.set(false);
          this.currentPhoto.set(result.photoUrl);
          this.messageService.add({
            severity: 'success', summary: 'Photo uploaded',
            detail: 'Teacher photo has been updated.'
          });
        },
        error: (err: Error) => {
          this.isUploading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Upload failed', detail: err.message });
        }
      });
  }

  onClose(): void {
    if (this.hasSaved) {
      this.saved.emit();
    } else {
      this.closed.emit();
    }
  }

  // (visibleChange) only fires on user-triggered closes (X button, backdrop).
  // It does NOT fire when [visible] is set to false by the parent, so there
  // is no double-emit and no need for a this.visible guard.
  onDialogVisibleChange(isVisible: boolean): void {
    if (!isVisible) {
      this.closed.emit();
    }
  }

  private resolveUrl(url: string | null): string | null {
    if (!url) return null;
    return url.startsWith('http') ? url : `${this.apiBase}${url}`;
  }

  initials(name: string): string {
    return (name || '')
      .split(' ')
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  }

  fieldError(fieldName: string): string | null {
    const control = this.form.get(fieldName);
    if (!control || !control.touched || !control.invalid) return null;
    if (control.errors?.['required'])  return 'This field is required.';
    if (control.errors?.['maxlength']) return `Too long (max ${control.errors['maxlength'].requiredLength} chars).`;
    return 'Invalid value.';
  }
}
