"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateItemGst } from "@/lib/gstUtils";
import { getCompanySettings, invalidateCompanySettingsCache } from "./companyActions";
import { getTenantOrgId } from "@/lib/tenant";
import { getOrCreateEmployee } from "@/lib/employeeHelper";

export async function getNextQuotationNumber(orgId?: string | null): Promise<string> {
  try {
    const organizationId = orgId || (await getTenantOrgId());

    // 1. Get company configured starting/next quotation format
    const companyRes = await getCompanySettings();
    const configuredFormat = (companyRes.settings?.nextQuotationNumber || "QT-1001").trim();

    // Parse prefix and digits
    const configMatch = configuredFormat.match(/^(.*?)(\d+)$/);
    const prefix = configMatch ? configMatch[1] : "QT-";
    const padLength = configMatch ? configMatch[2].length : 4;
    const configuredStartNum = configMatch ? parseInt(configMatch[2], 10) : 1001;

    // 2. Fetch all existing quotation numbers in this organization (or global)
    const existingQuotes = await prisma.quotation.findMany({
      where: organizationId ? {
        OR: [
          { organizationId },
          { organizationId: null }
        ]
      } : undefined,
      select: { quotationNumber: true }
    });

    let highestNum = configuredStartNum - 1;
    const usedNumbers = new Set<string>();

    for (const q of existingQuotes) {
      if (!q.quotationNumber) continue;
      const numStr = q.quotationNumber.trim();
      usedNumbers.add(numStr.toUpperCase());

      const match = numStr.match(/^(.*?)(\d+)$/);
      if (match) {
        const qPrefix = match[1];
        const qNum = parseInt(match[2], 10);
        if (qPrefix.toUpperCase() === prefix.toUpperCase() && !isNaN(qNum)) {
          if (qNum > highestNum) {
            highestNum = qNum;
          }
        }
      }
    }

    let nextNum = highestNum + 1;
    let candidate = `${prefix}${String(nextNum).padStart(padLength, '0')}`;

    // Ensure candidate is not already in used numbers
    while (usedNumbers.has(candidate.toUpperCase())) {
      nextNum++;
      candidate = `${prefix}${String(nextNum).padStart(padLength, '0')}`;
    }

    // Direct DB lookup verification
    let dbExists = await prisma.quotation.findUnique({
      where: { quotationNumber: candidate }
    });

    while (dbExists) {
      nextNum++;
      candidate = `${prefix}${String(nextNum).padStart(padLength, '0')}`;
      dbExists = await prisma.quotation.findUnique({
        where: { quotationNumber: candidate }
      });
    }

    return candidate;
  } catch (err) {
    console.error("Failed to generate next quotation number:", err);
    return `QT-${Date.now().toString().slice(-4)}`;
  }
}

export async function getNextInvoiceNumber(orgId?: string | null): Promise<string> {
  try {
    const organizationId = orgId || (await getTenantOrgId());
    const companyRes = await getCompanySettings();
    const configuredFormat = (companyRes.settings?.nextInvoiceNumber || `INV-${new Date().getFullYear()}-00001`).trim();

    const configMatch = configuredFormat.match(/^(.*?)(\d+)$/);
    const prefix = configMatch ? configMatch[1] : `INV-${new Date().getFullYear()}-`;
    const padLength = configMatch ? configMatch[2].length : 5;
    const configuredStartNum = configMatch ? parseInt(configMatch[2], 10) : 1;

    const existingInvoices = await prisma.invoice.findMany({
      where: organizationId ? {
        OR: [
          { organizationId },
          { organizationId: null }
        ]
      } : undefined,
      select: { invoiceNumber: true }
    });

    let highestNum = configuredStartNum - 1;
    const usedNumbers = new Set<string>();

    for (const inv of existingInvoices) {
      if (!inv.invoiceNumber) continue;
      const numStr = inv.invoiceNumber.trim();
      usedNumbers.add(numStr.toUpperCase());

      const match = numStr.match(/^(.*?)(\d+)$/);
      if (match) {
        const invPrefix = match[1];
        const invNum = parseInt(match[2], 10);
        if (invPrefix.toUpperCase() === prefix.toUpperCase() && !isNaN(invNum)) {
          if (invNum > highestNum) {
            highestNum = invNum;
          }
        }
      }
    }

    let nextNum = highestNum + 1;
    let candidate = `${prefix}${String(nextNum).padStart(padLength, '0')}`;

    while (usedNumbers.has(candidate.toUpperCase())) {
      nextNum++;
      candidate = `${prefix}${String(nextNum).padStart(padLength, '0')}`;
    }

    // Direct DB lookup verification to guarantee absolute global uniqueness
    let dbExists = await prisma.invoice.findUnique({
      where: { invoiceNumber: candidate }
    });

    while (dbExists) {
      nextNum++;
      candidate = `${prefix}${String(nextNum).padStart(padLength, '0')}`;
      dbExists = await prisma.invoice.findUnique({
        where: { invoiceNumber: candidate }
      });
    }

    return candidate;
  } catch (err) {
    console.error("Failed to generate next invoice number:", err);
    return `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  }
}

export async function getNextOrderNumber(orgId?: string | null): Promise<string> {
  try {
    const organizationId = orgId || (await getTenantOrgId());
    const prefix = "ORD-";
    const padLength = 4;
    const configuredStartNum = 1001;

    const existingOrders = await prisma.order.findMany({
      where: organizationId ? {
        OR: [
          { organizationId },
          { organizationId: null }
        ]
      } : undefined,
      select: { orderNumber: true }
    });

    let highestNum = configuredStartNum - 1;
    const usedNumbers = new Set<string>();

    for (const ord of existingOrders) {
      if (!ord.orderNumber) continue;
      const numStr = ord.orderNumber.trim();
      usedNumbers.add(numStr.toUpperCase());

      const match = numStr.match(/^(.*?)(\d+)$/);
      if (match) {
        const ordPrefix = match[1];
        const ordNum = parseInt(match[2], 10);
        if (ordPrefix.toUpperCase() === prefix.toUpperCase() && !isNaN(ordNum)) {
          if (ordNum > highestNum) {
            highestNum = ordNum;
          }
        }
      }
    }

    let nextNum = highestNum + 1;
    let candidate = `${prefix}${String(nextNum).padStart(padLength, '0')}`;

    while (usedNumbers.has(candidate.toUpperCase())) {
      nextNum++;
      candidate = `${prefix}${String(nextNum).padStart(padLength, '0')}`;
    }

    let dbExists = await prisma.order.findUnique({
      where: { orderNumber: candidate }
    });

    while (dbExists) {
      nextNum++;
      candidate = `${prefix}${String(nextNum).padStart(padLength, '0')}`;
      dbExists = await prisma.order.findUnique({
        where: { orderNumber: candidate }
      });
    }

    return candidate;
  } catch (err) {
    console.error("Failed to generate next order number:", err);
    return `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  }
}

