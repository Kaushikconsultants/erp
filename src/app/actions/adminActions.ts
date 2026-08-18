"use server";
import { prisma } from "@/lib/prisma";

export async function getKPIDetails(type: 'customers' | 'orders' | 'calls', timeRange: 'today' | 'week' | 'month' | 'all') {
  try {
    const now = new Date();
    let startDate = new Date(0); // Epoch for 'all'

    if (timeRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeRange === 'week') {
      const day = now.getDay() || 7; 
      if (day !== 1) now.setHours(-24 * (day - 1)); 
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeRange === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    if (type === 'customers') {
      const data = await prisma.customer.findMany({
        where: timeRange !== 'all' ? { createdAt: { gte: startDate } } : {},
        orderBy: { createdAt: 'desc' },
        include: { assignedSalesperson: { include: { user: true } } }
      });
      return { success: true, data };
    }

    if (type === 'orders') {
      const data = await prisma.order.findMany({
        where: timeRange !== 'all' ? { orderDate: { gte: startDate } } : {},
        orderBy: { orderDate: 'desc' },
        include: { salesperson: { include: { user: true } }, customer: true }
      });
      return { success: true, data };
    }

    if (type === 'calls') {
      const data = await prisma.call.findMany({
        where: {
          ...(timeRange !== 'all' ? { followUpDate: { gte: startDate } } : {}),
          followUpDate: { not: null },
          outcome: 'INTERESTED'
        },
        orderBy: { followUpDate: 'desc' },
        include: { customer: true, employee: { include: { user: true } } }
      });
      return { success: true, data };
    }

    return { error: "Invalid type" };
  } catch (error) {
    console.error("Failed to fetch KPI details:", error);
    return { error: "Failed to load data" };
  }
}
