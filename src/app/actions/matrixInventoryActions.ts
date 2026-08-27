"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export interface VariantMatrixEntry {
  size: string;
  color: string;
  sku: string;
  stockQuantity: number;
  purchasePrice: number;
  sellingPrice: number;
}

/**
 * 1. PARAMETERIZED / MATRIX INVENTORY BUILDER (Busy Parity)
 * Creates or updates variant child products from a 2D matrix (e.g., Sizes: S, M, L, XL; Colors: Navy, Black, White).
 */
export async function generateProductMatrixVariants(data: {
  baseProductName: string;
  category: string;
  subCategory?: string;
  fabric?: string;
  hsnCode?: string;
  baseSkuPrefix: string;
  sizes: string[];
  colors: string[];
  basePurchasePrice: number;
  baseSellingPrice: number;
  baseMrp: number;
  matrixQuantities: Record<string, number>; // key: "Size_Color", value: qty
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const createdVariants = [];

    for (const size of data.sizes) {
      for (const color of data.colors) {
        const matrixKey = `${size}_${color}`;
        const qty = data.matrixQuantities[matrixKey] || 0;
        const variantName = `${data.baseProductName} (${color} - ${size})`;
        const variantSku = `${data.baseSkuPrefix}-${color.toUpperCase().slice(0, 3)}-${size.toUpperCase()}`;

        const existing = await prisma.product.findFirst({
          where: {
            OR: [
              { sku: variantSku },
              { name: variantName, organizationId }
            ]
          }
        });

        if (existing) {
          const updated = await prisma.product.update({
            where: { id: existing.id },
            data: {
              size,
              color,
              stockQuantity: existing.stockQuantity + qty,
              purchasePrice: data.basePurchasePrice,
              sellingPrice: data.baseSellingPrice,
              mrp: data.baseMrp
            }
          });
          createdVariants.push(updated);
        } else {
          const created = await prisma.product.create({
            data: {
              organizationId,
              name: variantName,
              sku: variantSku,
              category: data.category,
              subCategory: data.subCategory || "Garments",
              fabric: data.fabric || "Cotton Blend",
              size,
              color,
              hsnCode: data.hsnCode || "6109",
              purchasePrice: data.basePurchasePrice,
              sellingPrice: data.baseSellingPrice,
              mrp: data.baseMrp,
              stockQuantity: qty,
              minimumStock: 10
            }
          });
          createdVariants.push(created);
        }
      }
    }

    revalidatePath("/products", "page");
    return {
      success: true,
      totalVariants: createdVariants.length,
      variants: JSON.parse(JSON.stringify(createdVariants))
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate matrix variants" };
  }
}

/**
 * 2. COMPOUND UNITS OF MEASUREMENT (UOM)
 */
export async function saveProductUnits(productId: string, units: {
  baseUnit: string;
  alternateUnit: string;
  conversionFactor: number;
  isDefaultBilling?: boolean;
}[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    // Remove previous units
    await prisma.productUnit.deleteMany({ where: { productId } });

    const created = await Promise.all(
      units.map(u => prisma.productUnit.create({
        data: {
          productId,
          baseUnit: u.baseUnit.toUpperCase(),
          alternateUnit: u.alternateUnit.toUpperCase(),
          conversionFactor: Number(u.conversionFactor) || 1,
          isDefaultBilling: u.isDefaultBilling || false
        }
      }))
    );

    revalidatePath("/products", "page");
    return { success: true, units: JSON.parse(JSON.stringify(created)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to save product units" };
  }
}

export async function getProductUnits(productId: string) {
  try {
    const units = await prisma.productUnit.findMany({
      where: { productId }
    });
    return { success: true, units: JSON.parse(JSON.stringify(units)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 3. BATCH & EXPIRY / LOT MANAGEMENT
 */
export async function createProductBatch(data: {
  productId: string;
  batchNumber: string;
  mfgDate?: string;
  expiryDate?: string;
  mrp?: number;
  costPrice?: number;
  stockQuantity: number;
  warehouseId?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const batch = await prisma.productBatch.create({
      data: {
        productId: data.productId,
        batchNumber: data.batchNumber.trim(),
        mfgDate: data.mfgDate ? new Date(data.mfgDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        mrp: Number(data.mrp) || 0,
        costPrice: Number(data.costPrice) || 0,
        stockQuantity: Number(data.stockQuantity) || 0,
        warehouseId: data.warehouseId || null,
        status: "ACTIVE"
      }
    });

    // Update base product total stock quantity
    await prisma.product.update({
      where: { id: data.productId },
      data: {
        stockQuantity: { increment: Number(data.stockQuantity) || 0 }
      }
    });

    revalidatePath("/products", "page");
    return { success: true, batch: JSON.parse(JSON.stringify(batch)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create product batch" };
  }
}

export async function getProductBatches(productId?: string) {
  try {
    const where: any = {};
    if (productId) where.productId = productId;

    const batches = await prisma.productBatch.findMany({
      where,
      include: {
        product: true,
        warehouse: true
      },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, batches: JSON.parse(JSON.stringify(batches)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
