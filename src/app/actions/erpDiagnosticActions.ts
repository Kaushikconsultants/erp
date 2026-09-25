"use server";

import { prisma } from "@/lib/prisma";
import { getTenantOrgId } from "@/lib/tenant";
import { askSmartAIJSON } from "@/lib/aiClient";

export interface DiagnosticResult {
  success: boolean;
  issueCategory: "DOCUMENT_LOCK" | "INVENTORY_MISMATCH" | "LEDGER_BALANCE" | "GST_VALIDATION" | "GENERAL_SUPPORT";
  status: "IDENTIFIED" | "HEALTHY" | "CANNOT_DETERMINE";
  diagnosis: string;
  diagnosisHindi?: string;
  rootCause: string;
  solutionSteps: string[];
  suggestedAction?: { label: string; href: string };
  canEscalateToTicket: boolean;
  diagnosticSnapshot?: any;
  provider?: string;
}

/**
 * Commercial ERP Self-Service Diagnostic Engine
 * Runs read-only audits against tenant data to explain why a transaction is blocked.
 */
export async function diagnoseErpIssue(params: {
  issueQuery: string;
  documentType?: "INVOICE" | "QUOTATION" | "PRODUCT" | "CUSTOMER" | "TRANSFER";
  documentNumberOrId?: string;
  preferredProvider?: "gemini" | "openai";
}): Promise<DiagnosticResult> {
  try {
    let organizationId: string | null = null;
    try {
      organizationId = await getTenantOrgId();
    } catch {
      const defaultOrg = await prisma?.organization?.findFirst();
      organizationId = defaultOrg?.id || null;
    }
    if (!organizationId) {
      const defaultOrg = await prisma?.organization?.findFirst();
      organizationId = defaultOrg?.id || null;
    }

    if (!organizationId) {
      return {
        success: false,
        issueCategory: "GENERAL_SUPPORT",
        status: "CANNOT_DETERMINE",
        diagnosis: "Please log in to your company organization to run diagnostic audits.",
        rootCause: "Session organization context missing.",
        solutionSteps: ["Refresh the page and log in with your organization account."],
        canEscalateToTicket: false
      };
    }

    const q = params.issueQuery.toLowerCase();
    const docRef = params.documentNumberOrId?.trim();

    // -------------------------------------------------------------------------
    // 1. DIAGNOSTIC: Document Locked / Cannot Delete Invoice or Order
    // -------------------------------------------------------------------------
    if (q.includes("delete") || q.includes("cancel") || q.includes("lock") || q.includes("हटा") || q.includes("डिलीट")) {
      if (params.documentType === "INVOICE" || q.includes("invoice") || q.includes("order") || q.includes("बिल")) {
        // Find recent invoice or matching number
        const invoice = docRef
          ? await prisma.order.findFirst({
              where: {
                organizationId,
                OR: [{ id: docRef }, { orderNumber: { contains: docRef, mode: "insensitive" } }]
              },
              include: { customer: true }
            })
          : await prisma.order.findFirst({
              where: { organizationId },
              orderBy: { createdAt: "desc" },
              include: { customer: true }
            });

        if (invoice) {
          const challan = typeof (prisma as any)?.deliveryChallan?.findFirst === "function"
            ? await (prisma as any).deliveryChallan.findFirst({
                where: { convertedInvoiceId: invoice.id }
              })
            : null;
          const hasPayments = (invoice.paymentReceived || 0) > 0;
          const hasChallans = Boolean(challan) || Boolean((invoice as any)?.deliveryChallans?.length);
          const currentStatus = invoice.orderStatus || invoice.shippingStatus || "Pending";
          const isFinalStatus = ["Delivered", "Completed", "Dispatched"].includes(currentStatus);

          if (hasPayments || hasChallans || isFinalStatus) {
            return {
              success: true,
              issueCategory: "DOCUMENT_LOCK",
              status: "IDENTIFIED",
              diagnosis: `Invoice #${invoice.orderNumber} cannot be directly deleted because financial or dispatch commitments have already been recorded.`,
              diagnosisHindi: `इनवॉइस #${invoice.orderNumber} को सीधे डिलीट नहीं किया जा सकता क्योंकि इसके खिलाफ पेमेंट या डिलीवरी रिकॉर्ड हो चुकी है।`,
              rootCause: hasPayments
                ? `Received payment of ₹${invoice.paymentReceived?.toLocaleString("en-IN")} is linked to this invoice in the accounts ledger.`
                : `Dispatch challan #${challan?.challanNumber || 'DC-linked'} has already deducted stock.`,
              solutionSteps: [
                "1. If payment was received by mistake: Reverse the payment voucher under Accounting > Vouchers.",
                "2. If goods were returned: Issue a Credit Note instead of deleting the original invoice (keeps GST audit trail safe).",
                "3. Alternatively, change status to 'Cancelled' rather than deleting."
              ],
              suggestedAction: { label: `View Order #${invoice.orderNumber}`, href: `/orders` },
              canEscalateToTicket: true,
              diagnosticSnapshot: {
                orderNumber: invoice.orderNumber,
                status: currentStatus,
                paymentReceived: invoice.paymentReceived,
                challansCount: hasChallans ? 1 : 0
              }
            };
          }
        }
      }

      // Customer Deletion Check
      if (params.documentType === "CUSTOMER" || q.includes("customer") || q.includes("party") || q.includes("ग्राहक")) {
        const customer = docRef
          ? await prisma.customer.findFirst({
              where: {
                organizationId,
                OR: [{ id: docRef }, { businessName: { contains: docRef, mode: "insensitive" } }]
              },
              include: { _count: { select: { orders: true, quotations: true } } }
            })
          : null;

        if (customer && (customer._count.orders > 0 || customer._count.quotations > 0)) {
          return {
            success: true,
            issueCategory: "DOCUMENT_LOCK",
            status: "IDENTIFIED",
            diagnosis: `Customer '${customer.businessName}' cannot be deleted because they have existing transaction history.`,
            diagnosisHindi: `ग्राहक '${customer.businessName}' को डिलीट नहीं किया जा सकता क्योंकि इसके नाम पर पिछले ऑर्डर्स या कोटेशन दर्ज हैं।`,
            rootCause: `Customer has ${customer._count.orders} order(s) and ${customer._count.quotations} quotation(s) linked to company ledgers.`,
            solutionSteps: [
              "1. In GST and accounting standards, active accounts cannot be purged to preserve audit balance.",
              "2. Open the Customer profile and switch status from 'Active' to 'Inactive' or 'Blocked'.",
              "3. This will hide them from new billing dropdowns without breaking past accounting reports."
            ],
            suggestedAction: { label: "Customer Profile", href: `/customers/${customer.id}` },
            canEscalateToTicket: false
          };
        }
      }
    }

    // -------------------------------------------------------------------------
    // 2. DIAGNOSTIC: Low / Negative Stock Discrepancies
    // -------------------------------------------------------------------------
    if (q.includes("stock") || q.includes("inventory") || q.includes("minus") || q.includes("negative") || q.includes("माल") || q.includes("स्टॉक")) {
      const lowStockProducts = await prisma.product.findMany({
        where: {
          organizationId,
          stockQuantity: { lte: 0 }
        },
        take: 3,
        select: { id: true, name: true, stockQuantity: true, sku: true }
      });

      if (lowStockProducts.length > 0) {
        return {
          success: true,
          issueCategory: "INVENTORY_MISMATCH",
          status: "IDENTIFIED",
          diagnosis: `Detected ${lowStockProducts.length} product(s) with 0 or negative warehouse balance.`,
          diagnosisHindi: `गोदाम में ${lowStockProducts.length} आर्टिकल 0 या माइनस स्टॉक में पाए गए हैं।`,
          rootCause: `Items were billed or dispatched before an Inward Challan or Purchase Bill was recorded.`,
          solutionSteps: [
            `Affected Products: ${lowStockProducts.map(p => `${p.name} (Qty: ${p.stockQuantity})`).join(", ")}`,
            "1. Record a Purchase Inward (Bill/Purchase Order) to credit the stock.",
            "2. Or go to Inventory > Stock Transfer to move stock from another factory/branch.",
            "3. Use Stock Adjustment to reconcile physical godown count."
          ],
          suggestedAction: { label: "Adjust Stock", href: "/products" },
          canEscalateToTicket: true,
          diagnosticSnapshot: { lowStockProducts }
        };
      }
    }

    // -------------------------------------------------------------------------
    // 3. DIAGNOSTIC: General Smart AI Support Fallback
    // -------------------------------------------------------------------------
    const prompt = `
You are an expert ERP Support Engineer and System Troubleshooter.
A customer is facing an issue or confusion with our apparel/textile ERP.
User Query: "${params.issueQuery}"
Context Document: ${params.documentType || "General"} (Ref: ${docRef || "None"})

Diagnose the most likely cause, provide calm reassurance, and outline 2-3 concrete steps to fix it.
Respond strictly in valid JSON:
{
  "diagnosis": "Clear diagnosis of why this occurs in 1-2 sentences",
  "diagnosisHindi": "आसान हिंदी में कारण और समझाइश",
  "rootCause": "Technical or operational root cause",
  "solutionSteps": [
    "Step 1 to resolve",
    "Step 2 to resolve"
  ],
  "suggestedRoute": "/relevant-route-or-settings"
}
`;

    const aiRes = await askSmartAIJSON<any>(prompt, {
      systemPrompt: "You are a senior ERP Technical Support Engineer. Return valid JSON only.",
      temperature: 0.2,
      maxTokens: 1024,
      preferredProvider: params.preferredProvider
    });

    if (aiRes.success && aiRes.data?.diagnosis) {
      return {
        success: true,
        issueCategory: "GENERAL_SUPPORT",
        status: "IDENTIFIED",
        diagnosis: aiRes.data.diagnosis,
        diagnosisHindi: aiRes.data.diagnosisHindi,
        rootCause: aiRes.data.rootCause || "System configuration or validation precondition.",
        solutionSteps: Array.isArray(aiRes.data.solutionSteps) ? aiRes.data.solutionSteps : [
          "Check that all required fields are filled.",
          "Verify user permissions under Settings > Team."
        ],
        suggestedAction: aiRes.data.suggestedRoute ? { label: "Go to Screen", href: aiRes.data.suggestedRoute } : undefined,
        canEscalateToTicket: true,
        provider: aiRes.provider
      };
    }

    // Default Fallback
    return {
      success: true,
      issueCategory: "GENERAL_SUPPORT",
      status: "HEALTHY",
      diagnosis: "No critical system anomaly detected. The requested action may require specific user permissions or completed prior steps.",
      diagnosisHindi: "सिस्टम में कोई खराबी नहीं मिली। कृपया सुनिश्चित करें कि जरूरी परमिशन चालू हैं।",
      rootCause: "Standard business logic validations are functioning normally.",
      solutionSteps: [
        "1. Check if you have permission to modify this record.",
        "2. Ensure all prior approvals (Quotation -> Order -> Challan) were completed in sequence.",
        "3. If this persists, click 'Raise Support Ticket' below to notify our engineering desk."
      ],
      canEscalateToTicket: true,
      provider: "system-rules"
    };

  } catch (err: any) {
    console.error("diagnoseErpIssue error:", err);
    return {
      success: false,
      issueCategory: "GENERAL_SUPPORT",
      status: "CANNOT_DETERMINE",
      diagnosis: "Unable to complete diagnostic audit at this moment.",
      rootCause: err?.message || "Internal diagnostic error",
      solutionSteps: ["Please retry or contact system administrator."],
      canEscalateToTicket: true
    };
  }
}
