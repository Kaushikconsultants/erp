"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateItemGst } from "@/lib/gstUtils";
import { getCompanySettings } from "./companyActions";

export async function createQuotation(data: {
  customerId: string;
  quotationNumber?: string;
  referenceNumber?: string;
  quoteDate?: string;
  expiryDate?: string;
  salespersonId?: string;
  status?: string;
  subject?: string;
  billingAddress?: string;
  shippingAddress?: string;
  currency?: string;
  paymentTerms?: string;
  priceList?: string;
  warehouse?: string;
  deliveryTerms?: string;
  shippingMethod?: string;
  expectedDeliveryDate?: string;
  shippingCharges?: number;
  additionalDiscount?: number;
  adjustment?: number;
  roundOff?: number;
  receivedAmount?: number;
  items: Array<{
    productId: string;
    sku?: string;
    description?: string;
    hsnCode?: string;
    quantity: number;
    unit?: string;
    rate: number;
    discountPercent?: number;
    discountAmount?: number;
    unitWeight?: number;
    gstRate?: number;
    warehouse?: string;
    availableStock?: number;
  }>;
  totalWeight?: number;
  notes?: string;
  internalNotes?: string;
  termsConditions?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || "System";

    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) return { error: "Customer not found" };

    let resolvedSalespersonId: string = data.salespersonId || "";

    if (!resolvedSalespersonId) {
      let employee = await prisma.employee.findUnique({ where: { userId } });
      if (employee) {
        resolvedSalespersonId = employee.id;
      } else if (customer.assignedSalespersonId) {
        resolvedSalespersonId = customer.assignedSalespersonId;
      } else {
        let adminEmp = await prisma.employee.findFirst({
          where: { user: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } }
        });
        if (!adminEmp) {
          adminEmp = await prisma.employee.findFirst();
        }
        if (!adminEmp) return { error: "Salesperson profile not found" };
        resolvedSalespersonId = adminEmp.id;
      }
    }

    const companyRes = await getCompanySettings();
    const companyState = companyRes.settings?.state || "Haryana";
    const customerState = customer.state || companyState;

    const isInterstate = companyState.trim().toLowerCase() !== customerState.trim().toLowerCase();

    let subtotal = 0;
    let itemDiscountTotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalQuantity = 0;
    let computedTotalWeight = 0;

    const preparedItems = data.items.map(item => {
      const qty = item.quantity || 1;
      const rate = item.rate || 0;
      const uWeight = item.unitWeight || 0;
      computedTotalWeight += uWeight * qty;
      
      const gross = rate * qty;
      let discAmount = item.discountAmount || 0;
      let discPercent = item.discountPercent || 0;
      
      if (discPercent > 0 && discAmount === 0) {
        discAmount = gross * (discPercent / 100);
      } else if (discAmount > 0 && gross > 0) {
        discPercent = (discAmount / gross) * 100;
      }
      
      const taxable = gross - discAmount;
      const gstRate = item.gstRate || 0;
      const breakdown = calculateItemGst(taxable / qty, qty, gstRate, isInterstate);

      subtotal += gross;
      itemDiscountTotal += discAmount;
      totalCgst += breakdown.cgstAmount;
      totalSgst += breakdown.sgstAmount;
      totalIgst += breakdown.igstAmount;
      totalQuantity += qty;

      return {
        productId: item.productId,
        sku: item.sku || null,
        description: item.description || null,
        hsnCode: item.hsnCode || "6103",
        quantity: qty,
        unit: item.unit || "pcs",
        unitWeight: uWeight,
        rate: rate,
        discountPercent: discPercent,
        discountAmount: discAmount,
        taxableAmount: taxable,
        gstRate,
        taxAmount: breakdown.taxTotal,
        cgst: breakdown.cgstAmount,
        sgst: breakdown.sgstAmount,
        igst: breakdown.igstAmount,
        total: taxable + breakdown.taxTotal,
        warehouse: item.warehouse || null,
        availableStock: item.availableStock || null
      };
    });

    const finalTotalWeight = data.totalWeight !== undefined ? data.totalWeight : computedTotalWeight;
    const additionalDiscount = data.additionalDiscount || 0;
    const taxableAmount = subtotal - itemDiscountTotal - additionalDiscount;
    const shippingCharges = data.shippingCharges || 0;
    const adjustment = data.adjustment || 0;
    const taxTotal = totalCgst + totalSgst + totalIgst;
    
    let totalValue = taxableAmount + taxTotal + shippingCharges + adjustment;
    const roundOff = data.roundOff !== undefined ? data.roundOff : Math.round(totalValue) - totalValue;
    totalValue = totalValue + roundOff;

    const receivedAmount = data.receivedAmount || 0;
    const qNumber = data.quotationNumber || `QT-${Date.now().toString().slice(-6)}`;
    const finalStatus = data.status || "Draft";

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber: qNumber,
        referenceNumber: data.referenceNumber || null,
        customerId: data.customerId,
        salespersonId: resolvedSalespersonId,
        date: data.quoteDate ? new Date(data.quoteDate) : new Date(),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        placeOfSupply: `${customerState} (${customer.pincode ? customer.pincode.slice(0, 2) : '27'})`,
        subject: data.subject || null,
        billingAddress: data.billingAddress || customer.billingAddress || null,
        shippingAddress: data.shippingAddress || customer.shippingAddress || customer.billingAddress || null,
        
        currency: data.currency || "INR",
        paymentTerms: data.paymentTerms || null,
        priceList: data.priceList || null,
        warehouse: data.warehouse || null,
        deliveryTerms: data.deliveryTerms || null,
        shippingMethod: data.shippingMethod || null,
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
        
        isInterstate,
        
        subtotal,
        itemDiscount: itemDiscountTotal,
        additionalDiscount,
        taxableAmount,
        shippingCharges,
        adjustment,
        roundOff,
        receivedAmount,
        taxTotal,
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
        totalValue,
        totalQuantity,
        totalItems: preparedItems.length,
        totalWeight: finalTotalWeight,
        
        status: finalStatus,
        approvalStatus: "Approved",
        
        notes: data.notes || "Additional Details -",
        internalNotes: data.internalNotes || null,
        termsConditions: data.termsConditions || "1. Goods once sold cannot be taken back or exchanged.\n2. Full payment is due upon receipt of this invoice.\n3. Subject to Haryana Jurisdiction.",
        
        items: {
          create: preparedItems
        },
        activities: {
          create: [{
            userId: userId,
            userName: userName,
            action: "Created",
            details: `Quotation created as ${finalStatus}`
          }]
        }
      }
    });

    const match = qNumber.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const numStr = match[2];
      const nextNum = (parseInt(numStr, 10) + 1).toString().padStart(numStr.length, '0');
      const nextQuotationNumber = `${prefix}${nextNum}`;
      await prisma.companySettings.updateMany({
        where: { id: "default" },
        data: { nextQuotationNumber }
      }).catch(() => {});
    }

    revalidatePath("/quotations");
    revalidatePath("/quotations", "page");
    return { success: true, quotation };
  } catch (error: any) {
    console.error("Error creating quotation:", error);
    return { error: error?.message || "Failed to create quotation" };
  }
}

