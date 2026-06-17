import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { FeeService } from '../../../services/fee.service';
import { AcademicYearService } from '../../../services/academic-year.service';
import { ClassService } from '../../../services/class.service';
import { BatchService } from '../../../services/batch.service';
import { AcademicYearSummary, ClassSummary, BatchSummary } from '../../../models/academic.models';
import { PaymentRecord } from '../../../models/fee.models';

interface SelectOption { label: string; value: string; }

@Component({
  selector: 'app-payments-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    SelectModule,
    DatePickerModule,
    TagModule,
    ToastModule,
    TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './payments-tab.component.html',
  styleUrls: ['./payments-tab.component.scss'],
})
export class PaymentsTabComponent implements OnInit, OnDestroy {
  private feeService          = inject(FeeService);
  private academicYearService = inject(AcademicYearService);
  private classService        = inject(ClassService);
  private batchService        = inject(BatchService);
  private messageService      = inject(MessageService);
  private destroy$            = new Subject<void>();

  // ── Filter selections ─────────────────────────────────────────────────────
  readonly academicYears   = signal<AcademicYearSummary[]>([]);
  readonly classes         = signal<ClassSummary[]>([]);
  readonly batches         = signal<BatchSummary[]>([]);
  readonly selectedAyId    = signal<string | null>(null);
  readonly selectedClassId = signal<string | null>(null);
  readonly selectedBatchId = signal<string | null>(null);
  readonly fromDate        = signal<Date | null>(null);
  readonly toDate          = signal<Date | null>(null);

  readonly isLoadingYears   = signal(false);
  readonly isLoadingClasses = signal(false);
  readonly isLoadingBatches = signal(false);

  // ── Results ───────────────────────────────────────────────────────────────
  readonly payments    = signal<PaymentRecord[]>([]);
  readonly isLoading   = signal(false);
  readonly hasSearched = signal(false);
  readonly deletingId  = signal<string | null>(null);

  readonly today = new Date();

  // ── Computed ──────────────────────────────────────────────────────────────
  readonly ayOptions = computed<SelectOption[]>(() =>
    this.academicYears().map(ay => ({ label: ay.name, value: ay.id }))
  );
  readonly classOptions = computed<SelectOption[]>(() =>
    this.classes().map(c => ({ label: c.name, value: c.id }))
  );
  readonly batchOptions = computed<SelectOption[]>(() =>
    this.batches().map(b => ({ label: b.name, value: b.id }))
  );

  readonly canSearch = computed(() => !!this.selectedAyId());

  readonly totalAmount = computed(() =>
    this.payments().reduce((sum, p) => sum + p.amountPaid, 0)
  );

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
    this.payments.set([]);
    this.hasSearched.set(false);
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
    this.payments.set([]);
    this.hasSearched.set(false);
    if (!classId || !this.selectedAyId()) return;

    this.isLoadingBatches.set(true);
    this.batchService.listBatches({ academicYearId: this.selectedAyId()!, classId }).pipe(takeUntil(this.destroy$)).subscribe({
      next: r => { this.batches.set(r.data ?? []); this.isLoadingBatches.set(false); },
      error: () => { this.isLoadingBatches.set(false); },
    });
  }

  onBatchChange(batchId: string | null): void {
    this.selectedBatchId.set(batchId);
    this.payments.set([]);
    this.hasSearched.set(false);
  }

  search(): void {
    if (!this.canSearch()) return;
    this.isLoading.set(true);
    this.hasSearched.set(true);

    const toIso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const fromRaw = this.fromDate();
    const toRaw   = this.toDate();

    const batchId  = this.selectedBatchId() ?? undefined;
    const classId  = !batchId ? (this.selectedClassId() ?? undefined) : undefined;
    const ayId     = !batchId && !classId ? (this.selectedAyId() ?? undefined) : undefined;

    this.feeService.getPayments({
      batchId,
      classId,
      academicYearId: ayId,
      fromDate:       fromRaw ? toIso(fromRaw) : undefined,
      toDate:         toRaw   ? toIso(toRaw)   : undefined,
      pageSize:       500,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: r => { this.payments.set(r.payments); this.isLoading.set(false); },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
      },
    });
  }

  deletePayment(payment: PaymentRecord): void {
    if (this.deletingId()) return;
    this.deletingId.set(payment.id);

    this.feeService.deletePayment(payment.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.payments.update(list => list.filter(p => p.id !== payment.id));
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Payment removed.' });
      },
      error: (err: Error) => {
        this.deletingId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
      },
    });
  }

  methodLabel(method: string): string {
    const labels: Record<string, string> = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', BANK: 'Bank' };
    return labels[method] ?? method;
  }
}
