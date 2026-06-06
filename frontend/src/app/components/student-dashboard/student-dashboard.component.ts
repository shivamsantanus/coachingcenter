import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';
import { StudentService } from '../../services/student.service';
import { AuthService } from '../../services/auth.service';
import { StudentDashboardData } from '../../models/student-dashboard.models';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, TagModule, ToastModule],
  providers: [MessageService],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.scss']
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  private readonly studentService  = inject(StudentService);
  private readonly authService     = inject(AuthService);
  private readonly messageService  = inject(MessageService);
  private readonly destroy$        = new Subject<void>();

  isLoading  = signal(true);
  dashboard  = signal<StudentDashboardData | null>(null);

  readonly today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  readonly initials = computed(() => {
    const name = this.dashboard()?.fullName ?? '';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  });

  resolvePhoto(photoUrl: string | null | undefined): string | null {
    if (!photoUrl) return null;
    if (photoUrl.startsWith('http')) return photoUrl;
    return environment.apiBaseUrl.replace(/\/api$/, '') + photoUrl;
  }

  attendanceColor(percentage: number): string {
    if (percentage >= 75) return 'success';
    if (percentage >= 50) return 'warn';
    return 'danger';
  }

  ngOnInit(): void {
    this.studentService.getMyDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.dashboard.set(response.data);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          this.isLoading.set(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
