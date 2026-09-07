"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface SprintData {
  employeeId: string;
  monthlyTarget: number;
  weekNumber: number; // 1, 2, 3, 4
  weekName: string; // e.g. "Sprint 4 (Closing & Peak)"
  weekStartStr: string;
  weekEndStr: string;
  daysRemainingInSprint: number;
  currentSprintTarget: number;
  currentSprintRevenue: number;
  sprintProgressPercent: number;
  sprintGap: number;
  dailyRunRateNeeded: number;
  
  // Month totals
  mtdRevenue: number;
  mtdProgressPercent: number;
  mtdGap: number;
  
  // Daily Activity (Today)
  todayCalls: number;
  todayCallsTarget: number;
  todayFollowUps: number;
  todayFollowUpsTarget: number;
  todayQuotesSent: number;
  todayQuotesSentTarget: number;
  todayQuotesConfirmed: number;
  todayQuotesConfirmedTarget: number;
  todayVisits: number;
  
  // Sprint Health
  sprintHealthScore: number; // 0-100
  healthStatus: "EXCELLENT" | "ON_TRACK" | "AT_RISK";
  healthMessage: string;
  
  // Streak
  streakDays: number;
  
  // 4 Weeks Sprint Breakdown
  sprints: Array<{
    week: number;
    title: string;
    weightPercent: number;
    target: number;
    actual: number;
    status: "COMPLETED" | "CURRENT" | "UPCOMING";
    isPassed: boolean;
  }>;
}

