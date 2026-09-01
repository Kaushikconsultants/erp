"use client";

import DatePicker from '@/components/ui/DatePicker';

import React, { useState } from "react";
import {
  FileText,
  Plus,
  ArrowRightLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Trash2,
  X
} from "lucide-react";
import { createJournalEntry } from "@/app/actions/accountingActions";

interface Props {
  vouchers?: any[];
  initialVouchers?: any[];
  ledgers: any[];
}

export default function VouchersClient({ vouchers, initialVouchers, ledgers }: Props) {
  const allVouchers = vouchers || initialVouchers || [];
  const [voucherList, setVoucherList] = useState<any[]>(allVouchers);
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [voucherType, setVoucherType] = useState<"JOURNAL" | "CONTRA" | "PAYMENT" | "RECEIPT">("JOURNAL");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [narration, setNarration] = useState("");
  
  const [lines, setLines] = useState<any[]>([
    { ledgerAccountId: ledgers[0]?.id || "", debit: 0, credit: 0 },
    { ledgerAccountId: ledgers[1]?.id || ledgers[0]?.id || "", debit: 0, credit: 0 }
  ]);

  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit).toFixed(2);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "debit" && value > 0) updated[index].credit = 0;
    if (field === "credit" && value > 0) updated[index].debit = 0;
    setLines(updated);
  };

  const addLine = () => {
    setLines([...lines, { ledgerAccountId: ledgers[0]?.id || "", debit: 0, credit: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      setFormError(`Debits (₹${totalDebit}) and Credits (₹${totalCredit}) must balance.`);
      return;
    }
    if (!narration.trim()) {
      setFormError("Narration / Remarks is required.");
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      const res = await createJournalEntry({
        voucherType,
        date,
        referenceNumber,
        narration,
        lines: lines.map(l => ({
          ledgerAccountId: l.ledgerAccountId,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0
        }))
      });

      if (res.success) {
        setShowCreateModal(false);
        setNarration("");
        setReferenceNumber("");
        window.location.reload();
      } else {
        setFormError(res.error || "Failed to create voucher");
      }
    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredVouchers = voucherList.filter(v => {
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
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* Top Header Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
        
        {/* System Theme Search Box */}
        <div 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            backgroundColor: "#ffffff", 
            border: "1px solid var(--border, #cbd5e1)", 
            borderRadius: "9999px", 
            padding: "9px 18px", 
            width: "100%", 
            maxWidth: "440px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            transition: "all 0.2s ease"
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = "var(--accent-primary, #4f46e5)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79, 70, 229, 0.15)";
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = "var(--border, #cbd5e1)";
            e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.03)";
          }}
        >
          <Search size={17} style={{ color: "var(--text-muted, #94a3b8)", marginRight: "10px", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search voucher #, narration, ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              width: "100%",
              fontSize: "0.875rem",
              color: "var(--text-primary, #0f172a)",
              fontFamily: "inherit"
            }}
          />
          {search && (
            <button 
              type="button" 
              onClick={() => setSearch("")} 
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center" }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => {
              setVoucherType("CONTRA");
              setShowCreateModal(true);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "10px",
              backgroundColor: "#ffffff",
              border: "1px solid var(--border, #cbd5e1)",
              color: "var(--text-primary, #334155)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
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
            <ArrowRightLeft size={15} style={{ color: "#0284c7" }} />
            + Contra (Bank/Cash)
          </button>
          <button
            type="button"
            onClick={() => {
              setVoucherType("JOURNAL");
              setShowCreateModal(true);
            }}
            className="primary-btn hover-lift"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "10px 20px",
              borderRadius: "10px",
              fontSize: "0.875rem",
              fontWeight: 700,
              backgroundColor: "var(--accent-primary, #4f46e5)",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.12)"
            }}
          >
            <Plus size={17} />
            + Journal Voucher (JV)
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {[
          { id: "ALL", label: "All Vouchers" },
          { id: "JOURNAL", label: "Journal (JV)" },
          { id: "CONTRA", label: "Contra" },
          { id: "SALES", label: "Sales" },
          { id: "PURCHASE", label: "Purchase" },
          { id: "RECEIPT", label: "Receipts" },
          { id: "PAYMENT", label: "Payments" }
        ].map(t => {
          const isSelected = selectedType === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedType(t.id)}
              style={{
                padding: "7px 18px",
                borderRadius: "9999px",
                border: `1px solid ${isSelected ? "var(--accent-primary, #4f46e5)" : "var(--border, #e2e8f0)"}`,
                fontSize: "0.82rem",
                fontWeight: isSelected ? 700 : 600,
                cursor: "pointer",
                background: isSelected ? "var(--accent-primary, #4f46e5)" : "#ffffff",
                color: isSelected ? "#ffffff" : "var(--text-secondary, #64748b)",
                boxShadow: isSelected ? "0 2px 5px rgba(0,0,0,0.12)" : "none",
                transition: "all 0.15s ease"
              }}
              onMouseOver={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-primary, #f8fafc)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-primary, #0f172a)";
                }
              }}
              onMouseOut={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "#ffffff";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-secondary, #64748b)";
                }
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Vouchers Table */}
      <div 
        style={{ 
          backgroundColor: "#ffffff",
          border: "1px solid var(--border, #e2e8f0)",
          borderRadius: "14px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.03)",
          overflow: "hidden"
        }}
      >
        <div className="table-responsive">
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-secondary, #f8fafc)", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "12px 16px", fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>Date</th>
                <th style={{ padding: "12px 16px", fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>Voucher #</th>
                <th style={{ padding: "12px 16px", fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>Type</th>
                <th style={{ padding: "12px 16px", fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>Particulars & Splits</th>
                <th style={{ padding: "12px 16px", fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>Narration</th>
                <th style={{ padding: "12px 16px", fontSize: "0.82rem", fontWeight: 700, color: "#475569", textAlign: "right" }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary, #64748b)" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: "6px" }}>📑</div>
                    <div style={{ fontWeight: 600 }}>No journal vouchers found.</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)" }}>Create a Journal or Contra voucher to record adjustment entries.</div>
                  </td>
                </tr>
              ) : (
                filteredVouchers.map(v => (
                  <tr key={v.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", whiteSpace: "nowrap", color: "#334155" }}>
                      {new Date(v.date).toLocaleDateString("en-GB")}
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: 700, color: "var(--accent-primary, #4f46e5)" }}>
                      {v.voucherNumber}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "3px 9px",
                        borderRadius: "6px",
                        background: v.voucherType === "JOURNAL" ? "#f3e8ff" : v.voucherType === "CONTRA" ? "#e0f2fe" : v.voucherType === "SALES" ? "#dcfce7" : "#fee2e2",
                        color: v.voucherType === "JOURNAL" ? "#7e22ce" : v.voucherType === "CONTRA" ? "#0369a1" : v.voucherType === "SALES" ? "#15803d" : "#b91c1c"
                      }}>
                        {v.voucherType}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        {(v.lines || []).map((l: any, idx: number) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
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
                    <td style={{ padding: "12px 16px", fontSize: "0.82rem", color: "var(--text-secondary, #64748b)", maxWidth: "260px" }}>
                      {v.narration || "-"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
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
        <div 
          className="modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 16px"
          }}
        >
          <div 
            className="animate-in"
            style={{ 
              width: "100%", 
              maxWidth: "800px", 
              backgroundColor: "#ffffff", 
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  Post Double-Entry {voucherType === "CONTRA" ? "Contra Voucher" : "Journal Voucher (JV)"}
                </h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {isBalanced ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", background: "#ecfdf5", color: "#059669", padding: "4px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700, border: "1px solid #bbf7d0" }}>
                    <CheckCircle2 size={13} /> BALANCED
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", background: "#fef2f2", color: "#dc2626", padding: "4px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700, border: "1px solid #fecaca" }}>
                    <AlertCircle size={13} /> DIFF: ₹{difference}
                  </span>
                )}
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px" }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto", maxHeight: "calc(90vh - 130px)" }}>
              {formError && (
                <div style={{ padding: "10px 14px", background: "#fef2f2", color: "#dc2626", borderRadius: "8px", fontSize: "0.85rem", border: "1px solid #fecaca" }}>
                  {formError}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>Voucher Type</label>
                  <select
                    value={voucherType}
                    onChange={(e) => setVoucherType(e.target.value as any)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", backgroundColor: "#f8fafc", outline: "none", fontWeight: 600 }}
                  >
                    <option value="JOURNAL">Journal Voucher (JV)</option>
                    <option value="CONTRA">Contra (Bank / Cash Deposit / Withdrawal)</option>
                    <option value="PAYMENT">Payment Voucher</option>
                    <option value="RECEIPT">Receipt Voucher</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>Voucher Date *</label>
                  <DatePicker
                    
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", backgroundColor: "#f8fafc", outline: "none" }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>Reference / Cheque #</label>
                  <input
                    type="text"
                    placeholder="e.g. CHQ-99120"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", backgroundColor: "#f8fafc", outline: "none" }}
                  />
                </div>
              </div>

              {/* Line Items Split Table */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", margin: 0 }}>
                    Debit & Credit Allocations
                  </label>
                  <button
                    type="button"
                    onClick={addLine}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      backgroundColor: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "var(--accent-primary, #4f46e5)",
                      cursor: "pointer"
                    }}
                  >
                    <Plus size={13} /> Add Split Row
                  </button>
                </div>

                <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "10px 12px", fontWeight: 700, color: "#475569" }}>Ledger Account *</th>
                        <th style={{ padding: "10px 12px", width: "140px", textAlign: "right", fontWeight: 700, color: "#475569" }}>Debit (₹)</th>
                        <th style={{ padding: "10px 12px", width: "140px", textAlign: "right", fontWeight: 700, color: "#475569" }}>Credit (₹)</th>
                        <th style={{ padding: "10px 12px", width: "44px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 10px" }}>
                            <select
                              value={line.ledgerAccountId}
                              onChange={(e) => handleLineChange(idx, "ledgerAccountId", e.target.value)}
                              style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#fff", outline: "none", fontSize: "0.85rem" }}
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
                              style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", textAlign: "right", outline: "none", fontSize: "0.85rem" }}
                              step="0.01"
                            />
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <input
                              type="number"
                              value={line.credit || ""}
                              onChange={(e) => handleLineChange(idx, "credit", parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", textAlign: "right", outline: "none", fontSize: "0.85rem" }}
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
                        <td style={{ padding: "10px 12px" }}>TOTALS</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--accent-primary, #4f46e5)", fontWeight: 800 }}>
                          ₹{totalDebit.toFixed(2)}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--accent-primary, #4f46e5)", fontWeight: 800 }}>
                          ₹{totalCredit.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>Narration / Remarks *</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Being cash deposited into Bank against daily sales collection."
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", backgroundColor: "#f8fafc", outline: "none", fontFamily: "inherit" }}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#fff", cursor: "pointer", fontWeight: 600, color: "#475569" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !isBalanced}
                  className="primary-btn"
                  style={{ padding: "9px 24px", borderRadius: "8px", fontWeight: 700, backgroundColor: "var(--accent-primary, #4f46e5)", color: "#fff", border: "none", cursor: isBalanced ? "pointer" : "not-allowed", opacity: !isBalanced ? 0.6 : 1 }}
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
