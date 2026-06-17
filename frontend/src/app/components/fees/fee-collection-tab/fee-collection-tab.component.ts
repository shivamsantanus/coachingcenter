import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { FeeService } from '../../../services/fee.service';
import { AcademicYearService } from '../../../services/academic-year.service';
import { ClassService } from '../../../services/class.service';
import { BatchService } from '../../../services/batch.service';
import { AcademicYearSummary, ClassSummary, BatchSummary } from '../../../models/academic.models';
import {
  BatchCollectionData,
  BatchCollectionStudentRow,
  CreatePaymentRequest,
  PaymentMethod,
} from '../../../models/fee.models';

interface SelectOption { label: string; value: string; }

@Component({
  selector: 'app-fee-collection-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    SelectModule,
    InputNumberModule,
    DatePickerModule,
    InputTextModule,
    TagModule,
    ToastModule,
    TooltipModule,
    DialogModule,
  ],
  providers: [MessageService],
  templateUrl: './fee-collection-tab.component.html',
  styleUrls: ['./fee-collection-tab.component.scss'],
})
export class FeeCollectionTabComponent implements OnInit, OnDestroy {
  private feeService         = inject(FeeService);
  private academicYearService = inject(AcademicYearService);
  private classService       = inject(ClassService);
  private batchService       = inject(BatchService);
  private messageService     = inject(MessageService);
  private formBuilder        = inject(FormBuilder);
  private destroy$           = new Subject<void>();

  // ── Filter state ────────────────────────────────────────────────────────────
  readonly academicYears    = signal<AcademicYearSummary[]>([]);
  readonly classes          = signal<ClassSummary[]>([]);
  readonly batches          = signal<BatchSummary[]>([]);
  readonly selectedAyId     = signal<string | null>(null);
  readonly selectedClassId  = signal<string | null>(null);
  readonly selectedBatchId  = signal<string | null>(null);

  readonly isLoadingYears   = signal(false);
  readonly isLoadingClasses = signal(false);
  readonly isLoadingBatches = signal(false);

  // ── Collection data ──────────────────────────────────────────────────────────
  readonly collectionData   = signal<BatchCollectionData | null>(null);
  readonly isLoading        = signal(false);

  // ── Dialog state ─────────────────────────────────────────────────────────────
  readonly showDialog        = signal(false);
  readonly dialogStudent     = signal<BatchCollectionStudentRow | null>(null);
  readonly isSaving          = signal(false);
  readonly today             = new Date();

  readonly paymentMethodOptions: SelectOption[] = [
    { label: 'Cash',          value: 'CASH' },
    { label: 'UPI',           value: 'UPI'  },
    { label: 'Card',          value: 'CARD' },
    { label: 'Bank Transfer', value: 'BANK' },
  ];

  // ── Computed options ─────────────────────────────────────────────────────────
  readonly ayOptions = computed<SelectOption[]>(() =>
    this.academicYears().map(ay => ({ label: ay.name, value: ay.id }))
  );
  readonly classOptions = computed<SelectOption[]>(() =>
    this.classes().map(c => ({ label: c.name, value: c.id }))
  );
  readonly batchOptions = computed<SelectOption[]>(() =>
    this.batches().map(b => ({ label: b.name, value: b.id }))
  );

  readonly canLoad = computed(() => !!this.selectedBatchId());

  readonly totalCollected = computed(() =>
    this.collectionData()?.students.reduce((sum, s) => sum + s.totalPaid, 0) ?? 0
  );
  readonly paidCount = computed(() =>
    this.collectionData()?.students.filter(s => s.paymentCount > 0).length ?? 0
  );

  readonly paymentForm: FormGroup = this.formBuilder.group({
    feePlanId:     ['', Validators.required],
    amountPaid:    [null, [Validators.required, Validators.min(0.01)]],
    paymentDate:   [null, Validators.required],
    paymentMethod: ['CASH', Validators.required],
    referenceNo:   [''],
    notes:         [''],
  });

  // Pre-built fee plan options for the dialog (from linked plan or all active plans)
  readonly dialogFeePlanOptions = signal<SelectOption[]>([]);

  get feePlanControl()     { return this.paymentForm.get('feePlanId'); }
  get amountControl()      { return this.paymentForm.get('amountPaid'); }
  get paymentDateControl() { return this.paymentForm.get('paymentDate'); }

