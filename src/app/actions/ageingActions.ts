"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export interface AgeingBucket {
  current: number;    // Not yet due
  days0to30: number;  // 1 - 30 days overdue
  days31to60: number; // 31 - 60 days overdue
  days61to90: number; // 61 - 90 days overdue
  days90Plus: number; // > 90 days overdue
  totalOutstanding: number;
}

export interface PartyAgeingRow {
  partyId: string;
  partyName: string;
  mobile?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  totalInvoicesOrBills: number;
  buckets: AgeingBucket;
  invoicesOrBills: {
    id: string;
    docNumber: string;
    date: string;
    dueDate?: string;
    overdueDays: number;
    totalAmount: number;
    amountPaid: number;
    amountDue: number;
    bucketCategory: "CURRENT" | "0_30" | "31_60" | "61_90" | "90_PLUS";
  }[];
}

/**
 * 1. DEBTORS (RECEIVABLES) AGEING ANALYSIS
 */
export async function getDebtorsAgeingReport(asOfDateStr?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const asOfDate = asOfDateStr ? new Date(asOfDateStr) : new Date();
    asOfDate.setHours(23, 59, 59, 999);

    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        invoiceDate: { lte: asOfDate },
        status: { in: ["Unpaid", "Partially Paid", "Overdue"] }
      },
      include: {
        customer: true
      },
      orderBy: { invoiceDate: "asc" }
    });

    const partyMap: Record<string, PartyAgeingRow> = {};

    let grandTotalOutstanding = 0;
    let grandTotalCurrent = 0;
    let grandTotal0to30 = 0;
    let grandTotal31to60 = 0;
    let grandTotal61to90 = 0;
    let grandTotal90Plus = 0;

    for (const inv of invoices) {
      const cust = inv.customer;
      if (!cust) continue;

      const dueAmount = inv.amountDue > 0 ? inv.amountDue : inv.totalAmount - inv.amountPaid;
      if (dueAmount <= 0) continue;

      const invDueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate || inv.createdAt);
      const diffTime = asOfDate.getTime() - invDueDate.getTime();
      const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let bucketCategory: "CURRENT" | "0_30" | "31_60" | "61_90" | "90_PLUS" = "CURRENT";

      if (overdueDays <= 0) {
        bucketCategory = "CURRENT";
      } else if (overdueDays <= 30) {
        bucketCategory = "0_30";
      } else if (overdueDays <= 60) {
        bucketCategory = "31_60";
      } else if (overdueDays <= 90) {
        bucketCategory = "61_90";
      } else {
        bucketCategory = "90_PLUS";
      }

      if (!partyMap[cust.id]) {
        partyMap[cust.id] = {
          partyId: cust.id,
          partyName: cust.businessName || cust.contactPerson || "Customer",
          mobile: cust.mobile,
          city: cust.city || undefined,
          state: cust.state || undefined,
          gstNumber: cust.gstNumber || undefined,
          totalInvoicesOrBills: 0,
          buckets: {
            current: 0,
            days0to30: 0,
            days31to60: 0,
            days61to90: 0,
            days90Plus: 0,
            totalOutstanding: 0
          },
          invoicesOrBills: []
        };
      }

      const party = partyMap[cust.id];
      party.totalInvoicesOrBills += 1;
      party.buckets.totalOutstanding += dueAmount;

      if (bucketCategory === "CURRENT") {
        party.buckets.current += dueAmount;
        grandTotalCurrent += dueAmount;
      } else if (bucketCategory === "0_30") {
        party.buckets.days0to30 += dueAmount;
        grandTotal0to30 += dueAmount;
      } else if (bucketCategory === "31_60") {
        party.buckets.days31to60 += dueAmount;
        grandTotal31to60 += dueAmount;
      } else if (bucketCategory === "61_90") {
        party.buckets.days61to90 += dueAmount;
        grandTotal61to90 += dueAmount;
      } else {
        party.buckets.days90Plus += dueAmount;
        grandTotal90Plus += dueAmount;
      }

      grandTotalOutstanding += dueAmount;

      party.invoicesOrBills.push({
        id: inv.id,
        docNumber: inv.invoiceNumber,
        date: new Date(inv.invoiceDate || inv.createdAt).toISOString().split("T")[0],
        dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split("T")[0] : undefined,
        overdueDays: Math.max(0, overdueDays),
        totalAmount: inv.totalAmount,
        amountPaid: inv.amountPaid,
        amountDue: dueAmount,
        bucketCategory
      });
    }

    const rows = Object.values(partyMap).sort((a, b) => b.buckets.totalOutstanding - a.buckets.totalOutstanding);

    return {
      success: true,
      asOfDate: asOfDate.toISOString().split("T")[0],
      summary: {
        totalDebtors: rows.length,
        grandTotalOutstanding: Number(grandTotalOutstanding.toFixed(2)),
        grandTotalCurrent: Number(grandTotalCurrent.toFixed(2)),
        grandTotal0to30: Number(grandTotal0to30.toFixed(2)),
        grandTotal31to60: Number(grandTotal31to60.toFixed(2)),
        grandTotal61to90: Number(grandTotal61to90.toFixed(2)),
        grandTotal90Plus: Number(grandTotal90Plus.toFixed(2))
      },
      rows
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate Debtors Ageing report" };
  }
}

