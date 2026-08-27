import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Scale,
  FolderTree,
  FileText,
  Clock,
  Landmark,
  TrendingUp,
  Download,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Wallet,
  Receipt
} from "lucide-react";
import {
  getBalanceSheet,
  getProfitAndLossStatement,
  getTrialBalance,
  syncSystemLedgers
} from "@/app/actions/accountingActions";

import AccountingSubNav from "@/components/accounting/AccountingSubNav";

export const dynamic = "force-dynamic";

export default async function AccountingHubPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  // Sync and load financials
  await syncSystemLedgers();

  const [bsRes, plRes, tbRes] = await Promise.all([
    getBalanceSheet(),
    getProfitAndLossStatement(),
    getTrialBalance()
  ]);

  const balanceSheet = bsRes.success ? (bsRes as any) : null;
  const pl = plRes.success ? (plRes as any) : null;
  const tb = tbRes.success ? (tbRes as any) : null;

  const totalAssets = balanceSheet?.assets?.totalAssets || 0;
  const totalDebtors = balanceSheet?.assets?.currentAssets?.find((a: any) => a.name.includes("Debtors"))?.amount || 0;
  const totalCreditors = balanceSheet?.liabilities?.currentLiabilities?.find((l: any) => l.name.includes("Creditors"))?.amount || 0;
  const netProfit = pl?.incomeStatement?.netProfit || 0;

  return (
    <div className="page-container" style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div className="dashboard-header mb-4">
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Scale style={{ color: "var(--accent-primary, #4f46e5)" }} /> Accounting & Double-Entry Ledger Suite
          </h1>
          <p className="page-subtitle">
            Enterprise double-entry financial core with Tally & Busy parity: Chart of Accounts, P&L, Balance Sheet, Ageing, and Bank Reconciliation.
          </p>
        </div>
      </div>

      <AccountingSubNav />

      {/* KPI Overview Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div className="glass-panel" style={{ padding: "20px", borderLeft: "4px solid var(--accent-primary, #4f46e5)", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", borderLeftWidth: "4px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>TOTAL ASSETS (BS)</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
            ₹{totalAssets.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#059669", marginTop: "4px", fontWeight: 600 }}>
            Schedule III Compliant
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px", borderLeft: "4px solid #059669", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", borderLeftWidth: "4px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>NET PROFIT / LOSS (P&L)</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: netProfit >= 0 ? "#059669" : "#dc2626", marginTop: "4px" }}>
            ₹{netProfit.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Trading & Operating P&L
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px", borderLeft: "4px solid #ea580c", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", borderLeftWidth: "4px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>SUNDRY DEBTORS (RECEIVABLES)</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ea580c", marginTop: "4px" }}>
            ₹{totalDebtors.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Across all customer accounts
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px", borderLeft: "4px solid #dc2626", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", borderLeftWidth: "4px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>SUNDRY CREDITORS (PAYABLES)</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#dc2626", marginTop: "4px" }}>
            ₹{totalCreditors.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Vendor & Supplier payables
          </div>
        </div>
      </div>

      {/* 5 Accounting Pillars Cards Grid */}
      <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "14px", color: "var(--text-primary)" }}>
        Accounting Modules & Financial Tools
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        
        {/* Card 1: Statutory Financial Statements */}
        <Link href="/accounting/financial-statements" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="glass-panel hover-lift" style={{ padding: "24px", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ padding: "12px", borderRadius: "12px", background: "var(--accent-light, #eef2ff)", color: "var(--accent-primary, #4f46e5)" }}>
                <Scale size={24} />
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", background: "#ecfdf5", color: "#059669" }}>
                AUDIT READY
              </span>
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 6px 0", color: "#0f172a" }}>Financial Statements</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 16px 0", flex: 1, lineHeight: 1.5 }}>
              Real-time Schedule III Balance Sheet, Trading Account, Profit & Loss Statement, and Trial Balance with Excel/CSV export.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-primary, #4f46e5)", fontWeight: 700, fontSize: "0.875rem", marginTop: "auto" }}>
              Open Statements <ArrowRight size={15} />
            </div>
          </div>
        </Link>

        {/* Card 2: Chart of Accounts */}
        <Link href="/accounting/chart-of-accounts" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="glass-panel hover-lift" style={{ padding: "24px", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ padding: "12px", borderRadius: "12px", background: "#fef3c7", color: "#92400e" }}>
                <FolderTree size={24} />
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", background: "#fef3c7", color: "#92400e" }}>
                COA MASTER
              </span>
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 6px 0", color: "#0f172a" }}>Chart of Accounts</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 16px 0", flex: 1, lineHeight: 1.5 }}>
              Standard Indian account groups (Assets, Liabilities, Incomes, Expenses) and general ledgers with opening and running balances.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-primary, #4f46e5)", fontWeight: 700, fontSize: "0.875rem", marginTop: "auto" }}>
              Manage Ledgers <ArrowRight size={15} />
            </div>
          </div>
        </Link>

        {/* Card 3: Journal Vouchers */}
        <Link href="/accounting/vouchers" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="glass-panel hover-lift" style={{ padding: "24px", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ padding: "12px", borderRadius: "12px", background: "#f3e8ff", color: "#7e22ce" }}>
                <FileText size={24} />
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", background: "#f3e8ff", color: "#7e22ce" }}>
                DOUBLE-ENTRY
              </span>
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 6px 0", color: "#0f172a" }}>Journal & Contra Vouchers</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 16px 0", flex: 1, lineHeight: 1.5 }}>
              Post adjustment Journal Vouchers (JV), cash/bank Contra entries, and inspect complete chronological voucher audit trails.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-primary, #4f46e5)", fontWeight: 700, fontSize: "0.875rem", marginTop: "auto" }}>
              Post Vouchers <ArrowRight size={15} />
            </div>
          </div>
        </Link>

        {/* Card 4: Ageing Analysis */}
        <Link href="/accounting/ageing" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="glass-panel hover-lift" style={{ padding: "24px", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ padding: "12px", borderRadius: "12px", background: "#ffedd5", color: "#c2410c" }}>
                <Clock size={24} />
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", background: "#ffedd5", color: "#c2410c" }}>
                0-90+ DAYS
              </span>
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 6px 0", color: "#0f172a" }}>Outstanding Ageing Analysis</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 16px 0", flex: 1, lineHeight: 1.5 }}>
              Track overdue receivables (Debtors) and payables (Creditors) bucketed by 0-30, 31-60, 61-90, &gt;90 days with WhatsApp payment triggers.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-primary, #4f46e5)", fontWeight: 700, fontSize: "0.875rem", marginTop: "auto" }}>
              View Ageing <ArrowRight size={15} />
            </div>
          </div>
        </Link>

        {/* Card 5: Bank Reconciliation */}
        <Link href="/accounting/bank-reconciliation" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="glass-panel hover-lift" style={{ padding: "24px", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ padding: "12px", borderRadius: "12px", background: "#ecfdf5", color: "#047857" }}>
                <Landmark size={24} />
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", background: "#ecfdf5", color: "#047857" }}>
                BRS ENGINE
              </span>
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 6px 0", color: "#0f172a" }}>Bank Reconciliation (BRS)</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 16px 0", flex: 1, lineHeight: 1.5 }}>
              Reconcile ledger accounts with bank statement passbooks, track unpresented cheques, and verify cleared deposits.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-primary, #4f46e5)", fontWeight: 700, fontSize: "0.875rem", marginTop: "auto" }}>
              Start Reconciliation <ArrowRight size={15} />
            </div>
          </div>
        </Link>

      </div>
    </div>
  );
}
