import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { TeacherAttendanceService } from '../../services/teacher-attendance.service';
import {
  AdminDailyTeacherAttendanceItem,
  AdminMarkAttendanceRequest,
  AdminMonthlyReportResponse,
} from '../../models/teacher-attendance.models';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';

interface RowState {
  item: AdminDailyTeacherAttendanceItem;
  selectedStatus: AttendanceStatus | null;
  checkInTimeInput: string;   // HH:mm — date comes from selectedDate at top
  checkOutTimeInput: string;  // HH:mm
  noteInput: string;
  dirty: boolean;
}

@Component({
  selector: 'app-teacher-attendance-admin',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, DatePickerModule, SelectModule, InputTextModule,
    TagModule, ToastModule, TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './teacher-attendance-admin.component.html',
  styleUrls: ['./teacher-attendance-admin.component.scss']
})
export class TeacherAttendanceAdminComponent implements OnInit, OnDestroy {
  private readonly attendanceService = inject(TeacherAttendanceService);
  private readonly messageService    = inject(MessageService);
  private readonly destroy$          = new Subject<void>();

  activeTab    = signal<'daily' | 'report'>('daily');
  isLoading    = signal(false);
  isSaving     = signal(false);
  rows         = signal<RowState[]>([]);
  selectedDate = new Date();

  isLoadingReport  = signal(false);
  monthlyReport    = signal<AdminMonthlyReportResponse | null>(null);
  selectedReportMonth = new Date().getMonth() + 1;
  selectedReportYear  = new Date().getFullYear();

  hasDirtyRows = computed(() => this.rows().some(row => row.dirty));

  readonly monthOptions = [
    { label: 'January', value: 1 },  { label: 'February', value: 2 },
    { label: 'March', value: 3 },    { label: 'April', value: 4 },
    { label: 'May', value: 5 },      { label: 'June', value: 6 },
    { label: 'July', value: 7 },     { label: 'August', value: 8 },
    { label: 'September', value: 9 }, { label: 'October', value: 10 },
    { label: 'November', value: 11 }, { label: 'December', value: 12 },
  ];

  readonly yearOptions: { label: string; value: number }[] = (() => {
    const current = new Date().getFullYear();
    return [current + 1, current, current - 1, current - 2]
      .map(y => ({ label: String(y), value: y }));
  })();

  readonly statusOptions: { label: string; value: AttendanceStatus }[] = [
    { label: 'Present',  value: 'PRESENT'  },
    { label: 'Absent',   value: 'ABSENT'   },
    { label: 'Half Day', value: 'HALF_DAY' },
    { label: 'Leave',    value: 'LEAVE'    },
  ];

  ngOnInit(): void {
    this.loadDaily();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDaily(): void {
    this.isLoading.set(true);
    const dateStr = this.formatDateParam(this.selectedDate);

    this.attendanceService.adminGetDaily(dateStr)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.rows.set(response.data.map(item => this.toRowState(item)));
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  markAllPresent(): void {
    this.rows.update(rows => rows.map(row => ({
      ...row,
      selectedStatus: 'PRESENT' as AttendanceStatus,
      dirty: true,
    })));
  }

  saveAll(): void {
    const dirtyRows = this.rows().filter(row => row.dirty);
    if (dirtyRows.length === 0) return;

    const invalidRow = dirtyRows.find(row => !row.selectedStatus);
    if (invalidRow) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Status Required',
        detail: `Please select a status for ${invalidRow.item.teacherName}.`,
      });
      return;
    }

    this.isSaving.set(true);

    const requests = dirtyRows.map(row =>
      this.attendanceService.adminMark(this.buildRequest(row))
    );

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Saved',
            detail: `${dirtyRows.length} record${dirtyRows.length > 1 ? 's' : ''} updated.`,
          });
          this.loadDaily();
        },
        error: (err: Error) => {
          this.isSaving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Save Failed', detail: err.message });
        }
      });
  }

  onStatusChange(row: RowState): void {
    if (row.selectedStatus === 'ABSENT' || row.selectedStatus === 'LEAVE') {
      row.checkInTimeInput  = '';
      row.checkOutTimeInput = '';
    }
    this.markDirty(row);
  }

  isTimeDisabled(row: RowState): boolean {
    return row.selectedStatus === 'ABSENT' || row.selectedStatus === 'LEAVE';
  }

  markDirty(row: RowState): void {
    row.dirty = true;
    // Trigger signal update so computed hasDirtyRows re-evaluates
    this.rows.update(rows => [...rows]);
  }

  statusSeverity(status: string | null): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    switch (status) {
      case 'PRESENT':  return 'success';
      case 'HALF_DAY': return 'warn';
      case 'ABSENT':   return 'danger';
      case 'LEAVE':    return 'info';
      default:         return 'secondary';
    }
  }

  trackByTeacherId(_index: number, row: RowState): string {
    return row.item.teacherId;
  }

  get reportMonthLabel(): string {
    const month = this.monthOptions.find(m => m.value === this.selectedReportMonth);
    return month ? `${month.label} ${this.selectedReportYear}` : '';
  }

  loadMonthlyReport(): void {
    this.isLoadingReport.set(true);
    this.attendanceService
      .adminGetMonthlyReport(this.selectedReportMonth, this.selectedReportYear)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.monthlyReport.set(response.data);
          this.isLoadingReport.set(false);
        },
        error: (err: Error) => {
          this.isLoadingReport.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  printReport(): void {
    window.print();
  }

  formatMinutes(minutes: number | null | undefined): string {
    if (!minutes) return '—';
    const hours = Math.floor(minutes / 60);
    const mins  = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins  === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  private buildRequest(row: RowState): AdminMarkAttendanceRequest {
    return {
      teacherId:    row.item.teacherId,
      date:         row.item.date,
      status:       row.selectedStatus!,
      checkInTime:  row.checkInTimeInput  ? this.combineDateTime(this.selectedDate, row.checkInTimeInput)  : null,
      checkOutTime: row.checkOutTimeInput ? this.combineDateTime(this.selectedDate, row.checkOutTimeInput) : null,
      note:         row.noteInput         || null,
    };
  }

  private toRowState(item: AdminDailyTeacherAttendanceItem): RowState {
    return {
      item,
      selectedStatus:   (item.status as AttendanceStatus) ?? null,
      checkInTimeInput:  item.checkInTime  ? this.toTimeInput(item.checkInTime)  : '',
      checkOutTimeInput: item.checkOutTime ? this.toTimeInput(item.checkOutTime) : '',
      noteInput:         item.note ?? '',
      dirty:             false,
    };
  }

  private toTimeInput(utcIso: string): string {
    const date = new Date(utcIso);
    const pad  = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private combineDateTime(date: Date, time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined.toISOString();
  }

  private formatDateParam(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
}
