"use server";

import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";
import { getTenantOrgId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrCreateEmployee } from "@/lib/employeeHelper";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });

export interface CustomerReorderInsight {
  customerId: string;
  businessName: string;
  contactPerson: string;
  mobile: string;
  salespersonName: string;
  salespersonId?: string;
  totalOrders: number;
  totalPurchaseValue: number;
  lastOrderDate: string | null;
  daysSinceLastOrder: number;
  averageOrderCycleDays: number;
  daysOverdue: number;
  churnStatus: "HIGH_CHURN_RISK" | "DUE_FOR_REORDER" | "ACTIVE_HEALTHY";
  topProducts: Array<{
    productId: string;
    productName: string;
    category: string;
    totalQuantityBought: number;
    sellingPrice: number;
  }>;
  recommendedRestockText: string;
  whatsappPitch: string;
}

export interface ReorderDashboardData {
  totalAnalyzedCustomers: number;
  highRiskCount: number;
  dueForReorderCount: number;
  healthyCount: number;
  estimatedRecoverableRevenue: number;
  insights: CustomerReorderInsight[];
}

export async function getDormantAndReorderInsights(): Promise<{
  success: boolean;
  data?: ReorderDashboardData;
  error?: string;
}> {
  try {
    const organizationId = await getTenantOrgId();

    const [companySettings, customers, allOrders, allQuotations, topSellingProducts] = await Promise.all([
      prisma.companySettings.findFirst({ 
        where: organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {} 
      }),
      prisma.customer.findMany({
        where: organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {},
        include: {
          assignedSalesperson: {
            include: { user: true }
          },
          quotations: {
            include: { items: { include: { product: true } } },
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { totalPurchaseValue: "desc" }
      }),
      prisma.order.findMany({
        where: organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {},
        include: {
          items: {
            include: { product: true }
          }
        },
        orderBy: { orderDate: "desc" }
      }),
      prisma.quotation.findMany({
        where: organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {},
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.findMany({
        where: organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {},
        take: 5,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const companyName = companySettings?.companyName || "ESPON CLOTHING";
    const now = new Date();
    const insights: CustomerReorderInsight[] = [];

    let highRiskCount = 0;
    let dueForReorderCount = 0;
    let healthyCount = 0;
    let estimatedRecoverableRevenue = 0;

    for (const cust of customers) {
      const custOrders = allOrders.filter(o => o.customerId === cust.id);
      const custQuotes = allQuotations.filter(q => q.customerId === cust.id);

      // Calculate order dates & cycle
      const orderDates = custOrders
        .map(o => new Date(o.orderDate || o.createdAt))
        .sort((a, b) => b.getTime() - a.getTime());

      const lastOrderDate = orderDates.length > 0 ? orderDates[0] : null;
      let daysSinceLastOrder: number;
      let averageCycle = cust.averageOrderCycleDays || 30;

      if (lastOrderDate) {
        daysSinceLastOrder = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
        if (orderDates.length >= 2) {
          const totalSpanDays = Math.floor((orderDates[0].getTime() - orderDates[orderDates.length - 1].getTime()) / (1000 * 60 * 60 * 24));
          const intervals = orderDates.length - 1;
          if (intervals > 0 && totalSpanDays > 0) {
            averageCycle = Math.max(7, Math.round(totalSpanDays / intervals));
          }
        }
      } else {
        // No orders placed yet: calculate days since account creation
        const accountCreatedDate = new Date(cust.createdAt || cust.updatedAt);
        daysSinceLastOrder = Math.floor((now.getTime() - accountCreatedDate.getTime()) / (1000 * 60 * 60 * 24));
        averageCycle = 30;
      }

      const daysOverdue = Math.max(0, daysSinceLastOrder - averageCycle);

      // Determine Churn / Re-order Status
      let churnStatus: "HIGH_CHURN_RISK" | "DUE_FOR_REORDER" | "ACTIVE_HEALTHY" = "ACTIVE_HEALTHY";
      const custStatusLower = (cust.status || '').toLowerCase();
      const isMarkedInactive = custStatusLower.includes('inactive') || custStatusLower.includes('lost') || custStatusLower.includes('churn') || custStatusLower.includes('dormant');

      if (isMarkedInactive || daysSinceLastOrder > Math.max(45, averageCycle * 1.8) || (lastOrderDate === null && daysSinceLastOrder > 14)) {
        churnStatus = "HIGH_CHURN_RISK";
        highRiskCount++;
        const estimatedVal = (cust.totalPurchaseValue > 0) 
          ? (cust.totalPurchaseValue / Math.max(1, cust.totalOrders))
          : (custQuotes.length > 0 ? (custQuotes[0].totalValue || 5000) : 5000);
        estimatedRecoverableRevenue += estimatedVal;
      } else if (daysSinceLastOrder >= averageCycle || (lastOrderDate === null && daysSinceLastOrder > 7)) {
        churnStatus = "DUE_FOR_REORDER";
        dueForReorderCount++;
        const estimatedVal = (cust.totalPurchaseValue > 0) 
          ? (cust.totalPurchaseValue / Math.max(1, cust.totalOrders))
          : (custQuotes.length > 0 ? (custQuotes[0].totalValue || 5000) : 5000);
        estimatedRecoverableRevenue += estimatedVal;
      } else {
        churnStatus = "ACTIVE_HEALTHY";
        healthyCount++;
      }

      // Identify Top historically ordered products or quotation items
      const productMap: Record<string, { productId: string; productName: string; category: string; quantity: number; sellingPrice: number }> = {};
      custOrders.forEach(o => {
        o.items.forEach(item => {
          if (!item.product) return;
          if (!productMap[item.productId]) {
            productMap[item.productId] = {
              productId: item.productId,
              productName: item.product.name,
              category: item.product.category,
              quantity: 0,
              sellingPrice: item.product.sellingPrice || item.rate
            };
          }
          productMap[item.productId].quantity += (item.quantity || 0);
        });
      });

      if (Object.keys(productMap).length === 0 && custQuotes.length > 0) {
        custQuotes.forEach(q => {
          q.items.forEach(item => {
            if (!item.product) return;
            if (!productMap[item.productId]) {
              productMap[item.productId] = {
                productId: item.productId,
                productName: item.product.name,
                category: item.product.category,
                quantity: 0,
                sellingPrice: item.product.sellingPrice || item.rate
              };
            }
            productMap[item.productId].quantity += (item.quantity || 1);
          });
        });
      }

      let topProducts = Object.values(productMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 3)
        .map(p => ({
          productId: p.productId,
          productName: p.productName,
          category: p.category,
          totalQuantityBought: p.quantity,
          sellingPrice: p.sellingPrice
        }));

      if (topProducts.length === 0 && topSellingProducts.length > 0) {
        topProducts = topSellingProducts.slice(0, 2).map(p => ({
          productId: p.id,
          productName: p.name,
          category: p.category,
          totalQuantityBought: 0,
          sellingPrice: p.sellingPrice
        }));
      }

      const topProductName = topProducts[0]?.productName || "Apparel collection";
      const salespersonName = cust.assignedSalesperson?.user?.name || "Sales Team";

      const whatsappPitch = lastOrderDate
        ? `Namaste ${cust.contactPerson || cust.businessName}! 🙏 We noticed it's been ${daysSinceLastOrder} days since your last order with ${companyName}. Your favourite fast-moving item (*${topProductName}*) and fresh seasonal stock are ready for dispatch. Shall we book a refill order for you today with prompt dispatch?`
        : `Namaste ${cust.contactPerson || cust.businessName}! 🙏 Reaching out from ${companyName}. We have exciting new stock ready in *${topProductName}* with exclusive B2B wholesale pricing. Can I send our latest product catalogue and pricing sheet for your review?`;

      insights.push({
        customerId: cust.id,
        businessName: cust.businessName,
        contactPerson: cust.contactPerson,
        mobile: cust.mobile,
        salespersonName,
        salespersonId: cust.assignedSalespersonId || undefined,
        totalOrders: custOrders.length || cust.totalOrders,
        totalPurchaseValue: cust.totalPurchaseValue,
        lastOrderDate: lastOrderDate ? lastOrderDate.toISOString() : null,
        daysSinceLastOrder,
        averageOrderCycleDays: averageCycle,
        daysOverdue,
        churnStatus,
        topProducts,
        recommendedRestockText: lastOrderDate
          ? `Historically reorders every ~${averageCycle} days. Top purchase: ${topProductName}.`
          : `New account awaiting first order. Suggested catalogue: ${topProductName}.`,
        whatsappPitch
      });
    }

    // Sort by most overdue / at-risk customers first
    insights.sort((a, b) => {
      if (a.churnStatus === 'HIGH_CHURN_RISK' && b.churnStatus !== 'HIGH_CHURN_RISK') return -1;
      if (b.churnStatus === 'HIGH_CHURN_RISK' && a.churnStatus !== 'HIGH_CHURN_RISK') return 1;
      if (a.churnStatus === 'DUE_FOR_REORDER' && b.churnStatus === 'ACTIVE_HEALTHY') return -1;
      if (b.churnStatus === 'DUE_FOR_REORDER' && a.churnStatus === 'ACTIVE_HEALTHY') return 1;
      return b.daysSinceLastOrder - a.daysSinceLastOrder;
    });

    return {
      success: true,
      data: {
        totalAnalyzedCustomers: insights.length,
        highRiskCount,
        dueForReorderCount,
        healthyCount,
        estimatedRecoverableRevenue: Math.round(estimatedRecoverableRevenue),
        insights
      }
    };
  } catch (error: any) {
    console.error("Error in getDormantAndReorderInsights:", error);
    return { success: false, error: error.message || "Failed to analyze customer re-orders" };
  }
}

export async function createDraftReorderQuotation(customerId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const organizationId = await getTenantOrgId();
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        orders: {
          include: {
            items: { include: { product: true } }
          },
          orderBy: { orderDate: "desc" },
          take: 3
        }
      }
    });

    if (!customer) return { success: false, error: "Customer not found" };

    // Extract top products
    const productFrequency: Record<string, { product: any; count: number; avgQty: number }> = {};
    customer.orders.forEach(o => {
      o.items.forEach(item => {
        if (!item.product) return;
        if (!productFrequency[item.productId]) {
          productFrequency[item.productId] = { product: item.product, count: 0, avgQty: 0 };
        }
        productFrequency[item.productId].count++;
        productFrequency[item.productId].avgQty = item.quantity || 10;
      });
    });

    const selectedProducts = Object.values(productFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    if (selectedProducts.length === 0) {
      return { success: false, error: "No past items found to generate re-order quote." };
    }

    const nextQuoteNum = `QT-REORDER-${Date.now().toString().slice(-6)}`;
    let subtotal = 0;
    const quoteItemsData = selectedProducts.map(p => {
      const qty = p.avgQty || 20;
      const rate = p.product.sellingPrice || 500;
      const amount = qty * rate;
      subtotal += amount;
      return {
        productId: p.product.id,
        description: `${p.product.name} (Auto-Generated Repeat Stock)`,
        quantity: qty,
        rate: rate,
        total: amount,
        taxAmount: Math.round(amount * 0.05),
        gstRate: 5
      };
    });

    const taxAmount = Math.round(subtotal * 0.05);
    const totalValue = subtotal + taxAmount;

    const createdQuote = await prisma.quotation.create({
      data: {
        organizationId,
        quotationNumber: nextQuoteNum,
        customerId: customer.id,
        salespersonId: customer.assignedSalespersonId || (session.user as any).id,
        date: new Date(),
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "Draft",
        subtotal,
        taxTotal: taxAmount,
        totalValue,
        notes: "AI Re-Order Quotation generated based on historical purchasing cadence.",
        items: {
          create: quoteItemsData
        }
      }
    });

    revalidatePath("/quotations");
    revalidatePath("/customers");

    return {
      success: true,
      quotationId: createdQuote.id,
      quotationNumber: createdQuote.quotationNumber,
      totalValue: createdQuote.totalValue
    };
  } catch (error: any) {
    console.error("Error creating draft re-order quotation:", error);
    return { success: false, error: error.message || "Failed to create re-order quotation" };
  }
}

export async function createSalespersonReorderTask(data: {
  customerId: string;
  salespersonId?: string;
  customerName: string;
  daysSinceLastOrder: number;
  recommendedPitch: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const userId = (session.user as any).id;
    const creator = await getOrCreateEmployee(userId, session.user);

    const task = await prisma.task.create({
      data: {
        title: `Re-engage Dormant Account: ${data.customerName} (${data.daysSinceLastOrder}d Inactive)`,
        description: `Customer is overdue for restocking. Recommended pitch: "${data.recommendedPitch}". Contact them to confirm repeat requirements.`,
        priority: "High",
        status: "To Do",
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        assigneeId: data.salespersonId || (creator ? creator.id : userId),
        creatorId: creator ? creator.id : userId,
        customerId: data.customerId
      }
    });

    revalidatePath("/tasks");
    revalidatePath("/");
    return { success: true, taskId: task.id };
  } catch (error: any) {
    console.error("Error creating re-order task:", error);
    return { success: false, error: error.message || "Failed to assign task" };
  }
}
