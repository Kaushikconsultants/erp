"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getCustomerPortalData() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  // Find the customer linked to this portal user
  const customer = await prisma.customer.findUnique({
    where: { portalUserId: userId },
    include: {
      orders: {
        orderBy: { orderDate: 'desc' },
        take: 10
      },
      invoices: {
        orderBy: { invoiceDate: 'desc' },
        take: 10
      },
      quotations: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  if (!customer) {
    return { success: false, error: "No customer account linked to this user profile." };
  }

  return {
    success: true,
    customer,
    orders: customer.orders,
    invoices: customer.invoices,
    quotations: customer.quotations
  };
}

export async function acceptQuotationFromPortal(quotationId: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return { success: false, error: "Unauthorized" };

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
