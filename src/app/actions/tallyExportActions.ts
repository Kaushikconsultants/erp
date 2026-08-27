"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";

export async function exportTallySalesInvoices(startDateStr?: string, endDateStr?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const organizationId = await getTenantOrgId();

    const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().getFullYear(), 3, 1);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const invoices = await prisma.invoice.findMany({
      where: {
        customer: { organizationId },
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        customer: true,
        order: {
          include: {
            items: {
              include: { product: true }
            }
          }
        }
      },
      orderBy: { invoiceDate: 'asc' }
    });

    // Standard Tally Prime Sales Voucher Format
    const csvRows = [
      [
        "Voucher Date",
        "Voucher Type",
        "Voucher Number",
        "Party Ledger Name",
        "State",
        "GSTIN / UIN",
        "Item Name",
        "HSN Code",
        "Quantity",
        "Item Rate",
        "Taxable Amount",
        "CGST Rate (%)",
        "CGST Amount (₹)",
        "SGST Rate (%)",
        "SGST Amount (₹)",
        "IGST Rate (%)",
        "IGST Amount (₹)",
        "Total Voucher Amount",
        "Payment Status",
        "Narration"
      ]
    ];

    invoices.forEach(inv => {
      const invDate = new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const party = inv.customer?.businessName || inv.customer?.contactPerson || 'Customer';
      const state = inv.customer?.state || 'Haryana';
      const gstin = inv.customer?.gstNumber || 'URP';
      const items = inv.order?.items || [];

      if (items.length > 0) {
        items.forEach(it => {
          const isInter = inv.order?.isInterstate || false;
          const gstRate = it.gstRate || 5;
          const cgstRate = isInter ? 0 : gstRate / 2;
          const sgstRate = isInter ? 0 : gstRate / 2;
          const igstRate = isInter ? gstRate : 0;

          const taxable = it.total / (1 + gstRate / 100);
          const cgstAmt = isInter ? 0 : it.cgst || (taxable * (cgstRate / 100));
          const sgstAmt = isInter ? 0 : it.sgst || (taxable * (sgstRate / 100));
          const igstAmt = isInter ? it.igst || (taxable * (igstRate / 100)) : 0;

          csvRows.push([
            invDate,
            "Sales",
            inv.invoiceNumber,
            `"${party}"`,
            state,
            gstin,
            `"${it.product?.name || 'Garment Item'}"`,
            it.hsnCode || '6109',
            String(it.quantity),
            String(it.rate),
            taxable.toFixed(2),
            String(cgstRate),
            cgstAmt.toFixed(2),
            String(sgstRate),
            sgstAmt.toFixed(2),
            String(igstRate),
            igstAmt.toFixed(2),
            it.total.toFixed(2),
            inv.status,
            `"Invoice #${inv.invoiceNumber} converted from Sales Order ${inv.order?.orderNumber || ''}"`
          ]);
        });
      } else {
        // Fallback row for summary invoice
        csvRows.push([
          invDate,
          "Sales",
          inv.invoiceNumber,
          `"${party}"`,
          state,
          gstin,
          "Sales Account",
          "6109",
          "1",
          String(inv.subtotal),
          inv.subtotal.toFixed(2),
          "2.5",
          (inv.taxAmount / 2).toFixed(2),
          "2.5",
          (inv.taxAmount / 2).toFixed(2),
          "0",
          "0.00",
          inv.totalAmount.toFixed(2),
          inv.status,
          `"Invoice #${inv.invoiceNumber}"`
        ]);
      }
    });

    const csvContent = csvRows.map(r => r.join(",")).join("\n");
    return {
      success: true,
      csvContent,
      filename: `Tally_Sales_Invoices_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.csv`,
      totalInvoices: invoices.length
    };
  } catch (error: any) {
    console.error("Error exporting Tally sales invoices:", error);
    return { success: false, error: error.message || "Failed to export Tally data" };
  }
}

export async function exportTallyCustomerMasters() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const organizationId = await getTenantOrgId();

    const customers = await prisma.customer.findMany({
      where: { organizationId },
      orderBy: { businessName: 'asc' }
    });

    const csvRows = [
      [
        "Party Ledger Name",
        "Alias / Contact Person",
        "Parent Group",
        "Address",
        "City",
        "State",
        "Pincode",
        "Mobile",
        "Email",
        "GSTIN / UIN",
        "PAN",
        "Opening Balance (₹)",
        "Opening Balance Type"
      ]
    ];

    customers.forEach(c => {
      csvRows.push([
        `"${c.businessName}"`,
        `"${c.contactPerson || ''}"`,
        "Sundry Debtors",
        `"${(c.billingAddress || '').replace(/"/g, '""')}"`,
        c.city || 'Rohtak',
        c.state || 'Haryana',
        c.pincode || '124001',
        c.mobile || '',
        c.email || '',
        c.gstNumber || 'URP',
        c.pan || '',
        String(c.openingBalance || 0),
        c.openingBalanceType || 'DEBIT'
      ]);
    });

    const csvContent = csvRows.map(r => r.join(",")).join("\n");
    return {
      success: true,
      csvContent,
      filename: `Tally_Customer_Masters_${new Date().toISOString().split('T')[0]}.csv`,
      totalCount: customers.length
    };
  } catch (error: any) {
    console.error("Error exporting customer masters:", error);
    return { success: false, error: error.message || "Failed to export customer masters" };
  }
}

