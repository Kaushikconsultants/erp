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
  User,
  Package,
  TrendingUp,
  Store
} from "lucide-react";
import { getDeadStockLiquidationInsights, createClearanceTask, DeadStockReport, DeadStockSKU } from "@/app/actions/aiDeadStockActions";
import "./DeadStockInsightsModal.css";

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
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Mobile Drag Indicator Handle */}
        <div className="ds-modal-handle-bar" />

        {/* Header */}
        <div className="ds-modal-header">
          <div className="ds-header-brand">
            <div className="ds-brand-icon-box">
              <Flame size={22} />
            </div>
            <div className="ds-header-titles">
              <span className="ds-ai-pill-tag">
                <span className="ds-ai-pulse-dot" />
                AI Liquidation Engine
              </span>
              <h3 className="ds-modal-title">Dead Stock & Liquidation</h3>
              <p className="ds-modal-subtitle">
                Identify idle working capital, match relevant B2B wholesale buyers, and trigger flash clearance campaigns.
              </p>
              <span className="ds-mobile-status-pill" style={{ display: "none" }}>
                <Sparkles size={11} color="#059669" />
                Live Inventory Analytics ({report?.skus.length || 0} SKUs)
              </span>
            </div>
          </div>

          <div className="ds-header-actions">
            <button
              type="button"
              className="ds-refresh-btn"
              onClick={loadData}
              disabled={loading}
              title="Refresh Analytics"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="ds-close-btn"
              onClick={onClose}
              title="Close modal"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* KPI Banner: Symmetrical 2x2 on Mobile, 4-col on Desktop */}
        {report && (
          <div className="ds-kpi-grid">
            <div className="ds-kpi-card ds-kpi-card-dead">
              <div className="ds-kpi-label-row">
                <Flame size={13} />
                <span>Locked Dead Stock</span>
              </div>
              <span className="ds-kpi-val">
                ₹{report.totalLockedCapitalInDeadStock.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="ds-kpi-card ds-kpi-card-slow">
              <div className="ds-kpi-label-row">
                <Clock size={13} />
                <span>Slow Moving</span>
              </div>
              <span className="ds-kpi-val">
                {report.slowMovingCount} Articles
              </span>
            </div>

            <div className="ds-kpi-card ds-kpi-card-healthy">
              <div className="ds-kpi-label-row">
                <CheckCircle2 size={13} />
                <span>Healthy Velocity</span>
              </div>
              <span className="ds-kpi-val">
                {report.healthyCount} Articles
              </span>
            </div>

            <div className="ds-kpi-card ds-kpi-card-total">
              <div className="ds-kpi-label-row">
                <Package size={13} />
                <span>Total Valuation</span>
              </div>
              <span className="ds-kpi-val">
                ₹{report.totalLockedCapitalOverall.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        )}

        {/* Filter Controls & Lookbook Toolbar */}
        <div className="ds-filter-toolbar">
          <div className="ds-filter-tabs-wrapper">
            <button
              type="button"
              onClick={() => setFilterStatus("ALL")}
              className={`ds-filter-tab-btn ${filterStatus === "ALL" ? "active-all" : ""}`}
            >
              All Articles ({report?.skus.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("DEAD")}
              className={`ds-filter-tab-btn ${filterStatus === "DEAD" ? "active-dead" : ""}`}
            >
              🔴 Dead Stock ({report?.deadStockCount || 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("SLOW")}
              className={`ds-filter-tab-btn ${filterStatus === "SLOW" ? "active-slow" : ""}`}
            >
              🟡 Slow Moving ({report?.slowMovingCount || 0})
            </button>
          </div>

          <a
            href="/catalog"
            target="_blank"
            rel="noreferrer"
            className="ds-lookbook-link"
          >
            <ExternalLink size={13} />
            <span>Wholesale Lookbook ↗</span>
          </a>
        </div>

        {/* Scrollable Modal Body */}
        <div className="ds-modal-body">
          {loading ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 12px", color: "#4f46e5" }} />
              <p style={{ fontSize: "0.88rem", fontWeight: 500 }}>Analyzing warehouse stock aging and sales velocity...</p>
            </div>
          ) : filteredSkus.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredSkus.map(s => {
                const isTaskThis = taskStatus?.id === s.productId;
                const isDead = s.healthStatus === "DEAD";
                const isSlow = s.healthStatus === "SLOW";

                return (
                  <div
                    key={s.productId}
                    className={`ds-sku-card ${
                      isDead
                        ? "ds-sku-card-dead"
                        : isSlow
                        ? "ds-sku-card-slow"
                        : "ds-sku-card-healthy"
                    }`}
                  >
                    {/* Header */}
                    <div className="ds-card-header">
                      <div className="ds-card-header-left">
                        <div className="ds-card-title-row">
                          <span className="ds-card-sku-name">{s.name}</span>
                          <span className="ds-card-sku-badge">Art #{s.sku}</span>
                          {s.category && (
                            <span
                              style={{
                                fontSize: "0.72rem",
                                color: "#64748b",
                                fontWeight: 550,
                                backgroundColor: "#f8fafc",
                                padding: "2px 7px",
                                borderRadius: "5px",
                                border: "1px solid #e2e8f0"
                              }}
                            >
                              {s.category}
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`ds-card-status-pill ${
                          isDead
                            ? "ds-card-status-pill-dead"
                            : isSlow
                            ? "ds-card-status-pill-slow"
                            : "ds-card-status-pill-healthy"
                        }`}
                      >
                        {isDead ? "🔴 Dead Stock" : isSlow ? "🟡 Slow Moving" : "🟢 Healthy"}
                      </span>
                    </div>

                    {/* Telemetry Grid */}
                    <div className="ds-card-telemetry-grid">
                      <div className="ds-telemetry-item">
                        <span className="ds-telemetry-label">
                          <Package size={11} color="#64748b" /> In Stock
                        </span>
                        <span className="ds-telemetry-val">
                          {s.stockQuantity.toLocaleString("en-IN")} pcs
                        </span>
                      </div>

                      <div className="ds-telemetry-item">
                        <span className="ds-telemetry-label">
                          <Flame size={11} color="#dc2626" /> Locked Capital
                        </span>
                        <span className="ds-telemetry-val" style={{ color: "#dc2626" }}>
                          ₹{s.lockedCapital.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="ds-telemetry-item">
                        <span className="ds-telemetry-label">
                          <Clock size={11} color="#d97706" /> Idle Time
                        </span>
                        <span className="ds-telemetry-val">
                          {s.daysInStock} days
                        </span>
                      </div>

                      <div className="ds-telemetry-item">
                        <span className="ds-telemetry-label">
                          <TrendingUp size={11} color="#16a34a" /> Sold (60d)
                        </span>
                        <span className="ds-telemetry-val">
                          {s.unitsSoldLast60Days} pcs
                        </span>
                      </div>
                    </div>

                    {/* AI Strategy & Pricing Pill */}
                    <div className="ds-ai-strategy-card">
                      <div className="ds-ai-strategy-text-wrap">
                        <Sparkles size={16} color="#4f46e5" style={{ flexShrink: 0, marginTop: "2px" }} />
                        <span>{s.aiStrategy}</span>
                      </div>

                      {s.recommendedDiscountPercent > 0 && (
                        <div className="ds-ai-pricing-pill">
                          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Clearance Rate:</span>
                          <strong className="ds-ai-clearance-price">₹{s.recommendedClearancePrice}</strong>
                          <span className="ds-ai-discount-badge">
                            {s.recommendedDiscountPercent}% OFF
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Matched Buyers Preview */}
                    {s.matchedBuyers && s.matchedBuyers.length > 0 && (
                      <div className="ds-buyers-wrap">
                        <span className="ds-buyers-title">
                          <Store size={13} color="#475569" /> Target Buyers:
                        </span>
                        {s.matchedBuyers.map(b => (
                          <button
                            key={b.customerId}
                            type="button"
                            className="ds-buyer-chip"
                            onClick={() => {
                              if (b.mobile) {
                                window.open(`https://wa.me/${b.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(s.whatsappCampaignText)}`, "_blank");
                              } else {
                                handleSendWhatsAppPromo(s.whatsappCampaignText);
                              }
                            }}
                            title={b.mobile ? `Send WhatsApp deal directly to ${b.businessName} (${b.mobile})` : b.businessName}
                          >
                            <span>{b.businessName}</span>
                            {b.mobile && <MessageSquare size={11} color="#16a34a" />}
                          </button>
                        ))}
                      </div>
                    )}

                    {isTaskThis && (
                      <div
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          backgroundColor: "#f0fdf4",
                          color: "#16a34a",
                          fontSize: "0.76rem",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          border: "1px solid #bbf7d0"
                        }}
                      >
                        <CheckCircle2 size={14} />
                        {taskStatus?.text}
                      </div>
                    )}

                    {/* Action Bar (Mobile-first responsive layout) */}
                    <div className="ds-card-actions">
                      {/* Primary Action: Send WhatsApp Deal */}
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppPromo(s.whatsappCampaignText)}
                        className="ds-btn-action ds-btn-whatsapp"
                      >
                        <MessageSquare size={15} />
                        <span>Send WhatsApp Deal</span>
                      </button>

                      {/* Secondary Actions: 50/50 on mobile */}
                      <div className="ds-mobile-secondary-actions">
                        <button
                          type="button"
                          onClick={() => handleCreateClearanceTask(s)}
                          disabled={creatingTaskId === s.productId}
                          className="ds-btn-action"
                        >
                          <ClipboardList size={14} />
                          <span>{creatingTaskId === s.productId ? "Assigning..." : "Assign Push Task"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyText(s.productId, s.whatsappCampaignText)}
                          className="ds-btn-action"
                        >
                          {copiedId === s.productId ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                          <span>{copiedId === s.productId ? "Copied" : "Copy Promo"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: "50px 20px", textAlign: "center", color: "#94a3b8" }}>
              <Package size={32} style={{ margin: "0 auto 10px", color: "#cbd5e1" }} />
              <p style={{ fontSize: "0.88rem" }}>No inventory items matching this filter status.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