export async function getNextPaymentNumber(): Promise<string> {
  try {
    const prefix = "PAY-";
    const padLength = 4;
    const startNum = 1001;

    const existingPayments = await prisma.payment.findMany({
      select: { paymentNumber: true },
      take: 200,
      orderBy: { paymentDate: 'desc' }
    });

    let highestNum = startNum - 1;
    const usedNumbers = new Set<string>();

    for (const pay of existingPayments) {
      if (!pay.paymentNumber) continue;
      const numStr = pay.paymentNumber.trim();
      usedNumbers.add(numStr.toUpperCase());

      const match = numStr.match(/^(.*?)(\d+)$/);
      if (match) {
        const pNum = parseInt(match[2], 10);
        if (!isNaN(pNum) && pNum > highestNum) {
          highestNum = pNum;
        }
      }
    }

    let nextNum = highestNum + 1;
    let candidate = `${prefix}${String(nextNum).padStart(padLength, '0')}`;

    while (usedNumbers.has(candidate.toUpperCase())) {
      nextNum++;
      candidate = `${prefix}${String(nextNum).padStart(padLength, '0')}`;
    }

    let dbExists = await prisma.payment.findUnique({
      where: { paymentNumber: candidate }
    });

    while (dbExists) {
      nextNum++;
      candidate = `${prefix}${String(nextNum).padStart(padLength, '0')}`;
      dbExists = await prisma.payment.findUnique({
        where: { paymentNumber: candidate }
      });
    }

    return candidate;
  } catch (err) {
    return `PAY-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  }
}

export async function createQuotation(data: {
  customerId: string;
  customerGst?: string;
  quotationNumber?: string;
  referenceNumber?: string;
  quoteDate?: string;
  expiryDate?: string;
  placeOfSupply?: string;
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
  discountSlab?: string;
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

    // Auto-normalize and sync customer GSTIN to uppercase
    const targetGst = data.customerGst ? data.customerGst.trim().toUpperCase() : (customer.gstNumber ? customer.gstNumber.toUpperCase() : null);
    if (targetGst && customer.gstNumber !== targetGst) {
      await prisma.customer.update({
        where: { id: data.customerId },
        data: { gstNumber: targetGst }
      }).catch(() => {});
      customer.gstNumber = targetGst;
    }

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
    const customerState = data.placeOfSupply || customer.state || companyState;

    const isInterstate = companyState.trim().toLowerCase() !== customerState.trim().toLowerCase();

    // Filter and clean incoming items
    const rawItems = (data.items || []).filter(item => {
      const hasId = Boolean(item.productId && item.productId.trim() !== "");
      const hasContent = Boolean(item.sku || item.description);
      const hasQty = (Number(item.quantity) || 0) > 0;
      return (hasId || hasContent) && hasQty;
    });

    if (rawItems.length === 0) {
      return { error: "Please provide at least one valid product line item with quantity > 0." };
    }

    // Verify product IDs exist in DB
    const incomingProductIds = Array.from(new Set(rawItems.map(i => (i.productId || "").trim()).filter(Boolean)));
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: incomingProductIds } },
      select: { id: true, name: true, sku: true, articleNumber: true }
    });
    const productMap = new Map(existingProducts.map(p => [p.id, p]));

    let defaultProduct: any = null;
    const validatedItems: typeof rawItems = [];

    for (const item of rawItems) {
      let resolvedProdId = (item.productId || "").trim();
      if (!resolvedProdId || !productMap.has(resolvedProdId)) {
        const term = (item.sku || "").trim();
        let match = term ? await prisma.product.findFirst({
          where: {
            OR: [
              { sku: term },
              { articleNumber: term },
              { name: item.sku || undefined }
            ]
          }
        }) : null;

        if (match) {
          resolvedProdId = match.id;
          productMap.set(match.id, match);
        } else {
          if (!defaultProduct) {
            defaultProduct = await prisma.product.findFirst({
              where: customer.organizationId ? { organizationId: customer.organizationId } : undefined
            }) || await prisma.product.findFirst();
          }
          if (defaultProduct) {
            resolvedProdId = defaultProduct.id;
          } else {
            return { error: `Product not found for line item "${item.sku || item.description || 'Item'}". Please select a product from your catalog.` };
          }
        }
      }

      validatedItems.push({
        ...item,
        productId: resolvedProdId
      });
    }

    let subtotal = 0;
    let itemDiscountTotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalQuantity = 0;
    let computedTotalWeight = 0;

    const preparedItems = validatedItems.map(item => {
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
    const finalStatus = data.status || "Draft";
    const organizationId = await getTenantOrgId();

    // Dynamically resolve guaranteed unique quotation number
    let qNumber = data.quotationNumber?.trim();
    if (!qNumber) {
      qNumber = await getNextQuotationNumber(organizationId);
    } else {
      const existingQuote = await prisma.quotation.findUnique({
        where: { quotationNumber: qNumber }
      });
      if (existingQuote) {
        // If user submitted an already used number, allocate the true next unique number
        qNumber = await getNextQuotationNumber(organizationId);
      }
    }

    let quotation;
    try {
      quotation = await prisma.quotation.create({
        data: {
          organizationId,
          quotationNumber: qNumber,
          referenceNumber: data.referenceNumber || null,
          customerId: data.customerId,
          salespersonId: resolvedSalespersonId,
          date: data.quoteDate ? new Date(data.quoteDate) : new Date(),
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          placeOfSupply: data.placeOfSupply || customerState || null,
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
          discountSlab: data.discountSlab || "1-15",
          taxTotal,
          cgst: totalCgst,
          sgst: totalSgst,
          igst: totalIgst,
          totalValue,
          totalQuantity,
          totalItems: preparedItems.length,
          totalWeight: finalTotalWeight,
          
          status: finalStatus,
          acceptedDate: finalStatus === "Confirmed" ? new Date() : null,
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
    } catch (createErr: any) {
      if (createErr?.code === "P2002" || createErr?.message?.includes("quotationNumber")) {
        // Fallback retry with fresh unique number
        const freshQNumber = await getNextQuotationNumber(organizationId);
        quotation = await prisma.quotation.create({
          data: {
            organizationId,
            quotationNumber: freshQNumber,
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
            items: { create: preparedItems },
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
        qNumber = freshQNumber;
      } else {
        throw createErr;
      }
    }

    // Advance next quotation number in CompanySettings for this organization
    try {
      const match = qNumber.match(/^(.*?)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const numStr = match[2];
        const nextNum = (parseInt(numStr, 10) + 1).toString().padStart(numStr.length, '0');
        const nextQuotationNumber = `${prefix}${nextNum}`;

        const settingId = companyRes.settings?.id;
        if (settingId) {
          await prisma.companySettings.update({
            where: { id: settingId },
            data: { nextQuotationNumber }
          });
        } else if (organizationId) {
          await prisma.companySettings.updateMany({
            where: { organizationId },
            data: { nextQuotationNumber }
          });
        }
        await invalidateCompanySettingsCache();
      }
    } catch (updateErr) {
      console.warn("Could not advance next quotation number in company settings:", updateErr);
    }

    if (resolvedSalespersonId) {
      await prisma.customer.updateMany({
        where: { id: data.customerId, assignedSalespersonId: null },
        data: { assignedSalespersonId: resolvedSalespersonId }
      }).catch(() => {});
    }

    // Advance customer to 'Opportunity' stage in pipeline if not already Won
    try {
      const currentCustomer = await prisma.customer.findUnique({
        where: { id: data.customerId },
        select: { leadStage: true, expectedValue: true, assignedSalespersonId: true }
      });
      if (currentCustomer && currentCustomer.leadStage !== "Won" && currentCustomer.leadStage !== "Converted") {
        await prisma.customer.update({
          where: { id: data.customerId },
          data: {
            leadStage: "Opportunity",
            status: "Opportunity",
            expectedValue: Math.max(currentCustomer.expectedValue || 0, totalValue),
            // ONLY assign salesperson if customer has NO existing assignment.
            // Never overwrite a salesperson that was manually set by an admin.
            ...(!currentCustomer.assignedSalespersonId && resolvedSalespersonId
              ? { assignedSalespersonId: resolvedSalespersonId }
              : {})
          }
        });
      }
    } catch (cErr) {
      console.warn("Could not update customer lead stage on quotation create:", cErr);
    }

    revalidatePath("/quotations");
    revalidatePath("/quotations", "page");
    revalidatePath("/orders");
    revalidatePath("/pipeline");
    revalidatePath("/customers");
    revalidatePath("/");
    return { success: true, quotation };
  } catch (error: any) {
    console.error("Error creating quotation:", error);
    return { error: error?.message || "Failed to create quotation" };
  }
}

export async function updateQuotationFull(id: string, data: {
  customerId: string;
  customerGst?: string;
  quotationNumber?: string;
  referenceNumber?: string;
  quoteDate?: string;
  expiryDate?: string;
  placeOfSupply?: string;
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
  discountSlab?: string;
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

    // Auto-normalize and sync customer GSTIN to uppercase
    const targetGst = data.customerGst ? data.customerGst.trim().toUpperCase() : (customer.gstNumber ? customer.gstNumber.toUpperCase() : null);
    if (targetGst && customer.gstNumber !== targetGst) {
      await prisma.customer.update({
        where: { id: data.customerId },
        data: { gstNumber: targetGst }
      }).catch(() => {});
      customer.gstNumber = targetGst;
    }

    const companyRes = await getCompanySettings();
    const companyState = companyRes.settings?.state || "Haryana";
    const customerState = data.placeOfSupply || customer.state || companyState;

    const isInterstate = companyState.trim().toLowerCase() !== customerState.trim().toLowerCase();

    // Filter and clean incoming items
    const rawItems = (data.items || []).filter(item => {
      const hasId = Boolean(item.productId && item.productId.trim() !== "");
      const hasContent = Boolean(item.sku || item.description);
      const hasQty = (Number(item.quantity) || 0) > 0;
      return (hasId || hasContent) && hasQty;
    });

    if (rawItems.length === 0) {
      return { error: "Please provide at least one valid product line item with quantity > 0." };
    }

    // Verify product IDs exist in DB
    const incomingProductIds = Array.from(new Set(rawItems.map(i => (i.productId || "").trim()).filter(Boolean)));
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: incomingProductIds } },
      select: { id: true, name: true, sku: true, articleNumber: true }
    });
    const productMap = new Map(existingProducts.map(p => [p.id, p]));

    let defaultProduct: any = null;
    const validatedItems: typeof rawItems = [];

    for (const item of rawItems) {
      let resolvedProdId = (item.productId || "").trim();
      if (!resolvedProdId || !productMap.has(resolvedProdId)) {
        const term = (item.sku || "").trim();
        let match = term ? await prisma.product.findFirst({
          where: {
            OR: [
              { sku: term },
              { articleNumber: term },
              { name: item.sku || undefined }
            ]
          }
        }) : null;

        if (match) {
          resolvedProdId = match.id;
          productMap.set(match.id, match);
        } else {
          if (!defaultProduct) {
            defaultProduct = await prisma.product.findFirst();
          }
          if (defaultProduct) {
            resolvedProdId = defaultProduct.id;
          } else {
            return { error: `Product not found for line item "${item.sku || item.description || 'Item'}". Please select a product from your catalog.` };
          }
        }
      }

      validatedItems.push({
        ...item,
        productId: resolvedProdId
      });
    }

    let subtotal = 0;
    let itemDiscountTotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalQuantity = 0;
    let computedTotalWeight = 0;

    const preparedItems = validatedItems.map(item => {
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
    const existingQuotation = await prisma.quotation.findUnique({
      where: { id },
      select: { receivedAmount: true, status: true, salespersonId: true }
    });

    const receivedAmount = data.receivedAmount !== undefined 
      ? data.receivedAmount 
      : (existingQuotation?.receivedAmount || 0);

    let resolvedSalespersonId: string | undefined = existingQuotation?.salespersonId;
    if (data.salespersonId && data.salespersonId.trim() !== '') {
      resolvedSalespersonId = data.salespersonId.trim();
    } else if (customer.assignedSalespersonId) {
      resolvedSalespersonId = customer.assignedSalespersonId;
    }

    await prisma.quotationItem.deleteMany({ where: { quotationId: id } });

    const quotation = await prisma.quotation.update({
      where: { id },
      data: {
        ...(data.quotationNumber ? { quotationNumber: data.quotationNumber.trim() } : {}),
        ...(resolvedSalespersonId ? { salespersonId: resolvedSalespersonId } : {}),
        referenceNumber: data.referenceNumber || null,
        customerId: data.customerId,
        ...(data.status ? { status: data.status } : {}),
        date: data.quoteDate ? new Date(data.quoteDate) : new Date(),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        placeOfSupply: data.placeOfSupply || customerState || null,
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
        ...(data.discountSlab ? { discountSlab: data.discountSlab } : {}),
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

    if (resolvedSalespersonId) {
      await prisma.customer.updateMany({
        where: { id: data.customerId, assignedSalespersonId: null },
        data: { assignedSalespersonId: resolvedSalespersonId }
      }).catch(() => {});
    }

    // Synchronize linked Order if this quotation was previously converted to an order
    try {
      const linkedOrder = await prisma.order.findFirst({
        where: {
          customerId: data.customerId,
          notes: { contains: quotation.quotationNumber }
        }
      });

      if (linkedOrder) {
        const overrideDiscount = itemDiscountTotal + additionalDiscount;
        const effectiveReceived = Number(data.receivedAmount !== undefined ? data.receivedAmount : (existingQuotation?.receivedAmount || 0));

        await prisma.orderItem.deleteMany({ where: { orderId: linkedOrder.id } });

        await prisma.order.update({
          where: { id: linkedOrder.id },
          data: {
            totalValue,
            subtotal,
            discount: overrideDiscount,
            tax: taxTotal,
            cgst: totalCgst,
            sgst: totalSgst,
            igst: totalIgst,
            isInterstate,
            placeOfSupply: quotation.placeOfSupply,
            paymentReceived: effectiveReceived,
            outstandingAmount: Math.max(0, totalValue - effectiveReceived),
            items: {
              create: preparedItems.map(item => ({
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
      }
    } catch (syncErr) {
      console.error("Error syncing linked order on quotation edit:", syncErr);
    }

    // Advance customer to 'Opportunity' stage in pipeline if not already Won
    try {
      const currentCustomer = await prisma.customer.findUnique({
        where: { id: data.customerId },
        select: { leadStage: true, expectedValue: true, assignedSalespersonId: true }
      });
      if (currentCustomer && currentCustomer.leadStage !== "Won" && currentCustomer.leadStage !== "Converted") {
        await prisma.customer.update({
          where: { id: data.customerId },
          data: {
            leadStage: "Opportunity",
            status: "Opportunity",
            expectedValue: Math.max(currentCustomer.expectedValue || 0, totalValue),
            // ONLY assign salesperson if customer has NO existing assignment.
            // Never overwrite a salesperson that was manually set by an admin.
            ...(!currentCustomer.assignedSalespersonId && resolvedSalespersonId
              ? { assignedSalespersonId: resolvedSalespersonId }
              : {})
          }
        });
      }
    } catch (cErr) {
      console.warn("Could not update customer lead stage on quotation update:", cErr);
    }

    revalidatePath("/quotations");
    revalidatePath("/quotations", "page");
    revalidatePath(`/quotations/${id}`);
    revalidatePath(`/quotations/${id}/edit`);
    revalidatePath("/orders");
    revalidatePath("/pipeline");
    revalidatePath("/customers");
    revalidatePath("/");
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

    let organizationId: string | null = null;
    try {
      organizationId = await getTenantOrgId();
    } catch {
      organizationId = (session.user as any)?.organizationId || null;
    }

    const rawRole = (session.user as any).role || 'SALES';
    const normRole = String(rawRole).trim().toUpperCase();
    const userId = (session.user as any).id;
    const isAdmin = normRole === "ADMIN" || normRole === "SUPER_ADMIN" || normRole === "MANAGER" || normRole === "ACCOUNTS" || normRole === "ACCOUNTANT";

    let whereClause: any = organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {};
    if (!isAdmin) {
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
        whereClause = {
          ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {}),
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
      select: {
        id: true,
        quotationNumber: true,
        date: true,
        totalValue: true,
        taxableAmount: true,
        subtotal: true,
        itemDiscount: true,
        additionalDiscount: true,
        receivedAmount: true,
        status: true,
        discountSlab: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            mobile: true
          }
        },
        salesperson: {
          select: {
            id: true,
            user: {
              select: { name: true }
            }
          }
        }
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

export async function updateQuotationStatus(id: string, status: string, discountSlab?: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;
    const userName = (session?.user as any)?.name || "System";
    
    const dataToUpdate: any = { status };
    if (discountSlab) {
      dataToUpdate.discountSlab = discountSlab;
    }
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
      include: { 
        items: true, 
        customer: true,
        activities: {
          where: { action: { in: ['Quotation Confirmed', 'Converted to Order'] } },
          orderBy: { createdAt: 'desc' },
          take: 2
        }
      }
    });

    if (!quotation) return { error: "Quotation not found" };

    const getQuotationWonDate = (q: any): Date => {
      if (q.acceptedDate) return new Date(q.acceptedDate);
      const confirmAct = (q.activities || []).find((a: any) => a.action === 'Quotation Confirmed');
      if (confirmAct?.createdAt) return new Date(confirmAct.createdAt);
      const convertAct = (q.activities || []).find((a: any) => a.action === 'Converted to Order');
      if (convertAct?.createdAt) return new Date(convertAct.createdAt);
      if ((q.status === 'Confirmed' || q.status === 'Converted') && q.updatedAt) {
        return new Date(q.updatedAt);
      }
      return q.date ? new Date(q.date) : (q.createdAt ? new Date(q.createdAt) : new Date());
    };

    const orgId = quotation.organizationId || (session?.user as any)?.organizationId || (await getTenantOrgId());

    // ── Idempotency Check: If already converted, return the existing order & invoice gracefully ──
    if (quotation.status === 'Converted') {
      const existingOrder = await prisma.order.findFirst({
        where: {
          OR: [
            { notes: { contains: quotation.quotationNumber } },
            { customerId: quotation.customerId, totalValue: quotation.totalValue }
          ],
          ...(orgId ? { OR: [{ organizationId: orgId }, { organizationId: null }] } : {})
        },
        include: { invoices: true },
        orderBy: { createdAt: 'desc' }
      });

      if (existingOrder) {
        const quotationEffectiveDate = getQuotationWonDate(quotation);
        if (quotationEffectiveDate && existingOrder.orderDate && Math.abs(existingOrder.orderDate.getTime() - quotationEffectiveDate.getTime()) > 60000) {
          try {
            await prisma.order.update({
              where: { id: existingOrder.id },
              data: { orderDate: quotationEffectiveDate }
            });
          } catch {}
        }
        const existingInvoice = existingOrder.invoices?.[0] || await prisma.invoice.findFirst({
          where: { orderId: existingOrder.id }
        });
        return {
          success: true,
          orderId: existingOrder.id,
          orderNumber: existingOrder.orderNumber,
          invoiceId: existingInvoice?.id || existingOrder.id,
          invoiceNumber: existingInvoice?.invoiceNumber || existingOrder.orderNumber
        };
      }
    }

    // If quotation was already Confirmed, reuse the stored receivedAmount from the Confirm step
    const paymentOption = confirmationData?.paymentOption || 'FULL';
    let effectiveReceived = 0;
    let overridePaymentStatus = "Unpaid";

    if (quotation.status === 'Confirmed' && Number(quotation.receivedAmount || 0) > 0) {
      // Use the amount already confirmed and stored
      effectiveReceived = Number(quotation.receivedAmount);
      overridePaymentStatus = effectiveReceived >= quotation.totalValue ? "Paid" : "Partially Paid";
    } else if (paymentOption === 'FULL') {
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
      effectiveReceived = 0;
      overridePaymentStatus = "Credit";
    }

    // Store actual monetary discount in the order record
    const overrideDiscount = (quotation.itemDiscount || 0) + (quotation.additionalDiscount || 0);

    // ── Resolve a valid, non-null Employee ID for salesperson relation ──
    let salespersonId = quotation.salespersonId;
    let validSalesperson = null;

    if (salespersonId) {
      validSalesperson = await prisma.employee.findUnique({ where: { id: salespersonId } });
    }

    if (!validSalesperson && userId) {
      validSalesperson = await getOrCreateEmployee(userId, session?.user);
    }

    if (!validSalesperson && orgId) {
      validSalesperson = await prisma.employee.findFirst({ where: { organizationId: orgId } });
    }

    if (!validSalesperson) {
      validSalesperson = await prisma.employee.findFirst();
    }

    if (!validSalesperson && userId) {
      try {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        validSalesperson = await prisma.employee.create({
          data: {
            userId,
            employeeId: `EMP-${randomSuffix}`,
            department: "Sales",
            designation: "Sales Executive",
            employmentStatus: "Active",
            joiningDate: new Date(),
            organizationId: orgId || null
          }
        });
      } catch (e) {
        validSalesperson = await prisma.employee.findFirst();
      }
    }

    salespersonId = validSalesperson?.id || "";
    if (!salespersonId) {
      return { error: "Unable to assign a valid salesperson/employee record for this order." };
    }

    // ── Validate Line Items & Products to prevent Foreign Key constraint failure ──
    const productIds = (quotation.items || []).map(i => i.productId).filter(Boolean);
    const existingProducts = productIds.length > 0 
      ? await prisma.product.findMany({ where: { id: { in: productIds } } })
      : [];
    const existingProductMap = new Map(existingProducts.map(p => [p.id, p]));

    let fallbackProduct: any | null = existingProducts[0] || null;
    if (existingProducts.length < (quotation.items || []).length || (quotation.items || []).length === 0) {
      fallbackProduct = (await prisma.product.findFirst({
        where: orgId ? { organizationId: orgId } : undefined
      })) ?? (await prisma.product.findFirst()) ?? null;

      if (!fallbackProduct) {
        try {
          fallbackProduct = await prisma.product.create({
            data: {
              name: "Standard Catalog Item",
              organizationId: orgId,
              category: "General",
              purchasePrice: 0,
              sellingPrice: quotation.totalValue > 0 ? quotation.totalValue : 100,
              mrp: quotation.totalValue > 0 ? quotation.totalValue : 100,
              stockQuantity: 1000,
              status: "Active"
            }
          });
        } catch (pe) {
          fallbackProduct = (await prisma.product.findFirst()) ?? null;
        }
      }
    }

    const orderItemsData = (quotation.items && quotation.items.length > 0)
      ? quotation.items.map(item => {
          const pId = existingProductMap.has(item.productId) ? item.productId : (fallbackProduct?.id || item.productId);
          const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
          return {
            productId: pId,
            quantity: qty,
            rate: Number(item.rate || 0),
            hsnCode: item.hsnCode || "6109",
            gstRate: Number(item.gstRate || 0),
            cgst: Number(item.cgst || 0),
            sgst: Number(item.sgst || 0),
            igst: Number(item.igst || 0),
            total: Number(item.total || 0)
          };
        })
      : fallbackProduct ? [{
          productId: fallbackProduct.id,
          quantity: 1,
          rate: quotation.totalValue || 0,
          hsnCode: "6109",
          gstRate: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          total: quotation.totalValue || 0
        }] : [];

    // ── Guaranteed Unique Numbers ──
    const orderNumber = await getNextOrderNumber(orgId);
    const invoiceNumber = await getNextInvoiceNumber(orgId);
    const paymentNumber = effectiveReceived > 0 ? await getNextPaymentNumber() : null;
    const invoiceStatus = effectiveReceived >= quotation.totalValue ? 'Paid' : effectiveReceived > 0 ? 'Partially Paid' : 'Unpaid';

    const quotationEffectiveDate = getQuotationWonDate(quotation);

    // ── Execute All Database Mutations Atomically in a Single Transaction ──
    const { order, invoice } = await prisma.$transaction(async (tx) => {
      // 1. Create Order
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          organizationId: orgId,
          customerId: quotation.customerId,
          salespersonId,
          orderDate: quotationEffectiveDate,
          totalValue: quotation.totalValue,
          subtotal: quotation.subtotal,
          discount: overrideDiscount,
          tax: quotation.taxTotal,
          cgst: quotation.cgst,
          sgst: quotation.sgst,
          igst: quotation.igst,
          isInterstate: quotation.isInterstate,
          placeOfSupply: quotation.placeOfSupply || quotation.customer?.state || "Delhi",
          paymentReceived: effectiveReceived,
          outstandingAmount: Math.max(0, quotation.totalValue - effectiveReceived),
          orderStatus: "Processing",
          paymentStatus: overridePaymentStatus,
          notes: `Converted from Quotation #${quotation.quotationNumber} [Method: ${paymentOption}, Received: ₹${effectiveReceived}]`,
          ...(orderItemsData.length > 0 ? {
            items: {
              create: orderItemsData
            }
          } : {})
        }
      });

      // 2. Update Quotation Status to Converted
      await tx.quotation.update({
        where: { id: quotationId },
        data: { 
          status: "Converted",
          organizationId: quotation.organizationId || orgId,
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

      // 3. Deduct stock for line items and record inventory transactions
      for (const item of quotation.items || []) {
        const q = Math.max(1, Math.round(Number(item.quantity) || 1));
        if (q > 0 && item.productId && existingProductMap.has(item.productId)) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { decrement: q } }
          });
          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              quantity: q,
              type: 'OUT',
              reference: orderNumber,
              notes: `Quotation #${quotation.quotationNumber} converted to Sales Order ${orderNumber}`
            }
          });
        }
      }

      // 4. Create Tax Invoice for this order
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          organizationId: orgId,
          customerId: quotation.customerId,
          orderId: createdOrder.id,
          invoiceDate: quotationEffectiveDate,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal: quotation.subtotal,
          taxAmount: quotation.taxTotal,
          discountAmount: overrideDiscount,
          totalAmount: quotation.totalValue,
          amountPaid: effectiveReceived,
          amountDue: Math.max(0, quotation.totalValue - effectiveReceived),
          status: invoiceStatus,
          paymentTerms: quotation.paymentTerms || 'Net 30',
          notes: `Auto-generated on converting Quotation #${quotation.quotationNumber}`
        }
      });

      // 5. If advance payment was received, record Payment transaction
      if (effectiveReceived > 0 && paymentNumber) {
        await tx.payment.create({
          data: {
            paymentNumber,
            invoiceId: createdInvoice.id,
            customerId: quotation.customerId,
            orderId: createdOrder.id,
            amount: effectiveReceived,
            paymentDate: new Date(),
            paymentMode: confirmationData?.paymentMode || (paymentOption === 'TOKEN' ? 'Token Advance' : 'Bank Transfer'),
            referenceNumber: orderNumber,
            status: 'Completed',
            notes: `Advance payment upon converting Quotation #${quotation.quotationNumber}`
          }
        });
      }

      // 6. Mark customer as WON in the Sales Pipeline on conversion
      await tx.customer.update({
        where: { id: quotation.customerId },
        data: {
          leadStage: "Won",
          status: "Active Lead",
          totalPurchaseValue: { increment: quotation.totalValue }
        }
      });

      return { order: createdOrder, invoice: createdInvoice };
    });

    try {
      revalidatePath("/quotations");
      revalidatePath(`/quotations/${quotationId}`);
      revalidatePath("/orders");
      revalidatePath(`/orders/${order.id}`);
      revalidatePath(`/orders/${order.id}/invoice`);
      revalidatePath("/invoices");
      revalidatePath(`/invoices/${invoice.id}`);
      revalidatePath("/payments");
      revalidatePath("/products");
      revalidatePath("/leads");
      revalidatePath("/customers");
      revalidatePath("/", "layout");
    } catch (revalErr) {
      console.warn("Revalidation warning:", revalErr);
    }

    return { 
      success: true, 
      orderId: order.id, 
      orderNumber: order.orderNumber,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber
    };
  } catch (error: any) {
    console.error("Error converting quotation to order:", error);
    return { error: error?.message || "Failed to convert quotation to order" };
  }
}

