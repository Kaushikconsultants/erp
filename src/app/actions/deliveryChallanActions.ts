"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function getDeliveryChallans(filters?: {
  challanType?: string;
  status?: string;
  customerId?: string;
  vendorId?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const where: any = { organizationId };

    if (filters?.challanType && filters.challanType !== "ALL") where.challanType = filters.challanType;
    if (filters?.status && filters.status !== "ALL") where.status = filters.status;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.vendorId) where.vendorId = filters.vendorId;

    const challans = await prisma.deliveryChallan.findMany({
      where,
      include: {
        customer: { select: { businessName: true, contactPerson: true, mobile: true, city: true } },
        vendor: { select: { companyName: true, contactPerson: true, mobile: true } },
        items: { include: { product: true } }
      },
      orderBy: { challanDate: "desc" }
    });

    return { success: true, challans: JSON.parse(JSON.stringify(challans)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createDeliveryChallan(data: {
  challanType: "JOB_WORK_OUT" | "SAMPLE_OUT" | "BRANCH_TRANSFER" | "CONSIGNMENT" | "SALE_ON_APPROVAL";
  challanDate?: string;
  customerId?: string;
  vendorId?: string;
  fromWarehouse?: string;
  toWarehouse?: string;
  transporterName?: string;
  vehicleNumber?: string;
  lrNumber?: string;
  notes?: string;
  items: {
    productId: string;
    description?: string;
    hsnCode?: string;
    quantity: number;
    unit?: string;
    rate?: number;
  }[];
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  if (!data.items || data.items.length === 0) {
    return { success: false, error: "At least one item is required in the delivery challan." };
  }

  try {
    const organizationId = await getTenantOrgId();
    const count = await prisma.deliveryChallan.count({ where: { organizationId } });
    const challanNumber = `DC-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    const totalQuantity = data.items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
    const totalValue = data.items.reduce((acc, it) => acc + ((Number(it.quantity) || 0) * (Number(it.rate) || 0)), 0);

    const challan = await prisma.deliveryChallan.create({
      data: {
        organizationId,
        challanNumber,
        challanDate: data.challanDate ? new Date(data.challanDate) : new Date(),
        challanType: data.challanType,
        customerId: data.customerId || null,
        vendorId: data.vendorId || null,
        fromWarehouse: data.fromWarehouse || "Main Godown",
        toWarehouse: data.toWarehouse || null,
        transporterName: data.transporterName || null,
        vehicleNumber: data.vehicleNumber || null,
        lrNumber: data.lrNumber || null,
        notes: data.notes || null,
        totalQuantity,
        totalValue,
        status: "ISSUED",
        items: {
          create: data.items.map(it => ({
            productId: it.productId,
            description: it.description || null,
            hsnCode: it.hsnCode || "6109",
            quantity: Number(it.quantity) || 1,
            unit: it.unit || "pcs",
            rate: Number(it.rate) || 0,
            total: (Number(it.quantity) || 1) * (Number(it.rate) || 0)
          }))
        }
      },
      include: { items: true }
    });

    // Adjust inventory (Material Out without Financial Impact)
    for (const it of data.items) {
      await prisma.product.update({
        where: { id: it.productId },
        data: { stockQuantity: { decrement: Number(it.quantity) || 0 } }
      }).catch(() => {});

      await prisma.inventoryTransaction.create({
        data: {
          productId: it.productId,
          type: "OUT",
          quantity: Number(it.quantity) || 0,
          reference: challanNumber,
          notes: `Material dispatched via Delivery Challan #${challanNumber} (${data.challanType})`
        }
      }).catch(() => {});
    }

    revalidatePath("/delivery-challans", "page");
    return { success: true, challan: JSON.parse(JSON.stringify(challan)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create delivery challan" };
  }
}

export async function convertChallanToInvoice(challanId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();

    const challan = await prisma.deliveryChallan.findUnique({
      where: { id: challanId },
      include: { customer: true, items: { include: { product: true } } }
    });

    if (!challan) return { success: false, error: "Delivery challan not found" };
    if (!challan.customerId) return { success: false, error: "Cannot convert to sales invoice: Challan is not assigned to a Customer" };
    if (challan.status === "CONVERTED_TO_INVOICE") return { success: false, error: "Challan has already been converted to an invoice" };

    const invCount = await prisma.invoice.count({ where: { organizationId } });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invCount + 1).padStart(5, "0")}`;

    const subtotal = challan.totalValue;
    const taxRate = 12; // Standard 12% for apparel
    const taxAmount = Number(((subtotal * taxRate) / 100).toFixed(2));
    const totalAmount = subtotal + taxAmount;

    // Create underlying Order with line items
    const defaultEmp = await prisma.employee.findFirst({
      where: organizationId ? { organizationId } : undefined
    });

    const order = await prisma.order.create({
      data: {
        organizationId,
        orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
        customerId: challan.customerId,
        salespersonId: defaultEmp?.id || "",
        orderDate: new Date(),
        subtotal,
        discount: 0,
        tax: taxAmount,
        cgst: Number((taxAmount / 2).toFixed(2)),
        sgst: Number((taxAmount / 2).toFixed(2)),
        igst: 0,
        totalValue: totalAmount,
        paymentReceived: 0,
        outstandingAmount: totalAmount,
        paymentStatus: "Unpaid",
        orderStatus: "Dispatched",
        shippingStatus: "Delivered",
        notes: `Converted from Delivery Challan #${challan.challanNumber}`,
        items: {
          create: challan.items.map(it => ({
            productId: it.productId,
            quantity: Math.round(it.quantity),
            rate: it.rate,
            hsnCode: it.hsnCode || "6109",
            gstRate: taxRate,
            cgst: Number(((it.total * (taxRate / 2)) / 100).toFixed(2)),
            sgst: Number(((it.total * (taxRate / 2)) / 100).toFixed(2)),
            igst: 0,
            total: it.total + Number(((it.total * taxRate) / 100).toFixed(2))
          }))
        }
      }
    });

    // Create Invoice
    const invoice = await prisma.invoice.create({
      data: {
        organizationId,
        invoiceNumber,
        customerId: challan.customerId,
        orderId: order.id,
        invoiceDate: new Date(),
        subtotal,
        taxAmount,
        discountAmount: 0,
        totalAmount,
        amountPaid: 0,
        amountDue: totalAmount,
        status: "Unpaid",
        notes: `Converted from Delivery Challan #${challan.challanNumber}`
      }
    });

    // Update Challan Status
    await prisma.deliveryChallan.update({
      where: { id: challanId },
      data: {
        status: "CONVERTED_TO_INVOICE",
        convertedInvoiceId: invoice.id
      }
    });

    revalidatePath("/delivery-challans", "page");
    revalidatePath("/invoices", "page");
    revalidatePath("/orders", "page");

    return {
      success: true,
      message: `Challan #${challan.challanNumber} converted to Tax Invoice #${invoiceNumber}`,
      invoiceId: invoice.id,
      invoiceNumber
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to convert challan to invoice" };
  }
}

