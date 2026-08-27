"use client";

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
      <div className="glass-panel" style={{ padding: "36px", textAlign: "center" }}>
        <Landmark size={36} style={{ color: "var(--text-secondary)", margin: "0 auto 12px" }} />
        <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>No Bank Accounts Configured</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", maxWidth: "450px", margin: "8px auto 16px" }}>
          Please add a Bank Account (e.g. ICICI, HDFC, SBI) in the Chart of Accounts to begin bank passbook reconciliation.
        </p>
        <Link
          href="/accounting/chart-of-accounts"
          className="primary-btn"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none", padding: "8px 18px" }}
        >
          Open Chart of Accounts
        </Link>
      </div>
    );
  }

  const difference = (parseFloat(statementBalance.toString()) || 0) + overview.unpresentedCheques - overview.uncreditedDeposits - overview.bookBalance;
  const isMatch = Math.abs(difference) < 0.05;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Account Selector & Date Header */}
      <div className="glass-panel" style={{ padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Landmark size={22} style={{ color: "var(--primary, #4f46e5)" }} />
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", display: "block" }}>
              SELECT BANK ACCOUNT
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="form-input"
              style={{ fontWeight: 700, fontSize: "0.95rem", minWidth: "260px" }}
            >
              {bankAccounts.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.bankAccountNumber ? `(A/c: ${b.bankAccountNumber})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", display: "block" }}>
              STATEMENT AS OF DATE
            </label>
            <input
              type="date"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
              className="form-input"
            />
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", display: "block" }}>
              STATEMENT CLOSING BALANCE (₹)
            </label>
            <input
              type="number"
              value={statementBalance}
              onChange={(e) => setStatementBalance(parseFloat(e.target.value) || 0)}
              className="form-input"
              style={{ fontWeight: 700, width: "160px" }}
              step="0.01"
            />
          </div>

          <button
            onClick={handleSaveCheckpoint}
            className="primary-btn"
            style={{ display: "flex", alignItems: "center", gap: "6px", height: "38px", marginTop: "16px", padding: "0 16px" }}
          >
            <Save size={15} /> Save BRS
          </button>
        </div>
      </div>

      {saveMessage && (
        <div style={{ padding: "10px 14px", background: "#ecfdf5", color: "#059669", borderRadius: "8px", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckCircle2 size={16} />
          {saveMessage}
        </div>
      )}

      {/* BRS Balance Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        <div className="glass-panel" style={{ padding: "18px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Balance as per Company Books</div>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
            ₹{overview.bookBalance.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Ledger Account Balance
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "18px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Add: Unpresented Cheques (Issued)</div>
          <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#059669", marginTop: "4px" }}>
            +₹{overview.unpresentedCheques.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Paid in books, not debited by bank
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "18px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Less: Uncredited Deposits</div>
          <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#dc2626", marginTop: "4px" }}>
            -₹{overview.uncreditedDeposits.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Received in books, not credited by bank
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "18px", background: isMatch ? "#f0fdf4" : "#fef2f2", border: `1px solid ${isMatch ? "#bbf7d0" : "#fecaca"}` }}>
          <div style={{ fontSize: "0.8rem", color: isMatch ? "#166534" : "#991b1b", fontWeight: 600 }}>
            Reconciliation Difference
          </div>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: isMatch ? "#15803d" : "#b91c1c", marginTop: "4px" }}>
            {isMatch ? "₹0.00 (MATCHED)" : `₹${Math.abs(difference).toFixed(2)}`}
          </div>
          <div style={{ fontSize: "0.75rem", color: isMatch ? "#15803d" : "#b91c1c", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
            {isMatch ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            {isMatch ? "Bank Statement Fully Reconciled" : "Discrepancy detected"}
          </div>
        </div>
      </div>

      {/* Transaction Matching Table */}
      <div className="glass-panel" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>
            Bank Account Journal Transactions ({overview.transactions?.length || 0})
          </h3>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            Toggle clearance to reconcile with bank passbook
          </span>
        </div>

        <div className="table-responsive">
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-secondary, #f8fafc)", textAlign: "left", fontSize: "0.85rem" }}>
                <th style={{ padding: "10px 12px" }}>Book Date</th>
                <th style={{ padding: "10px 12px" }}>Voucher #</th>
                <th style={{ padding: "10px 12px" }}>Particulars</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Deposit / Inflow (₹)</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Withdrawal / Outflow (₹)</th>
                <th style={{ padding: "10px 12px", textAlign: "center" }}>Bank Clearance</th>
                <th style={{ padding: "10px 12px", textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(!overview.transactions || overview.transactions.length === 0) ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "var(--text-secondary)" }}>
                    No transactions recorded on this bank account.
                  </td>
                </tr>
              ) : (
                overview.transactions.map((t: any) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                      {new Date(t.journalEntry?.date).toLocaleDateString("en-GB")}
                    </td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: 700, color: "#4f46e5" }}>
                      {t.journalEntry?.voucherNumber}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: "0.85rem" }}>
                      <div>{t.particulars || t.journalEntry?.narration || "Bank Transaction"}</div>
                      {t.journalEntry?.referenceNumber && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          Ref/Cheque: {t.journalEntry.referenceNumber}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: t.debit > 0 ? 700 : 400, color: t.debit > 0 ? "#059669" : "#94a3b8" }}>
                      {t.debit > 0 ? `₹${t.debit.toLocaleString()}` : "-"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: t.credit > 0 ? 700 : 400, color: t.credit > 0 ? "#dc2626" : "#94a3b8" }}>
                      {t.credit > 0 ? `₹${t.credit.toLocaleString()}` : "-"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {t.isReconciled && t.bankClearanceDate ? new Date(t.bankClearanceDate).toLocaleDateString("en-GB") : "In Transit"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <button
                        onClick={() => handleToggleReconcile(t.id, t.isReconciled)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 10px",
                          borderRadius: "14px",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          background: t.isReconciled ? "#ecfdf5" : "#fef3c7",
                          color: t.isReconciled ? "#059669" : "#d97706"
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
