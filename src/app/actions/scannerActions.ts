"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function lookupBarcode(rawCode: string) {
  if (!rawCode || !rawCode.trim()) {
    return { error: "Barcode/QR code cannot be empty" };
  }

  const code = rawCode.trim();

  try {
    // 1. Try matching Product by SKU or Article Number or ID
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { sku: { equals: code, mode: "insensitive" } },
          { articleNumber: { equals: code, mode: "insensitive" } },
          { id: code }
        ]
      }
    });

    if (product) {
      return {
        type: "PRODUCT" as const,
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku || "",
          articleNumber: product.articleNumber || "",
          category: product.category,
          stockQuantity: product.stockQuantity,
          minimumStock: product.minimumStock,
          sellingPrice: product.sellingPrice,
          mrp: product.mrp,
          hsnCode: product.hsnCode || ""
        }
      };
    }

    // 2. Try matching Order by Order Number, AWB Number, or ID
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderNumber: { equals: code, mode: "insensitive" } },
          { awbNumber: { equals: code, mode: "insensitive" } },
          { id: code }
        ]
      },
      include: {
        customer: { select: { businessName: true, city: true, state: true, pincode: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, articleNumber: true, stockQuantity: true } }
          }
        },
        invoices: { select: { invoiceNumber: true } }
      }
    });

    if (order) {
      return {
        type: "ORDER" as const,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          orderStatus: order.orderStatus,
          customerName: order.customer.businessName,
          customerLocation: `${order.customer.city || ""}, ${order.customer.state || ""}`.trim(),
          invoiceNumber: order.invoices?.[0]?.invoiceNumber || null,
          totalValue: order.totalValue,
          awbNumber: order.awbNumber,
          courierName: order.courierName,
          items: order.items.map(item => ({
            id: item.id,
            productId: item.productId,
            name: item.product.name,
            sku: item.product.sku || item.product.articleNumber || "N/A",
            articleNumber: item.product.articleNumber,
            quantity: item.quantity,
            rate: item.rate
          }))
        }
      };
    }

    return { error: `No product or order found matching code: "${code}"` };
  } catch (error) {
    console.error("Lookup barcode error:", error);
    return { error: "Failed to query database for barcode." };
  }
}

export async function getOrderPackingDetails(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { businessName: true, city: true, state: true, pincode: true, mobile: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, articleNumber: true, stockQuantity: true } }
          }
        },
        invoices: { select: { invoiceNumber: true } }
      }
    });

    if (!order) {
      return { error: "Order not found" };
    }

    return {
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        customerName: order.customer.businessName,
        customerLocation: `${order.customer.city || ""}, ${order.customer.state || ""}`.trim(),
        invoiceNumber: order.invoices?.[0]?.invoiceNumber || null,
        totalValue: order.totalValue,
        awbNumber: order.awbNumber,
        courierName: order.courierName,
        items: order.items.map(item => ({
          id: item.id,
          productId: item.productId,
          name: item.product.name,
          sku: item.product.sku || item.product.articleNumber || "N/A",
          articleNumber: item.product.articleNumber,
          quantity: item.quantity,
          rate: item.rate
        }))
      }
    };
  } catch (error) {
    console.error("Get order packing details error:", error);
    return { error: "Failed to fetch order packing details." };
  }
}

export async function completeOrderPacking(orderId: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: "Packed"
      }
    });

    revalidatePath("/dispatches");
    revalidatePath("/orders");
    return { success: true, orderNumber: updated.orderNumber };
  } catch (error) {
    console.error("Complete packing error:", error);
    return { error: "Failed to mark order as packed." };
  }
}

export async function dispatchOrderByAWB(orderId: string, awbNumber: string, courierName?: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: "Unauthorized" };
  }

  if (!awbNumber || !awbNumber.trim()) {
    return { error: "AWB Number is required" };
  }

  try {
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: "Dispatched",
        awbNumber: awbNumber.trim(),
        courierName: courierName?.trim() || "Standard Courier",
        dispatchDate: new Date(),
        shippingStatus: "In Transit"
      }
    });

    revalidatePath("/dispatches");
    revalidatePath("/orders");
    return { success: true, orderNumber: updated.orderNumber };
  } catch (error) {
    console.error("Dispatch order by AWB error:", error);
    return { error: "Failed to dispatch order with AWB." };
  }
}
