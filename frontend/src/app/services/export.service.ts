import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Workbook } from 'exceljs';
import { AuthService } from './auth.service';

/** One column definition for exportXlsx<T>(). Declare these once per component as a readonly constant. */
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

// ARGB color constants used across all reports
const COLORS = {
  orgBg:        'FF0F172A',  // deep navy  — org name row
  titleBg:      'FF1E293B',  // dark slate — report title row
  metaBg:       'FF334155',  // mid slate  — generated/records row
  headerBg:     'FF1D4ED8',  // blue       — column header row
  headerBorder: 'FF1E40AF',  // darker blue
  altRow:       'FFF1F5F9',  // ice blue   — even data rows
  rowBorder:    'FFE2E8F0',  // light gray — data row bottom border
  white:        'FFFFFFFF',
} as const;

@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly authService = inject(AuthService);
  private readonly platformId  = inject(PLATFORM_ID);

  // ── Public Excel API ───────────────────────────────────────────────────────

  /** High-level: pass typed data + column definitions. */
  async exportXlsx<T>(filename: string, title: string, columns: CsvColumn<T>[], data: T[]): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const headers = columns.map(c => c.header);
    const rows    = data.map(row => columns.map(c => c.value(row)));
    await this.downloadXlsx(filename, title, headers, rows);
  }

  /** Low-level: use when columns are conditional (e.g. fee-collection Due/Balance).
   *  `frozenColumns` optionally freezes the first N columns (left-side freeze pane). */
  async downloadXlsx(
    filename: string,
    title: string,
    headers: string[],
    rows: (string | number | null | undefined)[][],
    frozenColumns = 0,
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const workbook = this.buildWorkbook(title, headers, rows, frozenColumns);
    const buffer   = await workbook.xlsx.writeBuffer();
    const blob     = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url      = URL.createObjectURL(blob);
    const link     = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ── Workbook builder ───────────────────────────────────────────────────────

  private buildWorkbook(
    title: string,
    headers: string[],
    rows: (string | number | null | undefined)[][],
    frozenColumns = 0,
  ): Workbook {
    const orgName   = this.authService.getContext()?.tenantName ?? '';
    const generated = new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(new Date());

    const colCount  = headers.length;
    const lastCol   = this.colLetter(colCount);

    const workbook  = new Workbook();
    workbook.creator = orgName;
    const sheet = workbook.addWorksheet(title.slice(0, 31));

    // ── Meta rows ──────────────────────────────────────────────────────────────
    // Row 1 — Organisation
    sheet.mergeCells(`A1:${lastCol}1`);
    sheet.getRow(1).height = 32;
    const r1 = sheet.getCell('A1');
    r1.value     = orgName;
    r1.font      = { bold: true, size: 15, color: { argb: COLORS.white } };
    r1.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orgBg } };
    r1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    // Row 2 — Report title
    sheet.mergeCells(`A2:${lastCol}2`);
    sheet.getRow(2).height = 26;
    const r2 = sheet.getCell('A2');
    r2.value     = title;
    r2.font      = { bold: true, size: 12, color: { argb: COLORS.white } };
    r2.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.titleBg } };
    r2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    // Row 3 — Generated + total records
    sheet.mergeCells(`A3:${lastCol}3`);
    sheet.getRow(3).height = 20;
    const r3 = sheet.getCell('A3');
    r3.value     = `Generated: ${generated}   •   Total Records: ${rows.length}`;
    r3.font      = { size: 10, color: { argb: COLORS.white } };
    r3.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.metaBg } };
    r3.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    // Row 4 — Spacer
    sheet.mergeCells(`A4:${lastCol}4`);
    sheet.getRow(4).height = 8;

    // ── Column headers (row 5) ─────────────────────────────────────────────────
    sheet.getRow(5).height = 22;
    headers.forEach((header, i) => {
      const cell     = sheet.getRow(5).getCell(i + 1);
      cell.value     = header;
      cell.font      = { bold: true, size: 10, color: { argb: COLORS.white } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border    = { bottom: { style: 'thin', color: { argb: COLORS.headerBorder } } };
    });

    // ── Data rows (start at row 6) ─────────────────────────────────────────────
    rows.forEach((rowData, rowIdx) => {
      const excelRow = sheet.getRow(rowIdx + 6);
      excelRow.height = 18;
      const bgArgb    = rowIdx % 2 === 1 ? COLORS.altRow : COLORS.white;

      rowData.forEach((cellValue, colIdx) => {
        const cell     = excelRow.getCell(colIdx + 1);
        cell.value     = cellValue ?? '';
        cell.font      = { size: 10 };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.alignment = { vertical: 'middle', indent: 1 };
        cell.border    = { bottom: { style: 'thin', color: { argb: COLORS.rowBorder } } };
      });
    });

    // ── Column widths ──────────────────────────────────────────────────────────
    headers.forEach((header, i) => {
      const maxContentWidth = rows.reduce(
        (max, row) => Math.max(max, String(row[i] ?? '').length),
        0,
      );
      sheet.getColumn(i + 1).width = Math.min(
        Math.max(header.length + 4, maxContentWidth + 2),
        42,
      );
    });

    // Freeze the 4 meta rows + header row (ySplit) and optional left columns (xSplit)
    sheet.views = [{ state: 'frozen', ySplit: 5, xSplit: frozenColumns }];

    return workbook;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Converts a 1-based column index to Excel column letters (1→A, 27→AA, etc.). */
  private colLetter(n: number): string {
    let result = '';
    while (n > 0) {
      n--;
      result = String.fromCharCode(65 + (n % 26)) + result;
      n      = Math.floor(n / 26);
    }
    return result;
  }

  // ── Legacy CSV API (kept for any future plain-text export needs) ───────────

  exportCsv<T>(filename: string, title: string, columns: CsvColumn<T>[], data: T[]): void {
    const headers = columns.map(c => c.header);
    const rows    = data.map(row => columns.map(c => c.value(row)));
    this.downloadCsv(filename, title, headers, rows);
  }

  downloadCsv(
    filename: string,
    title: string,
    headers: string[],
    rows: (string | number | null | undefined)[][],
  ): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const escape = (cell: string | number | null | undefined): string => {
      const value = cell == null ? '' : String(cell);
      return value.includes(',') || value.includes('"') || value.includes('\n')
        ? `"${value.replace(/"/g, '""')}"`
        : value;
    };

    const orgName   = this.authService.getContext()?.tenantName ?? '';
    const generated = new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(new Date());

    const metaLines = [
      `Organisation,${escape(orgName)}`,
      `Report,${escape(title)}`,
      `Generated,${escape(generated)}`,
      `Total Records,${rows.length}`,
      '',
      headers.map(escape).join(','),
      ...rows.map(row => row.map(escape).join(',')),
    ];

    const blob = new Blob([metaLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
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
