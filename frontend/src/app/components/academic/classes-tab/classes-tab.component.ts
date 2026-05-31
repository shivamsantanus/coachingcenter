import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../services/auth.service';
import { AcademicYearService } from '../../../services/academic-year.service';
import { ClassService } from '../../../services/class.service';
import {
  AcademicYearSummary,
  ClassSummary,
  CreateClassRequest,
  UpdateClassRequest
} from '../../../models/academic.models';

interface SelectOption {
  readonly label: string;
  readonly value: string;
}

interface AcademicYearOption {
  readonly label: string;
  readonly value: string;
}

@Component({
  selector: 'app-classes-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    ButtonModule, InputTextModule, SelectModule, TagModule,
    ToastModule, TooltipModule, DialogModule
  ],
  providers: [MessageService],
  templateUrl: './classes-tab.component.html',
  styleUrls: ['./classes-tab.component.scss']
})
export class ClassesTabComponent implements OnInit, OnDestroy {
  private readonly classService        = inject(ClassService);
  private readonly academicYearService = inject(AcademicYearService);
  private readonly authService         = inject(AuthService);
  private readonly messageService      = inject(MessageService);
  private readonly formBuilder         = inject(FormBuilder);
  private readonly destroy$            = new Subject<void>();
  private readonly searchInput$        = new Subject<string>();

  readonly classes              = signal<ClassSummary[]>([]);
  readonly academicYearOptions  = signal<AcademicYearOption[]>([]);
  readonly isLoading            = signal(false);
  readonly isSaving             = signal(false);
  readonly showDialog           = signal(false);
  readonly editClassId          = signal<string | null>(null);
  readonly togglingId           = signal<string | null>(null);
  readonly selectedAcademicYearId = signal('');
  readonly searchTerm           = signal('');

  readonly isOrgAdmin = this.authService.getRole() === 'ORG_ADMIN';

  readonly academicYearFilterOptions = signal<SelectOption[]>([
    { label: 'All academic years', value: '' }
  ]);

  classForm: FormGroup = this.formBuilder.group({
    academicYearId: ['', Validators.required],
    name:           ['', [Validators.required, Validators.maxLength(100)]],
    sortOrder:      [null as number | null]
  });

  ngOnInit(): void {
    this.searchInput$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => {
        this.searchTerm.set(term);
        this.loadClasses();
      });

    this.loadAcademicYears();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAcademicYears(): void {
    this.academicYearService.listAcademicYears()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          const yearOptions: AcademicYearOption[] = response.data.map(
            (year: AcademicYearSummary) => ({ label: year.name, value: year.id })
          );
          this.academicYearOptions.set(yearOptions);

          const filterOptions: SelectOption[] = [
            { label: 'All academic years', value: '' },
            ...yearOptions
          ];
          this.academicYearFilterOptions.set(filterOptions);

          this.loadClasses();
        },
        error: (err: Error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          this.loadClasses();
        }
      });
  }

  loadClasses(): void {
    this.isLoading.set(true);
    this.classService.listClasses({
      academicYearId: this.selectedAcademicYearId() || undefined,
      search:         this.searchTerm() || undefined
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.classes.set(response.data);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  onSearchChange(term: string): void {
    this.searchInput$.next(term);
  }

  onAcademicYearFilterChange(): void {
    this.loadClasses();
  }

  openAddDialog(): void {
    this.editClassId.set(null);
    this.classForm.reset({ academicYearId: '', name: '', sortOrder: null });
    this.showDialog.set(true);
  }

  openEditDialog(classItem: ClassSummary): void {
    this.editClassId.set(classItem.id);
    this.classForm.reset({
      academicYearId: classItem.academicYearId,
      name:           classItem.name,
      sortOrder:      classItem.sortOrder ?? null
    });
    this.showDialog.set(true);
  }

  closeDialog(): void {
    this.showDialog.set(false);
    this.editClassId.set(null);
    this.classForm.reset();
  }

  saveClass(): void {
    if (this.classForm.invalid) {
      this.classForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const classId = this.editClassId();

    if (classId) {
      this.updateExistingClass(classId);
    } else {
      this.createNewClass();
    }
  }

  private createNewClass(): void {
    const formValue = this.classForm.getRawValue();
    const request: CreateClassRequest = {
      academicYearId: formValue.academicYearId,
      name:           formValue.name.trim(),
      sortOrder:      formValue.sortOrder != null ? Number(formValue.sortOrder) : null
    };

    this.classService.createClass(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showDialog.set(false);
          this.messageService.add({ severity: 'success', summary: 'Class created', detail: `"${request.name}" has been added.` });
          this.loadClasses();
        },
        error: (err: Error) => {
          this.isSaving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  private updateExistingClass(classId: string): void {
    const formValue = this.classForm.getRawValue();
    const request: UpdateClassRequest = {
      name:      formValue.name.trim(),
      sortOrder: formValue.sortOrder != null ? Number(formValue.sortOrder) : null
    };

    this.classService.updateClass(classId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showDialog.set(false);
          this.messageService.add({ severity: 'success', summary: 'Class updated', detail: `"${formValue.name}" has been saved.` });
          this.loadClasses();
        },
        error: (err: Error) => {
          this.isSaving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  toggleStatus(classItem: ClassSummary): void {
    if (this.togglingId()) return;

    const newStatus: 'ACTIVE' | 'INACTIVE' = classItem.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.togglingId.set(classItem.id);

    this.classService.updateClassStatus(classItem.id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.togglingId.set(null);
          this.classes.update(list =>
            list.map(c => c.id === classItem.id ? { ...c, status: newStatus } : c)
          );
          this.messageService.add({
            severity: 'success',
            summary:  'Status updated',
            detail:   `"${classItem.name}" is now ${newStatus.toLowerCase()}.`
          });
        },
        error: (err: Error) => {
          this.togglingId.set(null);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.classForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }
}