export async function getSprintData(employeeId: string): Promise<SprintData | null> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true }
    });

    if (!employee) return null;

    const monthlyTarget = employee.target || 500000;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const dayOfMonth = now.getDate();
    
    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const totalDaysInMonth = endOfMonth.getDate();

    // 4 Sprints in the month:
    // Sprint 1 (20%): Days 1 - 7
    // Sprint 2 (25%): Days 8 - 14
    // Sprint 3 (30%): Days 15 - 21
    // Sprint 4 (25%): Days 22 - End of Month
    let currentWeek = 1;
    if (dayOfMonth >= 22) currentWeek = 4;
    else if (dayOfMonth >= 15) currentWeek = 3;
    else if (dayOfMonth >= 8) currentWeek = 2;
    else currentWeek = 1;

    let sprintRanges = [
      { week: 1, startDay: 1, endDay: 7, weight: 0.20, title: "Sprint 1: Pipeline & Prospecting" },
      { week: 2, startDay: 8, endDay: 14, weight: 0.25, title: "Sprint 2: Warm Conversions" },
      { week: 3, startDay: 15, endDay: 21, weight: 0.30, title: "Sprint 3: Peak Volume" },
      { week: 4, startDay: 22, endDay: totalDaysInMonth, weight: 0.25, title: "Sprint 4: Deal Closing & Buffer" }
    ];

    if (employee.sprintWeightsJson) {
      try {
        const customWeights: number[] = JSON.parse(employee.sprintWeightsJson);
        if (Array.isArray(customWeights) && customWeights.length === 4) {
          sprintRanges = [
            { week: 1, startDay: 1, endDay: 7, weight: customWeights[0], title: "Sprint 1: Pipeline & Prospecting" },
            { week: 2, startDay: 8, endDay: 14, weight: customWeights[1], title: "Sprint 2: Warm Conversions" },
            { week: 3, startDay: 15, endDay: 21, weight: customWeights[2], title: "Sprint 3: Peak Volume" },
            { week: 4, startDay: 22, endDay: totalDaysInMonth, weight: customWeights[3], title: "Sprint 4: Deal Closing & Buffer" }
          ];
        }
      } catch (e) {
        console.error("Invalid sprintWeightsJson:", e);
      }
    }

    const currentSprintDef = sprintRanges[currentWeek - 1];
    const currentSprintStart = new Date(year, month, currentSprintDef.startDay, 0, 0, 0, 0);
    const currentSprintEnd = new Date(year, month, currentSprintDef.endDay, 23, 59, 59, 999);

    const todayStart = new Date(year, month, dayOfMonth, 0, 0, 0, 0);
    const todayEnd = new Date(year, month, dayOfMonth, 23, 59, 59, 999);

    // Days remaining in this sprint window (including today)
    const daysRemainingInSprint = Math.max(1, currentSprintDef.endDay - dayOfMonth + 1);

    // 1. Fetch Month Orders & Confirmed Quotations
    const [monthOrders, monthQuotations, todayCallsCount, todayDailyLog, todayQuotations, todayFollowUpsCalls] = await Promise.all([
      prisma.order.findMany({
        where: {
          OR: [
            { salespersonId: employee.id },
            { customer: { assignedSalespersonId: employee.id } }
          ],
          orderDate: { gte: startOfMonth, lte: endOfMonth }
        },
        select: { orderDate: true, totalValue: true, subtotal: true, notes: true }
      }),
      prisma.quotation.findMany({
        where: {
          OR: [
            { salespersonId: employee.id },
            { customer: { assignedSalespersonId: employee.id } }
          ],
          date: { gte: startOfMonth, lte: endOfMonth },
          status: { in: ["Confirmed", "Converted"] }
        },
        select: { date: true, totalValue: true, subtotal: true, status: true, quotationNumber: true, createdAt: true }
      }),
      prisma.call.count({
        where: {
          employeeId: employee.id,
          createdAt: { gte: todayStart, lte: todayEnd }
        }
      }),
      prisma.dailySalesLog.findUnique({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: todayStart
          }
        }
      }),
      prisma.quotation.findMany({
        where: {
          OR: [
            { salespersonId: employee.id },
            { customer: { assignedSalespersonId: employee.id } }
          ],
          createdAt: { gte: todayStart, lte: todayEnd }
        },
        select: { id: true, status: true, quotationNumber: true }
      }),
      prisma.call.count({
        where: {
          employeeId: employee.id,
          followUpDate: { gte: todayStart, lte: todayEnd },
          OR: [
            { customer: { organizationId: employee.organizationId } },
            { lead: { organizationId: employee.organizationId } }
          ]
        }
      })
    ]);

    // Collect quotation numbers that already exist in orders to prevent duplicate counting
    const convertedQuoteNumbers = new Set<string>();
    monthOrders.forEach(o => {
      const match = (o.notes || '').match(/Quotation\s*#?\s*([A-Za-z0-9-]+)/i);
      if (match && match[1]) {
        convertedQuoteNumbers.add(match[1].trim());
      }
    });

    // Calculate revenue per sprint and MTD using totalValue as true order value
    const sprintActuals = [0, 0, 0, 0];

    monthOrders.forEach(o => {
      if (!o.orderDate) return;
      const d = new Date(o.orderDate).getDate();
      const val = Number(o.totalValue ?? o.subtotal ?? 0);
      if (d <= 7) sprintActuals[0] += val;
      else if (d <= 14) sprintActuals[1] += val;
      else if (d <= 21) sprintActuals[2] += val;
      else sprintActuals[3] += val;
    });

    monthQuotations.forEach(q => {
      const qNum = (q.quotationNumber || '').trim();
      // If already converted/represented as an order in monthOrders, skip to avoid double counting
      if (q.status !== "Confirmed" || (qNum && convertedQuoteNumbers.has(qNum)) || (qNum && monthOrders.some(o => (o.notes || '').includes(qNum)))) {
        return;
      }
      const qDate = q.date ? new Date(q.date) : new Date(q.createdAt);
      const d = qDate.getDate();
      const val = Number(q.totalValue ?? q.subtotal ?? 0);
      if (d <= 7) sprintActuals[0] += val;
      else if (d <= 14) sprintActuals[1] += val;
      else if (d <= 21) sprintActuals[2] += val;
      else sprintActuals[3] += val;
    });

    const mtdRevenue = sprintActuals.reduce((sum, v) => sum + v, 0);
    const currentSprintRevenue = sprintActuals[currentWeek - 1];
    const currentSprintTarget = Math.round(monthlyTarget * currentSprintDef.weight);
    const sprintProgressPercent = currentSprintTarget > 0 ? Math.min(200, Math.round((currentSprintRevenue / currentSprintTarget) * 100)) : 0;
    const sprintGap = Math.max(0, currentSprintTarget - currentSprintRevenue);
    const dailyRunRateNeeded = Math.round(sprintGap / daysRemainingInSprint);

    const mtdProgressPercent = monthlyTarget > 0 ? Math.min(200, Math.round((mtdRevenue / monthlyTarget) * 100)) : 0;
    const mtdGap = Math.max(0, monthlyTarget - mtdRevenue);

    // Today's Activity (Using dynamic employee targets)
    const manualCalls = todayDailyLog?.callsMade || 0;
    const todayCalls = todayCallsCount + manualCalls;
    const todayCallsTarget = employee.dailyCallsTarget ?? 15;

    const todayFollowUps = todayFollowUpsCalls;
    const todayFollowUpsTarget = employee.dailyFollowUpsTarget ?? 5;

    const todayQuotesSent = todayQuotations.length;
    const todayQuotesSentTarget = employee.dailyQuotesTarget ?? 2;

    const todayOrdersCount = monthOrders.filter(o => {
      if (!o.orderDate) return false;
      const d = new Date(o.orderDate);
      return d >= todayStart && d <= todayEnd;
    }).length;

    const todayStandaloneConfirmedQuotes = todayQuotations.filter(q => {
      if (q.status !== 'Confirmed') return false;
      const qNum = (q as any).quotationNumber || '';
      return !convertedQuoteNumbers.has(qNum.trim());
    }).length;

    const todayQuotesConfirmed = todayOrdersCount + todayStandaloneConfirmedQuotes;
    const todayQuotesConfirmedTarget = employee.dailyDealsTarget ?? 1;
    const todayVisits = todayDailyLog?.visitsDone || 0;

    // Sprint Health Score (0 - 100)
    // Lead indicators: Calls (25%), Follow-ups (15%), Quotes (20%)
    // Lag indicator: Revenue Progress (40%)
    const callsScore = Math.min(100, (todayCalls / todayCallsTarget) * 100);
    const followUpsScore = Math.min(100, (todayFollowUps / todayFollowUpsTarget) * 100);
    const quotesScore = Math.min(100, (todayQuotesSent / todayQuotesSentTarget) * 100);
    const revenueScore = Math.min(100, sprintProgressPercent);

    const sprintHealthScore = Math.round(
      (callsScore * 0.25) +
      (followUpsScore * 0.15) +
      (quotesScore * 0.20) +
      (revenueScore * 0.40)
    );

    let healthStatus: "EXCELLENT" | "ON_TRACK" | "AT_RISK" = "ON_TRACK";
    let healthMessage = "On Track — Keep up the daily activity pace!";

    if (sprintHealthScore >= 80 || sprintProgressPercent >= 90) {
      healthStatus = "EXCELLENT";
      healthMessage = "Superb Momentum! Sprint target well in reach 🚀";
    } else if (sprintHealthScore < 50 || (sprintProgressPercent < 40 && daysRemainingInSprint <= 2)) {
      healthStatus = "AT_RISK";
      const dayWord = daysRemainingInSprint === 1 ? "day" : "days";
      healthMessage = `Behind Pace — Need ₹${dailyRunRateNeeded.toLocaleString('en-IN')}/day over next ${daysRemainingInSprint} ${dayWord} to hit Sprint ${currentWeek}`;
    }

    // Calculate Streak from last 7 days of daily logs or activity
    const past7DaysStart = new Date(year, month, dayOfMonth - 7, 0, 0, 0, 0);
    const pastLogs = await prisma.dailySalesLog.findMany({
      where: {
        employeeId: employee.id,
        date: { gte: past7DaysStart, lte: todayStart }
      },
      orderBy: { date: "desc" }
    });

    let streakDays = 0;
    // Count active days with calls >= 8 or score >= 60%
    if (todayCalls >= 5) streakDays = 1;
    for (const log of pastLogs) {
      if (log.callsMade >= 8) streakDays++;
      else break;
    }

    const sprints = sprintRanges.map(s => {
      const target = Math.round(monthlyTarget * s.weight);
      const actual = sprintActuals[s.week - 1];
      let status: "COMPLETED" | "CURRENT" | "UPCOMING" = "UPCOMING";
      if (s.week < currentWeek) status = "COMPLETED";
      else if (s.week === currentWeek) status = "CURRENT";

      return {
        week: s.week,
        title: s.title,
        weightPercent: Math.round(s.weight * 100),
        target,
        actual,
        status,
        isPassed: actual >= target
      };
    });

    return {
      employeeId: employee.id,
      monthlyTarget,
      weekNumber: currentWeek,
      weekName: currentSprintDef.title,
      weekStartStr: `${currentSprintDef.startDay} ${now.toLocaleString('default', { month: 'short' })}`,
      weekEndStr: `${currentSprintDef.endDay} ${now.toLocaleString('default', { month: 'short' })}`,
      daysRemainingInSprint,
      currentSprintTarget,
      currentSprintRevenue,
      sprintProgressPercent,
      sprintGap,
      dailyRunRateNeeded,
      mtdRevenue,
      mtdProgressPercent,
      mtdGap,
      todayCalls,
      todayCallsTarget,
      todayFollowUps,
      todayFollowUpsTarget,
      todayQuotesSent,
      todayQuotesSentTarget,
      todayQuotesConfirmed,
      todayQuotesConfirmedTarget,
      todayVisits,
      sprintHealthScore,
      healthStatus,
      healthMessage,
      streakDays,
      sprints
    };
  } catch (error) {
    console.error("Error in getSprintData:", error);
    return null;
  }
}

