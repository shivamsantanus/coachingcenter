import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../services/auth.service';
import { AcademicYearService } from '../../../services/academic-year.service';
import { AcademicYearSummary, CreateAcademicYearRequest, UpdateAcademicYearRequest } from '../../../models/academic.models';

function endDateAfterStartDate(group: AbstractControl): ValidationErrors | null {
  const startDate = group.get('startDate')?.value as string | null;
  const endDate   = group.get('endDate')?.value   as string | null;
  if (startDate && endDate && endDate <= startDate)
    return { endDateBeforeStartDate: true };
  return null;
}

@Component({
  selector: 'app-academic-years-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    ToastModule,
    TooltipModule,
    DialogModule,
  ],
  providers: [MessageService],
  templateUrl: './academic-years-tab.component.html',
  styleUrls: ['./academic-years-tab.component.scss'],
})
export class AcademicYearsTabComponent implements OnInit, OnDestroy {
  private readonly academicYearService = inject(AcademicYearService);
  private readonly authService         = inject(AuthService);
  private readonly messageService      = inject(MessageService);
  private readonly formBuilder         = inject(FormBuilder);
  private readonly destroy$            = new Subject<void>();

  readonly years        = signal<AcademicYearSummary[]>([]);
  readonly isLoading    = signal(false);
  readonly showDialog   = signal(false);
  readonly editYearId   = signal<string | null>(null);
  readonly activatingId = signal<string | null>(null);
  readonly isSaving     = signal(false);

  readonly isOrgAdmin = this.authService.getRole() === 'ORG_ADMIN';

  yearForm: FormGroup = this.formBuilder.group(
    {
      name:      ['', [Validators.required, Validators.maxLength(100)]],
      startDate: ['', Validators.required],
      endDate:   ['', Validators.required],
    },
    { validators: endDateAfterStartDate }
  );

  ngOnInit(): void {
    this.loadYears();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadYears(): void {
    this.isLoading.set(true);
    this.academicYearService
      .listAcademicYears()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.years.set(response.data);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        },
      });
  }

  openAddDialog(): void {
    this.editYearId.set(null);
    this.yearForm.reset();
    this.showDialog.set(true);
  }

  openEditDialog(year: AcademicYearSummary): void {
    this.editYearId.set(year.id);
    this.yearForm.setValue({
      name:      year.name,
      startDate: year.startDate.substring(0, 10),
      endDate:   year.endDate.substring(0, 10),
    });
    this.showDialog.set(true);
  }

  closeDialog(): void {
    this.showDialog.set(false);
    this.yearForm.reset();
  }

  saveYear(): void {
    if (this.yearForm.invalid) {
      this.yearForm.markAllAsTouched();
      return;
    }

    const editId = this.editYearId();
    if (editId) {
      this.updateYear(editId);
    } else {
      this.createYear();
    }
  }

  private createYear(): void {
    this.isSaving.set(true);
    const request: CreateAcademicYearRequest = {
      name:      this.yearForm.value.name.trim(),
      startDate: this.yearForm.value.startDate,
      endDate:   this.yearForm.value.endDate,
    };

    this.academicYearService
      .createAcademicYear(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeDialog();
          this.loadYears();
          this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Academic year created successfully.' });
        },
        error: (err: Error) => {
          this.isSaving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        },
      });
  }

  private updateYear(yearId: string): void {
    this.isSaving.set(true);
    const request: UpdateAcademicYearRequest = {
      name:      this.yearForm.value.name.trim(),
      startDate: this.yearForm.value.startDate,
      endDate:   this.yearForm.value.endDate,
    };

    this.academicYearService
      .updateAcademicYear(yearId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeDialog();
          this.loadYears();
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Academic year updated successfully.' });
        },
        error: (err: Error) => {
          this.isSaving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        },
      });
  }

  activateYear(year: AcademicYearSummary): void {
    if (this.activatingId()) return;
    this.activatingId.set(year.id);

    this.academicYearService
      .activateAcademicYear(year.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.activatingId.set(null);
          this.loadYears();
          this.messageService.add({ severity: 'success', summary: 'Activated', detail: `"${year.name}" is now the active academic year.` });
        },
        error: (err: Error) => {
          this.activatingId.set(null);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        },
      });
  }
}
