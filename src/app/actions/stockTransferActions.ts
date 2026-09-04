"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export interface CreateTransferItemInput {
  productId: string;
  quantitySent: number;
  batchNumber?: string;
  unitPrice?: number;
}

export interface CreateStockTransferInput {
  fromWarehouseId: string;
  toWarehouseId: string;
  transporterName?: string;
  vehicleNumber?: string;
  lrNumber?: string;
  notes?: string;
  items: CreateTransferItemInput[];
}

/**
 * Fetch all Stock Transfers for the organization
 */
export async function getStockTransfers() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };
    const organizationId = await getTenantOrgId();

    const [transfers, warehouses, products] = await Promise.all([
      prisma.stockTransfer.findMany({
        where: { organizationId },
        include: {
          fromWarehouse: true,
          toWarehouse: true,
          items: {
            include: { product: true }
          }
        },
        orderBy: { transferDate: 'desc' }
      }),
      prisma.warehouse.findMany({
        where: { organizationId },
        select: { id: true, name: true, code: true, address: true }
      }),
      prisma.product.findMany({
        where: { organizationId },
        select: { id: true, name: true, sku: true, stockQuantity: true, sellingPrice: true, purchasePrice: true }
      })
    ]);

    return {
      success: true,
      transfers,
      warehouses,
      products
    };
  } catch (err: any) {
    console.error("Error fetching stock transfers:", err);
    return { success: false, error: err.message || "Failed to load stock transfers" };
  }
}

/**
 * Create and dispatch a Stock Transfer (deducts stock from source warehouse)
 */
export async function createStockTransfer(input: CreateStockTransferInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };
    const organizationId = await getTenantOrgId();

    if (!input.fromWarehouseId || !input.toWarehouseId || !input.items || input.items.length === 0) {
      return { success: false, error: "Source, destination warehouse and transfer items are required." };
    }

    if (input.fromWarehouseId === input.toWarehouseId) {
      return { success: false, error: "Source and destination warehouses cannot be the same." };
    }

    const transferNumber = `STN-${Date.now().toString().slice(-6)}`;
    let totalQuantity = 0;
    let totalValue = 0;

    const transferItemsData = input.items.map(it => {
      const qty = Number(it.quantitySent) || 1;
      const price = Number(it.unitPrice) || 0;
      totalQuantity += qty;
      totalValue += qty * price;

      return {
        productId: it.productId,
        quantitySent: qty,
        quantityReceived: 0,
        unitPrice: price,
        totalPrice: qty * price,
        batchNumber: it.batchNumber?.trim() || null
      };
    });

    // 1. Create Transfer Record
    const transfer = await prisma.stockTransfer.create({
      data: {
        organizationId,
        transferNumber,
        fromWarehouseId: input.fromWarehouseId,
        toWarehouseId: input.toWarehouseId,
        transporterName: input.transporterName?.trim() || null,
        vehicleNumber: input.vehicleNumber?.trim() || null,
        lrNumber: input.lrNumber?.trim() || null,
        notes: input.notes?.trim() || null,
        status: "IN_TRANSIT",
        dispatchedDate: new Date(),
        totalQuantity,
        totalValue,
        items: {
          create: transferItemsData
        }
      }
    });

    // 2. Record Inventory Out Transactions from Source Warehouse
    for (const it of input.items) {
      await prisma.inventoryTransaction.create({
        data: {
          productId: it.productId,
          type: "OUT",
          quantity: it.quantitySent,
          reference: `Stock Transfer Out (${transferNumber})`,
          warehouseId: input.fromWarehouseId,
          notes: `Transferred to warehouse ${input.toWarehouseId}`
        }
      });

      // Deduct from product global stock count
      await prisma.product.update({
        where: { id: it.productId },
        data: { stockQuantity: { decrement: it.quantitySent } }
      });
    }

    revalidatePath("/warehouses/transfers");
    revalidatePath("/warehouses");
    revalidatePath("/products");
    return { success: true, transfer };
  } catch (err: any) {
    console.error("Error creating stock transfer:", err);
    return { success: false, error: err.message || "Failed to create stock transfer" };
  }
}

/**
 * Receive stock at Destination Warehouse (adds stock to destination)
 */
export async function receiveStockTransfer(transferId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: { items: true, toWarehouse: true }
    });

    if (!transfer) return { success: false, error: "Stock transfer not found" };
    if (transfer.status === 'RECEIVED') return { success: false, error: "Transfer has already been received." };

    const now = new Date();

    // 1. Update transfer status
    await prisma.stockTransfer.update({
      where: { id: transferId },
      data: {
        status: "RECEIVED",
        receivedDate: now
      }
    });

    // 2. Add inventory transactions & restore stock at destination warehouse
    for (const it of transfer.items) {
      await prisma.stockTransferItem.update({
        where: { id: it.id },
        data: { quantityReceived: it.quantitySent }
      });

      await prisma.inventoryTransaction.create({
        data: {
          productId: it.productId,
          type: "IN",
          quantity: it.quantitySent,
          reference: `Stock Transfer In (${transfer.transferNumber})`,
          warehouseId: transfer.toWarehouseId,
          notes: `Received at ${transfer.toWarehouse?.name || 'warehouse'}`
        }
      });

      await prisma.product.update({
        where: { id: it.productId },
        data: { stockQuantity: { increment: it.quantitySent } }
      });
    }

    revalidatePath("/warehouses/transfers");
    revalidatePath("/warehouses");
    revalidatePath("/products");
    return { success: true, message: `Transfer ${transfer.transferNumber} received successfully at ${transfer.toWarehouse?.name}.` };
  } catch (err: any) {
    console.error("Error receiving stock transfer:", err);
    return { success: false, error: err.message || "Failed to receive stock transfer" };
  }
}