/**
 * 2. CREDITORS (PAYABLES) AGEING ANALYSIS
 */
export async function getCreditorsAgeingReport(asOfDateStr?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const asOfDate = asOfDateStr ? new Date(asOfDateStr) : new Date();
    asOfDate.setHours(23, 59, 59, 999);

    const bills = await prisma.bill.findMany({
      where: {
        organizationId,
        billDate: { lte: asOfDate },
        status: { in: ["Open", "Partially Paid", "Overdue"] }
      },
      include: {
        vendor: true
      },
      orderBy: { billDate: "asc" }
    });

    const partyMap: Record<string, PartyAgeingRow> = {};

    let grandTotalOutstanding = 0;
    let grandTotalCurrent = 0;
    let grandTotal0to30 = 0;
    let grandTotal31to60 = 0;
    let grandTotal61to90 = 0;
    let grandTotal90Plus = 0;

    for (const b of bills) {
      const vend = b.vendor;
      if (!vend) continue;

      const dueAmount = b.amountDue > 0 ? b.amountDue : b.totalAmount - b.amountPaid;
      if (dueAmount <= 0) continue;

      const billDueDate = b.dueDate ? new Date(b.dueDate) : new Date(b.billDate || b.createdAt);
      const diffTime = asOfDate.getTime() - billDueDate.getTime();
      const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let bucketCategory: "CURRENT" | "0_30" | "31_60" | "61_90" | "90_PLUS" = "CURRENT";

      if (overdueDays <= 0) {
        bucketCategory = "CURRENT";
      } else if (overdueDays <= 30) {
        bucketCategory = "0_30";
      } else if (overdueDays <= 60) {
        bucketCategory = "31_60";
      } else if (overdueDays <= 90) {
        bucketCategory = "61_90";
      } else {
        bucketCategory = "90_PLUS";
      }

      if (!partyMap[vend.id]) {
        partyMap[vend.id] = {
          partyId: vend.id,
          partyName: vend.companyName || vend.contactPerson || "Vendor",
          mobile: vend.mobile || undefined,
          city: vend.city || undefined,
          state: vend.state || undefined,
          gstNumber: vend.gstNumber || undefined,
          totalInvoicesOrBills: 0,
          buckets: {
            current: 0,
            days0to30: 0,
            days31to60: 0,
            days61to90: 0,
            days90Plus: 0,
            totalOutstanding: 0
          },
          invoicesOrBills: []
        };
      }

      const party = partyMap[vend.id];
      party.totalInvoicesOrBills += 1;
      party.buckets.totalOutstanding += dueAmount;

      if (bucketCategory === "CURRENT") {
        party.buckets.current += dueAmount;
        grandTotalCurrent += dueAmount;
      } else if (bucketCategory === "0_30") {
        party.buckets.days0to30 += dueAmount;
        grandTotal0to30 += dueAmount;
      } else if (bucketCategory === "31_60") {
        party.buckets.days31to60 += dueAmount;
        grandTotal31to60 += dueAmount;
      } else if (bucketCategory === "61_90") {
        party.buckets.days61to90 += dueAmount;
        grandTotal61to90 += dueAmount;
      } else {
        party.buckets.days90Plus += dueAmount;
        grandTotal90Plus += dueAmount;
      }

      grandTotalOutstanding += dueAmount;

      party.invoicesOrBills.push({
        id: b.id,
        docNumber: b.billNumber || b.vendorBillNumber || "BILL",
        date: new Date(b.billDate || b.createdAt).toISOString().split("T")[0],
        dueDate: b.dueDate ? new Date(b.dueDate).toISOString().split("T")[0] : undefined,
        overdueDays: Math.max(0, overdueDays),
        totalAmount: b.totalAmount,
        amountPaid: b.amountPaid,
        amountDue: dueAmount,
        bucketCategory
      });
    }

    const rows = Object.values(partyMap).sort((a, b) => b.buckets.totalOutstanding - a.buckets.totalOutstanding);

    return {
      success: true,
      asOfDate: asOfDate.toISOString().split("T")[0],
      summary: {
        totalCreditors: rows.length,
        grandTotalOutstanding: Number(grandTotalOutstanding.toFixed(2)),
        grandTotalCurrent: Number(grandTotalCurrent.toFixed(2)),
        grandTotal0to30: Number(grandTotal0to30.toFixed(2)),
        grandTotal31to60: Number(grandTotal31to60.toFixed(2)),
        grandTotal61to90: Number(grandTotal61to90.toFixed(2)),
        grandTotal90Plus: Number(grandTotal90Plus.toFixed(2))
      },
      rows
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate Creditors Ageing report" };
  }
}

