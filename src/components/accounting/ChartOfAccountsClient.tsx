"use client";

import React, { useState } from "react";
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
  ChevronDown
} from "lucide-react";
import { createLedgerAccount, syncSystemLedgers } from "@/app/actions/accountingActions";

interface Props {
  initialGroups: any[];
}

export default function ChartOfAccountsClient({ initialGroups }: Props) {
  const [groups, setGroups] = useState<any[]>(initialGroups);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNature, setSelectedNature] = useState<string>("ALL");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Modal State
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

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncSystemLedgers();
      if (res.success) {
        setSyncMessage("Chart of Accounts synchronized successfully!");
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
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Action Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flex: 1, maxWidth: "500px" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
            <input
              type="text"
              placeholder="Search groups or ledger accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: "36px", width: "100%" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="action-btn"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.875rem", padding: "8px 14px" }}
          >
            <RefreshCw size={15} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "Syncing..." : "Sync Ledgers with CRM/ERP"}
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="primary-btn"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.875rem", padding: "8px 16px" }}
          >
            <Plus size={16} />
            Create Ledger
          </button>
        </div>
      </div>

      {syncMessage && (
        <div style={{ padding: "10px 14px", background: "#ecfdf5", color: "#059669", borderRadius: "8px", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckCircle2 size={16} />
          {syncMessage}
        </div>
      )}

      {/* Nature Filter Pills */}
      <div style={{ display: "flex", gap: "8px" }}>
        {[
          { id: "ALL", label: "All Groups" },
          { id: "ASSET", label: "Assets" },
          { id: "LIABILITY", label: "Liabilities" },
          { id: "INCOME", label: "Income" },
          { id: "EXPENSE", label: "Expenses" }
        ].map(pill => (
          <button
            key={pill.id}
            onClick={() => setSelectedNature(pill.id)}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid var(--border-color, #e2e8f0)",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              background: selectedNature === pill.id ? "var(--primary, #4f46e5)" : "var(--bg-secondary, #f8fafc)",
              color: selectedNature === pill.id ? "#fff" : "var(--text-secondary, #64748b)"
            }}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Groups & Ledgers Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "16px" }}>
        {filteredGroups.map(group => (
          <div key={group.id} className="glass-panel" style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FolderTree size={18} style={{ color: "var(--primary, #4f46e5)" }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>{group.name}</h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Code: {group.code || "-"}</span>
                </div>
              </div>
              <span style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "6px",
                background: group.nature === "ASSET" ? "#e0f2fe" : group.nature === "LIABILITY" ? "#fef3c7" : group.nature === "INCOME" ? "#dcfce7" : "#fee2e2",
                color: group.nature === "ASSET" ? "#0369a1" : group.nature === "LIABILITY" ? "#92400e" : group.nature === "INCOME" ? "#15803d" : "#b91c1c"
              }}>
                {group.nature}
              </span>
            </div>

            {/* Ledgers inside this group */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "240px", overflowY: "auto" }}>
              {(!group.ledgers || group.ledgers.length === 0) ? (
                <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem", fontStyle: "italic", padding: "8px 0" }}>
                  No active ledgers in this group.
                </div>
              ) : (
                group.ledgers.map((ledger: any) => (
                  <div
                    key={ledger.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 10px",
                      background: "var(--bg-secondary, #f8fafc)",
                      borderRadius: "6px",
                      fontSize: "0.85rem"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{ledger.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {ledger.code} {ledger.partyType ? `• ${ledger.partyType}` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>
                        ₹{(ledger.currentBalance || ledger.openingBalance || 0).toLocaleString()}
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                        {ledger.openingType === "CREDIT" ? "Cr" : "Dr"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CREATE LEDGER MODAL */}
      {showCreateModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "520px", padding: "24px", background: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "16px" }}>Create New Ledger Account</h2>
            
            {formError && (
              <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#dc2626", borderRadius: "6px", marginBottom: "12px", fontSize: "0.85rem" }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateLedger} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Ledger Name *</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank Current A/c or Office Stationery"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Parent Account Group *</label>
                <select
                  value={formData.accountGroupId}
                  onChange={(e) => setFormData({ ...formData, accountGroupId: e.target.value })}
                  className="form-input"
                  required
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.nature})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Ledger Code</label>
                  <input
                    type="text"
                    placeholder="e.g. BANK_HDFC"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Party / Account Type</label>
                  <select
                    value={formData.partyType}
                    onChange={(e) => setFormData({ ...formData, partyType: e.target.value })}
                    className="form-input"
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

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Opening Balance (₹)</label>
                  <input
                    type="number"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                    className="form-input"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Type</label>
                  <select
                    value={formData.openingType}
                    onChange={(e) => setFormData({ ...formData, openingType: e.target.value as any })}
                    className="form-input"
                  >
                    <option value="DEBIT">Debit (Dr)</option>
                    <option value="CREDIT">Credit (Cr)</option>
                  </select>
                </div>
              </div>

              {formData.partyType === "BANK" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Bank Account No.</label>
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>IFSC Code</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      value={formData.ifscCode}
                      onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
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
                  disabled={isSaving}
                  className="primary-btn"
                  style={{ padding: "8px 20px" }}
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
