import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TeacherService } from '../../services/teacher.service';
import { TenantContextService } from '../../services/tenant-context.service';
import { AuthService } from '../../services/auth.service';
import { TeacherDashboardData, TeacherBatchCard } from '../../models/teacher-dashboard.models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule, ToastModule],
  providers: [MessageService],
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.scss']
})
export class TeacherDashboardComponent implements OnInit, OnDestroy {
  private readonly teacherService  = inject(TeacherService);
  private readonly tenantContext   = inject(TenantContextService);
  private readonly authService     = inject(AuthService);
  private readonly router          = inject(Router);
  private readonly messageService  = inject(MessageService);
  private readonly destroy$        = new Subject<void>();

  readonly apiBase    = environment.apiBaseUrl.replace('/api', '');
  readonly today      = new Date();
  readonly todayLabel = this.today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  dashboard  = signal<TeacherDashboardData | null>(null);
  isLoading  = signal(true);
  hasError   = signal(false);

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboard(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.teacherService.getMyDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.dashboard.set(response.data);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.hasError.set(true);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  markAttendance(batch: TeacherBatchCard): void {
    this.router.navigate([this.tenantContext.authPath('attendance')], {
      queryParams: { batchId: batch.batchId }
    });
  }

  get initials(): string {
    return (this.dashboard()?.teacherName ?? '')
      .split(' ').slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('');
  }

  resolvePhoto(url: string | null): string | null {
    if (!url) return null;
    return url.startsWith('http') ? url : `${this.apiBase}${url}`;
  }

  trackByBatchId(_index: number, batch: TeacherBatchCard): string {
    return batch.batchId;
  }
}
