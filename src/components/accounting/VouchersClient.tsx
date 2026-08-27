"use client";

import React, { useState } from "react";
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Search,
  Filter,
  ArrowRightLeft,
  DollarSign
} from "lucide-react";
import { createJournalEntry } from "@/app/actions/accountingActions";

interface Props {
  initialVouchers: any[];
  ledgers: any[];
}

export default function VouchersClient({ initialVouchers, ledgers }: Props) {
  const [vouchers, setVouchers] = useState<any[]>(initialVouchers);
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Voucher Form State
  const [voucherType, setVoucherType] = useState<"JOURNAL" | "CONTRA" | "PAYMENT" | "RECEIPT">("JOURNAL");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [narration, setNarration] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [lines, setLines] = useState([
    { ledgerAccountId: ledgers[0]?.id || "", debit: 0, credit: 0, particulars: "" },
    { ledgerAccountId: ledgers[1]?.id || ledgers[0]?.id || "", debit: 0, credit: 0, particulars: "" }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const totalDebit = lines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
  const difference = Number((totalDebit - totalCredit).toFixed(2));
  const isBalanced = Math.abs(difference) < 0.01 && totalDebit > 0;

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...lines];
    (updated[index] as any)[field] = value;

    // Auto-clear opposite side if entering debit or credit
    if (field === "debit" && Number(value) > 0) {
      updated[index].credit = 0;
    } else if (field === "credit" && Number(value) > 0) {
      updated[index].debit = 0;
    }

    setLines(updated);
  };

  const addLine = () => {
    setLines([...lines, { ledgerAccountId: ledgers[0]?.id || "", debit: 0, credit: 0, particulars: "" }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      alert("A double-entry voucher must have at least 2 lines.");
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!narration.trim()) {
      setFormError("Narration is required.");
      return;
    }
    if (!isBalanced) {
      setFormError(`Debits (₹${totalDebit}) must equal Credits (₹${totalCredit}). Difference: ₹${difference}`);
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      const res = await createJournalEntry({
        voucherType,
        date,
        narration,
        referenceNumber,
        lines: lines.filter(l => l.debit > 0 || l.credit > 0)
      });

      if (res.success) {
        setShowCreateModal(false);
        setNarration("");
        setReferenceNumber("");
        setLines([
          { ledgerAccountId: ledgers[0]?.id || "", debit: 0, credit: 0, particulars: "" },
          { ledgerAccountId: ledgers[1]?.id || ledgers[0]?.id || "", debit: 0, credit: 0, particulars: "" }
        ]);
        window.location.reload();
      } else {
        setFormError(res.error || "Failed to post voucher");
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredVouchers = vouchers.filter(v => {
    if (selectedType !== "ALL" && v.voucherType !== selectedType) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.voucherNumber.toLowerCase().includes(q) ||
      (v.narration && v.narration.toLowerCase().includes(q)) ||
      (v.referenceNumber && v.referenceNumber.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Header Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flex: 1, maxWidth: "450px" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
            <input
              type="text"
              placeholder="Search voucher #, narration, ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: "36px", width: "100%" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => {
              setVoucherType("CONTRA");
              setShowCreateModal(true);
            }}
            className="action-btn"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.875rem", padding: "8px 14px" }}
          >
            <ArrowRightLeft size={15} style={{ color: "#0284c7" }} />
            + Contra (Bank/Cash)
          </button>
          <button
            onClick={() => {
              setVoucherType("JOURNAL");
              setShowCreateModal(true);
            }}
            className="primary-btn"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.875rem", padding: "8px 16px" }}
          >
            <Plus size={16} />
            + Journal Voucher (JV)
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px" }}>
        {[
          { id: "ALL", label: "All Vouchers" },
          { id: "JOURNAL", label: "Journal (JV)" },
          { id: "CONTRA", label: "Contra" },
          { id: "SALES", label: "Sales" },
          { id: "PURCHASE", label: "Purchase" },
          { id: "RECEIPT", label: "Receipts" },
          { id: "PAYMENT", label: "Payments" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSelectedType(t.id)}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid var(--border-color, #e2e8f0)",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              background: selectedType === t.id ? "var(--primary, #4f46e5)" : "var(--bg-secondary, #f8fafc)",
              color: selectedType === t.id ? "#fff" : "var(--text-secondary, #64748b)"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Vouchers Table */}
      <div className="glass-panel" style={{ padding: "20px" }}>
        <div className="table-responsive">
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-secondary, #f8fafc)", textAlign: "left" }}>
                <th style={{ padding: "10px 12px" }}>Date</th>
                <th style={{ padding: "10px 12px" }}>Voucher #</th>
                <th style={{ padding: "10px 12px" }}>Type</th>
                <th style={{ padding: "10px 12px" }}>Particulars & Splits</th>
                <th style={{ padding: "10px 12px" }}>Narration</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "var(--text-secondary)" }}>
                    No journal vouchers recorded yet.
                  </td>
                </tr>
              ) : (
                filteredVouchers.map(v => (
                  <tr key={v.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                      {new Date(v.date).toLocaleDateString("en-GB")}
                    </td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: 700, color: "#4f46e5" }}>
                      {v.voucherNumber}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "6px",
                        background: v.voucherType === "JOURNAL" ? "#f3e8ff" : v.voucherType === "CONTRA" ? "#e0f2fe" : v.voucherType === "SALES" ? "#dcfce7" : "#fee2e2",
                        color: v.voucherType === "JOURNAL" ? "#7e22ce" : v.voucherType === "CONTRA" ? "#0369a1" : v.voucherType === "SALES" ? "#15803d" : "#b91c1c"
                      }}>
                        {v.voucherType}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: "0.85rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        {(v.lines || []).map((l: any, idx: number) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                            <span style={{ color: l.debit > 0 ? "#0f172a" : "#64748b" }}>
                              {l.debit > 0 ? "Dr " : "   To "} <strong>{l.ledgerAccount?.name}</strong>
                            </span>
                            <span style={{ fontWeight: 600 }}>
                              ₹{(l.debit || l.credit).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: "0.8rem", color: "var(--text-secondary)", maxWidth: "250px" }}>
                      {v.narration || "-"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontSize: "0.95rem" }}>
                      ₹{v.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE JOURNAL / CONTRA VOUCHER MODAL */}
      {showCreateModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.55)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "780px", padding: "24px", background: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
                Post Double-Entry {voucherType === "CONTRA" ? "Contra Voucher" : "Journal Voucher (JV)"}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {isBalanced ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", background: "#ecfdf5", color: "#059669", padding: "3px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 700 }}>
                    <CheckCircle2 size={13} /> BALANCED
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", background: "#fef2f2", color: "#dc2626", padding: "3px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 700 }}>
                    <AlertCircle size={13} /> DIFF: ₹{difference}
                  </span>
                )}
              </div>
            </div>

            {formError && (
              <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#dc2626", borderRadius: "6px", marginBottom: "12px", fontSize: "0.85rem" }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Voucher Type</label>
                  <select
                    value={voucherType}
                    onChange={(e) => setVoucherType(e.target.value as any)}
                    className="form-input"
                  >
                    <option value="JOURNAL">Journal Voucher (JV)</option>
                    <option value="CONTRA">Contra (Bank / Cash Deposit / Withdrawal)</option>
                    <option value="PAYMENT">Payment Voucher</option>
                    <option value="RECEIPT">Receipt Voucher</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Voucher Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Reference / Cheque #</label>
                  <input
                    type="text"
                    placeholder="e.g. CHQ-99120"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Line Items Split Table */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 700, margin: 0 }}>
                    Debit & Credit Allocations
                  </label>
                  <button
                    type="button"
                    onClick={addLine}
                    className="action-btn"
                    style={{ padding: "4px 10px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Plus size={13} /> Add Split Row
                  </button>
                </div>

                <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "8px 10px" }}>Ledger Account *</th>
                        <th style={{ padding: "8px 10px", width: "130px", textAlign: "right" }}>Debit (₹)</th>
                        <th style={{ padding: "8px 10px", width: "130px", textAlign: "right" }}>Credit (₹)</th>
                        <th style={{ padding: "8px 10px", width: "40px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 10px" }}>
                            <select
                              value={line.ledgerAccountId}
                              onChange={(e) => handleLineChange(idx, "ledgerAccountId", e.target.value)}
                              className="form-input"
                              style={{ width: "100%", padding: "6px" }}
                              required
                            >
                              {ledgers.map(l => (
                                <option key={l.id} value={l.id}>{l.name} ({l.accountGroup?.name || "Group"})</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <input
                              type="number"
                              value={line.debit || ""}
                              onChange={(e) => handleLineChange(idx, "debit", parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="form-input"
                              style={{ textAlign: "right", padding: "6px" }}
                              step="0.01"
                            />
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <input
                              type="number"
                              value={line.credit || ""}
                              onChange={(e) => handleLineChange(idx, "credit", parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="form-input"
                              style={{ textAlign: "right", padding: "6px" }}
                              step="0.01"
                            />
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => removeLine(idx)}
                              style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: "4px" }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#f8fafc", borderTop: "2px solid #e2e8f0", fontWeight: 700 }}>
                        <td style={{ padding: "10px" }}>TOTALS</td>
                        <td style={{ padding: "10px", textAlign: "right", color: "#4f46e5" }}>
                          ₹{totalDebit.toFixed(2)}
                        </td>
                        <td style={{ padding: "10px", textAlign: "right", color: "#4f46e5" }}>
                          ₹{totalCredit.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Narration / Remarks *</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Being cash deposited into ICICI Bank Current A/c against daily sales collection."
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="action-btn"
                  style={{ padding: "8px 16px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !isBalanced}
                  className="primary-btn"
                  style={{ padding: "8px 22px", opacity: !isBalanced ? 0.6 : 1 }}
                >
                  {isSaving ? "Posting..." : "Post Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
