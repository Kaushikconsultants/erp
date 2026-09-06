"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";

export async function logCall(formData: FormData) {
  const rawCustomerId = (formData.get("customerId") as string || "").trim();
  const rawLeadId = (formData.get("leadId") as string || "").trim();
  let customerId = (rawCustomerId && rawCustomerId !== "undefined" && rawCustomerId !== "null") ? rawCustomerId : null;
  let leadId = (rawLeadId && rawLeadId !== "undefined" && rawLeadId !== "null") ? rawLeadId : null;
  const type = (formData.get("type") as string || "OUTBOUND").toUpperCase();
  const outcome = (formData.get("outcome") as string || "Connected / Follow-up Needed").trim();
  const notes = (formData.get("notes") as string || "").trim();
  const followUpDateStr = (formData.get("followUpDate") as string || "").trim();
  const recordingUrl = (formData.get("recordingUrl") as string || "").trim();
  const summary = (formData.get("summary") as string || "").trim();
  
  // Enterprise TeleCRM Duration & Status
  const rawDuration = formData.get("durationSec") as string;
  const parsedDuration = rawDuration ? parseInt(rawDuration, 10) : null;
  const durationSec = (parsedDuration !== null && !isNaN(parsedDuration) && parsedDuration >= 0) ? parsedDuration : null;
  const status = (formData.get("status") as string || "Completed").trim();
  const phone = (formData.get("phone") as string || "").trim();
  const newLeadName = (formData.get("newLeadName") as string || "").trim();
  const newLeadShop = (formData.get("newLeadShop") as string || "").trim();

  try {
    const organizationId = await getTenantOrgId();
    // Get the logged-in user's session to find THEIR employee record
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    let employee = null;
    if (userId) {
      employee = await prisma.employee.findUnique({ where: { userId } });
    }
    // Fallback scoped to current organization
    if (!employee && organizationId) {
      employee = await prisma.employee.findFirst({ where: { organizationId } });
    }
    if (!employee) {
      employee = await prisma.employee.findFirst();
    }

    if (!employee) {
      return { error: "No employee record found. Please set up your profile first." };
    }

    // Auto-match or create lead if unmapped phone is provided
    if (!customerId && !leadId && phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length >= 7) {
        // Check existing customer
        const matchCustomer = await prisma.customer.findFirst({
          where: {
            organizationId: organizationId || undefined,
            OR: [
              { mobile: { contains: cleanPhone } },
              { whatsappNumber: { contains: cleanPhone } }
            ]
          }
        });
        if (matchCustomer) {
          customerId = matchCustomer.id;
        } else {
          // Check existing lead
          const matchLead = await prisma.lead.findFirst({
            where: {
              organizationId: organizationId || undefined,
              whatsappNumber: { contains: cleanPhone }
            }
          });
          if (matchLead) {
            leadId = matchLead.id;
          } else if (newLeadName || newLeadShop || phone) {
            // Auto-create a quick lead so CRM integrity is maintained
            try {
              const createdLead = await prisma.lead.create({
                data: {
                  name: newLeadName || `Contact ${cleanPhone.slice(-4)}`,
                  shopName: newLeadShop || "Phone Inquiry",
                  whatsappNumber: phone,
                  status: "New",
                  assignedSalespersonId: employee.id,
                  organizationId: organizationId || undefined
                }
              });
              leadId = createdLead.id;
            } catch (leadErr) {
              console.warn("Could not auto-create lead:", leadErr);
            }
          }
        }
      }
    }

    let followUpDate = null;
    if (followUpDateStr) {
      const parsed = new Date(followUpDateStr);
      if (!isNaN(parsed.getTime())) {
        followUpDate = parsed;
      }
    }

    // Build base call data
    const dataObj: any = {
      employeeId: employee.id,
      callType: type,
      durationSec: durationSec,
      status: status,
      outcome: outcome || "Completed",
      notes: notes || null,
      followUpDate,
      recordingUrl: recordingUrl || null,
      summary: summary || await generateCallSummary(notes, outcome, durationSec),
    };
    if (customerId) dataObj.customerId = customerId;
    if (leadId) dataObj.leadId = leadId;

    const callRecord = await prisma.call.create({
      data: dataObj,
      include: {
        customer: true,
        lead: true,
        employee: {
          include: { user: true }
        }
      }
    });

    // --- Automated Follow-Up Task Sequence for No-Contact Outcomes ---
    const noContactOutcomes = ["No Answer", "Busy", "Voicemail", "Missed", "No Answer / Busy", "Voicemail / Switched Off"];
    const isNoContact = noContactOutcomes.some(nc => outcome.toLowerCase().includes(nc.toLowerCase()));
    
    if (isNoContact && employee) {
      const autoDueDate = new Date();
      autoDueDate.setDate(autoDueDate.getDate() + 1); // follow up next day
      autoDueDate.setHours(11, 0, 0, 0);

      await prisma.task.create({
        data: {
          title: `Follow-up: ${outcome} on call (${phone || "Contact"})`,
          description: `Automatically created for unanswered/busy call. Duration: ${durationSec || 0}s. Notes: ${notes || "None"}`,
          priority: "High",
          dueDate: autoDueDate,
          status: "To Do",
          assigneeId: employee.id,
          creatorId: employee.id,
          customerId: customerId || null,
          leadId: leadId || null,
        }
      }).catch(e => console.error("Task auto-create err:", e));
    }

    revalidatePath("/calls");
    revalidatePath("/follow-ups");
    revalidatePath("/customers");
    revalidatePath("/leads");
    revalidatePath("/");
    
    return { success: true, callRecord };
  } catch (error: any) {
    console.error("Failed to log call:", error);
    return { error: error?.message || "Failed to log call. Please try again." };
  }
}

