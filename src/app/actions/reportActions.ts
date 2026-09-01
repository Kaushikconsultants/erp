"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";

export async function getEmployeeScorecard(employeeId: string) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        calls: true,
        followUps: true,
        orders: true,
        customers: true,
      }
    });

    if (!employee) return { error: "Employee not found" };

    const callsMade = employee.calls.length;
    const connectedCalls = employee.calls.filter(c => c.status === "Completed").length;
    const ordersGenerated = employee.orders.length;
    const totalSales = employee.orders.reduce((sum, o) => sum + o.totalValue, 0);
    const target = employee.target || 2000000;
    const achievement = totalSales > 0 ? (totalSales / target) * 100 : 0;

    const followUpsCompleted = employee.followUps.filter(f => f.status === "Completed").length;
    
    const performanceScore = Math.min(
      (achievement * 0.5) + ((connectedCalls / Math.max(callsMade, 1)) * 30) + ((followUpsCompleted / 20) * 20),
      100
    );

    return {
      success: true,
      scorecard: {
        target,
        achieved: totalSales,
        achievementPercent: achievement,
        callsMade,
        connectedCalls,
        followUpsCompleted,
        ordersGenerated,
        totalSales,
        performanceScore: Math.round(performanceScore)
      }
    };
  } catch (error) {
    return { error: "Failed to generate scorecard" };
  }
}

export async function getSalesIntelligence() {
  try {
    const organizationId = await getTenantOrgId();
    const orders = await prisma.order.findMany({
      where: { organizationId },
      include: {
        items: { include: { product: true } }
      }
    });

    const productSales: Record<string, { qty: number, value: number }> = {};
    
    orders.forEach(o => {
      o.items.forEach(i => {
        if (!productSales[i.product.name]) {
          productSales[i.product.name] = { qty: 0, value: 0 };
        }
        productSales[i.product.name].qty += i.quantity;
        productSales[i.product.name].value += i.total;
      });
    });

    return { success: true, productSales };
  } catch (error) {
    return { error: "Failed to generate sales intelligence" };
  }
}

export async function getSalesReport(startDate?: string, endDate?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const where: any = { organizationId, orderStatus: { not: 'Cancelled' } };
    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) where.orderDate.gte = new Date(startDate);
      if (endDate) where.orderDate.lte = new Date(endDate);
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: { select: { businessName: true, mobile: true, state: true } },
        salesperson: { include: { user: { select: { name: true } } } },
        items: { include: { product: { select: { name: true, sku: true } } } }
      },
      orderBy: { orderDate: 'desc' }
    });

    return { success: true, orders };
  } catch (error: any) {
    return { error: "Failed to fetch sales report: " + error.message };
  }
}

export async function getInventoryReport() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const products = await prisma.product.findMany({
      where: { organizationId },
      orderBy: { stockQuantity: 'asc' }
    });

    const totalStockQty = products.reduce((s, p) => s + p.stockQuantity, 0);
    const totalInventoryValue = products.reduce((s, p) => s + (p.stockQuantity * p.sellingPrice), 0);
    const lowStockProducts = products.filter(p => p.stockQuantity <= (p.minimumStock || 10));

    return { success: true, products, totalStockQty, totalInventoryValue, lowStockCount: lowStockProducts.length };
  } catch (error: any) {
    return { error: "Failed to fetch inventory report" };
  }
}

export async function getFinancialsReport() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: { organizationId },
        include: { customer: { select: { businessName: true } } },
        orderBy: { invoiceDate: 'desc' }
      }),
      prisma.payment.findMany({
        where: {
          OR: [
            { customer: { organizationId } },
            { invoice: { organizationId } }
          ],
          status: { in: ['Completed', 'Success', 'Received', 'Processed'] }
        },
        include: { 
          invoice: { include: { customer: { select: { businessName: true } } } },
          customer: { select: { businessName: true } }
        },
        orderBy: { paymentDate: 'desc' }
      })
    ]);

    const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
    const totalOutstanding = invoices.reduce((s, i) => s + i.amountDue, 0);

    return { success: true, invoices, payments, totalInvoiced, totalCollected, totalOutstanding };
  } catch (error: any) {
    return { error: "Failed to fetch financials report" };
  }
}