export async function deleteQuotation(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const organizationId = await getTenantOrgId();
    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (!quotation) return { error: "Quotation not found" };
    if (quotation.organizationId !== organizationId) {
      return { error: "Unauthorized access to quotation" };
    }

    await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
    await prisma.quotationActivity.deleteMany({ where: { quotationId: id } });
    await prisma.quotation.delete({ where: { id } });

    if (quotation) {
      const linkedOrders = await prisma.order.findMany({
        where: { notes: { contains: `Converted from Quotation #${quotation.quotationNumber}` } }
      });
      for (const order of linkedOrders) {
        const invoices = await prisma.invoice.findMany({ where: { orderId: order.id } });
        for (const inv of invoices) {
          await prisma.payment.updateMany({ where: { invoiceId: inv.id }, data: { invoiceId: null } }).catch(() => {});
          await prisma.creditNote.updateMany({ where: { invoiceId: inv.id }, data: { invoiceId: null } }).catch(() => {});
        }
        await prisma.invoice.deleteMany({ where: { orderId: order.id } }).catch(() => {});
        await prisma.orderItem.deleteMany({ where: { orderId: order.id } }).catch(() => {});
        await prisma.eWayBill.deleteMany({ where: { orderId: order.id } }).catch(() => {});
        await prisma.payment.updateMany({ where: { orderId: order.id }, data: { orderId: null } }).catch(() => {});
        await prisma.order.delete({ where: { id: order.id } }).catch(e => console.warn("Failed to delete linked order", e));
      }
    }

    revalidatePath("/quotations");
    revalidatePath("/orders");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting quotation:", error);
    return { error: error?.message || "Failed to delete quotation" };
  }
}

