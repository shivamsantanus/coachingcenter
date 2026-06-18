import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { StudentService } from '../../../services/student.service';
import { FeeService } from '../../../services/fee.service';
import { ExportService, CsvColumn } from '../../../services/export.service';
import { StudentDetail } from '../../../models/student.models';
import { PaymentRecord, FeePlan } from '../../../models/fee.models';
import { environment } from '../../../../environments/environment';

interface SelectOption { label: string; value: string; }

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonModule,
    TagModule,
    TabsModule,
    SelectModule,
    DatePickerModule,
    ToastModule,
    TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './student-detail.component.html',
  styleUrls: ['./student-detail.component.scss'],
})
export class StudentDetailComponent implements OnInit, OnDestroy {
  private route          = inject(ActivatedRoute);
  private studentService = inject(StudentService);
  private feeService     = inject(FeeService);
  private exportService  = inject(ExportService);
  private messageService = inject(MessageService);
  private destroy$       = new Subject<void>();

  readonly apiBase = environment.apiBaseUrl.replace('/api', '');

  // ── Student ───────────────────────────────────────────────────────────────
  readonly student    = signal<StudentDetail | null>(null);
  readonly isLoading  = signal(true);
  readonly studentId  = signal<string>('');

  // ── Payment filters ───────────────────────────────────────────────────────
  readonly feePlans           = signal<FeePlan[]>([]);
  readonly selectedFeePlanId  = signal<string | null>(null);
  readonly fromDate           = signal<Date | null>(null);
  readonly toDate             = signal<Date | null>(null);
  readonly today              = new Date();

  readonly feePlanOptions = computed<SelectOption[]>(() => [
    { label: 'All fee plans', value: '' },
    ...this.feePlans().map(p => ({ label: p.name, value: p.id })),
  ]);

  // ── Payment results ───────────────────────────────────────────────────────
  readonly payments     = signal<PaymentRecord[]>([]);
  readonly isSearching  = signal(false);
  readonly hasSearched  = signal(false);
  readonly deletingId   = signal<string | null>(null);

  readonly totalPaid = computed(() =>
    this.payments().reduce((sum, p) => sum + p.amountPaid, 0)
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.studentId.set(id);
    this.loadStudent(id);
    this.loadFeePlans();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStudent(id: string): void {
    this.isLoading.set(true);
    this.studentService.getStudent(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: s  => { this.student.set(s); this.isLoading.set(false); },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
      },
    });
  }

  private loadFeePlans(): void {
    this.feeService.getFeePlans(true).pipe(takeUntil(this.destroy$)).subscribe({
      next: plans => this.feePlans.set(plans),
      error: () => {},
    });
  }

  searchPayments(): void {
    this.isSearching.set(true);
    this.hasSearched.set(true);

    const toIso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const fromRaw = this.fromDate();
    const toRaw   = this.toDate();

    this.feeService.getPayments({
      studentId:  this.studentId(),
      feePlanId:  this.selectedFeePlanId() || undefined,
      fromDate:   fromRaw ? toIso(fromRaw) : undefined,
      toDate:     toRaw   ? toIso(toRaw)   : undefined,
      pageSize:   500,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: r => { this.payments.set(r.payments); this.isSearching.set(false); },
      error: (err: Error) => {
        this.isSearching.set(false);
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

  private readonly exportColumns: CsvColumn<PaymentRecord>[] = [
    { header: 'Date',        value: p => p.paymentDate },
    { header: 'Fee Plan',    value: p => p.feePlanName },
    { header: 'Category',    value: p => p.feePlanCategory },
    { header: 'Amount (₹)', value: p => p.amountPaid },
    { header: 'Method',      value: p => p.paymentMethod },
    { header: 'Reference',   value: p => p.referenceNo ?? '' },
    { header: 'Receipt ID',  value: p => p.systemId },
  ];

  exportCsv(): void {
    const s = this.student();
    this.exportService.exportCsv(
      `Payments_${s?.admissionNo ?? this.studentId()}_${new Date().toISOString().slice(0, 10)}`,
      this.exportColumns,
      this.payments(),
    );
  }

  photoUrl(url: string | null): string | null {
    if (!url) return null;
    return url.startsWith('http') ? url : `${this.apiBase}${url}`;
  }

  initials(fullName: string): string {
    return fullName.split(' ').slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('');
  }

  methodLabel(method: string): string {
    const labels: Record<string, string> = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', BANK: 'Bank' };
    return labels[method] ?? method;
  }
}
