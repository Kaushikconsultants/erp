"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getTenantOrgId } from "@/lib/tenant";

export async function getWarehouseStocks(warehouseId?: string, search?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const organizationId = await getTenantOrgId();
    const where: any = {
      ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {})
    };

    if (warehouseId && warehouseId !== "ALL") {
      where.warehouseId = warehouseId;
    }

    if (search) {
      const q = search.trim();
      where.product = {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } }
        ]
      };
    }

    const stocks = await prisma.warehouseStock.findMany({
      where,
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        product: { select: { id: true, name: true, sku: true, category: true, sellingPrice: true, stockQuantity: true } }
      },
      orderBy: { updatedAt: "desc" }
    });

    return { success: true, stocks };
  } catch (error: any) {
    console.error("getWarehouseStocks error:", error);
    return { error: error?.message || "Failed to fetch warehouse stocks", stocks: [] };
  }
}

export async function getProductWarehouseBreakdown(productId: string) {
  try {
    const organizationId = await getTenantOrgId();

    const [warehouses, existingStocks, product] = await Promise.all([
      prisma.warehouse.findMany({
        where: organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {},
        select: { id: true, name: true, code: true }
      }),
      prisma.warehouseStock.findMany({
        where: { productId },
        include: { warehouse: { select: { id: true, name: true, code: true } } }
      }),
      prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, sku: true, stockQuantity: true }
      })
    ]);

    if (!product) return { error: "Product not found" };

    const stockMap = new Map(existingStocks.map(s => [s.warehouseId, s]));

    const breakdown = warehouses.map(wh => {
      const stock = stockMap.get(wh.id);
      return {
        warehouseId: wh.id,
        warehouseName: wh.name,
        warehouseCode: wh.code,
        quantityOnHand: stock ? stock.quantityOnHand : 0,
        reservedQuantity: stock ? stock.reservedQuantity : 0,
        reorderPoint: stock ? stock.reorderPoint : 0,
        binLocation: stock?.binLocation || "-"
      };
    });

    return {
      success: true,
      product,
      totalStock: product.stockQuantity,
      breakdown
    };
  } catch (error: any) {
    return { error: error?.message || "Failed to fetch product warehouse breakdown" };
  }
}

export async function adjustWarehouseStock(data: {
  warehouseId: string;
  productId: string;
  quantityChange: number; // positive to increment, negative to decrement
  reason: string;
  binLocation?: string;
  notes?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const organizationId = await getTenantOrgId();

    const [warehouse, product] = await Promise.all([
      prisma.warehouse.findUnique({ where: { id: data.warehouseId } }),
      prisma.product.findUnique({ where: { id: data.productId } })
    ]);

    if (!warehouse) return { error: "Warehouse not found" };
    if (!product) return { error: "Product not found" };

    const result = await prisma.$transaction(async (tx) => {
      // 1. Upsert WarehouseStock
      const existing = await tx.warehouseStock.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: data.warehouseId,
            productId: data.productId
          }
        }
      });

      const currentQty = existing ? existing.quantityOnHand : 0;
      const newQty = Math.max(0, currentQty + data.quantityChange);

      const stock = await tx.warehouseStock.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: data.warehouseId,
            productId: data.productId
          }
        },
        create: {
          organizationId,
          warehouseId: data.warehouseId,
          productId: data.productId,
          quantityOnHand: newQty,
          binLocation: data.binLocation || null
        },
        update: {
          quantityOnHand: newQty,
          ...(data.binLocation ? { binLocation: data.binLocation } : {})
        }
      });

      // 2. Adjust overall Product.stockQuantity
      await tx.product.update({
        where: { id: data.productId },
        data: {
          stockQuantity: { increment: Math.round(data.quantityChange) }
        }
      });

      // 3. Record InventoryTransaction
      await tx.inventoryTransaction.create({
        data: {
          productId: data.productId,
          warehouseId: data.warehouseId,
          quantity: Math.abs(Math.round(data.quantityChange)),
          type: data.quantityChange >= 0 ? "IN" : "OUT",
          reference: `ADJ-${warehouse.code || 'WH'}-${Date.now().toString().slice(-4)}`,
          notes: `Stock adjustment at ${warehouse.name}: ${data.reason}. ${data.notes || ''}`.trim()
        }
      });

      return stock;
    });

    revalidatePath("/warehouses");
    revalidatePath("/products");
    revalidatePath("/inventory");

    return { success: true, stock: result };
  } catch (error: any) {
    console.error("adjustWarehouseStock error:", error);
    return { error: error?.message || "Failed to adjust warehouse stock" };
  }
}

export async function transferStockBetweenWarehouses(data: {
  fromWarehouseId: string;
  toWarehouseId: string;
  productId: string;
  quantity: number;
  notes?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    if (data.fromWarehouseId === data.toWarehouseId) {
      return { error: "Source and destination warehouses cannot be the same." };
    }

    if (data.quantity <= 0) {
      return { error: "Transfer quantity must be greater than zero." };
    }

    const organizationId = await getTenantOrgId();

    const [fromWh, toWh, product] = await Promise.all([
      prisma.warehouse.findUnique({ where: { id: data.fromWarehouseId } }),
      prisma.warehouse.findUnique({ where: { id: data.toWarehouseId } }),
      prisma.product.findUnique({ where: { id: data.productId } })
    ]);

    if (!fromWh) return { error: "Source warehouse not found" };
    if (!toWh) return { error: "Destination warehouse not found" };
    if (!product) return { error: "Product not found" };

    // Check source stock
    const sourceStock = await prisma.warehouseStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: data.fromWarehouseId,
          productId: data.productId
        }
      }
    });

    const availableQty = sourceStock ? sourceStock.quantityOnHand : 0;
    if (availableQty < data.quantity) {
      return {
        error: `Insufficient stock in ${fromWh.name}. Available: ${availableQty}, Requested: ${data.quantity}`
      };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Decrement source warehouse stock
      await tx.warehouseStock.update({
        where: {
          warehouseId_productId: {
            warehouseId: data.fromWarehouseId,
            productId: data.productId
          }
        },
        data: {
          quantityOnHand: { decrement: data.quantity }
        }
      });

      // 2. Increment destination warehouse stock
      await tx.warehouseStock.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: data.toWarehouseId,
            productId: data.productId
          }
        },
        create: {
          organizationId,
          warehouseId: data.toWarehouseId,
          productId: data.productId,
          quantityOnHand: data.quantity
        },
        update: {
          quantityOnHand: { increment: data.quantity }
        }
      });

      // 3. Record InventoryTransactions
      const ref = `TRF-${fromWh.code || 'WH'}-TO-${toWh.code || 'WH'}-${Date.now().toString().slice(-4)}`;
      
      await tx.inventoryTransaction.create({
        data: {
          productId: data.productId,
          warehouseId: data.fromWarehouseId,
          quantity: data.quantity,
          type: "OUT",
          reference: ref,
          notes: `Transferred to ${toWh.name}. ${data.notes || ''}`.trim()
        }
      });

      await tx.inventoryTransaction.create({
        data: {
          productId: data.productId,
          warehouseId: data.toWarehouseId,
          quantity: data.quantity,
          type: "IN",
          reference: ref,
          notes: `Received from ${fromWh.name}. ${data.notes || ''}`.trim()
        }
      });
    });

    revalidatePath("/warehouses");
    revalidatePath("/products");
    revalidatePath("/inventory");

    return { success: true };
  } catch (error: any) {
    console.error("transferStockBetweenWarehouses error:", error);
    return { error: error?.message || "Failed to transfer stock" };
  }
}
