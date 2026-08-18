"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function createProduct(formData: FormData) {
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

  const name = formData.get("name") as string;
  const sku = formData.get("sku") as string;
  const articleNumber = formData.get("articleNumber") as string || sku; // Fallback to SKU if empty
  const hsnCode = formData.get("hsnCode") as string;
  const category = formData.get("category") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const stock = parseInt(formData.get("stock") as string, 10);
  const weightInput = formData.get("weight");
  let weight = weightInput ? parseFloat(weightInput as string) : 0;

  if (!name || !sku || isNaN(price)) {
    return { error: "Name, SKU, and a valid Price are required" };
  }

  try {
    if ((isNaN(weight) || weight <= 0) && category) {
      const catObj = await prisma.productCategory.findUnique({ where: { name: category.trim() } });
      if (catObj?.weight) {
        weight = catObj.weight;
      }
    }

    const existingProduct = await prisma.product.findFirst({
      where: { 
        OR: [
          { sku: sku },
          { articleNumber: articleNumber }
        ]
      },
    });

    if (existingProduct) {
      return { error: "Product with this SKU or Article Number already exists" };
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku: sku,
        articleNumber: articleNumber,
        hsnCode: hsnCode || null,
        category: category || "General",
        description: description || null,
        weight: isNaN(weight) ? 0 : weight,
        sellingPrice: price,
        purchasePrice: price * 0.7, // MVP mock
        mrp: price * 1.2, // MVP mock
        stockQuantity: isNaN(stock) ? 0 : stock,
        inventoryTransactions: {
          create: {
            type: "IN",
            quantity: isNaN(stock) ? 0 : stock,
            reference: "Initial Stock",
            notes: "Added during product creation"
          }
        }
      }
    });

    revalidatePath("/", "layout");
    return { success: true, product };
  } catch (error) {
    console.error("Failed to create product:", error);
    return { error: "Failed to create product. Please try again." };
  }
}

export async function updateProduct(id: string, formData: FormData) {
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

  const name = formData.get("name") as string;
  const sku = formData.get("sku") as string;
  const articleNumber = formData.get("articleNumber") as string;
  const hsnCode = formData.get("hsnCode") as string;
  const category = formData.get("category") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const stock = parseInt(formData.get("stock") as string, 10);
  const weightInput = formData.get("weight");
  let weight = weightInput ? parseFloat(weightInput as string) : 0;

  if (!name || isNaN(price)) {
    return { error: "Product Name and a valid Price are required" };
  }

  try {
    if ((isNaN(weight) || weight <= 0) && category) {
      const catObj = await prisma.productCategory.findUnique({ where: { name: category.trim() } });
      if (catObj?.weight) weight = catObj.weight;
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        sku: sku || null,
        articleNumber: articleNumber || null,
        hsnCode: hsnCode || null,
        category: category || "General",
        description: description || null,
        weight: isNaN(weight) ? 0 : weight,
        sellingPrice: price,
        purchasePrice: price * 0.7,
        mrp: price * 1.2,
        stockQuantity: isNaN(stock) ? 0 : stock
      }
    });

    revalidatePath("/products");
    revalidatePath("/", "layout");
    return { success: true, product: updatedProduct };
  } catch (error: any) {
    console.error("Failed to update product:", error);
    return { error: error.message || "Failed to update product." };
  }
}

export async function deleteProduct(id: string) {
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
    return { error: "Unauthorized. You do not have permission to delete products." };
  }

  try {
    await prisma.inventoryTransaction.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });

    revalidatePath("/products");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete product:", error);
    return { error: error.message || "Failed to delete product. It may be linked to existing orders." };
  }
}