export async function updateCall(callId: string, data: { 
  outcome?: string; 
  callType?: string; 
  status?: string;
  durationSec?: number | null;
  notes?: string; 
  followUpDate?: string | null 
}) {
  try {
    const updated = await prisma.call.update({
      where: { id: callId },
      data: {
        ...(data.outcome ? { outcome: data.outcome } : {}),
        ...(data.callType ? { callType: data.callType } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.durationSec !== undefined ? { durationSec: data.durationSec } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      }
    });
    revalidatePath("/calls");
    revalidatePath("/follow-ups");
    revalidatePath("/");
    return { success: true, call: updated };
  } catch (error) {
    console.error("Failed to update call:", error);
    return { error: "Failed to update call record." };
  }
}

export async function deleteCall(callId: string) {
  try {
    await prisma.call.delete({
      where: { id: callId }
    });
    revalidatePath("/calls");
    revalidatePath("/follow-ups");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete call:", error);
    return { error: "Failed to delete call record." };
  }
}

export async function removeFollowUp(callId: string) {
  try {
    await prisma.call.update({
      where: { id: callId },
      data: { followUpDate: null }
    });
    revalidatePath("/");
    revalidatePath("/calls");
    revalidatePath("/follow-ups");
    return { success: true };
  } catch (error) {
    console.error("Failed to remove follow up:", error);
    return { error: "Failed to remove follow up." };
  }
}

export async function rescheduleFollowUp(callId: string, newDateStr: string) {
  try {
    const call = await prisma.call.update({
      where: { id: callId },
      data: { followUpDate: new Date(newDateStr) }
    });
    if (call.leadId) {
      revalidatePath(`/leads/${call.leadId}`);
      revalidatePath("/leads");
    } else if (call.customerId) {
      revalidatePath(`/customers/${call.customerId}`);
      revalidatePath("/customers");
    }
    revalidatePath("/calls");
    revalidatePath("/follow-ups");
    return { success: true };
  } catch (error) {
    console.error("Failed to reschedule follow up:", error);
    return { error: "Failed to reschedule follow up." };
  }
}

export async function cleanupOrphanFollowUps() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const res = await prisma.call.updateMany({
      where: {
        followUpDate: { not: null },
        customerId: null,
        leadId: null
      },
      data: { followUpDate: null }
    });

    revalidatePath("/");
    revalidatePath("/calls");
    revalidatePath("/follow-ups");
    return { success: true, count: res.count };
  } catch (error: any) {
    console.error("Failed to cleanup orphan follow-ups:", error);
    return { error: error.message || "Failed to cleanup orphan follow-ups" };
  }
}

