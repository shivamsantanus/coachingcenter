import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { PaymentRecord } from '../models/fee.models';

@Injectable({ providedIn: 'root' })
export class ReceiptService {
  private authService = inject(AuthService);

  printReceipt(payment: PaymentRecord): void {
    const orgName = this.authService.getContext()?.tenantName ?? 'ClassNova';
    if (payment.lineItems.length > 1) {
      this.openInTab(this.buildCombinedReceiptHtml(payment, orgName));
    } else {
      this.openInTab(this.buildSingleReceiptHtml(payment, orgName));
    }
  }

  private openInTab(html: string): void {
    const receiptTab = window.open('', '_blank');
    if (!receiptTab) return;
    receiptTab.document.open();
    receiptTab.document.write(html);
    receiptTab.document.close();
  }

  private initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('');
  }

  private formatDate(raw: unknown): string {
    const str = typeof raw === 'string' ? raw : '';
    if (!str) return '—';
    const [year, month, day] = str.split('-').map(Number);
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(
      new Date(year, month - 1, day)
    );
  }

  private formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  }

  private formatMethod(method: string): string {
    const labels: Record<string, string> = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', BANK: 'Bank Transfer' };
    return labels[method] ?? method;
  }

  private buildSingleReceiptHtml(payment: PaymentRecord, orgName: string): string {
    const lineItem        = payment.lineItems[0];
    const formattedDate   = this.formatDate(payment.paymentDate);
    const formattedAmount = this.formatAmount(payment.totalAmount);
    const orgInitials     = this.initials(orgName);

    let feePlanLabel = '—';
    if (lineItem) {
      const category = lineItem.feePlanCategory
        ? lineItem.feePlanCategory.charAt(0) + lineItem.feePlanCategory.slice(1).toLowerCase()
        : '';
      feePlanLabel = category ? `${lineItem.feePlanName} (${category})` : lineItem.feePlanName;
    }

    const optionalNotesRow = payment.notes
      ? `<div class="field-row">
           <span class="field-label">Notes</span>
           <span class="field-value">${this.escapeHtml(payment.notes)}</span>
         </div>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Receipt</title>
  <style>
    /* margin:0 removes the browser's header/footer strip (date, URL, page no) */
    @page { margin: 0; }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #111;
      background: #f0f0f0;
      display: flex;
      justify-content: center;
      padding: 2rem 1rem;
    }

    .receipt {
      background: #fff;
      border: 1px solid #d4d4d8;
      width: 100%;
      max-width: 520px;
      overflow: hidden;
    }

    /* ── Institute header ─────────────────────────────── */
    .inst-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem 1.5rem 1rem;
      border-bottom: 3px double #111;
    }

    .inst-logo {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      border: 2px solid #111;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.125rem;
      font-weight: 800;
      color: #111;
      flex-shrink: 0;
      letter-spacing: -0.02em;
    }

    .inst-name {
      flex: 1;
      font-size: 1.25rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      line-height: 1.2;
      color: #111;
    }

    .receipt-title-block {
      text-align: right;
      flex-shrink: 0;
    }
    .receipt-title-block .title-word {
      display: block;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: #71717a;
    }
    .receipt-title-block .title-main {
      display: block;
      font-size: 1rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #111;
    }

    /* ── Payee ────────────────────────────────────────── */
    .payee-section {
      padding: 0.875rem 1.5rem;
      border-bottom: 1px solid #e4e4e7;
      background: #fafafa;
    }
    .payee-label {
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #71717a;
      margin-bottom: 0.3rem;
    }
    .payee-name { font-size: 1.0625rem; font-weight: 700; }
    .payee-adm  { font-family: 'Courier New', monospace; font-size: 0.8125rem; color: #555; margin-top: 0.125rem; }

    /* ── Amount ───────────────────────────────────────── */
    .amount-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1.5rem;
      border-bottom: 1px solid #e4e4e7;
      background: #f0fdf4;
    }
    .amount-label { font-size: 0.875rem; font-weight: 600; color: #166534; }
    .amount-value { font-size: 1.75rem; font-weight: 800; color: #16a34a; font-variant-numeric: tabular-nums; }

    /* ── Fields ───────────────────────────────────────── */
    .fields-section { padding: 0.75rem 1.5rem 0.875rem; border-bottom: 1px solid #e4e4e7; }

    .field-row {
      display: flex;
      align-items: baseline;
      gap: 1rem;
      padding: 0.28rem 0;
      border-bottom: 1px dotted #e4e4e7;
    }
    .field-row:last-child { border-bottom: none; }
    .field-label { width: 8rem; flex-shrink: 0; font-size: 0.8125rem; color: #71717a; }
    .field-value { flex: 1; font-size: 0.8125rem; font-weight: 600; word-break: break-all; }
    .field-value.mono { font-family: 'Courier New', monospace; font-weight: 400; font-size: 0.75rem; }
    .field-value.muted { font-weight: 400; color: #bbb; }

    /* ── Signature ────────────────────────────────────── */
    .sig-section {
      display: flex;
      justify-content: flex-end;
      padding: 1.375rem 1.5rem 1.125rem;
    }
    .sig-box { text-align: center; min-width: 10rem; }
    .sig-line { height: 2.25rem; border-bottom: 1px solid #333; margin-bottom: 0.375rem; }
    .sig-caption { font-size: 0.75rem; color: #71717a; }

    /* ── Print button ─────────────────────────────────── */
    .print-btn {
      display: block;
      width: calc(100% - 3rem);
      margin: 0.75rem 1.5rem 1.25rem;
      padding: 0.6rem;
      background: #111;
      color: #fff;
      border: none;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      letter-spacing: 0.01em;
    }
    .print-btn:hover { background: #3f3f46; }

    @media print {
      body { background: #fff; padding: 1cm; }
      .receipt { border: none; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="receipt">

    <div class="inst-header">
      <div class="inst-logo">${this.escapeHtml(orgInitials)}</div>
      <div class="inst-name">${this.escapeHtml(orgName)}</div>
      <div class="receipt-title-block">
        <span class="title-word">Payment</span>
        <span class="title-main">Receipt</span>
      </div>
    </div>

    <div class="payee-section">
      <div class="payee-label">Received From</div>
      <div class="payee-name">${this.escapeHtml(payment.studentName)}</div>
      <div class="payee-adm">Admission No: ${this.escapeHtml(payment.admissionNo)}</div>
    </div>

    <div class="amount-bar">
      <span class="amount-label">Amount Paid</span>
      <span class="amount-value">&#8377;&nbsp;${formattedAmount}</span>
    </div>

    <div class="fields-section">
      <div class="field-row">
        <span class="field-label">Date</span>
        <span class="field-value">${formattedDate}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Receipt No</span>
        <span class="field-value mono">${this.escapeHtml(payment.systemId || 'N/A')}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Fee Plan</span>
        <span class="field-value">${this.escapeHtml(feePlanLabel)}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Payment Method</span>
        <span class="field-value">${this.formatMethod(payment.paymentMethod)}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Reference</span>
        <span class="field-value ${payment.referenceNo ? '' : 'muted'}">${this.escapeHtml(payment.referenceNo ?? '—')}</span>
      </div>
      ${optionalNotesRow}
    </div>

    <div class="sig-section">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-caption">Authorized Signatory</div>
      </div>
    </div>

    <button class="print-btn no-print" onclick="window.print()">&#128438;&nbsp; Print Receipt</button>

  </div>
  <script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`;
  }

  private buildCombinedReceiptHtml(payment: PaymentRecord, orgName: string): string {
    const orgInitials   = this.initials(orgName);
    const formattedDate = this.formatDate(payment.paymentDate);
    const method        = this.formatMethod(payment.paymentMethod);

    const lineItemsHtml = payment.lineItems.map(li => {
      const cat   = li.feePlanCategory
        ? li.feePlanCategory.charAt(0) + li.feePlanCategory.slice(1).toLowerCase()
        : '';
      const label = cat ? `${li.feePlanName} (${cat})` : li.feePlanName;
      return `<div class="line-item">
        <span class="line-label">${this.escapeHtml(label)}</span>
        <span class="line-amount">&#8377;&nbsp;${this.formatAmount(li.amountPaid)}</span>
      </div>`;
    }).join('');

    const optionalNotesRow = payment.notes
      ? `<div class="field-row">
           <span class="field-label">Notes</span>
           <span class="field-value">${this.escapeHtml(payment.notes)}</span>
         </div>`
      : '';

    const optionalRefRow = payment.referenceNo
      ? `<div class="field-row">
           <span class="field-label">Reference</span>
           <span class="field-value mono">${this.escapeHtml(payment.referenceNo)}</span>
         </div>`
      : `<div class="field-row">
           <span class="field-label">Reference</span>
           <span class="field-value muted">—</span>
         </div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Receipt</title>
  <style>
    @page { margin: 0; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #111;
      background: #f0f0f0; display: flex; justify-content: center; padding: 2rem 1rem;
    }
    .receipt { background: #fff; border: 1px solid #d4d4d8; width: 100%; max-width: 520px; overflow: hidden; }
    .inst-header { display: flex; align-items: center; gap: 1rem; padding: 1.25rem 1.5rem 1rem; border-bottom: 3px double #111; }
    .inst-logo { width: 54px; height: 54px; border-radius: 50%; border: 2px solid #111; display: flex; align-items: center; justify-content: center; font-size: 1.125rem; font-weight: 800; color: #111; flex-shrink: 0; letter-spacing: -0.02em; }
    .inst-name { flex: 1; font-size: 1.25rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1.2; color: #111; }
    .receipt-title-block { text-align: right; flex-shrink: 0; }
    .receipt-title-block .title-word { display: block; font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: #71717a; }
    .receipt-title-block .title-main { display: block; font-size: 1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #111; }
    .payee-section { padding: 0.875rem 1.5rem; border-bottom: 1px solid #e4e4e7; background: #fafafa; }
    .payee-label { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #71717a; margin-bottom: 0.3rem; }
    .payee-name { font-size: 1.0625rem; font-weight: 700; }
    .payee-adm  { font-family: 'Courier New', monospace; font-size: 0.8125rem; color: #555; margin-top: 0.125rem; }
    .amount-bar { display: flex; align-items: center; justify-content: space-between; padding: 0.875rem 1.5rem; border-bottom: 1px solid #e4e4e7; background: #f0fdf4; }
    .amount-label { font-size: 0.875rem; font-weight: 600; color: #166534; }
    .amount-value { font-size: 1.75rem; font-weight: 800; color: #16a34a; font-variant-numeric: tabular-nums; }
    .line-items { padding: 0.75rem 1.5rem; border-bottom: 1px solid #e4e4e7; background: #fafafa; }
    .line-items-label { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #71717a; margin-bottom: 0.5rem; }
    .line-item { display: flex; justify-content: space-between; align-items: baseline; padding: 0.3rem 0; border-bottom: 1px dotted #e4e4e7; }
    .line-item:last-child { border-bottom: none; }
    .line-label { font-size: 0.8125rem; font-weight: 500; color: #333; flex: 1; padding-right: 1rem; }
    .line-amount { font-size: 0.8125rem; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .fields-section { padding: 0.75rem 1.5rem 0.875rem; border-bottom: 1px solid #e4e4e7; }
    .field-row { display: flex; align-items: baseline; gap: 1rem; padding: 0.28rem 0; border-bottom: 1px dotted #e4e4e7; }
    .field-row:last-child { border-bottom: none; }
    .field-label { width: 8rem; flex-shrink: 0; font-size: 0.8125rem; color: #71717a; }
    .field-value { flex: 1; font-size: 0.8125rem; font-weight: 600; word-break: break-all; }
    .field-value.mono { font-family: 'Courier New', monospace; font-weight: 400; font-size: 0.75rem; }
    .field-value.muted { font-weight: 400; color: #bbb; }
    .sig-section { display: flex; justify-content: flex-end; padding: 1.375rem 1.5rem 1.125rem; }
    .sig-box { text-align: center; min-width: 10rem; }
    .sig-line { height: 2.25rem; border-bottom: 1px solid #333; margin-bottom: 0.375rem; }
    .sig-caption { font-size: 0.75rem; color: #71717a; }
    .print-btn { display: block; width: calc(100% - 3rem); margin: 0.75rem 1.5rem 1.25rem; padding: 0.6rem; background: #111; color: #fff; border: none; font-size: 0.875rem; font-weight: 600; cursor: pointer; letter-spacing: 0.01em; }
    .print-btn:hover { background: #3f3f46; }
    @media print { body { background: #fff; padding: 1cm; } .receipt { border: none; max-width: 100%; } .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="inst-header">
      <div class="inst-logo">${this.escapeHtml(orgInitials)}</div>
      <div class="inst-name">${this.escapeHtml(orgName)}</div>
      <div class="receipt-title-block">
        <span class="title-word">Payment</span>
        <span class="title-main">Receipt</span>
      </div>
    </div>
    <div class="payee-section">
      <div class="payee-label">Received From</div>
      <div class="payee-name">${this.escapeHtml(payment.studentName)}</div>
      <div class="payee-adm">Admission No: ${this.escapeHtml(payment.admissionNo)}</div>
    </div>
    <div class="amount-bar">
      <span class="amount-label">Total Amount Paid</span>
      <span class="amount-value">&#8377;&nbsp;${this.formatAmount(payment.totalAmount)}</span>
    </div>
    <div class="line-items">
      <div class="line-items-label">Fee Breakdown (${payment.lineItems.length} plans)</div>
      ${lineItemsHtml}
    </div>
    <div class="fields-section">
      <div class="field-row">
        <span class="field-label">Date</span>
        <span class="field-value">${formattedDate}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Receipt No</span>
        <span class="field-value mono">${this.escapeHtml(payment.systemId || 'N/A')}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Payment Method</span>
        <span class="field-value">${method}</span>
      </div>
      ${optionalRefRow}
      ${optionalNotesRow}
    </div>
    <div class="sig-section">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-caption">Authorized Signatory</div>
      </div>
    </div>
    <button class="print-btn no-print" onclick="window.print()">&#128438;&nbsp; Print Receipt</button>
  </div>
  <script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
