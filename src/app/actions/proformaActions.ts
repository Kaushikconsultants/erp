"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { generateNextDocumentNumber } from "@/lib/documentNumbering";
import { syncSystemLedgers } from "./accountingActions";

export interface ProformaItemInput {
  productId?: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  unit?: string;
  rate: number;
  taxableAmount?: number;
  gstRate?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  total?: number;
}

export interface CreateProformaInput {
  customerId: string;
  orderId?: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
  termsConditions?: string;
  items: ProformaItemInput[];
}

export async function createProformaInvoice(data: CreateProformaInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const organizationId = await getTenantOrgId();
    if (!organizationId) return { error: "Organization context not found." };

    if (!data.customerId) {
      return { error: "Please select a customer for this Proforma Invoice." };
    }

    if (!data.items || data.items.length === 0) {
      return { error: "Please add at least one line item." };
    }

    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const processedItems = data.items.map(item => {
      const qty = Number(item.quantity) || 1;
      const rate = Number(item.rate) || 0;
      const taxable = item.taxableAmount !== undefined ? Number(item.taxableAmount) : qty * rate;
      const gstRate = Number(item.gstRate) || 0;

      const itemCgst = Number(item.cgst) || (taxable * (gstRate / 2) / 100);
      const itemSgst = Number(item.sgst) || (taxable * (gstRate / 2) / 100);
      const itemIgst = Number(item.igst) || 0;
      const tax = itemCgst + itemSgst + itemIgst;
      const total = item.total !== undefined ? Number(item.total) : taxable + tax;

      subtotal += taxable;
      cgst += itemCgst;
      sgst += itemSgst;
      igst += itemIgst;

      return {
        productId: item.productId || null,
        description: item.description,
        hsnCode: item.hsnCode || "6109",
        quantity: qty,
        unit: item.unit || "pcs",
        rate,
        taxableAmount: taxable,
        gstRate,
        cgst: itemCgst,
        sgst: itemSgst,
        igst: itemIgst,
        total
      };
    });

    const taxAmount = cgst + sgst + igst;
    const totalAmount = subtotal + taxAmount;

    const proformaNumber = await generateNextDocumentNumber(organizationId, 'PROFORMA_INVOICE');

    const proforma = await prisma.proformaInvoice.create({
      data: {
        organizationId,
        proformaNumber,
        customerId: data.customerId,
        orderId: data.orderId || null,
        issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        subtotal,
        taxAmount,
        cgst,
        sgst,
        igst,
        totalAmount,
        status: "DRAFT",
        notes: data.notes || null,
        termsConditions: data.termsConditions || "Proforma Invoice for advance estimation. Not a tax invoice. Goods will be dispatched upon receipt of advance payment.",
        items: {
          create: processedItems
        }
      },
      include: {
        customer: true,
        order: true,
        items: {
          include: { product: true }
        }
      }
    });

    revalidatePath("/proforma-invoices");
    revalidatePath("/invoices");
    revalidatePath("/customers");

    return { success: true, proforma };
  } catch (error: any) {
    console.error("createProformaInvoice error:", error);
    return { error: error?.message || "Failed to create Proforma Invoice" };
  }
}

export async function getProformaInvoices(filters?: {
  search?: string;
  status?: string;
  customerId?: string;
}) {
  try {
    const organizationId = await getTenantOrgId();
    const where: any = {
      ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {})
    };

    if (filters?.status && filters.status !== "All") {
      where.status = filters.status;
    }

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters?.search) {
      const q = filters.search.trim();
      where.OR = [
        { proformaNumber: { contains: q, mode: "insensitive" } },
        { customer: { businessName: { contains: q, mode: "insensitive" } } },
        { customer: { contactPerson: { contains: q, mode: "insensitive" } } },
        { order: { orderNumber: { contains: q, mode: "insensitive" } } }
      ];
    }

    const proformas = await prisma.proformaInvoice.findMany({
      where,
      include: {
        customer: true,
        order: true,
        invoice: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, proformas };
  } catch (error: any) {
    console.error("getProformaInvoices error:", error);
    return { success: false, error: error?.message || "Failed to fetch proforma invoices", proformas: [] };
  }
}

export async function getProformaInvoiceById(id: string) {
  try {
    const proforma = await prisma.proformaInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        order: true,
        invoice: true,
        items: {
          include: { product: true }
        }
      }
    });

    if (!proforma) return { error: "Proforma Invoice not found" };
    return { success: true, proforma };
  } catch (error: any) {
    return { error: error?.message || "Failed to fetch proforma invoice" };
  }
}

