"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

import { getTenantOrgId } from "@/lib/tenant";

export async function getWarehouses() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };
  try {
    const organizationId = await getTenantOrgId();
    const warehouses = await prisma.warehouse.findMany({
      where: { organizationId },
      include: {
        branch: { select: { name: true } },
        inventoryTransactions: {
          select: { quantity: true, type: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, warehouses };
  } catch (error: any) {
    return { error: "Failed to fetch warehouses" };
  }
}

export async function createWarehouse(formData: FormData) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const warehouse = await prisma.warehouse.create({
      data: {
        organizationId,
        name: formData.get("name") as string,
        code: formData.get("code") as string || null,
        address: formData.get("address") as string || null,
        branchId: formData.get("branchId") as string || null,
      }
    });
    revalidatePath("/warehouses");
    return { success: true, warehouse };
  } catch (error: any) {
    return { error: "Failed to create warehouse: " + error.message };
  }
}

export async function deleteWarehouse(id: string) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return { error: "Unauthorized" };
  try {
    await prisma.warehouse.delete({ where: { id } });
    revalidatePath("/warehouses");
    return { success: true };
  } catch {
    return { error: "Cannot delete warehouse with existing transactions." };
  }
}