export async function exportTallyPurchaseBills(startDateStr?: string, endDateStr?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const organizationId = await getTenantOrgId();
    const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().getFullYear(), 3, 1);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const bills = await prisma.bill.findMany({
      where: {
        organizationId,
        billDate: { gte: startDate, lte: endDate }
      },
      include: {
        vendor: true,
        items: true
      },
      orderBy: { billDate: 'asc' }
    });

    const csvRows = [
      [
        "Voucher Date",
        "Voucher Type",
        "Voucher Number",
        "Supplier Invoice #",
        "Party Ledger Name",
        "State",
        "GSTIN / UIN",
        "Item Description",
        "HSN Code",
        "Quantity",
        "Rate",
        "Taxable Amount",
        "GST Rate (%)",
        "Tax Amount (₹)",
        "Total Voucher Amount",
        "Payment Status",
        "Narration"
      ]
    ];

    bills.forEach(b => {
      const bDate = new Date(b.billDate || b.createdAt).toLocaleDateString('en-GB');
      const party = b.vendor?.companyName || 'Vendor';
      const state = b.vendor?.state || 'Haryana';
      const gstin = b.vendor?.gstNumber || 'URP';

      if (b.items && b.items.length > 0) {
        b.items.forEach(it => {
          csvRows.push([
            bDate,
            "Purchase",
            b.billNumber,
            b.vendorBillNumber || "",
            `"${party}"`,
            state,
            gstin,
            `"${it.description || 'Raw Materials / Goods'}"`,
            it.hsnCode || "6109",
            String(it.quantity || 1),
            String(it.rate || 0),
            String(it.total || 0),
            String(it.gstRate || 0),
            String(it.taxAmount || 0),
            String(b.totalAmount),
            b.status,
            `"Purchase Bill #${b.billNumber}"`
          ]);
        });
      } else {
        csvRows.push([
          bDate,
          "Purchase",
          b.billNumber,
          b.vendorBillNumber || "",
          `"${party}"`,
          state,
          gstin,
          "Purchase Account",
          "6109",
          "1",
          String(b.subtotal),
          String(b.subtotal),
          "12",
          String(b.taxAmount),
          String(b.totalAmount),
          b.status,
          `"Purchase Bill #${b.billNumber}"`
        ]);
      }
    });

    const csvContent = csvRows.map(r => r.join(",")).join("\n");
    return {
      success: true,
      csvContent,
      filename: `Tally_Purchase_Bills_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.csv`,
      totalCount: bills.length
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to export purchase bills" };
  }
}

export async function exportTallyJournalVouchers(startDateStr?: string, endDateStr?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const organizationId = await getTenantOrgId();
    const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().getFullYear(), 3, 1);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const vouchers = await prisma.journalEntry.findMany({
      where: {
        organizationId,
        date: { gte: startDate, lte: endDate }
      },
      include: {
        lines: {
          include: { ledgerAccount: true }
        }
      },
      orderBy: { date: 'asc' }
    });

    const csvRows = [
      [
        "Voucher Date",
        "Voucher Type",
        "Voucher Number",
        "Reference #",
        "Ledger Name",
        "Debit Amount (₹)",
        "Credit Amount (₹)",
        "Particulars",
        "Narration"
      ]
    ];

    vouchers.forEach(v => {
      const vDate = new Date(v.date).toLocaleDateString('en-GB');
      v.lines.forEach(l => {
        csvRows.push([
          vDate,
          v.voucherType,
          v.voucherNumber,
          v.referenceNumber || "",
          `"${l.ledgerAccount?.name || 'Ledger'}"`,
          String(l.debit || 0),
          String(l.credit || 0),
          `"${l.particulars || ''}"`,
          `"${(v.narration || '').replace(/"/g, '""')}"`
        ]);
      });
    });

    const csvContent = csvRows.map(r => r.join(",")).join("\n");
    return {
      success: true,
      csvContent,
      filename: `Tally_Journal_Vouchers_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.csv`,
      totalCount: vouchers.length
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to export journal vouchers" };
  }
}

