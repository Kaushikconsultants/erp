"use client";

import React, { useState } from "react";
import {
  Blocks,
  Truck,
  ShoppingBag,
  MessageSquare,
  CreditCard,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Sparkles,
  Zap,
  ExternalLink,
  ShieldCheck,
  Check
} from "lucide-react";
import IntegrationConfigModal from "./IntegrationConfigModal";
import {
  toggleIntegrationStatus,
  triggerIntegrationSync
} from "@/app/actions/integrationActions";
import "./integrations.css";

interface IntegrationsHubClientProps {
  initialIntegrations: any[];
  initialStats: {
    total: number;
    connected: number;
    shippingConnected: number;
    ecommerceConnected: number;
    recentLogsCount: number;
  };
}

export default function IntegrationsHubClient({
  initialIntegrations,
  initialStats
}: IntegrationsHubClientProps) {
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [stats, setStats] = useState(initialStats);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Selected integration for configuration modal
  const [activeIntegration, setActiveIntegration] = useState<any | null>(null);

  // Syncing state tracker per provider
  const [syncingMap, setSyncingMap] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggle = async (providerId: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;
    // Optimistic UI update
    setIntegrations(prev =>
      prev.map(item => (item.id === providerId ? { ...item, isEnabled: newEnabled } : item))
    );

    const res = await toggleIntegrationStatus(providerId, newEnabled);
    if (!res.success) {
      // Revert on error
      setIntegrations(prev =>
        prev.map(item => (item.id === providerId ? { ...item, isEnabled: currentEnabled } : item))
      );
      showToast("error", res.error || "Failed to update status");
    } else {
      showToast("success", `${providerId.toUpperCase()} is now ${newEnabled ? "Active" : "Disabled"}`);
      // Update stats
      setStats(prev => ({
        ...prev,
        connected: prev.connected + (newEnabled ? 1 : -1)
      }));
    }
  };

  const handleQuickSync = async (e: React.MouseEvent, providerId: string) => {
    e.stopPropagation();
    setSyncingMap(prev => ({ ...prev, [providerId]: true }));
    try {
      const res = await triggerIntegrationSync(providerId, "FULL_SYNC");
      if (res.success) {
        showToast("success", res.message || "Sync completed successfully");
        setIntegrations(prev =>
          prev.map(item =>
            item.id === providerId
              ? {
                  ...item,
                  lastSyncAt: res.lastSyncAt || new Date().toISOString(),
                  lastSyncStatus: "SUCCESS",
                  lastSyncMessage: res.message
                }
              : item
          )
        );
      } else {
        showToast("error", res.error || "Sync failed");
      }
    } catch (err: any) {
      showToast("error", err.message || "Error during sync");
    } finally {
      setSyncingMap(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const refreshData = () => {
    window.location.reload();
  };

  // Filter integrations
  const filteredIntegrations = integrations.filter(item => {
    // Category filter
    if (selectedCategory !== "ALL" && item.category !== selectedCategory) {
      return false;
    }
    // Status filter
    if (statusFilter === "CONNECTED" && (!item.isEnabled || !item.isConfigured)) return false;
    if (statusFilter === "DISCONNECTED" && item.isEnabled && item.isConfigured) return false;
    if (statusFilter === "SANDBOX" && item.environment !== "sandbox") return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchTagline = item.tagline.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      if (!matchName && !matchTagline && !matchDesc && !matchCat) return false;
    }

    return true;
  });

  const categoryCounts = {
    ALL: integrations.length,
    SHIPPING: integrations.filter(i => i.category === "SHIPPING").length,
    ECOMMERCE: integrations.filter(i => i.category === "ECOMMERCE").length,
    MESSAGING: integrations.filter(i => i.category === "MESSAGING").length,
    PAYMENT: integrations.filter(i => i.category === "PAYMENT").length
  };

  return (
    <div className="integrations-container">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 99999,
            background: toastMessage.type === "success" ? "#065f46" : "#991b1b",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "10px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13.5px",
            fontWeight: 600,
            animation: "fadeIn 0.2s ease"
          }}
        >
          {toastMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="integrations-header">
        <div>
          <h1 className="integrations-title">
            <Blocks size={28} color="#7c3aed" /> Integrations & APIs Hub
          </h1>
          <p className="integrations-subtitle">
            Connect multi-carrier shipping aggregators, sync e-commerce storefronts, and automate real-time order webhooks.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="sync-now-btn"
            onClick={refreshData}
            title="Refresh integration status"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Summary */}
      <div className="integrations-stats-grid">
        <div className="integration-stat-card">
          <div className="stat-icon-wrapper" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
            <Blocks size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.connected} <span style={{ fontSize: "14px", fontWeight: 500, color: "#94a3b8" }}>/ {stats.total}</span></div>
            <div className="stat-label">Connected Integrations</div>
          </div>
        </div>

        <div className="integration-stat-card">
          <div className="stat-icon-wrapper" style={{ background: "#ecfdf5", color: "#059669" }}>
            <Truck size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.shippingConnected} <span style={{ fontSize: "14px", fontWeight: 500, color: "#94a3b8" }}>/ 4</span></div>
            <div className="stat-label">Shipping Channels Active</div>
          </div>
        </div>

        <div className="integration-stat-card">
          <div className="stat-icon-wrapper" style={{ background: "#eff6ff", color: "#2563eb" }}>
            <ShoppingBag size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.ecommerceConnected} <span style={{ fontSize: "14px", fontWeight: 500, color: "#94a3b8" }}>/ 3</span></div>
            <div className="stat-label">E-Commerce Stores Synced</div>
          </div>
        </div>

        <div className="integration-stat-card">
          <div className="stat-icon-wrapper" style={{ background: "#fffbeb", color: "#d97706" }}>
            <Zap size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.recentLogsCount}</div>
            <div className="stat-label">24h Webhook & Sync Events</div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="integrations-controls">
        
        {/* Category Tabs */}
        <div className="category-tabs">
          <button
            className={`category-tab-btn ${selectedCategory === "ALL" ? "active" : ""}`}
            onClick={() => setSelectedCategory("ALL")}
          >
            All Platforms <span className="tab-badge">{categoryCounts.ALL}</span>
          </button>
          <button
            className={`category-tab-btn ${selectedCategory === "SHIPPING" ? "active" : ""}`}
            onClick={() => setSelectedCategory("SHIPPING")}
          >
            <Truck size={15} /> Shipping Aggregators <span className="tab-badge">{categoryCounts.SHIPPING}</span>
          </button>
          <button
            className={`category-tab-btn ${selectedCategory === "ECOMMERCE" ? "active" : ""}`}
            onClick={() => setSelectedCategory("ECOMMERCE")}
          >
            <ShoppingBag size={15} /> E-Commerce Stores <span className="tab-badge">{categoryCounts.ECOMMERCE}</span>
          </button>
          <button
            className={`category-tab-btn ${selectedCategory === "MESSAGING" ? "active" : ""}`}
            onClick={() => setSelectedCategory("MESSAGING")}
          >
            <MessageSquare size={15} /> Messaging & CRM <span className="tab-badge">{categoryCounts.MESSAGING}</span>
          </button>
          <button
            className={`category-tab-btn ${selectedCategory === "PAYMENT" ? "active" : ""}`}
            onClick={() => setSelectedCategory("PAYMENT")}
          >
            <CreditCard size={15} /> Payments & Finance <span className="tab-badge">{categoryCounts.PAYMENT}</span>
          </button>
        </div>

        {/* Search & Status Filter */}
        <div className="search-filter-box">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search Shiprocket, Shopify, WooCommerce..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: "150px", height: "36px", padding: "6px 10px", fontSize: "12.5px" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="CONNECTED">Connected Only</option>
            <option value="DISCONNECTED">Disconnected</option>
            <option value="SANDBOX">Sandbox Mode</option>
          </select>
        </div>

      </div>

      {/* Integrations Grid */}
      {filteredIntegrations.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
          <Blocks size={36} color="#94a3b8" style={{ margin: "0 auto 12px auto", display: "block" }} />
          <h3 style={{ margin: "0 0 6px 0", color: "#1e293b" }}>No integrations match your filter</h3>
          <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>Try clearing your search query or selecting "All Platforms".</p>
        </div>
      ) : (
        <div className="integrations-grid">
          {filteredIntegrations.map((item) => {
            const isConnected = item.isEnabled && item.isConfigured;
            const isSandbox = item.environment === "sandbox";
            const isSyncing = !!syncingMap[item.id];

            return (
              <div
                key={item.id}
                className="integration-card"
                style={{ "--brand-color": item.brandColor } as React.CSSProperties}
              >
                <div>
                  
                  {/* Card Header */}
                  <div className="card-header-top">
                    <div className="brand-icon-box" style={{ borderColor: `${item.brandColor}30` }}>
                      {item.logo}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {isConnected ? (
                        <span className={`status-pill ${isSandbox ? "sandbox" : "connected"}`}>
                          <span className="status-dot"></span>
                          {isSandbox ? "Sandbox" : "Connected"}
                        </span>
                      ) : item.isConfigured ? (
                        <span className="status-pill disconnected">
                          <span className="status-dot"></span>
                          Paused
                        </span>
                      ) : (
                        <span className="status-pill disconnected">
                          <span className="status-dot"></span>
                          Not Connected
                        </span>
                      )}

                      {/* Quick Switch */}
                      <label className="switch-label" title={item.isEnabled ? "Disable Integration" : "Enable Integration"} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={item.isEnabled}
                          onChange={() => handleToggle(item.id, item.isEnabled)}
                        />
                        <span className="switch-slider"></span>
                      </label>
                    </div>
                  </div>

                  {/* Title & Tagline */}
                  <div className="card-title-area">
                    <div className="card-title-row">
                      <h3 className="card-provider-name">{item.name}</h3>
                      {item.badge && (
                        <span className="card-badge" style={{ background: `${item.brandColor}15`, color: item.brandColor }}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="card-tagline">{item.tagline}</div>
                    <p className="card-description">{item.description}</p>
                  </div>

                  {/* Features List */}
                  <div className="card-feature-list">
                    {item.features.slice(0, 3).map((f: string, idx: number) => (
                      <span key={idx} className="feature-tag">
                        <Check size={11} color="#10b981" /> {f}
                      </span>
                    ))}
                  </div>

                </div>

                <div>
                  {/* Meta Row */}
                  <div className="card-meta-row">
                    <div>
                      {item.lastSyncAt ? (
                        <span>Last sync: <strong>{new Date(item.lastSyncAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong></span>
                      ) : (
                        <span>Last sync: <em>Never</em></span>
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      {item.category === "SHIPPING" ? "Auto AWB" : "REST Webhook"}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="card-actions-row">
                    <button
                      type="button"
                      className="configure-btn"
                      onClick={() => setActiveIntegration(item)}
                    >
                      <Sliders size={14} /> Configure & Keys
                    </button>

                    {item.isConfigured && (
                      <button
                        type="button"
                        className="sync-now-btn"
                        onClick={(e) => handleQuickSync(e, item.id)}
                        disabled={isSyncing || !item.isEnabled}
                        title="Trigger on-demand sync"
                      >
                        <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
                        {isSyncing ? "Syncing..." : "Sync"}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Configuration Modal */}
      {activeIntegration && (
        <IntegrationConfigModal
          integration={activeIntegration}
          onClose={() => setActiveIntegration(null)}
          onSaved={() => {
            refreshData();
          }}
        />
      )}

    </div>
  );
}
