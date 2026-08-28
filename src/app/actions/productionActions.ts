"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getTenantOrgId } from "@/lib/tenant";
import { canUserAccessSection } from "@/lib/authPermissions";

async function canManageProduction() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  return await canUserAccessSection(session.user, "production");
}

// ─── GET WORK ORDERS (with KPI metrics) ──────────────────────
export async function getWorkOrders(filters?: {
  status?: string;
  sector?: string;
  search?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const hasAccess = await canUserAccessSection(session.user, "production");
  if (!hasAccess) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();

    const where: any = { organizationId };
    if (filters?.status && filters.status !== "All") where.status = filters.status;
    if (filters?.sector && filters.sector !== "All") where.sector = filters.sector;
    if (filters?.search) {
      where.OR = [
        { woNumber: { contains: filters.search, mode: "insensitive" } },
        { title: { contains: filters.search, mode: "insensitive" } },
        { finishedGoodsName: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const workOrders = await prisma.workOrder.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true, stockQuantity: true } },
        bom: { select: { id: true, bomCode: true, name: true } },
        materials: true,
        stages: { orderBy: { stageOrder: "asc" } },
        workerLogs: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // KPIs
    const total = workOrders.length;
    const active = workOrders.filter((w) => ["In Production", "Material Allocated", "In Planning"].includes(w.status)).length;
    const completed = workOrders.filter((w) => w.status === "Completed").length;
    const totalTargetQty = workOrders.reduce((acc, w) => acc + w.targetQty, 0);
    const totalCompletedQty = workOrders.reduce((acc, w) => acc + w.completedQty, 0);
    const totalRejectedQty = workOrders.reduce((acc, w) => acc + w.rejectedQty, 0);
    const wipValue = workOrders
      .filter((w) => !["Completed", "Cancelled"].includes(w.status))
      .reduce((acc, w) => acc + w.estimatedCost, 0);
    const efficiencyRate = totalTargetQty > 0 ? ((totalCompletedQty / totalTargetQty) * 100).toFixed(1) : "0";

    return {
      success: true,
      workOrders: JSON.parse(JSON.stringify(workOrders)),
      summary: {
        total,
        active,
        completed,
        totalTargetQty,
        totalCompletedQty,
        totalRejectedQty,
        wipValue,
        efficiencyRate,
      },
    };
  } catch (error: any) {
    return { error: "Failed to fetch work orders: " + error.message };
  }
}

// ─── CREATE WORK ORDER ────────────────────────────────────────
export async function createWorkOrder(data: {
  title: string;
  sector: string;
  finishedGoodsName: string;
  productId?: string;
  targetQty: number;
  variantMatrix?: Record<string, number>;
  bomId?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  priority?: string;
  estimatedCost?: number;
  notes?: string;
  stages: { stageName: string; stageOrder: number; assignedTo?: string }[];
  materials: {
    productId?: string;
    materialName: string;
    unit: string;
    requiredQty: number;
    unitCost?: number;
  }[];
}) {
  if (!(await canManageProduction())) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const count = await prisma.workOrder.count({ where: { organizationId } });
    const woNumber = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const totalMaterialCost = data.materials.reduce(
      (acc, m) => acc + (m.requiredQty * (m.unitCost || 0)),
      0
    );

    const workOrder = await prisma.workOrder.create({
      data: {
        organizationId,
        woNumber,
        title: data.title,
        sector: data.sector || "General",
        finishedGoodsName: data.finishedGoodsName,
        productId: data.productId || null,
        targetQty: data.targetQty,
        variantMatrix: data.variantMatrix ? JSON.stringify(data.variantMatrix) : null,
        bomId: data.bomId || null,
        plannedStartDate: data.plannedStartDate ? new Date(data.plannedStartDate) : null,
        plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate) : null,
        priority: data.priority || "Normal",
        estimatedCost: data.estimatedCost || totalMaterialCost,
        notes: data.notes || null,
        status: "In Planning",
        currentStage: data.stages?.[0]?.stageName || "Not Started",
        stages: {
          create: data.stages.map((s) => ({
            stageName: s.stageName,
            stageOrder: s.stageOrder,
            targetQty: data.targetQty,
            assignedTo: s.assignedTo || null,
            status: "Pending",
          })),
        },
        materials: {
          create: data.materials.map((m) => ({
            productId: m.productId || null,
            materialName: m.materialName,
            unit: m.unit,
            requiredQty: m.requiredQty,
            unitCost: m.unitCost || 0,
            totalCost: m.requiredQty * (m.unitCost || 0),
            status: "Pending",
          })),
        },
      },
      include: { stages: true, materials: true },
    });

    revalidatePath("/production");
    return { success: true, workOrder: JSON.parse(JSON.stringify(workOrder)) };
  } catch (error: any) {
    return { error: "Failed to create work order: " + error.message };
  }
}

