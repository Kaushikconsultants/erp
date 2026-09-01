"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getTenantOrgId } from "@/lib/tenant";
import { getCompanySettings } from "@/app/actions/companyActions";

export async function getPayments(filters?: {
  search?: string;
  invoiceId?: string;
  customerId?: string;
  paymentMode?: string;
  paymentType?: string;
  receivingAccount?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const where: any = {
      OR: [
        { customer: { organizationId } },
        { invoice: { organizationId } },
        { order: { organizationId } }
      ]
    };

    if (filters?.invoiceId) where.invoiceId = filters.invoiceId;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.paymentMode && filters.paymentMode !== 'All') where.paymentMode = filters.paymentMode;
    if (filters?.paymentType && filters.paymentType !== 'All') where.paymentType = filters.paymentType;
    if (filters?.receivingAccount && filters.receivingAccount !== 'All') where.receivingAccount = filters.receivingAccount;
    if (filters?.status && filters.status !== 'All') where.status = filters.status;

    if (filters?.startDate || filters?.endDate) {
      where.paymentDate = {};
      if (filters.startDate) where.paymentDate.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.paymentDate.lte = end;
      }
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.AND = [
        {
          OR: [
            { customer: { organizationId } },
            { invoice: { organizationId } },
            { order: { organizationId } }
          ]
        },
        {
          OR: [
            { paymentNumber: { contains: q, mode: 'insensitive' } },
            { referenceNumber: { contains: q, mode: 'insensitive' } },
            { payerName: { contains: q, mode: 'insensitive' } },
            { receivingAccount: { contains: q, mode: 'insensitive' } },
            { customer: { businessName: { contains: q, mode: 'insensitive' } } },
            { customer: { contactPerson: { contains: q, mode: 'insensitive' } } },
            { customer: { mobile: { contains: q, mode: 'insensitive' } } },
            { invoice: { invoiceNumber: { contains: q, mode: 'insensitive' } } },
          ]
        }
      ];
      delete where.OR;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            mobile: true,
            city: true,
            state: true,
            gstNumber: true,
          }
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            amountPaid: true,
            amountDue: true,
            status: true,
            orderId: true,
            order: { select: { orderNumber: true } }
          }
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalValue: true,
          }
        }
      },
      orderBy: { paymentDate: 'desc' },
    });

    return { success: true, payments };
  } catch (error: any) {
    console.error("Failed to fetch payments:", error);
    return { error: "Failed to fetch payments: " + error.message };
  }
}

export async function getPaymentSummary() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalCollected,
      thisMonth,
      byMode,
      byAccount,
      totalOutstanding,
      advanceCount
    ] = await Promise.all([
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'Completed', customer: { organizationId } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'Completed', customer: { organizationId }, paymentDate: { gte: startOfMonth } } }),
      prisma.payment.groupBy({ by: ['paymentMode'], _sum: { amount: true }, where: { status: 'Completed', customer: { organizationId } } }),
      prisma.payment.groupBy({ by: ['receivingAccount'], _sum: { amount: true }, where: { status: 'Completed', customer: { organizationId } } }),
      prisma.invoice.aggregate({
        _sum: { amountDue: true },
        where: { organizationId, status: { in: ['Unpaid', 'Partially Paid', 'Overdue'] } }
      }),
      prisma.payment.count({ where: { paymentType: 'Advance Payment', status: 'Completed', customer: { organizationId } } })
    ]);

    return {
      success: true,
      totalCollected: totalCollected._sum.amount || 0,
      thisMonthCollected: thisMonth._sum.amount || 0,
      totalOutstanding: totalOutstanding._sum.amountDue || 0,
      advanceCount: advanceCount || 0,
      byMode: byMode.filter(m => m.paymentMode),
      byAccount: byAccount.filter(a => a.receivingAccount),
    };
  } catch (error: any) {
    return { error: "Failed to fetch payment summary: " + error.message };
  }
}

