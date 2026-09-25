"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
  FileText,
  ClipboardList,
  Search,
  Copy,
  Check,
  User,
  ArrowRight,
  Package
} from "lucide-react";
import {
  getDormantAndReorderInsights,
  createDraftReorderQuotation,
  createSalespersonReorderTask,
  ReorderDashboardData,
  CustomerReorderInsight
} from "@/app/actions/aiReorderActions";
import "./AIReorderPredictorModal.css";

interface AIReorderPredictorModalProps {
  onClose: () => void;
}

export default function AIReorderPredictorModal({ onClose }: AIReorderPredictorModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReorderDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "HIGH_CHURN_RISK" | "DUE_FOR_REORDER" | "ACTIVE_HEALTHY">("ALL");

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<{ id: string; text: string; type: "success" | "error" } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await getDormantAndReorderInsights();
    setLoading(false);
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(res.error || "Failed to load re-order predictions");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyPitch = (id: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleSendWhatsApp = (mobile: string, text: string) => {
    const cleanNumber = mobile.replace(/[^0-9]/g, "");
    const waUrl = cleanNumber.length >= 10 
      ? `https://wa.me/${cleanNumber.length === 10 ? '91' + cleanNumber : cleanNumber}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  const handleCreateDraftQuote = async (cust: CustomerReorderInsight) => {
    setProcessingId(`quote-${cust.customerId}`);
    setActionStatus(null);
    const res = await createDraftReorderQuotation(cust.customerId);
    setProcessingId(null);
    if (res.success) {
      setActionStatus({
        id: cust.customerId,
        text: `Draft Quote #${res.quotationNumber} (₹${res.totalValue?.toLocaleString('en-IN')}) created!`,
        type: "success"
      });
      setTimeout(() => setActionStatus(null), 3500);
    } else {
      setActionStatus({
        id: cust.customerId,
        text: res.error || "Failed to create quote",
        type: "error"
      });
    }
  };

  const handleAssignTask = async (cust: CustomerReorderInsight) => {
    setProcessingId(`task-${cust.customerId}`);
    setActionStatus(null);
    const res = await createSalespersonReorderTask({
      customerId: cust.customerId,
      salespersonId: cust.salespersonId,
      customerName: cust.businessName,
      daysSinceLastOrder: cust.daysSinceLastOrder,
      recommendedPitch: cust.whatsappPitch
    });
    setProcessingId(null);
    if (res.success) {
      setActionStatus({
        id: cust.customerId,
        text: `Re-engagement task assigned to ${cust.salespersonName}!`,
        type: "success"
      });
      setTimeout(() => setActionStatus(null), 3500);
    } else {
      setActionStatus({
        id: cust.customerId,
        text: res.error || "Failed to assign task",
        type: "error"
      });
    }
  };

  const filteredInsights = (data?.insights || []).filter(item => {
    if (filterStatus !== "ALL" && item.churnStatus !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.businessName.toLowerCase().includes(q);
      const matchContact = item.contactPerson?.toLowerCase().includes(q);
      const matchSalesperson = item.salespersonName?.toLowerCase().includes(q);
      const matchProduct = item.topProducts.some(p => p.productName.toLowerCase().includes(q));
      if (!matchName && !matchContact && !matchSalesperson && !matchProduct) return false;
    }
    return true;
  });

  return (
    <div className="reorder-modal-overlay" onClick={onClose}>
      <div className="reorder-modal-container" onClick={e => e.stopPropagation()}>
        {/* Mobile Drag Indicator Handle */}
        <div className="reorder-modal-handle-bar" />
        {/* Header */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            padding: "16px 22px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 600, color: "#0f172a" }}>
                AI Customer Re-Order & Churn Predictor
              </h2>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "#64748b", fontWeight: 400 }}>
                Identify overdue B2B buyers, predict churn risk, and trigger 1-click tailored re-order campaigns.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "6px 12px",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "#475569",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#64748b"
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="reorder-modal-body">
          
          {error && (
            <div style={{ padding: "12px 16px", borderRadius: "8px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: "0.85rem" }}>
              {error}
            </div>
          )}

          {/* 4 Overview Metric Cards */}
          {data && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              
              <div style={{ padding: "14px", borderRadius: "12px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 550, color: "#64748b", textTransform: "uppercase" }}>Analyzed Accounts</span>
                <div style={{ fontSize: "1.4rem", fontWeight: 600, color: "#0f172a", margin: "4px 0 0 0", fontVariantNumeric: "tabular-nums" }}>
                  {data.totalAnalyzedCustomers}
                </div>
              </div>

              <div style={{ padding: "14px", borderRadius: "12px", backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 550, color: "#991b1b", textTransform: "uppercase" }}>High Churn Risk</span>
                  <AlertTriangle size={14} color="#dc2626" />
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 600, color: "#dc2626", margin: "4px 0 0 0", fontVariantNumeric: "tabular-nums" }}>
                  {data.highRiskCount}
                </div>
              </div>

              <div style={{ padding: "14px", borderRadius: "12px", backgroundColor: "#fffbeb", border: "1px solid #fef3c7" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 550, color: "#92400e", textTransform: "uppercase" }}>Due For Re-Order</span>
                  <Clock size={14} color="#d97706" />
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 600, color: "#d97706", margin: "4px 0 0 0", fontVariantNumeric: "tabular-nums" }}>
                  {data.dueForReorderCount}
                </div>
              </div>

              <div style={{ padding: "14px", borderRadius: "12px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 550, color: "#166534", textTransform: "uppercase" }}>Recoverable Pipeline</span>
                  <TrendingUp size={14} color="#16a34a" />
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 600, color: "#16a34a", margin: "4px 0 0 0", fontVariantNumeric: "tabular-nums" }}>
                  ₹{data.estimatedRecoverableRevenue.toLocaleString("en-IN")}
                </div>
              </div>

            </div>
          )}

          {/* Controls Bar: Search & Status Filters */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            
            {/* Search */}
            <div style={{ display: "flex", alignItems: "center", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 12px", width: "320px" }}>
              <Search size={14} color="#94a3b8" style={{ marginRight: "8px" }} />
              <input
                type="text"
                placeholder="Search by buyer name, salesperson, SKU..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: "none", background: "transparent", outline: "none", fontSize: "0.8125rem", width: "100%", color: "#0f172a" }}
              />
            </div>

            {/* Filter Tabs */}
            <div style={{ display: "flex", gap: "6px" }}>
              {[
                { key: "ALL", label: "All Accounts" },
                { key: "HIGH_CHURN_RISK", label: `🔴 High Risk (${data?.highRiskCount || 0})` },
                { key: "DUE_FOR_REORDER", label: `🟡 Due Reorder (${data?.dueForReorderCount || 0})` },
                { key: "ACTIVE_HEALTHY", label: `🟢 Healthy (${data?.healthyCount || 0})` }
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterStatus(tab.key as any)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    fontWeight: filterStatus === tab.key ? 600 : 500,
                    backgroundColor: filterStatus === tab.key ? "#4f46e5" : "#f8fafc",
                    color: filterStatus === tab.key ? "#ffffff" : "#475569",
                    border: filterStatus === tab.key ? "none" : "1px solid #e2e8f0",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

          </div>

          {/* Cards List */}
          {loading ? (
            <div style={{ padding: "48px 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <RefreshCw size={24} className="animate-spin" color="#4f46e5" />
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Analyzing customer ordering cycles & churn signals...</span>
            </div>
          ) : filteredInsights.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredInsights.map(cust => {
                const isOverdue = cust.churnStatus === "HIGH_CHURN_RISK" || cust.churnStatus === "DUE_FOR_REORDER";
                const isProcessingThis = processingId?.includes(cust.customerId);
                const custAction = actionStatus?.id === cust.customerId ? actionStatus : null;

                return (
                  <div
                    key={cust.customerId}
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      backgroundColor: "#ffffff",
                      border: cust.churnStatus === "HIGH_CHURN_RISK" 
                        ? "1px solid #fecaca" 
                        : cust.churnStatus === "DUE_FOR_REORDER" 
                        ? "1px solid #fed7aa" 
                        : "1px solid #e2e8f0",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                    }}
                  >
                    {/* Top Row: Buyer Info & Status Pill */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#0f172a" }}>
                            {cust.businessName}
                          </span>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              backgroundColor: cust.churnStatus === "HIGH_CHURN_RISK" ? "#fee2e2" : cust.churnStatus === "DUE_FOR_REORDER" ? "#fef3c7" : "#dcfce7",
                              color: cust.churnStatus === "HIGH_CHURN_RISK" ? "#dc2626" : cust.churnStatus === "DUE_FOR_REORDER" ? "#d97706" : "#15803d"
                            }}
                          >
                            {cust.churnStatus === "HIGH_CHURN_RISK" ? "🔴 High Churn Risk" : cust.churnStatus === "DUE_FOR_REORDER" ? "🟡 Due for Re-Order" : "🟢 Healthy Pace"}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "12px", fontSize: "0.78rem", color: "#64748b", marginTop: "3px" }}>
                          <span>👤 {cust.contactPerson || "Contact Person"} ({cust.mobile})</span>
                          <span>👔 Sales Rep: <strong style={{ color: "#334155" }}>{cust.salespersonName}</strong></span>
                        </div>
                      </div>

                      {/* Cadence Metrics */}
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "0.7rem", color: "#64748b", display: "block" }}>Last Order</span>
                          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: isOverdue ? "#dc2626" : "#0f172a" }}>
                            {cust.daysSinceLastOrder} days ago
                          </span>
                        </div>
                        <div style={{ width: "1px", height: "24px", backgroundColor: "#e2e8f0" }} />
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "0.7rem", color: "#64748b", display: "block" }}>Avg. Restock Cycle</span>
                          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155" }}>
                            Every {cust.averageOrderCycleDays} days
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Row: Top Historically Ordered Products */}
                    {cust.topProducts.length > 0 && (
                      <div style={{ backgroundColor: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "6px" }}>
                          📦 TOP FAST-MOVING RE-ORDER ITEMS:
                        </span>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {cust.topProducts.map(p => (
                            <span
                              key={p.productId}
                              style={{
                                padding: "3px 8px",
                                borderRadius: "6px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #cbd5e1",
                                fontSize: "0.75rem",
                                color: "#1e293b",
                                fontWeight: 500
                              }}
                            >
                              {p.productName} <span style={{ color: "#64748b" }}>({p.totalQuantityBought} pcs bought)</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Status Alert if any */}
                    {custAction && (
                      <div style={{
                        padding: "8px 12px",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                        fontWeight: 500,
                        backgroundColor: custAction.type === "success" ? "#f0fdf4" : "#fef2f2",
                        color: custAction.type === "success" ? "#16a34a" : "#dc2626",
                        border: `1px solid ${custAction.type === "success" ? "#bbf7d0" : "#fecaca"}`
                      }}>
                        {custAction.text}
                      </div>
                    )}

                    {/* Bottom Action Bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        Lifetime Purchases: <strong style={{ color: "#0f172a" }}>₹{cust.totalPurchaseValue.toLocaleString("en-IN")}</strong> ({cust.totalOrders} orders)
                      </div>

                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        
                        {/* Copy Pitch */}
                        <button
                          type="button"
                          onClick={() => handleCopyPitch(cust.customerId, cust.whatsappPitch)}
                          style={{
                            padding: "5px 10px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            backgroundColor: "#ffffff",
                            color: "#475569",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            cursor: "pointer"
                          }}
                          title="Copy personalized re-order message"
                        >
                          {copiedId === cust.customerId ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                          <span>{copiedId === cust.customerId ? "Copied!" : "Copy Pitch"}</span>
                        </button>

                        {/* Send WhatsApp */}
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(cust.mobile, cust.whatsappPitch)}
                          style={{
                            padding: "5px 11px",
                            borderRadius: "6px",
                            border: "none",
                            backgroundColor: "#25D366",
                            color: "#ffffff",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            cursor: "pointer"
                          }}
                          title="Open WhatsApp chat with restock nudge"
                        >
                          <MessageSquare size={12} />
                          <span>WhatsApp Nudge</span>
                        </button>

                        {/* 1-Click Draft Quote */}
                        <button
                          type="button"
                          onClick={() => handleCreateDraftQuote(cust)}
                          disabled={isProcessingThis}
                          style={{
                            padding: "5px 11px",
                            borderRadius: "6px",
                            border: "1px solid #bfdbfe",
                            backgroundColor: "#eff6ff",
                            color: "#2563eb",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            cursor: isProcessingThis ? "not-allowed" : "pointer"
                          }}
                          title="Generate a pre-filled quote with top repeat items"
                        >
                          <FileText size={12} />
                          <span>{processingId === `quote-${cust.customerId}` ? "Generating..." : "Draft Quote"}</span>
                        </button>

                        {/* Assign Sales Task */}
                        <button
                          type="button"
                          onClick={() => handleAssignTask(cust)}
                          disabled={isProcessingThis}
                          style={{
                            padding: "5px 11px",
                            borderRadius: "6px",
                            border: "1px solid #ddd6fe",
                            backgroundColor: "#f5f3ff",
                            color: "#7c3aed",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            cursor: isProcessingThis ? "not-allowed" : "pointer"
                          }}
                          title="Assign a re-engagement follow-up task to salesperson"
                        >
                          <ClipboardList size={12} />
                          <span>{processingId === `task-${cust.customerId}` ? "Assigning..." : "Assign Task"}</span>
                        </button>

                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: "48px 0", textAlign: "center", color: "#64748b" }}>
              No accounts match the current filter criteria.
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
