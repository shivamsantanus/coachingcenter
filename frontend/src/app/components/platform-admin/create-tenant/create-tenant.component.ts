import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PlatformAdminService } from '../../../services/platform-admin.service';

interface SelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-create-tenant',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, SelectModule],
  templateUrl: './create-tenant.component.html',
  styleUrls: ['./create-tenant.component.scss']
})
export class CreateTenantComponent implements OnDestroy {
  private readonly fb                   = inject(FormBuilder);
  private readonly platformAdminService = inject(PlatformAdminService);
  private readonly router               = inject(Router);
  private readonly destroy$             = new Subject<void>();

  private slugManuallyEdited = false;

  readonly orgTypes: SelectOption[] = [
    { label: 'Coaching Centre', value: 'COACHING_CENTRE' },
    { label: 'School',          value: 'SCHOOL'          },
    { label: 'Academy',         value: 'ACADEMY'         },
  ];

  readonly timezones: SelectOption[] = [
    { label: 'Asia/Kolkata (IST)',        value: 'Asia/Kolkata'     },
    { label: 'Asia/Dubai (GST)',          value: 'Asia/Dubai'       },
    { label: 'Asia/Singapore (SGT)',      value: 'Asia/Singapore'   },
    { label: 'Europe/London (GMT/BST)',   value: 'Europe/London'    },
    { label: 'America/New_York (EST)',    value: 'America/New_York' },
  ];

  readonly currencies: SelectOption[] = [
    { label: 'INR — Indian Rupee',   value: 'INR' },
    { label: 'USD — US Dollar',      value: 'USD' },
    { label: 'AED — UAE Dirham',     value: 'AED' },
    { label: 'SGD — Singapore Dollar', value: 'SGD' },
    { label: 'GBP — British Pound',  value: 'GBP' },
  ];

  readonly form = this.fb.group({
    name:                ['', [Validators.required, Validators.maxLength(100)]],
    slug:                ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/)]],
    organizationType:    ['', Validators.required],
    primaryContactName:  ['', [Validators.required, Validators.maxLength(100)]],
    primaryContactEmail: ['', [Validators.required, Validators.email]],
    primaryContactPhone: ['', [Validators.required, Validators.maxLength(20)]],
    brandName:           ['', [Validators.required, Validators.maxLength(100)]],
    logoUrl:             [''],
    timezone:            ['Asia/Kolkata', Validators.required],
    currencyCode:        ['INR', Validators.required],
  });

  readonly isLoading = signal(false);
  readonly errorMsg  = signal<string | null>(null);

  onNameInput(event: Event): void {
    if (this.slugManuallyEdited) return;
    const name = (event.target as HTMLInputElement).value;
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    this.form.get('slug')?.setValue(slug, { emitEvent: false });
  }

  onSlugInput(): void {
    this.slugManuallyEdited = true;
  }

  fieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName) as AbstractControl;
    return control.invalid && control.touched;
  }

  onSubmit(): void {
    if (this.form.invalid || this.isLoading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMsg.set(null);

    const raw = this.form.getRawValue();

    this.platformAdminService.createTenant({
      name:                raw.name!,
      slug:                raw.slug!,
      organizationType:    raw.organizationType!,
      primaryContactName:  raw.primaryContactName!,
      primaryContactEmail: raw.primaryContactEmail!,
      primaryContactPhone: raw.primaryContactPhone!,
      brandName:           raw.brandName!,
      logoUrl:             raw.logoUrl || null,
      timezone:            raw.timezone!,
      currencyCode:        raw.currencyCode!,
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  () => { this.isLoading.set(false); this.router.navigate(['/admin/tenants']); },
        error: (err: Error) => { this.isLoading.set(false); this.errorMsg.set(err.message); }
      });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
