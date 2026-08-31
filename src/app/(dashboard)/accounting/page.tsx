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
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "1.5rem", fontWeight: 600, color: "#0f172a", letterSpacing: "-0.02em" }}>
            <Scale style={{ color: "var(--accent-primary, #4f46e5)" }} size={26} /> Accounting & Double-Entry Ledger Suite
          </h1>
          <p className="page-subtitle" style={{ color: "#64748b", fontSize: "0.875rem", fontWeight: 400 }}>
            Enterprise double-entry financial core with Tally & Busy parity: Chart of Accounts, P&L, Balance Sheet, Ageing, and Bank Reconciliation.
          </p>
        </div>
      </div>

      <AccountingSubNav />

      {/* KPI Overview Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div className="glass-panel" style={{ padding: "18px 20px", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", borderLeft: "3px solid var(--accent-primary, #4f46e5)", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary, #64748b)", fontWeight: 550, textTransform: "uppercase", letterSpacing: "0.04em" }}>TOTAL ASSETS (BS)</div>
          <div style={{ fontSize: "1.45rem", fontWeight: 600, color: "#0f172a", marginTop: "4px", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
            ₹{totalAssets.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#059669", marginTop: "4px", fontWeight: 500 }}>
            Schedule III Compliant
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "18px 20px", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", borderLeft: "3px solid #059669", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary, #64748b)", fontWeight: 550, textTransform: "uppercase", letterSpacing: "0.04em" }}>NET PROFIT / LOSS (P&L)</div>
          <div style={{ fontSize: "1.45rem", fontWeight: 600, color: netProfit >= 0 ? "#059669" : "#dc2626", marginTop: "4px", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
            ₹{netProfit.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary, #64748b)", marginTop: "4px", fontWeight: 400 }}>
            Trading & Operating P&L
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "18px 20px", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", borderLeft: "3px solid #ea580c", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary, #64748b)", fontWeight: 550, textTransform: "uppercase", letterSpacing: "0.04em" }}>SUNDRY DEBTORS (RECEIVABLES)</div>
          <div style={{ fontSize: "1.45rem", fontWeight: 600, color: "#ea580c", marginTop: "4px", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
            ₹{totalDebtors.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary, #64748b)", marginTop: "4px", fontWeight: 400 }}>
            Across all customer accounts
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "18px 20px", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", borderLeft: "3px solid #dc2626", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary, #64748b)", fontWeight: 550, textTransform: "uppercase", letterSpacing: "0.04em" }}>SUNDRY CREDITORS (PAYABLES)</div>
          <div style={{ fontSize: "1.45rem", fontWeight: 600, color: "#dc2626", marginTop: "4px", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
            ₹{totalCreditors.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary, #64748b)", marginTop: "4px", fontWeight: 400 }}>
            Vendor & Supplier payables
          </div>
        </div>
      </div>

      {/* 5 Accounting Pillars Cards Grid */}
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "14px", color: "var(--text-primary, #0f172a)", letterSpacing: "-0.01em" }}>
        Accounting Modules & Financial Tools
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        
        {/* Card 1: Statutory Financial Statements */}
        <Link href="/accounting/financial-statements" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="glass-panel hover-lift" style={{ padding: "22px", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ padding: "10px", borderRadius: "10px", background: "var(--accent-light, #eef2ff)", color: "var(--accent-primary, #4f46e5)" }}>
                <Scale size={22} />
              </div>
              <span style={{ fontSize: "0.72rem", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", background: "#ecfdf5", color: "#059669" }}>
                AUDIT READY
              </span>
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0 0 6px 0", color: "#0f172a" }}>Financial Statements</h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary, #64748b)", margin: "0 0 16px 0", flex: 1, lineHeight: 1.5, fontWeight: 400 }}>
              Real-time Schedule III Balance Sheet, Trading Account, Profit & Loss Statement, and Trial Balance with Excel/CSV export.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-primary, #4f46e5)", fontWeight: 550, fontSize: "0.84rem", marginTop: "auto" }}>
              Open Statements <ArrowRight size={14} />
            </div>
          </div>
        </Link>

        {/* Card 2: Chart of Accounts */}
        <Link href="/accounting/chart-of-accounts" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="glass-panel hover-lift" style={{ padding: "22px", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ padding: "10px", borderRadius: "10px", background: "#fef3c7", color: "#92400e" }}>
                <FolderTree size={22} />
              </div>
              <span style={{ fontSize: "0.72rem", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", background: "#fef3c7", color: "#92400e" }}>
                COA MASTER
              </span>
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0 0 6px 0", color: "#0f172a" }}>Chart of Accounts</h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary, #64748b)", margin: "0 0 16px 0", flex: 1, lineHeight: 1.5, fontWeight: 400 }}>
              Standard Indian account groups (Assets, Liabilities, Incomes, Expenses) and general ledgers with opening and running balances.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-primary, #4f46e5)", fontWeight: 550, fontSize: "0.84rem", marginTop: "auto" }}>
              Manage Ledgers <ArrowRight size={14} />
            </div>
          </div>
        </Link>

        {/* Card 3: Journal Vouchers */}
        <Link href="/accounting/vouchers" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="glass-panel hover-lift" style={{ padding: "22px", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ padding: "10px", borderRadius: "10px", background: "#f3e8ff", color: "#7e22ce" }}>
                <FileText size={22} />
              </div>
              <span style={{ fontSize: "0.72rem", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", background: "#f3e8ff", color: "#7e22ce" }}>
                DOUBLE-ENTRY
              </span>
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0 0 6px 0", color: "#0f172a" }}>Journal & Contra Vouchers</h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary, #64748b)", margin: "0 0 16px 0", flex: 1, lineHeight: 1.5, fontWeight: 400 }}>
              Post adjustment Journal Vouchers (JV), cash/bank Contra entries, and inspect complete chronological voucher audit trails.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-primary, #4f46e5)", fontWeight: 550, fontSize: "0.84rem", marginTop: "auto" }}>
              Post Vouchers <ArrowRight size={14} />
            </div>
          </div>
        </Link>

        {/* Card 4: Ageing Analysis */}
        <Link href="/accounting/ageing" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="glass-panel hover-lift" style={{ padding: "22px", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ padding: "10px", borderRadius: "10px", background: "#ffedd5", color: "#c2410c" }}>
                <Clock size={22} />
              </div>
              <span style={{ fontSize: "0.72rem", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", background: "#ffedd5", color: "#c2410c" }}>
                0-90+ DAYS
              </span>
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0 0 6px 0", color: "#0f172a" }}>Outstanding Ageing Analysis</h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary, #64748b)", margin: "0 0 16px 0", flex: 1, lineHeight: 1.5, fontWeight: 400 }}>
              Track overdue receivables (Debtors) and payables (Creditors) bucketed by 0-30, 31-60, 61-90, &gt;90 days with WhatsApp payment triggers.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-primary, #4f46e5)", fontWeight: 550, fontSize: "0.84rem", marginTop: "auto" }}>
              View Ageing <ArrowRight size={14} />
            </div>
          </div>
        </Link>

        {/* Card 5: Bank Reconciliation */}
        <Link href="/accounting/bank-reconciliation" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="glass-panel hover-lift" style={{ padding: "22px", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ padding: "10px", borderRadius: "10px", background: "#ecfdf5", color: "#047857" }}>
                <Landmark size={22} />
              </div>
              <span style={{ fontSize: "0.72rem", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", background: "#ecfdf5", color: "#047857" }}>
                BRS ENGINE
              </span>
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0 0 6px 0", color: "#0f172a" }}>Bank Reconciliation (BRS)</h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary, #64748b)", margin: "0 0 16px 0", flex: 1, lineHeight: 1.5, fontWeight: 400 }}>
              Reconcile ledger accounts with bank statement passbooks, track unpresented cheques, and verify cleared deposits.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-primary, #4f46e5)", fontWeight: 550, fontSize: "0.84rem", marginTop: "auto" }}>
              Start Reconciliation <ArrowRight size={14} />
            </div>
          </div>
        </Link>

      </div>
    </div>
  );
}
