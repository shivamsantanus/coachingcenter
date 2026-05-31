import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';
import { AttendanceService } from '../../services/attendance.service';
import { AcademicYearService } from '../../services/academic-year.service';
import { BatchService } from '../../services/batch.service';
import { AuthService } from '../../services/auth.service';
import { BrandingService } from '../../services/branding.service';
import { AcademicYearSummary, BatchSummary } from '../../models/academic.models';
import {
  AttendanceRecord,
  AttendanceStatus,
  MarkAttendanceRequest,
  MonthlyReportData,
  MonthlyReportStudent
} from '../../models/attendance.models';

interface SelectOption { label: string; value: string; }

interface StudentAttendanceRow {
  studentId: string;
  studentName: string;
  admissionNo: string;
  status: AttendanceStatus;
  note: string;
  markedByName: string | null;
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [
    CommonModule,
    NgTemplateOutlet,
    FormsModule,
    ButtonModule,
    SelectModule,
    DatePickerModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.scss']
})
export class AttendanceComponent implements OnInit, OnDestroy {
  private readonly attendanceService   = inject(AttendanceService);
  private readonly academicYearService = inject(AcademicYearService);
  private readonly batchService        = inject(BatchService);
  private readonly authService         = inject(AuthService);
  private readonly brandingService     = inject(BrandingService);
  private readonly messageService      = inject(MessageService);
  private readonly destroy$            = new Subject<void>();

  // ── Tab state ──────────────────────────────────────────────────────────────
  activeTab = signal<'mark' | 'report'>('mark');

  // ── Shared state (AY + batch lists used by both tabs) ─────────────────────
  academicYears   = signal<AcademicYearSummary[]>([]);
  isLoadingYears  = signal(false);

  // ── Mark-attendance tab state ──────────────────────────────────────────────
  markBatches        = signal<BatchSummary[]>([]);
  markAcademicYearId = signal<string | null>(null);
  markBatchId        = signal<string | null>(null);
  markDate           = signal<Date | null>(null);
  studentRows        = signal<StudentAttendanceRow[]>([]);
  isLoadingMarkBatches = signal(false);
  isLoadingSheet     = signal(false);
  isSaving           = signal(false);
  sheetLoaded        = signal(false);
  readonly maxDate   = new Date();

  // ── Report tab state ───────────────────────────────────────────────────────
  reportBatches          = signal<BatchSummary[]>([]);
  reportAcademicYearId   = signal<string | null>(null);
  reportBatchId          = signal<string | null>(null);
  reportMonth            = signal<Date | null>(null);
  reportData             = signal<MonthlyReportData | null>(null);
  selectedReportBatch    = signal<BatchSummary | null>(null);
  isLoadingReportBatches = signal(false);
  isLoadingReport        = signal(false);

  readonly orgName  = this.authService.getContext()?.tenantName ?? '';

  readonly logoUrl = computed(() => {
    const raw = this.brandingService.branding()?.logoUrl;
    if (!raw) return null;
    if (raw.startsWith('http')) return raw;
    const base = environment.apiBaseUrl.replace(/\/api$/, '');
    return base + raw;
  });

  // ── Computed options ───────────────────────────────────────────────────────
  readonly academicYearOptions = computed<SelectOption[]>(() =>
    this.academicYears().map(ay => ({ label: ay.name, value: ay.id }))
  );
  readonly markBatchOptions = computed<SelectOption[]>(() =>
    this.markBatches().map(b => ({ label: b.name, value: b.id }))
  );
  readonly reportBatchOptions = computed<SelectOption[]>(() =>
    this.reportBatches().map(b => ({ label: b.name, value: b.id }))
  );

  readonly statusOptions: SelectOption[] = [
    { label: 'Present', value: 'PRESENT' },
    { label: 'Absent',  value: 'ABSENT'  },
    { label: 'Late',    value: 'LATE'    },
    { label: 'Excused', value: 'EXCUSED' }
  ];

  readonly presentCount = computed(() => this.studentRows().filter(r => r.status === 'PRESENT').length);
  readonly absentCount  = computed(() => this.studentRows().filter(r => r.status === 'ABSENT').length);
  readonly lateCount    = computed(() => this.studentRows().filter(r => r.status === 'LATE').length);
  readonly excusedCount = computed(() => this.studentRows().filter(r => r.status === 'EXCUSED').length);

  // ── Report computed ────────────────────────────────────────────────────────
  readonly reportTitle = computed(() => {
    const data = this.reportData();
    if (!data) return '';
    return `${data.batchName} — ${MONTH_NAMES[data.month - 1]} ${data.year}`;
  });

  // Split marked dates roughly in half for 2-page layout
  readonly splitIndex = computed(() =>
    Math.ceil((this.reportData()?.markedDates.length ?? 0) / 2)
  );

  readonly firstPageDates = computed(() =>
    (this.reportData()?.markedDates ?? []).slice(0, this.splitIndex())
  );

  readonly secondPageDates = computed(() =>
    (this.reportData()?.markedDates ?? []).slice(this.splitIndex())
  );

