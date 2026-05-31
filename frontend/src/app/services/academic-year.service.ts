import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  ApiResponse,
  AcademicYearSummary,
  CreateAcademicYearRequest,
  UpdateAcademicYearRequest
} from '../models/academic.models';

@Injectable({ providedIn: 'root' })
export class AcademicYearService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl + '/academic-years';

  listAcademicYears(): Observable<ApiResponse<AcademicYearSummary[]>> {
    return this.http.get<ApiResponse<AcademicYearSummary[]>>(this.baseUrl).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load academic years.';
        return throwError(() => new Error(message));
      })
    );
  }

  getAcademicYear(id: string): Observable<ApiResponse<AcademicYearSummary>> {
    return this.http.get<ApiResponse<AcademicYearSummary>>(`${this.baseUrl}/${id}`).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load academic year.';
        return throwError(() => new Error(message));
      })
    );
  }

  createAcademicYear(req: CreateAcademicYearRequest): Observable<ApiResponse<AcademicYearSummary>> {
    return this.http.post<ApiResponse<AcademicYearSummary>>(this.baseUrl, req).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to create academic year.';
        return throwError(() => new Error(message));
      })
    );
  }

  updateAcademicYear(id: string, req: UpdateAcademicYearRequest): Observable<ApiResponse<AcademicYearSummary>> {
    return this.http.put<ApiResponse<AcademicYearSummary>>(`${this.baseUrl}/${id}`, req).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to update academic year.';
        return throwError(() => new Error(message));
      })
    );
  }

  activateAcademicYear(id: string): Observable<ApiResponse<{ id: string; isActive: boolean }>> {
    return this.http.patch<ApiResponse<{ id: string; isActive: boolean }>>(`${this.baseUrl}/${id}/activate`, {}).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to activate academic year.';
        return throwError(() => new Error(message));
      })
    );
  }
}
