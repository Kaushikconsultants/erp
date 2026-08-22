"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface CreateCreditNoteInput {
  customerId: string;
  invoiceId?: string;
  orderId?: string;
  reason: string; // "Sales Return" | "Post-Sale Discount" | "Defective Goods" | "Price Correction" | "Other"
  notes?: string;
  termsConditions?: string;
  restockReturnedGoods?: boolean;
  creditNoteDate?: string;
  items: Array<{
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
  }>;
}

export async function getCreditNotes(filters?: {
  search?: string;
  status?: string;
  reason?: string;
  customerId?: string;
}) {
  try {
    const where: any = {};

    if (filters?.status && filters.status !== 'All') {
      where.status = filters.status;
    }

    if (filters?.reason && filters.reason !== 'All') {
      where.reason = filters.reason;
    }

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters?.search) {
      const q = filters.search.trim();
      where.OR = [
        { creditNoteNumber: { contains: q, mode: 'insensitive' } },
        { customer: { businessName: { contains: q, mode: 'insensitive' } } },
        { customer: { contactPerson: { contains: q, mode: 'insensitive' } } },
        { invoice: { invoiceNumber: { contains: q, mode: 'insensitive' } } },
        { order: { orderNumber: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const creditNotes = await prisma.creditNote.findMany({
      where,
      include: {
        customer: true,
        invoice: true,
        order: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, creditNotes };
  } catch (error: any) {
    console.error("Failed to fetch credit notes:", error);
    return { success: false, error: error.message || "Failed to fetch credit notes", creditNotes: [] };
  }
}

export async function getCreditNoteById(id: string) {
  try {
    const creditNote = await prisma.creditNote.findUnique({
      where: { id },
      include: {
        customer: true,
        invoice: {
          include: {
            order: true
          }
        },
        order: {
          include: {
            salesperson: { include: { user: true } }
          }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!creditNote) {
      return { success: false, error: "Credit note not found" };
    }

    return { success: true, creditNote };
  } catch (error: any) {
    console.error("Failed to fetch credit note by ID:", error);
    return { success: false, error: error.message || "Failed to fetch credit note" };
  }
}

export async function getNextCreditNoteNumber(): Promise<string> {
  try {
    const count = await prisma.creditNote.count();
    const year = new Date().getFullYear();
    const sequence = String(count + 1).padStart(4, '0');
    return `CN-${year}-${sequence}`;
  } catch {
    return `CN-${Date.now()}`;
  }
}

export async function createCreditNote(input: CreateCreditNoteInput) {
  try {
    if (!input.customerId) {
      return { success: false, error: "Customer is required" };
    }
    if (!input.items || input.items.length === 0) {
      return { success: false, error: "At least one line item is required" };
    }

    const creditNoteNumber = await getNextCreditNoteNumber();

    // Fetch customer to check state for GST (CGST/SGST vs IGST)
    const customer = await prisma.customer.findUnique({
      where: { id: input.customerId }
    });

    // Check company settings for state
    const company = await prisma.companySettings.findFirst();
    const companyState = (company?.state || "Delhi").trim().toLowerCase();
    const customerState = (customer?.state || companyState).trim().toLowerCase();
    const isInterstate = companyState !== customerState;

    let totalSubtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let grandTotal = 0;

    const processedItems = input.items.map(item => {
      const qty = Number(item.quantity) || 1;
      const rate = Number(item.rate) || 0;
      const taxable = Number(item.taxableAmount) || (qty * rate);
      const gstRate = Number(item.gstRate ?? 12);
      
      const taxAmount = (taxable * gstRate) / 100;
      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isInterstate) {
        igst = taxAmount;
      } else {
        cgst = taxAmount / 2;
        sgst = taxAmount / 2;
      }

      const itemTotal = taxable + taxAmount;

      totalSubtotal += taxable;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;
      grandTotal += itemTotal;

      return {
        productId: item.productId || null,
        description: item.description,
        sku: item.sku || null,
        hsnCode: item.hsnCode || "6109",
        quantity: qty,
        unit: item.unit || "pcs",
        rate: rate,
        taxableAmount: Math.round(taxable * 100) / 100,
        gstRate: gstRate,
        taxAmount: Math.round(taxAmount * 100) / 100,
        cgst: Math.round(cgst * 100) / 100,
        sgst: Math.round(sgst * 100) / 100,
        igst: Math.round(igst * 100) / 100,
        total: Math.round(itemTotal * 100) / 100,
      };
    });

    const totalTax = totalCgst + totalSgst + totalIgst;
    grandTotal = Math.round(grandTotal);

    // Create Credit Note
    const creditNote = await prisma.creditNote.create({
      data: {
        creditNoteNumber,
        customerId: input.customerId,
        invoiceId: input.invoiceId || null,
        orderId: input.orderId || null,
        creditNoteDate: input.creditNoteDate ? new Date(input.creditNoteDate) : new Date(),
        reason: input.reason || "Sales Return",
        status: "OPEN",
        subtotal: Math.round(totalSubtotal * 100) / 100,
        taxAmount: Math.round(totalTax * 100) / 100,
        cgst: Math.round(totalCgst * 100) / 100,
        sgst: Math.round(totalSgst * 100) / 100,
        igst: Math.round(totalIgst * 100) / 100,
        totalAmount: grandTotal,
        allocatedAmount: 0,
        balanceAmount: grandTotal,
        restockReturnedGoods: input.restockReturnedGoods ?? true,
        notes: input.notes || null,
        termsConditions: input.termsConditions || null,
        items: {
          create: processedItems
        }
      }
    });

    // If restock is enabled, increment inventory stock & create inventory transactions
    if (input.restockReturnedGoods) {
      for (const item of processedItems) {
        if (item.productId && item.quantity > 0) {
          try {
            await prisma.product.update({
              where: { id: item.productId },
              data: { stockQuantity: { increment: Math.round(item.quantity) } }
            });

            await prisma.inventoryTransaction.create({
              data: {
                productId: item.productId,
                quantity: Math.round(item.quantity),
                type: 'IN',
                reference: creditNoteNumber,
                notes: `Restocked via Credit Note ${creditNoteNumber} (${input.reason})`
              }
            });
          } catch (err) {
            console.warn(`Failed to replenish stock for product ${item.productId}:`, err);
          }
        }
      }
    }

    revalidatePath("/credit-notes");
    revalidatePath("/invoices");
    revalidatePath("/orders");
    revalidatePath("/products");

    return { success: true, creditNote };
  } catch (error: any) {
    console.error("Failed to create credit note:", error);
    return { success: false, error: error.message || "Failed to create credit note" };
  }
}

export async function cancelCreditNote(id: string, reason?: string) {
  try {
    const cn = await prisma.creditNote.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!cn) return { success: false, error: "Credit note not found" };
    if (cn.status === 'CANCELLED') return { success: false, error: "Already cancelled" };

    // Reverse restock if items were restocked
    if (cn.restockReturnedGoods) {
      for (const item of cn.items) {
        if (item.productId && item.quantity > 0) {
          try {
            await prisma.product.update({
              where: { id: item.productId },
              data: { stockQuantity: { decrement: Math.round(item.quantity) } }
            });

            await prisma.inventoryTransaction.create({
              data: {
                productId: item.productId,
                quantity: Math.round(item.quantity),
                type: 'OUT',
                reference: cn.creditNoteNumber,
                notes: `Reversed restock due to Credit Note cancellation ${cn.creditNoteNumber}`
              }
            });
          } catch (err) {
            console.warn(`Failed to reverse stock:`, err);
          }
        }
      }
    }

    await prisma.creditNote.update({
      where: { id },
      data: {
        status: "CANCELLED",
        notes: reason ? `${cn.notes || ''} [Cancelled: ${reason}]` : cn.notes
      }
    });

    revalidatePath("/credit-notes");
    revalidatePath("/invoices");
    revalidatePath("/products");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to cancel credit note:", error);
    return { success: false, error: error.message || "Failed to cancel credit note" };
  }
}
