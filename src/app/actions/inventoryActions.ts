"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";

export async function adjustInventory(skuOrArticle: string, quantity: number, type: "IN" | "OUT", notes?: string) {
  const session = await getServerSession(authOptions);
  const roleName = (session?.user as any)?.role;
  let canManage = roleName === 'ADMIN' || roleName === 'SUPER_ADMIN';

  if (!canManage && roleName) {
    const roleDef = await prisma.role.findUnique({ where: { name: roleName } });
    if (roleDef) {
      try {
        const perms = JSON.parse(roleDef.permissions) as string[];
        if (perms.includes("Manage Inventory")) canManage = true;
      } catch(e) {}
    }
  }

  if (!canManage) {
    return { error: "Unauthorized. You do not have permission to manage inventory." };
  }

  if (!skuOrArticle || isNaN(quantity) || quantity <= 0) {
    return { error: "Invalid SKU or quantity" };
  }

  try {
    const organizationId = await getTenantOrgId();
    const product = await prisma.product.findFirst({
      where: {
        ...(organizationId ? { organizationId } : {}),
        OR: [
          { sku: skuOrArticle },
          { articleNumber: skuOrArticle }
        ]
      }
    });

    if (!product) {
      return { error: `Product not found for SKU/Article: ${skuOrArticle}` };
    }

    if (type === "OUT" && product.stockQuantity < quantity) {
      return { error: `Insufficient stock. Only ${product.stockQuantity} available.` };
    }

    const newQuantity = type === "IN" ? product.stockQuantity + quantity : product.stockQuantity - quantity;

    await prisma.$transaction([
      prisma.product.update({
        where: { id: product.id },
        data: { stockQuantity: newQuantity }
      }),
      prisma.inventoryTransaction.create({
        data: {
          productId: product.id,
          type: type,
          quantity: quantity,
          reference: "Manual Scan",
          notes: notes || "Adjusted via Inventory Tracker"
        }
      })
    ]);

    revalidatePath("/", "layout");
    
    return { 
      success: true, 
      product: { 
        name: product.name, 
        sku: product.sku || product.articleNumber, 
        oldStock: product.stockQuantity,
        newStock: newQuantity 
      } 
    };

  } catch (error) {
    console.error("Failed to adjust inventory:", error);
    return { error: "An unexpected error occurred while updating inventory." };
  }
}

export async function getInventoryHistory(filters: { startDate?: string, endDate?: string, sku?: string, type?: string }) {
  const session = await getServerSession(authOptions);
  const roleName = (session?.user as any)?.role;
  let canView = roleName === 'ADMIN' || roleName === 'SUPER_ADMIN';

  if (!canView && roleName) {
    const roleDef = await prisma.role.findUnique({ where: { name: roleName } });
    if (roleDef) {
      try {
        const perms = JSON.parse(roleDef.permissions) as string[];
        if (perms.includes("View Inventory") || perms.includes("Manage Inventory")) canView = true;
      } catch(e) {}
    }
  }

  if (!canView) {
    return { error: "Unauthorized. You do not have permission to view inventory reports." };
  }

  try {
    const organizationId = await getTenantOrgId();
    const whereClause: any = {
      product: {
        ...(organizationId ? { organizationId } : {})
      }
    };
    
    if (filters.startDate || filters.endDate) {
      whereClause.date = {};
      if (filters.startDate) whereClause.date.gte = new Date(filters.startDate);
      if (filters.endDate) whereClause.date.lte = new Date(filters.endDate);
    }
    
    if (filters.type && filters.type !== 'ALL') {
      whereClause.type = filters.type;
    }

    if (filters.sku) {
      whereClause.product.OR = [
        { sku: { contains: filters.sku, mode: 'insensitive' } },
        { articleNumber: { contains: filters.sku, mode: 'insensitive' } }
      ];
    }

    const transactions = await prisma.inventoryTransaction.findMany({
      where: whereClause,
      include: {
        product: {
          select: { name: true, sku: true, articleNumber: true }
        },
        employee: {
          select: { user: { select: { name: true } } }
        }
      },
      orderBy: { date: 'desc' },
      take: 200
    });

    return { success: true, transactions };
  } catch (error) {
    console.error("Failed to fetch inventory history:", error);
    return { error: "Failed to fetch inventory history." };
  }
}
