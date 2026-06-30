import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { StudentService } from '../../services/student.service';
import { ExportService } from '../../services/export.service';
import { AcademicYearSummary, BatchSummary } from '../../models/academic.models';
import { StudentEnrollmentInfo } from '../../models/student-dashboard.models';
import {
  AttendanceRecord,
  AttendanceStatus,
  MarkAttendanceRequest,
  MonthlyReportData,
  MonthlyReportStudent
} from '../../models/attendance.models';

interface SelectOption { label: string; value: string; }

interface MonthDateColumn {
  readonly dateStr: string;
  readonly isMarked: boolean;
  readonly isFuture: boolean;
}

type CalendarDayStatus = AttendanceStatus | 'NOT_MARKED' | null;

interface CalendarDay {
  readonly day: number;
  readonly dateStr: string;
  readonly isCurrentMonth: boolean;
  readonly isFuture: boolean;
  readonly status: CalendarDayStatus;
}

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
  private readonly studentService      = inject(StudentService);
  private readonly exportService       = inject(ExportService);
  private readonly messageService      = inject(MessageService);
  private readonly destroy$            = new Subject<void>();

  // ── Tab state ──────────────────────────────────────────────────────────────
  activeTab = signal<'mark' | 'report'>('mark');

  private readonly isTeacher = this.authService.getContext()?.role === 'TEACHER';
  readonly isStudent         = this.authService.getContext()?.role === 'STUDENT';

  // ── Shared state (AY + batch lists used by both tabs) ─────────────────────
  academicYears        = signal<AcademicYearSummary[]>([]);
  isLoadingYears       = signal(false);
  // For TEACHER: all assigned batches loaded once; AY list and tab batch lists are derived from this.
  private allTeacherBatches    = signal<BatchSummary[]>([]);
  // For STUDENT: all active enrollments loaded once; AY list and report batch list derived from this.
  private allStudentEnrollments = signal<StudentEnrollmentInfo[]>([]);

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
  markMinDate        = signal<Date | undefined>(undefined);
  markMaxDate        = signal<Date>(new Date());
  markedDatesSet     = signal<Set<string>>(new Set());

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

  // ── Student calendar view computed ────────────────────────────────────────
  readonly studentRecord = computed<MonthlyReportStudent | null>(() => {
    const data = this.reportData();
    if (!data || data.students.length === 0) return null;
    return data.students[0];
  });

  readonly calendarWeeks = computed<CalendarDay[][]>(() => {
    const data = this.reportData();
    if (!data) return [];

    const student     = this.studentRecord();
    const markedSet   = new Set(data.markedDates);
    const todayStart  = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { year, month } = data;
    const daysInMonth     = new Date(year, month, 0).getDate();

    const firstDayOfWeek  = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const startOffset     = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Mon-based grid
    const totalCells      = startOffset + daysInMonth <= 35 ? 35 : 42;

    const pad = (n: number) => n.toString().padStart(2, '0');
    const cells: CalendarDay[] = [];

    for (let i = 0; i < totalCells; i++) {
      const dayNum         = i - startOffset + 1;
      const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;

      if (!isCurrentMonth) {
        cells.push({ day: 0, dateStr: '', isCurrentMonth: false, isFuture: false, status: null });
        continue;
      }

      const dateStr  = `${year}-${pad(month)}-${pad(dayNum)}`;
      const cellDate = new Date(year, month - 1, dayNum);
      const isFuture = cellDate > todayStart;

      let status: CalendarDayStatus = null;
      if (markedSet.has(dateStr)) {
        status = student ? ((student.dailyStatus[dateStr] as AttendanceStatus) ?? null) : null;
      } else if (!isFuture) {
        status = 'NOT_MARKED';
      }

      cells.push({ day: dayNum, dateStr, isCurrentMonth: true, isFuture, status });
    }

    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  });

  // All calendar days of the selected month — used by the admin/teacher matrix.
  // Every day is shown; days with no attendance record are flagged isMarked=false.
  readonly allMonthDates = computed<MonthDateColumn[]>(() => {
    const data = this.reportData();
    if (!data) return [];

    const { year, month } = data;
    const daysInMonth = new Date(year, month, 0).getDate();
    const markedSet   = new Set(data.markedDates);
    const todayStart  = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const pad = (n: number) => n.toString().padStart(2, '0');

    return Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum   = i + 1;
      const dateStr  = `${year}-${pad(month)}-${pad(dayNum)}`;
      const cellDate = new Date(year, month - 1, dayNum);
      return {
        dateStr,
        isMarked: markedSet.has(dateStr),
        isFuture: cellDate > todayStart,
      };
    });
  });

  ngOnInit(): void {
    if (this.isStudent) {
      this.activeTab.set('report');
      this.loadStudentEnrollments();
    } else if (this.isTeacher) {
      this.loadTeacherBatches();
    } else {
      this.loadAcademicYears();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  switchTab(tab: 'mark' | 'report'): void {
    this.activeTab.set(tab);
  }

  // ── Academic year / batch loading ──────────────────────────────────────────
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

  // For TEACHER: load all assigned batches once, then derive the AY list from them.
  // No extra API calls when the teacher switches AY — batches are filtered locally.
  private loadTeacherBatches(): void {
    this.isLoadingYears.set(true);
    this.batchService.listBatches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          const activeBatches = (response.data ?? []).filter(b => b.status === 'ACTIVE');
          this.allTeacherBatches.set(activeBatches);

          const ayMap = new Map<string, AcademicYearSummary>();
          for (const batch of activeBatches) {
            if (!ayMap.has(batch.academicYearId)) {
              ayMap.set(batch.academicYearId, {
                id:        batch.academicYearId,
                name:      batch.academicYearName,
                startDate: '',
                endDate:   '',
                isActive:  true
              });
            }
          }
          this.academicYears.set([...ayMap.values()]);
          this.isLoadingYears.set(false);
        },
        error: (err: Error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          this.isLoadingYears.set(false);
        }
      });
  }

  // For STUDENT: load their active enrollments once, then derive AY list and batch list from them.
  private loadStudentEnrollments(): void {
    this.isLoadingYears.set(true);
    this.studentService.getMyEnrollments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          const enrollments = response.data ?? [];
          // Derive unique AYs
          const ayMap = new Map<string, AcademicYearSummary>();
          for (const enrollment of enrollments) {
            if (!ayMap.has(enrollment.academicYearId)) {
              ayMap.set(enrollment.academicYearId, {
                id: enrollment.academicYearId,
                name: enrollment.academicYearName,
                startDate: '',
                endDate: '',
                isActive: true
              });
            }
          }
          this.academicYears.set([...ayMap.values()]);
          // Store enrollments as BatchSummary-compatible objects for the report batch selector
          this.allStudentEnrollments.set(enrollments);
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

    if (this.isTeacher) {
      this.markBatches.set(this.allTeacherBatches().filter(b => b.academicYearId === yearId));
      return;
    }

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
    this.markDate.set(null);
    this.markedDatesSet.set(new Set());
    this.clearSheet();

    const batch = batchId ? this.markBatches().find(b => b.id === batchId) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.markMinDate.set(batch?.startDate ? this.parseDateLocal(batch.startDate) : undefined);

    if (batch?.endDate) {
      const batchEnd = this.parseDateLocal(batch.endDate);
      this.markMaxDate.set(batchEnd < today ? batchEnd : today);
    } else {
      this.markMaxDate.set(today);
    }

    if (batchId) {
      this.loadMarkedDatesForMonth(batchId, today.getMonth() + 1, today.getFullYear());
    }
  }

  onPickerMonthChange(event: { month?: number; year?: number }): void {
    const batchId = this.markBatchId();
    if (!batchId || event.month == null || event.year == null) return;
    // PrimeNG onMonthChange emits month as 1-indexed (1=January)
    this.loadMarkedDatesForMonth(batchId, event.month, event.year);
  }

  private loadMarkedDatesForMonth(batchId: string, month: number, year: number): void {
    this.attendanceService.getMarkedDates(batchId, month, year)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => this.markedDatesSet.set(new Set(response.data ?? [])),
        error: () => { /* non-critical — calendar still works without highlights */ }
      });
  }

  isDateMarked(date: { year: number; month: number; day: number }): boolean {
    const pad = (n: number) => n.toString().padStart(2, '0');
    // PrimeNG date template: month is 0-indexed (0=January)
    const key = `${date.year}-${pad(date.month + 1)}-${pad(date.day)}`;
    return this.markedDatesSet().has(key);
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
          // Refresh the calendar highlights to include the newly saved date
          const savedDate = this.markDate()!;
          this.loadMarkedDatesForMonth(batchId, savedDate.getMonth() + 1, savedDate.getFullYear());
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

    if (this.isTeacher) {
      this.reportBatches.set(this.allTeacherBatches().filter(b => b.academicYearId === yearId));
      return;
    }

    if (this.isStudent) {
      const enrollments = this.allStudentEnrollments().filter(e => e.academicYearId === yearId);
      this.reportBatches.set(enrollments.map(e => ({
        id: e.batchId, name: e.batchName, academicYearId: e.academicYearId,
        academicYearName: e.academicYearName, classId: null, className: e.className,
        branchId: null, branchName: null, startDate: e.startDate, endDate: e.endDate,
        startTime: null, endTime: null, status: e.status
      })));
      return;
    }

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

  async exportExcel(): Promise<void> {
    const data = this.reportData();
    if (!data) return;

    const { year, month, batchName, students } = data;
    const monthName = MONTH_NAMES[month - 1];
    const pad       = (n: number) => n.toString().padStart(2, '0');
    const dowLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const allDays = this.allMonthDates();

    const dayHeaders = allDays.map(col => {
      const dayNum  = parseInt(col.dateStr.substring(8, 10), 10);
      const dayDate = new Date(year, month - 1, dayNum);
      return `${dayNum} ${dowLabels[dayDate.getDay()]}`;
    });

    const headers = ['#', 'Student Name', 'Adm. No', ...dayHeaders, 'Total', 'P', 'A', 'L', 'E', '%'];

    const rows = students.map((student, index) => {
      const dayCells: (string | number)[] = allDays.map(col => {
        if (col.isFuture)  return '';
        if (!col.isMarked) return 'N';
        const status = student.dailyStatus[col.dateStr];
        if (!status) return 'N';
        return status === 'PRESENT' ? 'P' : status === 'ABSENT' ? 'A' : status === 'LATE' ? 'L' : 'E';
      });
      return [
        index + 1,
        student.studentName,
        student.admissionNo,
        ...dayCells,
        student.totalDays,
        student.present,
        student.absent,
        student.late,
        student.excused,
        `${student.presentPercentage}%`,
      ];
    });

    try {
      await this.exportService.downloadXlsx(
        `Attendance_${batchName.replace(/\s+/g, '_')}_${year}-${pad(month)}`,
        `Attendance Report — ${batchName} — ${monthName} ${year}`,
        headers,
        rows,
        3,  // freeze #, Student Name, Adm. No columns
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed';
      this.messageService.add({ severity: 'error', summary: 'Export Error', detail: message });
    }
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
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Parses "YYYY-MM-DD" as local midnight, avoiding the UTC-midnight shift
  // that new Date("YYYY-MM-DD") produces for ISO date strings.
  private parseDateLocal(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
}
