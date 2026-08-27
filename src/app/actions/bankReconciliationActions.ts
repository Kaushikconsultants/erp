"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function getBankAccounts() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();

    const bankLedgers = await prisma.ledgerAccount.findMany({
      where: {
        organizationId,
        partyType: { in: ["BANK", "CASH"] }
      },
      include: {
        accountGroup: true
      },
      orderBy: { name: "asc" }
    });

    return { success: true, accounts: JSON.parse(JSON.stringify(bankLedgers)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getBankReconciliationOverview(ledgerAccountId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const ledger = await prisma.ledgerAccount.findUnique({
      where: { id: ledgerAccountId },
      include: {
        accountGroup: true
      }
    });

    if (!ledger) {
      return { success: false, error: "Bank account ledger not found" };
    }

    // Fetch latest reconciliation record
    const latestRec = await prisma.bankReconciliation.findFirst({
      where: { ledgerAccountId },
      orderBy: { statementDate: "desc" }
    });

    // Fetch all journal lines for this bank account
    const lines = await prisma.journalLineItem.findMany({
      where: {
        ledgerAccountId,
        journalEntry: { status: "POSTED" }
      },
      include: {
        journalEntry: true
      },
      orderBy: { journalEntry: { date: "desc" } },
      take: 100
    });

    // Calculate Book Balance
    const openBal = ledger.openingBalance || 0;
    const isDr = ledger.openingType !== "CREDIT";
    const totalDr = lines.reduce((acc, l) => acc + (l.debit || 0), 0);
    const totalCr = lines.reduce((acc, l) => acc + (l.credit || 0), 0);
    const bookBalance = (isDr ? openBal : -openBal) + totalDr - totalCr;

    // Unreconciled / In-Transit items
    const unreconciledItems = lines.filter(l => !l.isReconciled);
    const unpresentedCheques = unreconciledItems.filter(l => l.credit > 0).reduce((acc, l) => acc + l.credit, 0); // Paid by us, not yet cleared in bank
    const uncreditedDeposits = unreconciledItems.filter(l => l.debit > 0).reduce((acc, l) => acc + l.debit, 0);   // Received by us, not yet credited by bank

    const statementBalance = latestRec?.statementBalance || (bookBalance - unpresentedCheques + uncreditedDeposits);
    const difference = (statementBalance + unpresentedCheques - uncreditedDeposits) - bookBalance;

    return {
      success: true,
      ledger: JSON.parse(JSON.stringify(ledger)),
      bookBalance: Number(bookBalance.toFixed(2)),
      statementBalance: Number(statementBalance.toFixed(2)),
      statementDate: latestRec?.statementDate?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
      unpresentedCheques: Number(unpresentedCheques.toFixed(2)),
      uncreditedDeposits: Number(uncreditedDeposits.toFixed(2)),
      difference: Number(difference.toFixed(2)),
      isReconciled: Math.abs(difference) < 0.05,
      transactions: JSON.parse(JSON.stringify(lines))
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to load Bank Reconciliation overview" };
  }
}

export async function reconcileTransaction(journalLineItemId: string, clearingDateStr?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const clearingDate = clearingDateStr ? new Date(clearingDateStr) : new Date();

    const line = await prisma.journalLineItem.update({
      where: { id: journalLineItemId },
      data: {
        isReconciled: true,
        bankClearanceDate: clearingDate
      }
    });

    revalidatePath("/accounting/bank-reconciliation", "page");
    return { success: true, line: JSON.parse(JSON.stringify(line)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to reconcile transaction" };
  }
}

export async function unreconcileTransaction(journalLineItemId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const line = await prisma.journalLineItem.update({
      where: { id: journalLineItemId },
      data: {
        isReconciled: false,
        bankClearanceDate: null
      }
    });

    revalidatePath("/accounting/bank-reconciliation", "page");
    return { success: true, line: JSON.parse(JSON.stringify(line)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to unreconcile transaction" };
  }
}

export async function saveBankStatementCheckpoint(data: {
  ledgerAccountId: string;
  statementDate: string;
  statementBalance: number;
  notes?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();

    const record = await prisma.bankReconciliation.create({
      data: {
        organizationId,
        ledgerAccountId: data.ledgerAccountId,
        statementDate: new Date(data.statementDate),
        statementBalance: Number(data.statementBalance) || 0,
        notes: data.notes || null,
        status: "COMPLETED",
        reconciledAt: new Date()
      }
    });

    revalidatePath("/accounting/bank-reconciliation", "page");
    return { success: true, record: JSON.parse(JSON.stringify(record)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to save bank statement checkpoint" };
  }
}
