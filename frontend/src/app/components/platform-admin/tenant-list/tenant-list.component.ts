import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { PlatformAdminService } from '../../../services/platform-admin.service';
import { TenantSummary } from '../../../models/tenant-admin.models';

@Component({
  selector: 'app-tenant-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, TableModule, TagModule, InputTextModule, DialogModule, TooltipModule],
  templateUrl: './tenant-list.component.html',
  styleUrls: ['./tenant-list.component.scss']
})
export class TenantListComponent implements OnInit, OnDestroy {
  private readonly platformAdminService = inject(PlatformAdminService);
  private readonly router               = inject(Router);
  private readonly destroy$             = new Subject<void>();

  readonly tenants         = signal<TenantSummary[]>([]);
  readonly isLoading       = signal(true);
  readonly errorMsg        = signal<string | null>(null);
  readonly deleteTarget    = signal<TenantSummary | null>(null);
  readonly actionInFlight  = signal<string | null>(null); // holds tenant id while request runs

  ngOnInit(): void {
    this.loadTenants();
  }

  private loadTenants(): void {
    this.isLoading.set(true);
    this.errorMsg.set(null);

    this.platformAdminService.getTenants()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  tenants => { this.tenants.set(tenants); this.isLoading.set(false); },
        error: (err: Error) => { this.errorMsg.set(err.message); this.isLoading.set(false); }
      });
  }

  toggleStatus(tenant: TenantSummary): void {
    const newStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    this.actionInFlight.set(tenant.id);

    this.platformAdminService.updateTenantStatus(tenant.id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.actionInFlight.set(null);
          this.tenants.update(list =>
            list.map(t => t.id === tenant.id ? { ...t, status: newStatus } : t)
          );
        },
        error: (err: Error) => { this.actionInFlight.set(null); this.errorMsg.set(err.message); }
      });
  }

  confirmDelete(tenant: TenantSummary): void {
    this.deleteTarget.set(tenant);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  executeDelete(): void {
    const tenant = this.deleteTarget();
    if (!tenant) return;

    this.actionInFlight.set(tenant.id);
    this.deleteTarget.set(null);

    this.platformAdminService.deleteTenant(tenant.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.actionInFlight.set(null);
          this.tenants.update(list => list.filter(t => t.id !== tenant.id));
        },
        error: (err: Error) => { this.actionInFlight.set(null); this.errorMsg.set(err.message); }
      });
  }

  formatOrgType(type: string): string {
    return type.replace(/_/g, ' ').toLowerCase()
      .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  statusSeverity(status: string): 'success' | 'warn' | 'info' | 'danger' | 'secondary' {
    const map: Record<string, 'success' | 'warn' | 'info' | 'danger' | 'secondary'> = {
      ACTIVE:    'success',
      SUSPENDED: 'warn',
      TRIAL:     'info',
    };
    return map[status] ?? 'secondary';
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
