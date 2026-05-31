import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  ApiResponse,
  BatchSubjectTeacherSummary,
  CreateBatchSubjectTeacherRequest
} from '../models/academic.models';

@Injectable({ providedIn: 'root' })
export class BatchSubjectTeacherService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl + '/batch-subject-teachers';

  listAssignments(batchId: string): Observable<ApiResponse<BatchSubjectTeacherSummary[]>> {
    const params = new HttpParams().set('batchId', batchId);
    return this.http.get<ApiResponse<BatchSubjectTeacherSummary[]>>(this.baseUrl, { params }).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load assignments.';
        return throwError(() => new Error(message));
      })
    );
  }

  createAssignment(req: CreateBatchSubjectTeacherRequest): Observable<ApiResponse<{ id: string; batchId: string; subjectId: string; teacherId: string }>> {
    return this.http.post<ApiResponse<{ id: string; batchId: string; subjectId: string; teacherId: string }>>(this.baseUrl, req).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to create assignment.';
        return throwError(() => new Error(message));
      })
    );
  }

  deleteAssignment(id: string): Observable<ApiResponse<{ message: string }>> {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.baseUrl}/${id}`).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to delete assignment.';
        return throwError(() => new Error(message));
      })
    );
  }
}
