"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

import { canUserAccessSection } from "@/lib/authPermissions";

async function canManagePayments() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  return await canUserAccessSection(session.user, 'purchases');
}

export async function getVendorPayments() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const hasAccess = await canUserAccessSection(session.user, 'purchases');
  if (!hasAccess) return { error: "Unauthorized" };

  try {
    const payments = await prisma.vendorPayment.findMany({
      include: {
        vendor: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            mobile: true,
            gstNumber: true,
            city: true,
            state: true
          }
        },
        bill: {
          select: {
            id: true,
            billNumber: true,
            vendorBillNumber: true,
            totalAmount: true,
            amountDue: true
          }
        }
      },
      orderBy: { paymentDate: 'desc' }
    });

    const totalPaidOut = payments.filter(p => p.status === 'Completed').reduce((sum, p) => sum + p.amount, 0);
    const billPaymentsCount = payments.filter(p => p.paymentType === 'Bill Payment').length;
    const advancePaymentsCount = payments.filter(p => p.paymentType !== 'Bill Payment').length;

    return {
      success: true,
      payments: JSON.parse(JSON.stringify(payments)),
      summary: {
        totalPaidOut,
        totalTransactions: payments.length,
        billPaymentsCount,
        advancePaymentsCount
      }
    };
  } catch (error: any) {
    console.error("Failed to fetch vendor payments:", error);
    return { error: "Failed to fetch vendor payments: " + error.message };
  }
}

export async function recordVendorPayment(data: {
  vendorId: string;
  billId?: string;
  amount: number;
  paymentDate?: string;
  paymentMode: string;
  paidFromAccount?: string;
  referenceNumber?: string;
  paymentType?: string;
  notes?: string;
}) {
  if (!await canManagePayments()) return { error: "Unauthorized" };
  if (!data.vendorId || !data.amount || data.amount <= 0) {
    return { error: "Vendor and valid payment amount are required" };
  }

  try {
    const session = await getServerSession(authOptions);
    const recordedBy = (session?.user as any)?.name || 'Admin';

    // Generate unique payment number
    const count = await prisma.vendorPayment.count();
    const paymentNumber = `VPAY-${String(count + 1).padStart(4, '0')}`;

    const payment = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.vendorPayment.create({
        data: {
          paymentNumber,
          vendorId: data.vendorId,
          billId: data.billId || null,
          amount: data.amount,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          paymentMode: data.paymentMode,
          paidFromAccount: data.paidFromAccount || "HDFC Bank Current A/c",
          referenceNumber: data.referenceNumber || null,
          paymentType: data.paymentType || (data.billId ? 'Bill Payment' : 'Vendor Advance'),
          status: 'Completed',
          notes: data.notes || null,
          recordedBy
        },
        include: {
          vendor: true,
          bill: true
        }
      });

      // If tied to a Bill, update bill amountPaid and amountDue
      if (data.billId) {
        const bill = await tx.bill.findUnique({ where: { id: data.billId } });
        if (bill) {
          const newPaid = bill.amountPaid + data.amount;
          const newDue = Math.max(0, bill.totalAmount - newPaid);
          const newStatus = newDue <= 0 ? 'Paid' : 'Partially Paid';

          await tx.bill.update({
            where: { id: data.billId },
            data: {
              amountPaid: newPaid,
              amountDue: newDue,
              status: newStatus
            }
          });
        }
      }

      return newPayment;
    });

    revalidatePath("/payments-made");
    revalidatePath("/bills");
    revalidatePath("/vendors");
    return { success: true, payment };
  } catch (error: any) {
    console.error("Failed to record vendor payment:", error);
    return { error: "Failed to record vendor payment: " + error.message };
  }
}

export async function cancelVendorPayment(paymentId: string, reason: string) {
  if (!await canManagePayments()) return { error: "Unauthorized" };

  try {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.vendorPayment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new Error("Payment not found");
      if (payment.status === 'Cancelled') throw new Error("Payment is already cancelled");

      // Reverse bill amounts if tied to bill
      if (payment.billId) {
        const bill = await tx.bill.findUnique({ where: { id: payment.billId } });
        if (bill) {
          const restoredPaid = Math.max(0, bill.amountPaid - payment.amount);
          const restoredDue = Math.min(bill.totalAmount, bill.amountDue + payment.amount);
          const newStatus = restoredPaid <= 0 ? 'Open' : 'Partially Paid';

          await tx.bill.update({
            where: { id: payment.billId },
            data: {
              amountPaid: restoredPaid,
              amountDue: restoredDue,
              status: newStatus
            }
          });
        }
      }

      await tx.vendorPayment.update({
        where: { id: paymentId },
        data: {
          status: 'Cancelled',
          notes: payment.notes ? `${payment.notes} | Cancelled: ${reason}` : `Cancelled: ${reason}`
        }
      });
    });

    revalidatePath("/payments-made");
    revalidatePath("/bills");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to cancel vendor payment: " + error.message };
  }
}
