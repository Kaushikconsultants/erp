import { describe, it, expect } from 'vitest';

// ── Financial Calculation Functions to Test ──

export interface TaxCalculationResult {
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxTotal: number;
  totalValue: number;
}

export function calculateGstTaxes(
  subtotal: number,
  gstRatePercent: number,
  isInterstate: boolean
): TaxCalculationResult {
  const safeSubtotal = Math.max(0, subtotal);
  const safeRate = Math.max(0, gstRatePercent);

  if (isInterstate) {
    const igst = Math.round((safeSubtotal * safeRate) / 100);
    return {
      subtotal: safeSubtotal,
      cgst: 0,
      sgst: 0,
      igst,
      taxTotal: igst,
      totalValue: safeSubtotal + igst
    };
  } else {
    const halfRate = safeRate / 2;
    const cgst = Math.round((safeSubtotal * halfRate) / 100);
    const sgst = Math.round((safeSubtotal * halfRate) / 100);
    const taxTotal = cgst + sgst;
    return {
      subtotal: safeSubtotal,
      cgst,
      sgst,
      igst: 0,
      taxTotal,
      totalValue: safeSubtotal + taxTotal
    };
  }
}

export function calculateInvoiceOutstanding(
  totalAmount: number,
  amountPaid: number
): { amountDue: number; status: 'Paid' | 'Partially Paid' | 'Unpaid' } {
  const safeTotal = Math.max(0, totalAmount);
  const safePaid = Math.max(0, amountPaid);
  const amountDue = Math.max(0, safeTotal - safePaid);

  let status: 'Paid' | 'Partially Paid' | 'Unpaid' = 'Unpaid';
  if (safePaid >= safeTotal && safeTotal > 0) {
    status = 'Paid';
  } else if (safePaid > 0) {
    status = 'Partially Paid';
  }

  return { amountDue, status };
}

export function validateLedgerBalance(
  debits: number[],
  credits: number[]
): { isBalanced: boolean; totalDebit: number; totalCredit: number; discrepancy: number } {
  const totalDebit = debits.reduce((sum, d) => sum + Number(d || 0), 0);
  const totalCredit = credits.reduce((sum, c) => sum + Number(c || 0), 0);
  const discrepancy = Math.abs(totalDebit - totalCredit);

  return {
    isBalanced: discrepancy < 0.01,
    totalDebit,
    totalCredit,
    discrepancy
  };
}

// ── Test Suites ──

describe('Financial Calculation Engine - Core Verification', () => {
  describe('GST Tax Calculation (Intrastate vs Interstate)', () => {
    it('should calculate 18% Intrastate GST splitting equally into 9% CGST and 9% SGST', () => {
      const result = calculateGstTaxes(10000, 18, false);
      expect(result.cgst).toBe(900);
      expect(result.sgst).toBe(900);
      expect(result.igst).toBe(0);
      expect(result.taxTotal).toBe(1800);
      expect(result.totalValue).toBe(11800);
    });

    it('should calculate 18% Interstate GST as 18% IGST with zero CGST/SGST', () => {
      const result = calculateGstTaxes(10000, 18, true);
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
      expect(result.igst).toBe(1800);
      expect(result.taxTotal).toBe(1800);
      expect(result.totalValue).toBe(11800);
    });

    it('should handle zero subtotal gracefully without NaN or negative values', () => {
      const result = calculateGstTaxes(0, 18, false);
      expect(result.totalValue).toBe(0);
      expect(result.taxTotal).toBe(0);
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
    });
  });

  describe('Invoice Outstanding & Payment Status', () => {
    it('should mark invoice as Paid when full amount is settled', () => {
      const { amountDue, status } = calculateInvoiceOutstanding(50000, 50000);
      expect(amountDue).toBe(0);
      expect(status).toBe('Paid');
    });

    it('should mark invoice as Partially Paid and compute accurate remaining due', () => {
      const { amountDue, status } = calculateInvoiceOutstanding(50000, 20000);
      expect(amountDue).toBe(30000);
      expect(status).toBe('Partially Paid');
    });

    it('should mark invoice as Unpaid when 0 received', () => {
      const { amountDue, status } = calculateInvoiceOutstanding(50000, 0);
      expect(amountDue).toBe(50000);
      expect(status).toBe('Unpaid');
    });

    it('should prevent negative balance due if advance payment exceeds total', () => {
      const { amountDue, status } = calculateInvoiceOutstanding(50000, 60000);
      expect(amountDue).toBe(0);
      expect(status).toBe('Paid');
    });
  });

  describe('Ledger Double-Entry Balance Verification', () => {
    it('should confirm ledger balance when debits exactly equal credits', () => {
      const debits = [10000, 5000, 2500];
      const credits = [17500];
      const result = validateLedgerBalance(debits, credits);

      expect(result.isBalanced).toBe(true);
      expect(result.totalDebit).toBe(17500);
      expect(result.totalCredit).toBe(17500);
      expect(result.discrepancy).toBe(0);
    });

    it('should flag an imbalanced ledger when debit does not match credit', () => {
      const debits = [10000, 5000];
      const credits = [14000];
      const result = validateLedgerBalance(debits, credits);

      expect(result.isBalanced).toBe(false);
      expect(result.discrepancy).toBe(1000);
    });
  });
});