async function generateCallSummary(notes: string, outcome: string, durationSec?: number | null) {
  const durationText = durationSec ? ` (${Math.floor(durationSec / 60)}m ${durationSec % 60}s)` : "";
  if (!notes) return `Call${durationText} resulted in ${outcome}.`;
  return `[TeleCRM Summary] Result: ${outcome}${durationText}. Discussion: ${notes}.`;
}

export async function getCustomersForCallModal() {
  try {
    const orgId = await getTenantOrgId();
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, customers: [] };

    const [customers, leads] = await Promise.all([
      prisma.customer.findMany({
        where: orgId ? { organizationId: orgId } : {},
        select: { id: true, businessName: true, contactPerson: true, mobile: true, whatsappNumber: true, city: true },
        orderBy: { businessName: 'asc' },
        take: 200
      }),
      prisma.lead.findMany({
        where: orgId ? { organizationId: orgId } : {},
        select: { id: true, name: true, shopName: true, whatsappNumber: true },
        orderBy: { name: 'asc' },
        take: 200
      })
    ]);

    const mapped = [
      ...customers.map(c => ({
        id: c.id,
        companyName: c.businessName || "Customer",
        contactPerson: c.contactPerson || "",
        phone: c.mobile || c.whatsappNumber || '',
        city: c.city || '',
        type: 'Customer'
      })),
      ...leads.map(l => ({
        id: l.id,
        companyName: l.shopName || l.name || "Lead",
        contactPerson: l.name || "",
        phone: l.whatsappNumber || '',
        city: '',
        type: 'Lead'
      }))
    ];

    return { success: true, customers: mapped };
  } catch (err) {
    console.error("Failed to fetch customers for call modal:", err);
    return { success: false, customers: [] };
  }
}

/**
 * Fetch Recent Calls for Phone Dialer Call Logs / History Tab
 */
export async function getDialerRecentCalls(limit: number = 40) {
  try {
    const orgId = await getTenantOrgId();
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, calls: [] };

    const whereClause: any = orgId ? {
      OR: [
        { customer: { organizationId: orgId } },
        { lead: { organizationId: orgId } },
        { employee: { organizationId: orgId } }
      ]
    } : {};

    const calls = await prisma.call.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        customer: {
          select: { id: true, businessName: true, contactPerson: true, mobile: true, whatsappNumber: true, city: true }
        },
        lead: {
          select: { id: true, name: true, shopName: true, whatsappNumber: true }
        },
        employee: {
          select: { id: true, user: { select: { name: true } } }
        }
      }
    });

    const formattedCalls = (calls || []).map(c => {
      const contactName = c.customer?.businessName || c.lead?.shopName || c.lead?.name || "Direct Contact";
      const contactPerson = c.customer?.contactPerson || c.lead?.name || "";
      const phone = c.customer?.mobile || c.customer?.whatsappNumber || c.lead?.whatsappNumber || "";
      const contactType = c.customer ? "Customer" : c.lead ? "Lead" : "Direct";

      return {
        id: c.id,
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
        callType: c.callType || "OUTBOUND",
        durationSec: c.durationSec || 0,
        status: c.status || "Completed",
        outcome: c.outcome || "Completed",
        notes: c.notes || "",
        followUpDate: c.followUpDate ? new Date(c.followUpDate).toISOString() : null,
        contactName,
        contactPerson,
        phone,
        contactType,
        customerId: c.customerId,
        leadId: c.leadId,
        employeeName: c.employee?.user?.name || "Agent"
      };
    });

    return { success: true, calls: formattedCalls };
  } catch (err: any) {
    console.error("Failed to fetch dialer recent calls:", err);
    return { success: false, calls: [], error: err?.message || "Failed to fetch calls" };
  }
}

