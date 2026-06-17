import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/academic.models';

export interface DashboardStats {
  totalActiveStudents: number;
  totalActiveTeachers: number;
  totalActiveBatches: number;
  feesCollectedThisMonth: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/dashboard`;

  getStats(): Observable<DashboardStats> {
    return this.http.get<ApiResponse<DashboardStats>>(`${this.baseUrl}/stats`).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.error ?? 'Failed to load dashboard stats');
        }
        return response.data;
      }),
      catchError(err => throwError(() => err))
    );
  }
}
