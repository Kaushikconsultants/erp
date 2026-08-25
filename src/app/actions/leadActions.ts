"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getTenantOrgId } from "@/lib/tenant";

export async function getPipelineData() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };
  
  const organizationId = await getTenantOrgId();
  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  
  let whereClause: any = { organizationId };
  
  // If not admin, only show assigned leads
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    const employee = await prisma.employee.findFirst({ where: { userId, organizationId } });
    if (employee) {
      whereClause.assignedSalespersonId = employee.id;
    }
  }

  try {
    const [customers, employees] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        include: {
          assignedSalesperson: {
            include: { user: true }
          },
          quotations: {
            select: { id: true, quotationNumber: true, totalValue: true, status: true, date: true },
            orderBy: { createdAt: 'desc' },
            take: 3
          },
          orders: {
            select: { id: true, orderNumber: true, totalValue: true, paymentStatus: true, orderDate: true },
            orderBy: { createdAt: 'desc' },
            take: 3
          },
          calls: {
            select: { id: true, callType: true, outcome: true, followUpDate: true, notes: true, callTime: true },
            orderBy: { callTime: 'desc' },
            take: 1
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.employee.findMany({
        where: { organizationId, employmentStatus: 'Active' },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { user: { name: 'asc' } }
      })
    ]);
    
    // Normalize deal values: If expectedValue is 0 or null, check quotations / orders or default
    const formattedCustomers = customers.map(c => {
      let dealVal = c.expectedValue || 0;
      if (!dealVal || dealVal === 0) {
        const latestQuote = c.quotations?.[0]?.totalValue;
        const latestOrder = c.orders?.[0]?.totalValue;
        dealVal = latestQuote || latestOrder || (c.totalPurchaseValue > 0 ? c.totalPurchaseValue : 15000);
      }
      return {
        ...c,
        computedDealValue: dealVal
      };
    });
    
    return { success: true, customers: formattedCustomers, employees };
  } catch (error: any) {
    return { error: "Failed to fetch pipeline data: " + error.message };
  }
}

export async function updateLeadStage(customerId: string, newStage: string, newStatus?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const dataToUpdate: any = { leadStage: newStage };
    if (newStatus) {
      dataToUpdate.status = newStatus;
    } else {
      if (newStage === 'Won') dataToUpdate.status = 'Active Lead';
      if (newStage === 'Lost') dataToUpdate.status = 'Inactive';
      if (newStage === 'Opportunity') dataToUpdate.status = 'Opportunity';
      if (newStage === 'Qualified') dataToUpdate.status = 'Contacted';
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: dataToUpdate
    });
    
    // Log the activity
    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "UPDATE_STAGE",
        module: "CRM",
        recordId: customerId,
        newValue: JSON.stringify({ leadStage: newStage, status: newStatus })
      }
    });

    revalidatePath("/leads");
    revalidatePath("/customers");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to update lead stage: " + error.message };
  }
}

export async function updateLeadValue(customerId: string, expectedValue: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: { expectedValue }
    });
    
    revalidatePath("/leads");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to update lead value: " + error.message };
  }
}

export async function assignLeadRep(customerId: string, employeeId: string | null) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: { assignedSalespersonId: employeeId || null }
    });
    
    revalidatePath("/leads");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to assign representative: " + error.message };
  }
}

export async function advanceLeadStep(customerId: string, nextStage: string, notes?: string, followUpDate?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const userId = (session.user as any).id;
  const organizationId = await getTenantOrgId();

  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return { error: "Lead not found" };

    let status = customer.status;
    if (nextStage === 'Won') status = 'Active Lead';
    if (nextStage === 'Lost') status = 'Inactive';
    if (nextStage === 'Opportunity') status = 'Opportunity';
    if (nextStage === 'Qualified') status = 'Contacted';

    const updatePayload: any = {
      leadStage: nextStage,
      status
    };

    if (followUpDate) {
      updatePayload.nextFollowUp = new Date(followUpDate);
    }

    if (notes) {
      updatePayload.notes = customer.notes ? `${customer.notes}\n[${new Date().toLocaleDateString('en-IN')}] ${notes}` : notes;
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: updatePayload
    });

    if (notes || followUpDate) {
      // Record in Call/FollowUp table for history
      const employee = await prisma.employee.findFirst({ where: { userId, organizationId } });
      await prisma.call.create({
        data: {
          customerId,
          employeeId: employee?.id || customer.assignedSalespersonId || null,
          callType: "OUTBOUND",
          outcome: `Moved to ${nextStage}`,
          notes: notes || `Advanced deal to ${nextStage} stage`,
          followUpDate: followUpDate ? new Date(followUpDate) : null,
          callTime: new Date()
        }
      });
    }

    revalidatePath("/leads");
    revalidatePath("/customers");
    revalidatePath("/calls");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to advance lead step: " + error.message };
  }
}
