import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule, ReactiveFormsModule, FormBuilder, FormGroup,
  Validators, AbstractControl, ValidationErrors, ValidatorFn
} from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { BatchService } from '../../../services/batch.service';
import { AcademicYearService } from '../../../services/academic-year.service';
import { ClassService } from '../../../services/class.service';
import { BranchService } from '../../../services/branch.service';
import { AuthService } from '../../../services/auth.service';
import {
  AcademicYearSummary,
  BatchSummary,
  CreateBatchRequest,
  UpdateBatchRequest
} from '../../../models/academic.models';

interface SelectOption { label: string; value: string; }

function batchDateRangeValidator(getAy: () => AcademicYearSummary | null): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const startDate = group.get('startDate')?.value as string | null;
    const endDate   = group.get('endDate')?.value   as string | null;

    if (startDate && endDate && endDate <= startDate)
      return { endDateBeforeStartDate: true };

    const ay = getAy();
    if (ay) {
      const ayStart = ay.startDate.substring(0, 10);
      const ayEnd   = ay.endDate.substring(0, 10);

      if (startDate && startDate < ayStart)
        return { batchStartBeforeAyStart: { ayStart } };

      if (endDate && endDate > ayEnd)
        return { batchEndAfterAyEnd: { ayEnd } };
    }

    return null;
  };
}

function batchTimeRangeValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const startTime = group.get('startTime')?.value as string | null;
    const endTime   = group.get('endTime')?.value   as string | null;

    if (startTime && endTime && endTime <= startTime)
      return { endTimeBeforeStartTime: true };

    return null;
  };
}

@Component({
  selector: 'app-batches-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    ButtonModule, InputTextModule, SelectModule, TagModule, ToastModule, TooltipModule, DialogModule
  ],
  providers: [MessageService],
  templateUrl: './batches-tab.component.html',
  styleUrls: ['./batches-tab.component.scss']
})
export class BatchesTabComponent implements OnInit, OnDestroy {
  private readonly batchService        = inject(BatchService);
  private readonly academicYearService = inject(AcademicYearService);
  private readonly classService        = inject(ClassService);
  private readonly branchService       = inject(BranchService);
  private readonly authService         = inject(AuthService);
  private readonly messageService      = inject(MessageService);
  private readonly formBuilder         = inject(FormBuilder);
  private readonly destroy$            = new Subject<void>();
  private readonly searchInput$        = new Subject<string>();

  readonly batches          = signal<BatchSummary[]>([]);
  readonly isLoading        = signal(false);
  readonly showDialog       = signal(false);
  readonly editBatchId      = signal<string | null>(null);
  readonly togglingId       = signal<string | null>(null);
  readonly isSaving         = signal(false);

  readonly academicYearOptions = signal<SelectOption[]>([]);
  readonly classOptions        = signal<SelectOption[]>([]);
  readonly dialogClassOptions  = signal<SelectOption[]>([]);
  readonly branchOptions       = signal<SelectOption[]>([]);

  readonly filterAcademicYearId = signal('');
  readonly filterClassId        = signal('');
  readonly searchTerm           = signal('');

  readonly isOrgAdmin = this.authService.getRole() === 'ORG_ADMIN';

  // Full AY list kept for cross-field date validation
  private allAcademicYears: AcademicYearSummary[] = [];
  private selectedDialogAy: AcademicYearSummary | null = null;

  readonly allAcademicYearOptions = computed<SelectOption[]>(() => [
    { label: 'All academic years', value: '' },
    ...this.academicYearOptions(),
  ]);

  readonly allClassFilterOptions = computed<SelectOption[]>(() => [
    { label: 'All classes', value: '' },
    ...this.classOptions(),
  ]);

  batchForm!: FormGroup;

  ngOnInit(): void {
    this.batchForm = this.formBuilder.group(
      {
        academicYearId: ['', Validators.required],
        classId:        [null],
        branchId:       [null],
        name:           ['', [Validators.required, Validators.maxLength(100)]],
        startDate:      [null],
        endDate:        [null],
        startTime:      [null],
        endTime:        [null]
      },
      {
        validators: [
          batchDateRangeValidator(() => this.selectedDialogAy),
          batchTimeRangeValidator()
        ]
      }
    );

    this.searchInput$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => {
        this.searchTerm.set(term);
        this.loadBatches();
      });

