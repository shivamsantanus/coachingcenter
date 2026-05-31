import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  ApiResponse,
  StudentEnrollmentSummary,
  CreateStudentEnrollmentRequest,
  BulkEnrollRequest
} from '../models/academic.models';

@Injectable({ providedIn: 'root' })
export class StudentEnrollmentService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl + '/student-enrollments';

  listEnrollments(filters: { batchId?: string; studentId?: string }): Observable<ApiResponse<StudentEnrollmentSummary[]>> {
    let params = new HttpParams();
    if (filters.batchId)   params = params.set('batchId', filters.batchId);
    if (filters.studentId) params = params.set('studentId', filters.studentId);

    return this.http.get<ApiResponse<StudentEnrollmentSummary[]>>(this.baseUrl, { params }).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load enrollments.';
        return throwError(() => new Error(message));
      })
    );
  }

  createEnrollment(req: CreateStudentEnrollmentRequest): Observable<ApiResponse<{ id: string; studentId: string; classId: string | null; batchId: string | null; enrolledOn: string; isActive: boolean }>> {
    return this.http.post<ApiResponse<{ id: string; studentId: string; classId: string | null; batchId: string | null; enrolledOn: string; isActive: boolean }>>(this.baseUrl, req).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to create enrollment.';
        return throwError(() => new Error(message));
      })
    );
  }

  bulkEnroll(req: BulkEnrollRequest): Observable<ApiResponse<{ enrolled: number; skipped: number }>> {
    return this.http.post<ApiResponse<{ enrolled: number; skipped: number }>>(`${this.baseUrl}/bulk`, req).pipe(
      catchError(err => throwError(() => new Error(err?.error?.error ?? err?.message ?? 'Failed to enroll students.')))
    );
  }

  bulkDeleteEnrollments(ids: string[]): Observable<ApiResponse<{ deleted: number }>> {
    return this.http.post<ApiResponse<{ deleted: number }>>(`${this.baseUrl}/bulk-delete`, { ids }).pipe(
      catchError(err => throwError(() => new Error(err?.error?.error ?? err?.message ?? 'Failed to delete enrollments.')))
    );
  }

  deleteEnrollment(id: string): Observable<ApiResponse<{ message: string }>> {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.baseUrl}/${id}`).pipe(
      catchError(err => throwError(() => new Error(err?.error?.error ?? err?.message ?? 'Failed to delete enrollment.')))
    );
  }

  updateEnrollmentStatus(id: string, isActive: boolean): Observable<ApiResponse<{ id: string; isActive: boolean }>> {
    return this.http.patch<ApiResponse<{ id: string; isActive: boolean }>>(`${this.baseUrl}/${id}/status`, { isActive }).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to update enrollment status.';
        return throwError(() => new Error(message));
      })
    );
  }
}
