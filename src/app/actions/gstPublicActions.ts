"use server";

import { 
  searchTaxpayerGstin, 
  searchTaxpayerByPan, 
  trackTaxpayerReturnsCompliance, 
  searchHsnMaster, 
  verifyEInvoiceIrn, 
  verifyEWayBillGov 
} from "@/lib/gstGovService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * 1. Search Taxpayer by GSTIN Server Action
 */
export async function actionSearchTaxpayer(gstin: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    return await searchTaxpayerGstin(gstin);
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to search taxpayer" };
  }
}

/**
 * 2. Search All GSTINs by PAN Server Action
 */
export async function actionSearchByPan(pan: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    return await searchTaxpayerByPan(pan);
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to search PAN" };
  }
}

/**
 * 3. Track Return Filing Compliance Server Action
 */
export async function actionTrackReturns(gstin: string, fy?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    return await trackTaxpayerReturnsCompliance(gstin, fy);
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to track returns" };
  }
}

/**
 * 4. Search HSN / SAC Codes Server Action
 */
export async function actionSearchHsn(query: string) {
  try {
    return await searchHsnMaster(query);
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to search HSN codes", data: [] };
  }
}

/**
 * 5. Verify E-Invoice IRN Server Action
 */
export async function actionVerifyIrn(irn: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    return await verifyEInvoiceIrn(irn);
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to verify IRN" };
  }
}

/**
 * 6. Track & Verify E-Way Bill Server Action
 */
export async function actionTrackEwb(ewbNo: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    return await verifyEWayBillGov(ewbNo);
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to verify E-Way Bill" };
  }
}

/**
 * 7. Cashfree GSTIN Live Verification (https://sandbox.cashfree.com/verification/gstin)
 */
export async function actionVerifyCashfree(gstin: string, config?: { clientId?: string; clientSecret?: string; isSandbox?: boolean }) {
  try {
    const { verifyCashfreeGstin } = await import("@/lib/cashfreeGstService");
    return await verifyCashfreeGstin(gstin, config);
  } catch (error: any) {
    return { success: false, error: error.message || "Cashfree verification failed" };
  }
}

/**
 * 8. Official GST Developer Portal Taxpayer Status (GET /commonapi/v1.0/tpstatus?gstin={}&action=TP)
 */
export async function actionValidateTpStatus(gstin: string, domainName?: string) {
  try {
    const { validateTaxpayerStatusApi } = await import("@/lib/gstGovService");
    return await validateTaxpayerStatusApi(gstin, domainName);
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to validate taxpayer status" };
  }
}


