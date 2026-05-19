import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BrandingService } from '../../services/branding.service';
import { TenantBranding } from '../../models/branding.models';

@Component({
  selector: 'app-tenant-auth',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './tenant-auth.component.html',
  styleUrls: ['./tenant-auth.component.scss']
})
export class TenantAuthComponent implements OnInit, OnDestroy {
  private readonly route           = inject(ActivatedRoute);
  private readonly router          = inject(Router);
  private readonly brandingService = inject(BrandingService);
  private readonly destroy$        = new Subject<void>();

  readonly branding  = this.brandingService.branding;
  readonly isLoading = this.brandingService.isLoading;
  readonly notFound  = signal(false);

  ngOnInit(): void {
    const slug = this.resolveSlug();
    if (!slug) { this.notFound.set(true); return; }

    this.brandingService.loadBranding(slug)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  data  => { if (!data) this.notFound.set(true); },
        error: ()    => this.notFound.set(true)
      });
  }

  navigateToLanding(): void {
    const slug = this.resolveSlug();
    if (slug) this.router.navigate(['/t', slug]);
  }

  private resolveSlug(): string {
    let route = this.route.snapshot;
    while (route) {
      const slug = route.paramMap.get('slug');
      if (slug) return slug;
      if (!route.parent) break;
      route = route.parent;
    }
    return '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
