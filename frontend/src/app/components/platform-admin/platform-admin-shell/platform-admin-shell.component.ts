import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

interface AdminNavItem {
  label: string;
  icon:  string;
  route: string;
}

@Component({
  selector: 'app-platform-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './platform-admin-shell.component.html',
  styleUrls: ['./platform-admin-shell.component.scss']
})
export class PlatformAdminShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);

  readonly context = this.authService.getContext();

  readonly navItems: AdminNavItem[] = [
    { label: 'Tenants', icon: 'pi-building', route: '/admin/tenants' },
  ];

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin/login']);
  }
}