/**
 * Enterprise TeleCRM Analytics Action
 * Calculates organization & employee call stats, talk-time, connect rates, and outcome distribution.
 */
export async function getEmployeeCallAnalytics(options?: {
  timeframe?: "today" | "yesterday" | "this_week" | "this_month" | "all";
  employeeId?: string;
}) {
  try {
    const orgId = await getTenantOrgId();
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const timeframe = options?.timeframe || "today";
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();

    if (timeframe === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (timeframe === "yesterday") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
    } else if (timeframe === "this_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
    } else if (timeframe === "this_month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else {
      startDate = new Date(2020, 0, 1);
    }

    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      },
      ...(orgId ? {
        OR: [
          { customer: { organizationId: orgId } },
          { lead: { organizationId: orgId } },
          { employee: { organizationId: orgId } }
        ]
      } : {})
    };

    if (options?.employeeId) {
      whereClause.employeeId = options.employeeId;
    }

    const [calls, allEmployees] = await Promise.all([
      prisma.call.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            include: { user: true }
          },
          customer: true,
          lead: true
        }
      }),
      prisma.employee.findMany({
        where: orgId ? { organizationId: orgId } : {},
        include: { user: true },
        orderBy: { user: { name: "asc" } }
      })
    ]);

    const totalCalls = calls.length;
    const noContactKeywords = ["no answer", "busy", "voicemail", "missed", "switched off", "wrong number"];
    const isConnectedCall = (outcome: string) => {
      if (!outcome) return false;
      const lower = outcome.toLowerCase();
      return !noContactKeywords.some(k => lower.includes(k));
    };

    const connectedCalls = calls.filter(c => isConnectedCall(c.outcome)).length;
    const connectRate = totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0;
    const totalDurationSec = calls.reduce((acc, c) => acc + (c.durationSec || 0), 0);
    const avgDurationSec = totalCalls > 0 ? Math.round(totalDurationSec / totalCalls) : 0;
    const outboundCalls = calls.filter(c => (c.callType || "").toUpperCase() === "OUTBOUND").length;
    const inboundCalls = calls.filter(c => (c.callType || "").toUpperCase() === "INBOUND").length;

    // Outcomes summary
    const outcomesSummary: Record<string, number> = {};
    calls.forEach(c => {
      const oc = c.outcome || "Other";
      outcomesSummary[oc] = (outcomesSummary[oc] || 0) + 1;
    });

    // Hourly distribution for today (08:00 to 20:00)
    const hourlyActivity: { hour: number; label: string; calls: number; durationSec: number }[] = [];
    for (let h = 8; h <= 20; h++) {
      const hCalls = calls.filter(c => {
        const d = new Date(c.createdAt);
        return d.getHours() === h;
      });
      const hDur = hCalls.reduce((acc, c) => acc + (c.durationSec || 0), 0);
      const label = h > 12 ? `${h - 12} PM` : h === 12 ? "12 PM" : `${h} AM`;
      hourlyActivity.push({
        hour: h,
        label,
        calls: hCalls.length,
        durationSec: hDur
      });
    }

    // Per-Employee stats
    const employeeStats = allEmployees.map(emp => {
      const empCalls = calls.filter(c => c.employeeId === emp.id);
      const empConnected = empCalls.filter(c => isConnectedCall(c.outcome)).length;
      const empDuration = empCalls.reduce((acc, c) => acc + (c.durationSec || 0), 0);
      const empConnectRate = empCalls.length > 0 ? Math.round((empConnected / empCalls.length) * 100) : 0;
      const empAvgDuration = empCalls.length > 0 ? Math.round(empDuration / empCalls.length) : 0;

      const empOutcomes: Record<string, number> = {};
      empCalls.forEach(c => {
        const oc = c.outcome || "Other";
        empOutcomes[oc] = (empOutcomes[oc] || 0) + 1;
      });

      const dailyTarget = 40; // Default target calls per day
      const targetPercent = Math.min(100, Math.round((empCalls.length / dailyTarget) * 100));

      return {
        id: emp.id,
        name: emp.user?.name || "Unknown Agent",
        email: emp.user?.email || "",
        role: emp.user?.role || "SALES",
        avatar: emp.user?.avatarUrl || emp.user?.image || null,
        totalCalls: empCalls.length,
        connectedCalls: empConnected,
        connectRate: empConnectRate,
        totalDurationSec: empDuration,
        avgDurationSec: empAvgDuration,
        outcomes: empOutcomes,
        target: dailyTarget,
        targetPercent,
        recentCalls: empCalls.slice(0, 3).map(rc => ({
          id: rc.id,
          createdAt: rc.createdAt,
          outcome: rc.outcome,
          durationSec: rc.durationSec,
          customerName: rc.customer?.businessName || rc.lead?.shopName || rc.lead?.name || "Contact",
          phone: rc.customer?.mobile || rc.customer?.whatsappNumber || rc.lead?.whatsappNumber || ""
        }))
      };
    }).sort((a, b) => b.totalCalls - a.totalCalls);

    return {
      success: true,
      timeframe,
      metrics: {
        totalCalls,
        connectedCalls,
        connectRate,
        totalDurationSec,
        avgDurationSec,
        outboundCalls,
        inboundCalls
      },
      outcomesSummary,
      hourlyActivity,
      employeeStats
    };
  } catch (err: any) {
    console.error("Failed to get employee call analytics:", err);
    return { success: false, error: err?.message || "Failed to fetch telecrm analytics" };
  }
}