export async function updateQuotationFull(id: string, data: {
  customerId: string;
  quotationNumber?: string;
  referenceNumber?: string;
  quoteDate?: string;
  expiryDate?: string;
  salespersonId?: string;
  subject?: string;
  billingAddress?: string;
  shippingAddress?: string;
  currency?: string;
  paymentTerms?: string;
  priceList?: string;
  warehouse?: string;
  deliveryTerms?: string;
  shippingMethod?: string;
  expectedDeliveryDate?: string;
  shippingCharges?: number;
  additionalDiscount?: number;
  adjustment?: number;
  roundOff?: number;
  receivedAmount?: number;
  items: Array<{
    productId: string;
    sku?: string;
    description?: string;
    hsnCode?: string;
    quantity: number;
    unit?: string;
    rate: number;
    discountPercent?: number;
    discountAmount?: number;
    unitWeight?: number;
    gstRate?: number;
    warehouse?: string;
    availableStock?: number;
  }>;
  totalWeight?: number;
  notes?: string;
  internalNotes?: string;
  termsConditions?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || "System";

    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) return { error: "Customer not found" };

    const companyRes = await getCompanySettings();
    const companyState = companyRes.settings?.state || "Haryana";
    const customerState = customer.state || companyState;

    const isInterstate = companyState.trim().toLowerCase() !== customerState.trim().toLowerCase();

    let subtotal = 0;
    let itemDiscountTotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalQuantity = 0;
    let computedTotalWeight = 0;

    const preparedItems = data.items.map(item => {
      const qty = item.quantity || 1;
      const rate = item.rate || 0;
      const uWeight = item.unitWeight || 0;
      computedTotalWeight += uWeight * qty;
      
      const gross = rate * qty;
      let discAmount = item.discountAmount || 0;
      let discPercent = item.discountPercent || 0;
      
      if (discPercent > 0 && discAmount === 0) {
        discAmount = gross * (discPercent / 100);
      } else if (discAmount > 0 && gross > 0) {
        discPercent = (discAmount / gross) * 100;
      }
      
      const taxable = gross - discAmount;
      const gstRate = item.gstRate || 0;
      const breakdown = calculateItemGst(taxable / qty, qty, gstRate, isInterstate);

      subtotal += gross;
      itemDiscountTotal += discAmount;
      totalCgst += breakdown.cgstAmount;
      totalSgst += breakdown.sgstAmount;
      totalIgst += breakdown.igstAmount;
      totalQuantity += qty;

      return {
        productId: item.productId,
        sku: item.sku || null,
        description: item.description || null,
        hsnCode: item.hsnCode || "6103",
        quantity: qty,
        unit: item.unit || "pcs",
        unitWeight: uWeight,
        rate: rate,
        discountPercent: discPercent,
        discountAmount: discAmount,
        taxableAmount: taxable,
        gstRate,
        taxAmount: breakdown.taxTotal,
        cgst: breakdown.cgstAmount,
        sgst: breakdown.sgstAmount,
        igst: breakdown.igstAmount,
        total: taxable + breakdown.taxTotal,
        warehouse: item.warehouse || null,
        availableStock: item.availableStock || null
      };
    });

    const finalTotalWeight = data.totalWeight !== undefined ? data.totalWeight : computedTotalWeight;
    const additionalDiscount = data.additionalDiscount || 0;
    const taxableAmount = subtotal - itemDiscountTotal - additionalDiscount;
    const shippingCharges = data.shippingCharges || 0;
    const adjustment = data.adjustment || 0;
    const taxTotal = totalCgst + totalSgst + totalIgst;
    
    let totalValue = taxableAmount + taxTotal + shippingCharges + adjustment;
    const roundOff = data.roundOff !== undefined ? data.roundOff : Math.round(totalValue) - totalValue;
    totalValue = totalValue + roundOff;

    const receivedAmount = data.receivedAmount || 0;

    await prisma.quotationItem.deleteMany({ where: { quotationId: id } });

    const quotation = await prisma.quotation.update({
      where: { id },
      data: {
        referenceNumber: data.referenceNumber || null,
        customerId: data.customerId,
        date: data.quoteDate ? new Date(data.quoteDate) : new Date(),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        placeOfSupply: `${customerState} (${customer.pincode ? customer.pincode.slice(0, 2) : '27'})`,
        subject: data.subject || null,
        billingAddress: data.billingAddress || customer.billingAddress || null,
        shippingAddress: data.shippingAddress || customer.shippingAddress || customer.billingAddress || null,
        
        currency: data.currency || "INR",
        paymentTerms: data.paymentTerms || null,
        priceList: data.priceList || null,
        warehouse: data.warehouse || null,
        deliveryTerms: data.deliveryTerms || null,
        shippingMethod: data.shippingMethod || null,
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
        
        isInterstate,
        subtotal,
        itemDiscount: itemDiscountTotal,
        additionalDiscount,
        taxableAmount,
        shippingCharges,
        adjustment,
        roundOff,
        receivedAmount,
        taxTotal,
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
        totalValue,
        totalQuantity,
        totalItems: preparedItems.length,
        totalWeight: finalTotalWeight,
        
        notes: data.notes || "Additional Details -",
        internalNotes: data.internalNotes || null,
        termsConditions: data.termsConditions || null,
        
        items: {
          create: preparedItems
        },
        activities: {
          create: [{
            userId: userId,
            userName: userName,
            action: "Updated",
            details: "Quotation fully updated"
          }]
        }
      }
    });

    revalidatePath("/quotations");
    revalidatePath(`/quotations/${id}`);
    return { success: true, quotation };
  } catch (error: any) {
    console.error("Error updating quotation:", error);
    return { error: error?.message || "Failed to update quotation" };
  }
}

