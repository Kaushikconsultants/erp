"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateItemGst } from "@/lib/gstUtils";
import { getCompanySettings, invalidateCompanySettingsCache } from "./companyActions";
import { getTenantOrgId } from "@/lib/tenant";

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

    revalidatePath("/quotations");
    revalidatePath("/quotations", "page");
    revalidatePath("/orders");
    revalidatePath("/");
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

    revalidatePath("/quotations");
    revalidatePath("/quotations", "page");
    revalidatePath(`/quotations/${id}`);
    revalidatePath(`/quotations/${id}/edit`);
    revalidatePath("/orders");
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

    const organizationId = await getTenantOrgId();
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
      include: { items: true, customer: true }
    });

    if (!quotation) return { error: "Quotation not found" };

    const orgId = quotation.organizationId || (session?.user as any)?.organizationId || (await getTenantOrgId());

    // If quotation was already Confirmed, reuse the stored receivedAmount from the Confirm step
    const paymentOption = confirmationData?.paymentOption || 'FULL';
    let effectiveReceived = 0;
    let overridePaymentStatus = "Unpaid";

    if (quotation.status === 'Confirmed' && quotation.receivedAmount > 0) {
      // Use the amount already confirmed and stored
      effectiveReceived = quotation.receivedAmount;
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
    const overrideDiscount = quotation.itemDiscount + quotation.additionalDiscount;

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    // Resolve a valid salespersonId
    let salespersonId = quotation.salespersonId;
    if (!salespersonId) {
      const defaultEmp = await prisma.employee.findFirst({
        where: orgId ? { organizationId: orgId } : undefined
      }) || await prisma.employee.findFirst();
      salespersonId = defaultEmp?.id || "";
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        organizationId: orgId,
        customerId: quotation.customerId,
        salespersonId,
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

    // Automatically generate invoice for this order
    const invoiceCount = await prisma.invoice.count({ where: { organizationId: orgId } });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(5, '0')}`;
    const invoiceStatus = effectiveReceived >= quotation.totalValue ? 'Paid' : effectiveReceived > 0 ? 'Partially Paid' : 'Unpaid';

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        organizationId: orgId,
        customerId: quotation.customerId,
        orderId: order.id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: quotation.subtotal,
        taxAmount: quotation.taxTotal,
        discountAmount: quotation.itemDiscount + quotation.additionalDiscount,
        totalAmount: quotation.totalValue,
        amountPaid: effectiveReceived,
        amountDue: Math.max(0, quotation.totalValue - effectiveReceived),
        status: invoiceStatus,
        paymentTerms: 'Net 30',
        notes: `Auto-generated on converting Quotation #${quotation.quotationNumber}`
      }
    });

    // If advance payment was received, record Payment transaction
    if (effectiveReceived > 0) {
      try {
        const paymentNumber = `PAY-${Date.now().toString().slice(-6)}`;
        await prisma.payment.create({
          data: {
            paymentNumber,
            invoiceId: invoice.id,
            customerId: quotation.customerId,
            orderId: order.id,
            amount: effectiveReceived,
            paymentDate: new Date(),
            paymentMode: paymentOption || 'Bank Transfer',
            referenceNumber: orderNumber,
            status: 'Completed',
            notes: `Advance payment upon converting Quotation #${quotation.quotationNumber}`
          }
        });
      } catch (payErr) {
        console.warn("Failed to record advance payment:", payErr);
      }
    }

    // ── Mark customer as WON in the Sales Pipeline on conversion ─────────
    try {
      await prisma.customer.update({
        where: { id: quotation.customerId },
        data: {
          leadStage: "Won",
          status: "Active Lead",
          totalPurchaseValue: { increment: quotation.totalValue }
        }
      });
    } catch (cErr) {
      console.warn("Could not update customer lead stage on convert:", cErr);
    }

    revalidatePath("/quotations");
    revalidatePath(`/quotations/${quotationId}`);
    revalidatePath("/orders");
    revalidatePath(`/orders/${order.id}`);
    revalidatePath(`/orders/${order.id}/invoice`);
    revalidatePath("/invoices");
    revalidatePath("/payments");
    revalidatePath("/products");
    revalidatePath("/leads");
    revalidatePath("/customers");
    revalidatePath("/", "layout");

    return { 
      success: true, 
      orderId: order.id, 
      orderNumber: order.orderNumber,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber
    };
  } catch (error) {
    console.error("Error converting quotation to order:", error);
    return { error: "Failed to convert quotation to order" };
  }
}

export async function deleteQuotation(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };
    const quotation = await prisma.quotation.findUnique({ where: { id } });

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

    await prisma.quotation.update({
      where: { id: quotationId },
      data: {
        status: "Confirmed",
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