/**
 * Fetch Today's Telecalling Queue for Mobile Reps
 */
export async function getTelecallingQueue() {
  try {
    const orgId = await getTenantOrgId();
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, overdue: [], todayDue: [], freshLeads: [] };

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const baseOrgFilter: any = orgId ? {
      OR: [
        { customer: { organizationId: orgId } },
        { lead: { organizationId: orgId } },
        { employee: { organizationId: orgId } }
      ]
    } : {};

    const [overdueCalls, todayCalls, freshLeads] = await Promise.all([
      // Overdue follow-up calls
      prisma.call.findMany({
        where: {
          ...baseOrgFilter,
          followUpDate: {
            lt: startOfToday
          }
        },
        orderBy: { followUpDate: "asc" },
        take: 20,
        include: { customer: true, lead: true, employee: { include: { user: true } } }
      }),

      // Today's scheduled calls
      prisma.call.findMany({
        where: {
          ...baseOrgFilter,
          followUpDate: {
            gte: startOfToday,
            lte: endOfToday
          }
        },
        orderBy: { followUpDate: "asc" },
        take: 30,
        include: { customer: true, lead: true, employee: { include: { user: true } } }
      }),

      // Fresh uncontacted leads
      prisma.lead.findMany({
        where: {
          ...(orgId ? { organizationId: orgId } : {}),
          status: { in: ["NEW", "New Lead", "INTERESTED", "PROSPECT"] },
          calls: { none: {} }
        },
        orderBy: { createdAt: "desc" },
        take: 20
      })
    ]);

    return {
      success: true,
      overdue: overdueCalls,
      todayDue: todayCalls,
      freshLeads
    };
  } catch (err: any) {
    console.error("Failed to fetch telecalling queue:", err);
    return { success: false, overdue: [], todayDue: [], freshLeads: [] };
  }
}
