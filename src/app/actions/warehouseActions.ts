"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getTenantOrgId } from "@/lib/tenant";
import { canUserAccessSection } from "@/lib/authPermissions";

async function canManageWarehouses(sessionUser: any) {
  if (!sessionUser) return false;
  const role = sessionUser.role;
  const canManageSettings = sessionUser.canManageSettings;
  if (role === 'ADMIN' || role === 'SUPER_ADMIN' || canManageSettings) return true;
  return await canUserAccessSection(sessionUser, 'purchases');
}

export async function getWarehouses() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };
  try {
    const organizationId = await getTenantOrgId();
    const warehouses = await prisma.warehouse.findMany({
      where: { organizationId },
      include: {
        branch: { select: { id: true, name: true, code: true, city: true, state: true } },
        inventoryTransactions: {
          select: { id: true, quantity: true, type: true, reference: true, date: true },
          orderBy: { date: 'desc' },
          take: 20
        },
        productBatches: {
          select: { id: true, batchNumber: true, stockQuantity: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, warehouses };
  } catch (error: any) {
    return { error: "Failed to fetch warehouses: " + error.message };
  }
}

export async function getBranchesForSelect() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };
  try {
    const organizationId = await getTenantOrgId();
    const branches = await prisma.branch.findMany({
      where: { organizationId },
      select: { id: true, name: true, code: true, city: true, state: true },
      orderBy: { name: 'asc' }
    });
    return { success: true, branches };
  } catch (error: any) {
    return { error: "Failed to fetch branches: " + error.message };
  }
}

export async function createWarehouse(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(await canManageWarehouses(session.user))) {
    return { error: "Unauthorized: Admin or Purchasing access required" };
  }

  const name = (formData.get("name") as string)?.trim();
  let code = (formData.get("code") as string)?.trim()?.toUpperCase() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const branchId = (formData.get("branchId") as string)?.trim() || null;
  const managerId = (formData.get("managerId") as string)?.trim() || null;

  if (!name) return { error: "Warehouse name is required" };

  try {
    const organizationId = await getTenantOrgId();

    if (!code) {
      const initials = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() || "WH";
      code = `WH-${initials}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Check if code is already used in DB
    const existing = await prisma.warehouse.findFirst({
      where: { code }
    });
    if (existing) {
      return { error: `Warehouse code "${code}" is already in use. Please provide a distinct code.` };
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        organizationId,
        name,
        code,
        address,
        branchId: branchId && branchId !== "none" ? branchId : null,
        managerId,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } }
      }
    });

    revalidatePath("/warehouses");
    revalidatePath("/settings/warehouses");
    revalidatePath("/settings");
    return { success: true, warehouse };
  } catch (error: any) {
    return { error: "Failed to create warehouse: " + error.message };
  }
}

export async function updateWarehouse(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(await canManageWarehouses(session.user))) {
    return { error: "Unauthorized: Admin or Purchasing access required" };
  }

  const name = (formData.get("name") as string)?.trim();
  let code = (formData.get("code") as string)?.trim()?.toUpperCase() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const branchId = (formData.get("branchId") as string)?.trim() || null;
  const managerId = (formData.get("managerId") as string)?.trim() || null;

  if (!name) return { error: "Warehouse name is required" };

  try {
    const organizationId = await getTenantOrgId();

    if (code) {
      const existing = await prisma.warehouse.findFirst({
        where: { code, NOT: { id } }
      });
      if (existing) {
        return { error: `Warehouse code "${code}" is already used by another warehouse.` };
      }
    }

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: {
        name,
        code,
        address,
        branchId: branchId && branchId !== "none" ? branchId : null,
        managerId,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } }
      }
    });

    revalidatePath("/warehouses");
    revalidatePath("/settings/warehouses");
    revalidatePath("/settings");
    return { success: true, warehouse };
  } catch (error: any) {
    return { error: "Failed to update warehouse: " + error.message };
  }
}

export async function deleteWarehouse(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(await canManageWarehouses(session.user))) {
    return { error: "Unauthorized: Admin or Purchasing access required" };
  }

  try {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            inventoryTransactions: true,
            productBatches: true
          }
        }
      }
    });

    if (!warehouse) return { error: "Warehouse not found" };

    if (warehouse._count.inventoryTransactions > 0 || warehouse._count.productBatches > 0) {
      return { 
        error: `Cannot delete "${warehouse.name}". It has ${warehouse._count.inventoryTransactions} transaction(s) and ${warehouse._count.productBatches} active batch(es) linked.` 
      };
    }

    await prisma.warehouse.delete({ where: { id } });
    revalidatePath("/warehouses");
    revalidatePath("/settings/warehouses");
    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to delete warehouse: " + error.message };
  }
}
