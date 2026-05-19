import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { BrandingService } from '../../services/branding.service';
import { TenantBranding, TeacherPreview } from '../../models/branding.models';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss']
})
export class LandingPageComponent implements OnInit, OnDestroy {
  private readonly route           = inject(ActivatedRoute);
  private readonly router          = inject(Router);
  private readonly brandingService = inject(BrandingService);
  private readonly sanitizer       = inject(DomSanitizer);
  private readonly destroy$        = new Subject<void>();

  readonly branding   = signal<TenantBranding | null>(null);
  readonly teachers   = signal<TeacherPreview[]>([]);
  readonly notFound   = signal(false);
  readonly isLoading  = this.brandingService.isLoading;

  private slug = '';

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        this.slug = params.get('slug') ?? '';
        return this.brandingService.loadBranding(this.slug);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: brandingData => {
        if (!brandingData) {
          this.notFound.set(true);
          return;
        }
        this.branding.set(brandingData);
        if (brandingData.landingPage?.teachersSection?.isVisible) {
          this.loadTeachers();
        }
      },
      error: () => this.notFound.set(true)
    });
  }

  private loadTeachers(): void {
    this.brandingService.loadTeachersPreview(this.slug)
      .pipe(takeUntil(this.destroy$))
      .subscribe(teacherList => this.teachers.set(teacherList));
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  safeMapUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  onImageError(event: Event): void {
    (event.target as HTMLElement).closest('.gallery-item')?.classList.add('hidden');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
