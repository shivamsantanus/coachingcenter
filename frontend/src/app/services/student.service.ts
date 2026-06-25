import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  StudentListResponse,
  StudentDetail,
  CreateStudentRequest,
  UpdateStudentRequest,
  StudentCreatedResult,
} from '../models/student.models';
import { ApiResponse } from '../models/academic.models';
import { StudentDashboardData, StudentEnrollmentInfo, StudentFeesData } from '../models/student-dashboard.models';

interface MessageResult {
  message: string;
}

interface StatusResult {
  message: string;
  status: string;
}

interface PhotoResult {
  photoUrl: string;
}

export interface StudentListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  availableForBatchEnrollment?: boolean;
}

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/students`;

  listStudents(filters: StudentListFilters): Observable<StudentListResponse> {
    let params = new HttpParams()
      .set('page', String(filters.page ?? 1))
      .set('pageSize', String(filters.pageSize ?? 20));

    if (filters.search) params = params.set('search', filters.search);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.availableForBatchEnrollment) params = params.set('availableForBatchEnrollment', 'true');

    return this.http.get<StudentListResponse>(this.baseUrl, { params }).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load students.';
        return throwError(() => new Error(message));
      })
    );
  }

  getStudent(studentId: string): Observable<StudentDetail> {
    return this.http.get<StudentDetail>(`${this.baseUrl}/${studentId}`).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load student.';
        return throwError(() => new Error(message));
      })
    );
  }

  createStudent(request: CreateStudentRequest): Observable<StudentCreatedResult> {
    return this.http.post<{ success: boolean; data: StudentCreatedResult; error: string | null }>(this.baseUrl, request).pipe(
      map(response => response.data),
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to create student.';
        return throwError(() => new Error(message));
      })
    );
  }

  updateStudent(studentId: string, request: UpdateStudentRequest): Observable<MessageResult> {
    return this.http
      .put<MessageResult>(`${this.baseUrl}/${studentId}`, request)
      .pipe(
        catchError(err => {
          const message = err?.error?.error ?? err?.message ?? 'Failed to update student.';
          return throwError(() => new Error(message));
        })
      );
  }

  updateStatus(studentId: string, status: 'ACTIVE' | 'INACTIVE'): Observable<StatusResult> {
    return this.http
      .patch<StatusResult>(`${this.baseUrl}/${studentId}/status`, { status })
      .pipe(
        catchError(err => {
          const message = err?.error?.error ?? err?.message ?? 'Failed to update status.';
          return throwError(() => new Error(message));
        })
      );
  }

  getMyDashboard(): Observable<ApiResponse<StudentDashboardData>> {
    return this.http.get<ApiResponse<StudentDashboardData>>(`${this.baseUrl}/my-dashboard`).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load student dashboard.';
        return throwError(() => new Error(message));
      })
    );
  }

  getMyFees(): Observable<ApiResponse<StudentFeesData>> {
    return this.http.get<ApiResponse<StudentFeesData>>(`${this.baseUrl}/my-fees`).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load fee information.';
        return throwError(() => new Error(message));
      })
    );
  }

  getMyEnrollments(): Observable<ApiResponse<StudentEnrollmentInfo[]>> {
    return this.http.get<ApiResponse<StudentEnrollmentInfo[]>>(`${this.baseUrl}/my-enrollments`).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load enrollments.';
        return throwError(() => new Error(message));
      })
    );
  }

  uploadPhoto(studentId: string, file: File): Observable<PhotoResult> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<PhotoResult>(`${this.baseUrl}/${studentId}/photo`, formData)
      .pipe(
        catchError(err => {
          const message = err?.error?.error ?? err?.message ?? 'Failed to upload photo.';
          return throwError(() => new Error(message));
        })
      );
  }
}
