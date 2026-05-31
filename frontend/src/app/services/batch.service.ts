import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  ApiResponse,
  BatchSummary,
  CreateBatchRequest,
  UpdateBatchRequest
} from '../models/academic.models';

@Injectable({ providedIn: 'root' })
export class BatchService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl + '/batches';

  listBatches(filters?: { academicYearId?: string; classId?: string; search?: string }): Observable<ApiResponse<BatchSummary[]>> {
    let params = new HttpParams();
    if (filters?.academicYearId) params = params.set('academicYearId', filters.academicYearId);
    if (filters?.classId)        params = params.set('classId', filters.classId);
    if (filters?.search)         params = params.set('search', filters.search);

    return this.http.get<ApiResponse<BatchSummary[]>>(this.baseUrl, { params }).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load batches.';
        return throwError(() => new Error(message));
      })
    );
  }

  getBatch(id: string): Observable<ApiResponse<BatchSummary>> {
    return this.http.get<ApiResponse<BatchSummary>>(`${this.baseUrl}/${id}`).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load batch.';
        return throwError(() => new Error(message));
      })
    );
  }

  createBatch(req: CreateBatchRequest): Observable<ApiResponse<{ id: string; name: string; status: string }>> {
    return this.http.post<ApiResponse<{ id: string; name: string; status: string }>>(this.baseUrl, req).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to create batch.';
        return throwError(() => new Error(message));
      })
    );
  }

  updateBatch(id: string, req: UpdateBatchRequest): Observable<ApiResponse<{ id: string; name: string; status: string }>> {
    return this.http.put<ApiResponse<{ id: string; name: string; status: string }>>(`${this.baseUrl}/${id}`, req).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to update batch.';
        return throwError(() => new Error(message));
      })
    );
  }

  updateBatchStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Observable<ApiResponse<{ id: string; status: string }>> {
    return this.http.patch<ApiResponse<{ id: string; status: string }>>(`${this.baseUrl}/${id}/status`, { status }).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to update batch status.';
        return throwError(() => new Error(message));
      })
    );
  }
}
