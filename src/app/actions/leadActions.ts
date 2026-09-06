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
          },
          followUps: {
            select: { id: true, date: true, notes: true, priority: true, status: true, followUpType: true },
            where: { status: 'Pending' },
            orderBy: { date: 'asc' },
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
            select: { id: true, date: true, notes: true, priority: true, status: true, followUpType: true },
            where: { status: 'Pending' },
            orderBy: { date: 'asc' },
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
    
    // Set of existing phone numbers in customers to avoid duplicate cards if lead converted
    const customerPhones = new Set<string>();
    customers.forEach(c => {
      const p = (c.mobile || c.whatsappNumber || '').replace(/[^0-9]/g, '');
      if (p) customerPhones.add(p);
    });

    // Normalize deal values & auto-mark confirmed/converted quotations or orders as Won, and active quotes as Opportunity
    const formattedCustomers = (customers as any[]).map(c => {
      const confirmedQuote = (c.quotations || []).find((q: any) => ['Confirmed', 'Converted', 'Accepted'].includes(q.status));
      const hasConfirmedQuote = !!confirmedQuote;
      const hasOrders = (c.orders || []).length > 0 || (c.totalPurchaseValue || 0) > 0;
      const isMatureWon = hasConfirmedQuote || hasOrders || c.leadStage === 'Won';
      const hasQuotations = (c.quotations || []).length > 0;

      let effectiveStage = c.leadStage || 'New Lead';
      if (isMatureWon) {
        effectiveStage = 'Won';
      } else if (hasQuotations && (effectiveStage === 'Contacted' || effectiveStage === 'New Lead')) {
        // If a customer has a quotation created/sent, they automatically belong in Opportunity stage
        effectiveStage = 'Opportunity';
      }

      // Auto-sync in background if DB is not updated
      if (c.leadStage !== effectiveStage) {
        prisma.customer.update({
          where: { id: c.id },
          data: { leadStage: effectiveStage, status: effectiveStage === 'Won' ? 'Active Lead' : effectiveStage }
        }).catch(() => {});
      }

      // Accurate Order / Quotation / Deal Value calculation:
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

      const nextFu = c.nextFollowUp || c.followUps?.[0]?.date || c.calls?.[0]?.followUpDate || null;
      const nextFuNotes = c.followUps?.[0]?.notes || c.calls?.[0]?.notes || '';
      const nextFuPriority = c.followUps?.[0]?.priority || 'Medium';
      const nextFuType = c.followUps?.[0]?.followUpType || 'Call';

      return {
        ...c,
        isLeadRecord: false,
        leadStage: effectiveStage,
        expectedValue: dealVal,
        computedDealValue: dealVal,
        tags: c.tags || null,
        category: c.tags || null,
        source: c.source || null,
        nextFollowUpDate: nextFu ? new Date(nextFu).toISOString() : null,
        nextFollowUpNotes: nextFuNotes,
        nextFollowUpPriority: nextFuPriority,
        nextFollowUpType: nextFuType
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
        const st = (l.status || '').trim();
        if (st === 'Contacted') stage = 'Contacted';
        else if (st === 'Qualified' || st === 'In Progress' || st === 'Interested') stage = 'Qualified';
        else if (st === 'Opportunity') stage = 'Opportunity';
        else if (st === 'Converted' || st === 'Won') stage = 'Won';
        else if (st === 'Lost') stage = 'Lost';
        else if (st === 'New' || st === 'New Lead') stage = 'New Lead';
        else stage = st || 'New Lead';

        const nextFu = l.followUps?.[0]?.date || l.calls?.[0]?.followUpDate || null;
        const nextFuNotes = l.followUps?.[0]?.notes || l.calls?.[0]?.notes || '';
        const nextFuPriority = l.followUps?.[0]?.priority || 'Medium';
        const nextFuType = l.followUps?.[0]?.followUpType || 'Call';

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
          tags: (l as any).tags || null,
          category: (l as any).tags || null,
          source: (l as any).source || null,
          calls: l.calls || [],
          followUps: l.followUps || [],
          nextFollowUpDate: nextFu ? new Date(nextFu).toISOString() : null,
          nextFollowUpNotes: nextFuNotes,
          nextFollowUpPriority: nextFuPriority,
          nextFollowUpType: nextFuType,
          createdAt: l.createdAt,
          updatedAt: l.updatedAt
        };
      });

    const unifiedPipeline = [...formattedCustomers, ...formattedLeads];

    // Fetch custom stage names & custom categories from tenant-scoped settings
    let customStageTitles: Record<string, string> = {};
    let customCategories: any[] = [];
    try {
      if (organizationId) {
        const [stageIntegration, catIntegration] = await Promise.all([
          prisma.appIntegration.findUnique({
            where: {
              organizationId_providerId: {
                organizationId,
                providerId: "crm_pipeline_stages"
              }
            }
          }),
          prisma.appIntegration.findUnique({
            where: {
              organizationId_providerId: {
                organizationId,
                providerId: "crm_pipeline_categories"
              }
            }
          })
        ]);
        if (stageIntegration?.settings) {
          const parsed = JSON.parse(stageIntegration.settings);
          if (parsed && typeof parsed === 'object') {
            customStageTitles = parsed;
          }
        }
        if (catIntegration?.settings) {
          const parsed = JSON.parse(catIntegration.settings);
          if (Array.isArray(parsed)) {
            customCategories = parsed;
          }
        }
      }
    } catch (e) {}
    
    return { success: true, customers: unifiedPipeline, employees, customStageTitles, customCategories };
  } catch (error: any) {
    console.error("Failed to fetch pipeline data:", error);
    return { error: "Failed to fetch pipeline data: " + error.message };
  }
}

