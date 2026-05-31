import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { BatchSubjectTeacherService } from '../../../services/batch-subject-teacher.service';
import { AcademicYearService } from '../../../services/academic-year.service';
import { BatchService } from '../../../services/batch.service';
import { SubjectService } from '../../../services/subject.service';
import { TeacherService } from '../../../services/teacher.service';
import { AuthService } from '../../../services/auth.service';
import {
  BatchSubjectTeacherSummary,
  AcademicYearSummary,
  BatchSummary,
  SubjectSummary,
  CreateBatchSubjectTeacherRequest
} from '../../../models/academic.models';
import { TeacherSummary } from '../../../models/teacher.models';

interface SelectOption { label: string; value: string; }

interface NewAssignmentRow {
  localId:   string;
  subjectId: string;
  teacherId: string;
  error:     string;
}

let rowCounter = 0;
function makeRow(): NewAssignmentRow {
  return { localId: `row-${++rowCounter}`, subjectId: '', teacherId: '', error: '' };
}

@Component({
  selector: 'app-batch-subject-teacher-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, SelectModule, ToastModule, TooltipModule, DialogModule
  ],
  providers: [MessageService],
  templateUrl: './batch-subject-teacher-tab.component.html',
  styleUrls: ['./batch-subject-teacher-tab.component.scss']
})
export class BatchSubjectTeacherTabComponent implements OnInit, OnDestroy {
  private readonly bstService          = inject(BatchSubjectTeacherService);
  private readonly academicYearService = inject(AcademicYearService);
  private readonly batchService        = inject(BatchService);
  private readonly subjectService      = inject(SubjectService);
  private readonly teacherService      = inject(TeacherService);
  private readonly authService         = inject(AuthService);
  private readonly messageService      = inject(MessageService);
  private readonly destroy$            = new Subject<void>();

  // ── Filters ──────────────────────────────────────────────────────────────────
  readonly ayOptions    = signal<SelectOption[]>([]);
  readonly batchOptions = signal<SelectOption[]>([]);
  readonly filterAyId   = signal('');
  readonly filterBatchId = signal('');

  // ── Assignments list ──────────────────────────────────────────────────────────
  readonly assignments = signal<BatchSubjectTeacherSummary[]>([]);
  readonly isLoading   = signal(false);
  readonly deletingId  = signal<string | null>(null);

  // ── Dialog ────────────────────────────────────────────────────────────────────
  readonly showDialog     = signal(false);
  readonly isSaving       = signal(false);
  readonly newRows        = signal<NewAssignmentRow[]>([makeRow()]);
  readonly subjectOptions = signal<SelectOption[]>([]);
  readonly teacherOptions = signal<SelectOption[]>([]);

  readonly isOrgAdmin = this.authService.getRole() === 'ORG_ADMIN';

  readonly allAyOptions = computed<SelectOption[]>(() => [
    { label: 'All academic years', value: '' },
    ...this.ayOptions()
  ]);

  readonly validNewRows = computed(() =>
    this.newRows().filter(r => r.subjectId && r.teacherId)
  );

