import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  ApiResponse,
  SubjectSummary,
  CreateSubjectRequest,
  UpdateSubjectRequest
} from '../models/academic.models';

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl + '/subjects';

  listSubjects(filters?: { search?: string }): Observable<ApiResponse<SubjectSummary[]>> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);

    return this.http.get<ApiResponse<SubjectSummary[]>>(this.baseUrl, { params }).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load subjects.';
        return throwError(() => new Error(message));
      })
    );
  }

  getSubject(id: string): Observable<ApiResponse<SubjectSummary>> {
    return this.http.get<ApiResponse<SubjectSummary>>(`${this.baseUrl}/${id}`).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load subject.';
        return throwError(() => new Error(message));
      })
    );
  }

  createSubject(req: CreateSubjectRequest): Observable<ApiResponse<SubjectSummary>> {
    return this.http.post<ApiResponse<SubjectSummary>>(this.baseUrl, req).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to create subject.';
        return throwError(() => new Error(message));
      })
    );
  }

  updateSubject(id: string, req: UpdateSubjectRequest): Observable<ApiResponse<SubjectSummary>> {
    return this.http.put<ApiResponse<SubjectSummary>>(`${this.baseUrl}/${id}`, req).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to update subject.';
        return throwError(() => new Error(message));
      })
    );
  }

  deleteSubject(id: string): Observable<ApiResponse<{ message: string }>> {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.baseUrl}/${id}`).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to delete subject.';
        return throwError(() => new Error(message));
      })
    );
  }
}
