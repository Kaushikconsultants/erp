"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  MessageSquare,
  Sparkles,
  DollarSign,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Send,
  Copy,
  Check,
  TrendingUp,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import {
  getDebtorRecoveryInsights,
  getPredictiveReorderInsights,
  DebtorRecoveryItem,
  DormantReorderItem
} from "@/app/actions/aiRecoveryActions";

interface Props {
  onClose: () => void;
}

export default function SmartPaymentRecoveryModal({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<"RECOVERY" | "REORDER">("RECOVERY");
  const [loading, setLoading] = useState(true);
  const [debtors, setDebtors] = useState<DebtorRecoveryItem[]>([]);
  const [dormantBuyers, setDormantBuyers] = useState<DormantReorderItem[]>([]);
  const [summary, setSummary] = useState({
    totalDebtors: 0,
    totalOverdueAmount: 0,
    criticalCount: 0,
    highCount: 0,
    avgDaysOverdue: 0
  });

  // Settings
  const [selectedDebtorId, setSelectedDebtorId] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"gentle" | "friendly" | "firm" | "strict">("friendly");
  const [language, setLanguage] = useState<"en" | "hi" | "hinglish">("hinglish");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [recRes, reoRes] = await Promise.all([
        getDebtorRecoveryInsights(),
        getPredictiveReorderInsights()
      ]);

      if (recRes.success) {
        setDebtors(recRes.debtors);
        setSummary(recRes.summary);
        if (recRes.debtors.length > 0) {
          setSelectedDebtorId(recRes.debtors[0].customerId);
        }
      }
      if (reoRes.success) {
        setDormantBuyers(reoRes.dormantBuyers);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const selectedDebtor = debtors.find(d => d.customerId === selectedDebtorId);

  const getMessageContent = (d: DebtorRecoveryItem) => {
    const toneDrafts = d.whatsappDrafts[messageTone] || d.whatsappDrafts.friendly;
    return toneDrafts[language] || toneDrafts.en;
  };

  const handleSendWhatsApp = (phone: string, text: string) => {
    const clean = phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleCopyMessage = (id: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        fontFamily: "var(--font-family, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif)"
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "1180px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0",
          overflow: "hidden"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            padding: "16px 22px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                backgroundColor: "#ecfdf5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                AI Smart Payment Recovery & WhatsApp Reorder Agent
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                Autonomous debtor collection copilot with multi-tone Hindi/English recovery scripts
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Tab Buttons */}
            <div style={{ display: "flex", backgroundColor: "#e2e8f0", borderRadius: "8px", padding: "3px" }}>
              <button
                type="button"
                onClick={() => setActiveTab("RECOVERY")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: activeTab === "RECOVERY" ? "#ffffff" : "transparent",
                  color: activeTab === "RECOVERY" ? "#0f172a" : "#64748b",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  boxShadow: activeTab === "RECOVERY" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                }}
              >
                Payment Recovery ({debtors.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("REORDER")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: activeTab === "REORDER" ? "#ffffff" : "transparent",
                  color: activeTab === "REORDER" ? "#0f172a" : "#64748b",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  boxShadow: activeTab === "REORDER" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                }}
              >
                Reorder Bot ({dormantBuyers.length})
              </button>
            </div>

            <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* KPI Metrics Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "12px",
            padding: "14px 22px",
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #f1f5f9"
          }}
        >
          <div style={{ backgroundColor: "#fef2f2", padding: "10px 14px", borderRadius: "10px", border: "1px solid #fee2e2" }}>
            <span style={{ fontSize: "0.72rem", color: "#991b1b", fontWeight: 600, display: "block" }}>TOTAL OVERDUE DUES</span>
            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#dc2626" }}>
              ₹{summary.totalOverdueAmount.toLocaleString("en-IN")}
            </span>
          </div>

          <div style={{ backgroundColor: "#fffbeb", padding: "10px 14px", borderRadius: "10px", border: "1px solid #fef3c7" }}>
            <span style={{ fontSize: "0.72rem", color: "#92400e", fontWeight: 600, display: "block" }}>CRITICAL DEBTORS (&gt;90D)</span>
            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#d97706" }}>
              {summary.criticalCount} Accounts
            </span>
          </div>

          <div style={{ backgroundColor: "#eff6ff", padding: "10px 14px", borderRadius: "10px", border: "1px solid #dbeafe" }}>
            <span style={{ fontSize: "0.72rem", color: "#1e40af", fontWeight: 600, display: "block" }}>AVG OVERDUE TIME</span>
            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#2563eb" }}>
              {summary.avgDaysOverdue} Days
            </span>
          </div>

          <div style={{ backgroundColor: "#f0fdf4", padding: "10px 14px", borderRadius: "10px", border: "1px solid #dcfce7" }}>
            <span style={{ fontSize: "0.72rem", color: "#166534", fontWeight: 600, display: "block" }}>DORMANT REORDERS</span>
            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#16a34a" }}>
              {dormantBuyers.length} Retailers
            </span>
          </div>
        </div>

        {/* Body Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
              <Sparkles size={28} className="animate-spin" style={{ margin: "0 auto 10px", color: "#4f46e5" }} />
              <p>Analyzing customer ledgers and generating AI recovery scripts...</p>
            </div>
          ) : activeTab === "RECOVERY" ? (
            
            /* TAB 1: PAYMENT RECOVERY */
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.5fr", gap: "20px", alignItems: "flex-start" }}>
              
              {/* Left Column: Debtor Accounts List */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", backgroundColor: "#ffffff" }}>
                <div style={{ padding: "12px 16px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>
                  OVERDUE DEBTORS LIST ({debtors.length})
                </div>

                <div style={{ maxHeight: "480px", overflowY: "auto" }}>
                  {debtors.map(d => {
                    const isSelected = selectedDebtorId === d.customerId;
                    return (
                      <div
                        key={d.customerId}
                        onClick={() => setSelectedDebtorId(d.customerId)}
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid #f1f5f9",
                          backgroundColor: isSelected ? "#f0fdf4" : "#ffffff",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          borderLeft: isSelected ? "4px solid #16a34a" : "4px solid transparent"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.86rem", color: "#0f172a" }}>
                            {d.customerName}
                          </span>
                          <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#dc2626" }}>
                            ₹{d.totalPending.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "#64748b" }}>
                          <span>{d.city || "Retailer"} • {d.unpaidInvoiceCount} Invoices</span>
                          
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontWeight: 600,
                              backgroundColor: d.riskLevel === "CRITICAL" ? "#fee2e2" : d.riskLevel === "HIGH" ? "#fef3c7" : "#eff6ff",
                              color: d.riskLevel === "CRITICAL" ? "#991b1b" : d.riskLevel === "HIGH" ? "#92400e" : "#1e40af"
                            }}
                          >
                            {d.daysOverdue} Days Overdue
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: AI Recovery Script Generator */}
              {selectedDebtor ? (
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px", backgroundColor: "#ffffff", display: "flex", flexDirection: "column", gap: "14px" }}>
                  
                  {/* Selected Debtor Banner */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                        {selectedDebtor.customerName}
                      </h4>
                      <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                        Phone: <strong>{selectedDebtor.mobile}</strong> • Oldest Bill: {selectedDebtor.oldestInvoiceDate} ({selectedDebtor.daysOverdue} days ago)
                      </p>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>Credit Health</span>
                      <span style={{ fontSize: "1rem", fontWeight: 800, color: selectedDebtor.healthScore > 70 ? "#16a34a" : selectedDebtor.healthScore > 40 ? "#d97706" : "#dc2626" }}>
                        {selectedDebtor.healthScore} / 100
                      </span>
                    </div>
                  </div>

                  {/* Tone & Language Selectors */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>
                        REMINDER TONE & SEVERITY
                      </label>
                      <select
                        value={messageTone}
                        onChange={e => setMessageTone(e.target.value as any)}
                        style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.8rem", fontWeight: 600, color: "#0f172a" }}
                      >
                        <option value="gentle">1. Gentle / Courteous Reminder</option>
                        <option value="friendly">2. Friendly Commercial Follow-up</option>
                        <option value="firm">3. Urgent / Dispatch-Hold Warning</option>
                        <option value="strict">4. Final Legal Demand Notice</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>
                        LANGUAGE
                      </label>
                      <select
                        value={language}
                        onChange={e => setLanguage(e.target.value as any)}
                        style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.8rem", fontWeight: 600, color: "#0f172a" }}
                      >
                        <option value="hinglish">Hinglish (Hindi in English Script)</option>
                        <option value="hi">हिंदी (Devanagari)</option>
                        <option value="en">English (Formal)</option>
                      </select>
                    </div>
                  </div>

                  {/* AI Generated WhatsApp Preview Box */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", marginBottom: "6px" }}>
                      AI GENERATED WHATSAPP MESSAGE
                    </label>
                    <div
                      style={{
                        backgroundColor: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: "10px",
                        padding: "14px",
                        fontSize: "0.84rem",
                        lineHeight: "1.5",
                        color: "#1e293b",
                        whiteSpace: "pre-wrap"
                      }}
                    >
                      {getMessageContent(selectedDebtor)}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(selectedDebtor.customerId, getMessageContent(selectedDebtor))}
                      style={{
                        padding: "10px 16px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#ffffff",
                        color: "#334155",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      {copiedId === selectedDebtor.customerId ? <Check size={15} /> : <Copy size={15} />}
                      {copiedId === selectedDebtor.customerId ? "Copied!" : "Copy Text"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(selectedDebtor.mobile, getMessageContent(selectedDebtor))}
                      style={{
                        flex: 1,
                        padding: "10px 18px",
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: "#25D366",
                        color: "#ffffff",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        boxShadow: "0 2px 8px rgba(37, 211, 102, 0.3)"
                      }}
                    >
                      <MessageSquare size={17} /> Send via WhatsApp to {selectedDebtor.customerName}
                    </button>
                  </div>

                </div>
              ) : (
                <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                  Select an account from the list to generate AI recovery message.
                </div>
              )}

            </div>
          ) : (
            
            /* TAB 2: DORMANT BUYER REORDERS */
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                AI identified <strong>{dormantBuyers.length} wholesale retailers</strong> who usually order on cadence but have crossed their normal reorder cycle.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
                {dormantBuyers.map(b => (
                  <div
                    key={b.customerId}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                        {b.customerName}
                      </h4>
                      <span style={{ fontSize: "0.72rem", color: "#ea580c", backgroundColor: "#ffedd5", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                        {b.daysSinceLastOrder} Days Inactive
                      </span>
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      Normal cadence: <strong>Every {b.avgOrderIntervalDays} days</strong> • Lifetime Value: <strong>₹{b.totalLifetimeValue.toLocaleString("en-IN")}</strong>
                    </div>

                    {/* Pitch Draft */}
                    <div style={{ backgroundColor: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #f1f5f9", fontSize: "0.78rem", color: "#334155", lineHeight: "1.45" }}>
                      {b.reorderDraft.hinglish}
                    </div>

                    {/* Action */}
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(b.mobile, b.reorderDraft.hinglish)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "7px",
                        border: "none",
                        backgroundColor: "#25D366",
                        color: "#ffffff",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px"
                      }}
                    >
                      <MessageSquare size={14} /> Send Reorder Pitch on WhatsApp
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
