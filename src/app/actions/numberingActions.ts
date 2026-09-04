"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { getFinancialYear } from "@/lib/documentNumbering";

export interface DocSeriesItem {
  docType: string;
  title: string;
  prefix: string;
  suffix: string;
  nextNumber: number;
  zeroPadding: number;
}

const DEFAULT_SERIES_DEFINITIONS: DocSeriesItem[] = [
  { docType: "INVOICE", title: "Tax Invoices", prefix: "INV/{FY}/", suffix: "", nextNumber: 1001, zeroPadding: 4 },
  { docType: "QUOTATION", title: "Sales Quotations", prefix: "QT/{FY}/", suffix: "", nextNumber: 1001, zeroPadding: 4 },
  { docType: "ORDER", title: "Sales Orders", prefix: "ORD/{FY}/", suffix: "", nextNumber: 1001, zeroPadding: 4 },
  { docType: "DELIVERY_CHALLAN", title: "Delivery Challans (DC)", prefix: "DC/{FY}/", suffix: "", nextNumber: 1001, zeroPadding: 4 },
  { docType: "CREDIT_NOTE", title: "Credit Notes", prefix: "CN/{FY}/", suffix: "", nextNumber: 1001, zeroPadding: 4 },
  { docType: "PURCHASE_ORDER", title: "Purchase Orders (PO)", prefix: "PO/{FY}/", suffix: "", nextNumber: 1001, zeroPadding: 4 },
  { docType: "BILL", title: "Vendor Bills", prefix: "BILL/{FY}/", suffix: "", nextNumber: 1001, zeroPadding: 4 },
  { docType: "DEBIT_NOTE", title: "Vendor Debit Notes", prefix: "DN/{FY}/", suffix: "", nextNumber: 1001, zeroPadding: 4 },
  { docType: "PAYMENT", title: "Customer Payments", prefix: "PAY/{FY}/", suffix: "", nextNumber: 1001, zeroPadding: 4 },
  { docType: "VENDOR_PAYMENT", title: "Vendor Payments Made", prefix: "VPAY/{FY}/", suffix: "", nextNumber: 1001, zeroPadding: 4 }
];

export async function getDocumentSequences() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const orgId = await getTenantOrgId();
    const currentFy = getFinancialYear();

    const dbSequences = await prisma.documentSequence.findMany({
      where: {
        organizationId: orgId,
        financialYear: currentFy
      }
    });

    const seqMap = new Map(dbSequences.map(s => [s.docType, s]));

    const mergedSeries: DocSeriesItem[] = DEFAULT_SERIES_DEFINITIONS.map(def => {
      const dbSeq = seqMap.get(def.docType);
      if (dbSeq) {
        return {
          docType: def.docType,
          title: def.title,
          prefix: dbSeq.prefix || def.prefix,
          suffix: dbSeq.suffix || def.suffix,
          nextNumber: dbSeq.nextNumber || def.nextNumber,
          zeroPadding: dbSeq.zeroPadding || def.zeroPadding
        };
      }
      return def;
    });

    return {
      success: true,
      currentFy,
      seriesList: mergedSeries
    };
  } catch (error: any) {
    console.error("[getDocumentSequences Error]:", error);
    return { success: false, error: error.message || "Failed to load document sequences", seriesList: DEFAULT_SERIES_DEFINITIONS };
  }
}

export async function saveDocumentSequences(seriesList: DocSeriesItem[]) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const orgId = await getTenantOrgId();
    const currentFy = getFinancialYear();

    for (const item of seriesList) {
      const existing = await prisma.documentSequence.findFirst({
        where: {
          organizationId: orgId,
          docType: item.docType,
          financialYear: currentFy
        }
      });

      if (existing) {
        await prisma.documentSequence.update({
          where: { id: existing.id },
          data: {
            prefix: item.prefix,
            suffix: item.suffix || "",
            nextNumber: Number(item.nextNumber) || 1001,
            zeroPadding: Number(item.zeroPadding) || 4,
            updatedAt: new Date()
          }
        });
      } else {
        await prisma.documentSequence.create({
          data: {
            organizationId: orgId,
            docType: item.docType,
            financialYear: currentFy,
            prefix: item.prefix,
            suffix: item.suffix || "",
            nextNumber: Number(item.nextNumber) || 1001,
            zeroPadding: Number(item.zeroPadding) || 4,
            isDefault: true
          }
        });
      }
    }

    revalidatePath("/settings/numbering");
    revalidatePath("/invoices");
    revalidatePath("/quotations");
    revalidatePath("/orders");
    revalidatePath("/bills");
    return { success: true };
  } catch (error: any) {
    console.error("[saveDocumentSequences Error]:", error);
    return { success: false, error: error.message || "Failed to save document sequences" };
  }
}
