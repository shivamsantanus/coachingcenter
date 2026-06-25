import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { FeeService } from '../../../services/fee.service';
import { ExportService } from '../../../services/export.service';
import { AcademicYearService } from '../../../services/academic-year.service';
import { ClassService } from '../../../services/class.service';
import { BatchService } from '../../../services/batch.service';
import { AcademicYearSummary, ClassSummary, BatchSummary } from '../../../models/academic.models';
import {
  BatchCollectionData,
  BatchCollectionStudentRow,
  CreatePaymentRequest,
  FeePlan,
  PaymentMethod,
  PaymentStatus,
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
    MultiSelectModule,
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
  private feeService          = inject(FeeService);
  private exportService       = inject(ExportService);
  private academicYearService = inject(AcademicYearService);
  private classService        = inject(ClassService);
  private batchService        = inject(BatchService);
  private messageService      = inject(MessageService);
  private formBuilder         = inject(FormBuilder);
  private destroy$            = new Subject<void>();

  // ── Batch filter state ────────────────────────────────────────────────────
  readonly academicYears    = signal<AcademicYearSummary[]>([]);
  readonly classes          = signal<ClassSummary[]>([]);
  readonly batches          = signal<BatchSummary[]>([]);
  readonly selectedAyId     = signal<string | null>(null);
  readonly selectedClassId  = signal<string | null>(null);
  readonly selectedBatchId  = signal<string | null>(null);

  readonly isLoadingYears   = signal(false);
  readonly isLoadingClasses = signal(false);
  readonly isLoadingBatches = signal(false);

  // ── Month navigation ──────────────────────────────────────────────────────
  readonly selectedMonth = signal<number>(new Date().getMonth() + 1);  // 1-12
  readonly selectedYear  = signal<number>(new Date().getFullYear());

  readonly monthLabel = computed(() => {
    const date = new Date(this.selectedYear(), this.selectedMonth() - 1, 1);
    return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date);
  });

  readonly isCurrentMonth = computed(() => {
    const now = new Date();
    return this.selectedMonth() === (now.getMonth() + 1) && this.selectedYear() === now.getFullYear();
  });

  // ── Collection data ───────────────────────────────────────────────────────
  readonly collectionData = signal<BatchCollectionData | null>(null);
  readonly isLoading      = signal(false);

  // ── Dialog state ──────────────────────────────────────────────────────────
  readonly showDialog    = signal(false);
  readonly dialogStudent = signal<BatchCollectionStudentRow | null>(null);
  readonly isSaving      = signal(false);
  readonly today         = new Date();

  readonly paymentMethodOptions: SelectOption[] = [
    { label: 'Cash',          value: 'CASH' },
    { label: 'UPI',           value: 'UPI'  },
    { label: 'Card',          value: 'CARD' },
    { label: 'Bank Transfer', value: 'BANK' },
  ];

  // ── Dialog: multi-plan selection + per-plan amounts ───────────────────────
  readonly dialogFeePlanOptions = signal<SelectOption[]>([]);
  readonly dialogLinkedPlans    = signal<FeePlan[]>([]);
  readonly selectedPlanIds      = signal<string[]>([]);
  readonly planAmounts          = signal<Record<string, number>>({});

  readonly totalAmount = computed(() => {
    const amounts = this.planAmounts();
    return this.selectedPlanIds().reduce((sum, id) => sum + (amounts[id] ?? 0), 0);
  });

  // ── Computed options ──────────────────────────────────────────────────────
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

  // ── Summary stats ─────────────────────────────────────────────────────────
  readonly totalCollected = computed(() =>
    this.collectionData()?.students.reduce((sum, s) => sum + s.totalPaid, 0) ?? 0
  );
  readonly paidCount = computed(() =>
    this.collectionData()?.students.filter(s => this.studentStatus(s) === 'paid').length ?? 0
  );
  readonly partialCount = computed(() =>
    this.collectionData()?.students.filter(s => this.studentStatus(s) === 'partial').length ?? 0
  );
  readonly pendingCount = computed(() =>
    this.collectionData()?.students.filter(s => this.studentStatus(s) === 'pending').length ?? 0
  );

  // Shared payment fields only — plan + amount handled via multi-select signals
  readonly paymentForm: FormGroup = this.formBuilder.group({
    paymentDate:   [null, Validators.required],
    paymentMethod: ['CASH', Validators.required],
    referenceNo:   [''],
    notes:         [''],
  });

  get paymentDateControl() { return this.paymentForm.get('paymentDate'); }

  ngOnInit(): void {
    this.loadAcademicYears();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Status helper ─────────────────────────────────────────────────────────
  studentStatus(student: BatchCollectionStudentRow): PaymentStatus {
    if (student.dueAmount != null) {
      if (student.totalPaid >= student.dueAmount) return 'paid';
      if (student.totalPaid > 0)                  return 'partial';
      return 'pending';
    }
    return student.paymentCount > 0 ? 'paid' : 'pending';
  }

  // ── Month navigation ──────────────────────────────────────────────────────
  prevMonth(): void {
    if (this.selectedMonth() === 1) {
      this.selectedMonth.set(12);
      this.selectedYear.update(y => y - 1);
    } else {
      this.selectedMonth.update(m => m - 1);
    }
    this.collectionData.set(null);
  }

  nextMonth(): void {
    if (this.isCurrentMonth()) return;
    if (this.selectedMonth() === 12) {
      this.selectedMonth.set(1);
      this.selectedYear.update(y => y + 1);
    } else {
      this.selectedMonth.update(m => m + 1);
    }
    this.collectionData.set(null);
  }

  // ── Batch filter ──────────────────────────────────────────────────────────
  private loadAcademicYears(): void {
    this.isLoadingYears.set(true);
    this.academicYearService.listAcademicYears().pipe(takeUntil(this.destroy$)).subscribe({
      next: r => { this.academicYears.set(r.data ?? []); this.isLoadingYears.set(false); },
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
      next: r => { this.classes.set(r.data ?? []); this.isLoadingClasses.set(false); },
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
      next: r => { this.batches.set(r.data ?? []); this.isLoadingBatches.set(false); },
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
    this.feeService.getBatchCollection(batchId, this.selectedMonth(), this.selectedYear())
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: data => { this.collectionData.set(data); this.isLoading.set(false); },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        },
      });
  }

  // ── Export ────────────────────────────────────────────────────────────────
  async exportExcel(): Promise<void> {
    const data = this.collectionData();
    if (!data) return;
    const hasFeePlan = data.linkedFeePlans.length > 0;
    const headers = [
      'Student Name', 'Admission No',
      ...(hasFeePlan ? ['Due (₹)', 'Paid (₹)', 'Balance (₹)'] : ['Paid (₹)']),
      'Last Payment', 'Status',
    ];
    const rows = data.students.map(s => {
      const status  = this.studentStatus(s);
      const balance = s.dueAmount != null ? (s.dueAmount - s.totalPaid) : null;
      const base: (string | number | null)[] = [s.studentName, s.admissionNo];
      if (hasFeePlan) base.push(s.dueAmount ?? 0, s.totalPaid, balance ?? 0);
      else            base.push(s.totalPaid);
      base.push(s.lastPaymentDate ?? '—', status.charAt(0).toUpperCase() + status.slice(1));
      return base;
    });
    const batchName  = data.batchName.replace(/\s+/g, '_');
    const monthLabel = `${this.selectedYear()}-${String(this.selectedMonth()).padStart(2, '0')}`;
    await this.exportService.downloadXlsx(
      `FeeCollection_${batchName}_${monthLabel}`,
      `Fee Collection Register – ${this.monthLabel()}`,
      headers,
      rows,
    );
  }

  // ── Payment dialog ────────────────────────────────────────────────────────
  openRecordDialog(student: BatchCollectionStudentRow): void {
    this.dialogStudent.set(student);
    const data        = this.collectionData();
    const linkedPlans = data?.linkedFeePlans ?? [];

    this.paymentForm.reset({ paymentDate: new Date(), paymentMethod: 'CASH' });
    this.dialogLinkedPlans.set(linkedPlans);
    this.selectedPlanIds.set([]);
    this.planAmounts.set({});

    if (linkedPlans.length > 0) {
      this.dialogFeePlanOptions.set(
        linkedPlans.map(p => ({ label: p.name, value: p.id }))
      );
      // Pre-select all linked plans with their standard amounts
      const initialAmounts: Record<string, number> = {};
      linkedPlans.forEach(p => { initialAmounts[p.id] = p.amount; });
      this.selectedPlanIds.set(linkedPlans.map(p => p.id));
      this.planAmounts.set(initialAmounts);
    } else {
      // No linked plans — load all active plans for manual selection
      this.feeService.getFeePlans(true).pipe(takeUntil(this.destroy$)).subscribe({
        next: plans => {
          this.dialogLinkedPlans.set(plans);
          this.dialogFeePlanOptions.set(
            plans.map(p => ({ label: `${p.name} (${p.frequency})`, value: p.id }))
          );
        },
        error: () => {},
      });
    }

    this.showDialog.set(true);
  }

  onPlanSelectionChange(selectedIds: string[]): void {
    this.selectedPlanIds.set(selectedIds);
    // Fill in default amount for any newly added plan; preserve existing edits
    const planLookup = new Map(this.dialogLinkedPlans().map(p => [p.id, p.amount]));
    this.planAmounts.update(current => {
      const updated = { ...current };
      selectedIds.forEach(id => {
        if (updated[id] == null) updated[id] = planLookup.get(id) ?? 0;
      });
      return updated;
    });
  }

  updatePlanAmount(planId: string, amount: number | null): void {
    this.planAmounts.update(current => ({ ...current, [planId]: amount ?? 0 }));
  }

  dialogPlanName(planId: string): string {
    return this.dialogLinkedPlans().find(p => p.id === planId)?.name ?? '—';
  }

  closeDialog(): void { this.showDialog.set(false); }

  savePayment(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const selectedIds = this.selectedPlanIds();
    if (selectedIds.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'No plan selected', detail: 'Select at least one fee plan.' });
      return;
    }

    const amounts = this.planAmounts();
    if (selectedIds.some(id => !amounts[id] || amounts[id] <= 0)) {
      this.messageService.add({ severity: 'warn', summary: 'Invalid amount', detail: 'Each selected fee plan must have an amount greater than zero.' });
      return;
    }

    const formValue      = this.paymentForm.value;
    const paymentDateObj = formValue.paymentDate as Date;
    const isoDate        = `${paymentDateObj.getFullYear()}-${String(paymentDateObj.getMonth() + 1).padStart(2, '0')}-${String(paymentDateObj.getDate()).padStart(2, '0')}`;
    const student        = this.dialogStudent()!;

    const paymentRequest: CreatePaymentRequest = {
      studentId:     student.studentId,
      paymentDate:   isoDate,
      paymentMethod: formValue.paymentMethod as PaymentMethod,
      referenceNo:   (formValue.referenceNo as string)?.trim() || null,
      notes:         (formValue.notes        as string)?.trim() || null,
      plans:         selectedIds.map(planId => ({ feePlanId: planId, amountPaid: amounts[planId] })),
    };

    this.isSaving.set(true);

    this.feeService.recordPayment(paymentRequest).pipe(takeUntil(this.destroy$)).subscribe({
      next: payment => {
        this.isSaving.set(false);
        this.closeDialog();

        this.collectionData.update(data => {
          if (!data) return data;
          return {
            ...data,
            students: data.students.map(s =>
              s.studentId === student.studentId
                ? { ...s, totalPaid: s.totalPaid + payment.totalAmount, lastPaymentDate: payment.paymentDate, paymentCount: s.paymentCount + 1 }
                : s
            ),
          };
        });

        this.messageService.add({ severity: 'success', summary: 'Recorded', detail: `Payment recorded for ${student.studentName}.` });
      },
      error: (err: Error) => {
        this.isSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
      },
    });
  }
}
