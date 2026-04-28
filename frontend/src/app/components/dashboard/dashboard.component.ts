import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent {
  private authService = inject(AuthService);

  context = this.authService.getContext();

  stats = [
    { label: 'Total Students',  icon: 'pi-users',          value: '—', color: '#6366f1' },
    { label: 'Teachers',        icon: 'pi-graduation-cap', value: '—', color: '#10b981' },
    { label: 'Active Batches',  icon: 'pi-book',           value: '—', color: '#f59e0b' },
    { label: 'Fees Due',        icon: 'pi-wallet',         value: '—', color: '#ef4444' },
  ];
}
