import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../services/auth.service';
import { TeacherService } from '../../../services/teacher.service';
import { TeacherSummary } from '../../../models/teacher.models';
import { TeacherFormComponent } from '../teacher-form/teacher-form.component';
import { environment } from '../../../../environments/environment';

interface StatusOption { label: string; value: string; }

@Component({
  selector: 'app-teacher-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, TagModule, ToastModule, SelectModule, TooltipModule,
    TeacherFormComponent
  ],
  providers: [MessageService],
  templateUrl: './teacher-list.component.html',
  styleUrls: ['./teacher-list.component.scss']
})
export class TeacherListComponent implements OnInit, OnDestroy {
  private readonly teacherService = inject(TeacherService);
  private readonly authService    = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$       = new Subject<void>();
  private readonly searchInput$   = new Subject<string>();

  readonly apiBase = environment.apiBaseUrl.replace('/api', '');

  readonly teachers      = signal<TeacherSummary[]>([]);
  readonly isLoading     = signal(false);
  readonly totalRecords  = signal(0);
  readonly currentPage   = signal(1);
  readonly pageSize      = signal(20);
  readonly searchTerm    = signal('');
  readonly statusFilter  = signal('');
  readonly togglingId    = signal<string | null>(null);
  readonly showForm      = signal(false);
  readonly editTeacherId = signal<string | null>(null);

  readonly isOrgAdmin = this.authService.getRole() === 'ORG_ADMIN';

  readonly statusOptions: StatusOption[] = [
    { label: 'All statuses', value: '' },
    { label: 'Active',       value: 'ACTIVE'   },
    { label: 'Inactive',     value: 'INACTIVE' },
  ];

  ngOnInit(): void {
    this.searchInput$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => {
        this.searchTerm.set(term);
        this.currentPage.set(1);
        this.loadTeachers();
      });

    this.loadTeachers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTeachers(): void {
    this.isLoading.set(true);
    this.teacherService
      .listTeachers({
        page:     this.currentPage(),
        pageSize: this.pageSize(),
        search:   this.searchTerm() || undefined,
        status:   this.statusFilter() || undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.teachers.set(response.data);
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
    this.loadTeachers();
  }

  openAddForm(): void {
    this.editTeacherId.set(null);
    this.showForm.set(true);
  }

  openEditForm(teacherId: string): void {
    this.editTeacherId.set(teacherId);
    this.showForm.set(true);
  }

  onFormSaved(): void {
    this.showForm.set(false);
    this.loadTeachers();
  }

  onFormClosed(): void {
    this.showForm.set(false);
  }

  toggleStatus(teacher: TeacherSummary): void {
    if (this.togglingId()) return;

    const newStatus = teacher.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.togglingId.set(teacher.id);

    this.teacherService
      .updateStatus(teacher.id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.togglingId.set(null);
          this.teachers.update(list =>
            list.map(t => t.id === teacher.id ? { ...t, status: newStatus } : t)
          );
          this.messageService.add({
            severity: 'success',
            summary: 'Status updated',
            detail: `${teacher.fullName} is now ${newStatus.toLowerCase()}.`
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
    this.loadTeachers();
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

  formatSalaryType(salaryType: string | null): string {
    if (!salaryType) return '—';
    return salaryType === 'PER_CLASS' ? 'Per class' : 'Monthly';
  }
}
