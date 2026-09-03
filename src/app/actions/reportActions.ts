"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId, getTenantScope } from "@/lib/tenant";

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
    const { organizationId, isAdmin, employeeId } = await getTenantScope();

    const orderWhere: any = { ...(organizationId ? { organizationId } : {}), orderStatus: { not: 'Cancelled' } };
    if (!isAdmin) orderWhere.salespersonId = employeeId || 'unassigned';

    const quoteWhere: any = { ...(organizationId ? { organizationId } : {}), status: 'Confirmed' };
    if (!isAdmin) quoteWhere.salespersonId = employeeId || 'unassigned';

    const [orders, quotations] = await Promise.all([
      prisma.order.findMany({
        where: orderWhere,
        include: {
          items: { include: { product: true } }
        }
      }),
      prisma.quotation.findMany({
        where: quoteWhere,
        include: {
          items: { include: { product: true } }
        }
      })
    ]);

    const convertedQuoteNumbers = new Set<string>();
    orders.forEach((o: any) => {
      const match = (o.notes || '').match(/Quotation #([A-Za-z0-9-]+)/);
      if (match && match[1]) {
        convertedQuoteNumbers.add(match[1].trim());
      }
    });

    const productSales: Record<string, { qty: number, value: number }> = {};
    
    orders.forEach(o => {
      o.items.forEach(i => {
        const prodName = i.product?.name || 'Unknown Product';
        if (!productSales[prodName]) {
          productSales[prodName] = { qty: 0, value: 0 };
        }
        productSales[prodName].qty += i.quantity;
        productSales[prodName].value += i.total;
      });
    });

    quotations
      .filter((q: any) => !convertedQuoteNumbers.has((q.quotationNumber || '').trim()))
      .forEach(q => {
        q.items.forEach((i: any) => {
          const prodName = i.product?.name || 'Unknown Product';
          if (!productSales[prodName]) {
            productSales[prodName] = { qty: 0, value: 0 };
          }
          productSales[prodName].qty += i.quantity;
          productSales[prodName].value += (i.total || (i.rate * i.quantity));
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
    const { organizationId, isAdmin, employeeId } = await getTenantScope();
    
    const orderWhere: any = { 
      ...(organizationId ? { organizationId } : {}), 
      orderStatus: { not: 'Cancelled' } 
    };
    if (!isAdmin) {
      orderWhere.salespersonId = employeeId || 'unassigned';
    }

    if (startDate || endDate) {
      orderWhere.orderDate = {};
      if (startDate) orderWhere.orderDate.gte = new Date(startDate);
      if (endDate) orderWhere.orderDate.lte = new Date(endDate);
    }

    const quoteWhere: any = {
      ...(organizationId ? { organizationId } : {}),
      status: { in: ['Confirmed', 'Converted'] }
    };
    if (!isAdmin) {
      quoteWhere.salespersonId = employeeId || 'unassigned';
    }
    if (startDate || endDate) {
      quoteWhere.OR = [
        {
          date: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {})
          }
        },
        {
          createdAt: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {})
          }
        }
      ];
    }

    const [orders, quotations] = await Promise.all([
      prisma.order.findMany({
        where: orderWhere,
        include: {
          customer: { select: { businessName: true, mobile: true, state: true } },
          salesperson: { include: { user: { select: { name: true } } } },
          items: { include: { product: { select: { name: true, sku: true } } } }
        },
        orderBy: { orderDate: 'desc' }
      }),
      prisma.quotation.findMany({
        where: quoteWhere,
        include: {
          customer: { 
            select: { 
              businessName: true, 
              mobile: true, 
              state: true, 
              assignedSalesperson: { include: { user: { select: { name: true } } } } 
            } 
          },
          salesperson: { include: { user: { select: { name: true } } } },
          items: { include: { product: { select: { name: true, sku: true } } } }
        },
        orderBy: { date: 'desc' }
      })
    ]);

    // Deduplicate: collect quotation numbers already represented as orders
    const convertedQuoteNumbers = new Set<string>();
    orders.forEach((o: any) => {
      const match = (o.notes || '').match(/Quotation #([A-Za-z0-9-]+)/);
      if (match && match[1]) {
        convertedQuoteNumbers.add(match[1].trim());
      }
    });

    // Format standalone confirmed quotations into orders shape
    const standaloneQuotes = quotations
      .filter((q: any) => q.status === 'Confirmed' && !convertedQuoteNumbers.has((q.quotationNumber || '').trim()))
      .map((q: any) => ({
        id: q.id,
        orderNumber: q.quotationNumber,
        customer: q.customer,
        salesperson: q.salesperson || (q.customer?.assignedSalesperson ? { user: { name: q.customer.assignedSalesperson.user?.name } } : null),
        orderDate: q.date || q.createdAt,
        subtotal: Number(q.subtotal ?? q.totalValue ?? 0),
        tax: Number(q.taxTotal ?? ((q.cgst || 0) + (q.sgst || 0) + (q.igst || 0))),
        totalValue: Number(q.totalValue ?? q.subtotal ?? 0),
        paymentReceived: Number(q.receivedAmount || 0),
        outstandingAmount: Math.max(0, Number(q.totalValue || 0) - Number(q.receivedAmount || 0)),
        paymentStatus: Number(q.receivedAmount || 0) >= Number(q.totalValue || 0) && Number(q.totalValue || 0) > 0 ? 'Paid' : Number(q.receivedAmount || 0) > 0 ? 'Partially Paid' : 'Unpaid',
        orderStatus: 'Confirmed Deal',
        isQuotation: true,
        items: q.items || []
      }));

    const formattedOrders = orders.map((o: any) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customer: o.customer,
      salesperson: o.salesperson,
      orderDate: o.orderDate,
      subtotal: Number(o.subtotal ?? o.totalValue ?? 0),
      tax: Number(o.tax ?? ((o.cgst || 0) + (o.sgst || 0) + (o.igst || 0))),
      totalValue: Number(o.totalValue ?? o.subtotal ?? 0),
      paymentReceived: Number(o.paymentReceived || 0),
      outstandingAmount: Number(o.outstandingAmount || 0),
      paymentStatus: o.paymentStatus || 'Unpaid',
      orderStatus: o.orderStatus || 'Processing',
      isQuotation: false,
      items: o.items || []
    }));

    const combined = [...formattedOrders, ...standaloneQuotes].sort((a, b) => {
      const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
      const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
      return dateB - dateA;
    });

    return { success: true, orders: combined };
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
    const { organizationId, isAdmin, employeeId } = await getTenantScope();
    
    const invoiceWhere: any = { organizationId };
    if (!isAdmin) {
      invoiceWhere.customer = { assignedSalespersonId: employeeId || 'unassigned' };
    }

    const paymentWhere: any = {
      OR: [
        { customer: { organizationId } },
        { invoice: { organizationId } }
      ],
      status: { in: ['Completed', 'Success', 'Received', 'Processed'] }
    };
    
    if (!isAdmin) {
      paymentWhere.OR = [
        { customer: { organizationId, assignedSalespersonId: employeeId || 'unassigned' } },
        { invoice: { organizationId, customer: { assignedSalespersonId: employeeId || 'unassigned' } } }
      ];
    }

    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: invoiceWhere,
        include: { customer: { select: { businessName: true } } },
        orderBy: { invoiceDate: 'desc' }
      }),
      prisma.payment.findMany({
        where: paymentWhere,
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
