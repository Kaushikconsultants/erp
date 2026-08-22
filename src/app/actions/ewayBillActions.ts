"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface GenerateEWayBillInput {
  orderId?: string;
  customerId?: string;
  docType?: string; // "Tax Invoice" | "Bill of Supply" | "Delivery Challan" | "Credit Note"
  docNumber: string;
  docDate?: string;
  
  supplyType?: string; // "Outward" | "Inward"
  subSupplyType?: string; // "Supply" | "Export" | "Job Work" | "For Own Use" | "Line Sales"
  transactionType?: string; // "Regular" | "Bill To - Ship To" | "Bill From - Dispatch From"

  fromGstin?: string;
  fromTradeName?: string;
  fromAddress?: string;
  fromPlace?: string;
  fromPincode?: string;
  fromState?: string;

  toGstin?: string;
  toTradeName?: string;
  toAddress?: string;
  toPlace?: string;
  toPincode?: string;
  toState?: string;

  totalTaxableAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  cessAmount?: number;
  totalInvoiceValue: number;
  mainHsnCode?: string;

  transporterId?: string;
  transporterName?: string;
  transportMode?: string; // "Road" | "Rail" | "Air" | "Ship"
  approxDistanceKm?: number;
  vehicleType?: string; // "Regular" | "Over Dimensional Cargo"
  vehicleNumber?: string;
  docNoOrLorryReceipt?: string;
  docDatePartB?: string;
  notes?: string;
}

