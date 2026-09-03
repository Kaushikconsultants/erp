"use client";

import React, { useState } from "react";
import {
  Scale,
  TrendingUp,
  FileSpreadsheet,
  Calendar,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

interface Props {
  trialBalanceData: any;
  plData: any;
  balanceSheetData: any;
}

export default function FinancialStatementsClient({
  trialBalanceData,
  plData,
  balanceSheetData
}: Props) {
  const [activeTab, setActiveTab] = useState<"bs" | "pl" | "tb">("bs");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    assets: true,
    liabilities: true,
    trading: true,
    pnl: true
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // CSV Exporter for Financial Statements
  const exportStatementCSV = () => {
    let rows: any[] = [];
    let filename = "";

    if (activeTab === "bs") {
      filename = `Balance_Sheet_${balanceSheetData?.asOfDate || "Current"}.csv`;
      rows = [
        ["BALANCE SHEET (Schedule III Format)", "", "", ""],
        [`As of: ${balanceSheetData?.asOfDate || ""}`, "", "", ""],
        ["", "", "", ""],
        ["EQUITY AND LIABILITIES", "", "ASSETS", ""],
        ["Particulars", "Amount (₹)", "Particulars", "Amount (₹)"],
        [
          "1. Capital & Equity",
          "",
          "1. Non-Current / Fixed Assets",
          ""
        ],
        ...(balanceSheetData?.liabilities?.capitalAndEquity || []).map((item: any) => [
          `  ${item.name}`,
          item.amount,
          "",
          ""
        ]),
        [
          "Total Equity",
          balanceSheetData?.liabilities?.totalEquity || 0,
          "Total Fixed Assets",
          balanceSheetData?.assets?.totalFixedAssets || 0
        ],
        ["", "", "", ""],
        [
          "2. Current Liabilities",
          "",
          "2. Current Assets",
          ""
        ],
        ...Array.from({
          length: Math.max(
            (balanceSheetData?.liabilities?.currentLiabilities || []).length,
            (balanceSheetData?.assets?.currentAssets || []).length
          )
        }).map((_, idx) => {
          const liabItem = (balanceSheetData?.liabilities?.currentLiabilities || [])[idx];
          const assetItem = (balanceSheetData?.assets?.currentAssets || [])[idx];
          return [
            liabItem ? `  ${liabItem.name}` : "",
            liabItem ? liabItem.amount : "",
            assetItem ? `  ${assetItem.name}` : "",
            assetItem ? assetItem.amount : ""
          ];
        }),
        [
          "Total Current Liabilities",
          balanceSheetData?.liabilities?.totalCurrentLiabilities || 0,
          "Total Current Assets",
          balanceSheetData?.assets?.totalCurrentAssets || 0
        ],
        ["", "", "", ""],
        [
          "TOTAL LIABILITIES & EQUITY",
          balanceSheetData?.liabilities?.totalLiabilitiesAndEquity || 0,
          "TOTAL ASSETS",
          balanceSheetData?.assets?.totalAssets || 0
        ]
      ];
    } else if (activeTab === "pl") {
      filename = `Profit_and_Loss_${plData?.startDate || ""}_to_${plData?.endDate || ""}.csv`;
      rows = [
        ["PROFIT & LOSS STATEMENT", "", ""],
        [`Period: ${plData?.startDate || ""} to ${plData?.endDate || ""}`, "", ""],
        ["", "", ""],
        ["PARTICULARS", "SUB-TOTAL (₹)", "TOTAL (₹)"],
        ["TRADING ACCOUNT", "", ""],
        ["Gross Sales Revenue", "", plData?.tradingAccount?.salesRevenue || 0],
        ["Less: Cost of Goods Sold (COGS)", "", ""],
        ["  Opening Stock", plData?.tradingAccount?.openingStock || 0, ""],
        ["  Add: Direct Purchases", plData?.tradingAccount?.purchases || 0, ""],
        ["  Less: Closing Stock", `-${plData?.tradingAccount?.closingStock || 0}`, ""],
        ["Total COGS", "", `-${plData?.tradingAccount?.costOfGoodsSold || 0}`],
        ["GROSS PROFIT", "", plData?.tradingAccount?.grossProfit || 0],
        ["", "", ""],
        ["INCOME STATEMENT / OVERHEADS", "", ""],
        ["Gross Profit b/d", "", plData?.incomeStatement?.grossProfit || 0],
        ["Less: Indirect Expenses & Overheads", "", ""],
        ...(plData?.incomeStatement?.indirectExpenses || []).map((exp: any) => [
          `  ${exp.category}`,
          exp.amount,
          ""
        ]),
        ["Total Indirect Expenses", "", `-${plData?.incomeStatement?.totalIndirectExpenses || 0}`],
        ["", "", ""],
        ["NET PROFIT / (LOSS)", "", plData?.incomeStatement?.netProfit || 0]
      ];
    } else {
      filename = `Trial_Balance_${trialBalanceData?.asOfDate || "Current"}.csv`;
      rows = [
        ["TRIAL BALANCE", "", "", ""],
        [`As of: ${trialBalanceData?.asOfDate || ""}`, "", "", ""],
        ["", "", "", ""],
        ["Ledger Account Code", "Ledger Account Name", "Account Group", "Nature", "Debit Balance (₹)", "Credit Balance (₹)"],
        ...(trialBalanceData?.rows || []).map((r: any) => [
          r.code || "",
          `"${r.name}"`,
          `"${r.groupName}"`,
          r.nature,
          r.closingDebit,
          r.closingCredit
        ]),
        ["", "", "TOTAL", "", trialBalanceData?.totalDebit || 0, trialBalanceData?.totalCredit || 0]
      ];
    }

    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* Top Controls & Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
        <div style={{ display: "flex", gap: "6px", background: "#ffffff", padding: "6px", borderRadius: "12px", border: "1px solid var(--border, #e2e8f0)", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)" }}>
          <button
            type="button"
            onClick={() => setActiveTab("bs")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: activeTab === "bs" ? 700 : 600,
              fontSize: "0.85rem",
              background: activeTab === "bs" ? "var(--accent-primary, #4f46e5)" : "transparent",
              color: activeTab === "bs" ? "#fff" : "var(--text-secondary, #64748b)",
              boxShadow: activeTab === "bs" ? "0 2px 6px rgba(0, 0, 0, 0.12)" : "none",
              transition: "all 0.15s ease"
            }}
          >
            <Scale size={16} />
            Balance Sheet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pl")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: activeTab === "pl" ? 700 : 600,
              fontSize: "0.85rem",
              background: activeTab === "pl" ? "var(--accent-primary, #4f46e5)" : "transparent",
              color: activeTab === "pl" ? "#fff" : "var(--text-secondary, #64748b)",
              boxShadow: activeTab === "pl" ? "0 2px 6px rgba(0, 0, 0, 0.12)" : "none",
              transition: "all 0.15s ease"
            }}
          >
            <TrendingUp size={16} />
            Profit & Loss
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tb")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: activeTab === "tb" ? 700 : 600,
              fontSize: "0.85rem",
              background: activeTab === "tb" ? "var(--accent-primary, #4f46e5)" : "transparent",
              color: activeTab === "tb" ? "#fff" : "var(--text-secondary, #64748b)",
              boxShadow: activeTab === "tb" ? "0 2px 6px rgba(0, 0, 0, 0.12)" : "none",
              transition: "all 0.15s ease"
            }}
          >
            <FileSpreadsheet size={16} />
            Trial Balance
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            onClick={exportStatementCSV}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "9px 16px",
              fontSize: "0.85rem",
              fontWeight: 600,
              backgroundColor: "#ffffff",
              border: "1px solid var(--border, #cbd5e1)",
              borderRadius: "10px",
              color: "var(--text-primary, #334155)",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              transition: "all 0.15s ease"
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-primary, #4f46e5)";
              (e.currentTarget as HTMLElement).style.color = "var(--accent-primary, #4f46e5)";
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border, #cbd5e1)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-primary, #334155)";
            }}
          >
            <Download size={15} style={{ color: "var(--accent-primary, #4f46e5)" }} />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "9px 16px",
              fontSize: "0.85rem",
              fontWeight: 600,
              backgroundColor: "#ffffff",
              border: "1px solid var(--border, #cbd5e1)",
              borderRadius: "10px",
              color: "var(--text-primary, #334155)",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              transition: "all 0.15s ease"
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-primary, #4f46e5)";
              (e.currentTarget as HTMLElement).style.color = "var(--accent-primary, #4f46e5)";
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border, #cbd5e1)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-primary, #334155)";
            }}
          >
            <Printer size={15} style={{ color: "var(--accent-primary, #4f46e5)" }} />
            Print
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. BALANCE SHEET VIEW (SCHEDULE III) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "bs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Header Banner */}
          <div className="glass-panel" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Balance Sheet (Schedule III Format)
              </h2>
              <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                Statement of Financial Position as of <strong>{balanceSheetData.asOfDate}</strong>
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {balanceSheetData.isBalanced ? (
                <span style={{ display: "flex", alignItems: "center", gap: "5px", background: "#ecfdf5", color: "#059669", padding: "4px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700 }}>
                  <CheckCircle2 size={14} /> BALANCED (Assets = Liabilities + Equity)
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: "5px", background: "#fef2f2", color: "#dc2626", padding: "4px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700 }}>
                  <AlertCircle size={14} /> IMBALANCED
                </span>
              )}
            </div>
          </div>

          {/* 2-Column Schedule III Layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            
            {/* Left: Equity & Liabilities */}
            <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  I. Equity & Liabilities
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Amount (₹)</span>
              </div>

              {/* Capital & Reserves */}
              <div>
                <div style={{ fontWeight: 700, color: "var(--accent-primary, #4f46e5)", marginBottom: "8px", fontSize: "0.9rem" }}>
                  1. Shareholders' / Owner's Funds
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingLeft: "12px" }}>
                  {balanceSheetData.liabilities.capitalAndEquity.map((item: any, idx: number) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{item.name}</span>
                      <span style={{ fontWeight: 600 }}>₹{item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", fontWeight: 700, paddingTop: "4px", borderTop: "1px dashed #cbd5e1" }}>
                    <span>Total Owner's Funds</span>
                    <span style={{ color: "var(--accent-primary, #4f46e5)" }}>₹{balanceSheetData.liabilities.totalEquity.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Current Liabilities */}
              <div>
                <div style={{ fontWeight: 700, color: "#0284c7", marginBottom: "8px", fontSize: "0.9rem" }}>
                  2. Current Liabilities & Provisions
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingLeft: "12px" }}>
                  {balanceSheetData.liabilities.currentLiabilities.map((item: any, idx: number) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{item.name}</span>
                      <span style={{ fontWeight: 600 }}>₹{item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", fontWeight: 700, paddingTop: "4px", borderTop: "1px dashed #cbd5e1" }}>
                    <span>Total Current Liabilities</span>
                    <span style={{ color: "#0284c7" }}>₹{balanceSheetData.liabilities.totalCurrentLiabilities.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Liabilities Grand Total */}
              <div style={{ marginTop: "auto", paddingTop: "14px", borderTop: "2px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: "1rem" }}>TOTAL LIABILITIES & EQUITY</span>
                <span style={{ fontWeight: 800, fontSize: "1.2rem", color: "#0f172a" }}>
                  ₹{balanceSheetData.liabilities.totalLiabilitiesAndEquity.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Right: Assets */}
            <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  II. Assets
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Amount (₹)</span>
              </div>

              {/* Non-Current Assets */}
              <div>
                <div style={{ fontWeight: 700, color: "#059669", marginBottom: "8px", fontSize: "0.9rem" }}>
                  1. Non-Current / Fixed Assets
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingLeft: "12px" }}>
                  {balanceSheetData.assets.fixedAssets.map((item: any, idx: number) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{item.name}</span>
                      <span style={{ fontWeight: 600 }}>₹{item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", fontWeight: 700, paddingTop: "4px", borderTop: "1px dashed #cbd5e1" }}>
                    <span>Total Fixed Assets</span>
                    <span style={{ color: "#059669" }}>₹{balanceSheetData.assets.totalFixedAssets.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Current Assets */}
              <div>
                <div style={{ fontWeight: 700, color: "#0d9488", marginBottom: "8px", fontSize: "0.9rem" }}>
                  2. Current Assets
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingLeft: "12px" }}>
                  {balanceSheetData.assets.currentAssets.map((item: any, idx: number) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{item.name}</span>
                      <span style={{ fontWeight: 600 }}>₹{item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", fontWeight: 700, paddingTop: "4px", borderTop: "1px dashed #cbd5e1" }}>
                    <span>Total Current Assets</span>
                    <span style={{ color: "#0d9488" }}>₹{balanceSheetData.assets.totalCurrentAssets.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Assets Grand Total */}
              <div style={{ marginTop: "auto", paddingTop: "14px", borderTop: "2px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: "1rem" }}>TOTAL ASSETS</span>
                <span style={{ fontWeight: 800, fontSize: "1.2rem", color: "#0f172a" }}>
                  ₹{balanceSheetData.assets.totalAssets.toLocaleString()}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. PROFIT & LOSS STATEMENT VIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "pl" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Header Banner */}
          <div className="glass-panel" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Profit & Loss Account (Income Statement)
              </h2>
              <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                For the period <strong>{plData.startDate}</strong> to <strong>{plData.endDate}</strong>
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Net Profit / (Loss)</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: plData.incomeStatement.isProfitable ? "#059669" : "#dc2626" }}>
                ₹{plData.incomeStatement.netProfit.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Detailed P&L Breakdown Card */}
          <div className="glass-panel" style={{ padding: "24px" }}>
            
            {/* PART 1: TRADING ACCOUNT (GROSS PROFIT) */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #e2e8f0", paddingBottom: "8px", marginBottom: "12px" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "#1e293b" }}>
                  Part I: Trading Account (Gross Profit Computation)
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Amount (₹)</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span style={{ fontWeight: 600 }}>Gross Revenue from Operations (Sales)</span>
                  <span style={{ fontWeight: 700 }}>₹{plData.tradingAccount.salesRevenue.toLocaleString()}</span>
                </div>

                <div style={{ paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "4px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Opening Stock</span>
                    <span>₹{plData.tradingAccount.openingStock.toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Add: Direct Purchases & Procurement</span>
                    <span>₹{plData.tradingAccount.purchases.toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Less: Closing Stock in Hand</span>
                    <span>-₹{plData.tradingAccount.closingStock.toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "#e11d48", paddingLeft: "16px" }}>
                  <span>Cost of Goods Sold (COGS)</span>
                  <span>-₹{plData.tradingAccount.costOfGoodsSold.toLocaleString()}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1rem", fontWeight: 700, paddingTop: "8px", borderTop: "1px dashed #cbd5e1", color: "#059669" }}>
                  <span>GROSS PROFIT</span>
                  <span>₹{plData.tradingAccount.grossProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* PART 2: INDIRECT EXPENSES & NET PROFIT */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #e2e8f0", paddingBottom: "8px", marginBottom: "12px" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "#1e293b" }}>
                  Part II: Operating Overheads & Net Profit
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Amount (₹)</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span style={{ fontWeight: 600 }}>Gross Profit b/d</span>
                  <span style={{ fontWeight: 700, color: "#059669" }}>₹{plData.incomeStatement.grossProfit.toLocaleString()}</span>
                </div>

                <div style={{ marginTop: "6px" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#64748b", marginBottom: "6px" }}>
                    Less: Administrative, Staff & Operating Expenses
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingLeft: "16px" }}>
                    {plData.incomeStatement.indirectExpenses.map((exp: any, idx: number) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <span style={{ color: "var(--text-secondary)" }}>{exp.category}</span>
                        <span>₹{exp.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", fontWeight: 600, color: "#dc2626", paddingTop: "4px", borderTop: "1px dotted #cbd5e1" }}>
                      <span>Total Indirect Overheads</span>
                      <span>-₹{plData.incomeStatement.totalIndirectExpenses.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Net Profit Summary */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "12px", borderTop: "2px solid #0f172a" }}>
                  <div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>NET PROFIT / (LOSS) TRANSFERRED TO RESERVES</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Net Margin: {((plData.incomeStatement.netProfit / (plData.tradingAccount.salesRevenue || 1)) * 100).toFixed(1)}%</div>
                  </div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 800, color: plData.incomeStatement.isProfitable ? "#059669" : "#dc2626" }}>
                    ₹{plData.incomeStatement.netProfit.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. TRIAL BALANCE VIEW (DEBIT = CREDIT) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "tb" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Header Banner */}
          <div className="glass-panel" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Trial Balance (Group-Wise & Ledger-Wise)
              </h2>
              <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                Closing Balances as of <strong>{trialBalanceData.asOfDate}</strong>
              </p>
            </div>
            <div>
              {trialBalanceData.isBalanced ? (
                <span style={{ display: "flex", alignItems: "center", gap: "5px", background: "#ecfdf5", color: "#059669", padding: "4px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700 }}>
                  <CheckCircle2 size={14} /> BALANCED: Debit = Credit
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: "5px", background: "#fef2f2", color: "#dc2626", padding: "4px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700 }}>
                  <AlertCircle size={14} /> IMBALANCED (Diff: ₹{Math.abs(trialBalanceData.totalDebit - trialBalanceData.totalCredit).toFixed(2)})
                </span>
              )}
            </div>
          </div>

          {/* Trial Balance Table */}
          <div className="glass-panel" style={{ padding: "20px" }}>
            <div className="table-responsive">
              <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg-secondary, #f8fafc)", textAlign: "left" }}>
                    <th style={{ padding: "10px 12px" }}>Account Code</th>
                    <th style={{ padding: "10px 12px" }}>Ledger Name</th>
                    <th style={{ padding: "10px 12px" }}>Group</th>
                    <th style={{ padding: "10px 12px" }}>Nature</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Debit (₹)</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Credit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBalanceData.rows.map((row: any) => (
                    <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "0.8rem", color: "#64748b" }}>
                        {row.code || "-"}
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {row.name}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {row.groupName}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          background: row.nature === "ASSET" ? "#e0f2fe" : row.nature === "LIABILITY" ? "#fef3c7" : row.nature === "INCOME" ? "#dcfce7" : "#fee2e2",
                          color: row.nature === "ASSET" ? "#0369a1" : row.nature === "LIABILITY" ? "#92400e" : row.nature === "INCOME" ? "#15803d" : "#b91c1c"
                        }}>
                          {row.nature}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: row.closingDebit > 0 ? 700 : 400, color: row.closingDebit > 0 ? "#0f172a" : "#94a3b8" }}>
                        {row.closingDebit > 0 ? `₹${row.closingDebit.toLocaleString()}` : "-"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: row.closingCredit > 0 ? 700 : 400, color: row.closingCredit > 0 ? "#0f172a" : "#94a3b8" }}>
                        {row.closingCredit > 0 ? `₹${row.closingCredit.toLocaleString()}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "var(--bg-secondary, #f8fafc)", borderTop: "2px solid #334155", fontWeight: 800, fontSize: "0.95rem" }}>
                    <td colSpan={4} style={{ padding: "12px" }}>GRAND TOTAL</td>
                    <td style={{ padding: "12px", textAlign: "right", color: "var(--accent-primary, #4f46e5)" }}>
                      ₹{trialBalanceData.totalDebit.toLocaleString()}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", color: "var(--accent-primary, #4f46e5)" }}>
                      ₹{trialBalanceData.totalCredit.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
