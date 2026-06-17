import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { FeeService } from '../../../services/fee.service';
import { BatchService } from '../../../services/batch.service';
import { BranchService } from '../../../services/branch.service';
import { FeePlan, FeeCategory, FeeFrequency } from '../../../models/fee.models';

interface SelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-fee-plans-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    InputNumberModule,
    TagModule,
    ToastModule,
    TooltipModule,
    DialogModule,
  ],
  providers: [MessageService],
  templateUrl: './fee-plans-tab.component.html',
  styleUrls: ['./fee-plans-tab.component.scss'],
})
export class FeePlansTabComponent implements OnInit, OnDestroy {
  private feeService     = inject(FeeService);
  private batchService   = inject(BatchService);
  private branchService  = inject(BranchService);
  private messageService = inject(MessageService);
  private formBuilder    = inject(FormBuilder);
  private destroy$       = new Subject<void>();

  readonly feePlans   = signal<FeePlan[]>([]);
  readonly isLoading  = signal(false);
  readonly showDialog = signal(false);
  readonly editPlanId = signal<string | null>(null);
  readonly isSaving   = signal(false);
  readonly togglingId = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);

  readonly categoryOptions: SelectOption[] = [
    { label: 'Tuition',   value: 'TUITION'   },
    { label: 'Admission', value: 'ADMISSION' },
    { label: 'Exam',      value: 'EXAM'      },
    { label: 'Transport', value: 'TRANSPORT' },
  ];

  readonly frequencyOptions: SelectOption[] = [
    { label: 'Monthly',   value: 'MONTHLY'   },
    { label: 'Quarterly', value: 'QUARTERLY' },
    { label: 'One Time',  value: 'ONE_TIME'  },
  ];

  readonly branchOptions = signal<SelectOption[]>([]);
  readonly batchOptions  = signal<SelectOption[]>([]);

  readonly planForm: FormGroup = this.formBuilder.group({
    name:      ['', [Validators.required, Validators.maxLength(200)]],
    category:  ['TUITION', Validators.required],
    frequency: ['MONTHLY', Validators.required],
    amount:    [null, [Validators.required, Validators.min(0.01)]],
    dueDay:    [null],
    branchId:  [null],
    batchId:   [null],
  });

  get isOneTime(): boolean { return this.planForm.get('frequency')?.value === 'ONE_TIME'; }
  get nameControl()      { return this.planForm.get('name'); }
  get amountControl()    { return this.planForm.get('amount'); }
  get dueDayControl()    { return this.planForm.get('dueDay'); }
  get frequencyControl() { return this.planForm.get('frequency'); }
  get dialogTitle(): string { return this.editPlanId() ? 'Edit Fee Plan' : 'Add Fee Plan'; }

  ngOnInit(): void {
    this.loadFeePlans();
    this.loadDropdownData();

    this.frequencyControl?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(freq => {
      if (freq === 'ONE_TIME') {
        this.planForm.get('dueDay')?.clearValidators();
        this.planForm.get('dueDay')?.setValue(null);
      } else {
        this.planForm.get('dueDay')?.setValidators([Validators.required, Validators.min(1), Validators.max(28)]);
      }
      this.planForm.get('dueDay')?.updateValueAndValidity();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFeePlans(): void {
    this.isLoading.set(true);
    this.feeService.getFeePlans().pipe(takeUntil(this.destroy$)).subscribe({
      next: plans => { this.feePlans.set(plans); this.isLoading.set(false); },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
      },
    });
  }

  private loadDropdownData(): void {
    this.branchService.listBranches().pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        if (response.success && response.data) {
          this.branchOptions.set(response.data.map(b => ({ label: b.name, value: b.id })));
        }
      },
      error: () => {},
    });

    this.batchService.listBatches().pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        if (response.success && response.data) {
          this.batchOptions.set(response.data.map(b => ({ label: b.name, value: b.id })));
        }
      },
      error: () => {},
    });
  }

  openAddDialog(): void {
    this.editPlanId.set(null);
    this.planForm.reset({ name: '', category: 'TUITION', frequency: 'MONTHLY', amount: null, dueDay: null, branchId: null, batchId: null });
    this.showDialog.set(true);
  }

  openEditDialog(plan: FeePlan): void {
    this.editPlanId.set(plan.id);
    this.planForm.reset({
      name:      plan.name,
      category:  plan.category,
      frequency: plan.frequency,
      amount:    plan.amount,
      dueDay:    plan.dueDay,
      branchId:  plan.branchId,
      batchId:   plan.batchId,
    });
    this.showDialog.set(true);
  }

  closeDialog(): void { this.showDialog.set(false); }

  savePlan(): void {
    if (this.planForm.invalid) { this.planForm.markAllAsTouched(); return; }

    const formValue = this.planForm.value;
    const editId    = this.editPlanId();

    this.isSaving.set(true);

    const payload = {
      name:      (formValue.name as string).trim(),
      category:  formValue.category  as FeeCategory,
      frequency: formValue.frequency as FeeFrequency,
      amount:    formValue.amount    as number,
      dueDay:    formValue.frequency === 'ONE_TIME' ? null : (formValue.dueDay as number | null),
      branchId:  (formValue.branchId as string | null) ?? null,
      batchId:   (formValue.batchId  as string | null) ?? null,
    };

    const action$ = editId
      ? this.feeService.updateFeePlan(editId, payload)
      : this.feeService.createFeePlan(payload);

    action$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showDialog.set(false);
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: editId ? 'Fee plan updated.' : 'Fee plan created.' });
        this.loadFeePlans();
      },
      error: (err: Error) => {
        this.isSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
      },
    });
  }

  toggleStatus(plan: FeePlan): void {
    if (this.togglingId()) return;
    this.togglingId.set(plan.id);

    this.feeService.toggleFeePlanStatus(plan.id, !plan.isActive).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.togglingId.set(null);
        this.feePlans.update(list => list.map(p => p.id === plan.id ? { ...p, isActive: !plan.isActive } : p));
      },
      error: (err: Error) => {
        this.togglingId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
      },
    });
  }

  deletePlan(plan: FeePlan): void {
    if (this.deletingId()) return;
    this.deletingId.set(plan.id);

    this.feeService.deleteFeePlan(plan.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.feePlans.update(list => list.filter(p => p.id !== plan.id));
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `"${plan.name}" removed.` });
      },
      error: (err: Error) => {
        this.deletingId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
      },
    });
  }

  categoryLabel(category: string): string {
    const labels: Record<string, string> = { TUITION: 'Tuition', ADMISSION: 'Admission', EXAM: 'Exam', TRANSPORT: 'Transport' };
    return labels[category] ?? category;
  }

  frequencyLabel(frequency: string): string {
    const labels: Record<string, string> = { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', ONE_TIME: 'One Time' };
    return labels[frequency] ?? frequency;
  }
}