export async function getQuotations() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const role = (session.user as any).role;
    const userId = (session.user as any).id;
    const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER" || role === "ACCOUNTANT";

    let whereClause: any = {};
    if (!isAdmin) {
      const employee = await prisma.employee.findUnique({ where: { userId } });
      if (employee) {
        whereClause = {
          OR: [
            { salespersonId: employee.id },
            { customer: { assignedSalespersonId: employee.id } }
          ]
        };
      } else {
        return { success: true, quotations: [] };
      }
    }

    const quotations = await prisma.quotation.findMany({
      where: whereClause,
      include: {
        customer: true,
        salesperson: { include: { user: true } },
        items: { include: { product: true } },
        activities: true
      },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, quotations };
  } catch (error) {
    console.error("Error getting quotations:", error);
    return { error: "Failed to fetch quotations" };
  }
}

export async function getQuotationById(id: string) {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        salesperson: { include: { user: true } },
        items: { include: { product: true } },
        activities: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!quotation) return { error: "Quotation not found" };
    return { success: true, quotation };
  } catch (error) {
    return { error: "Failed to fetch quotation" };
  }
}

export async function updateQuotationStatus(id: string, status: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;
    const userName = (session?.user as any)?.name || "System";
    
    const dataToUpdate: any = { status };
    if (status === "Sent") {
    } else if (status === "Viewed") {
      dataToUpdate.viewedDate = new Date();
    } else if (status === "Accepted") {
      dataToUpdate.acceptedDate = new Date();
    } else if (status === "Declined") {
      dataToUpdate.declinedDate = new Date();
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        ...dataToUpdate,
        activities: {
          create: {
            userId,
            userName,
            action: "Status Updated",
            details: `Status changed to ${status}`
          }
        }
      }
    });
    
    revalidatePath("/quotations");
    revalidatePath(`/quotations/${id}`);
    return { success: true, quotation: updated };
  } catch (error) {
    return { error: "Failed to update quotation status" };
  }
}