// ─── Confirm Quotation (sets status = "Confirmed", stores payment info) ───────
// Does NOT create a Sales Order or Invoice. That happens via "Convert to Invoice".
export async function confirmQuotation(
  quotationId: string,
  discountSlab: string = '1-15',
  confirmationData?: {
    paymentOption: 'FULL' | 'TOKEN' | 'CREDIT';
    tokenAmount?: number;
  }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;
    const userName = (session?.user as any)?.name || "System";

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { customer: true }
    });

    if (!quotation) return { error: "Quotation not found" };
    if (quotation.status === 'Confirmed' || quotation.status === 'Converted') {
      return { error: "Quotation is already confirmed or converted." };
    }

    const paymentOption = confirmationData?.paymentOption || 'FULL';
    let effectiveReceived = 0;

    if (paymentOption === 'FULL') {
      effectiveReceived = quotation.totalValue;
    } else if (paymentOption === 'TOKEN') {
      const amt = Number(confirmationData?.tokenAmount || 0);
      if (amt <= 0) return { error: "Please enter a valid token/advance payment amount (greater than ₹0)." };
      effectiveReceived = amt;
    } else if (paymentOption === 'CREDIT') {
      effectiveReceived = 0;
    }

    const nowConfirmed = new Date();
    await prisma.quotation.update({
      where: { id: quotationId },
      data: {
        status: "Confirmed",
        acceptedDate: nowConfirmed,
        receivedAmount: effectiveReceived,
        discountSlab: discountSlab,
        activities: {
          create: {
            userId,
            userName,
            action: "Quotation Confirmed",
            details: `Quotation confirmed [Method: ${paymentOption}, Received: ₹${effectiveReceived}, Structure: ${discountSlab}]`
          }
        }
      }
    });

    // ── Mark customer as MATURED / WON in the Sales Pipeline ──────────────
    // A confirmed quotation (token, credit, or full) = committed sale intent.
    // Advance leadStage → "Won" and update totalPurchaseValue.
    try {
      const currentCustomer = await prisma.customer.findUnique({
        where: { id: quotation.customerId },
        select: { leadStage: true, totalPurchaseValue: true }
      });
      // Only advance if not already Won or beyond
      const alreadyWon = ["Won", "Converted"].includes(currentCustomer?.leadStage || "");
      await prisma.customer.update({
        where: { id: quotation.customerId },
        data: {
          leadStage: alreadyWon ? currentCustomer!.leadStage : "Won",
          status: "Active Lead",
          totalPurchaseValue: {
            increment: paymentOption === "CREDIT" ? 0 : effectiveReceived
          }
        }
      });
    } catch (cErr) {
      console.warn("Could not update customer lead stage on confirm:", cErr);
    }

    revalidatePath("/quotations");
    revalidatePath("/leads");
    revalidatePath("/customers");
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("Error confirming quotation:", error);
    return { error: "Failed to confirm quotation" };
  }
}

