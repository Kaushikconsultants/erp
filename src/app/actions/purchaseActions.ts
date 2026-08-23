"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

import { canUserAccessSection } from "@/lib/authPermissions";

async function canManagePurchases() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  return await canUserAccessSection(session.user, 'purchases');
}

export async function getPurchaseOrders() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const hasAccess = await canUserAccessSection(session.user, 'purchases');
  if (!hasAccess) return { error: "Unauthorized" };
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        vendor: { select: { companyName: true, contactPerson: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, orders };
  } catch (error: any) {
    return { error: "Failed to fetch purchase orders: " + error.message };
  }
}

export async function createPurchaseOrder(data: {
  vendorId: string;
  expectedDate?: string;
  notes?: string;
  items: { productId: string; quantity: number; rate: number; taxAmount?: number }[];
}) {
  if (!await canManagePurchases()) return { error: "Unauthorized" };
  if (!data.vendorId || !data.items?.length) return { error: "Vendor and at least one item are required" };

  try {
    // Generate PO number
    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-${String(count + 1).padStart(5, '0')}`;

    const totalValue = data.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const taxAmount = data.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        vendorId: data.vendorId,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        totalValue,
        taxAmount,
        notes: data.notes || null,
        status: 'Draft',
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            rate: item.rate,
            taxAmount: item.taxAmount || 0,
            total: item.quantity * item.rate,
          }))
        }
      },
      include: { items: true }
    });

    revalidatePath("/purchases");
    return { success: true, po };
  } catch (error: any) {
    return { error: "Failed to create purchase order: " + error.message };
  }
}

export async function updatePOStatus(id: string, status: string) {
  if (!await canManagePurchases()) return { error: "Unauthorized" };
  try {
    await prisma.purchaseOrder.update({ where: { id }, data: { status } });
    revalidatePath("/purchases");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to update PO status" };
  }
}

export async function receiveGRN(poId: string, receivedItems: { itemId: string; receivedQty: number }[], warehouseId?: string) {
  if (!await canManagePurchases()) return { error: "Unauthorized" };

  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const employee = await prisma.employee.findUnique({ where: { userId } });

    // Process each received item
    await prisma.$transaction(async (tx) => {
      for (const ri of receivedItems) {
        const poItem = await tx.purchaseOrderItem.findUnique({
          where: { id: ri.itemId },
          include: { product: true }
        });
        if (!poItem) continue;

        const newReceived = poItem.receivedQty + ri.receivedQty;

        // Update PO item received qty
        await tx.purchaseOrderItem.update({
          where: { id: ri.itemId },
          data: { receivedQty: newReceived }
        });

        // Update product stock
        await tx.product.update({
          where: { id: poItem.productId },
          data: { stockQuantity: { increment: ri.receivedQty } }
        });

        // Create inventory transaction
        await tx.inventoryTransaction.create({
          data: {
            productId: poItem.productId,
            type: 'IN',
            quantity: ri.receivedQty,
            reference: `GRN-${poId}`,
            warehouseId: warehouseId || null,
            employeeId: employee?.id || null,
            notes: `Goods received against PO`
          }
        });
      }

      // Check if all items fully received → update PO status
      const allItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: poId } });
      const allReceived = allItems.every(i => i.receivedQty >= i.quantity);
      const anyReceived = allItems.some(i => i.receivedQty > 0);

      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: allReceived ? 'Received' : anyReceived ? 'Partially Received' : 'Issued' }
      });
    });

    revalidatePath("/purchases");
    revalidatePath("/products");
    return { success: true };
  } catch (error: any) {
    return { error: "GRN processing failed: " + error.message };
  }
}
