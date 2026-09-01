"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";

export interface LedgerTransaction {
  id: string;
  date: Date;
  type: 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE' | 'OPENING_BALANCE';
  voucherNumber: string;
  particulars: string;
  debit: number;   // Invoices / Sales (Increases Receivable)
  credit: number;  // Payments Received / Credit Notes (Decreases Receivable)
  balance: number; // Running Balance
  paymentMode?: string;
  notes?: string;
}

export interface CustomerLedgerResult {
  success: boolean;
  error?: string;
  customer?: any;
  companySettings?: any;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  transactions: LedgerTransaction[];
  startDate?: string;
  endDate?: string;
}

export async function getCustomerLedgerStatement(
  customerId: string,
  startDateStr?: string,
  endDateStr?: string
): Promise<CustomerLedgerResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized", openingBalance: 0, totalDebit: 0, totalCredit: 0, closingBalance: 0, transactions: [] };

    const organizationId = await getTenantOrgId();

    const [customer, companySettings] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          assignedSalesperson: { include: { user: true } }
        }
      }),
      prisma.companySettings.findFirst({
        where: { organizationId }
      })
    ]);

    if (!customer || customer.organizationId !== organizationId) {
      return { success: false, error: "Customer not found", openingBalance: 0, totalDebit: 0, totalCredit: 0, closingBalance: 0, transactions: [] };
    }

    const rawRole = (session.user as any).role || 'SALES';
    const normRole = String(rawRole).trim().toUpperCase();
    const userId = (session.user as any).id;
    const isSuperOrAdmin = normRole === 'SUPER_ADMIN' || normRole === 'ADMIN' || normRole === 'ACCOUNTS' || normRole === 'MANAGER';

    if (!isSuperOrAdmin) {
      let employee = await prisma.employee.findUnique({ where: { userId } });
      if (!employee && organizationId) {
        employee = await prisma.employee.findFirst({ where: { organizationId, userId } });
      }
      if (!employee && session.user.email) {
        employee = await prisma.employee.findFirst({
          where: {
            organizationId,
            user: { email: { equals: session.user.email.trim(), mode: 'insensitive' } }
          }
        });
      }
      if (!employee || customer.assignedSalespersonId !== employee.id) {
        return { success: false, error: "Permission Denied: You can only view ledger for your assigned customers.", openingBalance: 0, totalDebit: 0, totalCredit: 0, closingBalance: 0, transactions: [] };
      }
    }

    const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().getFullYear(), 3, 1); // Default from April 1st (Indian Financial Year)
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    endDate.setHours(23, 59, 59, 999);

    // Fetch all Invoices for this customer
    const invoices = await prisma.invoice.findMany({
      where: {
        customerId,
        createdAt: { lte: endDate }
      },
      orderBy: { invoiceDate: 'asc' }
    });

    // Fetch all Payments for this customer (Invoice Payments, Advance Payments, On-Account)
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          { customerId },
          { invoice: { customerId } }
        ],
        status: { in: ['Completed', 'Success', 'Received', 'Processed'] },
        paymentDate: { lte: endDate }
      },
      include: { invoice: true },
      orderBy: { paymentDate: 'asc' }
    });

    // Fetch Credit Notes
    const creditNotes = await prisma.creditNote.findMany({
      where: {
        customerId,
        status: { not: 'CANCELLED' },
        createdAt: { lte: endDate }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Build Chronological Ledger
    const allEvents: {
      date: Date;
      type: 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE' | 'OPENING_BALANCE';
      voucherNumber: string;
      particulars: string;
      debit: number;
      credit: number;
      paymentMode?: string;
      notes?: string;
    }[] = [];

    // Customer opening balance
    const rawOpening = customer.openingBalance || 0;
    const isOpeningDebit = customer.openingBalanceType !== 'CREDIT';

    if (rawOpening > 0) {
      allEvents.push({
        date: customer.createdAt,
        type: 'OPENING_BALANCE',
        voucherNumber: 'OB-001',
        particulars: 'Opening Balance as per records',
        debit: isOpeningDebit ? rawOpening : 0,
        credit: isOpeningDebit ? 0 : rawOpening,
        notes: 'Initial account balance'
      });
    }

    // Add Invoices
    for (const inv of invoices) {
      allEvents.push({
        date: inv.invoiceDate || inv.createdAt,
        type: 'INVOICE',
        voucherNumber: inv.invoiceNumber,
        particulars: `Sales Invoice #${inv.invoiceNumber} (Status: ${inv.status})`,
        debit: inv.totalAmount,
        credit: 0,
        notes: inv.notes || undefined
      });
    }

    // Add Payments
    for (const pay of payments) {
      const isAdvance = pay.paymentType === 'Advance Payment' || pay.paymentType === 'On-Account' || !pay.invoiceId;
      const refDetail = isAdvance 
        ? (pay.paymentType || 'Advance Payment') 
        : `Against Inv #${pay.invoice?.invoiceNumber || 'Sales'}`;

      allEvents.push({
        date: pay.paymentDate,
        type: 'PAYMENT',
        voucherNumber: pay.paymentNumber || pay.referenceNumber || 'RCPT',
        particulars: `Payment Received [${refDetail}]`,
        debit: 0,
        credit: pay.amount,
        paymentMode: pay.paymentMode || 'Bank Transfer',
        notes: pay.notes || undefined
      });
    }

    // Add Credit Notes
    for (const cn of creditNotes) {
      allEvents.push({
        date: cn.createdAt,
        type: 'CREDIT_NOTE',
        voucherNumber: cn.creditNoteNumber,
        particulars: `Credit Note #${cn.creditNoteNumber} [Reason: ${cn.reason || 'Goods Return'}]`,
        debit: 0,
        credit: cn.totalAmount,
        notes: cn.notes || undefined
      });
    }

    // Sort chronologically
    allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate Running Balance and filter by date range
    let currentBalance = 0;
    let periodOpeningBalance = 0;
    let periodTotalDebit = 0;
    let periodTotalCredit = 0;
    const periodTransactions: LedgerTransaction[] = [];

    allEvents.forEach((ev, idx) => {
      currentBalance = currentBalance + ev.debit - ev.credit;
      const evDate = new Date(ev.date);

      if (evDate < startDate) {
        periodOpeningBalance = currentBalance;
      } else if (evDate <= endDate) {
        periodTotalDebit += ev.debit;
        periodTotalCredit += ev.credit;

        periodTransactions.push({
          id: `tx-${idx}`,
          date: ev.date,
          type: ev.type,
          voucherNumber: ev.voucherNumber,
          particulars: ev.particulars,
          debit: ev.debit,
          credit: ev.credit,
          balance: currentBalance,
          paymentMode: ev.paymentMode,
          notes: ev.notes
        });
      }
    });

    return {
      success: true,
      customer,
      companySettings,
      openingBalance: periodOpeningBalance,
      totalDebit: periodTotalDebit,
      totalCredit: periodTotalCredit,
      closingBalance: currentBalance,
      transactions: periodTransactions,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  } catch (error: any) {
    console.error("Error generating customer ledger statement:", error);
    return {
      success: false,
      error: error.message || "Failed to generate ledger statement",
      openingBalance: 0,
      totalDebit: 0,
      totalCredit: 0,
      closingBalance: 0,
      transactions: []
    };
  }
}
