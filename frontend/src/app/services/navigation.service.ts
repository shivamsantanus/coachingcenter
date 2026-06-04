import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/academic.models';
import { NavItem, NavMatrixRow, UpdateNavPermissionRequest } from '../models/navigation.models';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl + '/navigation';

  getMyNav(): Observable<ApiResponse<NavItem[]>> {
    return this.http.get<ApiResponse<NavItem[]>>(`${this.baseUrl}/my-nav`).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load navigation.';
        return throwError(() => new Error(message));
      })
    );
  }

  getPermissions(): Observable<ApiResponse<NavMatrixRow[]>> {
    return this.http.get<ApiResponse<NavMatrixRow[]>>(`${this.baseUrl}/permissions`).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load permissions.';
        return throwError(() => new Error(message));
      })
    );
  }

  updatePermission(request: UpdateNavPermissionRequest): Observable<ApiResponse<UpdateNavPermissionRequest>> {
    return this.http.put<ApiResponse<UpdateNavPermissionRequest>>(`${this.baseUrl}/permissions`, request).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to update permission.';
        return throwError(() => new Error(message));
      })
    );
  }
}
