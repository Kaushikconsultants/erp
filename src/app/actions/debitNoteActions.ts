"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { generateNextDocumentNumber } from "@/lib/documentNumbering";
import { syncSystemLedgers } from "./accountingActions";
import { checkPeriodLock } from "./periodLockActions";

export interface DebitNoteItemInput {
  productId?: string;
  description: string;
  sku?: string;
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

export interface CreateDebitNoteInput {
  type: 'CUSTOMER' | 'VENDOR';
  customerId?: string;
  vendorId?: string;
  invoiceId?: string;
  billId?: string;
  orderId?: string;
  debitNoteDate?: string;
  reason: string;
  notes?: string;
  termsConditions?: string;
  items: DebitNoteItemInput[];
}

export async function createDebitNote(data: CreateDebitNoteInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const organizationId = await getTenantOrgId();
    if (!organizationId) return { error: "Organization context not found." };

    if (!data.items || data.items.length === 0) {
      return { error: "Please add at least one line item to the debit note." };
    }

    if (data.type === 'CUSTOMER' && !data.customerId) {
      return { error: "Please select a customer for this debit note." };
    }

    if (data.type === 'VENDOR' && !data.vendorId) {
      return { error: "Please select a vendor for this debit note." };
    }

    const lockCheck = await checkPeriodLock(data.debitNoteDate || new Date());
    if (lockCheck.isLocked) return { error: lockCheck.error };

    // Calculate totals
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const processedItems = data.items.map(item => {
      const qty = Number(item.quantity) || 1;
      const rate = Number(item.rate) || 0;
      const taxable = item.taxableAmount !== undefined ? Number(item.taxableAmount) : qty * rate;
      const gstRate = Number(item.gstRate) || 0;
      
      const itemCgst = Number(item.cgst) || 0;
      const itemSgst = Number(item.sgst) || 0;
      const itemIgst = Number(item.igst) || 0;
      const tax = itemCgst + itemSgst + itemIgst || (taxable * gstRate / 100);
      const total = item.total !== undefined ? Number(item.total) : taxable + tax;

      subtotal += taxable;
      cgst += itemCgst;
      sgst += itemSgst;
      igst += itemIgst;

      return {
        productId: item.productId || null,
        description: item.description,
        sku: item.sku || null,
        hsnCode: item.hsnCode || "6109",
        quantity: qty,
        unit: item.unit || "pcs",
        rate,
        taxableAmount: taxable,
        gstRate,
        cgst: itemCgst,
        sgst: itemSgst,
        igst: itemIgst,
        taxAmount: tax,
        total
      };
    });

    const taxAmount = cgst + sgst + igst;
    const totalAmount = subtotal + taxAmount;

    // Generate next document number
    const debitNoteNumber = await generateNextDocumentNumber(organizationId, 'DEBIT_NOTE');

    const debitNote = await prisma.$transaction(async (tx) => {
      const created = await tx.debitNote.create({
        data: {
          organizationId,
          debitNoteNumber,
          type: data.type,
          customerId: data.type === 'CUSTOMER' ? data.customerId : null,
          vendorId: data.type === 'VENDOR' ? data.vendorId : null,
          invoiceId: data.invoiceId || null,
          billId: data.billId || null,
          orderId: data.orderId || null,
          debitNoteDate: data.debitNoteDate ? new Date(data.debitNoteDate) : new Date(),
          reason: data.reason,
          notes: data.notes || null,
          termsConditions: data.termsConditions || (data.type === 'CUSTOMER' ? 'Debit note issued for supplementary charges / price revision.' : 'Debit note issued for return / rate difference.'),
          status: 'OPEN',
          subtotal,
          taxAmount,
          cgst,
          sgst,
          igst,
          totalAmount,
          allocatedAmount: 0,
          balanceAmount: totalAmount,
          items: {
            create: processedItems
          }
        },
        include: {
          customer: true,
          vendor: true,
          invoice: true,
          bill: true,
          items: {
            include: { product: true }
          }
        }
      });

      return created;
    });

    await syncSystemLedgers().catch(() => {});

    revalidatePath("/debit-notes");
    revalidatePath("/invoices");
    revalidatePath("/bills");
    revalidatePath("/customers");
    revalidatePath("/vendors");
    revalidatePath("/accounting");
    revalidatePath("/accounting/vouchers");

    return { success: true, debitNote };
  } catch (error: any) {
    console.error("createDebitNote error:", error);
    return { error: error?.message || "Failed to create debit note" };
  }
}

