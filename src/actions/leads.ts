"use server";

import { prisma } from "@/lib/prisma";
import { getTenantOrgId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { notifyNewLead } from "@/lib/pushNotifications";

export async function getLeads() {
  try {
    const orgId = await getTenantOrgId();
    if (!orgId) return { success: false, error: "Unauthorized" };

    const leads = await prisma.lead.findMany({
      where: { organizationId: orgId },
      include: {
        assignedSalesperson: {
          include: {
            user: true
          }
        },
        _count: {
          select: { calls: true, followUps: true, tasks: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: leads };
  } catch (error: any) {
    console.error("Error fetching leads:", error);
    return { success: false, error: "Failed to fetch leads" };
  }
}

export async function getLead(id: string) {
  try {
    const orgId = await getTenantOrgId();
    if (!orgId) return { success: false, error: "Unauthorized" };

    const lead = await prisma.lead.findFirst({
      where: { id, organizationId: orgId },
      include: {
        assignedSalesperson: {
          include: {
            user: true
          }
        },
        calls: {
          include: { employee: { include: { user: true } } },
          orderBy: { createdAt: 'desc' }
        },
        followUps: {
          include: { employee: { include: { user: true } } },
          orderBy: { date: 'asc' }
        },
        tasks: {
          include: { 
            assignee: { include: { user: true } },
            creator: { include: { user: true } }
          },
          orderBy: { dueDate: 'asc' }
        }
      }
    });

    if (!lead) return { success: false, error: "Lead not found" };

    return { success: true, data: lead };
  } catch (error: any) {
    console.error("Error fetching lead:", error);
    return { success: false, error: "Failed to fetch lead" };
  }
}

export async function createLead(data: {
  name: string;
  whatsappNumber: string;
  shopName?: string;
  assignedSalespersonId?: string;
}) {
  try {
    const orgId = await getTenantOrgId();
    if (!orgId) return { success: false, error: "Unauthorized" };

    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth");
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    let assignedSalespersonId = data.assignedSalespersonId;
    
    // If an agent is creating this lead, auto-assign to them
    if (user && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      const employee = await prisma.employee.findFirst({
        where: { userId: user.id, organizationId: orgId }
      });
      if (employee) {
        assignedSalespersonId = employee.id;
      }
    }

    const cleanDigits = (data.whatsappNumber || "").replace(/\D/g, "");
    const last10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

    const existingLead = await prisma.lead.findFirst({
      where: {
        ...(orgId ? {
          OR: [
            { organizationId: orgId },
            { organizationId: null },
            { organizationId: "default-org" }
          ]
        } : {}),
        whatsappNumber: { contains: last10 }
      },
      include: {
        assignedSalesperson: { include: { user: true } }
      }
    });

    if (existingLead) {
      const agentName = existingLead.assignedSalesperson?.user?.name || "an agent";
      return { success: false, error: `Lead with mobile number ending in ${last10} already exists (assigned to ${agentName}).` };
    }

    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        whatsappNumber: data.whatsappNumber,
        shopName: data.shopName,
        assignedSalespersonId: assignedSalespersonId,
        organizationId: orgId,
      }
    });

    // Send real-time push notification to assigned agent & admins
    notifyNewLead({
      leadId: lead.id,
      name: lead.name,
      whatsappNumber: lead.whatsappNumber,
      shopName: lead.shopName,
      assignedSalespersonId: lead.assignedSalespersonId,
      organizationId: orgId,
      source: "Manual Lead Form"
    }).catch((err) => console.error("Failed to dispatch push notification for created lead:", err));

    revalidatePath("/leads");
    return { success: true, data: lead };
  } catch (error: any) {
    console.error("Error creating lead:", error);
    return { success: false, error: "Failed to create lead" };
  }
}

export async function updateLead(id: string, data: {
  name?: string;
  whatsappNumber?: string;
  shopName?: string;
  status?: string;
  assignedSalespersonId?: string | null;
}) {
  try {
    const orgId = await getTenantOrgId();
    if (!orgId) return { success: false, error: "Unauthorized" };

    // Prevent passing undefined values to prisma
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.whatsappNumber !== undefined) updateData.whatsappNumber = data.whatsappNumber;
    if (data.shopName !== undefined) updateData.shopName = data.shopName;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.assignedSalespersonId !== undefined) updateData.assignedSalespersonId = data.assignedSalespersonId;

    const lead = await prisma.lead.update({
      where: { id, organizationId: orgId },
      data: updateData
    });

    revalidatePath("/leads");
    revalidatePath(`/leads/${id}`);
    return { success: true, data: lead };
  } catch (error: any) {
    console.error("Error updating lead:", error);
    return { success: false, error: "Failed to update lead" };
  }
}

