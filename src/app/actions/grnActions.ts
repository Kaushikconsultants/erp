"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { generateNextDocumentNumber } from "@/lib/documentNumbering";

export interface GrnItemInput {
  productId: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason?: string;
  batchNumber?: string;
  unitCost?: number;
}

export interface CreateGrnInput {
  purchaseOrderId?: string;
  vendorId: string;
  warehouseId: string;
  challanNumber?: string;
  challanDate?: string;
  remarks?: string;
  inspectedBy?: string;
  items: GrnItemInput[];
}

export async function createGoodsReceiptNote(data: CreateGrnInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const organizationId = await getTenantOrgId();
    if (!organizationId) return { error: "Organization context not found." };

    if (!data.vendorId) return { error: "Please select a vendor." };
    if (!data.warehouseId) return { error: "Please select a receiving warehouse." };
    if (!data.items || data.items.length === 0) {
      return { error: "Please add at least one item to the Goods Receipt Note." };
    }

    // Determine QC status
    let totalAccepted = 0;
    let totalRejected = 0;
    for (const it of data.items) {
      totalAccepted += Number(it.acceptedQty) || 0;
      totalRejected += Number(it.rejectedQty) || 0;
    }

    let qcStatus = "PASSED";
    if (totalAccepted === 0 && totalRejected > 0) {
      qcStatus = "REJECTED";
    } else if (totalRejected > 0) {
      qcStatus = "PARTIALLY_PASSED";
    }

    const grnNumber = await generateNextDocumentNumber(organizationId, 'GRN');

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create GRN
      const grn = await tx.goodsReceiptNote.create({
        data: {
          organizationId,
          grnNumber,
          purchaseOrderId: data.purchaseOrderId || null,
          vendorId: data.vendorId,
          warehouseId: data.warehouseId,
          challanNumber: data.challanNumber || null,
          challanDate: data.challanDate ? new Date(data.challanDate) : null,
          receivedDate: new Date(),
          status: "COMPLETED",
          qcStatus,
          remarks: data.remarks || null,
          inspectedBy: data.inspectedBy || session.user?.name || "Quality Inspector",
          items: {
            create: data.items.map(it => ({
              productId: it.productId,
              orderedQty: Number(it.orderedQty) || 0,
              receivedQty: Number(it.receivedQty) || 0,
              acceptedQty: Number(it.acceptedQty) || 0,
              rejectedQty: Number(it.rejectedQty) || 0,
              rejectionReason: it.rejectionReason || null,
              batchNumber: it.batchNumber || null,
              unitCost: Number(it.unitCost) || 0
            }))
          }
        },
        include: {
          vendor: true,
          warehouse: true,
          purchaseOrder: true,
          items: { include: { product: true } }
        }
      });

      // 2. Increment warehouse stock & product stock for accepted quantities
      for (const it of data.items) {
        const accepted = Number(it.acceptedQty) || 0;
        if (accepted > 0 && it.productId) {
          // Upsert WarehouseStock
          await tx.warehouseStock.upsert({
            where: {
              warehouseId_productId: {
                warehouseId: data.warehouseId,
                productId: it.productId
              }
            },
            create: {
              organizationId,
              warehouseId: data.warehouseId,
              productId: it.productId,
              quantityOnHand: accepted
            },
            update: {
              quantityOnHand: { increment: accepted }
            }
          });

          // Increment Product.stockQuantity
          await tx.product.update({
            where: { id: it.productId },
            data: { stockQuantity: { increment: Math.round(accepted) } }
          }).catch(() => {});

          // Record InventoryTransaction
          await tx.inventoryTransaction.create({
            data: {
              productId: it.productId,
              warehouseId: data.warehouseId,
              quantity: Math.round(accepted),
              type: "IN",
              reference: grnNumber,
              notes: `Inwarded via GRN #${grnNumber} (QC: ${qcStatus})`
            }
          }).catch(() => {});
        }
      }

      // 3. If linked to Purchase Order, update PO item received quantities and PO status
      if (data.purchaseOrderId) {
        for (const it of data.items) {
          const received = Number(it.receivedQty) || 0;
          if (received > 0 && it.productId) {
            await tx.purchaseOrderItem.updateMany({
              where: {
                purchaseOrderId: data.purchaseOrderId,
                productId: it.productId
              },
              data: {
                receivedQty: { increment: Math.round(received) }
              }
            }).catch(() => {});
          }
        }

        // Check if all items in PO are fully received
        const poItems = await tx.purchaseOrderItem.findMany({
          where: { purchaseOrderId: data.purchaseOrderId }
        });

        const allReceived = poItems.length > 0 && poItems.every(p => p.receivedQty >= p.quantity);
        const partiallyReceived = poItems.some(p => p.receivedQty > 0);

        await tx.purchaseOrder.update({
          where: { id: data.purchaseOrderId },
          data: {
            status: allReceived ? "Received" : (partiallyReceived ? "Partially Received" : "Issued")
          }
        });
      }

      return grn;
    });

    revalidatePath("/purchases/grn");
    revalidatePath("/purchases");
    revalidatePath("/products");
    revalidatePath("/warehouses");

    return { success: true, grn: result };
  } catch (error: any) {
    console.error("createGoodsReceiptNote error:", error);
    return { error: error?.message || "Failed to create Goods Receipt Note" };
  }
}