export async function logDailySalesActivity(data: {
  employeeId: string;
  callsDelta?: number;
  visitsDelta?: number;
  notes?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const existing = await prisma.dailySalesLog.findUnique({
      where: {
        employeeId_date: {
          employeeId: data.employeeId,
          date: todayStart
        }
      }
    });

    const currentCalls = existing?.callsMade || 0;
    const currentVisits = existing?.visitsDone || 0;

    const newCalls = Math.max(0, currentCalls + (data.callsDelta || 0));
    const newVisits = Math.max(0, currentVisits + (data.visitsDelta || 0));

    const updated = await prisma.dailySalesLog.upsert({
      where: {
        employeeId_date: {
          employeeId: data.employeeId,
          date: todayStart
        }
      },
      create: {
        employeeId: data.employeeId,
        date: todayStart,
        callsMade: newCalls,
        visitsDone: newVisits,
        notes: data.notes || null
      },
      update: {
        callsMade: newCalls,
        visitsDone: newVisits,
        notes: data.notes !== undefined ? data.notes : existing?.notes
      }
    });

    revalidatePath("/");
    return { success: true, log: updated };
  } catch (error: any) {
    console.error("Error in logDailySalesActivity:", error);
    return { success: false, error: error.message || "Failed to log activity" };
  }
}

