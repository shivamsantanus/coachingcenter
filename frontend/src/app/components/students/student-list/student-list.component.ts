import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../services/auth.service';
import { StudentService } from '../../../services/student.service';
import { StudentSummary } from '../../../models/student.models';
import { StudentFormComponent } from '../student-form/student-form.component';
import { environment } from '../../../../environments/environment';

interface StatusOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, TagModule, ToastModule, SelectModule,
    StudentFormComponent
  ],
  providers: [MessageService],
  templateUrl: './student-list.component.html',
  styleUrls: ['./student-list.component.scss']
})
export class StudentListComponent implements OnInit, OnDestroy {
  private readonly studentService = inject(StudentService);
  private readonly authService    = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$       = new Subject<void>();
  private readonly searchInput$   = new Subject<string>();

  readonly apiBase = environment.apiBaseUrl.replace('/api', '');

  readonly students      = signal<StudentSummary[]>([]);
  readonly isLoading     = signal(false);
  readonly totalRecords  = signal(0);
  readonly currentPage   = signal(1);
  readonly pageSize      = signal(20);
  readonly searchTerm    = signal('');
  readonly statusFilter  = signal('');
  readonly togglingId    = signal<string | null>(null);
  readonly showForm      = signal(false);
  readonly editStudentId = signal<string | null>(null);

  readonly isOrgAdmin = this.authService.getRole() === 'ORG_ADMIN';

  readonly statusOptions: StatusOption[] = [
    { label: 'All statuses', value: '' },
    { label: 'Active',       value: 'ACTIVE' },
    { label: 'Inactive',     value: 'INACTIVE' },
  ];

  ngOnInit(): void {
    this.searchInput$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => {
        this.searchTerm.set(term);
        this.currentPage.set(1);
        this.loadStudents();
      });

    this.loadStudents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStudents(): void {
    this.isLoading.set(true);
    this.studentService
      .listStudents({
        page:     this.currentPage(),
        pageSize: this.pageSize(),
        search:   this.searchTerm() || undefined,
        status:   this.statusFilter() || undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.students.set(response.data);
          this.totalRecords.set(response.total);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  onSearchChange(term: string): void {
    this.searchInput$.next(term);
  }

  onStatusFilterChange(): void {
    this.currentPage.set(1);
    this.loadStudents();
  }

  openAddForm(): void {
    this.editStudentId.set(null);
    this.showForm.set(true);
  }

  openEditForm(studentId: string): void {
    this.editStudentId.set(studentId);
    this.showForm.set(true);
  }

  onFormSaved(): void {
    this.showForm.set(false);
    this.loadStudents();
  }

  onFormClosed(): void {
    this.showForm.set(false);
  }

  toggleStatus(student: StudentSummary): void {
    if (this.togglingId()) return;

    const newStatus = student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.togglingId.set(student.id);

    this.studentService
      .updateStatus(student.id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.togglingId.set(null);
          this.students.update(list =>
            list.map(s => s.id === student.id ? { ...s, status: newStatus } : s)
          );
          this.messageService.add({
            severity: 'success',
            summary: 'Status updated',
            detail: `${student.fullName} is now ${newStatus.toLowerCase()}.`
          });
        },
        error: (err: Error) => {
          this.togglingId.set(null);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  get totalPages(): number {
    return Math.ceil(this.totalRecords() / this.pageSize());
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage.set(page);
    this.loadStudents();
  }

  photoUrl(url: string | null): string | null {
    if (!url) return null;
    return url.startsWith('http') ? url : `${this.apiBase}${url}`;
  }

  initials(fullName: string): string {
    return fullName
      .split(' ')
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  }
}
