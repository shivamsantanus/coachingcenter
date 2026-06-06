import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  ApiResponse,
  ClassSummary,
  CreateClassRequest,
  UpdateClassRequest
} from '../models/academic.models';

@Injectable({ providedIn: 'root' })
export class ClassService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl + '/classes';

  listClasses(filters?: { search?: string }): Observable<ApiResponse<ClassSummary[]>> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);

    return this.http.get<ApiResponse<ClassSummary[]>>(this.baseUrl, { params }).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load classes.';
        return throwError(() => new Error(message));
      })
    );
  }

  getClass(id: string): Observable<ApiResponse<ClassSummary>> {
    return this.http.get<ApiResponse<ClassSummary>>(`${this.baseUrl}/${id}`).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load class.';
        return throwError(() => new Error(message));
      })
    );
  }

  createClass(req: CreateClassRequest): Observable<ApiResponse<{ id: string; name: string; status: string }>> {
    return this.http.post<ApiResponse<{ id: string; name: string; status: string }>>(this.baseUrl, req).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to create class.';
        return throwError(() => new Error(message));
      })
    );
  }

  updateClass(id: string, req: UpdateClassRequest): Observable<ApiResponse<{ id: string; name: string; status: string }>> {
    return this.http.put<ApiResponse<{ id: string; name: string; status: string }>>(`${this.baseUrl}/${id}`, req).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to update class.';
        return throwError(() => new Error(message));
      })
    );
  }

  updateClassStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Observable<ApiResponse<{ id: string; status: string }>> {
    return this.http.patch<ApiResponse<{ id: string; status: string }>>(`${this.baseUrl}/${id}/status`, { status }).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to update class status.';
        return throwError(() => new Error(message));
      })
    );
  }
}