export async function getGoodsReceiptNotes(filters?: {
  search?: string;
  qcStatus?: string;
  warehouseId?: string;
  vendorId?: string;
}) {
  try {
    const organizationId = await getTenantOrgId();
    const where: any = {
      ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {})
    };

    if (filters?.qcStatus && filters.qcStatus !== "All") {
      where.qcStatus = filters.qcStatus;
    }

    if (filters?.warehouseId && filters.warehouseId !== "All") {
      where.warehouseId = filters.warehouseId;
    }

    if (filters?.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters?.search) {
      const q = filters.search.trim();
      where.OR = [
        { grnNumber: { contains: q, mode: "insensitive" } },
        { challanNumber: { contains: q, mode: "insensitive" } },
        { vendor: { companyName: { contains: q, mode: "insensitive" } } },
        { purchaseOrder: { poNumber: { contains: q, mode: "insensitive" } } }
      ];
    }

    const grns = await prisma.goodsReceiptNote.findMany({
      where,
      include: {
        vendor: true,
        warehouse: true,
        purchaseOrder: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, grns };
  } catch (error: any) {
    console.error("getGoodsReceiptNotes error:", error);
    return { success: false, error: error?.message || "Failed to fetch GRNs", grns: [] };
  }
}

export async function getGoodsReceiptNoteById(id: string) {
  try {
    const grn = await prisma.goodsReceiptNote.findUnique({
      where: { id },
      include: {
        vendor: true,
        warehouse: true,
        purchaseOrder: true,
        items: {
          include: { product: true }
        }
      }
    });

    if (!grn) return { error: "Goods Receipt Note not found" };
    return { success: true, grn };
  } catch (error: any) {
    return { error: error?.message || "Failed to fetch GRN" };
  }
}

export async function deleteGoodsReceiptNote(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const organizationId = await getTenantOrgId();

    const existing = await prisma.goodsReceiptNote.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existing) return { error: "GRN not found" };
    if (organizationId && existing.organizationId && existing.organizationId !== organizationId) {
      return { error: "Unauthorized" };
    }

    await prisma.$transaction(async (tx) => {
      // Reverse stock for accepted quantities
      for (const it of existing.items) {
        if (it.acceptedQty > 0) {
          await tx.warehouseStock.update({
            where: {
              warehouseId_productId: {
                warehouseId: existing.warehouseId,
                productId: it.productId
              }
            },
            data: {
              quantityOnHand: { decrement: it.acceptedQty }
            }
          }).catch(() => {});

          await tx.product.update({
            where: { id: it.productId },
            data: {
              stockQuantity: { decrement: Math.round(it.acceptedQty) }
            }
          }).catch(() => {});

          await tx.inventoryTransaction.create({
            data: {
              productId: it.productId,
              warehouseId: existing.warehouseId,
              quantity: Math.round(it.acceptedQty),
              type: "OUT",
              reference: `REV-${existing.grnNumber}`,
              notes: `Stock reversed due to deletion of GRN #${existing.grnNumber}`
            }
          }).catch(() => {});
        }
      }

      // Delete items and GRN
      await tx.goodsReceiptNoteItem.deleteMany({ where: { grnId: id } });
      await tx.goodsReceiptNote.delete({ where: { id } });
    });

    revalidatePath("/purchases/grn");
    revalidatePath("/purchases");
    revalidatePath("/products");
    revalidatePath("/warehouses");

    return { success: true };
  } catch (error: any) {
    return { error: error?.message || "Failed to delete Goods Receipt Note" };
  }
}

export async function deleteMultipleGoodsReceiptNotes(ids: string[]) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };
    if (!ids || ids.length === 0) return { error: "No GRNs selected to delete." };

    const organizationId = await getTenantOrgId();

    const grns = await prisma.goodsReceiptNote.findMany({
      where: {
        id: { in: ids },
        ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {})
      },
      include: { items: true }
    });

    if (grns.length === 0) return { error: "No matching GRNs found to delete." };

    const validIds = grns.map(g => g.id);

    await prisma.$transaction(async (tx) => {
      for (const grn of grns) {
        for (const it of grn.items) {
          if (it.acceptedQty > 0) {
            await tx.warehouseStock.update({
              where: {
                warehouseId_productId: {
                  warehouseId: grn.warehouseId,
                  productId: it.productId
                }
              },
              data: { quantityOnHand: { decrement: it.acceptedQty } }
            }).catch(() => {});

            await tx.product.update({
              where: { id: it.productId },
              data: { stockQuantity: { decrement: Math.round(it.acceptedQty) } }
            }).catch(() => {});

            await tx.inventoryTransaction.create({
              data: {
                productId: it.productId,
                warehouseId: grn.warehouseId,
                quantity: Math.round(it.acceptedQty),
                type: "OUT",
                reference: `REV-${grn.grnNumber}`,
                notes: `Stock reversed due to bulk deletion of GRN #${grn.grnNumber}`
              }
            }).catch(() => {});
          }
        }
      }

      await tx.goodsReceiptNoteItem.deleteMany({ where: { grnId: { in: validIds } } });
      await tx.goodsReceiptNote.deleteMany({ where: { id: { in: validIds } } });
    });

    revalidatePath("/purchases/grn");
    revalidatePath("/purchases");
    revalidatePath("/products");
    revalidatePath("/warehouses");

    return { success: true, count: validIds.length };
  } catch (error: any) {
    return { error: error?.message || "Failed to delete selected GRNs" };
  }
}