export async function savePipelineStageNames(stageTitles: Record<string, string>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const organizationId = await getTenantOrgId();

  try {
    if (organizationId) {
      await prisma.appIntegration.upsert({
        where: {
          organizationId_providerId: {
            organizationId,
            providerId: "crm_pipeline_stages"
          }
        },
        update: {
          settings: JSON.stringify(stageTitles),
          isEnabled: true
        },
        create: {
          organizationId,
          providerId: "crm_pipeline_stages",
          category: "CRM",
          name: "Pipeline Stage Customizations",
          settings: JSON.stringify(stageTitles),
          isEnabled: true
        }
      });
    }

    revalidatePath("/pipeline");
    revalidatePath("/leads");
    revalidatePath("/customers");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to save pipeline stage names:", error);
    return { error: "Failed to save pipeline stage names: " + error.message };
  }
}

export async function getPipelineStageNames() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, stageNames: {} };

  const organizationId = await getTenantOrgId();

  try {
    if (organizationId) {
      const integration = await prisma.appIntegration.findUnique({
        where: {
          organizationId_providerId: {
            organizationId,
            providerId: "crm_pipeline_stages"
          }
        }
      });
      if (integration?.settings) {
        const parsed = JSON.parse(integration.settings);
        if (parsed && typeof parsed === 'object') {
          return { success: true, stageNames: parsed };
        }
      }
    }

    return { success: true, stageNames: {} };
  } catch (e) {
    return { success: false, stageNames: {} };
  }
}