// ─── UPDATE WORK ORDER STAGE ──────────────────────────────────
export async function updateWorkOrderStage(data: {
  workOrderId: string;
  stageId: string;
  completedQty: number;
  rejectedQty?: number;
  status: string;
  remarks?: string;
}) {
  if (!(await canManageProduction())) return { error: "Unauthorized" };

  try {
    const stage = await prisma.workOrderStage.update({
      where: { id: data.stageId },
      data: {
        completedQty: data.completedQty,
        rejectedQty: data.rejectedQty || 0,
        status: data.status,
        remarks: data.remarks || null,
        startedAt: data.status === "In Progress" ? new Date() : undefined,
        completedAt: data.status === "Completed" ? new Date() : undefined,
      },
    });

    // Update the WO's currentStage to next pending stage
    const allStages = await prisma.workOrderStage.findMany({
      where: { workOrderId: data.workOrderId },
      orderBy: { stageOrder: "asc" },
    });
    const nextPendingStage = allStages.find((s) => s.status === "Pending" && s.id !== data.stageId);
    const allDone = allStages.every((s) => s.status === "Completed" || s.id === data.stageId);

    await prisma.workOrder.update({
      where: { id: data.workOrderId },
      data: {
        currentStage: nextPendingStage?.stageName || (allDone ? "QA & Packing" : stage.stageName),
        status: allDone ? "QA & Packing" : "In Production",
      },
    });

    revalidatePath("/production");
    return { success: true, stage: JSON.parse(JSON.stringify(stage)) };
  } catch (error: any) {
    return { error: "Failed to update stage: " + error.message };
  }
}

// ─── COMPLETE WORK ORDER (Auto inward finished goods + deduct raw materials) ─
export async function completeWorkOrder(id: string, completedQty: number, rejectedQty: number = 0) {
  if (!(await canManageProduction())) return { error: "Unauthorized" };

  try {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: { materials: { include: { product: true } }, product: true },
    });
    if (!workOrder) return { error: "Work Order not found." };

    await prisma.$transaction(async (tx) => {
      // 1. Deduct raw material stocks that have linked products
      for (const mat of workOrder.materials) {
        if (mat.productId && mat.consumedQty > 0) {
          await tx.product.update({
            where: { id: mat.productId },
            data: { stockQuantity: { decrement: Math.round(mat.consumedQty) } },
          });
          await tx.inventoryTransaction.create({
            data: {
              productId: mat.productId,
              type: "OUT",
              quantity: Math.round(mat.consumedQty),
              reference: workOrder.woNumber,
              notes: `Raw material consumed for Work Order ${workOrder.woNumber}`,
            },
          });
        }
      }

      // 2. Inward finished goods if product is linked
      if (workOrder.productId && completedQty > 0) {
        await tx.product.update({
          where: { id: workOrder.productId },
          data: { stockQuantity: { increment: Math.round(completedQty) } },
        });
        await tx.inventoryTransaction.create({
          data: {
            productId: workOrder.productId,
            type: "IN",
            quantity: Math.round(completedQty),
            reference: workOrder.woNumber,
            notes: `Finished goods inwarded from Work Order ${workOrder.woNumber}`,
          },
        });
      }

      // 3. Mark all stages completed
      await tx.workOrderStage.updateMany({
        where: { workOrderId: id, status: { not: "Completed" } },
        data: { status: "Completed", completedAt: new Date() },
      });

      // 4. Mark Work Order completed
      await tx.workOrder.update({
        where: { id },
        data: {
          status: "Completed",
          currentStage: "Completed",
          completedQty,
          rejectedQty,
          actualEndDate: new Date(),
        },
      });
    });

    revalidatePath("/production");
    revalidatePath("/products");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to complete work order: " + error.message };
  }
}

// ─── LOG WORKER PIECE RATE ────────────────────────────────────
export async function logWorkerPieceRate(data: {
  workOrderId: string;
  workerName: string;
  employeeId?: string;
  operation: string;
  qtyProduced: number;
  qtyRejected?: number;
  pieceRate: number;
  logDate?: string;
  notes?: string;
}) {
  if (!(await canManageProduction())) return { error: "Unauthorized" };

  try {
    const earnedAmount = data.qtyProduced * data.pieceRate;
    const log = await prisma.workerProductionLog.create({
      data: {
        workOrderId: data.workOrderId,
        workerName: data.workerName,
        employeeId: data.employeeId || null,
        operation: data.operation,
        qtyProduced: data.qtyProduced,
        qtyRejected: data.qtyRejected || 0,
        pieceRate: data.pieceRate,
        earnedAmount,
        logDate: data.logDate ? new Date(data.logDate) : new Date(),
        notes: data.notes || null,
      },
    });

    revalidatePath("/production");
    return { success: true, log: JSON.parse(JSON.stringify(log)) };
  } catch (error: any) {
    return { error: "Failed to log piece rate: " + error.message };
  }
}

