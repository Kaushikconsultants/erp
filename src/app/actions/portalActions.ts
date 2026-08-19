"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getCustomerPortalData(targetCustomerId?: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  
  let customer: any = null;

  // 1. If explicit customerId is provided (e.g. previewing from CRM dashboard)
  if (targetCustomerId) {
    customer = await prisma.customer.findUnique({
      where: { id: targetCustomerId },
      include: {
        orders: { orderBy: { orderDate: 'desc' }, take: 10 },
        invoices: { orderBy: { invoiceDate: 'desc' }, take: 10 },
        quotations: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
    });
  }

  // 2. If no targetCustomerId, find customer linked to portalUserId
  if (!customer && userId) {
    customer = await prisma.customer.findUnique({
      where: { portalUserId: userId },
      include: {
        orders: { orderBy: { orderDate: 'desc' }, take: 10 },
        invoices: { orderBy: { invoiceDate: 'desc' }, take: 10 },
        quotations: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
    });
  }

  // 3. Fallback: If still no customer found, pick the first active customer with orders for demonstration/preview
  if (!customer) {
    customer = await prisma.customer.findFirst({
      where: { orders: { some: {} } },
      include: {
        orders: { orderBy: { orderDate: 'desc' }, take: 10 },
        invoices: { orderBy: { invoiceDate: 'desc' }, take: 10 },
        quotations: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
    });
  }

  // 4. Ultimate fallback if DB has no customer with orders: pick any customer
  if (!customer) {
    customer = await prisma.customer.findFirst({
      include: {
        orders: { orderBy: { orderDate: 'desc' }, take: 10 },
        invoices: { orderBy: { invoiceDate: 'desc' }, take: 10 },
        quotations: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
    });
  }

  if (!customer) {
    return { success: false, error: "No customer records found." };
  }

  return {
    success: true,
    customer,
    orders: customer.orders || [],
    invoices: customer.invoices || [],
    quotations: customer.quotations || []
  };
}

export async function acceptQuotationFromPortal(quotationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const updated = await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: "Approved" }
    });

    return { success: true, quotation: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
