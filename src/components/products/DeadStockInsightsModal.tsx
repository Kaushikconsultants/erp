"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  ArrowDownRight,
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  Package,
  Layers
} from "lucide-react";
import { getDeadStockLiquidationInsights, DeadStockReport, DeadStockSKU } from "@/app/actions/aiDeadStockActions";

interface Props {
  onClose: () => void;
}

export default function DeadStockInsightsModal({ onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<DeadStockReport | null>(null);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "DEAD" | "SLOW" | "HEALTHY">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await getDeadStockLiquidationInsights();
      if (res.success && res.data) {
        setReport(res.data);
      }
      setLoading(false);
    }
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
          maxWidth: "1140px",
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
                width: "38px",
                height: "38px",
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
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                AI Dead Stock & Inventory Liquidation Insights
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                Identifies locked working capital in slow-moving articles and generates 1-click clearance campaigns
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}>
            <X size={20} />
          </button>
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
              <span style={{ fontSize: "0.72rem", color: "#991b1b", fontWeight: 600, display: "block" }}>LOCKED IN DEAD STOCK</span>
              <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#dc2626" }}>
                ₹{report.totalLockedCapitalInDeadStock.toLocaleString("en-IN")}
              </span>
            </div>

            <div style={{ backgroundColor: "#fffbeb", padding: "10px 14px", borderRadius: "10px", border: "1px solid #fef3c7" }}>
              <span style={{ fontSize: "0.72rem", color: "#92400e", fontWeight: 600, display: "block" }}>SLOW MOVING ARTICLES</span>
              <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#d97706" }}>
                {report.slowMovingCount} Articles
              </span>
            </div>

            <div style={{ backgroundColor: "#f0fdf4", padding: "10px 14px", borderRadius: "10px", border: "1px solid #dcfce7" }}>
              <span style={{ fontSize: "0.72rem", color: "#166534", fontWeight: 600, display: "block" }}>HEALTHY VELOCITY</span>
              <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#16a34a" }}>
                {report.healthyCount} Articles
              </span>
            </div>

            <div style={{ backgroundColor: "#eff6ff", padding: "10px 14px", borderRadius: "10px", border: "1px solid #dbeafe" }}>
              <span style={{ fontSize: "0.72rem", color: "#1e40af", fontWeight: 600, display: "block" }}>TOTAL GODOWN VALUATION</span>
              <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#2563eb" }}>
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
                fontWeight: 600,
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
                fontWeight: 600,
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
                fontWeight: 600,
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
              fontWeight: 600
            }}
          >
            <ExternalLink size={13} /> Open Wholesale Lookbook
          </a>
        </div>

        {/* Table Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px" }}>
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
              <Sparkles size={28} className="animate-spin" style={{ margin: "0 auto 10px", color: "#4f46e5" }} />
              <p>Analyzing warehouse stock aging and sales velocity...</p>
            </div>
          ) : filteredSkus.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredSkus.map(s => (
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
                        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
                          {s.name}
                        </span>
                        <span style={{ fontSize: "0.72rem", backgroundColor: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontWeight: 600, color: "#475569" }}>
                          Art #{s.sku}
                        </span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
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
                      <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
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
                        <strong style={{ color: "#059669", fontSize: "0.9rem" }}>₹{s.recommendedClearancePrice}</strong>
                        <span style={{ fontSize: "0.68rem", backgroundColor: "#dcfce7", color: "#166534", padding: "1px 5px", borderRadius: "4px", fontWeight: 700 }}>
                          {s.recommendedDiscountPercent}% OFF
                        </span>
                      </div>
                    )}
                  </div>

                  {/* WhatsApp Action Bar */}
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => handleCopyText(s.productId, s.whatsappCampaignText)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#ffffff",
                        color: "#334155",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                    >
                      {copiedId === s.productId ? <Check size={13} /> : <Copy size={13} />}
                      {copiedId === s.productId ? "Copied" : "Copy Promo Text"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppPromo(s.whatsappCampaignText)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: "#25D366",
                        color: "#ffffff",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <MessageSquare size={14} /> Send WhatsApp Clearance Deal
                    </button>
                  </div>
                </div>
              ))}
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
