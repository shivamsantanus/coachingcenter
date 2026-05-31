import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse, BranchSummary, CreateBranchRequest, UpdateBranchRequest } from '../models/academic.models';

@Injectable({ providedIn: 'root' })
export class BranchService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl + '/branches';

  listBranches(): Observable<ApiResponse<BranchSummary[]>> {
    return this.http.get<ApiResponse<BranchSummary[]>>(this.baseUrl).pipe(
      catchError(err => throwError(() => new Error(err?.error?.error ?? err?.message ?? 'Failed to load branches.')))
    );
  }

  getBranch(id: string): Observable<ApiResponse<BranchSummary>> {
    return this.http.get<ApiResponse<BranchSummary>>(`${this.baseUrl}/${id}`).pipe(
      catchError(err => throwError(() => new Error(err?.error?.error ?? err?.message ?? 'Failed to load branch.')))
    );
  }

  createBranch(req: CreateBranchRequest): Observable<ApiResponse<BranchSummary>> {
    return this.http.post<ApiResponse<BranchSummary>>(this.baseUrl, req).pipe(
      catchError(err => throwError(() => new Error(err?.error?.error ?? err?.message ?? 'Failed to create branch.')))
    );
  }

  updateBranch(id: string, req: UpdateBranchRequest): Observable<ApiResponse<BranchSummary>> {
    return this.http.put<ApiResponse<BranchSummary>>(`${this.baseUrl}/${id}`, req).pipe(
      catchError(err => throwError(() => new Error(err?.error?.error ?? err?.message ?? 'Failed to update branch.')))
    );
  }

  updateBranchStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Observable<ApiResponse<{ id: string; status: string }>> {
    return this.http.patch<ApiResponse<{ id: string; status: string }>>(`${this.baseUrl}/${id}/status`, { status }).pipe(
      catchError(err => throwError(() => new Error(err?.error?.error ?? err?.message ?? 'Failed to update branch status.')))
    );
  }
}
