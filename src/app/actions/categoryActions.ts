"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { getTenantOrgId } from "@/lib/tenant";

export async function getCategories() {
  try {
    const organizationId = await getTenantOrgId();
    const dbCategories = await prisma.productCategory.findMany({
      orderBy: { name: 'asc' }
    });

    // Also fetch unique categories existing on Product table for this organization
    const products = await prisma.product.findMany({
      where: { organizationId },
      select: { category: true }
    });
    
    const productCategoryNames = Array.from(
      new Set(products.map(p => p.category).filter(Boolean))
    ) as string[];

    // Combine them ensuring all unique categories exist in response
    const categoryMap: Record<string, { id?: string; name: string; weight: number; description?: string | null }> = {};

    dbCategories.forEach(cat => {
      categoryMap[cat.name] = {
        id: cat.id,
        name: cat.name,
        weight: cat.weight || 0,
        description: cat.description
      };
    });

    productCategoryNames.forEach(name => {
      if (!categoryMap[name]) {
        categoryMap[name] = {
          name,
          weight: 0,
          description: null
        };
      }
    });

    return Object.values(categoryMap).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function upsertCategory(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const weight = parseFloat(formData.get("weight") as string || "0");
    const description = formData.get("description") as string || null;

    if (!name || !name.trim()) {
      return { error: "Category name is required" };
    }

    const trimmedName = name.trim();

    const category = await prisma.productCategory.upsert({
      where: { name: trimmedName },
      update: { weight, description },
      create: { name: trimmedName, weight, description }
    });

    revalidatePath("/products");
    revalidatePath("/quotations/new");
    return { success: true, category };
  } catch (error: any) {
    console.error("Error saving category:", error);
    return { error: error.message || "Failed to save category" };
  }
}

export async function updateCategoryWeight(name: string, weight: number) {
  try {
    if (!name) return { error: "Category name required" };

    const trimmedName = name.trim();
    const category = await prisma.productCategory.upsert({
      where: { name: trimmedName },
      update: { weight },
      create: { name: trimmedName, weight }
    });

    revalidatePath("/products");
    revalidatePath("/quotations/new");
    return { success: true, category };
  } catch (error: any) {
    console.error("Error updating category weight:", error);
    return { error: error.message || "Failed to update category weight" };
  }
}

export async function editCategory(oldName: string, newName: string, weight: number) {
  try {
    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();

    if (!trimmedNew) return { error: "Category name cannot be empty" };

    const existingDbCat = await prisma.productCategory.findUnique({ where: { name: trimmedOld } });

    if (existingDbCat) {
      if (trimmedOld !== trimmedNew) {
        await prisma.productCategory.delete({ where: { name: trimmedOld } });
      }
      await prisma.productCategory.upsert({
        where: { name: trimmedNew },
        update: { weight },
        create: { name: trimmedNew, weight }
      });
    } else {
      await prisma.productCategory.upsert({
        where: { name: trimmedNew },
        update: { weight },
        create: { name: trimmedNew, weight }
      });
    }

    if (trimmedOld !== trimmedNew) {
      await prisma.product.updateMany({
        where: { category: trimmedOld },
        data: { category: trimmedNew }
      });
    }

    revalidatePath("/products");
    revalidatePath("/quotations/new");
    return { success: true };
  } catch (error: any) {
    console.error("Error editing category:", error);
    return { error: error.message || "Failed to edit category" };
  }
}

export async function deleteCategory(name: string) {
  try {
    const trimmedName = name.trim();
    const existing = await prisma.productCategory.findUnique({ where: { name: trimmedName } });
    if (existing) {
      await prisma.productCategory.delete({ where: { name: trimmedName } });
    }

    await prisma.product.updateMany({
      where: { category: trimmedName },
      data: { category: 'General' }
    });

    revalidatePath("/products");
    revalidatePath("/quotations/new");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting category:", error);
    return { error: error.message || "Failed to delete category" };
  }
}