  ngOnInit(): void {
    this.loadAcademicYears();
    this.loadSubjects();
    this.loadTeachers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data loading ──────────────────────────────────────────────────────────────
  private loadAcademicYears(): void {
    this.academicYearService.listAcademicYears()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => this.ayOptions.set(r.data.map((ay: AcademicYearSummary) => ({ label: ay.name, value: ay.id }))),
        error: (err: Error) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message })
      });
  }

  private loadBatches(ayId: string): void {
    this.batchService.listBatches({ academicYearId: ayId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => this.batchOptions.set(r.data.map((b: BatchSummary) => ({ label: b.name, value: b.id }))),
        error: (err: Error) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message })
      });
  }

  private loadSubjects(): void {
    this.subjectService.listSubjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => this.subjectOptions.set(
          r.data.map((s: SubjectSummary) => ({ label: s.code ? `${s.name} (${s.code})` : s.name, value: s.id }))
        ),
        error: (err: Error) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message })
      });
  }

  private loadTeachers(): void {
    this.teacherService.listTeachers({ pageSize: 200, status: 'ACTIVE' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => this.teacherOptions.set(
          r.data.map((t: TeacherSummary) => ({ label: `${t.fullName} (${t.employeeCode})`, value: t.id }))
        ),
        error: (err: Error) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message })
      });
  }

  loadAssignments(): void {
    const batchId = this.filterBatchId();
    if (!batchId) { this.assignments.set([]); return; }

    this.isLoading.set(true);
    this.bstService.listAssignments(batchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => {
          this.assignments.set(r.data);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  // ── Filter handlers ───────────────────────────────────────────────────────────
  onAyChange(ayId: string): void {
    this.filterAyId.set(ayId);
    this.filterBatchId.set('');
    this.assignments.set([]);
    this.batchOptions.set([]);
    if (ayId) this.loadBatches(ayId);
  }

  onBatchChange(batchId: string): void {
    this.filterBatchId.set(batchId);
    this.loadAssignments();
  }

  // ── Delete existing assignment ─────────────────────────────────────────────────
  deleteAssignment(assignment: BatchSubjectTeacherSummary): void {
    if (this.deletingId()) return;
    this.deletingId.set(assignment.id);

    this.bstService.deleteAssignment(assignment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deletingId.set(null);
          this.assignments.update(list => list.filter(a => a.id !== assignment.id));
          this.messageService.add({ severity: 'success', summary: 'Removed', detail: 'Assignment removed.' });
        },
        error: (err: Error) => {
          this.deletingId.set(null);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  // ── Dialog ────────────────────────────────────────────────────────────────────
  openDialog(): void {
    this.newRows.set([makeRow()]);
    this.showDialog.set(true);
  }

  closeDialog(): void {
    this.showDialog.set(false);
    this.newRows.set([makeRow()]);
  }

  addRow(): void {
    this.newRows.update(rows => [...rows, makeRow()]);
  }

  removeRow(localId: string): void {
    this.newRows.update(rows => {
      const filtered = rows.filter(r => r.localId !== localId);
      return filtered.length > 0 ? filtered : [makeRow()];
    });
  }

  updateRow(localId: string, field: 'subjectId' | 'teacherId', value: string): void {
    this.newRows.update(rows =>
      rows.map(r => r.localId === localId ? { ...r, [field]: value, error: '' } : r)
    );
  }

  private validateRows(): boolean {
    const existing = this.assignments();
    let valid = true;

    this.newRows.update(rows =>
      rows.map(row => {
        if (!row.subjectId || !row.teacherId) return { ...row, error: '' };

        const duplicateInNew = rows.filter(
          r => r.localId !== row.localId && r.subjectId === row.subjectId && r.teacherId === row.teacherId
        ).length > 0;

        const duplicateInExisting = existing.some(
          a => a.subjectId === row.subjectId && a.teacherId === row.teacherId
        );

        if (duplicateInNew || duplicateInExisting) {
          valid = false;
          return { ...row, error: 'This subject–teacher pair already exists.' };
        }

        return { ...row, error: '' };
      })
    );

    return valid;
  }

  saveNewRows(): void {
    const rowsToSave = this.validNewRows();
    if (rowsToSave.length === 0) return;
    if (!this.validateRows()) return;

    const batchId = this.filterBatchId();
    this.isSaving.set(true);

    const requests = rowsToSave.map(row => {
      const req: CreateBatchSubjectTeacherRequest = { batchId, subjectId: row.subjectId, teacherId: row.teacherId };
      return this.bstService.createAssignment(req).pipe(
        catchError(() => of(null))
      );
    });

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe(results => {
        this.isSaving.set(false);
        const saved   = results.filter(r => r !== null).length;
        const failed  = results.filter(r => r === null).length;

        if (saved > 0) {
          const detail = failed > 0
            ? `${saved} assignment(s) saved. ${failed} skipped (duplicates).`
            : `${saved} assignment(s) saved.`;
          this.messageService.add({ severity: 'success', summary: 'Saved', detail });
          this.closeDialog();
          this.loadAssignments();
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'All assignments failed — they may already exist.' });
        }
      });
  }

  get batchSelected(): boolean { return !!this.filterBatchId(); }
}