    this.loadAcademicYears();
    this.loadBranches();
    this.loadClasses();
    this.loadBatches();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadBranches(): void {
    this.branchService.listBranches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.branchOptions.set(response.data.map(b => ({ label: b.name, value: b.id })));
        },
        error: (err: Error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  private loadAcademicYears(): void {
    this.academicYearService.listAcademicYears()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.allAcademicYears = response.data;
          const options = response.data.map(ay => ({ label: ay.name, value: ay.id }));
          this.academicYearOptions.set(options);
        },
        error: (err: Error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  private loadClasses(): void {
    this.classService.listClasses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          const options = response.data.map(cls => ({ label: cls.name, value: cls.id }));
          this.classOptions.set(options);
          this.dialogClassOptions.set(options);
        },
        error: (err: Error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  loadBatches(): void {
    this.isLoading.set(true);
    this.batchService.listBatches({
      academicYearId: this.filterAcademicYearId() || undefined,
      classId:        this.filterClassId() || undefined,
      search:         this.searchTerm() || undefined
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.batches.set(response.data);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  onSearchChange(term: string): void { this.searchInput$.next(term); }

  onFilterAcademicYearChange(academicYearId: string): void {
    this.filterAcademicYearId.set(academicYearId);
    this.loadBatches();
  }

  onFilterClassChange(classId: string): void {
    this.filterClassId.set(classId);
    this.loadBatches();
  }

  onDialogAcademicYearChange(academicYearId: string): void {
    this.selectedDialogAy = this.allAcademicYears.find(ay => ay.id === academicYearId) ?? null;
    this.batchForm.updateValueAndValidity();
  }

  openAddDialog(): void {
    this.editBatchId.set(null);
    this.selectedDialogAy = null;
    this.batchForm.reset({ academicYearId: '', classId: null, branchId: null, name: '', startDate: null, endDate: null, startTime: null, endTime: null });
    this.showDialog.set(true);
  }

  openEditDialog(batch: BatchSummary): void {
    this.editBatchId.set(batch.id);
    this.selectedDialogAy = this.allAcademicYears.find(ay => ay.id === batch.academicYearId) ?? null;
    this.batchForm.patchValue({
      academicYearId: batch.academicYearId,
      classId:        batch.classId  ?? null,
      branchId:       batch.branchId ?? null,
      name:           batch.name,
      startDate:      batch.startDate ? batch.startDate.substring(0, 10) : null,
      endDate:        batch.endDate   ? batch.endDate.substring(0, 10)   : null,
      startTime:      batch.startTime ? batch.startTime.substring(0, 5)  : null,
      endTime:        batch.endTime   ? batch.endTime.substring(0, 5)    : null
    });
    this.showDialog.set(true);
  }

  closeDialog(): void {
    this.showDialog.set(false);
    this.editBatchId.set(null);
    this.selectedDialogAy = null;
    this.batchForm.reset();
  }

  saveBatch(): void {
    if (this.batchForm.invalid) {
      this.batchForm.markAllAsTouched();
      return;
    }

    const formValue = this.batchForm.value as {
      academicYearId: string;
      classId:   string | null;
      branchId:  string | null;
      name:      string;
      startDate: string | null;
      endDate:   string | null;
      startTime: string | null;
      endTime:   string | null;
    };

    this.isSaving.set(true);
    const batchId = this.editBatchId();

    if (batchId) {
      const updateRequest: UpdateBatchRequest = {
        name:      formValue.name,
        classId:   formValue.classId  || null,
        branchId:  formValue.branchId || null,
        startDate: formValue.startDate || null,
        endDate:   formValue.endDate   || null,
        startTime: formValue.startTime || null,
        endTime:   formValue.endTime   || null
      };
      this.batchService.updateBatch(batchId, updateRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.messageService.add({ severity: 'success', summary: 'Batch updated', detail: `${formValue.name} has been updated.` });
            this.closeDialog();
            this.loadBatches();
          },
          error: (err: Error) => {
            this.isSaving.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          }
        });
    } else {
      const createRequest: CreateBatchRequest = {
        academicYearId: formValue.academicYearId,
        classId:        formValue.classId  || null,
        branchId:       formValue.branchId || null,
        name:           formValue.name,
        startDate:      formValue.startDate || null,
        endDate:        formValue.endDate   || null,
        startTime:      formValue.startTime || null,
        endTime:        formValue.endTime   || null
      };
      this.batchService.createBatch(createRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: created => {
            this.isSaving.set(false);
            this.messageService.add({ severity: 'success', summary: 'Batch created', detail: `${created.data.name} has been added.` });
            this.closeDialog();
            this.loadBatches();
          },
          error: (err: Error) => {
            this.isSaving.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          }
        });
    }
  }

  toggleStatus(batch: BatchSummary): void {
    if (this.togglingId()) return;

    const newStatus = batch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.togglingId.set(batch.id);

    this.batchService.updateBatchStatus(batch.id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.togglingId.set(null);
          this.batches.update(list =>
            list.map(b => b.id === batch.id ? { ...b, status: newStatus } : b)
          );
          this.messageService.add({
            severity: 'success',
            summary: 'Status updated',
            detail: `${batch.name} is now ${newStatus.toLowerCase()}.`
          });
        },
        error: (err: Error) => {
          this.togglingId.set(null);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.batchForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  get formErrors(): ValidationErrors | null {
    return this.batchForm.errors;
  }

  get dialogTitle(): string {
    return this.editBatchId() ? 'Edit Batch' : 'Add Batch';
  }

  get hasActiveFilters(): boolean {
    return !!(this.filterAcademicYearId() || this.filterClassId() || this.searchTerm());
  }

  get selectedAyDateRange(): { start: string; end: string } | null {
    if (!this.selectedDialogAy) return null;
    return {
      start: this.selectedDialogAy.startDate.substring(0, 10),
      end:   this.selectedDialogAy.endDate.substring(0, 10)
    };
  }
}