export async function updateLeadCategory(leadId: string, category: string | null, isLeadRecord: boolean = false) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();

    // 1. Try finding in Customer table first
    const customer = await prisma.customer.findUnique({ where: { id: leadId } });
    if (customer) {
      await prisma.customer.update({
        where: { id: leadId },
        data: { tags: category || null }
      });
      revalidatePath("/pipeline");
      revalidatePath("/leads");
      revalidatePath("/customers");
      return { success: true, customerId: customer.id };
    }

    // 2. If not found in Customer, look in Lead table
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (lead) {
      const p = (lead.whatsappNumber || '').replace(/[^0-9]/g, '');
      
      // Check if a customer with this phone number already exists
      const existingCust = p ? await prisma.customer.findFirst({
        where: {
          organizationId,
          OR: [
            { mobile: lead.whatsappNumber },
            { whatsappNumber: lead.whatsappNumber },
            { mobile: p },
            { whatsappNumber: p }
          ]
        }
      }) : null;

      if (existingCust) {
        await prisma.customer.update({
          where: { id: existingCust.id },
          data: { tags: category || null }
        });
        revalidatePath("/pipeline");
        revalidatePath("/leads");
        revalidatePath("/customers");
        return { success: true, customerId: existingCust.id };
      }

      // Convert/promote the raw lead to Customer so it gains full customer tagging & quotation support
      let mappedStage = 'Qualified';
      const st = (lead.status || '').trim();
      if (st === 'Contacted') mappedStage = 'Contacted';
      else if (st === 'Qualified' || st === 'In Progress' || st === 'Interested') mappedStage = 'Qualified';
      else if (st === 'Opportunity') mappedStage = 'Opportunity';
      else if (st === 'Converted' || st === 'Won') mappedStage = 'Won';
      else if (st === 'Lost') mappedStage = 'Lost';
      else if (st === 'New' || st === 'New Lead') mappedStage = 'New Lead';

      const newCust = await prisma.customer.create({
        data: {
          organizationId,
          businessName: lead.shopName || lead.name,
          contactPerson: lead.name,
          mobile: lead.whatsappNumber,
          whatsappNumber: lead.whatsappNumber,
          assignedSalespersonId: lead.assignedSalespersonId,
          leadStage: mappedStage,
          status: mappedStage === 'Won' ? 'Active Lead' : mappedStage === 'Lost' ? 'Inactive' : mappedStage,
          tags: category || null
        }
      });

      // Link any existing follow-ups and calls to the new customer record
      await Promise.all([
        prisma.followUp.updateMany({
          where: { leadId: lead.id },
          data: { customerId: newCust.id }
        }),
        prisma.call.updateMany({
          where: { leadId: lead.id },
          data: { customerId: newCust.id }
        })
      ]);

      revalidatePath("/pipeline");
      revalidatePath("/leads");
      revalidatePath("/customers");
      return { success: true, customerId: newCust.id };
    }

    return { error: "Lead or customer record not found" };
  } catch (err: any) {
    console.error("Failed to update lead category:", err);
    return { error: err.message || "Failed to update category" };
  }
}

export async function updateLeadSource(leadId: string, source: string | null, isLeadRecord: boolean = false) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();

    // 1. Try finding in Customer table first
    const customer = await prisma.customer.findUnique({ where: { id: leadId } });
    if (customer) {
      await prisma.customer.update({
        where: { id: leadId },
        data: { source: source || null }
      });
      revalidatePath("/pipeline");
      revalidatePath("/leads");
      revalidatePath("/customers");
      return { success: true, customerId: customer.id };
    }

    // 2. If not found in Customer, look in Lead table
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (lead) {
      const p = (lead.whatsappNumber || '').replace(/[^0-9]/g, '');
      
      const existingCust = p ? await prisma.customer.findFirst({
        where: {
          organizationId,
          OR: [
            { mobile: lead.whatsappNumber },
            { whatsappNumber: lead.whatsappNumber },
            { mobile: p },
            { whatsappNumber: p }
          ]
        }
      }) : null;

      if (existingCust) {
        await prisma.customer.update({
          where: { id: existingCust.id },
          data: { source: source || null }
        });
        revalidatePath("/pipeline");
        revalidatePath("/leads");
        revalidatePath("/customers");
        return { success: true, customerId: existingCust.id };
      }

      // Convert/promote the raw lead to Customer with the source assigned
      let mappedStage = 'New Lead';
      const st = (lead.status || '').trim();
      if (st === 'Contacted') mappedStage = 'Contacted';
      else if (st === 'Qualified' || st === 'In Progress' || st === 'Interested') mappedStage = 'Qualified';
      else if (st === 'Opportunity') mappedStage = 'Opportunity';
      else if (st === 'Converted' || st === 'Won') mappedStage = 'Won';
      else if (st === 'Lost') mappedStage = 'Lost';

      const newCust = await prisma.customer.create({
        data: {
          organizationId,
          businessName: lead.shopName || lead.name,
          contactPerson: lead.name,
          mobile: lead.whatsappNumber,
          whatsappNumber: lead.whatsappNumber,
          assignedSalespersonId: lead.assignedSalespersonId,
          leadStage: mappedStage,
          status: mappedStage === 'Won' ? 'Active Lead' : mappedStage === 'Lost' ? 'Inactive' : mappedStage,
          source: source || null
        }
      });

      await Promise.all([
        prisma.followUp.updateMany({
          where: { leadId: lead.id },
          data: { customerId: newCust.id }
        }),
        prisma.call.updateMany({
          where: { leadId: lead.id },
          data: { customerId: newCust.id }
        })
      ]);

      revalidatePath("/pipeline");
      revalidatePath("/leads");
      revalidatePath("/customers");
      return { success: true, customerId: newCust.id };
    }

    return { error: "Lead or customer record not found" };
  } catch (err: any) {
    console.error("Failed to update lead source:", err);
    return { error: err.message || "Failed to update lead source" };
  }
}