/**
 * 1-Click Conversion: Converts a Proforma Invoice into an official GST Tax Invoice
 * Deducts stock, creates Invoice record, updates Proforma status to CONVERTED, and syncs accounting ledgers.
 */
export async function convertProformaToTaxInvoice(proformaId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const organizationId = await getTenantOrgId();
    if (!organizationId) return { error: "Organization context not found." };

    const proforma = await prisma.proformaInvoice.findUnique({
      where: { id: proformaId },
      include: { items: true, customer: true }
    });

    if (!proforma) return { error: "Proforma invoice not found" };
    if (proforma.status === "CONVERTED") {
      return { error: "This Proforma Invoice has already been converted to a Tax Invoice." };
    }

    const invoiceNumber = await generateNextDocumentNumber(organizationId, 'INVOICE');

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Tax Invoice
      const invoice = await tx.invoice.create({
        data: {
          organizationId,
          invoiceNumber,
          customerId: proforma.customerId,
          orderId: proforma.orderId || null,
          invoiceDate: new Date(),
          subtotal: proforma.subtotal,
          taxAmount: proforma.taxAmount,
          discountAmount: 0,
          totalAmount: proforma.totalAmount,
          amountPaid: 0,
          amountDue: proforma.totalAmount,
          status: "Unpaid",
          notes: `Generated from Proforma Invoice #${proforma.proformaNumber}. ${proforma.notes || ''}`.trim()
        }
      });

      // 2. Deduct inventory stock & record inventory transactions
      for (const item of proforma.items) {
        if (item.productId && item.quantity > 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { decrement: Math.round(item.quantity) } }
          }).catch(() => {});

          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              quantity: Math.round(item.quantity),
              type: "OUT",
              reference: invoice.invoiceNumber,
              notes: `Dispatched via Invoice #${invoice.invoiceNumber} (Converted from PI #${proforma.proformaNumber})`
            }
          }).catch(() => {});
        }
      }

      // 3. Mark Proforma Invoice as CONVERTED and link invoiceId
      const updatedProforma = await tx.proformaInvoice.update({
        where: { id: proformaId },
        data: {
          status: "CONVERTED",
          invoiceId: invoice.id
        }
      });

      return { invoice, updatedProforma };
    });

    await syncSystemLedgers().catch(() => {});

    revalidatePath("/proforma-invoices");
    revalidatePath("/invoices");
    revalidatePath("/orders");
    revalidatePath("/products");
    revalidatePath("/accounting");

    return { success: true, invoice: result.invoice, proforma: result.updatedProforma };
  } catch (error: any) {
    console.error("convertProformaToTaxInvoice error:", error);
    return { error: error?.message || "Failed to convert Proforma Invoice to Tax Invoice" };
  }
}

export async function updateProformaStatus(id: string, status: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const updated = await prisma.proformaInvoice.update({
      where: { id },
      data: { status }
    });

    revalidatePath("/proforma-invoices");
    return { success: true, proforma: updated };
  } catch (error: any) {
    return { error: error?.message || "Failed to update proforma invoice status" };
  }
}

export async function deleteProformaInvoice(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const organizationId = await getTenantOrgId();

    const existing = await prisma.proformaInvoice.findUnique({ where: { id } });
    if (!existing) return { error: "Proforma invoice not found" };
    if (organizationId && existing.organizationId && existing.organizationId !== organizationId) {
      return { error: "Unauthorized" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.proformaInvoiceItem.deleteMany({ where: { proformaInvoiceId: id } });
      await tx.proformaInvoice.delete({ where: { id } });
    });

    revalidatePath("/proforma-invoices");
    return { success: true };
  } catch (error: any) {
    return { error: error?.message || "Failed to delete proforma invoice" };
  }
}

export async function deleteMultipleProformaInvoices(ids: string[]) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };
    if (!ids || ids.length === 0) return { error: "No proforma invoices selected to delete." };

    const organizationId = await getTenantOrgId();

    const proformas = await prisma.proformaInvoice.findMany({
      where: {
        id: { in: ids },
        ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {})
      }
    });

    if (proformas.length === 0) return { error: "No matching proforma invoices found to delete." };

    const validIds = proformas.map(p => p.id);

    await prisma.$transaction(async (tx) => {
      await tx.proformaInvoiceItem.deleteMany({ where: { proformaInvoiceId: { in: validIds } } });
      await tx.proformaInvoice.deleteMany({ where: { id: { in: validIds } } });
    });

    revalidatePath("/proforma-invoices");
    return { success: true, count: validIds.length };
  } catch (error: any) {
    return { error: error?.message || "Failed to delete selected proforma invoices" };
  }
}