export async function getAdminSprintTeamHealth(organizationId: string | null) {
  try {
    const employees = await prisma.employee.findMany({
      where: organizationId ? { organizationId } : undefined,
      include: {
        user: true,
        orders: true
      }
    });

    const results = await Promise.all(
      employees.map(async emp => {
        const sprint = await getSprintData(emp.id);
        return {
          employeeId: emp.id,
          name: emp.user?.name || "Team Member",
          email: emp.user?.email,
          monthlyTarget: emp.target || 500000,
          dailyCallsTarget: emp.dailyCallsTarget ?? 15,
          dailyFollowUpsTarget: emp.dailyFollowUpsTarget ?? 5,
          dailyQuotesTarget: emp.dailyQuotesTarget ?? 2,
          dailyDealsTarget: emp.dailyDealsTarget ?? 1,
          sprintWeightsJson: emp.sprintWeightsJson,
          sprintHealthScore: sprint?.sprintHealthScore || 0,
          healthStatus: sprint?.healthStatus || "ON_TRACK",
          healthMessage: sprint?.healthMessage || "No activity yet",
          currentSprintRevenue: sprint?.currentSprintRevenue || 0,
          currentSprintTarget: sprint?.currentSprintTarget || 0,
          sprintProgressPercent: sprint?.sprintProgressPercent || 0,
          todayCalls: sprint?.todayCalls || 0,
          todayQuotesSent: sprint?.todayQuotesSent || 0,
          todayFollowUps: sprint?.todayFollowUps || 0,
          todayQuotesConfirmed: sprint?.todayQuotesConfirmed || 0,
          streakDays: sprint?.streakDays || 0,
          weekNumber: sprint?.weekNumber || 1,
          weekName: sprint?.weekName || "Sprint 1: Pipeline & Prospecting",
          weekStartStr: sprint?.weekStartStr || "",
          weekEndStr: sprint?.weekEndStr || "",
          daysRemainingInSprint: sprint?.daysRemainingInSprint || 1,
          dailyRunRateNeeded: sprint?.dailyRunRateNeeded || 0,
          sprintGap: sprint?.sprintGap || 0,
          mtdRevenue: sprint?.mtdRevenue || 0,
          mtdProgressPercent: sprint?.mtdProgressPercent || 0,
          mtdGap: sprint?.mtdGap || 0,
          sprints: sprint?.sprints || []
        };
      })
    );

    return results.sort((a, b) => b.sprintHealthScore - a.sprintHealthScore);
  } catch (error) {
    console.error("Error in getAdminSprintTeamHealth:", error);
    return [];
  }
}