export async function getEWayBills(filters?: {
  search?: string;
  status?: string;
  transportMode?: string;
}) {
  try {
    const where: any = {};

    if (filters?.status && filters.status !== 'All') {
      where.status = filters.status;
    }

    if (filters?.transportMode && filters.transportMode !== 'All') {
      where.transportMode = filters.transportMode;
    }

    if (filters?.search) {
      const q = filters.search.trim();
      where.OR = [
        { ewbNumber: { contains: q, mode: 'insensitive' } },
        { docNumber: { contains: q, mode: 'insensitive' } },
        { vehicleNumber: { contains: q, mode: 'insensitive' } },
        { toTradeName: { contains: q, mode: 'insensitive' } },
        { transporterName: { contains: q, mode: 'insensitive' } },
        { customer: { businessName: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const ewayBills = await prisma.eWayBill.findMany({
      where,
      include: {
        customer: true,
        order: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, ewayBills };
  } catch (error: any) {
    console.error("Failed to fetch E-Way Bills:", error);
    return { success: false, error: error.message || "Failed to fetch E-Way Bills", ewayBills: [] };
  }
}

export async function getEWayBillById(id: string) {
  try {
    const ewayBill = await prisma.eWayBill.findUnique({
      where: { id },
      include: {
        customer: true,
        order: {
          include: {
            items: { include: { product: true } },
            salesperson: { include: { user: true } },
            invoices: true
          }
        }
      }
    });

    if (!ewayBill) {
      return { success: false, error: "E-Way Bill not found" };
    }

    return { success: true, ewayBill };
  } catch (error: any) {
    console.error("Failed to fetch E-Way Bill by ID:", error);
    return { success: false, error: error.message || "Failed to fetch E-Way Bill" };
  }
}

export async function generateRandomEWBNumber(): Promise<string> {
  // Official GST format is 12 digits e.g. 141289345678
  const prefix = "14" + String(new Date().getFullYear()).slice(2);
  const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
  return `${prefix}${randomSuffix}`;
}

export async function generateEWayBill(input: GenerateEWayBillInput) {
  try {
    if (!input.docNumber) {
      return { success: false, error: "Document Number is required" };
    }

    const ewbNumber = await generateRandomEWBNumber();
    const distance = Number(input.approxDistanceKm) || 100;

    // Rule under GST: Validity is 1 day for every 200 km (or part thereof)
    const validDays = Math.max(1, Math.ceil(distance / 200));
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);
    validUntil.setHours(23, 59, 59, 999);

    // Get company settings for default consignor info if not provided
    const company = await prisma.companySettings.findFirst();

    const fromGstin = input.fromGstin || company?.gstin || "06AAHCE7721Q1Z4";
    const fromTradeName = input.fromTradeName || company?.companyName || "ESPON CLOTHING PRIVATE LIMITED";
    const fromAddress = input.fromAddress || company?.address || "123 Industrial Area, Sector 4";
    const fromPlace = input.fromPlace || company?.city || "Rohtak";
    const fromPincode = input.fromPincode || company?.pincode || "124001";
    const fromState = input.fromState || company?.state || "Haryana";

    const ewayBill = await prisma.eWayBill.create({
      data: {
        ewbNumber,
        ewbDate: new Date(),
        validUntil,
        docType: input.docType || "Tax Invoice",
        docNumber: input.docNumber,
        docDate: input.docDate ? new Date(input.docDate) : new Date(),
        
        orderId: input.orderId || null,
        customerId: input.customerId || null,

        supplyType: input.supplyType || "Outward",
        subSupplyType: input.subSupplyType || "Supply",
        transactionType: input.transactionType || "Regular",

        fromGstin,
        fromTradeName,
        fromAddress,
        fromPlace,
        fromPincode,
        fromState,

        toGstin: input.toGstin || null,
        toTradeName: input.toTradeName || null,
        toAddress: input.toAddress || null,
        toPlace: input.toPlace || null,
        toPincode: input.toPincode || null,
        toState: input.toState || null,

        totalTaxableAmount: Number(input.totalTaxableAmount) || 0,
        cgstAmount: Number(input.cgstAmount) || 0,
        sgstAmount: Number(input.sgstAmount) || 0,
        igstAmount: Number(input.igstAmount) || 0,
        cessAmount: Number(input.cessAmount) || 0,
        totalInvoiceValue: Number(input.totalInvoiceValue) || 0,
        mainHsnCode: input.mainHsnCode || "6109",

        transporterId: input.transporterId || null,
        transporterName: input.transporterName || null,
        transportMode: input.transportMode || "Road",
        approxDistanceKm: distance,
        vehicleType: input.vehicleType || "Regular",
        vehicleNumber: input.vehicleNumber ? input.vehicleNumber.toUpperCase().trim() : null,
        docNoOrLorryReceipt: input.docNoOrLorryReceipt || null,
        docDatePartB: input.docDatePartB ? new Date(input.docDatePartB) : new Date(),

        status: "GENERATED",
        notes: input.notes || null
      }
    });

    // If linked to Order, update order dispatch details with AWB/Vehicle & status
    if (input.orderId) {
      await prisma.order.update({
        where: { id: input.orderId },
        data: {
          awbNumber: input.docNoOrLorryReceipt || input.vehicleNumber || ewbNumber,
          courierName: input.transporterName || "Logistics",
          dispatchDate: new Date(),
          shippingStatus: "In Transit"
        }
      });
    }

    revalidatePath("/eway-bills");
    revalidatePath("/dispatches");
    revalidatePath("/orders");

    return { success: true, ewayBill };
  } catch (error: any) {
    console.error("Failed to generate E-Way Bill:", error);
    return { success: false, error: error.message || "Failed to generate E-Way Bill" };
  }
}

export async function cancelEWayBill(id: string, reason?: string) {
  try {
    const ewb = await prisma.eWayBill.findUnique({ where: { id } });
    if (!ewb) return { success: false, error: "E-Way Bill not found" };

    await prisma.eWayBill.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelReason: reason || "Cancelled by User",
        notes: `${ewb.notes || ''} [Cancelled: ${reason || 'User Request'}]`
      }
    });

    revalidatePath("/eway-bills");
    revalidatePath("/dispatches");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to cancel E-Way Bill:", error);
    return { success: false, error: error.message || "Failed to cancel E-Way Bill" };
  }
}

export async function updateEWayBillPartB(id: string, data: {
  vehicleNumber: string;
  transporterName?: string;
  docNoOrLorryReceipt?: string;
  transportMode?: string;
  reason?: string;
}) {
  try {
    const ewb = await prisma.eWayBill.findUnique({ where: { id } });
    if (!ewb) return { success: false, error: "E-Way Bill not found" };

    await prisma.eWayBill.update({
      where: { id },
      data: {
        vehicleNumber: data.vehicleNumber.toUpperCase().trim(),
        transporterName: data.transporterName || ewb.transporterName,
        docNoOrLorryReceipt: data.docNoOrLorryReceipt || ewb.docNoOrLorryReceipt,
        transportMode: data.transportMode || ewb.transportMode,
        status: "ACTIVE",
        notes: `${ewb.notes || ''} [Vehicle Updated to ${data.vehicleNumber}: ${data.reason || 'Transit Update'}]`
      }
    });

    revalidatePath("/eway-bills");
    revalidatePath("/dispatches");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to update Part B:", error);
    return { success: false, error: error.message || "Failed to update Part B" };
  }
}
