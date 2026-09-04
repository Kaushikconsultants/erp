"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export interface CreatePdcInput {
  type: 'RECEIVED' | 'ISSUED';
  chequeNumber: string;
  chequeDate: string;
  maturityDate: string;
  amount: number;
  bankName: string;
  branchName?: string;
  accountNumber?: string;
  customerId?: string;
  vendorId?: string;
  invoiceId?: string;
  billId?: string;
  notes?: string;
}

/**
 * Fetch all Post-Dated Cheques for the organization with summary metrics
 */
export async function getPdcRegister() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };
    const organizationId = await getTenantOrgId();

    const cheques = await prisma.postDatedCheque.findMany({
      where: { organizationId },
      include: {
        customer: { select: { id: true, businessName: true, contactPerson: true, mobile: true } },
        vendor: { select: { id: true, companyName: true, mobile: true } }
      },
      orderBy: { maturityDate: 'asc' }
    });

    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const receivedCheques = cheques.filter(c => c.type === 'RECEIVED');
    const issuedCheques = cheques.filter(c => c.type === 'ISSUED');

    const pendingReceivedAmt = receivedCheques
      .filter(c => c.status === 'PENDING_DEPOSIT' || c.status === 'DEPOSITED')
      .reduce((sum, c) => sum + c.amount, 0);

    const pendingIssuedAmt = issuedCheques
      .filter(c => c.status === 'PENDING_DEPOSIT' || c.status === 'DEPOSITED')
      .reduce((sum, c) => sum + c.amount, 0);

    const maturingNext7Days = cheques.filter(c => {
      const mat = new Date(c.maturityDate);
      return mat >= now && mat <= sevenDaysLater && (c.status === 'PENDING_DEPOSIT' || c.status === 'DEPOSITED');
    });

    // Fetch Bank Ledger Accounts for clearance dropdown
    const bankLedgers = await prisma.ledgerAccount.findMany({
      where: {
        organizationId,
        partyType: { in: ['BANK', 'CASH'] }
      },
      select: { id: true, name: true, currentBalance: true }
    });

    return {
      success: true,
      cheques,
      metrics: {
        totalCount: cheques.length,
        pendingReceivedAmt,
        pendingIssuedAmt,
        maturingSoonCount: maturingNext7Days.length,
        maturingSoonAmt: maturingNext7Days.reduce((sum, c) => sum + c.amount, 0)
      },
      bankLedgers
    };
  } catch (err: any) {
    console.error("Error fetching PDC register:", err);
    return { success: false, error: err.message || "Failed to load PDC register" };
  }
}

/**
 * Record a new Post-Dated Cheque (Received from Customer or Issued to Vendor)
 */
export async function createPostDatedCheque(input: CreatePdcInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };
    const organizationId = await getTenantOrgId();

    if (!input.chequeNumber || !input.bankName || !input.amount || !input.maturityDate) {
      return { success: false, error: "Cheque Number, Bank, Amount, and Maturity Date are required." };
    }

    const cheque = await prisma.postDatedCheque.create({
      data: {
        organizationId,
        type: input.type,
        chequeNumber: input.chequeNumber.trim(),
        chequeDate: new Date(input.chequeDate || new Date()),
        maturityDate: new Date(input.maturityDate),
        amount: Number(input.amount),
        bankName: input.bankName.trim(),
        branchName: input.branchName?.trim() || null,
        accountNumber: input.accountNumber?.trim() || null,
        customerId: input.customerId || null,
        vendorId: input.vendorId || null,
        invoiceId: input.invoiceId || null,
        billId: input.billId || null,
        notes: input.notes?.trim() || null,
        status: "PENDING_DEPOSIT"
      }
    });

    revalidatePath("/accounting/pdc");
    return { success: true, cheque };
  } catch (err: any) {
    console.error("Error creating PDC:", err);
    return { success: false, error: err.message || "Failed to record PDC" };
  }
}

/**
 * Mark a Post-Dated Cheque as Deposited in Bank
 */