export async function getDebitNotes(filters?: {
  search?: string;
  type?: string;
  status?: string;
  customerId?: string;
  vendorId?: string;
}) {
  try {
    const organizationId = await getTenantOrgId();
    const where: any = {
      ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {})
    };

    if (filters?.type && filters.type !== 'All') {
      where.type = filters.type;
    }

    if (filters?.status && filters.status !== 'All') {
      where.status = filters.status;
    }

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters?.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters?.search) {
      const q = filters.search.trim();
      where.OR = [
        { debitNoteNumber: { contains: q, mode: 'insensitive' } },
        { reason: { contains: q, mode: 'insensitive' } },
        { customer: { businessName: { contains: q, mode: 'insensitive' } } },
        { vendor: { companyName: { contains: q, mode: 'insensitive' } } },
        { invoice: { invoiceNumber: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const debitNotes = await prisma.debitNote.findMany({
      where,
      include: {
        customer: true,
        vendor: true,
        invoice: true,
        bill: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, debitNotes };
  } catch (error: any) {
    console.error("getDebitNotes error:", error);
    return { success: false, error: error?.message || "Failed to fetch debit notes", debitNotes: [] };
  }
}

export async function getDebitNoteById(id: string) {
  try {
    const debitNote = await prisma.debitNote.findUnique({
      where: { id },
      include: {
        customer: true,
        vendor: true,
        invoice: true,
        bill: true,
        items: {
          include: { product: true }
        }
      }
    });

    if (!debitNote) return { error: "Debit note not found" };
    return { success: true, debitNote };
  } catch (error: any) {
    return { error: error?.message || "Failed to fetch debit note" };
  }
}

export async function updateDebitNoteStatus(id: string, status: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const updated = await prisma.debitNote.update({
      where: { id },
      data: { status }
    });

    revalidatePath("/debit-notes");
    return { success: true, debitNote: updated };
  } catch (error: any) {
    return { error: error?.message || "Failed to update debit note status" };
  }
}

export async function deleteDebitNote(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const organizationId = await getTenantOrgId();

    const existing = await prisma.debitNote.findUnique({
      where: { id }
    });

    if (!existing) return { error: "Debit note not found" };
    if (organizationId && existing.organizationId && existing.organizationId !== organizationId) {
      return { error: "Unauthorized" };
    }

    const lockCheck = await checkPeriodLock(existing.debitNoteDate);
    if (lockCheck.isLocked) return { error: lockCheck.error };

    await prisma.$transaction(async (tx) => {
      // 1. Delete associated journal entry
      const jvs = await tx.journalEntry.findMany({
        where: {
          OR: [
            { sourceDocId: id, sourceDocType: "DEBIT_NOTE" },
            { voucherNumber: `JV-DN-${existing.debitNoteNumber.replace(/[^a-zA-Z0-9]/g, '')}` }
          ]
        }
      });
      for (const jv of jvs) {
        await tx.journalLineItem.deleteMany({ where: { journalEntryId: jv.id } });
        await tx.journalEntry.delete({ where: { id: jv.id } });
      }

      // 2. Delete items & debit note
      await tx.debitNoteItem.deleteMany({ where: { debitNoteId: id } });
      await tx.debitNote.delete({ where: { id } });
    });

    revalidatePath("/debit-notes");
    revalidatePath("/invoices");
    revalidatePath("/bills");
    revalidatePath("/customers");
    revalidatePath("/vendors");
    revalidatePath("/accounting");
    return { success: true };
  } catch (error: any) {
    return { error: error?.message || "Failed to delete debit note" };
  }
}

export async function deleteMultipleDebitNotes(ids: string[]) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };
    if (!ids || ids.length === 0) return { error: "No debit notes selected to delete." };

    const organizationId = await getTenantOrgId();

    const notes = await prisma.debitNote.findMany({
      where: {
        id: { in: ids },
        ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {})
      }
    });

    if (notes.length === 0) return { error: "No matching debit notes found to delete." };

    const validIds = notes.map(n => n.id);

    await prisma.$transaction(async (tx) => {
      // Delete journal entries
      for (const n of notes) {
        const jvs = await tx.journalEntry.findMany({
          where: {
            OR: [
              { sourceDocId: n.id, sourceDocType: "DEBIT_NOTE" },
              { voucherNumber: `JV-DN-${n.debitNoteNumber.replace(/[^a-zA-Z0-9]/g, '')}` }
            ]
          }
        });
        for (const jv of jvs) {
          await tx.journalLineItem.deleteMany({ where: { journalEntryId: jv.id } });
          await tx.journalEntry.delete({ where: { id: jv.id } });
        }
      }

      // Delete items and notes
      await tx.debitNoteItem.deleteMany({ where: { debitNoteId: { in: validIds } } });
      await tx.debitNote.deleteMany({ where: { id: { in: validIds } } });
    });

    revalidatePath("/debit-notes");
    revalidatePath("/invoices");
    revalidatePath("/bills");
    revalidatePath("/customers");
    revalidatePath("/vendors");
    revalidatePath("/accounting");
    return { success: true, count: validIds.length };
  } catch (error: any) {
    return { error: error?.message || "Failed to delete selected debit notes" };
  }
}
