import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BrandingService } from '../../services/branding.service';
import { TenantContextService } from '../../services/tenant-context.service';

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
  private readonly authService     = inject(AuthService);
  private readonly brandingService = inject(BrandingService);
  private readonly router          = inject(Router);
  readonly tenantContext            = inject(TenantContextService);

  context = this.authService.getContext();

  ngOnInit(): void {
    const slug = this.context?.tenantSlug;
    if (slug) {
      this.tenantContext.setContext(slug, this.tenantContext.isCustomDomain());
      this.brandingService.loadBranding(slug).subscribe();
    }
  }

  readonly navItems = computed<NavItem[]>(() => {
    const p = (page: string) => this.tenantContext.authPath(page);
    return [
      { label: 'Dashboard', icon: 'pi-home',          route: p('dashboard')         },
      { label: 'Students',  icon: 'pi-users',          route: p('students'),  roles: ['ORG_ADMIN', 'TEACHER'] },
      { label: 'Teachers',  icon: 'pi-graduation-cap', route: p('teachers'),  roles: ['ORG_ADMIN']            },
      { label: 'Academic',  icon: 'pi-book',           route: p('academic'),  roles: ['ORG_ADMIN', 'TEACHER'] },
      { label: 'Fees',      icon: 'pi-wallet',         route: p('fees'),      roles: ['ORG_ADMIN', 'STUDENT'] },
      { label: 'Exams',     icon: 'pi-file-edit',      route: p('exams'),     roles: ['ORG_ADMIN', 'TEACHER', 'STUDENT'] },
      { label: 'Timetable', icon: 'pi-calendar',       route: p('timetable')         },
      { label: 'Settings',  icon: 'pi-cog',            route: p('settings'),  roles: ['ORG_ADMIN']            },
    ];
  });

  readonly visibleNavItems = computed<NavItem[]>(() => {
    const role = this.context?.role;
    return this.navItems().filter(item =>
      !item.roles || (role && item.roles.includes(role))
    );
  });

  trackNavItem(_index: number, item: NavItem): string {
    return item.label;
  }

  logout(): void {
    const landingUrl = this.tenantContext.landingUrl;
    this.authService.logout();
    this.router.navigate([landingUrl]);
  }
}
