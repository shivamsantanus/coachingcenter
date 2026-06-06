import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TeacherService } from '../../services/teacher.service';
import { TeacherProfileData, TeacherProfileAssignment } from '../../models/teacher-dashboard.models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-teacher-profile',
  standalone: true,
  imports: [CommonModule, TagModule, ToastModule],
  providers: [MessageService],
  templateUrl: './teacher-profile.component.html',
  styleUrls: ['./teacher-profile.component.scss']
})
export class TeacherProfileComponent implements OnInit, OnDestroy {
  private readonly teacherService = inject(TeacherService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$       = new Subject<void>();

  readonly apiBase  = environment.apiBaseUrl.replace('/api', '');

  profile   = signal<TeacherProfileData | null>(null);
  isLoading = signal(true);

  ngOnInit(): void {
    this.teacherService.getMyProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.profile.set(response.data);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get initials(): string {
    return (this.profile()?.teacher.fullName ?? '')
      .split(' ').slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('');
  }

  resolvePhoto(url: string | null | undefined): string | null {
    if (!url) return null;
    return url.startsWith('http') ? url : `${this.apiBase}${url}`;
  }

  // Group assignments by batch for display
  get batchGroups(): { batchId: string; batchName: string; className: string | null; ayName: string; startTime: string | null; endTime: string | null; subjects: string[] }[] {
    const assignments = this.profile()?.assignments ?? [];
    const map = new Map<string, { batchId: string; batchName: string; className: string | null; ayName: string; startTime: string | null; endTime: string | null; subjects: string[] }>();

    for (const a of assignments) {
      if (!map.has(a.batchId)) {
        map.set(a.batchId, {
          batchId:   a.batchId,
          batchName: a.batchName,
          className: a.className,
          ayName:    a.academicYearName,
          startTime: a.startTime,
          endTime:   a.endTime,
          subjects:  []
        });
      }
      map.get(a.batchId)!.subjects.push(a.subjectName);
    }

    return Array.from(map.values());
  }

  trackByBatchId(_index: number, group: { batchId: string }): string {
    return group.batchId;
  }
}