export async function recordCustomerPayment(data: {
  paymentType: 'Invoice Payment' | 'Advance Payment' | 'On-Account';
  customerId: string;
  invoiceId?: string;
  amount: number;
  paymentMode: string;
  receivingAccount?: string;
  referenceNumber?: string;
  payerName?: string;
  paymentDate?: string;
  notes?: string;
  status?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const staffName = (session.user as any).name || 'Staff';

  if (!data.customerId || !data.amount || data.amount <= 0) {
    return { error: "Customer and valid amount are required" };
  }

  try {
    const organizationId = await getTenantOrgId();
    const customer = await prisma.customer.findFirst({ where: { id: data.customerId, organizationId } });
    if (!customer) return { error: "Customer not found" };

    const count = await prisma.payment.count({
      where: {
        OR: [
          { customer: { organizationId } },
          { invoice: { organizationId } },
          { order: { organizationId } }
        ]
      }
    });
    const paymentNumber = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const pDate = data.paymentDate ? new Date(data.paymentDate) : new Date();
    const paymentStatus = data.status || 'Completed';

    const companyRes = await getCompanySettings();
    const defaultReceivingAccount = companyRes.settings?.bankAccountName ? `${companyRes.settings?.bankAccountName} A/c` : 'ICICI Bank Current A/c';

    if (data.paymentType === 'Invoice Payment' && data.invoiceId) {
      // Record payment against specific invoice
      const invoice = await prisma.invoice.findUnique({
        where: { id: data.invoiceId },
        include: { order: true }
      });
      if (!invoice) return { error: "Invoice not found" };
      if (invoice.status === 'Paid') return { error: "Invoice is already fully paid" };
      if (invoice.status === 'Cancelled') return { error: "Cannot record payment on a cancelled invoice" };

      const payAmount = Math.min(data.amount, invoice.amountDue);
      const newAmountPaid = invoice.amountPaid + payAmount;
      const newAmountDue = invoice.totalAmount - newAmountPaid;
      const newStatus = newAmountDue <= 0 ? 'Paid' : 'Partially Paid';

      const [payment] = await prisma.$transaction([
        prisma.payment.create({
          data: {
            paymentNumber,
            invoiceId: data.invoiceId,
            customerId: data.customerId,
            orderId: invoice.orderId || null,
            paymentType: 'Invoice Payment',
            amount: payAmount,
            paymentDate: pDate,
            paymentMode: data.paymentMode,
            receivingAccount: data.receivingAccount || defaultReceivingAccount,
            referenceNumber: data.referenceNumber || null,
            payerName: data.payerName || customer.businessName,
            status: paymentStatus,
            notes: data.notes || null,
            recordedBy: staffName,
          }
        }),
        prisma.invoice.update({
          where: { id: data.invoiceId },
          data: {
            amountPaid: newAmountPaid,
            amountDue: Math.max(0, newAmountDue),
            status: newStatus,
          }
        }),
        prisma.auditLog.create({
          data: {
            userId: (session.user as any).id,
            action: 'PAYMENT_RECORDED',
            module: 'Finance',
            recordId: data.invoiceId,
            newValue: JSON.stringify({ paymentNumber, amount: payAmount, mode: data.paymentMode, receivingAccount: data.receivingAccount || defaultReceivingAccount })
          }
        })
      ]);

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
      revalidatePath("/customers");
      return { success: true, paymentNumber, paymentId: payment.id };

    } else {
      // Record Advance Payment or On-Account Customer Balance
      const payment = await prisma.payment.create({
        data: {
          paymentNumber,
          customerId: data.customerId,
          paymentType: data.paymentType || 'Advance Payment',
          amount: data.amount,
          paymentDate: pDate,
          paymentMode: data.paymentMode,
          receivingAccount: data.receivingAccount || defaultReceivingAccount,
          referenceNumber: data.referenceNumber || null,
          payerName: data.payerName || customer.businessName,
          status: paymentStatus,
          notes: data.notes || `Advance on account for ${customer.businessName}`,
          recordedBy: staffName,
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: (session.user as any).id,
          action: 'ADVANCE_PAYMENT_RECORDED',
          module: 'Finance',
          recordId: payment.id,
          newValue: JSON.stringify({ paymentNumber, amount: data.amount, mode: data.paymentMode, type: data.paymentType })
        }
      });

      revalidatePath("/invoices");
      revalidatePath("/payments");
      revalidatePath("/customers");
      return { success: true, paymentNumber, paymentId: payment.id };
    }
  } catch (error: any) {
    console.error("Failed to record payment:", error);
    return { error: "Failed to record payment: " + error.message };
  }
}

export async function recordPayment(data: {
  invoiceId: string;
  amount: number;
  paymentMode: string;
  referenceNumber?: string;
  notes?: string;
  paymentDate?: string;
  receivingAccount?: string;
}) {
  const inv = await prisma.invoice.findUnique({ where: { id: data.invoiceId } });
  if (!inv) return { error: "Invoice not found" };

  return recordCustomerPayment({
    paymentType: 'Invoice Payment',
    customerId: inv.customerId,
    invoiceId: data.invoiceId,
    amount: data.amount,
    paymentMode: data.paymentMode,
    receivingAccount: data.receivingAccount || 'HDFC Bank Current A/c',
    referenceNumber: data.referenceNumber,
    paymentDate: data.paymentDate,
    notes: data.notes,
    status: 'Completed'
  });
}

export async function getCustomerUnpaidInvoices(customerId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        customerId,
        status: { in: ['Unpaid', 'Partially Paid', 'Overdue'] }
      },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        dueDate: true,
        totalAmount: true,
        amountPaid: true,
        amountDue: true,
        status: true,
        order: { select: { orderNumber: true } }
      },
      orderBy: { invoiceDate: 'asc' }
    });

    const advancePayments = await prisma.payment.findMany({
      where: {
        customerId,
        paymentType: 'Advance Payment',
        status: 'Completed'
      },
      select: {
        id: true,
        paymentNumber: true,
        amount: true,
        paymentDate: true,
        paymentMode: true,
        referenceNumber: true
      },
      orderBy: { paymentDate: 'desc' }
    });

    return { success: true, invoices, advancePayments };
  } catch (error: any) {
    return { error: "Failed to fetch customer invoices: " + error.message };
  }
}

