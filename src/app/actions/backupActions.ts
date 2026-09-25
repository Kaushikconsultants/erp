"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";

export async function exportFullCompanyData() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };
    const role = (session.user as any).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return { success: false, error: "Permission denied. Only administrators can export company data." };
    }
    const organizationId = await getTenantOrgId();

    const [
      company,
      customers,
      vendors,
      products,
      orders,
      invoices,
      bills,
      ledgers,
      journalEntries,
      employees,
      attendance,
      stockTransfers,
      pdcs
    ] = await Promise.all([
      prisma.companySettings.findFirst({ where: { organizationId } }),
      prisma.customer.findMany({ where: { organizationId } }),
      prisma.vendor.findMany({ where: { organizationId } }),
      prisma.product.findMany({ where: { organizationId } }),
      prisma.order.findMany({
        where: { organizationId },
        include: { items: { include: { product: true } } }
      }),
      prisma.invoice.findMany({ where: { organizationId } }),
      prisma.bill.findMany({ where: { organizationId } }),
      prisma.ledgerAccount.findMany({
        where: { organizationId },
        include: { accountGroup: true }
      }),
      prisma.journalEntry.findMany({
        where: { organizationId },
        include: { lines: { include: { ledgerAccount: true } } }
      }),
      prisma.employee.findMany({
        where: { organizationId },
        include: { user: true }
      }),
      prisma.attendance.findMany({
        where: { employee: { organizationId } },
        include: { employee: { include: { user: true } } }
      }),
      prisma.stockTransfer.findMany({
        where: { organizationId },
        include: { items: true }
      }),
      prisma.postDatedCheque.findMany({ where: { organizationId } })
    ]);

    const backupPayload = {
      backupMetadata: {
        exportedAt: new Date().toISOString(),
        organizationId,
        exportedBy: session.user.name || session.user.email,
        version: "2.0.0",
        format: "ANTIGRAVITY_ENTERPRISE_ARCHIVE"
      },
      company,
      masters: {
        customers,
        vendors,
        products,
        employees,
        ledgers
      },
      transactions: {
        orders,
        invoices,
        bills,
        journalEntries,
        stockTransfers,
        postDatedCheques: pdcs,
        attendance
      }
    };

    return {
      success: true,
      data: backupPayload,
      summary: {
        customerCount: customers.length,
        vendorCount: vendors.length,
        productCount: products.length,
        orderCount: orders.length,
        invoiceCount: invoices.length,
        ledgerCount: ledgers.length,
        journalCount: journalEntries.length,
        timestamp: new Date().toISOString()
      }
    };
  } catch (err: any) {
    console.error("Backup export error:", err);
    return { success: false, error: err.message || "Failed to generate company backup" };
  }
}
