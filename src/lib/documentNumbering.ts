import { prisma } from "@/lib/prisma";

export function getFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth(); // 0-indexed (0 = Jan, 3 = April)
  const fullYear = date.getFullYear();
  const startYear = month >= 3 ? fullYear : fullYear - 1;
  const endYear = startYear + 1;
  return `${startYear}-${String(endYear).slice(-2)}`;
}

export interface SequenceConfig {
  docType: string;
  prefix: string;
  suffix?: string;
  nextNumber: number;
  zeroPadding: number;
  financialYear?: string;
  branchCode?: string;
}

/**
 * Generate the next formatted document number for an organization
 * Atomically increments the sequence in DocumentSequence
 */
export async function generateNextDocumentNumber(
  organizationId: string,
  docType: 'INVOICE' | 'QUOTATION' | 'ORDER' | 'PURCHASE_ORDER' | 'BILL' | 'DELIVERY_CHALLAN' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'PAYMENT' | 'VENDOR_PAYMENT' | 'PROFORMA_INVOICE' | 'GRN' | 'SALES_RETURN',
  branchCode?: string
): Promise<string> {
  const currentFy = getFinancialYear();
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');

  // Default prefixes if not configured
  const DEFAULT_PREFIXES: Record<string, string> = {
    INVOICE: 'INV/{FY}/',
    PROFORMA_INVOICE: 'PI/{FY}/',
    QUOTATION: 'QT/{FY}/',
    ORDER: 'ORD/{FY}/',
    PURCHASE_ORDER: 'PO/{FY}/',
    BILL: 'BILL/{FY}/',
    DELIVERY_CHALLAN: 'DC/{FY}/',
    CREDIT_NOTE: 'CN/{FY}/',
    DEBIT_NOTE: 'DN/{FY}/',
    PAYMENT: 'PAY/{FY}/',
    VENDOR_PAYMENT: 'VPAY/{FY}/',
    GRN: 'GRN/{FY}/',
    SALES_RETURN: 'RMA/{FY}/'
  };

  try {
    let seq = await prisma.documentSequence.findFirst({
      where: {
        organizationId,
        docType,
        financialYear: currentFy
      }
    });

    if (!seq) {
      seq = await prisma.documentSequence.create({
        data: {
          organizationId,
          docType,
          prefix: DEFAULT_PREFIXES[docType] || `${docType.slice(0, 3)}/{FY}/`,
          nextNumber: 1001,
          zeroPadding: 4,
          financialYear: currentFy,
          isDefault: true
        }
      });
    }

    const currentNum = seq.nextNumber;

    // Increment next number
    await prisma.documentSequence.update({
      where: { id: seq.id },
      data: { nextNumber: currentNum + 1 }
    });

    // Format prefix tags
    let formattedPrefix = seq.prefix
      .replace(/{FY}/g, currentFy)
      .replace(/{YYYY}/g, yyyy)
      .replace(/{YY}/g, yy)
      .replace(/{MM}/g, mm)
      .replace(/{BRANCH}/g, branchCode || 'HO');

    const formattedNumber = String(currentNum).padStart(seq.zeroPadding, '0');
    const suffix = seq.suffix ? seq.suffix.replace(/{BRANCH}/g, branchCode || '') : '';

    return `${formattedPrefix}${formattedNumber}${suffix}`;
  } catch (err) {
    console.error("Error generating document number:", err);
    // Fallback timestamp code
    return `${docType.slice(0, 3)}-${Date.now().toString().slice(-6)}`;
  }
}
