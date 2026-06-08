import { Component, OnInit, OnDestroy, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { BrandingService } from '../../services/branding.service';
import { NavigationService } from '../../services/navigation.service';
import { TenantContextService } from '../../services/tenant-context.service';
import { NavItem } from '../../models/navigation.models';
import { ChangePasswordComponent } from '../change-password/change-password.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, ChangePasswordComponent],
  templateUrl: './shell.html',
  styleUrls: ['./shell.scss']
})
export class ShellComponent implements OnInit, OnDestroy {
  private readonly authService        = inject(AuthService);
  private readonly brandingService    = inject(BrandingService);
  private readonly navigationService  = inject(NavigationService);
  private readonly router             = inject(Router);
  private readonly destroy$           = new Subject<void>();

  readonly tenantContext = inject(TenantContextService);

  context      = this.authService.getContext();
  navItems     = signal<NavItem[]>([]);
  navLoaded    = signal(false);
  isFirstLogin = signal(this.authService.getContext()?.isFirstLogin === true);
  sidebarOpen  = signal(false);

  ngOnInit(): void {
    const slug = this.context?.tenantSlug;
    if (slug) {
      this.tenantContext.setContext(slug, this.tenantContext.isCustomDomain());
      this.brandingService.loadBranding(slug).subscribe();
    }

    this.loadNavigation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadNavigation(): void {
    this.navigationService.getMyNav()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.navItems.set(response.data ?? []);
          this.navLoaded.set(true);
        },
        error: () => {
          // Fallback — show just Dashboard if API fails so user isn't locked out
          this.navItems.set([{
            key: 'dashboard', label: 'Dashboard',
            icon: 'pi-home', routePath: 'dashboard',
            sortOrder: 1, isLocked: true
          }]);
          this.navLoaded.set(true);
        }
      });
  }

  navRoute(item: NavItem): string {
    return this.tenantContext.authPath(item.routePath);
  }

  trackNavItem(_index: number, item: NavItem): string {
    return item.key;
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (window.innerWidth >= 768) {
      this.sidebarOpen.set(false);
    }
  }

  logout(): void {
    const landingUrl = this.tenantContext.landingUrl;
    this.authService.logout();
    this.router.navigate([landingUrl]);
  }
}
