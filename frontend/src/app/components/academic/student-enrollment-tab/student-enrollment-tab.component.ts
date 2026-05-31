import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { StudentEnrollmentService } from '../../../services/student-enrollment.service';
import { StudentService } from '../../../services/student.service';
import { AcademicYearService } from '../../../services/academic-year.service';
import { BatchService } from '../../../services/batch.service';
import { AuthService } from '../../../services/auth.service';
import {
  StudentEnrollmentSummary,
  AcademicYearSummary,
  BatchSummary,
  BulkEnrollRequest
} from '../../../models/academic.models';
import { StudentSummary } from '../../../models/student.models';

interface SelectOption { label: string; value: string; }

@Component({
  selector: 'app-student-enrollment-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, SelectModule, CheckboxModule,
    ToastModule, TooltipModule, DialogModule
  ],
  providers: [MessageService],
  templateUrl: './student-enrollment-tab.component.html',
  styleUrls: ['./student-enrollment-tab.component.scss']
})
export class StudentEnrollmentTabComponent implements OnInit, OnDestroy {
  private readonly enrollmentService   = inject(StudentEnrollmentService);
  private readonly studentService      = inject(StudentService);
  private readonly academicYearService = inject(AcademicYearService);
  private readonly batchService        = inject(BatchService);
  private readonly authService         = inject(AuthService);
  private readonly messageService      = inject(MessageService);
  private readonly destroy$            = new Subject<void>();

  // ── Filters ──────────────────────────────────────────────────────────────────
  readonly ayOptions     = signal<SelectOption[]>([]);
  readonly batchOptions  = signal<SelectOption[]>([]);
  readonly filterAyId    = signal('');
  readonly filterBatchId = signal('');

  // ── Enrolled list ─────────────────────────────────────────────────────────────
  readonly enrollments          = signal<StudentEnrollmentSummary[]>([]);
  readonly isLoadingEnrollments = signal(false);
  readonly togglingId           = signal<string | null>(null);
  readonly deletingId           = signal<string | null>(null);

  // ── Row selection + bulk delete ───────────────────────────────────────────────
  readonly selectedRowIds       = signal<Set<string>>(new Set());
  readonly showConfirmDialog      = signal(false);
  readonly isBulkDeleting         = signal(false);
  readonly pendingDeleteSingle    = signal<StudentEnrollmentSummary | null>(null);

  // ── Dialog ────────────────────────────────────────────────────────────────────
  readonly showDialog           = signal(false);
  readonly allAvailableStudents = signal<StudentSummary[]>([]);
  readonly selectedStudentIds   = signal<Set<string>>(new Set());
  readonly isLoadingAvailable   = signal(false);
  readonly isSaving             = signal(false);
  readonly dialogSearchTerm     = signal('');

  readonly isOrgAdmin = this.authService.getRole() === 'ORG_ADMIN';

  readonly allAyOptions = computed<SelectOption[]>(() => [
    { label: 'All academic years', value: '' },
    ...this.ayOptions()
  ]);

  readonly selectedCount = computed(() => this.selectedStudentIds().size);

  // Row selection computeds
  readonly selectedRowCount = computed(() => this.selectedRowIds().size);
  readonly allRowsSelected  = computed(() =>
    this.enrollments().length > 0 &&
    this.enrollments().every(e => this.selectedRowIds().has(e.id))
  );

  readonly confirmDialogMessage = computed(() => {
    const single = this.pendingDeleteSingle();
    if (single) return `Delete ${single.studentName}'s enrollment? This cannot be undone.`;
    const count = this.selectedRowCount();
    return `Delete ${count} enrollment(s)? This cannot be undone.`;
  });

  readonly isDeleting = computed(() => !!this.deletingId() || this.isBulkDeleting());

  // Chips: full StudentSummary objects for selected IDs
  readonly selectedStudents = computed<StudentSummary[]>(() => {
    const ids = this.selectedStudentIds();
    return this.allAvailableStudents().filter(s => ids.has(s.id));
  });

  // List: only UNSELECTED students, filtered by search term
  readonly visibleStudents = computed<StudentSummary[]>(() => {
    const term     = this.dialogSearchTerm().trim().toLowerCase();
    const selected = this.selectedStudentIds();
    const unselected = this.allAvailableStudents().filter(s => !selected.has(s.id));

    return term
      ? unselected.filter(s =>
          s.fullName.toLowerCase().includes(term) ||
          s.admissionNo.toLowerCase().includes(term)
        )
      : unselected;
  });

