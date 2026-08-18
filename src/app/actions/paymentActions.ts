"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function recordPayment(data: {
  invoiceId: string;
  amount: number;
  paymentMode: string;
  referenceNumber?: string;
  notes?: string;
  paymentDate?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  if (!data.invoiceId || !data.amount || data.amount <= 0) {
    return { error: "Invoice and valid amount are required" };
  }

  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: data.invoiceId } });
    if (!invoice) return { error: "Invoice not found" };
    if (invoice.status === 'Paid') return { error: "Invoice is already fully paid" };
    if (invoice.status === 'Cancelled') return { error: "Cannot record payment on a cancelled invoice" };

    // Cap at amount due
    const payAmount = Math.min(data.amount, invoice.amountDue);

    // Generate payment number
    const count = await prisma.payment.count();
    const paymentNumber = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const newAmountPaid = invoice.amountPaid + payAmount;
    const newAmountDue = invoice.totalAmount - newAmountPaid;
    const newStatus = newAmountDue <= 0 ? 'Paid' : 'Partially Paid';

    await prisma.$transaction([
      // Create payment record
      prisma.payment.create({
        data: {
          paymentNumber,
          invoiceId: data.invoiceId,
          amount: payAmount,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          paymentMode: data.paymentMode,
          referenceNumber: data.referenceNumber || null,
          status: 'Completed',
          notes: data.notes || null,
        }
      }),
      // Update invoice
      prisma.invoice.update({
        where: { id: data.invoiceId },
        data: {
          amountPaid: newAmountPaid,
          amountDue: Math.max(0, newAmountDue),
          status: newStatus,
        }
      }),
      // Log the audit
      prisma.auditLog.create({
        data: {
          userId: (session.user as any).id,
          action: 'PAYMENT_RECORDED',
          module: 'Finance',
          recordId: data.invoiceId,
          newValue: JSON.stringify({ amount: payAmount, mode: data.paymentMode, status: newStatus })
        }
      })
    ]);

    // Also sync the linked Order if exists
    if (invoice.orderId) {
      await prisma.order.update({
        where: { id: invoice.orderId },
        data: {
          paymentReceived: newAmountPaid,
          outstandingAmount: Math.max(0, newAmountDue),
          paymentStatus: newStatus === 'Paid' ? 'Paid' : 'Partially Paid',
        }
      });
    }

    revalidatePath("/invoices");
    revalidatePath("/payments");
    return { success: true, paymentNumber, newStatus };
  } catch (error: any) {
    return { error: "Failed to record payment: " + error.message };
  }
}

export async function getPayments(filters?: { invoiceId?: string; paymentMode?: string; startDate?: string; endDate?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const where: any = {};
    if (filters?.invoiceId) where.invoiceId = filters.invoiceId;
    if (filters?.paymentMode) where.paymentMode = filters.paymentMode;
    if (filters?.startDate || filters?.endDate) {
      where.paymentDate = {};
      if (filters.startDate) where.paymentDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.paymentDate.lte = new Date(filters.endDate);
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        invoice: {
          include: {
            customer: { select: { businessName: true } }
          }
        }
      },
      orderBy: { paymentDate: 'desc' },
    });

    return { success: true, payments };
  } catch (error: any) {
    return { error: "Failed to fetch payments" };
  }
}

export async function getPaymentSummary() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalCollected, thisMonth, byMode] = await Promise.all([
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'Completed' } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'Completed', paymentDate: { gte: startOfMonth } } }),
      prisma.payment.groupBy({ by: ['paymentMode'], _sum: { amount: true }, where: { status: 'Completed' } }),
    ]);

    const totalOutstanding = await prisma.invoice.aggregate({
      _sum: { amountDue: true },
      where: { status: { in: ['Unpaid', 'Partially Paid', 'Overdue'] } }
    });

    return {
      success: true,
      totalCollected: totalCollected._sum.amount || 0,
      thisMonthCollected: thisMonth._sum.amount || 0,
      totalOutstanding: totalOutstanding._sum.amountDue || 0,
      byMode,
    };
  } catch (error: any) {
    return { error: "Failed to fetch payment summary" };
  }
}
