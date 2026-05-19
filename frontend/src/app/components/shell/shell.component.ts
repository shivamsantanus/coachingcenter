import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BrandingService } from '../../services/branding.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './shell.html',
  styleUrls: ['./shell.scss']
})
export class ShellComponent implements OnInit {
  private readonly authService    = inject(AuthService);
  private readonly brandingService = inject(BrandingService);
  private readonly router         = inject(Router);

  context = this.authService.getContext();

  ngOnInit(): void {
    const slug = this.context?.tenantSlug;
    if (slug) {
      this.brandingService.loadBranding(slug).subscribe();
    }
  }

  navItems: NavItem[] = [
    { label: 'Dashboard',  icon: 'pi-home',          route: '/dashboard' },
    { label: 'Students',   icon: 'pi-users',          route: '/students',  roles: ['ORG_ADMIN', 'TEACHER'] },
    { label: 'Teachers',   icon: 'pi-graduation-cap', route: '/teachers',  roles: ['ORG_ADMIN'] },
    { label: 'Academic',   icon: 'pi-book',           route: '/academic',  roles: ['ORG_ADMIN', 'TEACHER'] },
    { label: 'Fees',       icon: 'pi-wallet',         route: '/fees',      roles: ['ORG_ADMIN', 'STUDENT'] },
    { label: 'Exams',      icon: 'pi-file-edit',      route: '/exams',     roles: ['ORG_ADMIN', 'TEACHER', 'STUDENT'] },
    { label: 'Timetable',  icon: 'pi-calendar',       route: '/timetable' },
    { label: 'Settings',   icon: 'pi-cog',            route: '/settings',  roles: ['ORG_ADMIN'] },
  ];

  get visibleNavItems(): NavItem[] {
    const role = this.context?.role;
    return this.navItems.filter(item =>
      !item.roles || (role && item.roles.includes(role))
    );
  }

  get tenantHomeUrl(): string {
    return `/t/${this.context?.tenantSlug ?? ''}`;
  }

  logout(): void {
    const slug = this.context?.tenantSlug ?? '';
    this.authService.logout();
    this.router.navigate([`/t/${slug}`]);
  }
}
