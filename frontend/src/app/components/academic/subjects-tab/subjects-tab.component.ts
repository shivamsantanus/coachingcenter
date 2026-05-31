import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../services/auth.service';
import { SubjectService } from '../../../services/subject.service';
import { SubjectSummary } from '../../../models/academic.models';

@Component({
  selector: 'app-subjects-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    ToastModule,
    TooltipModule,
    DialogModule,
  ],
  providers: [MessageService],
  templateUrl: './subjects-tab.component.html',
  styleUrls: ['./subjects-tab.component.scss'],
})
export class SubjectsTabComponent implements OnInit, OnDestroy {
  private readonly subjectService  = inject(SubjectService);
  private readonly authService     = inject(AuthService);
  private readonly messageService  = inject(MessageService);
  private readonly formBuilder     = inject(FormBuilder);
  private readonly destroy$        = new Subject<void>();
  private readonly searchInput$    = new Subject<string>();

  readonly subjects      = signal<SubjectSummary[]>([]);
  readonly isLoading     = signal(false);
  readonly showDialog    = signal(false);
  readonly editSubjectId = signal<string | null>(null);
  readonly deletingId    = signal<string | null>(null);
  readonly isSaving      = signal(false);
  readonly searchTerm    = signal('');

  readonly isOrgAdmin = this.authService.getRole() === 'ORG_ADMIN';

  readonly subjectForm: FormGroup = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    code: ['', [Validators.maxLength(50)]],
  });

  ngOnInit(): void {
    this.searchInput$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => {
        this.searchTerm.set(term);
        this.loadSubjects();
      });

    this.loadSubjects();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSubjects(): void {
    this.isLoading.set(true);
    this.subjectService
      .listSubjects({ search: this.searchTerm() || undefined })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.subjects.set(response.data);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        },
      });
  }

  onSearchChange(term: string): void {
    this.searchInput$.next(term);
  }

  openAddDialog(): void {
    this.editSubjectId.set(null);
    this.subjectForm.reset({ name: '', code: '' });
    this.showDialog.set(true);
  }

  openEditDialog(subject: SubjectSummary): void {
    this.editSubjectId.set(subject.id);
    this.subjectForm.reset({ name: subject.name, code: subject.code ?? '' });
    this.showDialog.set(true);
  }

  closeDialog(): void {
    this.showDialog.set(false);
  }

  saveSubject(): void {
    if (this.subjectForm.invalid) {
      this.subjectForm.markAllAsTouched();
      return;
    }

    const rawName: string  = this.subjectForm.value.name;
    const rawCode: string  = this.subjectForm.value.code;
    const trimmedName      = rawName.trim();
    const trimmedCode      = rawCode.trim() || null;
    const editId           = this.editSubjectId();

    this.isSaving.set(true);

    if (editId) {
      this.subjectService
        .updateSubject(editId, { name: trimmedName, code: trimmedCode })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.showDialog.set(false);
            this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Subject updated.' });
            this.loadSubjects();
          },
          error: (err: Error) => {
            this.isSaving.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          },
        });
    } else {
      this.subjectService
        .createSubject({ name: trimmedName, code: trimmedCode })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.showDialog.set(false);
            this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Subject added.' });
            this.loadSubjects();
          },
          error: (err: Error) => {
            this.isSaving.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          },
        });
    }
  }

  deleteSubject(subject: SubjectSummary): void {
    if (this.deletingId()) return;

    this.deletingId.set(subject.id);
    this.subjectService
      .deleteSubject(subject.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deletingId.set(null);
          this.subjects.update(list => list.filter(s => s.id !== subject.id));
          this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `"${subject.name}" removed.` });
        },
        error: (err: Error) => {
          this.deletingId.set(null);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        },
      });
  }

  get dialogTitle(): string {
    return this.editSubjectId() ? 'Edit Subject' : 'Add Subject';
  }

  get nameControl() {
    return this.subjectForm.get('name');
  }

  get codeControl() {
    return this.subjectForm.get('code');
  }
}
