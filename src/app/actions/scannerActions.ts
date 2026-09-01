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
    // 1. Try matching Product by exact SKU, Article Number, ID, Name or HSN
    let product = await prisma.product.findFirst({
      where: {
        OR: [
          { sku: { equals: code, mode: "insensitive" } },
          { articleNumber: { equals: code, mode: "insensitive" } },
          { name: { equals: code, mode: "insensitive" } },
          { hsnCode: { equals: code, mode: "insensitive" } },
          { id: code }
        ]
      }
    });

    // 1.1 Try matching Product Batch by Batch / Barcode Number
    if (!product) {
      const batch = await prisma.productBatch.findFirst({
        where: {
          batchNumber: { equals: code, mode: "insensitive" }
        },
        include: { product: true }
      });
      if (batch && batch.product) {
        product = batch.product;
      }
    }

    // 1.2 Try partial contains match on SKU or Article Number or Name
    if (!product) {
      product = await prisma.product.findFirst({
        where: {
          OR: [
            { sku: { contains: code, mode: "insensitive" } },
            { articleNumber: { contains: code, mode: "insensitive" } },
            { name: { contains: code, mode: "insensitive" } }
          ]
        }
      });
    }

    if (product) {
      return {
        type: "PRODUCT" as const,
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku || product.articleNumber || "",
          articleNumber: product.articleNumber || product.sku || "",
          category: product.category,
          stockQuantity: product.stockQuantity,
          minimumStock: product.minimumStock,
          sellingPrice: product.sellingPrice,
          mrp: product.mrp,
          hsnCode: product.hsnCode || "6109",
          weight: product.weight || 0,
          description: product.description || ""
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

    return {
      type: "RAW" as const,
      code: code,
      error: `No product or order found matching code: "${code}"`
    };
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

export async function createMobileScanSession(mode: string = "INVENTORY", orderId?: string) {
  try {
    const randomCode = `SC-${Math.floor(1000 + Math.random() * 9000)}`;
    const newSession = await prisma.mobileScanSession.create({
      data: {
        sessionCode: randomCode,
        mode: mode,
        orderId: orderId || null,
        status: "ACTIVE"
      }
    });

    return { success: true, sessionCode: newSession.sessionCode, id: newSession.id };
  } catch (error) {
    console.error("Create mobile scan session error:", error);
    return { error: "Failed to create mobile scan session." };
  }
}

export async function getMobileScanUpdate(sessionCode: string) {
  if (!sessionCode) return { error: "Session code required" };
  const cleanSession = sessionCode.trim().toUpperCase();
  try {
    const session = await prisma.mobileScanSession.findUnique({
      where: { sessionCode: cleanSession }
    });

    if (!session) return { error: "Session not found" };

    const scanned = session.scannedCode;
    if (scanned) {
      // Clear scanned code so it's not processed twice
      await prisma.mobileScanSession.update({
        where: { id: session.id },
        data: { scannedCode: null, status: "CONNECTED" }
      });
    }

    return {
      success: true,
      scannedCode: scanned,
      status: session.status,
      mode: session.mode,
      orderId: session.orderId
    };
  } catch (error) {
    console.error("Get mobile scan update error:", error);
    return { error: "Failed to poll mobile scan update." };
  }
}

export async function pushMobileScan(sessionCode: string, code: string) {
  if (!sessionCode || !code) return { error: "Session code and scanned code required" };
  const cleanSession = sessionCode.trim().toUpperCase();
  const cleanCode = code.trim();

  try {
    const session = await prisma.mobileScanSession.findUnique({
      where: { sessionCode: cleanSession }
    });

    if (!session) {
      // Resilient Auto-Reactivate: Never reject a valid mobile scan
      await prisma.mobileScanSession.create({
        data: {
          sessionCode: cleanSession,
          scannedCode: cleanCode,
          status: "CONNECTED",
          mode: "INVENTORY"
        }
      });
      return { success: true };
    }

    await prisma.mobileScanSession.update({
      where: { id: session.id },
      data: {
        scannedCode: cleanCode,
        status: "CONNECTED",
        updatedAt: new Date()
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Push mobile scan error:", error);
    return { error: "Failed to push scan code." };
  }
}

export async function pingMobileConnect(sessionCode: string) {
  if (!sessionCode) return { error: "Session code required" };
  const cleanSession = sessionCode.trim().toUpperCase();

  try {
    const session = await prisma.mobileScanSession.findUnique({
      where: { sessionCode: cleanSession }
    });

    if (!session) {
      // Auto-register session if missing so pairing never times out or fails
      const created = await prisma.mobileScanSession.create({
        data: {
          sessionCode: cleanSession,
          status: "CONNECTED",
          mode: "INVENTORY"
        }
      });
      return { success: true, mode: created.mode, orderId: created.orderId };
    }

    await prisma.mobileScanSession.update({
      where: { id: session.id },
      data: {
        status: "CONNECTED",
        updatedAt: new Date()
      }
    });

    return { success: true, mode: session.mode, orderId: session.orderId };
  } catch (error) {
    console.error("Ping mobile connect error:", error);
    return { error: "Failed to connect session." };
  }
}

export async function closeMobileScanSession(sessionCode: string) {
  if (!sessionCode) return { error: "Session code required" };
  const cleanSession = sessionCode.trim().toUpperCase();
  try {
    await prisma.mobileScanSession.updateMany({
      where: { sessionCode: cleanSession },
      data: { status: "COMPLETED" }
    });
    return { success: true };
  } catch (error) {
    console.error("Close mobile scan session error:", error);
    return { error: "Failed to close session." };
  }
}