  ngOnInit(): void {
    this.loadAcademicYears();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAcademicYears(): void {
    this.academicYearService.listAcademicYears()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => this.ayOptions.set(r.data.map((ay: AcademicYearSummary) => ({ label: ay.name, value: ay.id }))),
        error: (err: Error) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message })
      });
  }

  onAyChange(ayId: string): void {
    this.filterAyId.set(ayId);
    this.filterBatchId.set('');
    this.enrollments.set([]);
    this.batchOptions.set([]);
    if (!ayId) return;

    this.batchService.listBatches({ academicYearId: ayId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => this.batchOptions.set(r.data.map((b: BatchSummary) => ({ label: b.name, value: b.id }))),
        error: (err: Error) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message })
      });
  }

  onBatchChange(batchId: string): void {
    this.filterBatchId.set(batchId);
    this.loadEnrollments();
  }

  loadEnrollments(): void {
    const batchId = this.filterBatchId();
    if (!batchId) { this.enrollments.set([]); return; }

    this.selectedRowIds.set(new Set());
    this.isLoadingEnrollments.set(true);
    this.enrollmentService.listEnrollments({ batchId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => {
          this.enrollments.set(r.data);
          this.isLoadingEnrollments.set(false);
        },
        error: (err: Error) => {
          this.isLoadingEnrollments.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  // ── Dialog ────────────────────────────────────────────────────────────────────
  openAddDialog(): void {
    this.selectedStudentIds.set(new Set());
    this.dialogSearchTerm.set('');
    this.allAvailableStudents.set([]);
    this.showDialog.set(true);
    this.loadAvailableStudents();
  }

  closeDialog(): void {
    this.showDialog.set(false);
    this.allAvailableStudents.set([]);
    this.selectedStudentIds.set(new Set());
    this.dialogSearchTerm.set('');
  }

  private loadAvailableStudents(): void {
    this.isLoadingAvailable.set(true);
    this.studentService.listStudents({ pageSize: 500, availableForBatchEnrollment: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => {
          this.allAvailableStudents.set(r.data);
          this.isLoadingAvailable.set(false);
        },
        error: (err: Error) => {
          this.isLoadingAvailable.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  onSearchInput(term: string): void {
    this.dialogSearchTerm.set(term);
  }

  toggleStudent(studentId: string): void {
    this.selectedStudentIds.update(current => {
      const updated = new Set(current);
      updated.has(studentId) ? updated.delete(studentId) : updated.add(studentId);
      return updated;
    });
  }

  // Selects all currently visible (unselected) students
  selectAllVisible(): void {
    this.selectedStudentIds.update(current => {
      const updated = new Set(current);
      this.visibleStudents().forEach(s => updated.add(s.id));
      return updated;
    });
  }

  clearAllSelected(): void {
    this.selectedStudentIds.set(new Set());
  }

  enrollSelected(): void {
    const batchId    = this.filterBatchId();
    const studentIds = [...this.selectedStudentIds()];
    if (!batchId || studentIds.length === 0) return;

    const req: BulkEnrollRequest = { batchId, studentIds };
    this.isSaving.set(true);

    this.enrollmentService.bulkEnroll(req)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => {
          this.isSaving.set(false);
          const { enrolled, skipped } = r.data;
          const detail = skipped > 0
            ? `${enrolled} student(s) enrolled. ${skipped} skipped.`
            : `${enrolled} student(s) enrolled successfully.`;
          this.messageService.add({ severity: 'success', summary: 'Enrolled', detail });
          this.closeDialog();
          this.loadEnrollments();
        },
        error: (err: Error) => {
          this.isSaving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  // ── Row selection ─────────────────────────────────────────────────────────────
  toggleRowSelection(id: string): void {
    this.selectedRowIds.update(current => {
      const updated = new Set(current);
      updated.has(id) ? updated.delete(id) : updated.add(id);
      return updated;
    });
  }

  toggleAllRows(): void {
    if (this.allRowsSelected()) {
      this.selectedRowIds.set(new Set());
    } else {
      this.selectedRowIds.set(new Set(this.enrollments().map(e => e.id)));
    }
  }

  isRowSelected(id: string): boolean {
    return this.selectedRowIds().has(id);
  }

  clearRowSelection(): void {
    this.selectedRowIds.set(new Set());
  }

  // ── Bulk delete ───────────────────────────────────────────────────────────────
  openBulkDeleteConfirm(): void {
    this.pendingDeleteSingle.set(null);
    this.showConfirmDialog.set(true);
  }

  confirmBulkDelete(): void {
    const ids = [...this.selectedRowIds()];
    if (ids.length === 0) return;

    this.isBulkDeleting.set(true);
    this.enrollmentService.bulkDeleteEnrollments(ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => {
          this.isBulkDeleting.set(false);
          this.showConfirmDialog.set(false);
          this.selectedRowIds.set(new Set());
          this.enrollments.update(list => list.filter(e => !ids.includes(e.id)));
          this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `${r.data.deleted} enrollment(s) deleted.` });
        },
        error: (err: Error) => {
          this.isBulkDeleting.set(false);
          this.showConfirmDialog.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  deleteEnrollment(enrollment: StudentEnrollmentSummary): void {
    this.pendingDeleteSingle.set(enrollment);
    this.showConfirmDialog.set(true);
  }

  cancelDelete(): void {
    this.showConfirmDialog.set(false);
    this.pendingDeleteSingle.set(null);
  }

  confirmDelete(): void {
    const single = this.pendingDeleteSingle();

    if (single) {
      this.executeSingleDelete(single);
    } else {
      this.confirmBulkDelete();
    }
  }

  private executeSingleDelete(enrollment: StudentEnrollmentSummary): void {
    this.deletingId.set(enrollment.id);
    this.enrollmentService.deleteEnrollment(enrollment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deletingId.set(null);
          this.showConfirmDialog.set(false);
          this.pendingDeleteSingle.set(null);
          this.enrollments.update(list => list.filter(e => e.id !== enrollment.id));
          this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `${enrollment.studentName}'s enrollment removed.` });
        },
        error: (err: Error) => {
          this.deletingId.set(null);
          this.showConfirmDialog.set(false);
          this.pendingDeleteSingle.set(null);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  toggleEnrollment(enrollment: StudentEnrollmentSummary): void {
    if (this.togglingId()) return;
    this.togglingId.set(enrollment.id);

    this.enrollmentService.updateEnrollmentStatus(enrollment.id, !enrollment.isActive)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.togglingId.set(null);
          this.enrollments.update(list =>
            list.map(e => e.id === enrollment.id ? { ...e, isActive: !enrollment.isActive } : e)
          );
          this.messageService.add({
            severity: 'success',
            summary: 'Updated',
            detail: `Enrollment ${enrollment.isActive ? 'deactivated' : 'activated'}.`
          });
        },
        error: (err: Error) => {
          this.togglingId.set(null);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  get batchSelected(): boolean { return !!this.filterBatchId(); }
}
