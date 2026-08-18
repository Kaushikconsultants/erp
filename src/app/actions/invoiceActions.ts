"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function canManageInvoices() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { allowed: false, session: null };
  const role = (session.user as any).role;
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return { allowed: true, session };
  const roleDef = await prisma.role.findUnique({ where: { name: role } });
  try {
    const perms = JSON.parse(roleDef?.permissions || '[]') as string[];
    return { allowed: perms.includes("Manage Invoices"), session };
  } catch { return { allowed: false, session }; }
}

export async function getInvoices(filters?: { status?: string; customerId?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const where: any = {};
    if (filters?.status && filters.status !== 'All') where.status = filters.status;
    if (filters?.customerId) where.customerId = filters.customerId;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { businessName: true, mobile: true, state: true } },
        order: { select: { orderNumber: true } },
        payments: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    // Auto-update overdue status
    const today = new Date();
    const updated = invoices.map(inv => {
      if (inv.status === 'Unpaid' && inv.dueDate && new Date(inv.dueDate) < today) {
        return { ...inv, status: 'Overdue' };
      }
      return inv;
    });

    return { success: true, invoices: updated };
  } catch (error: any) {
    return { error: "Failed to fetch invoices: " + error.message };
  }
}

export async function createInvoiceFromOrder(orderId: string, dueDate?: string, paymentTerms?: string) {
  const { allowed } = await canManageInvoices();
  if (!allowed) return { error: "Unauthorized" };

  try {
    // Check if invoice already exists for this order
    const existing = await prisma.invoice.findFirst({ where: { orderId } });
    if (existing) return { error: "Invoice already exists for this order", invoiceId: existing.id };

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true }
    });
    if (!order) return { error: "Order not found" };

    // Generate invoice number
    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: order.customerId,
        orderId: order.id,
        invoiceDate: new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: order.subtotal,
        taxAmount: order.tax,
        discountAmount: order.discount,
        totalAmount: order.totalValue,
        amountPaid: order.paymentReceived,
        amountDue: order.totalValue - order.paymentReceived,
        status: order.paymentReceived >= order.totalValue ? 'Paid' : order.paymentReceived > 0 ? 'Partially Paid' : 'Unpaid',
        paymentTerms: paymentTerms || 'Net 30',
      }
    });

    revalidatePath("/invoices");
    revalidatePath(`/orders/${orderId}`);
    return { success: true, invoice };
  } catch (error: any) {
    return { error: "Failed to create invoice: " + error.message };
  }
}

export async function createManualInvoice(data: {
  customerId: string;
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  dueDate?: string;
  paymentTerms?: string;
  notes?: string;
}) {
  const { allowed } = await canManageInvoices();
  if (!allowed) return { error: "Unauthorized" };

  try {
    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: data.customerId,
        invoiceDate: new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        discountAmount: data.discountAmount,
        totalAmount: data.totalAmount,
        amountPaid: 0,
        amountDue: data.totalAmount,
        status: 'Unpaid',
        paymentTerms: data.paymentTerms || 'Net 30',
        notes: data.notes || null,
      }
    });

    revalidatePath("/invoices");
    return { success: true, invoice };
  } catch (error: any) {
    return { error: "Failed to create invoice: " + error.message };
  }
}

export async function getInvoiceById(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        order: { include: { items: { include: { product: true } } } },
        payments: { orderBy: { paymentDate: 'desc' } },
      }
    });
    if (!invoice) return { error: "Invoice not found" };
    return { success: true, invoice };
  } catch (error: any) {
    return { error: "Failed to fetch invoice" };
  }
}

export async function cancelInvoice(id: string) {
  const { allowed } = await canManageInvoices();
  if (!allowed) return { error: "Unauthorized" };
  try {
    await prisma.invoice.update({ where: { id }, data: { status: 'Cancelled' } });
    revalidatePath("/invoices");
    return { success: true };
  } catch { return { error: "Failed to cancel invoice" }; }
}

// Accounts receivable ageing
export async function getReceivablesAgeing() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const invoices = await prisma.invoice.findMany({
      where: { status: { in: ['Unpaid', 'Partially Paid', 'Overdue'] } },
      include: { customer: { select: { businessName: true, mobile: true } } },
      orderBy: { dueDate: 'asc' }
    });

    const today = new Date();
    const ageing = {
      current: [] as any[],
      days1_30: [] as any[],
      days31_60: [] as any[],
      days61_90: [] as any[],
      above90: [] as any[],
    };

    invoices.forEach(inv => {
      if (!inv.dueDate) { ageing.current.push(inv); return; }
      const daysPast = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysPast <= 0) ageing.current.push(inv);
      else if (daysPast <= 30) ageing.days1_30.push(inv);
      else if (daysPast <= 60) ageing.days31_60.push(inv);
      else if (daysPast <= 90) ageing.days61_90.push(inv);
      else ageing.above90.push(inv);
    });

    return { success: true, ageing };
  } catch (error: any) {
    return { error: "Failed to fetch ageing report" };
  }
}
