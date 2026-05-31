import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { BranchService } from '../../../services/branch.service';
import { AuthService } from '../../../services/auth.service';
import { BranchSummary, CreateBranchRequest, UpdateBranchRequest } from '../../../models/academic.models';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    ButtonModule, InputTextModule, TagModule, ToastModule, TooltipModule, DialogModule
  ],
  providers: [MessageService],
  templateUrl: './branches.component.html',
  styleUrls: ['./branches.component.scss']
})
export class BranchesComponent implements OnInit, OnDestroy {
  private readonly branchService  = inject(BranchService);
  private readonly authService    = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder    = inject(FormBuilder);
  private readonly destroy$       = new Subject<void>();

  readonly branches    = signal<BranchSummary[]>([]);
  readonly isLoading   = signal(false);
  readonly showDialog  = signal(false);
  readonly editBranchId = signal<string | null>(null);
  readonly togglingId  = signal<string | null>(null);
  readonly isSaving    = signal(false);

  readonly isOrgAdmin = this.authService.getRole() === 'ORG_ADMIN';

  branchForm!: FormGroup;

  ngOnInit(): void {
    this.branchForm = this.formBuilder.group({
      name:    ['', [Validators.required, Validators.maxLength(150)]],
      code:    ['', [Validators.maxLength(50)]],
      address: ['', [Validators.maxLength(500)]],
      phone:   ['', [Validators.maxLength(20)]],
      mapUrl:  ['', [Validators.maxLength(500)]]
    });

    this.loadBranches();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBranches(): void {
    this.isLoading.set(true);
    this.branchService.listBranches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.branches.set(response.data);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  openAddDialog(): void {
    this.editBranchId.set(null);
    this.branchForm.reset({ name: '', code: '', address: '', phone: '' });
    this.showDialog.set(true);
  }

  openEditDialog(branch: BranchSummary): void {
    this.editBranchId.set(branch.id);
    this.branchForm.setValue({
      name:    branch.name,
      code:    branch.code    ?? '',
      address: branch.address ?? '',
      phone:   branch.phone   ?? '',
      mapUrl:  branch.mapUrl  ?? ''
    });
    this.showDialog.set(true);
  }

  closeDialog(): void {
    this.showDialog.set(false);
    this.editBranchId.set(null);
    this.branchForm.reset();
  }

  saveBranch(): void {
    if (this.branchForm.invalid) {
      this.branchForm.markAllAsTouched();
      return;
    }

    const raw = this.branchForm.value as { name: string; code: string; address: string; phone: string; mapUrl: string };
    const editId = this.editBranchId();
    this.isSaving.set(true);

    if (editId) {
      const req: UpdateBranchRequest = {
        name:    raw.name.trim(),
        code:    raw.code.trim()    || null,
        address: raw.address.trim() || null,
        phone:   raw.phone.trim()   || null,
        mapUrl:  raw.mapUrl.trim()  || null
      };
      this.branchService.updateBranch(editId, req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.messageService.add({ severity: 'success', summary: 'Updated', detail: `"${raw.name}" has been updated.` });
            this.closeDialog();
            this.loadBranches();
          },
          error: (err: Error) => {
            this.isSaving.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          }
        });
    } else {
      const req: CreateBranchRequest = {
        name:    raw.name.trim(),
        code:    raw.code.trim()    || null,
        address: raw.address.trim() || null,
        phone:   raw.phone.trim()   || null,
        mapUrl:  raw.mapUrl.trim()  || null
      };
      this.branchService.createBranch(req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.messageService.add({ severity: 'success', summary: 'Created', detail: `"${raw.name}" has been added.` });
            this.closeDialog();
            this.loadBranches();
          },
          error: (err: Error) => {
            this.isSaving.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          }
        });
    }
  }

  toggleStatus(branch: BranchSummary): void {
    if (this.togglingId()) return;

    const newStatus: 'ACTIVE' | 'INACTIVE' = branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.togglingId.set(branch.id);

    this.branchService.updateBranchStatus(branch.id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.togglingId.set(null);
          this.branches.update(list =>
            list.map(b => b.id === branch.id ? { ...b, status: newStatus } : b)
          );
          this.messageService.add({
            severity: 'success',
            summary: 'Status updated',
            detail: `"${branch.name}" is now ${newStatus.toLowerCase()}.`
          });
        },
        error: (err: Error) => {
          this.togglingId.set(null);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.branchForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  get dialogTitle(): string {
    return this.editBranchId() ? 'Edit Branch' : 'Add Branch';
  }
}
