"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getCustomerPortalData(targetCustomerId?: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const userOrgId = (session?.user as any)?.organizationId;
  const userRole = (session?.user as any)?.role;
  
  let customer: any = null;

  const invoiceInclude = {
    where: { status: { not: "Cancelled" } },
    orderBy: { invoiceDate: 'desc' as const },
    take: 20
  };

  // 1. If explicit customerId is provided (e.g. previewing from CRM dashboard or direct customer link)
  if (targetCustomerId) {
    if (!session?.user) {
      return { success: false, error: "Authentication required to view customer portal." };
    }

    customer = await prisma.customer.findUnique({
      where: { id: targetCustomerId },
      include: {
        orders: { orderBy: { orderDate: 'desc' }, take: 20 },
        invoices: invoiceInclude,
        quotations: { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });

    if (!customer) {
      return { success: false, error: "Customer profile not found." };
    }

    // Tenant check: If accessed by CRM staff, ensure same organization
    const isStaff = userRole && userRole !== "PORTAL_USER";
    if (isStaff && customer.organizationId && userOrgId && customer.organizationId !== userOrgId) {
      return { success: false, error: "Access denied. Customer belongs to another organization." };
    }

    // Portal user check: If accessed by portal customer, ensure it's their own account
    if (!isStaff && customer.portalUserId !== userId) {
      return { success: false, error: "Access denied. You can only view your own portal." };
    }
  }

  // 2. If no targetCustomerId, find customer linked to current user's portal account
  if (!customer && userId) {
    customer = await prisma.customer.findUnique({
      where: { portalUserId: userId },
      include: {
        orders: { orderBy: { orderDate: 'desc' }, take: 20 },
        invoices: invoiceInclude,
        quotations: { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });
  }

  if (!customer) {
    return { success: false, error: "No customer account linked to your profile." };
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
    const userId = (session.user as any)?.id;
    const userOrgId = (session.user as any)?.organizationId;

    const quote = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { customer: true }
    });
    if (!quote) return { success: false, error: "Quotation not found" };

    // Verify access: caller must be linked customer or staff in same org
    const isCustomerOwner = quote.customer?.portalUserId === userId;
    const isStaffSameOrg = quote.customer?.organizationId === userOrgId || quote.organizationId === userOrgId;
    if (!isCustomerOwner && !isStaffSameOrg) {
      return { success: false, error: "Access denied to this quotation." };
    }

    const updated = await prisma.quotation.update({
      where: { id: quotationId },
      data: {
        status: "Approved",
        activities: {
          create: {
            userId: userId || null,
            userName: quote.customer?.businessName || "Client Portal",
            action: "Quotation Accepted",
            details: `Approved via Client Self-Service Portal by ${quote.customer?.contactPerson || 'Client'}`
          }
        }
      }
    });

    return { success: true, quotation: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
