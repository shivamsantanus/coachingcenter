import { Injectable } from '@angular/core';

/** One column definition for exportCsv<T>(). Declare these once per component as a readonly constant. */
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

@Injectable({ providedIn: 'root' })
export class ExportService {

  /**
   * High-level API — pass your typed data array and column definitions.
   * The service handles mapping, escaping, and download.
   *
   * @example
   * this.exportService.exportCsv('Students', [
   *   { header: 'Name',   value: s => s.fullName   },
   *   { header: 'Status', value: s => s.status     },
   * ], students);
   */
  exportCsv<T>(filename: string, columns: CsvColumn<T>[], data: T[]): void {
    const headers = columns.map(c => c.header);
    const rows    = data.map(row => columns.map(c => c.value(row)));
    this.downloadCsv(filename, headers, rows);
  }

  /**
   * Low-level API — use when columns are conditional or require logic that
   * can't be expressed as a simple field accessor (e.g. fee-collection with
   * optional Due/Balance columns based on whether a fee plan is linked).
   */
  downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
    const escape = (cell: string | number | null | undefined): string => {
      const value = cell == null ? '' : String(cell);
      return value.includes(',') || value.includes('"') || value.includes('\n')
        ? `"${value.replace(/"/g, '""')}"`
        : value;
    };

    const csvLines = [
      headers.map(escape).join(','),
      ...rows.map(row => row.map(escape).join(',')),
    ];

    const blob = new Blob([csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
