import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Landmark } from "lucide-react";
import { getBankAccounts, getBankReconciliationOverview } from "@/app/actions/bankReconciliationActions";
import BankReconciliationClient from "@/components/accounting/BankReconciliationClient";
import AccountingSubNav from "@/components/accounting/AccountingSubNav";

export const dynamic = "force-dynamic";

export default async function BankReconciliationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const accountsRes = await getBankAccounts();
  const bankAccounts = (accountsRes.success && (accountsRes as any).accounts) ? (accountsRes as any).accounts : [];

  let initialOverview = {
    ledger: null,
    bookBalance: 0,
    statementBalance: 0,
    statementDate: new Date().toISOString().split("T")[0],
    unpresentedCheques: 0,
    uncreditedDeposits: 0,
    difference: 0,
    isReconciled: true,
    transactions: []
  };

  if (bankAccounts.length > 0) {
    const ovRes = await getBankReconciliationOverview(bankAccounts[0].id);
    if (ovRes.success) initialOverview = ovRes as any;
  }

  return (
    <div className="page-container" style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div className="dashboard-header mb-4">
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Landmark style={{ color: "var(--accent-primary, #4f46e5)" }} /> Bank Reconciliation Statement (BRS)
          </h1>
          <p className="page-subtitle">
            Match ledger book balances against bank statements, track unpresented cheques, and verify cleared deposits.
          </p>
        </div>
      </div>

      <AccountingSubNav />

      <BankReconciliationClient
        bankAccounts={JSON.parse(JSON.stringify(bankAccounts))}
        initialOverview={JSON.parse(JSON.stringify(initialOverview))}
      />
    </div>
  );
}
