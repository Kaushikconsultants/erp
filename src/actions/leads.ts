"use server";

import { prisma } from "@/lib/prisma";
import { getTenantOrgId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

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

    const existingLead = await prisma.lead.findFirst({
      where: {
        whatsappNumber: data.whatsappNumber,
        organizationId: orgId || null
      },
      include: {
        assignedSalesperson: { include: { user: true } }
      }
    });

    if (existingLead) {
      const agentName = existingLead.assignedSalesperson?.user?.name || "an agent";
      return { success: false, error: `Lead with this mobile number already exists and is assigned to ${agentName}.` };
    }

    const lead = await prisma.lead.create({
      data: {
        ...data,
        organizationId: orgId,
      }
    });

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
      // 3. Mark the Lead as Converted
      prisma.lead.update({
        where: { id: leadId },
        data: { status: "Converted" }
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

    await prisma.lead.delete({
      where: { id, organizationId: orgId }
    });

    revalidatePath("/leads");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting lead:", error);
    return { success: false, error: "Failed to delete lead" };
  }
}