export async function convertQuotationToOrder(
  quotationId: string, 
  discountSlab: string = '1-15',
  confirmationData?: {
    paymentOption: 'FULL' | 'TOKEN' | 'CREDIT';
    tokenAmount?: number;
    paymentMode?: string;
  }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;
    const userName = (session?.user as any)?.name || "System";

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { items: true, customer: true }
    });

    if (!quotation) return { error: "Quotation not found" };

    const paymentOption = confirmationData?.paymentOption || 'FULL';
    let effectiveReceived = 0;
    let overridePaymentStatus = "Unpaid";

    if (paymentOption === 'FULL') {
      effectiveReceived = quotation.totalValue;
      overridePaymentStatus = "Paid";
    } else if (paymentOption === 'TOKEN') {
      const amt = Number(confirmationData?.tokenAmount || 0);
      if (amt <= 0) {
        return { error: "Please enter a valid token/advance payment amount (greater than ₹0)." };
      }
      effectiveReceived = amt;
      overridePaymentStatus = amt >= quotation.totalValue ? "Paid" : "Partially Paid";
    } else if (paymentOption === 'CREDIT') {
      const isCreditAllowed = quotation.customer?.status?.toLowerCase() === 'credit' || 
                              quotation.customer?.preferredPaymentMethod?.toLowerCase() === 'credit';
      effectiveReceived = 0;
      overridePaymentStatus = "Credit";
    }

    let overrideDiscount = quotation.itemDiscount + quotation.additionalDiscount;
    if (discountSlab === '0') {
      overrideDiscount = 0;
    } else if (discountSlab === '1-15') {
      overrideDiscount = 10;
    } else if (discountSlab === '>15') {
      overrideDiscount = 20;
    } else if (discountSlab === 'credit') {
      overrideDiscount = 20;
      overridePaymentStatus = "Credit";
    }

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: quotation.customerId,
        salespersonId: quotation.salespersonId,
        totalValue: quotation.totalValue,
        subtotal: quotation.subtotal,
        discount: overrideDiscount,
        tax: quotation.taxTotal,
        cgst: quotation.cgst,
        sgst: quotation.sgst,
        igst: quotation.igst,
        isInterstate: quotation.isInterstate,
        placeOfSupply: quotation.placeOfSupply,
        paymentReceived: effectiveReceived,
        outstandingAmount: Math.max(0, quotation.totalValue - effectiveReceived),
        orderStatus: "Processing",
        paymentStatus: overridePaymentStatus,
        notes: `Converted from Quotation #${quotation.quotationNumber} [Method: ${paymentOption}, Received: ₹${effectiveReceived}]`,
        items: {
          create: quotation.items.map(item => ({
            productId: item.productId,
            quantity: Math.round(item.quantity),
            rate: item.rate,
            hsnCode: item.hsnCode,
            gstRate: item.gstRate,
            cgst: item.cgst,
            sgst: item.sgst,
            igst: item.igst,
            total: item.total
          }))
        }
      }
    });

    await prisma.quotation.update({
      where: { id: quotationId },
      data: { 
        status: "Converted",
        receivedAmount: effectiveReceived,
        activities: {
          create: {
            userId,
            userName,
            action: "Converted to Order",
            details: `Converted to Sales Order ${orderNumber} with Payment Received ₹${effectiveReceived}`
          }
        }
      }
    });

    // Deduct stock for all line items and record transactions
    for (const item of quotation.items) {
      const q = Math.round(item.quantity);
      if (q > 0) {
        try {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { decrement: q } }
          });
          await prisma.inventoryTransaction.create({
            data: {
              productId: item.productId,
              quantity: q,
              type: 'OUT',
              reference: orderNumber,
              notes: `Quotation #${quotation.quotationNumber} converted to Sales Order ${orderNumber}`
            }
          });
        } catch (err) {
          console.warn(`Failed to deduct inventory for product ${item.productId}:`, err);
        }
      }
    }

    revalidatePath("/quotations");
    revalidatePath("/orders");
    revalidatePath("/products");
    revalidatePath("/", "layout");

    return { success: true, orderId: order.id, orderNumber: order.orderNumber };
  } catch (error) {
    console.error("Error converting quotation to order:", error);
    return { error: "Failed to convert quotation to order" };
  }
}

export async function deleteQuotation(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
    await prisma.quotationActivity.deleteMany({ where: { quotationId: id } });
    await prisma.quotation.delete({ where: { id } });

    revalidatePath("/quotations");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting quotation:", error);
    return { error: error?.message || "Failed to delete quotation" };
  }
}