export async function updateSalespersonTargets(data: {
  employeeId: string;
  monthlyTarget: number;
  dailyCallsTarget?: number;
  dailyFollowUpsTarget?: number;
  dailyQuotesTarget?: number;
  dailyDealsTarget?: number;
  sprintWeights?: number[]; // Array of 4 decimals summing to 1.0 (e.g. [0.2, 0.25, 0.3, 0.25])
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const role = (session.user as any).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return { success: false, error: "Only administrators can modify targets" };
    }

    const updateData: any = {
      target: data.monthlyTarget,
      dailyCallsTarget: data.dailyCallsTarget !== undefined ? data.dailyCallsTarget : undefined,
      dailyFollowUpsTarget: data.dailyFollowUpsTarget !== undefined ? data.dailyFollowUpsTarget : undefined,
      dailyQuotesTarget: data.dailyQuotesTarget !== undefined ? data.dailyQuotesTarget : undefined,
      dailyDealsTarget: data.dailyDealsTarget !== undefined ? data.dailyDealsTarget : undefined,
    };

    if (data.sprintWeights && data.sprintWeights.length === 4) {
      updateData.sprintWeightsJson = JSON.stringify(data.sprintWeights);
    }

    const updated = await prisma.employee.update({
      where: { id: data.employeeId },
      data: updateData,
      include: { user: true }
    });

    revalidatePath("/");
    revalidatePath("/tasks");
    revalidatePath("/payroll");

    return { 
      success: true, 
      employee: {
        id: updated.id,
        name: updated.user.name,
        target: updated.target,
        dailyCallsTarget: updated.dailyCallsTarget,
        dailyFollowUpsTarget: updated.dailyFollowUpsTarget,
        dailyQuotesTarget: updated.dailyQuotesTarget,
        dailyDealsTarget: updated.dailyDealsTarget,
        sprintWeightsJson: updated.sprintWeightsJson
      } 
    };
  } catch (error: any) {
    console.error("Error in updateSalespersonTargets:", error);
    return { success: false, error: error.message || "Failed to update targets" };
  }
}

export async function getSalespersonTargetDetails(employeeId: string) {
  try {
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true }
    });

    if (!emp) return { success: false, error: "Employee not found" };

    const sprint = await getSprintData(employeeId);

    return {
      success: true,
      data: {
        employeeId: emp.id,
        name: emp.user.name,
        email: emp.user.email,
        monthlyTarget: emp.target || 500000,
        dailyCallsTarget: emp.dailyCallsTarget ?? 15,
        dailyFollowUpsTarget: emp.dailyFollowUpsTarget ?? 5,
        dailyQuotesTarget: emp.dailyQuotesTarget ?? 2,
        dailyDealsTarget: emp.dailyDealsTarget ?? 1,
        sprintWeightsJson: emp.sprintWeightsJson,
        sprint
      }
    };
  } catch (error: any) {
    console.error("Error in getSalespersonTargetDetails:", error);
    return { success: false, error: error.message || "Failed to load target details" };
  }
}

