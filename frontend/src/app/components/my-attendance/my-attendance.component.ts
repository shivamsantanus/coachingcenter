import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { TeacherAttendanceService } from '../../services/teacher-attendance.service';
import { TeacherAttendanceReportResponse, TeacherAttendanceHistoryItem } from '../../models/teacher-attendance.models';

interface MonthOption { label: string; value: number; }
interface YearOption  { label: string; value: number; }

@Component({
  selector: 'app-my-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule, TagModule, ToastModule],
  providers: [MessageService, DatePipe],
  templateUrl: './my-attendance.component.html',
  styleUrls: ['./my-attendance.component.scss']
})
export class MyAttendanceComponent implements OnInit, OnDestroy {
  private readonly attendanceService = inject(TeacherAttendanceService);
  private readonly messageService    = inject(MessageService);
  private readonly datePipe          = inject(DatePipe);
  private readonly destroy$          = new Subject<void>();

  isLoading = signal(false);
  report    = signal<TeacherAttendanceReportResponse | null>(null);

  readonly months: MonthOption[] = [
    { label: 'January',   value: 1  }, { label: 'February', value: 2  },
    { label: 'March',     value: 3  }, { label: 'April',    value: 4  },
    { label: 'May',       value: 5  }, { label: 'June',     value: 6  },
    { label: 'July',      value: 7  }, { label: 'August',   value: 8  },
    { label: 'September', value: 9  }, { label: 'October',  value: 10 },
    { label: 'November',  value: 11 }, { label: 'December', value: 12 },
  ];

  readonly years: YearOption[] = this.buildYearOptions();

  selectedMonth = new Date().getMonth() + 1;
  selectedYear  = new Date().getFullYear();

  ngOnInit(): void {
    this.loadReport();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReport(): void {
    this.isLoading.set(true);
    this.attendanceService.getMyReport(this.selectedMonth, this.selectedYear)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.report.set(response.data);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  printReport(): void {
    window.print();
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

  statusLabel(status: string | null): string {
    switch (status) {
      case 'PRESENT':  return 'Present';
      case 'HALF_DAY': return 'Half Day';
      case 'ABSENT':   return 'Absent';
      case 'LEAVE':    return 'Leave';
      default:         return '—';
    }
  }

  formatMinutes(minutes: number | null): string {
    if (minutes === null) return '—';
    const hours = Math.floor(minutes / 60);
    const mins  = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  trackByDate(_index: number, record: TeacherAttendanceHistoryItem): string {
    return record.date;
  }

  private buildYearOptions(): YearOption[] {
    const current = new Date().getFullYear();
    return Array.from({ length: 3 }, (_, i) => {
      const year = current - i;
      return { label: String(year), value: year };
    });
  }
}
