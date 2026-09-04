"use server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getKPIDetails(type: 'customers' | 'orders' | 'calls', timeRange: 'today' | 'week' | 'month' | 'all') {
  try {
    const session = await getServerSession(authOptions);
    const orgId = (session?.user as any)?.organizationId;

    const now = new Date();
    let startDate = new Date(0); // Epoch for 'all'

    if (timeRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeRange === 'week') {
      const day = now.getDay() || 7; 
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - (day - 1));
      startOfWeek.setHours(0, 0, 0, 0);
      startDate = startOfWeek;
    } else if (timeRange === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    if (type === 'customers') {
      const data = await prisma.customer.findMany({
        where: {
          ...(orgId ? { organizationId: orgId } : {}),
          ...(timeRange !== 'all' ? { createdAt: { gte: startDate } } : {})
        },
        orderBy: { createdAt: 'desc' },
        include: { assignedSalesperson: { include: { user: true } } }
      });
      return { success: true, data };
    }

    if (type === 'orders') {
      const [allOrders, allConfirmedQuotes] = await Promise.all([
        prisma.order.findMany({
          where: {
            ...(orgId ? { organizationId: orgId } : {}),
            ...(timeRange !== 'all' ? { orderDate: { gte: startDate } } : {})
          },
          orderBy: { orderDate: 'desc' },
          include: { 
            salesperson: { include: { user: true } }, 
            customer: { include: { assignedSalesperson: { include: { user: true } } } } 
          }
        }),
        prisma.quotation.findMany({
          where: {
            ...(orgId ? { organizationId: orgId } : {}),
            status: { in: ['Confirmed', 'Converted'] },
            ...(timeRange !== 'all' ? { 
              OR: [
                { date: { gte: startDate } },
                { createdAt: { gte: startDate } }
              ]
            } : {})
          },
          orderBy: { date: 'desc' },
          include: { 
            salesperson: { include: { user: true } },
            customer: { include: { assignedSalesperson: { include: { user: true } } } }
          }
        })
      ]);

      // Deduplicate: collect quotation numbers already represented as orders
      const convertedQuoteNumbers = new Set<string>();
      allOrders.forEach((o: any) => {
        const match = (o.notes || '').match(/Quotation #([A-Za-z0-9-]+)/);
        if (match && match[1]) {
          convertedQuoteNumbers.add(match[1].trim());
        }
      });

      // Filter standalone confirmed quotations
      const standaloneQuotes = allConfirmedQuotes
        .filter((q: any) => q.status === 'Confirmed' && !convertedQuoteNumbers.has((q.quotationNumber || '').trim()))
        .map((q: any) => ({
          id: q.id,
          orderNumber: q.quotationNumber,
          customer: q.customer,
          salesperson: q.salesperson || q.customer?.assignedSalesperson,
          totalValue: Number(q.totalValue ?? q.subtotal ?? 0),
          orderDate: q.date || q.createdAt,
          isQuotation: true
        }));

      const formattedOrders = allOrders.map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customer: o.customer,
        salesperson: o.salesperson || o.customer?.assignedSalesperson,
        totalValue: Number(o.totalValue ?? o.subtotal ?? 0),
        orderDate: o.orderDate,
        isQuotation: false
      }));

      // Combine and sort by date descending
      const combined = [...formattedOrders, ...standaloneQuotes].sort((a, b) => {
        const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
        const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
        return dateB - dateA;
      });

      return { success: true, data: combined };
    }

    if (type === 'calls') {
      const data = await prisma.call.findMany({
        where: {
          followUpDate: { not: null },
          ...(orgId ? {
            OR: [
              { customer: { organizationId: orgId } },
              { lead: { organizationId: orgId } }
            ]
          } : {}),
          ...(timeRange !== 'all' ? { followUpDate: { gte: startDate } } : {})
        },
        orderBy: { followUpDate: 'desc' },
        include: {
          customer: true,
          lead: true,
          employee: { include: { user: true } }
        }
      });
      return { success: true, data };
    }

    return { error: "Invalid type" };
  } catch (error) {
    console.error("Failed to fetch KPI details:", error);
    return { error: "Failed to load data" };
  }
}
