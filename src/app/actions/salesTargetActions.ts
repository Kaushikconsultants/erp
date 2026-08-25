"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";

export interface RepSalesTargetPerformance {
  employeeId: string;
  name: string;
  email?: string;
  designation?: string;
  monthlyTarget: number;
  achievedSales: number;
  percentAchieved: number;
  dealsWonCount: number;
  activeLeadsCount: number;
  totalCallsCount: number;
  estimatedCommission: number;
  status: 'AHEAD' | 'ON_TRACK' | 'BEHIND';
}

export async function getSalesTargetLeaderboard() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const organizationId = await getTenantOrgId();

    // Start & End of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 1. Fetch active sales reps with assigned customers, orders and calls
    const employees = await prisma.employee.findMany({
      where: {
        organizationId,
        employmentStatus: 'Active'
      },
      include: {
        user: { select: { name: true, email: true } },
        customers: {
          select: {
            id: true,
            leadStage: true,
            status: true,
            orders: {
              where: {
                createdAt: { gte: startOfMonth, lte: endOfMonth },
                paymentStatus: { not: 'CANCELLED' }
              },
              select: { totalValue: true }
            }
          }
        },
        calls: {
          where: {
            createdAt: { gte: startOfMonth, lte: endOfMonth }
          },
          select: { id: true }
        }
      }
    });

    // 2. Compute performance per rep
    const leaderboard: RepSalesTargetPerformance[] = (employees as any[]).map(emp => {
      // Monthly target: from employee target field or default ₹3,00,000
      const monthlyTarget = emp.target && emp.target > 0 ? emp.target : 300000;

      let achievedSales = 0;
      let wonDeals = 0;
      let activeLeads = 0;

      (emp.customers || []).forEach((cust: any) => {
        if (cust.leadStage === 'Won') wonDeals++;
        else if (cust.leadStage !== 'Lost') activeLeads++;

        (cust.orders || []).forEach((o: any) => {
          achievedSales += (o.totalValue || 0);
        });
      });

      // If no orders found, calculate from won customers as fallback
      if (achievedSales === 0 && wonDeals > 0) {
        achievedSales = wonDeals * 25000;
      }

      const percentAchieved = monthlyTarget > 0 ? Math.min(200, Math.round((achievedSales / monthlyTarget) * 100)) : 0;
      
      // Commission: 2.5% of achieved sales
      const estimatedCommission = Math.round(achievedSales * 0.025);

      const status: 'AHEAD' | 'ON_TRACK' | 'BEHIND' = 
        percentAchieved >= 100 ? 'AHEAD' : percentAchieved >= 60 ? 'ON_TRACK' : 'BEHIND';

      return {
        employeeId: emp.id,
        name: emp.user?.name || emp.employeeId,
        email: emp.user?.email,
        designation: emp.designation || 'Sales Executive',
        monthlyTarget,
        achievedSales,
        percentAchieved,
        dealsWonCount: wonDeals,
        activeLeadsCount: activeLeads,
        totalCallsCount: (emp.calls || []).length,
        estimatedCommission,
        status
      };
    });

    // Sort by achieved sales descending
    leaderboard.sort((a, b) => b.achievedSales - a.achievedSales);

    const totalTarget = leaderboard.reduce((sum, r) => sum + r.monthlyTarget, 0);
    const totalAchieved = leaderboard.reduce((sum, r) => sum + r.achievedSales, 0);
    const teamPercent = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;

    return {
      success: true,
      monthName: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
      totalTarget,
      totalAchieved,
      teamPercent,
      leaderboard
    };
  } catch (error: any) {
    console.error("Error loading sales target leaderboard:", error);
    return { success: false, error: error.message || "Failed to load sales targets" };
  }
}
