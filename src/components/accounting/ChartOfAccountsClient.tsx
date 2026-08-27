"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FolderTree,
  Plus,
  RefreshCw,
  Search,
  Building2,
  Wallet,
  Users,
  CreditCard,
  CheckCircle2,
  FileText,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  X,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Eye,
  Scale
} from "lucide-react";
import { createLedgerAccount, syncSystemLedgers, getLedgerStatement } from "@/app/actions/accountingActions";

interface Props {
  initialGroups: any[];
}

export default function ChartOfAccountsClient({ initialGroups }: Props) {
  const [groups, setGroups] = useState<any[]>(initialGroups);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNature, setSelectedNature] = useState<string>("ALL");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Modal State - Create Ledger
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    accountGroupId: initialGroups[0]?.id || "",
    partyType: "GENERAL",
    openingBalance: 0,
    openingType: "DEBIT" as "DEBIT" | "CREDIT",
    bankAccountNumber: "",
    ifscCode: "",
    gstin: ""
  });
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Statement Drawer State
  const [activeLedgerStatement, setActiveLedgerStatement] = useState<any | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncSystemLedgers();
      if (res.success) {
        setSyncMessage("Chart of Accounts synchronized with CRM/ERP records successfully!");
        window.location.reload();
      } else {
        setSyncMessage(res.error || "Sync failed");
      }
    } catch (e: any) {
      setSyncMessage(e.message || "Error syncing");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleViewStatement = async (ledger: any) => {
    setLoadingStatement(true);
    setActiveLedgerStatement({ ledger, transactions: [], loading: true });
    try {
      const res = await getLedgerStatement(ledger.id);
      if (res.success) {
        setActiveLedgerStatement({
          ...res,
          loading: false
        });
      } else {
        alert(res.error || "Failed to load ledger statement");
        setActiveLedgerStatement(null);
      }
    } catch (err: any) {
      alert(err.message || "Failed to load statement");
      setActiveLedgerStatement(null);
    } finally {
      setLoadingStatement(false);
    }
  };

  const handleCreateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.accountGroupId) {
      setFormError("Ledger name and group are required.");
      return;
    }
    setIsSaving(true);
    setFormError("");

    try {
      const res = await createLedgerAccount(formData);
      if (res.success) {
        setShowCreateModal(false);
        setFormData({
          name: "",
          code: "",
          accountGroupId: initialGroups[0]?.id || "",
          partyType: "GENERAL",
          openingBalance: 0,
          openingType: "DEBIT",
          bankAccountNumber: "",
          ifscCode: "",
          gstin: ""
        });
        window.location.reload();
      } else {
        setFormError(res.error || "Failed to create ledger");
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter groups and ledgers
  const filteredGroups = groups.filter(g => {
    if (selectedNature !== "ALL" && g.nature !== selectedNature) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const groupMatches = g.name.toLowerCase().includes(q) || (g.code && g.code.toLowerCase().includes(q));
    const ledgerMatches = (g.ledgers || []).some((l: any) => l.name.toLowerCase().includes(q) || (l.code && l.code.toLowerCase().includes(q)));
    return groupMatches || ledgerMatches;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* Action Header & Search Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
        
        {/* Search Box */}
        <div 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            backgroundColor: "#ffffff", 
            border: "1px solid var(--border, #cbd5e1)", 
            borderRadius: "9999px", 
            padding: "9px 18px", 
            width: "100%", 
            maxWidth: "460px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            transition: "all 0.2s ease"
          }}
        >
          <Search size={17} style={{ color: "var(--text-muted, #94a3b8)", marginRight: "10px", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search groups or ledger accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
          {searchTerm && (
            <button 
              type="button" 
              onClick={() => setSearchTerm("")} 
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center" }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
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
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)"
            }}
          >
            <RefreshCw size={15} className={isSyncing ? "animate-spin" : ""} style={{ color: "var(--accent-primary, #4f46e5)" }} />
            {isSyncing ? "Syncing..." : "Sync Ledgers with CRM/ERP"}
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
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
            Create Ledger
          </button>
        </div>
      </div>

      {syncMessage && (
        <div style={{ padding: "12px 16px", background: "#ecfdf5", color: "#059669", borderRadius: "10px", border: "1px solid #bbf7d0", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
          <CheckCircle2 size={16} />
          {syncMessage}
        </div>
      )}

      {/* Nature Filter Pills */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {[
          { id: "ALL", label: "All Groups" },
          { id: "ASSET", label: "Assets" },
          { id: "LIABILITY", label: "Liabilities" },
          { id: "INCOME", label: "Income" },
          { id: "EXPENSE", label: "Expenses" }
        ].map(pill => {
          const isSelected = selectedNature === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => setSelectedNature(pill.id)}
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
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Groups & Ledgers Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "18px" }}>
        {filteredGroups.map(group => {
          const groupTotal = (group.ledgers || []).reduce((sum: number, l: any) => sum + (l.currentBalance || l.openingBalance || 0), 0);

          return (
            <div 
              key={group.id} 
              style={{ 
                backgroundColor: "#ffffff",
                border: "1px solid var(--border, #e2e8f0)",
                borderRadius: "14px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.03)",
                padding: "20px", 
                display: "flex", 
                flexDirection: "column", 
                gap: "14px" 
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "var(--accent-light, #eef2ff)", color: "var(--accent-primary, #4f46e5)" }}>
                    <FolderTree size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: "var(--text-primary, #0f172a)" }}>{group.name}</h3>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #64748b)" }}>Code: {group.code || "-"}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: "6px",
                    background: group.nature === "ASSET" ? "#e0f2fe" : group.nature === "LIABILITY" ? "#fef3c7" : group.nature === "INCOME" ? "#dcfce7" : "#fee2e2",
                    color: group.nature === "ASSET" ? "#0369a1" : group.nature === "LIABILITY" ? "#92400e" : group.nature === "INCOME" ? "#15803d" : "#b91c1c"
                  }}>
                    {group.nature}
                  </span>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginTop: "3px" }}>
                    Total: ₹{groupTotal.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Ledgers inside this group */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "240px", overflowY: "auto" }}>
                {(!group.ledgers || group.ledgers.length === 0) ? (
                  <div style={{ color: "var(--text-muted, #94a3b8)", fontSize: "0.82rem", fontStyle: "italic", padding: "12px 0", textAlign: "center" }}>
                    No active ledgers in this group.
                  </div>
                ) : (
                  group.ledgers.map((ledger: any) => {
                    const balance = ledger.currentBalance !== undefined ? ledger.currentBalance : (ledger.openingBalance || 0);
                    const isDebit = group.nature === "ASSET" || group.nature === "EXPENSE" ? (ledger.openingType !== "CREDIT") : (ledger.openingType === "DEBIT");

                    return (
                      <div
                        key={ledger.id}
                        onClick={() => handleViewStatement(ledger)}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          background: "var(--bg-primary, #f8fafc)",
                          borderRadius: "8px",
                          border: "1px solid #f1f5f9",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                        onMouseOver={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "#eef2ff";
                          (e.currentTarget as HTMLElement).style.borderColor = "#c7d2fe";
                        }}
                        onMouseOut={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-primary, #f8fafc)";
                          (e.currentTarget as HTMLElement).style.borderColor = "#f1f5f9";
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 700, color: "var(--accent-primary, #4f46e5)", display: "flex", alignItems: "center", gap: "5px" }}>
                            <span>{ledger.name}</span>
                            <Eye size={12} style={{ opacity: 0.6 }} />
                          </div>
                          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary, #64748b)" }}>
                            {ledger.code} {ledger.partyType ? `• ${ledger.partyType}` : ""}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", marginLeft: "12px", flexShrink: 0 }}>
                          <div style={{ fontWeight: 800, color: "#0f172a" }}>
                            ₹{balance.toLocaleString()}
                          </div>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: (group.nature === "ASSET" || group.nature === "EXPENSE") ? "var(--accent-primary, #4f46e5)" : "#16a34a" }}>
                            {(group.nature === "ASSET" || group.nature === "EXPENSE") ? "Dr" : "Cr"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* GENERAL LEDGER STATEMENT DRAWER / MODAL */}
      {activeLedgerStatement && (
        <div 
          className="modal-backdrop"
          onClick={() => setActiveLedgerStatement(null)}
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
            onClick={(e) => e.stopPropagation()}
            style={{ 
              width: "100%", 
              maxWidth: "850px", 
              backgroundColor: "#ffffff", 
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              maxHeight: "90vh"
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "8px", background: "var(--accent-primary, #4f46e5)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileText size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                    {activeLedgerStatement.ledger?.name}
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                    General Ledger Statement & Chronological Journal Splits
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveLedgerStatement(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Statement Content */}
            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              {activeLedgerStatement.loading ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent-primary, #4f46e5)", margin: "0 auto" }} />
                  <div style={{ marginTop: "8px", fontSize: "0.85rem", color: "#64748b" }}>Loading transactions...</div>
                </div>
              ) : (
                <div>
                  {/* Summary Bar */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginBottom: "16px", background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>OPENING BALANCE</div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                        ₹{(activeLedgerStatement.openingBalance || 0).toLocaleString()} <span style={{ fontSize: "0.75rem", color: "#64748b" }}>({activeLedgerStatement.openingType === 'CREDIT' ? 'Cr' : 'Dr'})</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>TOTAL DEBIT (Dr)</div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-primary, #4f46e5)" }}>
                        ₹{(activeLedgerStatement.totalDebit || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>TOTAL CREDIT (Cr)</div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#16a34a" }}>
                        ₹{(activeLedgerStatement.totalCredit || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>CLOSING BALANCE</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                        ₹{(activeLedgerStatement.closingBalance || 0).toLocaleString()} <span style={{ fontSize: "0.75rem", color: activeLedgerStatement.closingType === 'Cr' ? '#16a34a' : 'var(--accent-primary, #4f46e5)' }}>({activeLedgerStatement.closingType})</span>
                      </div>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="table-responsive" style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ background: "#f1f5f9", textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>
                          <th style={{ padding: "10px 12px", fontWeight: 700, color: "#334155" }}>Date</th>
                          <th style={{ padding: "10px 12px", fontWeight: 700, color: "#334155" }}>Voucher #</th>
                          <th style={{ padding: "10px 12px", fontWeight: 700, color: "#334155" }}>Particulars</th>
                          <th style={{ padding: "10px 12px", fontWeight: 700, color: "#334155", textAlign: "right" }}>Debit (₹)</th>
                          <th style={{ padding: "10px 12px", fontWeight: 700, color: "#334155", textAlign: "right" }}>Credit (₹)</th>
                          <th style={{ padding: "10px 12px", fontWeight: 700, color: "#334155", textAlign: "right" }}>Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!activeLedgerStatement.transactions || activeLedgerStatement.transactions.length === 0) ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                              No double-entry transactions recorded for this ledger in the selected period.
                            </td>
                          </tr>
                        ) : (
                          activeLedgerStatement.transactions.map((tx: any) => (
                            <tr key={tx.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "9px 12px", whiteSpace: "nowrap", color: "#475569" }}>
                                {new Date(tx.date).toLocaleDateString("en-GB")}
                              </td>
                              <td style={{ padding: "9px 12px", fontFamily: "monospace", fontWeight: 700, color: "var(--accent-primary, #4f46e5)" }}>
                                {tx.voucherNumber}
                              </td>
                              <td style={{ padding: "9px 12px", color: "#1e293b" }}>
                                {tx.particulars}
                              </td>
                              <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: tx.debit > 0 ? 700 : 400, color: tx.debit > 0 ? "var(--accent-primary, #4f46e5)" : "#94a3b8" }}>
                                {tx.debit > 0 ? `₹${tx.debit.toLocaleString()}` : "-"}
                              </td>
                              <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: tx.credit > 0 ? 700 : 400, color: tx.credit > 0 ? "#16a34a" : "#94a3b8" }}>
                                {tx.credit > 0 ? `₹${tx.credit.toLocaleString()}` : "-"}
                              </td>
                              <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                                ₹{tx.runningBalance.toLocaleString()} {tx.balanceType}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", background: "#f8fafc" }}>
              <button 
                type="button" 
                onClick={() => setActiveLedgerStatement(null)}
                style={{ padding: "8px 18px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#fff", cursor: "pointer", fontWeight: 600, color: "#475569" }}
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE LEDGER MODAL */}
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
              maxWidth: "560px", 
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
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>Create New Ledger Account</h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>Add a general ledger, customer/vendor account, or bank ledger.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateLedger} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto", maxHeight: "calc(90vh - 130px)" }}>
              {formError && (
                <div style={{ padding: "10px 14px", background: "#fef2f2", color: "#dc2626", borderRadius: "8px", fontSize: "0.85rem", border: "1px solid #fecaca" }}>
                  {formError}
                </div>
              )}

              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>Ledger Name *</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank Current A/c or Office Stationery"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", backgroundColor: "#f8fafc", outline: "none" }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>Parent Account Group *</label>
                <select
                  value={formData.accountGroupId}
                  onChange={(e) => setFormData({ ...formData, accountGroupId: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", backgroundColor: "#f8fafc", outline: "none", fontWeight: 600 }}
                  required
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.nature})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>Ledger Code</label>
                  <input
                    type="text"
                    placeholder="e.g. BANK_HDFC"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", backgroundColor: "#f8fafc", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>Party / Account Type</label>
                  <select
                    value={formData.partyType}
                    onChange={(e) => setFormData({ ...formData, partyType: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", backgroundColor: "#f8fafc", outline: "none", fontWeight: 600 }}
                  >
                    <option value="GENERAL">General Ledger</option>
                    <option value="BANK">Bank Account</option>
                    <option value="CASH">Cash Account</option>
                    <option value="CUSTOMER">Customer / Debtor</option>
                    <option value="VENDOR">Vendor / Creditor</option>
                    <option value="EXPENSE">Expense</option>
                    <option value="TAX">Tax / Duty</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>Opening Balance (₹)</label>
                  <input
                    type="number"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", backgroundColor: "#f8fafc", outline: "none" }}
                    step="0.01"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>Type</label>
                  <select
                    value={formData.openingType}
                    onChange={(e) => setFormData({ ...formData, openingType: e.target.value as any })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", backgroundColor: "#f8fafc", outline: "none", fontWeight: 600 }}
                  >
                    <option value="DEBIT">Debit (Dr)</option>
                    <option value="CREDIT">Credit (Cr)</option>
                  </select>
                </div>
              </div>

              {formData.partyType === "BANK" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>Bank Account No.</label>
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", backgroundColor: "#f8fafc", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>IFSC Code</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      value={formData.ifscCode}
                      onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", backgroundColor: "#f8fafc", outline: "none" }}
                    />
                  </div>
                </div>
              )}

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
                  disabled={isSaving}
                  className="primary-btn"
                  style={{ padding: "9px 24px", borderRadius: "8px", fontWeight: 700, backgroundColor: "var(--accent-primary, #4f46e5)", color: "#fff", border: "none", cursor: "pointer" }}
                >
                  {isSaving ? "Saving..." : "Create Ledger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
