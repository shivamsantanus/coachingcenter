import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';
import { StudentService } from '../../services/student.service';
import { ReceiptService } from '../../services/receipt.service';
import { AuthService } from '../../services/auth.service';
import { StudentDashboardData, StudentFeesData, StudentFeePlanSummary } from '../../models/student-dashboard.models';
import { PaymentRecord } from '../../models/fee.models';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, TagModule, ToastModule, TabsModule, ButtonModule, TooltipModule],
  providers: [MessageService],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.scss']
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  private readonly studentService = inject(StudentService);
  private readonly receiptService = inject(ReceiptService);
  private readonly authService    = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$       = new Subject<void>();

  // ── Overview state ────────────────────────────────────────────────────────
  isLoading = signal(true);
  dashboard = signal<StudentDashboardData | null>(null);

  readonly today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  readonly initials = computed(() => {
    const name = this.dashboard()?.fullName ?? '';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  });

  // ── Tabs state ────────────────────────────────────────────────────────────
  readonly activeTab = signal<string>('overview');

  // ── Fees state ────────────────────────────────────────────────────────────
  readonly feesData     = signal<StudentFeesData | null>(null);
  readonly isLoadingFees = signal(false);
  readonly feesLoaded   = signal(false);
  readonly feesError    = signal<string | null>(null);

  readonly totalPaidOverall = computed(() => this.feesData()?.totalPaidOverall ?? 0);

  ngOnInit(): void {
    this.studentService.getMyDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.dashboard.set(response.data);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          this.isLoading.set(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTabChange(tabId: string | number): void {
    const tabValue = String(tabId);
    this.activeTab.set(tabValue);
    if (tabValue === 'fees' && !this.feesLoaded()) {
      this.loadFees();
    }
  }

  private loadFees(): void {
    this.isLoadingFees.set(true);
    this.feesError.set(null);
    this.studentService.getMyFees()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.feesData.set(response.data);
          this.feesLoaded.set(true);
          this.isLoadingFees.set(false);
        },
        error: (err: Error) => {
          this.feesError.set(err.message);
          this.isLoadingFees.set(false);
        }
      });
  }

  resolvePhoto(photoUrl: string | null | undefined): string | null {
    if (!photoUrl) return null;
    if (photoUrl.startsWith('http')) return photoUrl;
    return environment.apiBaseUrl.replace(/\/api$/, '') + photoUrl;
  }

  attendanceColor(percentage: number): string {
    if (percentage >= 75) return 'success';
    if (percentage >= 50) return 'warn';
    return 'danger';
  }

  printReceipt(payment: PaymentRecord): void {
    this.receiptService.printReceipt(payment);
  }

  frequencyLabel(frequency: string): string {
    const labels: Record<string, string> = {
      MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', ONE_TIME: 'One-time'
    };
    return labels[frequency] ?? frequency;
  }

  categoryLabel(category: string): string {
    return category.charAt(0) + category.slice(1).toLowerCase();
  }

  methodLabel(method: string): string {
    const labels: Record<string, string> = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', BANK: 'Bank' };
    return labels[method] ?? method;
  }

  planHasPayments(plan: StudentFeePlanSummary): boolean {
    return plan.paymentCount > 0;
  }
}