// ─── Update Token / Advance Amount for Confirmed Quotation ──────────────
export async function updateQuotationTokenAmount(
  quotationId: string,
  newTokenAmount: number,
  paymentOption?: 'FULL' | 'TOKEN' | 'CREDIT',
  discountSlab?: string
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;
    const userName = (session?.user as any)?.name || "System";

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { customer: true }
    });

    if (!quotation) return { error: "Quotation not found" };

    const prevReceived = Number(quotation.receivedAmount || 0);
    const newReceived = Math.max(0, Number(newTokenAmount || 0));
    const delta = newReceived - prevReceived;
    const oldSlab = quotation.discountSlab || "1-15";

    const updateData: any = {
      receivedAmount: newReceived,
    };
    if (discountSlab) {
      updateData.discountSlab = discountSlab;
    }

    let detailMsg = `Token amount updated from ₹${prevReceived.toLocaleString('en-IN')} to ₹${newReceived.toLocaleString('en-IN')}`;
    if (discountSlab && discountSlab !== oldSlab) {
      detailMsg += ` | Pricing structure changed from ${oldSlab} to ${discountSlab}`;
    }

    await prisma.quotation.update({
      where: { id: quotationId },
      data: {
        ...updateData,
        activities: {
          create: {
            userId,
            userName,
            action: "Token/Pricing Updated",
            details: detailMsg
          }
        }
      }
    });

    // Adjust customer total purchase value
    if (delta !== 0 && quotation.customerId) {
      try {
        await prisma.customer.update({
          where: { id: quotation.customerId },
          data: {
            totalPurchaseValue: {
              increment: delta
            }
          }
        });
      } catch (cErr) {
        console.warn("Could not adjust customer totalPurchaseValue:", cErr);
      }
    }

    revalidatePath("/quotations");
    revalidatePath(`/quotations/${quotationId}`);
    revalidatePath("/customers");
    revalidatePath("/", "layout");

    return { success: true, receivedAmount: newReceived };
  } catch (error: any) {
    console.error("Error updating quotation token amount:", error);
    return { error: error?.message || "Failed to update token amount" };
  }
}

// ─── Update Pricing Structure (Admin Only) ───────
export async function updatePricingStructure(quotationId: string, discountSlab: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;
    const userName = (session?.user as any)?.name || "System";
    const rawRole = (session?.user as any)?.role || 'SALES';
    const normRole = String(rawRole).trim().toUpperCase();
    const isAdmin = normRole === 'ADMIN' || normRole === 'SUPER_ADMIN';

    if (!isAdmin) {
      return { error: "Only admins are allowed to edit the pricing structure." };
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId }
    });

    if (!quotation) return { error: "Quotation not found" };

    const oldSlab = quotation.discountSlab || "1-15";

    await prisma.quotation.update({
      where: { id: quotationId },
      data: {
        discountSlab,
        activities: {
          create: {
            userId,
            userName,
            action: "Pricing Structure Updated",
            details: `Admin changed pricing structure from ${oldSlab} to ${discountSlab}`
          }
        }
      }
    });

    revalidatePath("/quotations");
    revalidatePath(`/quotations/${quotationId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating pricing structure:", error);
    return { error: error?.message || "Failed to update pricing structure" };
  }
}
