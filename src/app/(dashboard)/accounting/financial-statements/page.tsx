import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Scale } from "lucide-react";
import { getBalanceSheet, getProfitAndLossStatement, getTrialBalance } from "@/app/actions/accountingActions";
import FinancialStatementsClient from "@/components/accounting/FinancialStatementsClient";
import AccountingSubNav from "@/components/accounting/AccountingSubNav";

export const dynamic = "force-dynamic";

export default async function FinancialStatementsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const [bsRes, plRes, tbRes] = await Promise.all([
    getBalanceSheet(),
    getProfitAndLossStatement(),
    getTrialBalance()
  ]);

  const balanceSheetData = bsRes.success ? (bsRes as any) : {
    asOfDate: new Date().toISOString().split("T")[0],
    isBalanced: true,
    assets: { fixedAssets: [], totalFixedAssets: 0, currentAssets: [], totalCurrentAssets: 0, totalAssets: 0 },
    liabilities: { capitalAndEquity: [], totalEquity: 0, currentLiabilities: [], totalCurrentLiabilities: 0, totalLiabilitiesAndEquity: 0 }
  };

  const plData = plRes.success ? (plRes as any) : {
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    tradingAccount: { salesRevenue: 0, openingStock: 0, purchases: 0, closingStock: 0, costOfGoodsSold: 0, grossProfit: 0 },
    incomeStatement: { grossProfit: 0, indirectExpenses: [], totalIndirectExpenses: 0, netProfit: 0, isProfitable: true }
  };

  const trialBalanceData = tbRes.success ? (tbRes as any) : {
    asOfDate: new Date().toISOString().split("T")[0],
    totalDebit: 0,
    totalCredit: 0,
    isBalanced: true,
    rows: []
  };

  return (
    <div className="page-container" style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div className="dashboard-header mb-4">
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Scale style={{ color: "var(--accent-primary, #4f46e5)" }} /> Statutory Financial Statements
          </h1>
          <p className="page-subtitle">
            Schedule III Balance Sheet, Trading & Profit and Loss Account, and Double-Entry Trial Balance.
          </p>
        </div>
      </div>

      <AccountingSubNav />

      <FinancialStatementsClient
        balanceSheetData={JSON.parse(JSON.stringify(balanceSheetData))}
        plData={JSON.parse(JSON.stringify(plData))}
        trialBalanceData={JSON.parse(JSON.stringify(trialBalanceData))}
      />
    </div>
  );
}
