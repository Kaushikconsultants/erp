"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSprintData } from "./sprintActions";
import { getOrCreateEmployee } from "@/lib/employeeHelper";
import { getTenantAIClient } from "@/lib/gemini";

export interface AISprintPlanResult {
  diagnostic: string;
  sprintHealthSummary: string;
  recommendedDailyGoals: {
    calls: number;
    followUps: number;
    quotes: number;
    deals: number;
    rationale: string;
  };
  closingTactics: string[];
  recommendedTasks: Array<{
    id?: string;
    title: string;
    description: string;
    priority: "Low" | "Medium" | "High" | "Urgent";
    customerId?: string | null;
    customerName?: string | null;
    estimatedValue?: number;
    suggestedDueDate?: string;
  }>;
}

export async function generateAISalespersonSprintPlan(employeeId: string): Promise<{
  success: boolean;
  plan?: AISprintPlanResult;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: true,
        customers: {
          take: 20,
          orderBy: { totalPurchaseValue: "desc" },
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            mobile: true,
            leadStage: true,
            temperature: true,
            totalPurchaseValue: true
          }
        }
      }
    });

    if (!employee) return { success: false, error: "Salesperson not found" };

    const sprint = await getSprintData(employeeId);
    if (!sprint) return { success: false, error: "Failed to compute sprint data" };

    // Fetch open / pending quotations in pipeline
    const pendingQuotes = await prisma.quotation.findMany({
      where: {
        OR: [
          { salespersonId: employee.id },
          { customer: { assignedSalespersonId: employee.id } }
        ],
        status: { in: ["Sent", "Draft", "Viewed", "Pending Approval"] }
      },
      take: 10,
      orderBy: { totalValue: "desc" },
      include: { customer: true }
    });

    // Fetch recent pending follow-ups
    const pendingFollowUps = await prisma.call.findMany({
      where: {
        employeeId: employee.id,
        followUpDate: { gte: new Date(new Date().setDate(new Date().getDate() - 2)) },
        OR: [
          { customer: { organizationId: employee.organizationId } },
          { lead: { organizationId: employee.organizationId } }
        ]
      },
      take: 10,
      orderBy: { followUpDate: "asc" },
      include: { customer: true, lead: true }
    });

    const gap = sprint.sprintGap;
    const daysLeft = sprint.daysRemainingInSprint;
    const currentRevenue = sprint.currentSprintRevenue;
    const targetRevenue = sprint.currentSprintTarget;
    const isBehind = sprint.healthStatus === "AT_RISK" || sprint.sprintProgressPercent < 70;

    // AI Engine using Gemini
    const { ai, isConfigured, model } = await getTenantAIClient(employee.organizationId);
    if (isConfigured) {
      try {
        const prompt = `
You are an expert Chief Revenue Officer & AI Sales Sprint Coach for an enterprise ERP platform.
Analyze this salesperson's performance for the current sprint window and create a hyper-practical, high-converting target achievement plan.

Salesperson Details:
- Name: ${employee.user.name}
- Current Sprint: Week ${sprint.weekNumber} (${sprint.weekName})
- Days Remaining in Sprint: ${daysLeft} days
- Current Sprint Target: ₹${targetRevenue.toLocaleString('en-IN')}
- Current Sprint Revenue Achieved: ₹${currentRevenue.toLocaleString('en-IN')} (${sprint.sprintProgressPercent}%)
- Gap to Hit Target: ₹${gap.toLocaleString('en-IN')}
- Required Daily Run Rate: ₹${sprint.dailyRunRateNeeded.toLocaleString('en-IN')}/day
- Today's Activity: Calls ${sprint.todayCalls}/${sprint.todayCallsTarget}, Follow-ups ${sprint.todayFollowUps}/${sprint.todayFollowUpsTarget}, Quotes Sent ${sprint.todayQuotesSent}/${sprint.todayQuotesSentTarget}

Open Quotations in Pipeline (${pendingQuotes.length} total):
${pendingQuotes.map(q => `- Doc #${q.quotationNumber}: ₹${q.totalValue} (${q.customer?.businessName || 'Customer'}) - Status: ${q.status}`).join("\n")}

Hot / Negotiation Customers Assigned:
${employee.customers.filter(c => c.leadStage === 'Negotiation' || c.temperature === 'HOT').map(c => `- ${c.businessName} (Contact: ${c.contactPerson}, Total History: ₹${c.totalPurchaseValue})`).join("\n")}

Pending Follow-up Calls:
${pendingFollowUps.map(f => `- ${f.customer?.businessName || f.lead?.shopName || f.lead?.name || 'Customer'}: ${f.notes || 'Follow-up'} (Scheduled: ${f.followUpDate?.toISOString().split('T')[0]})`).join("\n")}

Output a strict JSON object with:
{
  "diagnostic": "2-3 concise sentences diagnosing why they are ahead/behind and what must change immediately.",
  "sprintHealthSummary": "Brief motivational headline summary",
  "recommendedDailyGoals": {
    "calls": integer (e.g. 20-30 if behind, 15 if normal),
    "followUps": integer (e.g. 6-10),
    "quotes": integer (e.g. 2-5),
    "deals": integer (e.g. 1-3),
    "rationale": "Brief reason for these specific daily action volumes"
  },
  "closingTactics": [
    "3 specific, actionable closing strategies (e.g. prompt payment discounts, urgency angles, wholesale volume pitches)"
  ],
  "recommendedTasks": [
    {
      "title": "Clear action-oriented task title (e.g. 'Close ₹22k Quote with Swpina Fashion')",
      "description": "Step-by-step instructions on what to pitch, objection to handle, or incentive to offer.",
      "priority": "Urgent" | "High" | "Medium",
      "customerName": "Customer Name or 'General Outbound'",
      "estimatedValue": numeric amount in INR
    }
  ]
}
`;

        const response = await ai.models.generateContent({
          model: model || "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          }
        });

        const text = response.text || "{}";
        const parsed = JSON.parse(text);

        if (parsed.diagnostic && parsed.recommendedDailyGoals) {
          return {
            success: true,
            plan: {
              diagnostic: parsed.diagnostic,
              sprintHealthSummary: parsed.sprintHealthSummary || (isBehind ? "Sprint Recovery Mode Required" : "High Velocity Momentum"),
              recommendedDailyGoals: {
                calls: Number(parsed.recommendedDailyGoals.calls) || 20,
                followUps: Number(parsed.recommendedDailyGoals.followUps) || 6,
                quotes: Number(parsed.recommendedDailyGoals.quotes) || 3,
                deals: Number(parsed.recommendedDailyGoals.deals) || 1,
                rationale: parsed.recommendedDailyGoals.rationale || "Calibrated based on remaining sprint gap."
              },
              closingTactics: Array.isArray(parsed.closingTactics) ? parsed.closingTactics : [
                "Offer 3% prompt payment discount on quotes older than 48 hours",
                "Prioritize call backs before 12 PM to catch business owners",
                "Send high-converting WhatsApp catalogs to dormant repeat buyers"
              ],
              recommendedTasks: Array.isArray(parsed.recommendedTasks) ? parsed.recommendedTasks.map((t: any) => {
                const matchedCust = employee.customers.find(c => c.businessName?.toLowerCase() === t.customerName?.toLowerCase());
                return {
                  title: t.title || "Target Recovery Task",
                  description: t.description || "Follow up and drive quotation conversion.",
                  priority: (t.priority === "Urgent" || t.priority === "High" || t.priority === "Medium") ? t.priority : "High",
                  customerId: matchedCust ? matchedCust.id : (employee.customers[0]?.id || null),
                  customerName: t.customerName || (matchedCust ? matchedCust.businessName : "Priority Account"),
                  estimatedValue: Number(t.estimatedValue) || Math.round(gap / 3),
                  suggestedDueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                };
              }) : []
            }
          };
        }
      } catch (geminiError) {
        console.error("Gemini AI error in generateAISalespersonSprintPlan, falling back to rule engine:", geminiError);
      }
    }

    // High-precision Algorithmic Fallback when AI key is missing or failed
    const recommendedCalls = isBehind ? Math.min(40, Math.max(20, Math.ceil(sprint.todayCallsTarget * 1.5))) : sprint.todayCallsTarget;
    const recommendedFollowUps = isBehind ? Math.min(15, Math.max(8, Math.ceil(sprint.todayFollowUpsTarget * 1.4))) : sprint.todayFollowUpsTarget;
    const recommendedQuotes = isBehind ? Math.max(3, Math.ceil(sprint.todayQuotesSentTarget * 1.5)) : sprint.todayQuotesSentTarget;
    const recommendedDeals = Math.max(1, Math.ceil(gap / (daysLeft * 40000)));

    const fallbackTasks: any[] = [];

    // 1. Task for top pending quotation
    if (pendingQuotes.length > 0) {
      const topQuote = pendingQuotes[0];
      fallbackTasks.push({
        title: `Follow up & Close Quote #${topQuote.quotationNumber} with ${topQuote.customer?.businessName || 'Client'}`,
        description: `Quotation value ₹${topQuote.totalValue.toLocaleString('en-IN')} is awaiting confirmation. Call the decision maker to offer flexible delivery terms or standard payment terms to lock in the deal today.`,
        priority: "Urgent",
        customerId: topQuote.customerId,
        customerName: topQuote.customer?.businessName || "Quotation Client",
        estimatedValue: topQuote.totalValue,
        suggestedDueDate: new Date().toISOString().split('T')[0]
      });
    }

    // 2. Task for hot negotiation customer
    const hotCust = employee.customers.find(c => c.leadStage === 'Negotiation' || c.temperature === 'HOT');
    if (hotCust) {
      fallbackTasks.push({
        title: `Schedule Decision Call with ${hotCust.businessName}`,
        description: `Account is in Negotiation stage with historical value of ₹${hotCust.totalPurchaseValue.toLocaleString('en-IN')}. Reach out with the new stock inventory and secure repeat order commitment.`,
        priority: "High",
        customerId: hotCust.id,
        customerName: hotCust.businessName,
        estimatedValue: Math.round(gap * 0.4),
        suggestedDueDate: new Date().toISOString().split('T')[0]
      });
    }

    // 3. High-volume outbound push task
    fallbackTasks.push({
      title: `Conduct ${recommendedCalls} Focused Outbound Pitch Calls`,
      description: `Need ₹${sprint.dailyRunRateNeeded.toLocaleString('en-IN')}/day to hit Sprint ${sprint.weekNumber}. Complete dedicated call sprint targeting wholesale and retail apparel buyers.`,
      priority: "High",
      customerId: employee.customers[0]?.id || null,
      customerName: "Assigned Customer Base",
      estimatedValue: Math.round(gap * 0.5),
      suggestedDueDate: new Date().toISOString().split('T')[0]
    });

    return {
      success: true,
      plan: {
        diagnostic: isBehind 
          ? `Current pace achieves ₹${currentRevenue.toLocaleString('en-IN')} against ₹${targetRevenue.toLocaleString('en-IN')} target (${daysLeft} days remaining). A daily closing run-rate of ₹${sprint.dailyRunRateNeeded.toLocaleString('en-IN')} is required.` 
          : `Strong velocity at ${sprint.sprintProgressPercent}% of Sprint ${sprint.weekNumber}. Maintain high lead volume to exceed month-end quota.`,
        sprintHealthSummary: isBehind ? `Sprint Recovery: ₹${gap.toLocaleString('en-IN')} Deficit` : "Target Momentum: On Pace",
        recommendedDailyGoals: {
          calls: recommendedCalls,
          followUps: recommendedFollowUps,
          quotes: recommendedQuotes,
          deals: recommendedDeals,
          rationale: `Calculated to close the ₹${gap.toLocaleString('en-IN')} sprint deficit across the remaining ${daysLeft} days.`
        },
        closingTactics: [
          "Offer 2-3% prompt-settlement rebate on quotations confirmed within 24 hours.",
          "Prioritize calling negotiation accounts and sent quotations before 1:00 PM.",
          "Broadcast WhatsApp stock availability cards to high-volume buyers."
        ],
        recommendedTasks: fallbackTasks
      }
    };
  } catch (error: any) {
    console.error("Error in generateAISalespersonSprintPlan:", error);
    return { success: false, error: error.message || "Failed to generate AI sprint plan" };
  }
}

