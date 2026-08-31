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

    const [companySettings, customers, allOrders] = await Promise.all([
      prisma.companySettings.findFirst({ where: { organizationId } }),
      prisma.customer.findMany({
        where: { organizationId },
        include: {
          assignedSalesperson: {
            include: { user: true }
          }
        },
        orderBy: { totalPurchaseValue: "desc" }
      }),
      prisma.order.findMany({
        where: { organizationId },
        include: {
          items: {
            include: { product: true }
          }
        },
        orderBy: { orderDate: "desc" }
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

      if (custOrders.length === 0 && cust.totalOrders === 0) {
        continue; // Skip brand new leads with no purchase history for re-order predictions
      }

      // Calculate order dates & cycle
      const orderDates = custOrders
        .map(o => new Date(o.orderDate || o.createdAt))
        .sort((a, b) => b.getTime() - a.getTime());

      const lastOrderDate = orderDates.length > 0 ? orderDates[0] : null;
      const daysSinceLastOrder = lastOrderDate 
        ? Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
        : 90;

      // Compute average order cycle
      let averageCycle = cust.averageOrderCycleDays || 30;
      if (orderDates.length >= 2) {
        const totalSpanDays = Math.floor((orderDates[0].getTime() - orderDates[orderDates.length - 1].getTime()) / (1000 * 60 * 60 * 24));
        const intervals = orderDates.length - 1;
        if (intervals > 0 && totalSpanDays > 0) {
          averageCycle = Math.max(7, Math.round(totalSpanDays / intervals));
        }
      }

      const daysOverdue = Math.max(0, daysSinceLastOrder - averageCycle);

      // Determine Churn / Re-order Status
      let churnStatus: "HIGH_CHURN_RISK" | "DUE_FOR_REORDER" | "ACTIVE_HEALTHY" = "ACTIVE_HEALTHY";
      if (daysSinceLastOrder > Math.max(45, averageCycle * 1.8)) {
        churnStatus = "HIGH_CHURN_RISK";
        highRiskCount++;
        estimatedRecoverableRevenue += (cust.totalPurchaseValue / Math.max(1, cust.totalOrders));
      } else if (daysSinceLastOrder >= averageCycle) {
        churnStatus = "DUE_FOR_REORDER";
        dueForReorderCount++;
        estimatedRecoverableRevenue += (cust.totalPurchaseValue / Math.max(1, cust.totalOrders));
      } else {
        churnStatus = "ACTIVE_HEALTHY";
        healthyCount++;
      }

      // Identify Top historically ordered products
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

      const topProducts = Object.values(productMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 3)
        .map(p => ({
          productId: p.productId,
          productName: p.productName,
          category: p.category,
          totalQuantityBought: p.quantity,
          sellingPrice: p.sellingPrice
        }));

      const topProductName = topProducts[0]?.productName || "Apparel collection";
      const salespersonName = cust.assignedSalesperson?.user?.name || "Sales Team";

      const whatsappPitch = `Namaste ${cust.contactPerson || cust.businessName}! 🙏 We noticed it's been ${daysSinceLastOrder} days since your last order with ${companyName}. Your favourite fast-moving item (*${topProductName}*) and fresh seasonal stock are ready for dispatch. Shall we book a refill order for you today with prompt dispatch?`;

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
        recommendedRestockText: `Historically reorders every ~${averageCycle} days. Top purchase: ${topProductName}.`,
        whatsappPitch
      });
    }

    // Sort by most overdue / at-risk customers first
    insights.sort((a, b) => b.daysOverdue - a.daysOverdue);

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
