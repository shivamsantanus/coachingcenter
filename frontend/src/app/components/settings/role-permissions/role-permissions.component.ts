import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { NavigationService } from '../../../services/navigation.service';
import { NavMatrixRow } from '../../../models/navigation.models';

@Component({
  selector: 'app-role-permissions',
  standalone: true,
  imports: [CommonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './role-permissions.component.html',
  styleUrls: ['./role-permissions.component.scss']
})
export class RolePermissionsComponent implements OnInit, OnDestroy {
  private readonly navigationService = inject(NavigationService);
  private readonly messageService    = inject(MessageService);
  private readonly destroy$          = new Subject<void>();

  matrixRows  = signal<NavMatrixRow[]>([]);
  isLoading   = signal(true);
  savingKey   = signal<string | null>(null); // tracks which cell is saving

  readonly managedRoles = [
    { code: 'TEACHER', label: 'Teacher' },
    { code: 'STUDENT', label: 'Student' }
  ];

  ngOnInit(): void {
    this.loadMatrix();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMatrix(): void {
    this.isLoading.set(true);
    this.navigationService.getPermissions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.matrixRows.set(response.data ?? []);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          this.isLoading.set(false);
        }
      });
  }

  isEnabled(row: NavMatrixRow, roleCode: string): boolean {
    return row.permissions.find(p => p.roleCode === roleCode)?.isEnabled ?? false;
  }

  toggle(row: NavMatrixRow, roleCode: string): void {
    if (row.isLocked) return;

    const currentValue = this.isEnabled(row, roleCode);
    const cellKey = `${row.key}-${roleCode}`;

    // Optimistically update the UI
    this.matrixRows.update(rows =>
      rows.map(r => r.key !== row.key ? r : {
        ...r,
        permissions: r.permissions.map(p =>
          p.roleCode !== roleCode ? p : { ...p, isEnabled: !currentValue }
        )
      })
    );

    this.savingKey.set(cellKey);
    this.navigationService.updatePermission({
      roleCode,
      navItemKey: row.key,
      isEnabled: !currentValue
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.savingKey.set(null);
        this.messageService.add({
          severity: 'success',
          summary: 'Saved',
          detail: `${row.label} ${!currentValue ? 'enabled' : 'disabled'} for ${roleCode === 'TEACHER' ? 'Teachers' : 'Students'}.`,
          life: 2000
        });
      },
      error: (err: Error) => {
        // Revert optimistic update on failure
        this.matrixRows.update(rows =>
          rows.map(r => r.key !== row.key ? r : {
            ...r,
            permissions: r.permissions.map(p =>
              p.roleCode !== roleCode ? p : { ...p, isEnabled: currentValue }
            )
          })
        );
        this.savingKey.set(null);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
      }
    });
  }

  isSaving(row: NavMatrixRow, roleCode: string): boolean {
    return this.savingKey() === `${row.key}-${roleCode}`;
  }

  trackByKey(_index: number, row: NavMatrixRow): string {
    return row.key;
  }
}