/**
 * 3. BILL-BY-BILL SETTLEMENT & ALLOCATION ENGINE
 */
export async function allocateBillPayment(data: {
  paymentId?: string;
  vendorPaymentId?: string;
  allocations: {
    docId: string; // invoiceId or billId
    amount: number;
    allocationType: "AGAINST_REF" | "ADVANCE" | "ON_ACCOUNT" | "NEW_REF";
  }[];
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();

    if (data.paymentId) {
      // Customer payment against Invoices
      for (const alloc of data.allocations) {
        const inv = await prisma.invoice.findUnique({ where: { id: alloc.docId } });
        if (!inv) continue;

        const newPaid = inv.amountPaid + alloc.amount;
        const newDue = Math.max(0, inv.totalAmount - newPaid);
        const newStatus = newDue <= 0 ? "Paid" : "Partially Paid";

        await prisma.$transaction([
          prisma.billAllocation.create({
            data: {
              organizationId,
              paymentId: data.paymentId,
              invoiceId: alloc.docId,
              allocatedAmount: alloc.amount,
              allocationType: alloc.allocationType
            }
          }),
          prisma.invoice.update({
            where: { id: alloc.docId },
            data: { amountPaid: newPaid, amountDue: newDue, status: newStatus }
          })
        ]);
      }
    } else if (data.vendorPaymentId) {
      // Vendor payment against Bills
      for (const alloc of data.allocations) {
        const bill = await prisma.bill.findUnique({ where: { id: alloc.docId } });
        if (!bill) continue;

        const newPaid = bill.amountPaid + alloc.amount;
        const newDue = Math.max(0, bill.totalAmount - newPaid);
        const newStatus = newDue <= 0 ? "Paid" : "Partially Paid";

        await prisma.$transaction([
          prisma.billAllocation.create({
            data: {
              organizationId,
              vendorPaymentId: data.vendorPaymentId,
              billId: alloc.docId,
              allocatedAmount: alloc.amount,
              allocationType: alloc.allocationType
            }
          }),
          prisma.bill.update({
            where: { id: alloc.docId },
            data: { amountPaid: newPaid, amountDue: newDue, status: newStatus }
          })
        ]);
      }
    }

    revalidatePath("/accounting/ageing", "page");
    return { success: true, message: "Bill allocation completed successfully!" };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to allocate payments" };
  }
}