export async function applyAISprintPlan(data: {
  employeeId: string;
  dailyCallsTarget: number;
  dailyFollowUpsTarget: number;
  dailyQuotesTarget: number;
  dailyDealsTarget: number;
  tasksToCreate: Array<{
    title: string;
    description: string;
    priority: string;
    customerId?: string | null;
    dueDate?: string;
  }>;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const userId = (session.user as any).id;
    const adminCreator = await getOrCreateEmployee(userId, session.user);

    // 1. Update Employee Daily Action Targets
    await prisma.employee.update({
      where: { id: data.employeeId },
      data: {
        dailyCallsTarget: data.dailyCallsTarget,
        dailyFollowUpsTarget: data.dailyFollowUpsTarget,
        dailyQuotesTarget: data.dailyQuotesTarget,
        dailyDealsTarget: data.dailyDealsTarget,
      }
    });

    // 2. Create and delegate selected tasks
    const createdTasks: any[] = [];
    for (const t of data.tasksToCreate) {
      if (!t.title) continue;
      const created = await prisma.task.create({
        data: {
          title: t.title,
          description: t.description || null,
          priority: t.priority || "High",
          status: "To Do",
          dueDate: t.dueDate ? new Date(t.dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
          assigneeId: data.employeeId,
          creatorId: adminCreator ? adminCreator.id : data.employeeId,
          customerId: t.customerId || null,
        }
      });
      createdTasks.push(created);
    }

    revalidatePath("/");
    revalidatePath("/tasks");
    revalidatePath("/payroll");

    return {
      success: true,
      tasksCreatedCount: createdTasks.length,
      message: `Successfully applied AI targets and delegated ${createdTasks.length} high-impact tasks.`
    };
  } catch (error: any) {
    console.error("Error in applyAISprintPlan:", error);
    return { success: false, error: error.message || "Failed to apply AI sprint plan" };
  }
}
