import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { TeacherDashboardComponent } from '../teacher-dashboard/teacher-dashboard.component';
import { StudentDashboardComponent } from '../student-dashboard/student-dashboard.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TeacherDashboardComponent, StudentDashboardComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent {
  private authService = inject(AuthService);

  context = this.authService.getContext();
  role    = this.context?.role ?? '';

  stats = [
    { label: 'Total Students',  icon: 'pi-users',          value: '—', color: '#6366f1' },
    { label: 'Teachers',        icon: 'pi-graduation-cap', value: '—', color: '#10b981' },
    { label: 'Active Batches',  icon: 'pi-book',           value: '—', color: '#f59e0b' },
    { label: 'Fees Due',        icon: 'pi-wallet',         value: '—', color: '#ef4444' },
  ];
}