export async function savePipelineCategories(categories: Array<{ id: string; label: string; icon?: string; color?: string; bg?: string; border?: string }>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const organizationId = await getTenantOrgId();

  try {
    if (organizationId) {
      await prisma.appIntegration.upsert({
        where: {
          organizationId_providerId: {
            organizationId,
            providerId: "crm_pipeline_categories"
          }
        },
        update: {
          settings: JSON.stringify(categories),
          isEnabled: true
        },
        create: {
          organizationId,
          providerId: "crm_pipeline_categories",
          category: "CRM",
          name: "Pipeline Stage Categories Customizations",
          settings: JSON.stringify(categories),
          isEnabled: true
        }
      });
    }

    revalidatePath("/pipeline");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to save pipeline categories:", error);
    return { error: "Failed to save pipeline categories: " + error.message };
  }
}

export async function getPipelineCategories() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, categories: [] };

  const organizationId = await getTenantOrgId();

  try {
    if (organizationId) {
      const integration = await prisma.appIntegration.findUnique({
        where: {
          organizationId_providerId: {
            organizationId,
            providerId: "crm_pipeline_categories"
          }
        }
      });
      if (integration?.settings) {
        const parsed = JSON.parse(integration.settings);
        if (Array.isArray(parsed)) {
          return { success: true, categories: parsed };
        }
      }
    }

    return { success: true, categories: [] };
  } catch (e) {
    return { success: false, categories: [] };
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
        else if (newStage === 'Qualified') dataToUpdate.status = 'Qualified';
        else if (newStage === 'Contacted') dataToUpdate.status = 'Contacted';
        else if (newStage === 'New Lead') dataToUpdate.status = 'New Lead';
        else dataToUpdate.status = newStage;
      }

      await prisma.customer.update({
        where: { id: leadId },
        data: dataToUpdate
      });
    } else {
      // It's a raw Lead record
      let leadStatus = 'New';
      if (newStage === 'Won') leadStatus = 'Converted';
      else if (newStage === 'Lost') leadStatus = 'Lost';
      else if (newStage === 'Opportunity') leadStatus = 'Opportunity';
      else if (newStage === 'Qualified') leadStatus = 'Qualified';
      else if (newStage === 'Contacted') leadStatus = 'Contacted';
      else if (newStage === 'New Lead') leadStatus = 'New';
      else leadStatus = newStage;

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
        let mappedStage = 'New Lead';
        const st = (lead.status || '').trim();
        if (st === 'Contacted') mappedStage = 'Contacted';
        else if (st === 'Qualified' || st === 'In Progress') mappedStage = 'Qualified';
        else if (st === 'Opportunity') mappedStage = 'Opportunity';
        else if (st === 'Converted' || st === 'Won') mappedStage = 'Won';
        else if (st === 'Lost') mappedStage = 'Lost';

        const newCust = await prisma.customer.create({
          data: {
            organizationId: orgId,
            businessName: lead.shopName || lead.name,
            contactPerson: lead.name,
            mobile: lead.whatsappNumber,
            whatsappNumber: lead.whatsappNumber,
            assignedSalespersonId: lead.assignedSalespersonId,
            expectedValue,
            leadStage: mappedStage,
            status: mappedStage === 'Won' ? 'Active Lead' : mappedStage === 'Lost' ? 'Inactive' : mappedStage
          }
        });

        await Promise.all([
          prisma.followUp.updateMany({
            where: { leadId: lead.id },
            data: { customerId: newCust.id }
          }),
          prisma.call.updateMany({
            where: { leadId: lead.id },
            data: { customerId: newCust.id }
          })
        ]);
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
      else if (nextStage === 'Lost') status = 'Inactive';
      else if (nextStage === 'Opportunity') status = 'Opportunity';
      else if (nextStage === 'Qualified') status = 'Qualified';
      else if (nextStage === 'Contacted') status = 'Contacted';
      else if (nextStage === 'New Lead') status = 'New Lead';
      else status = nextStage;

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

      let leadStatus = 'New';
      if (nextStage === 'Won') leadStatus = 'Converted';
      else if (nextStage === 'Lost') leadStatus = 'Lost';
      else if (nextStage === 'Opportunity') leadStatus = 'Opportunity';
      else if (nextStage === 'Qualified') leadStatus = 'Qualified';
      else if (nextStage === 'Contacted') leadStatus = 'Contacted';
      else if (nextStage === 'New Lead') leadStatus = 'New';
      else leadStatus = nextStage;

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

export async function scheduleLeadFollowUp(
  leadId: string,
  followUpDate: string,
  notes?: string,
  priority: string = "Medium",
  followUpType: string = "Call"
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const userId = (session.user as any).id;
  const organizationId = await getTenantOrgId();

  try {
    const customer = await prisma.customer.findUnique({ where: { id: leadId } });
    const employee = await prisma.employee.findFirst({ where: { userId, organizationId } });

    const fDate = new Date(followUpDate);
    if (isNaN(fDate.getTime())) {
      return { error: "Invalid follow-up date" };
    }

    if (customer) {
      const empId = employee?.id || customer.assignedSalespersonId;

      await prisma.customer.update({
        where: { id: leadId },
        data: {
          nextFollowUp: fDate,
          notes: notes ? (customer.notes ? `${customer.notes}\n[${new Date().toLocaleDateString('en-IN')}] ${notes}` : notes) : undefined
        }
      });

      if (empId) {
        await prisma.followUp.create({
          data: {
            customerId: leadId,
            employeeId: empId,
            date: fDate,
            followUpType,
            priority,
            notes: notes || "Scheduled from Sales Pipeline",
            status: "Pending"
          }
        });

        await prisma.call.create({
          data: {
            customerId: leadId,
            employeeId: empId,
            callType: "Outgoing",
            status: "Scheduled",
            outcome: "Follow-up Scheduled",
            notes: notes || "Follow-up scheduled from Sales Pipeline",
            followUpDate: fDate
          }
        });
      }

      revalidatePath("/pipeline");
      revalidatePath("/calls");
      revalidatePath("/customers");
      revalidatePath("/");
      return { success: true };
    } else {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) return { error: "Deal record not found" };

      const empId = employee?.id || lead.assignedSalespersonId;
      if (empId) {
        await prisma.followUp.create({
          data: {
            leadId,
            employeeId: empId,
            date: fDate,
            followUpType,
            priority,
            notes: notes || "Scheduled from Sales Pipeline",
            status: "Pending"
          }
        });

        await prisma.call.create({
          data: {
            leadId,
            employeeId: empId,
            callType: "Outgoing",
            status: "Scheduled",
            outcome: "Follow-up Scheduled",
            notes: notes || "Follow-up scheduled from Sales Pipeline",
            followUpDate: fDate
          }
        });
      }

      revalidatePath("/pipeline");
      revalidatePath("/calls");
      revalidatePath("/leads");
      revalidatePath("/");
      return { success: true };
    }
  } catch (error: any) {
    console.error("Failed to schedule follow up:", error);
    return { error: error.message || "Failed to schedule follow-up" };
  }
}