  ngOnInit(): void {
    this.loadAcademicYears();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  switchTab(tab: 'mark' | 'report'): void {
    this.activeTab.set(tab);
  }

  // ── Academic year loading ──────────────────────────────────────────────────
  private loadAcademicYears(): void {
    this.isLoadingYears.set(true);
    this.academicYearService.listAcademicYears()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.academicYears.set(response.data ?? []);
          this.isLoadingYears.set(false);
        },
        error: (err: Error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          this.isLoadingYears.set(false);
        }
      });
  }

  // ── Mark tab ───────────────────────────────────────────────────────────────
  onMarkAyChange(yearId: string | null): void {
    this.markAcademicYearId.set(yearId);
    this.markBatchId.set(null);
    this.markBatches.set([]);
    this.clearSheet();
    if (!yearId) return;

    this.isLoadingMarkBatches.set(true);
    this.batchService.listBatches({ academicYearId: yearId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.markBatches.set((response.data ?? []).filter(b => b.status === 'ACTIVE'));
          this.isLoadingMarkBatches.set(false);
        },
        error: (err: Error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          this.isLoadingMarkBatches.set(false);
        }
      });
  }

  onMarkBatchChange(batchId: string | null): void {
    this.markBatchId.set(batchId);
    this.clearSheet();
  }

  onMarkDateChange(date: Date | null): void {
    this.markDate.set(date);
    this.clearSheet();
  }

  private clearSheet(): void {
    this.studentRows.set([]);
    this.sheetLoaded.set(false);
  }

  loadAttendanceSheet(): void {
    const batchId = this.markBatchId();
    const date    = this.markDate();
    if (!batchId || !date) return;

    this.isLoadingSheet.set(true);
    this.attendanceService.getAttendance(batchId, this.toDateString(date))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.studentRows.set(
            (response.data ?? []).map((rec: AttendanceRecord): StudentAttendanceRow => ({
              studentId:    rec.studentId,
              studentName:  rec.studentName,
              admissionNo:  rec.admissionNo,
              status:       rec.status ?? 'PRESENT',
              note:         rec.note ?? '',
              markedByName: rec.markedByName
            }))
          );
          this.sheetLoaded.set(true);
          this.isLoadingSheet.set(false);
        },
        error: (err: Error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          this.isLoadingSheet.set(false);
        }
      });
  }

  setStudentStatus(studentId: string, status: AttendanceStatus): void {
    this.studentRows.update(rows =>
      rows.map(row => row.studentId === studentId ? { ...row, status } : row)
    );
  }

  markAll(status: AttendanceStatus): void {
    this.studentRows.update(rows => rows.map(row => ({ ...row, status })));
  }

  saveAttendance(): void {
    const batchId = this.markBatchId();
    const date    = this.markDate();
    if (!batchId || !date || this.studentRows().length === 0) return;

    const request: MarkAttendanceRequest = {
      batchId,
      date:    this.toDateString(date),
      records: this.studentRows().map(row => ({
        studentId: row.studentId,
        status:    row.status,
        note:      row.note || null
      }))
    };

    this.isSaving.set(true);
    this.attendanceService.markAttendance(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.messageService.add({
            severity: 'success',
            summary:  'Saved',
            detail:   `Attendance saved for ${response.data.saved} student(s).`
          });
          this.isSaving.set(false);
        },
        error: (err: Error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          this.isSaving.set(false);
        }
      });
  }

  // ── Report tab ─────────────────────────────────────────────────────────────
  onReportAyChange(yearId: string | null): void {
    this.reportAcademicYearId.set(yearId);
    this.reportBatchId.set(null);
    this.reportBatches.set([]);
    this.reportData.set(null);
    this.selectedReportBatch.set(null);
    if (!yearId) return;

    this.isLoadingReportBatches.set(true);
    this.batchService.listBatches({ academicYearId: yearId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.reportBatches.set(response.data ?? []);
          this.isLoadingReportBatches.set(false);
        },
        error: (err: Error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          this.isLoadingReportBatches.set(false);
        }
      });
  }

  onReportBatchChange(batchId: string | null): void {
    this.reportBatchId.set(batchId);
    this.reportData.set(null);
    this.selectedReportBatch.set(
      this.reportBatches().find(b => b.id === batchId) ?? null
    );
  }

  onReportMonthChange(date: Date | null): void {
    this.reportMonth.set(date);
    this.reportData.set(null);
  }

  loadReport(): void {
    const batchId = this.reportBatchId();
    const month   = this.reportMonth();
    if (!batchId || !month) return;

    this.isLoadingReport.set(true);
    this.attendanceService.getMonthlyReport(batchId, month.getMonth() + 1, month.getFullYear())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.reportData.set(response.data);
          this.isLoadingReport.set(false);
        },
        error: (err: Error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          this.isLoadingReport.set(false);
        }
      });
  }

  printReport(): void {
    const data = this.reportData();
    if (!data) return;

    const monthName     = MONTH_NAMES[data.month - 1];
    const originalTitle = document.title;
    document.title      = `${this.orgName} - ${data.batchName} - ${monthName} ${data.year}`;
    window.print();
    document.title = originalTitle;
  }

  getStudentDayStatus(student: MonthlyReportStudent, dateStr: string): AttendanceStatus | null {
    return (student.dailyStatus[dateStr] as AttendanceStatus) ?? null;
  }

  getDayLabel(dateStr: string): string {
    return parseInt(dateStr.substring(8, 10), 10).toString();
  }

  getDayOfWeek(dateStr: string): string {
    const days = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    const d = new Date(dateStr + 'T00:00:00');
    return days[d.getDay()];
  }

  trackByStudentId(_index: number, row: StudentAttendanceRow | MonthlyReportStudent): string {
    return row.studentId;
  }

  trackByDate(_index: number, dateStr: string): string {
    return dateStr;
  }

  private toDateString(date: Date): string {
    return date.toISOString().substring(0, 10);
  }
}