export async function deleteDeliveryChallan(challanId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();

    const challan = await prisma.deliveryChallan.findFirst({
      where: { id: challanId, ...(organizationId ? { organizationId } : {}) },
      include: { items: true }
    });

    if (!challan) return { success: false, error: "Delivery Challan not found" };

    await prisma.$transaction(async (tx) => {
      // 1. Restock inventory if challan was not converted to invoice
      if (challan.status !== "CONVERTED_TO_INVOICE") {
        for (const it of challan.items) {
          if (it.productId && it.quantity > 0) {
            await tx.product.update({
              where: { id: it.productId },
              data: { stockQuantity: { increment: it.quantity } }
            }).catch(() => {});

            await tx.inventoryTransaction.create({
              data: {
                productId: it.productId,
                type: "IN",
                quantity: it.quantity,
                reference: challan.challanNumber,
                notes: `Stock returned upon deletion of Delivery Challan #${challan.challanNumber}`
              }
            }).catch(() => {});
          }
        }
      }

      // 2. Delete items & challan
      await tx.deliveryChallanItem.deleteMany({ where: { challanId } });
      await tx.deliveryChallan.delete({ where: { id: challanId } });
    });

    revalidatePath("/delivery-challans", "page");
    revalidatePath("/products", "page");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete delivery challan:", error);
    return { success: false, error: error.message || "Failed to delete delivery challan" };
  }
}
