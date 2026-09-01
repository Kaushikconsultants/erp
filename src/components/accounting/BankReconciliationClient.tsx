"use client";

import DatePicker from '@/components/ui/DatePicker';

import React, { useState } from "react";
import Link from "next/link";
import {
  Landmark,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Save,
  Check,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw
} from "lucide-react";
import {
  getBankReconciliationOverview,
  reconcileTransaction,
  unreconcileTransaction,
  saveBankStatementCheckpoint
} from "@/app/actions/bankReconciliationActions";

interface Props {
  bankAccounts: any[];
  initialOverview: any;
}

export default function BankReconciliationClient({ bankAccounts, initialOverview }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState(initialOverview.ledger?.id || bankAccounts[0]?.id || "");
  const [overview, setOverview] = useState<any>(initialOverview);
  const [isLoading, setIsLoading] = useState(false);
  const [statementBalance, setStatementBalance] = useState(initialOverview.statementBalance || 0);
  const [statementDate, setStatementDate] = useState(initialOverview.statementDate || new Date().toISOString().split("T")[0]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleAccountChange = async (accountId: string) => {
    setSelectedAccountId(accountId);
    setIsLoading(true);
    try {
      const res = await getBankReconciliationOverview(accountId);
      if (res.success) {
        setOverview(res);
        setStatementBalance(res.statementBalance);
        setStatementDate(res.statementDate);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleReconcile = async (lineId: string, isCurrentlyReconciled: boolean) => {
    try {
      if (isCurrentlyReconciled) {
        await unreconcileTransaction(lineId);
      } else {
        await reconcileTransaction(lineId, statementDate);
      }
      handleAccountChange(selectedAccountId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCheckpoint = async () => {
    setSaveMessage(null);
    try {
      const res = await saveBankStatementCheckpoint({
        ledgerAccountId: selectedAccountId,
        statementDate,
        statementBalance: parseFloat(statementBalance.toString()) || 0
      });
      if (res.success) {
        setSaveMessage("Reconciliation statement checkpoint saved successfully!");
      }
    } catch (e: any) {
      setSaveMessage(e.message || "Failed to save");
    }
  };

  if (!bankAccounts || bankAccounts.length === 0) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center", backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "var(--accent-light, #eef2ff)", color: "var(--accent-primary, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Landmark size={32} />
        </div>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>No Bank Accounts Configured</h3>
        <p style={{ color: "var(--text-secondary, #64748b)", fontSize: "0.875rem", maxWidth: "460px", margin: "8px auto 20px", lineHeight: 1.5 }}>
          Please add a Bank Account (e.g. ICICI, HDFC, SBI) in the Chart of Accounts to begin bank passbook reconciliation.
        </p>
        <Link
          href="/accounting/chart-of-accounts"
          className="primary-btn hover-lift"
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", padding: "10px 22px", borderRadius: "10px", fontWeight: 700, backgroundColor: "var(--accent-primary, #4f46e5)", color: "#ffffff" }}
        >
          Open Chart of Accounts
        </Link>
      </div>
    );
  }

  const difference = (parseFloat(statementBalance.toString()) || 0) + overview.unpresentedCheques - overview.uncreditedDeposits - overview.bookBalance;
  const isMatch = Math.abs(difference) < 0.05;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* Account Selector & Date Header */}
      <div 
        style={{ 
          padding: "20px 24px", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          flexWrap: "wrap", 
          gap: "16px",
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid var(--border, #e2e8f0)",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.03)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ padding: "10px", borderRadius: "10px", backgroundColor: "var(--accent-light, #eef2ff)", color: "var(--accent-primary, #4f46e5)" }}>
            <Landmark size={24} />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary, #64748b)", display: "block", marginBottom: "4px" }}>
              SELECT BANK ACCOUNT
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => handleAccountChange(e.target.value)}
              style={{ fontWeight: 700, fontSize: "0.95rem", minWidth: "280px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#f8fafc", outline: "none" }}
            >
              {bankAccounts.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.bankAccountNumber ? `(A/c: ${b.bankAccountNumber})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary, #64748b)", display: "block", marginBottom: "4px" }}>
              STATEMENT AS OF DATE
            </label>
            <DatePicker
              
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", backgroundColor: "#f8fafc", outline: "none" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary, #64748b)", display: "block", marginBottom: "4px" }}>
              STATEMENT CLOSING BALANCE (₹)
            </label>
            <input
              type="number"
              value={statementBalance}
              onChange={(e) => setStatementBalance(parseFloat(e.target.value) || 0)}
              style={{ fontWeight: 800, width: "170px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", backgroundColor: "#f8fafc", outline: "none" }}
              step="0.01"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveCheckpoint}
            className="primary-btn hover-lift"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "10px 20px",
              borderRadius: "10px",
              marginTop: "18px",
              fontSize: "0.875rem",
              fontWeight: 700,
              backgroundColor: "var(--accent-primary, #4f46e5)",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.12)"
            }}
          >
            <Save size={16} /> Save BRS
          </button>
        </div>
      </div>

      {saveMessage && (
        <div style={{ padding: "12px 16px", background: "#ecfdf5", color: "#059669", borderRadius: "10px", border: "1px solid #bbf7d0", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
          <CheckCircle2 size={16} />
          {saveMessage}
        </div>
      )}

      {/* BRS Balance Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        <div style={{ padding: "20px", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary, #64748b)", fontWeight: 600 }}>Balance as per Company Books</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
            ₹{overview.bookBalance.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary, #94a3b8)", marginTop: "4px" }}>
            Ledger Account Balance
          </div>
        </div>

        <div style={{ padding: "20px", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary, #64748b)", fontWeight: 600 }}>Add: Unpresented Cheques (Issued)</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#059669", marginTop: "4px" }}>
            +₹{overview.unpresentedCheques.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary, #94a3b8)", marginTop: "4px" }}>
            Paid in books, not debited by bank
          </div>
        </div>

        <div style={{ padding: "20px", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary, #64748b)", fontWeight: 600 }}>Less: Uncredited Deposits</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#dc2626", marginTop: "4px" }}>
            -₹{overview.uncreditedDeposits.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary, #94a3b8)", marginTop: "4px" }}>
            Received in books, not credited by bank
          </div>
        </div>

        <div style={{ padding: "20px", backgroundColor: isMatch ? "#f0fdf4" : "#fef2f2", borderRadius: "12px", border: `1px solid ${isMatch ? "#bbf7d0" : "#fecaca"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: "0.78rem", color: isMatch ? "#166534" : "#991b1b", fontWeight: 700 }}>
            Reconciliation Difference
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: isMatch ? "#15803d" : "#b91c1c", marginTop: "4px" }}>
            {isMatch ? "₹0.00 (MATCHED)" : `₹${Math.abs(difference).toFixed(2)}`}
          </div>
          <div style={{ fontSize: "0.75rem", color: isMatch ? "#15803d" : "#b91c1c", marginTop: "4px", display: "flex", alignItems: "center", gap: "5px", fontWeight: 600 }}>
            {isMatch ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {isMatch ? "Bank Statement Fully Reconciled" : "Discrepancy detected"}
          </div>
        </div>
      </div>

      {/* Transaction Matching Table */}
      <div 
        style={{ 
          backgroundColor: "#ffffff",
          border: "1px solid var(--border, #e2e8f0)",
          borderRadius: "14px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.03)",
          overflow: "hidden"
        }}
      >
        <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>
            Bank Account Journal Transactions ({overview.transactions?.length || 0})
          </h3>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #64748b)" }}>
            Toggle clearance to reconcile with bank passbook
          </span>
        </div>

        <div className="table-responsive">
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-secondary, #f8fafc)", textAlign: "left", fontSize: "0.85rem", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Book Date</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Voucher #</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Particulars</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#475569" }}>Deposit / Inflow (₹)</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#475569" }}>Withdrawal / Outflow (₹)</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: "#475569" }}>Bank Clearance</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: "#475569" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(!overview.transactions || overview.transactions.length === 0) ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary, #64748b)" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: "6px" }}>🏦</div>
                    <div style={{ fontWeight: 600 }}>No transactions recorded on this bank account.</div>
                  </td>
                </tr>
              ) : (
                overview.transactions.map((t: any) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", whiteSpace: "nowrap", color: "#334155" }}>
                      {new Date(t.journalEntry?.date).toLocaleDateString("en-GB")}
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: 700, color: "var(--accent-primary, #4f46e5)" }}>
                      {t.journalEntry?.voucherNumber}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{t.particulars || t.journalEntry?.narration || "Bank Transaction"}</div>
                      {t.journalEntry?.referenceNumber && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #64748b)" }}>
                          Ref/Cheque: {t.journalEntry.referenceNumber}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: t.debit > 0 ? 700 : 400, color: t.debit > 0 ? "#059669" : "#94a3b8" }}>
                      {t.debit > 0 ? `₹${t.debit.toLocaleString()}` : "-"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: t.credit > 0 ? 700 : 400, color: t.credit > 0 ? "#dc2626" : "#94a3b8" }}>
                      {t.credit > 0 ? `₹${t.credit.toLocaleString()}` : "-"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center", fontSize: "0.8rem", color: "var(--text-secondary, #64748b)" }}>
                      {t.isReconciled && t.bankClearanceDate ? new Date(t.bankClearanceDate).toLocaleDateString("en-GB") : "In Transit"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => handleToggleReconcile(t.id, t.isReconciled)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "5px 12px",
                          borderRadius: "14px",
                          border: `1px solid ${t.isReconciled ? "#bbf7d0" : "#fde68a"}`,
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          background: t.isReconciled ? "#ecfdf5" : "#fef3c7",
                          color: t.isReconciled ? "#059669" : "#d97706",
                          transition: "all 0.15s ease"
                        }}
                      >
                        {t.isReconciled ? (
                          <>
                            <Check size={13} /> Cleared
                          </>
                        ) : (
                          <>
                            <RefreshCw size={13} /> Uncleared
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
