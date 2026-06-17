import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { TeacherDashboardComponent } from '../teacher-dashboard/teacher-dashboard.component';
import { StudentDashboardComponent } from '../student-dashboard/student-dashboard.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TeacherDashboardComponent, StudentDashboardComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private authService      = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private destroy$         = new Subject<void>();

  context = this.authService.getContext();
  role    = this.context?.role ?? '';

  stats = [
    { label: 'Total Students',        icon: 'pi-users',          value: signal('—'), color: '#6366f1' },
    { label: 'Teachers',              icon: 'pi-graduation-cap', value: signal('—'), color: '#10b981' },
    { label: 'Active Batches',        icon: 'pi-book',           value: signal('—'), color: '#f59e0b' },
    { label: 'Fees This Month (₹)',   icon: 'pi-wallet',         value: signal('—'), color: '#ef4444' },
  ];

  ngOnInit(): void {
    if (this.role === 'ORG_ADMIN') {
      this.loadStats();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStats(): void {
    this.dashboardService.getStats().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: stats => {
        this.stats[0].value.set(stats.totalActiveStudents.toString());
        this.stats[1].value.set(stats.totalActiveTeachers.toString());
        this.stats[2].value.set(stats.totalActiveBatches.toString());
        this.stats[3].value.set(
          stats.feesCollectedThisMonth.toLocaleString('en-IN', { maximumFractionDigits: 0 })
        );
      },
      error: () => {
        // Values stay as '—' on error — no silent swallow, error is in the observable chain
      }
    });
  }
}
