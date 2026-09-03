import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";

/**
 * 🔒 Sensitive Financial & PII Data Masking Utilities
 */

/**
 * Mask a Bank Account Number (e.g., "016805006415" -> "•••• •••• 6415")
 */
export function maskAccountNumber(accountNumber?: string | null): string {
  if (!accountNumber) return "";
  const cleaned = accountNumber.replace(/\s+/g, "");
  if (cleaned.length <= 4) return cleaned;
  const last4 = cleaned.slice(-4);
  return `•••• •••• ${last4}`;
}

/**
 * Mask a PAN Number (e.g., "AAHCE7721Q" -> "•••••7721Q")
 */
export function maskPan(pan?: string | null): string {
  if (!pan) return "";
  const cleaned = pan.trim().toUpperCase();
  if (cleaned.length !== 10) return cleaned;
  return `•••••${cleaned.slice(5)}`;
}

/**
 * Mask an Aadhaar Number (e.g., "123456789012" -> "•••• •••• 9012")
 */
export function maskAadhaar(aadhaar?: string | null): string {
  if (!aadhaar) return "";
  const cleaned = aadhaar.replace(/\s+/g, "");
  if (cleaned.length !== 12) return cleaned;
  return `•••• •••• ${cleaned.slice(8)}`;
}

/**
 * Mask a Mobile / Phone Number (e.g., "7206066678" -> "••••••6678")
 */
export function maskMobile(mobile?: string | null): string {
  if (!mobile) return "";
  const cleaned = mobile.replace(/[^0-9]/g, "");
  if (cleaned.length <= 4) return cleaned;
  const last4 = cleaned.slice(-4);
  return `••••••${last4}`;
}

/**
 * 📝 Secure Audit Logging Utility
 * Records financial and security-sensitive events with actor identification and metadata
 */
export async function logSecurityAudit(params: {
  action: string;
  module?: string;
  entityType?: string;
  recordId?: string;
  entityId?: string;
  previousValue?: any;
  newValue?: any;
  details?: Record<string, any> | string;
  userId?: string;
}) {
  try {
    let userId = params.userId;

    if (!userId) {
      const session = await getServerSession(authOptions);
      if (session?.user) {
        userId = (session.user as any).id;
      }
    }

    if (!userId) return;

    const moduleName = params.module || params.entityType || "SECURITY";
    const recordIdVal = params.recordId || params.entityId || "N/A";
    const prevValStr = params.previousValue ? (typeof params.previousValue === 'object' ? JSON.stringify(params.previousValue) : String(params.previousValue)) : null;
    const newValStr = params.newValue 
      ? (typeof params.newValue === 'object' ? JSON.stringify(params.newValue) : String(params.newValue))
      : params.details 
      ? (typeof params.details === 'object' ? JSON.stringify(params.details) : String(params.details))
      : null;

    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: params.action,
        module: moduleName,
        recordId: recordIdVal,
        previousValue: prevValStr,
        newValue: newValStr
      }
    });
  } catch (err) {
    console.error("Security Audit Log Error:", err);
  }
}