export async function getPaymentById(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        invoice: {
          include: {
            order: {
              include: {
                items: { include: { product: true } }
              }
            }
          }
        },
        order: true
      }
    });

    if (!payment) return { error: "Payment not found" };
    return { success: true, payment };
  } catch (error: any) {
    return { error: "Failed to fetch payment: " + error.message };
  }
}

export async function cancelPayment(paymentId: string, reason: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        OR: [
          { customer: { organizationId } },
          { invoice: { organizationId } },
          { order: { organizationId } }
        ]
      },
      include: { invoice: true }
    });

    if (!payment) return { error: "Payment not found" };
    if (payment.status === 'Cancelled' || payment.status === 'Refunded') {
      return { error: `Payment is already ${payment.status}` };
    }

    await prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'Cancelled',
          notes: `${payment.notes || ''} [Cancelled: ${reason}]`.trim()
        }
      });

      // If linked to an invoice, deduct amountPaid and increase amountDue
      if (payment.invoiceId && payment.invoice) {
        const inv = payment.invoice;
        const newPaid = Math.max(0, inv.amountPaid - payment.amount);
        const newDue = inv.totalAmount - newPaid;
        const newStatus = newPaid <= 0 ? 'Unpaid' : 'Partially Paid';

        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: {
            amountPaid: newPaid,
            amountDue: newDue,
            status: newStatus
          }
        });

        if (inv.orderId) {
          await tx.order.update({
            where: { id: inv.orderId },
            data: {
              paymentReceived: newPaid,
              outstandingAmount: newDue,
              paymentStatus: newStatus
            }
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: (session.user as any).id,
          action: 'PAYMENT_CANCELLED',
          module: 'Finance',
          recordId: paymentId,
          newValue: JSON.stringify({ paymentNumber: payment.paymentNumber, reason })
        }
      });
    });

    revalidatePath("/invoices");
    revalidatePath("/payments");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to cancel payment: " + error.message };
  }
}