export async function completeLeadFollowUp(leadId: string, notes?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    await prisma.followUp.updateMany({
      where: {
        OR: [
          { customerId: leadId, status: "Pending" },
          { leadId: leadId, status: "Pending" }
        ]
      },
      data: {
        status: "Completed",
        notes: notes ? `Completed: ${notes}` : undefined
      }
    });

    await prisma.customer.update({
      where: { id: leadId },
      data: { nextFollowUp: null }
    }).catch(() => {});

    revalidatePath("/pipeline");
    revalidatePath("/calls");
    revalidatePath("/customers");
    revalidatePath("/leads");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to complete follow-up" };
  }
}

export async function deletePipelineLead(leadId: string, isLeadRecord: boolean) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const organizationId = await getTenantOrgId();
  if (!organizationId) return { error: "Unauthorized" };

  try {
    if (isLeadRecord) {
      // It's in prisma.lead
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId }
      });
      if (!lead) return { error: "Lead not found" };

      await prisma.$transaction(async (tx) => {
        await tx.call.deleteMany({ where: { leadId } });
        await tx.followUp.deleteMany({ where: { leadId } });
        await tx.task.deleteMany({ where: { leadId } });
        await tx.lead.delete({ where: { id: leadId } });
      });

      revalidatePath("/pipeline");
      revalidatePath("/leads");
      revalidatePath("/calls");
      revalidatePath("/");
      return { success: true };
    } else {
      // It's in prisma.customer
      const customer = await prisma.customer.findFirst({
        where: { id: leadId, organizationId }
      });
      if (!customer) return { error: "Lead not found" };

      await prisma.$transaction(async (tx) => {
        // Activity & CRM logs
        await tx.call.deleteMany({ where: { customerId: leadId } });
        await tx.followUp.deleteMany({ where: { customerId: leadId } });
        await tx.task.deleteMany({ where: { customerId: leadId } });

        // WhatsApp communications
        const convos = await tx.whatsAppConversation.findMany({
          where: { customerId: leadId },
          select: { id: true }
        });
        if (convos.length > 0) {
          await tx.whatsAppMessage.deleteMany({
            where: { conversationId: { in: convos.map(c => c.id) } }
          });
          await tx.whatsAppConversation.deleteMany({ where: { customerId: leadId } });
        }
        await tx.whatsAppPaymentLink.deleteMany({ where: { customerId: leadId } });
        await tx.whatsAppFormSubmission.deleteMany({ where: { customerId: leadId } });

        // Financial & transactional entities
        await tx.postDatedCheque.deleteMany({ where: { customerId: leadId } });

        const challans = await tx.deliveryChallan.findMany({
          where: { customerId: leadId },
          select: { id: true }
        });
        if (challans.length > 0) {
          await tx.deliveryChallanItem.deleteMany({
            where: { challanId: { in: challans.map(c => c.id) } }
          });
          await tx.deliveryChallan.deleteMany({ where: { customerId: leadId } });
        }

        await tx.eWayBill.deleteMany({ where: { customerId: leadId } });

        const creditNotes = await tx.creditNote.findMany({
          where: { customerId: leadId },
          select: { id: true }
        });
        if (creditNotes.length > 0) {
          await tx.creditNoteItem.deleteMany({
            where: { creditNoteId: { in: creditNotes.map(c => c.id) } }
          });
          await tx.creditNote.deleteMany({ where: { customerId: leadId } });
        }

        const quotes = await tx.quotation.findMany({
          where: { customerId: leadId },
          select: { id: true }
        });
        if (quotes.length > 0) {
          await tx.quotationItem.deleteMany({
            where: { quotationId: { in: quotes.map(q => q.id) } }
          });
          await tx.quotation.deleteMany({ where: { customerId: leadId } });
        }

        await tx.customer.delete({ where: { id: leadId } });
      });

      revalidatePath("/pipeline");
      revalidatePath("/customers");
      revalidatePath("/leads");
      revalidatePath("/calls");
      revalidatePath("/");
      return { success: true };
    }
  } catch (error: any) {
    console.error("Error deleting pipeline lead:", error);
    return { error: error.message || "Failed to delete lead" };
  }
}

export async function createQuickLead(data: { name: string; shopName?: string; whatsappNumber?: string; notes?: string }) {
  try {
    const organizationId = await getTenantOrgId();
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    let employeeId = null;
    if (userId) {
      const emp = await prisma.employee.findUnique({ where: { userId } });
      if (emp) employeeId = emp.id;
    }

    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        shopName: data.shopName || null,
        whatsappNumber: data.whatsappNumber || "",
        status: "New Lead",
        organizationId,
        assignedSalespersonId: employeeId
      }
    });

    revalidatePath("/leads");
    return { success: true, lead };
  } catch (err: any) {
    console.error("Failed to create quick lead:", err);
    return { success: false, error: err.message };
  }
}