// ─── GET BOM LIST ────────────────────────────────────────────
export async function getBomList() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const boms = await prisma.billOfMaterials.findMany({
      where: { organizationId },
      include: {
        items: { include: { product: { select: { id: true, name: true, stockQuantity: true } } } },
        product: { select: { id: true, name: true, sku: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, boms: JSON.parse(JSON.stringify(boms)) };
  } catch (error: any) {
    return { error: "Failed to fetch BOMs: " + error.message };
  }
}

// ─── CREATE / SAVE BOM ───────────────────────────────────────
export async function saveBom(data: {
  id?: string;
  name: string;
  sector: string;
  finishedGoodsName: string;
  productId?: string;
  outputQty: number;
  outputUnit: string;
  laborCostPerUnit?: number;
  overheadPerUnit?: number;
  notes?: string;
  items: {
    productId?: string;
    materialName: string;
    unit: string;
    quantity: number;
    wastagePercent?: number;
    unitCost?: number;
  }[];
}) {
  if (!(await canManageProduction())) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const estimatedCostPerUnit = data.items.reduce((acc, item) => {
      const effectiveQty = item.quantity * (1 + (item.wastagePercent || 0) / 100);
      return acc + effectiveQty * (item.unitCost || 0);
    }, 0);

    let bom;
    if (data.id) {
      // Update existing BOM
      await prisma.bomItem.deleteMany({ where: { bomId: data.id } });
      bom = await prisma.billOfMaterials.update({
        where: { id: data.id },
        data: {
          name: data.name,
          sector: data.sector,
          finishedGoodsName: data.finishedGoodsName,
          productId: data.productId || null,
          outputQty: data.outputQty,
          outputUnit: data.outputUnit,
          estimatedCostPerUnit,
          laborCostPerUnit: data.laborCostPerUnit || 0,
          overheadPerUnit: data.overheadPerUnit || 0,
          notes: data.notes || null,
          items: {
            create: data.items.map((i) => ({
              productId: i.productId || null,
              materialName: i.materialName,
              unit: i.unit,
              quantity: i.quantity,
              wastagePercent: i.wastagePercent || 0,
              unitCost: i.unitCost || 0,
              totalCost: i.quantity * (1 + (i.wastagePercent || 0) / 100) * (i.unitCost || 0),
            })),
          },
        },
      });
    } else {
      const count = await prisma.billOfMaterials.count({ where: { organizationId } });
      const bomCode = `BOM-${String(count + 1).padStart(3, "0")}`;
      bom = await prisma.billOfMaterials.create({
        data: {
          organizationId,
          bomCode,
          name: data.name,
          sector: data.sector,
          finishedGoodsName: data.finishedGoodsName,
          productId: data.productId || null,
          outputQty: data.outputQty,
          outputUnit: data.outputUnit,
          estimatedCostPerUnit,
          laborCostPerUnit: data.laborCostPerUnit || 0,
          overheadPerUnit: data.overheadPerUnit || 0,
          notes: data.notes || null,
          items: {
            create: data.items.map((i) => ({
              productId: i.productId || null,
              materialName: i.materialName,
              unit: i.unit,
              quantity: i.quantity,
              wastagePercent: i.wastagePercent || 0,
              unitCost: i.unitCost || 0,
              totalCost: i.quantity * (1 + (i.wastagePercent || 0) / 100) * (i.unitCost || 0),
            })),
          },
        },
      });
    }

    revalidatePath("/production");
    return { success: true, bom: JSON.parse(JSON.stringify(bom)) };
  } catch (error: any) {
    return { error: "Failed to save BOM: " + error.message };
  }
}

// ─── DELETE WORK ORDER ────────────────────────────────────────
export async function deleteWorkOrder(id: string) {
  if (!(await canManageProduction())) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const wo = await prisma.workOrder.findFirst({ where: { id, organizationId } });
    if (!wo) return { error: "Work Order not found." };
    if (wo.status === "Completed") return { error: "Cannot delete a completed work order. It has already adjusted stock." };

    await prisma.$transaction([
      prisma.workerProductionLog.deleteMany({ where: { workOrderId: id } }),
      prisma.workOrderStage.deleteMany({ where: { workOrderId: id } }),
      prisma.workOrderMaterial.deleteMany({ where: { workOrderId: id } }),
      prisma.workOrder.delete({ where: { id } }),
    ]);

    revalidatePath("/production");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to delete work order: " + error.message };
  }
}
