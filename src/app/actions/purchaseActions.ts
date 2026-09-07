"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

import { canUserAccessSection } from "@/lib/authPermissions";
import { getTenantOrgId } from "@/lib/tenant";

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
    const organizationId = await getTenantOrgId();
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        vendor: { organizationId }
      },
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
    // Generate unique PO number
    const count = await prisma.purchaseOrder.count();
    let nextNum = count + 1;
    let poNumber = `PO-${String(nextNum).padStart(5, '0')}`;
    let exists = await prisma.purchaseOrder.findUnique({ where: { poNumber } });
    while (exists) {
      nextNum++;
      poNumber = `PO-${String(nextNum).padStart(5, '0')}`;
      exists = await prisma.purchaseOrder.findUnique({ where: { poNumber } });
    }

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

export async function updatePurchaseOrder(id: string, data: {
  vendorId: string;
  expectedDate?: string;
  notes?: string;
  status?: string;
  items: { productId: string; quantity: number; rate: number; taxAmount?: number }[];
}) {
  if (!await canManagePurchases()) return { error: "Unauthorized" };
  if (!data.vendorId || !data.items?.length) return { error: "Vendor and at least one item are required" };

  try {
    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true, bills: true }
    });

    if (!existing) return { error: "Purchase Order not found" };

    const totalValue = data.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const taxAmount = data.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);

    // Map existing receivedQty if any item was partially received
    const oldItemsMap = new Map<string, number>();
    existing.items.forEach(it => {
      if (it.receivedQty > 0) {
        oldItemsMap.set(it.productId, it.receivedQty);
      }
    });

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Delete old items
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });

      // 2. Create new items and update PO
      const po = await tx.purchaseOrder.update({
        where: { id },
        data: {
          vendorId: data.vendorId,
          expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
          totalValue,
          taxAmount,
          notes: data.notes || null,
          status: data.status || existing.status,
          items: {
            create: data.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              rate: item.rate,
              taxAmount: item.taxAmount || 0,
              total: item.quantity * item.rate,
              receivedQty: oldItemsMap.get(item.productId) || 0
            }))
          }
        },
        include: {
          vendor: { select: { companyName: true, contactPerson: true } },
          items: {
            include: {
              product: { select: { name: true, sku: true } }
            }
          }
        }
      });
      return po;
    });

    revalidatePath("/purchases");
    revalidatePath("/vendors");
    revalidatePath("/products");
    return { success: true, po: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    console.error("Failed to update purchase order:", error);
    return { error: "Failed to update purchase order: " + error.message };
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

export async function deletePurchaseOrder(poId: string) {
  if (!await canManagePurchases()) return { error: "Unauthorized" };

  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        items: true,
        bills: true
      }
    });

    if (!po) return { error: "Purchase Order not found" };

    if (po.bills && po.bills.length > 0) {
      return {
        error: `Cannot delete PO #${po.poNumber} because it is linked to ${po.bills.length} vendor bill(s). Please delete or unlink the bills first.`
      };
    }

    await prisma.$transaction(async (tx) => {
      // 1. If any items were received (GRN), reverse the inventory additions
      for (const it of po.items) {
        if (it.receivedQty > 0) {
          await tx.product.update({
            where: { id: it.productId },
            data: { stockQuantity: { decrement: it.receivedQty } }
          }).catch(() => {});

          await tx.inventoryTransaction.create({
            data: {
              productId: it.productId,
              type: 'OUT',
              quantity: it.receivedQty,
              reference: `CANCEL-${po.poNumber}`,
              notes: `Stock reversed due to cancellation/deletion of Purchase Order #${po.poNumber}`
            }
          }).catch(() => {});
        }
      }

      // 2. Delete PO Items
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: poId } });

      // 3. Delete PO
      await tx.purchaseOrder.delete({ where: { id: poId } });
    });

    revalidatePath("/purchases");
    revalidatePath("/products");
    revalidatePath("/vendors");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete purchase order:", error);
    return { error: error.message || "Failed to delete purchase order" };
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
      const po = await tx.purchaseOrder.findUnique({ where: { id: poId } });
      const refCode = po ? po.poNumber : poId;

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
            reference: `GRN-${refCode}`,
            warehouseId: warehouseId || null,
            employeeId: employee?.id || null,
            notes: `Goods received against PO #${refCode}`
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
