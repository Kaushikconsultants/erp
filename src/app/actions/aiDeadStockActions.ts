"use server";

import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";
import { getTenantOrgId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrCreateEmployee } from "@/lib/employeeHelper";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });

export interface MatchedBuyer {
  customerId: string;
  businessName: string;
  contactPerson: string;
  mobile: string;
  totalCategorySpend: number;
}

export interface DeadStockSKU {
  productId: string;
  name: string;
  sku: string;
  category: string;
  stockQuantity: number;
  purchasePrice: number;
  sellingPrice: number;
  lockedCapital: number;
  daysInStock: number;
  lastSoldDate: string | null;
  unitsSoldLast60Days: number;
  healthStatus: "DEAD" | "SLOW" | "HEALTHY";
  recommendedDiscountPercent: number;
  recommendedClearancePrice: number;
  aiStrategy: string;
  whatsappCampaignText: string;
  matchedBuyers: MatchedBuyer[];
}

export interface DeadStockReport {
  totalProducts: number;
  deadStockCount: number;
  slowMovingCount: number;
  healthyCount: number;
  totalLockedCapitalInDeadStock: number;
  totalLockedCapitalOverall: number;
  skus: DeadStockSKU[];
}

export async function getDeadStockLiquidationInsights(): Promise<{
  success: boolean;
  data?: DeadStockReport;
  error?: string;
}> {
  try {
    const organizationId = await getTenantOrgId();

    const [companySettings, products, orderItems] = await Promise.all([
      prisma.companySettings.findFirst({ where: { organizationId } }),
      prisma.product.findMany({
        where: { organizationId },
        orderBy: { stockQuantity: "desc" }
      }),
      prisma.orderItem.findMany({
        where: { order: { organizationId } },
        include: {
          product: { select: { id: true, category: true } },
          order: {
            include: {
              customer: true
            }
          }
        }
      })
    ]);

    const companyName = companySettings?.companyName || "ESPON CLOTHING PRIVATE LIMITED";
    const companyPhone = companySettings?.mobile || "+91 7206066678";
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const skuList: DeadStockSKU[] = [];
    let totalLockedCapitalInDeadStock = 0;
    let totalLockedCapitalOverall = 0;
    let deadCount = 0;
    let slowCount = 0;
    let healthyCount = 0;

    for (const p of products) {
      const pOrders = orderItems.filter(o => o.productId === p.id);

      const allSaleDates = pOrders
        .map(o => new Date(o.order?.orderDate || o.order?.createdAt || p.createdAt))
        .sort((a, b) => b.getTime() - a.getTime());

      const lastSold = allSaleDates.length > 0 ? allSaleDates[0] : null;
      const refDate = lastSold || new Date(p.createdAt);
      const daysSinceMovement = Math.floor((now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));

      const unitsSoldLast60 = pOrders
        .filter(o => new Date(o.order?.orderDate || o.order?.createdAt || p.createdAt) >= sixtyDaysAgo)
        .reduce((sum, item) => sum + (item.quantity || 0), 0);

      const cost = p.purchasePrice && p.purchasePrice > 0 ? p.purchasePrice : (p.sellingPrice ? p.sellingPrice * 0.65 : 0);
      const lockedCap = Number(((p.stockQuantity || 0) * cost).toFixed(2));
      totalLockedCapitalOverall += lockedCap;

      let status: "DEAD" | "SLOW" | "HEALTHY" = "HEALTHY";
      let discPercent = 0;
      let aiStrategy = "Stock velocity is healthy. Maintain standard wholesale pricing.";

      if (p.stockQuantity > 0) {
        if (daysSinceMovement > 60 && unitsSoldLast60 === 0) {
          status = "DEAD";
          deadCount++;
          discPercent = 20;
          totalLockedCapitalInDeadStock += lockedCap;
          aiStrategy = `Dead stock alert: No sales for ${daysSinceMovement} days. Recommend 20% clearance markdown or 12+2 combo pack to liquidate ₹${lockedCap.toLocaleString('en-IN')} locked capital.`;
        } else if (daysSinceMovement > 30 || unitsSoldLast60 < 10) {
          status = "SLOW";
          slowCount++;
          discPercent = 10;
          aiStrategy = `Slow-moving SKU. Offer 10% volume discount for orders of 24+ pcs to boost velocity.`;
        } else {
          healthyCount++;
        }
      } else {
        healthyCount++;
      }

      const clearanceRate = Math.round(p.sellingPrice * (1 - discPercent / 100));

      // Find matched buyers who buy this product or category
      const matchedBuyerMap: Record<string, MatchedBuyer> = {};
      orderItems
        .filter(item => item.productId === p.id || (p.category && item.product?.category === p.category))
        .forEach(item => {
          if (!item.order?.customer) return;
          const c = item.order.customer;
          if (!matchedBuyerMap[c.id]) {
            matchedBuyerMap[c.id] = {
              customerId: c.id,
              businessName: c.businessName,
              contactPerson: c.contactPerson,
              mobile: c.mobile,
              totalCategorySpend: 0
            };
          }
          matchedBuyerMap[c.id].totalCategorySpend += (item.quantity || 0) * (item.rate || 0);
        });

      const matchedBuyers = Object.values(matchedBuyerMap)
        .sort((a, b) => b.totalCategorySpend - a.totalCategorySpend)
        .slice(0, 4);

      const campaignText = `🔥 *FLASH WHOLESALE CLEARANCE DEAL*\n\n` +
        `Dear Retail Partner,\n` +
        `Special limited clearance discount on *${p.name}* (Art #${p.sku || p.articleNumber || 'N/A'}).\n` +
        `• Regular Rate: ~₹${p.sellingPrice}/pc~\n` +
        `• *Clearance Rate: ₹${clearanceRate}/pc* (${discPercent > 0 ? `${discPercent}% OFF` : 'Best Rate'})\n` +
        `• Available Stock: ${p.stockQuantity} pcs in warehouse\n` +
        `• Min Order: Set of 12 / 24 pcs\n\n` +
        `👉 Book instantly via WhatsApp: ${companyPhone}\n` +
        `${companyName}`;

      skuList.push({
        productId: p.id,
        name: p.name,
        sku: p.sku || p.articleNumber || "SKU-N/A",
        category: p.category || "General",
        stockQuantity: p.stockQuantity || 0,
        purchasePrice: cost,
        sellingPrice: p.sellingPrice || 0,
        lockedCapital: lockedCap,
        daysInStock: daysSinceMovement,
        lastSoldDate: lastSold ? lastSold.toISOString().split("T")[0] : null,
        unitsSoldLast60Days: unitsSoldLast60,
        healthStatus: status,
        recommendedDiscountPercent: discPercent,
        recommendedClearancePrice: clearanceRate,
        aiStrategy,
        whatsappCampaignText: campaignText,
        matchedBuyers
      });
    }

    // Sort dead stock first, then by locked capital
    skuList.sort((a, b) => {
      const weight = (s: string) => s === "DEAD" ? 3 : s === "SLOW" ? 2 : 1;
      return weight(b.healthStatus) - weight(a.healthStatus) || b.lockedCapital - a.lockedCapital;
    });

    return {
      success: true,
      data: {
        totalProducts: products.length,
        deadStockCount: deadCount,
        slowMovingCount: slowCount,
        healthyCount,
        totalLockedCapitalInDeadStock: Number(totalLockedCapitalInDeadStock.toFixed(2)),
        totalLockedCapitalOverall: Number(totalLockedCapitalOverall.toFixed(2)),
        skus: skuList
      }
    };
  } catch (error: any) {
    console.error("Dead Stock Analyzer Error:", error);
    return { success: false, error: error.message || "Failed to analyze dead stock" };
  }
}

export async function createClearanceTask(data: {
  productName: string;
  sku: string;
  lockedCapital: number;
  discountPercent: number;
  clearanceRate: number;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const userId = (session.user as any).id;
    const creator = await getOrCreateEmployee(userId, session.user);

    const task = await prisma.task.create({
      data: {
        title: `Liquidate Dead Stock: ${data.productName} (${data.discountPercent}% Clearance)`,
        description: `₹${data.lockedCapital.toLocaleString('en-IN')} locked in inventory. Offer clearance rate ₹${data.clearanceRate}/pc to wholesale buyers and broadcast catalog.`,
        priority: "High",
        status: "To Do",
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
        assigneeId: creator ? creator.id : userId,
        creatorId: creator ? creator.id : userId,
      }
    });

    revalidatePath("/tasks");
    revalidatePath("/products");
    return { success: true, taskId: task.id };
  } catch (error: any) {
    console.error("Error creating clearance task:", error);
    return { success: false, error: error.message || "Failed to assign clearance task" };
  }
}
