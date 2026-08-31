"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  ClipboardList,
  RefreshCw,
  User
} from "lucide-react";
import { getDeadStockLiquidationInsights, createClearanceTask, DeadStockReport, DeadStockSKU } from "@/app/actions/aiDeadStockActions";

interface Props {
  onClose: () => void;
}

export default function DeadStockInsightsModal({ onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<DeadStockReport | null>(null);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "DEAD" | "SLOW" | "HEALTHY">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<{ id: string; text: string } | null>(null);
  const [creatingTaskId, setCreatingTaskId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const res = await getDeadStockLiquidationInsights();
    if (res.success && res.data) {
      setReport(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSkus = (report?.skus || []).filter(s => {
    if (filterStatus === "ALL") return true;
    return s.healthStatus === filterStatus;
  });

  const handleSendWhatsAppPromo = (text: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleCopyText = (id: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCreateClearanceTask = async (s: DeadStockSKU) => {
    setCreatingTaskId(s.productId);
    const res = await createClearanceTask({
      productName: s.name,
      sku: s.sku,
      lockedCapital: s.lockedCapital,
      discountPercent: s.recommendedDiscountPercent,
      clearanceRate: s.recommendedClearancePrice
    });
    setCreatingTaskId(null);
    if (res.success) {
      setTaskStatus({ id: s.productId, text: "Liquidation task assigned to sales team!" });
      setTimeout(() => setTaskStatus(null), 3000);
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
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "1160px",
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
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "#fef2f2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Flame size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 600, color: "#0f172a" }}>
                AI Dead Stock & Inventory Liquidation Engine
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b", fontWeight: 400 }}>
                Identify idle working capital, match relevant B2B wholesale buyers, and trigger flash clearance campaigns.
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
              onClick={onClose} 
              style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* KPI Banner */}
        {report && (
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
              <span style={{ fontSize: "0.72rem", color: "#991b1b", fontWeight: 550, display: "block" }}>LOCKED IN DEAD STOCK</span>
              <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "#dc2626", fontVariantNumeric: "tabular-nums" }}>
                ₹{report.totalLockedCapitalInDeadStock.toLocaleString("en-IN")}
              </span>
            </div>

            <div style={{ backgroundColor: "#fffbeb", padding: "10px 14px", borderRadius: "10px", border: "1px solid #fef3c7" }}>
              <span style={{ fontSize: "0.72rem", color: "#92400e", fontWeight: 550, display: "block" }}>SLOW MOVING ARTICLES</span>
              <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "#d97706", fontVariantNumeric: "tabular-nums" }}>
                {report.slowMovingCount} Articles
              </span>
            </div>

            <div style={{ backgroundColor: "#f0fdf4", padding: "10px 14px", borderRadius: "10px", border: "1px solid #dcfce7" }}>
              <span style={{ fontSize: "0.72rem", color: "#166534", fontWeight: 550, display: "block" }}>HEALTHY VELOCITY</span>
              <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "#16a34a", fontVariantNumeric: "tabular-nums" }}>
                {report.healthyCount} Articles
              </span>
            </div>

            <div style={{ backgroundColor: "#eff6ff", padding: "10px 14px", borderRadius: "10px", border: "1px solid #dbeafe" }}>
              <span style={{ fontSize: "0.72rem", color: "#1e40af", fontWeight: 550, display: "block" }}>TOTAL GODOWN VALUATION</span>
              <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "#2563eb", fontVariantNumeric: "tabular-nums" }}>
                ₹{report.totalLockedCapitalOverall.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div style={{ padding: "12px 22px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setFilterStatus("ALL")}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                backgroundColor: filterStatus === "ALL" ? "#0f172a" : "#ffffff",
                color: filterStatus === "ALL" ? "#ffffff" : "#334155",
                fontSize: "0.75rem",
                fontWeight: 500,
                cursor: "pointer"
              }}
            >
              All Articles ({report?.skus.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("DEAD")}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                border: "1px solid #fecaca",
                backgroundColor: filterStatus === "DEAD" ? "#dc2626" : "#ffffff",
                color: filterStatus === "DEAD" ? "#ffffff" : "#dc2626",
                fontSize: "0.75rem",
                fontWeight: 500,
                cursor: "pointer"
              }}
            >
              🔴 Dead Stock ({report?.deadStockCount || 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("SLOW")}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                border: "1px solid #fed7aa",
                backgroundColor: filterStatus === "SLOW" ? "#ea580c" : "#ffffff",
                color: filterStatus === "SLOW" ? "#ffffff" : "#ea580c",
                fontSize: "0.75rem",
                fontWeight: 500,
                cursor: "pointer"
              }}
            >
              🟡 Slow Moving ({report?.slowMovingCount || 0})
            </button>
          </div>

          <a
            href="/catalog"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: "0.75rem",
              color: "#4f46e5",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontWeight: 500
            }}
          >
            <ExternalLink size={13} /> Open Wholesale Lookbook
          </a>
        </div>

        {/* Table Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px" }}>
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
              <RefreshCw size={26} className="animate-spin" style={{ margin: "0 auto 10px", color: "#4f46e5" }} />
              <p style={{ fontSize: "0.85rem" }}>Analyzing warehouse stock aging and sales velocity...</p>
            </div>
          ) : filteredSkus.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredSkus.map(s => {
                const isTaskThis = taskStatus?.id === s.productId;
                return (
                  <div
                    key={s.productId}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "14px 18px",
                      backgroundColor: "#ffffff",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      borderLeft: s.healthStatus === "DEAD" ? "4px solid #dc2626" : s.healthStatus === "SLOW" ? "4px solid #f59e0b" : "4px solid #10b981"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "8px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "#0f172a" }}>
                            {s.name}
                          </span>
                          <span style={{ fontSize: "0.72rem", backgroundColor: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontWeight: 500, color: "#475569" }}>
                            Art #{s.sku}
                          </span>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              backgroundColor: s.healthStatus === "DEAD" ? "#fee2e2" : s.healthStatus === "SLOW" ? "#ffedd5" : "#ecfdf5",
                              color: s.healthStatus === "DEAD" ? "#dc2626" : s.healthStatus === "SLOW" ? "#ea580c" : "#059669"
                            }}
                          >
                            {s.healthStatus === "DEAD" ? "🔴 Dead Stock" : s.healthStatus === "SLOW" ? "🟡 Slow Moving" : "🟢 Healthy"}
                          </span>
                        </div>
                        <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                          Category: <strong>{s.category}</strong> • Last Movement: {s.daysInStock} days ago • Sold last 60 days: <strong>{s.unitsSoldLast60Days} pcs</strong>
                        </p>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>Locked Capital</span>
                        <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                          ₹{s.lockedCapital.toLocaleString("en-IN")}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "#64748b" }}> ({s.stockQuantity} pcs in stock)</span>
                      </div>
                    </div>

                    {/* AI Strategy & Pricing Pill */}
                    <div style={{ backgroundColor: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", fontSize: "0.78rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#334155" }}>
                        <Sparkles size={14} color="#4f46e5" />
                        <span>{s.aiStrategy}</span>
                      </div>

                      {s.recommendedDiscountPercent > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ color: "#64748b" }}>Clearance Rate:</span>
                          <strong style={{ color: "#059669", fontSize: "0.9rem", fontVariantNumeric: "tabular-nums" }}>₹{s.recommendedClearancePrice}</strong>
                          <span style={{ fontSize: "0.68rem", backgroundColor: "#dcfce7", color: "#166534", padding: "1px 5px", borderRadius: "4px", fontWeight: 600 }}>
                            {s.recommendedDiscountPercent}% OFF
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Matched Buyers Preview */}
                    {s.matchedBuyers && s.matchedBuyers.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontSize: "0.75rem", color: "#475569" }}>
                        <span style={{ fontWeight: 600, color: "#64748b" }}>🎯 Target Buyers:</span>
                        {s.matchedBuyers.map(b => (
                          <span key={b.customerId} style={{ padding: "2px 7px", borderRadius: "4px", backgroundColor: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", fontSize: "0.72rem" }}>
                            {b.businessName}
                          </span>
                        ))}
                      </div>
                    )}

                    {isTaskThis && (
                      <div style={{ padding: "6px 10px", borderRadius: "6px", backgroundColor: "#f0fdf4", color: "#16a34a", fontSize: "0.75rem", fontWeight: 500 }}>
                        {taskStatus?.text}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", paddingTop: "4px" }}>
                      
                      {/* Assign Task */}
                      <button
                        type="button"
                        onClick={() => handleCreateClearanceTask(s)}
                        disabled={creatingTaskId === s.productId}
                        style={{
                          padding: "5px 11px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#ffffff",
                          color: "#475569",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          cursor: creatingTaskId === s.productId ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <ClipboardList size={13} />
                        <span>{creatingTaskId === s.productId ? "Assigning..." : "Assign Push Task"}</span>
                      </button>

                      {/* Copy Promo */}
                      <button
                        type="button"
                        onClick={() => handleCopyText(s.productId, s.whatsappCampaignText)}
                        style={{
                          padding: "5px 11px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#ffffff",
                          color: "#334155",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        {copiedId === s.productId ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                        <span>{copiedId === s.productId ? "Copied" : "Copy Promo"}</span>
                      </button>

                      {/* Send WhatsApp Promo */}
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppPromo(s.whatsappCampaignText)}
                        style={{
                          padding: "5px 13px",
                          borderRadius: "6px",
                          border: "none",
                          backgroundColor: "#25D366",
                          color: "#ffffff",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px"
                        }}
                      >
                        <MessageSquare size={13} />
                        <span>Send WhatsApp Deal</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
              No items matching filter.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
