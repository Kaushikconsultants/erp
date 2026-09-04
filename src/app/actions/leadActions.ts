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
  
  let customerWhere: any = { organizationId };
  let leadWhere: any = { organizationId };
  
  // If not admin, only show assigned leads
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    const employee = await prisma.employee.findUnique({ where: { userId } });
    if (employee) {
      customerWhere.assignedSalespersonId = employee.id;
      leadWhere.assignedSalespersonId = employee.id;
    }
  }

  try {
    const [customers, rawLeads, employees] = await Promise.all([
      prisma.customer.findMany({
        where: customerWhere,
        include: {
          assignedSalesperson: {
            include: { user: true }
          },
          quotations: {
            select: { id: true, quotationNumber: true, totalValue: true, status: true, date: true },
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          orders: {
            select: { id: true, orderNumber: true, totalValue: true, paymentStatus: true, orderDate: true },
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          calls: {
            select: { id: true, callType: true, outcome: true, followUpDate: true, notes: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.lead.findMany({
        where: leadWhere,
        include: {
          assignedSalesperson: {
            include: { user: true }
          },
          calls: {
            select: { id: true, callType: true, outcome: true, followUpDate: true, notes: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          followUps: {
            select: { id: true, date: true, notes: true, priority: true, status: true },
            orderBy: { date: 'asc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.employee.findMany({
        where: { organizationId, employmentStatus: 'Active' },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { user: { name: 'asc' } }
      })
    ]);
    
    // Set of existing phone numbers in customers to avoid duplicate cards if lead converted
    const customerPhones = new Set<string>();
    customers.forEach(c => {
      const p = (c.mobile || c.whatsappNumber || '').replace(/[^0-9]/g, '');
      if (p) customerPhones.add(p);
    });

    // Normalize deal values & auto-mark confirmed/converted quotations or orders as Won
    const formattedCustomers = (customers as any[]).map(c => {
      const confirmedQuote = (c.quotations || []).find((q: any) => ['Confirmed', 'Converted', 'Accepted'].includes(q.status));
      const hasConfirmedQuote = !!confirmedQuote;
      const hasOrders = (c.orders || []).length > 0 || (c.totalPurchaseValue || 0) > 0;
      const isMatureWon = hasConfirmedQuote || hasOrders || c.leadStage === 'Won';

      const effectiveStage = isMatureWon ? 'Won' : (c.leadStage || 'New Lead');

      // Auto-sync in background if DB is not updated
      if (c.leadStage !== 'Won' && isMatureWon) {
        prisma.customer.update({
          where: { id: c.id },
          data: { leadStage: 'Won', status: 'Active Lead' }
        }).catch(() => {});
      }

      // Accurate Order / Quotation / Deal Value calculation:
      // 1. If explicit expectedValue is set (> 0), use it
      // 2. Else if customer has confirmed quote, use confirmed quote value
      // 3. Else if customer has orders, use the latest order value (or totalPurchaseValue)
      // 4. Else if customer has any quote, use the latest quote value
      // 5. Otherwise 0
      let dealVal = 0;
      if (c.expectedValue && Number(c.expectedValue) > 0) {
        dealVal = Number(c.expectedValue);
      } else if (confirmedQuote?.totalValue && Number(confirmedQuote.totalValue) > 0) {
        dealVal = Number(confirmedQuote.totalValue);
      } else if (c.orders && c.orders.length > 0 && Number(c.orders[0]?.totalValue) > 0) {
        dealVal = Number(c.orders[0].totalValue);
      } else if (c.quotations && c.quotations.length > 0 && Number(c.quotations[0]?.totalValue) > 0) {
        dealVal = Number(c.quotations[0].totalValue);
      } else if (c.totalPurchaseValue && Number(c.totalPurchaseValue) > 0) {
        dealVal = Number(c.totalPurchaseValue);
      } else {
        dealVal = 0;
      }

      return {
        ...c,
        isLeadRecord: false,
        leadStage: effectiveStage,
        expectedValue: dealVal,
        computedDealValue: dealVal
      };
    });

    // Map unconverted raw leads into pipeline format
    const formattedLeads = (rawLeads as any[])
      .filter(l => {
        const p = (l.whatsappNumber || '').replace(/[^0-9]/g, '');
        return !p || !customerPhones.has(p);
      })
      .map(l => {
        let stage = 'New Lead';
        if (l.status === 'Contacted') stage = 'Contacted';
        else if (l.status === 'Qualified' || l.status === 'In Progress') stage = 'Qualified';
        else if (l.status === 'Converted') stage = 'Won';
        else if (l.status === 'Lost') stage = 'Lost';

        return {
          id: l.id,
          isLeadRecord: true,
          businessName: l.shopName || l.name,
          contactPerson: l.name,
          mobile: l.whatsappNumber,
          whatsappNumber: l.whatsappNumber,
          city: '',
          state: '',
          leadStage: stage,
          status: l.status || 'New',
          assignedSalespersonId: l.assignedSalespersonId,
          assignedSalesperson: l.assignedSalesperson,
          expectedValue: 0,
          computedDealValue: 0,
          calls: l.calls || [],
          followUps: l.followUps || [],
          createdAt: l.createdAt,
          updatedAt: l.updatedAt
        };
      });

    const unifiedPipeline = [...formattedCustomers, ...formattedLeads];
    
    return { success: true, customers: unifiedPipeline, employees };
  } catch (error: any) {
    console.error("Failed to fetch pipeline data:", error);
    return { error: "Failed to fetch pipeline data: " + error.message };
  }
}

export async function updateLeadStage(leadId: string, newStage: string, newStatus?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    // Check if it is a customer record
    const customer = await prisma.customer.findUnique({ where: { id: leadId } });
    if (customer) {
      const dataToUpdate: any = { leadStage: newStage };
      if (newStatus) {
        dataToUpdate.status = newStatus;
      } else {
        if (newStage === 'Won') dataToUpdate.status = 'Active Lead';
        else if (newStage === 'Lost') dataToUpdate.status = 'Inactive';
        else if (newStage === 'Opportunity') dataToUpdate.status = 'Opportunity';
        else if (newStage === 'Qualified') dataToUpdate.status = 'Contacted';
        else if (newStage === 'Contacted') dataToUpdate.status = 'Contacted';
        else if (newStage === 'New Lead') dataToUpdate.status = 'New Lead';
      }

      await prisma.customer.update({
        where: { id: leadId },
        data: dataToUpdate
      });
    } else {
      // It's a raw Lead record
      const leadStatus = newStage === 'Won' ? 'Converted' : newStage === 'Lost' ? 'Lost' : newStage === 'Contacted' ? 'Contacted' : newStage === 'Qualified' ? 'Qualified' : 'New';
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: leadStatus }
      });
    }

    revalidatePath("/pipeline");
    revalidatePath("/leads");
    revalidatePath("/customers");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to update lead stage: " + error.message };
  }
}

export async function updateLeadValue(leadId: string, expectedValue: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const customer = await prisma.customer.findUnique({ where: { id: leadId } });
    if (customer) {
      await prisma.customer.update({
        where: { id: leadId },
        data: { expectedValue }
      });
    } else {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (lead) {
        const orgId = await getTenantOrgId();
        await prisma.customer.create({
          data: {
            organizationId: orgId,
            businessName: lead.shopName || lead.name,
            contactPerson: lead.name,
            mobile: lead.whatsappNumber,
            whatsappNumber: lead.whatsappNumber,
            assignedSalespersonId: lead.assignedSalespersonId,
            expectedValue,
            leadStage: lead.status === 'Contacted' ? 'Contacted' : 'New Lead',
            status: 'New Lead'
          }
        });
      }
    }
    
    revalidatePath("/pipeline");
    revalidatePath("/leads");
    revalidatePath("/customers");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to update lead value: " + error.message };
  }
}

export async function assignLeadRep(leadId: string, employeeId: string | null) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const customer = await prisma.customer.findUnique({ where: { id: leadId } });
    if (customer) {
      await prisma.customer.update({
        where: { id: leadId },
        data: { assignedSalespersonId: employeeId || null }
      });
    } else {
      await prisma.lead.update({
        where: { id: leadId },
        data: { assignedSalespersonId: employeeId || null }
      });
    }
    
    revalidatePath("/pipeline");
    revalidatePath("/leads");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to assign representative: " + error.message };
  }
}

export async function advanceLeadStep(leadId: string, nextStage: string, notes?: string, followUpDate?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const userId = (session.user as any).id;
  const organizationId = await getTenantOrgId();

  try {
    const customer = await prisma.customer.findUnique({ where: { id: leadId } });
    const employee = await prisma.employee.findFirst({ where: { userId, organizationId } });

    if (customer) {
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
        where: { id: leadId },
        data: updatePayload
      });

      const empId = employee?.id || customer.assignedSalespersonId;
      if (empId && (notes || followUpDate)) {
        await prisma.call.create({
          data: {
            customerId: leadId,
            employeeId: empId,
            callType: "Outgoing",
            status: "Connected",
            outcome: `Moved to ${nextStage}`,
            notes: notes || `Advanced deal to ${nextStage} stage`,
            followUpDate: followUpDate ? new Date(followUpDate) : null
          }
        });

        if (followUpDate) {
          await prisma.followUp.create({
            data: {
              customerId: leadId,
              employeeId: empId,
              date: new Date(followUpDate),
              followUpType: "Call",
              priority: nextStage === 'Opportunity' || nextStage === 'Won' ? 'High' : 'Medium',
              notes: notes || `Follow-up for ${nextStage} stage`,
              status: "Pending"
            }
          });
        }
      }
    } else {
      // Lead record
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) return { error: "Lead record not found" };

      const leadStatus = nextStage === 'Won' ? 'Converted' : nextStage === 'Lost' ? 'Lost' : nextStage === 'Contacted' ? 'Contacted' : 'New';
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: leadStatus }
      });

      const empId = employee?.id || lead.assignedSalespersonId;
      if (empId && (notes || followUpDate)) {
        await prisma.call.create({
          data: {
            leadId,
            employeeId: empId,
            callType: "Outgoing",
            status: "Connected",
            outcome: `Moved to ${nextStage}`,
            notes: notes || `Advanced lead to ${nextStage} stage`,
            followUpDate: followUpDate ? new Date(followUpDate) : null
          }
        });

        if (followUpDate) {
          await prisma.followUp.create({
            data: {
              leadId,
              employeeId: empId,
              date: new Date(followUpDate),
              followUpType: "Call",
              priority: nextStage === 'Opportunity' || nextStage === 'Won' ? 'High' : 'Medium',
              notes: notes || `Follow-up for ${nextStage} stage`,
              status: "Pending"
            }
          });
        }
      }
    }

    revalidatePath("/pipeline");
    revalidatePath("/leads");
    revalidatePath("/customers");
    revalidatePath("/calls");
    revalidatePath("/follow-ups");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to advance lead step: " + error.message };
  }
}