export async function deletePayment(paymentId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        OR: [
          { customer: { organizationId } },
          { invoice: { organizationId } },
          { order: { organizationId } }
        ]
      },
      include: { invoice: true }
    });

    if (!payment) return { error: "Payment not found" };

    await prisma.$transaction(async (tx) => {
      // If payment was Completed and linked to an invoice, revert invoice amountPaid
      if (payment.status === 'Completed' && payment.invoiceId && payment.invoice) {
        const inv = payment.invoice;
        const newPaid = Math.max(0, inv.amountPaid - payment.amount);
        const newDue = Math.max(0, inv.totalAmount - newPaid);
        const newStatus = newPaid <= 0 ? 'Unpaid' : newPaid >= inv.totalAmount ? 'Paid' : 'Partially Paid';

        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: {
            amountPaid: newPaid,
            amountDue: newDue,
            status: newStatus
          }
        });

        if (inv.orderId) {
          await tx.order.update({
            where: { id: inv.orderId },
            data: {
              paymentReceived: newPaid,
              outstandingAmount: newDue,
              paymentStatus: newStatus
            }
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: (session.user as any).id,
          action: 'PAYMENT_DELETED',
          module: 'Finance',
          recordId: paymentId,
          newValue: JSON.stringify({
            paymentNumber: payment.paymentNumber,
            amount: payment.amount,
            status: payment.status,
            customerId: payment.customerId,
            invoiceId: payment.invoiceId
          })
        }
      });

      await tx.payment.delete({
        where: { id: paymentId }
      });
    });

    revalidatePath("/invoices");
    revalidatePath("/payments");
    revalidatePath("/customers");
    revalidatePath("/orders");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete payment:", error);
    return { error: "Failed to delete payment: " + error.message };
  }
}

export async function updatePayment(data: {
  id: string;
  amount?: number;
  paymentDate?: string;
  paymentMode?: string;
  receivingAccount?: string;
  referenceNumber?: string;
  payerName?: string;
  notes?: string;
  status?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const payment = await prisma.payment.findFirst({
      where: {
        id: data.id,
        OR: [
          { customer: { organizationId } },
          { invoice: { organizationId } },
          { order: { organizationId } }
        ]
      },
      include: { invoice: true }
    });

    if (!payment) return { error: "Payment not found" };

    const newAmount = data.amount !== undefined ? Number(data.amount) : payment.amount;
    const newStatus = data.status || payment.status;
    const oldStatus = payment.status;
    const oldAmount = payment.amount;

    await prisma.$transaction(async (tx) => {
      // If payment is linked to an invoice, recalculate invoice amountPaid based on amount/status changes
      if (payment.invoiceId && payment.invoice) {
        const inv = payment.invoice;
        let effectivePaid = inv.amountPaid;

        // Step 1: Remove old contribution if oldStatus was Completed
        if (oldStatus === 'Completed') {
          effectivePaid -= oldAmount;
        }

        // Step 2: Add new contribution if newStatus is Completed
        if (newStatus === 'Completed') {
          effectivePaid += newAmount;
        }

        effectivePaid = Math.max(0, effectivePaid);
        const newDue = Math.max(0, inv.totalAmount - effectivePaid);
        const invStatus = effectivePaid >= inv.totalAmount ? 'Paid' : effectivePaid <= 0 ? 'Unpaid' : 'Partially Paid';

        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: {
            amountPaid: effectivePaid,
            amountDue: newDue,
            status: invStatus
          }
        });

        if (inv.orderId) {
          await tx.order.update({
            where: { id: inv.orderId },
            data: {
              paymentReceived: effectivePaid,
              outstandingAmount: newDue,
              paymentStatus: invStatus
            }
          });
        }
      }

      // Update payment record
      const updateData: any = {};
      if (data.amount !== undefined) updateData.amount = newAmount;
      if (data.paymentDate) updateData.paymentDate = new Date(data.paymentDate);
      if (data.paymentMode) updateData.paymentMode = data.paymentMode;
      if (data.receivingAccount !== undefined) updateData.receivingAccount = data.receivingAccount;
      if (data.referenceNumber !== undefined) updateData.referenceNumber = data.referenceNumber;
      if (data.payerName !== undefined) updateData.payerName = data.payerName;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.status) updateData.status = newStatus;

      await tx.payment.update({
        where: { id: data.id },
        data: updateData
      });

      await tx.auditLog.create({
        data: {
          userId: (session.user as any).id,
          action: 'PAYMENT_UPDATED',
          module: 'Finance',
          recordId: data.id,
          previousValue: JSON.stringify({ amount: oldAmount, status: oldStatus, mode: payment.paymentMode }),
          newValue: JSON.stringify(updateData)
        }
      });
    });

    revalidatePath("/invoices");
    revalidatePath("/payments");
    revalidatePath("/customers");
    revalidatePath("/orders");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update payment:", error);
    return { error: "Failed to update payment: " + error.message };
  }
}