export async function convertLeadToCustomer(leadId: string, customerData: any) {
  try {
    const orgId = await getTenantOrgId();
    if (!orgId) return { success: false, error: "Unauthorized" };

    const existingCustomer = await prisma.customer.findFirst({
      where: {
        mobile: customerData.mobile,
        organizationId: orgId || null
      },
      include: {
        assignedSalesperson: { include: { user: true } }
      }
    });

    if (existingCustomer) {
      const agentName = existingCustomer.assignedSalesperson?.user?.name || "an agent";
      return { success: false, error: `Customer with this mobile number already exists and is assigned to ${agentName}.` };
    }

    // 1. Create the new customer
    const newCustomer = await prisma.customer.create({
      data: {
        ...customerData,
        organizationId: orgId,
        // Mark status specifically since it originated from a lead
        status: "Converted from Lead",
      }
    });

    // 2. Transfer all calls, followups, tasks from the Lead to the Customer
    await prisma.$transaction([
      prisma.call.updateMany({
        where: { leadId: leadId },
        data: { customerId: newCustomer.id, leadId: null }
      }),
      prisma.followUp.updateMany({
        where: { leadId: leadId },
        data: { customerId: newCustomer.id, leadId: null }
      }),
      prisma.task.updateMany({
        where: { leadId: leadId },
        data: { customerId: newCustomer.id, leadId: null }
      }),
      // 3. Delete the Lead as it is now a Customer
      prisma.lead.delete({
        where: { id: leadId }
      })
    ]);

    revalidatePath("/leads");
    revalidatePath("/customers");
    
    return { success: true, data: newCustomer };
  } catch (error: any) {
    console.error("Error converting lead to customer:", error);
    return { success: false, error: "Failed to convert lead: " + error.message };
  }
}

export async function deleteLead(id: string) {
  try {
    const orgId = await getTenantOrgId();
    if (!orgId) return { success: false, error: "Unauthorized" };

    // 1. Delete all calls and recordings associated with this lead
    await prisma.call.deleteMany({
      where: { leadId: id }
    });

    // 2. Delete all follow-ups associated with this lead
    await prisma.followUp.deleteMany({
      where: { leadId: id }
    });

    // 3. Delete all tasks associated with this lead
    await prisma.task.deleteMany({
      where: { leadId: id }
    });

    // 4. Delete the lead itself
    await prisma.lead.delete({
      where: { id, organizationId: orgId }
    });

    revalidatePath("/leads");
    revalidatePath("/calls");
    revalidatePath("/follow-ups");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting lead:", error);
    return { success: false, error: "Failed to delete lead" };
  }
}

export async function deleteMultipleLeads(ids: string[]) {
  try {
    const orgId = await getTenantOrgId();
    if (!orgId) return { success: false, error: "Unauthorized" };
    if (!ids || ids.length === 0) return { success: false, error: "No leads selected to delete." };

    await prisma.$transaction(async (tx) => {
      // 1. Delete all calls associated with these leads
      await tx.call.deleteMany({
        where: { leadId: { in: ids } }
      });

      // 2. Delete all follow-ups associated with these leads
      await tx.followUp.deleteMany({
        where: { leadId: { in: ids } }
      });

      // 3. Delete all tasks associated with these leads
      await tx.task.deleteMany({
        where: { leadId: { in: ids } }
      });

      // 4. Delete the leads
      await tx.lead.deleteMany({
        where: { id: { in: ids }, organizationId: orgId }
      });
    });

    revalidatePath("/leads");
    revalidatePath("/calls");
    revalidatePath("/follow-ups");
    revalidatePath("/");
    return { success: true, count: ids.length };
  } catch (error: any) {
    console.error("Error bulk deleting leads:", error);
    return { success: false, error: "Failed to delete selected leads: " + (error?.message || "") };
  }
}


export async function getWebhookLogs() {
  try {
    const orgId = await getTenantOrgId();
    if (!orgId) return [];

    const logs = await prisma.webhookLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    return logs;
  } catch (error) {
    console.error("Failed to fetch webhook logs:", error);
    return [];
  }
}