  ngOnInit(): void {
    this.loadAcademicYears();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAcademicYears(): void {
    this.isLoadingYears.set(true);
    this.academicYearService.listAcademicYears().pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        this.academicYears.set(response.data ?? []);
        this.isLoadingYears.set(false);
      },
      error: () => { this.isLoadingYears.set(false); },
    });
  }

  onAyChange(ayId: string | null): void {
    this.selectedAyId.set(ayId);
    this.selectedClassId.set(null);
    this.selectedBatchId.set(null);
    this.classes.set([]);
    this.batches.set([]);
    this.collectionData.set(null);

    if (!ayId) return;

    this.isLoadingClasses.set(true);
    this.classService.listClasses().pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        this.classes.set(response.data ?? []);
        this.isLoadingClasses.set(false);
      },
      error: () => { this.isLoadingClasses.set(false); },
    });
  }

  onClassChange(classId: string | null): void {
    this.selectedClassId.set(classId);
    this.selectedBatchId.set(null);
    this.batches.set([]);
    this.collectionData.set(null);

    if (!classId || !this.selectedAyId()) return;

    this.isLoadingBatches.set(true);
    this.batchService.listBatches({ academicYearId: this.selectedAyId()!, classId }).pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        this.batches.set(response.data ?? []);
        this.isLoadingBatches.set(false);
      },
      error: () => { this.isLoadingBatches.set(false); },
    });
  }

  onBatchChange(batchId: string | null): void {
    this.selectedBatchId.set(batchId);
    this.collectionData.set(null);
  }

  loadStudents(): void {
    const batchId = this.selectedBatchId();
    if (!batchId) return;
    this.isLoading.set(true);
    this.feeService.getBatchCollection(batchId).pipe(takeUntil(this.destroy$)).subscribe({
      next: data => {
        this.collectionData.set(data);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
      },
    });
  }

  openRecordDialog(student: BatchCollectionStudentRow): void {
    this.dialogStudent.set(student);

    const data         = this.collectionData();
    const linkedPlan   = data?.linkedFeePlan;

    // Reset to clean state first, then patch with today so the datepicker picks it up reliably
    this.paymentForm.reset();

    if (linkedPlan) {
      this.dialogFeePlanOptions.set([{ label: `${linkedPlan.name} (${linkedPlan.frequency})`, value: linkedPlan.id }]);
      this.paymentForm.patchValue({
        feePlanId:     linkedPlan.id,
        amountPaid:    linkedPlan.amount,
        paymentDate:   new Date(),
        paymentMethod: 'CASH',
      });
    } else {
      this.feeService.getFeePlans(true).pipe(takeUntil(this.destroy$)).subscribe({
        next: plans => {
          this.dialogFeePlanOptions.set(plans.map(p => ({ label: `${p.name} (${p.frequency})`, value: p.id })));
        },
        error: () => {},
      });
      this.paymentForm.patchValue({
        paymentDate:   new Date(),
        paymentMethod: 'CASH',
      });
    }

    this.showDialog.set(true);
  }

  closeDialog(): void { this.showDialog.set(false); }

  savePayment(): void {
    if (this.paymentForm.invalid || !this.dialogStudent()) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const formValue      = this.paymentForm.value;
    const paymentDateObj = formValue.paymentDate as Date;
    const isoDate        = `${paymentDateObj.getFullYear()}-${String(paymentDateObj.getMonth() + 1).padStart(2, '0')}-${String(paymentDateObj.getDate()).padStart(2, '0')}`;

    const request: CreatePaymentRequest = {
      studentId:     this.dialogStudent()!.studentId,
      feePlanId:     formValue.feePlanId     as string,
      amountPaid:    formValue.amountPaid    as number,
      paymentDate:   isoDate,
      paymentMethod: formValue.paymentMethod as PaymentMethod,
      referenceNo:   (formValue.referenceNo as string)?.trim() || null,
      notes:         (formValue.notes        as string)?.trim() || null,
    };

    this.isSaving.set(true);

    this.feeService.recordPayment(request).pipe(takeUntil(this.destroy$)).subscribe({
      next: recorded => {
        this.isSaving.set(false);
        this.showDialog.set(false);

        // Update the student row in-place so the table reflects the new payment instantly
        this.collectionData.update(data => {
          if (!data) return data;
          return {
            ...data,
            students: data.students.map(s =>
              s.studentId === recorded.studentId
                ? {
                    ...s,
                    totalPaid:       s.totalPaid + recorded.amountPaid,
                    lastPaymentDate: recorded.paymentDate,
                    paymentCount:    s.paymentCount + 1,
                  }
                : s
            ),
          };
        });

        this.messageService.add({ severity: 'success', summary: 'Recorded', detail: `Payment recorded for ${this.dialogStudent()?.studentName}.` });
      },
      error: (err: Error) => {
        this.isSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
      },
    });
  }
}
