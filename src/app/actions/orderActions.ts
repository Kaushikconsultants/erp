"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchRealTimeTracking } from "@/lib/shippingAggregator";
import { calculateItemGst } from "@/lib/gstUtils";
import { getCompanySettings } from "./companyActions";
import { shipmozoService, RateCalculationParams } from "@/lib/shipmozoService";
import { getTenantOrgId } from "@/lib/tenant";

export async function createOrder(formData: FormData) {
  const customerId = formData.get("customerId") as string;
  const productId = formData.get("productId") as string;
  const quantity = parseInt(formData.get("quantity") as string, 10);
  const status = formData.get("status") as string || "Processing";
  const providedSalespersonId = formData.get("salespersonId") as string;

  if (!customerId || !productId || isNaN(quantity) || quantity <= 0) {
    return { error: "Customer, Product, and a valid Quantity are required" };
  }

  try {
    const organizationId = await getTenantOrgId();

    const product = await prisma.product.findFirst({
      where: { id: productId, organizationId },
    });

    if (!product) {
      return { error: "Product not found" };
    }
    
    const customer = await prisma.customer.findFirst({ where: { id: customerId, organizationId } });
    if (!customer) return { error: "Customer not found" };

    const session = await getServerSession(authOptions);
    const rawRole = (session?.user as any)?.role || 'SALES';
    const normRole = String(rawRole).trim().toUpperCase();
    const isAdmin = normRole === 'ADMIN' || normRole === 'SUPER_ADMIN';

    let finalSalespersonId = providedSalespersonId;

    if (!isAdmin && session?.user) {
      const userId = (session.user as any).id;
      let employee = await prisma.employee.findUnique({ where: { userId } });
      if (!employee && organizationId) {
        employee = await prisma.employee.findFirst({ where: { organizationId, userId } });
      }
      if (!employee && session.user.email) {
        employee = await prisma.employee.findFirst({
          where: {
            organizationId,
            user: { email: { equals: session.user.email.trim(), mode: 'insensitive' } }
          }
        });
      }
      if (employee) {
        if (customer.assignedSalespersonId && customer.assignedSalespersonId !== employee.id) {
          return { error: "Permission Denied: You can only create orders for your assigned customers." };
        }
        finalSalespersonId = employee.id;
      }
    }

    if (!finalSalespersonId && customer.assignedSalespersonId) {
      finalSalespersonId = customer.assignedSalespersonId;
    }

    if (!finalSalespersonId) {
      const employee = await prisma.employee.findFirst({ where: { organizationId } });
      if (!employee) {
        return { error: "No salesperson found for this organization" };
      }
      finalSalespersonId = employee.id;
    }

    const companyRes = await getCompanySettings();
    const companyState = companyRes.settings?.state || "Delhi";
    const customerState = customer.state || companyState;
    const isInterstate = companyState.trim().toLowerCase() !== customerState.trim().toLowerCase();

    const gstRate = 12; // Standard apparel GST
    const breakdown = calculateItemGst(product.sellingPrice, quantity, gstRate, isInterstate);

    const subtotal = breakdown.taxableAmount;
    const cgst = breakdown.cgstAmount;
    const sgst = breakdown.sgstAmount;
    const igst = breakdown.igstAmount;
    const totalTax = breakdown.taxTotal;
    const totalValue = breakdown.totalAmount;

    const order = await prisma.order.create({
      data: {
        organizationId,
        orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
        customerId,
        salespersonId: finalSalespersonId,
        placeOfSupply: customerState,
        isInterstate,
        subtotal,
        discount: 0,
        tax: totalTax,
        cgst,
        sgst,
        igst,
        totalValue,
        outstandingAmount: totalValue,
        orderStatus: status,
        items: {
          create: [
            {
              productId,
              quantity,
              rate: product.sellingPrice,
              hsnCode: "6109",
              gstRate,
              cgst,
              sgst,
              igst,
              total: totalValue,
            }
          ]
        }
      },
    });

    // Deduct stock and record inventory transaction
    await prisma.product.update({
      where: { id: productId },
      data: { stockQuantity: { decrement: quantity } }
    });

    await prisma.inventoryTransaction.create({
      data: {
        productId,
        quantity,
        type: 'OUT',
        reference: order.orderNumber,
        notes: `Sales Order ${order.orderNumber} created for ${customer.businessName || customer.contactPerson}`
      }
    });

    // Automatically generate invoice for this order
    const invoiceCount = await prisma.invoice.count({ where: { organizationId } });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(5, '0')}`;

    await prisma.invoice.create({
      data: {
        organizationId,
        invoiceNumber,
        customerId,
        orderId: order.id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: subtotal,
        taxAmount: totalTax,
        discountAmount: 0,
        totalAmount: totalValue,
        amountPaid: 0,
        amountDue: totalValue,
        status: 'Unpaid',
        paymentTerms: 'Net 30',
        notes: `Sales Order ${order.orderNumber}`
      }
    });

    revalidatePath("/orders");
    revalidatePath("/invoices");
    revalidatePath("/products");
    revalidatePath("/", "layout");
    return { success: true, order };
  } catch (error) {
    console.error("Failed to create order:", error);
    return { error: "Failed to create order. Please try again." };
  }
}

export async function getOrderById(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        salesperson: { include: { user: true } },
        items: { include: { product: true } }
      }
    });

    if (!order) return { error: "Order not found" };
    return { success: true, order };
  } catch (error) {
    return { error: "Failed to fetch order details" };
  }
}

export async function getDispatchedOrders() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const organizationId = await getTenantOrgId();
    const role = (session.user as any).role;
    const userId = (session.user as any).id;

    let whereClause: any = { organizationId, orderStatus: "Dispatched" };

    // If Sales, only show their dispatched orders
    if (role === "SALES" || role === "TELECALLER") {
      const employee = await prisma.employee.findFirst({ where: { userId, organizationId } });
      if (!employee) return { error: "Employee profile not found" };
      whereClause.salespersonId = employee.id;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        customer: true,
        salesperson: { include: { user: true } }
      },
      orderBy: { dispatchDate: "desc" }
    });

    return { success: true, orders };
  } catch (error) {
    console.error("Error fetching dispatched orders:", error);
    return { error: "Failed to load orders" };
  }
}

export async function updateDispatchDetails(orderId: string, awbNumber: string, courierName: string) {
  try {
    const organizationId = await getTenantOrgId();
    const order = await prisma.order.updateMany({
      where: { id: orderId, organizationId },
      data: {
        awbNumber,
        courierName,
        dispatchDate: new Date(),
        shippingStatus: "Manifested",
        orderStatus: "Dispatched" // In case it wasn't already set
      }
    });
    revalidatePath("/dispatches");
    return { success: true, order };
  } catch (error) {
    return { error: "Failed to update dispatch details" };
  }
}

export async function trackOrder(orderId: string) {
  try {
    const organizationId = await getTenantOrgId();
    const order = await prisma.order.findFirst({ where: { id: orderId, organizationId } });
    if (!order) return { error: "Order not found" };
    if (!order.awbNumber) return { error: "No AWB Number found for this order" };

    const trackingData = await fetchRealTimeTracking(order.awbNumber, order.courierName || "Unknown");
    
    // Optionally update the DB with latest status
    if (trackingData.success && trackingData.currentStatus !== order.shippingStatus) {
      await prisma.order.updateMany({
        where: { id: orderId, organizationId },
        data: { shippingStatus: trackingData.currentStatus }
      });
      revalidatePath("/dispatches");
    }

    return trackingData;
  } catch (error) {
    return { error: "Tracking failed" };
  }
}

// ─── NEW DISPATCH PIPELINE ACTIONS ───

export async function getDispatchPipelineOrders() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const organizationId = await getTenantOrgId();

    // Fetch all orders in dispatch pipeline states
    const orders = await prisma.order.findMany({
      where: {
        organizationId,
        orderStatus: { in: ["Processing", "Packing", "Packed", "Dispatched"] }
      },
      include: {
        customer: { select: { businessName: true, state: true, city: true, pincode: true } },
        invoices: { select: { id: true, invoiceNumber: true } }
      },
      orderBy: { orderDate: "desc" }
    });

    return { success: true, orders };
  } catch (error) {
    console.error("Failed to fetch pipeline orders:", error);
    return { error: "Failed to fetch pipeline orders" };
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const organizationId = await getTenantOrgId();

    const order = await prisma.order.updateMany({
      where: { id: orderId, organizationId },
      data: { 
        orderStatus: status,
        shippingStatus: status === "Packed" ? "Packed" : status === "Dispatched" ? "Manifested" : undefined
      }
    });

    revalidatePath("/dispatches");
    revalidatePath("/orders");
    return { success: true, order };
  } catch (error) {
    console.error("Failed to update status:", error);
    return { error: "Failed to update order status" };
  }
}

// ─── SHIPPING INTEGRATION ACTIONS ───

export async function calculateShippingRates(params: RateCalculationParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const ratesResponse = await shipmozoService.calculateRates(params);
    return ratesResponse;
  } catch (error) {
    console.error("Failed to calculate shipping rates:", error);
    return { error: "Failed to calculate shipping rates" };
  }
}