export async function markPdcDeposited(chequeId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const cheque = await prisma.postDatedCheque.update({
      where: { id: chequeId },
      data: { status: "DEPOSITED" }
    });

    revalidatePath("/accounting/pdc");
    return { success: true, cheque };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to mark as deposited" };
  }
}

/**
 * Clear a Post-Dated Cheque into a Bank Ledger (Creates Receipt or Payment Journal Voucher)
 */
export async function clearPostDatedCheque(input: {
  chequeId: string;
  clearingBankLedgerId: string;
  clearanceDate?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };
    const organizationId = await getTenantOrgId();

    const cheque = await prisma.postDatedCheque.findUnique({
      where: { id: input.chequeId },
      include: { customer: true, vendor: true }
    });

    if (!cheque) return { success: false, error: "PDC not found" };

    const bankLedger = await prisma.ledgerAccount.findUnique({
      where: { id: input.clearingBankLedgerId }
    });

    if (!bankLedger) return { success: false, error: "Target bank ledger not found" };

    const clearDate = input.clearanceDate ? new Date(input.clearanceDate) : new Date();
    const partyName = cheque.type === 'RECEIVED' ? (cheque.customer?.businessName || 'Customer') : (cheque.vendor?.companyName || 'Vendor');

    // 1. Create Double-Entry Journal Entry
    const voucherNumber = `JV-PDC-${Date.now().toString().slice(-6)}`;
    const isReceived = cheque.type === 'RECEIVED';

    const journal = await prisma.journalEntry.create({
      data: {
        organizationId,
        voucherNumber,
        voucherType: isReceived ? "RECEIPT" : "PAYMENT",
        date: clearDate,
        narration: `PDC Cheque #${cheque.chequeNumber} (${cheque.bankName}) cleared for ${partyName}`,
        referenceNumber: cheque.chequeNumber,
        totalAmount: cheque.amount,
        status: "POSTED",
        isSystemGenerated: true,
        createdBy: session.user.name || "System",
        lines: {
          create: [
            {
              ledgerAccountId: bankLedger.id,
              debit: isReceived ? cheque.amount : 0,
              credit: isReceived ? 0 : cheque.amount,
              particulars: `Bank ${isReceived ? 'Receipt' : 'Payment'} - Cheque #${cheque.chequeNumber}`,
              isReconciled: true,
              bankClearanceDate: clearDate
            }
          ]
        }
      }
    });

    // 2. Update Bank Ledger Balance
    await prisma.ledgerAccount.update({
      where: { id: bankLedger.id },
      data: {
        currentBalance: isReceived ? bankLedger.currentBalance + cheque.amount : bankLedger.currentBalance - cheque.amount
      }
    });

    // 3. Update PDC Status
    await prisma.postDatedCheque.update({
      where: { id: cheque.id },
      data: {
        status: "CLEARED",
        clearedDate: clearDate,
        clearingBankLedgerId: bankLedger.id,
        clearingJournalId: journal.id
      }
    });

    revalidatePath("/accounting/pdc");
    revalidatePath("/accounting");
    return { success: true, message: `Cheque #${cheque.chequeNumber} cleared successfully into ${bankLedger.name}.` };
  } catch (err: any) {
    console.error("Error clearing PDC:", err);
    return { success: false, error: err.message || "Failed to clear cheque" };
  }
}

/**
 * Mark a Post-Dated Cheque as Bounced with reason and optional bounce charges
 */
export async function markPdcBounced(input: {
  chequeId: string;
  bounceReason: string;
  bounceCharges?: number;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const cheque = await prisma.postDatedCheque.update({
      where: { id: input.chequeId },
      data: {
        status: "BOUNCED",
        bounceReason: input.bounceReason || "Insufficient Funds",
        bounceCharges: Number(input.bounceCharges || 0)
      }
    });

    revalidatePath("/accounting/pdc");
    return { success: true, cheque };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to mark PDC as bounced" };
  }
}
