"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Key,
  Sliders,
  Webhook,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Zap,
  ShieldCheck,
  Radio,
  FileText
} from "lucide-react";
import {
  saveIntegrationConfig,
  testIntegrationConnection,
  triggerIntegrationSync,
  getIntegrationLogs,
  generateWebhookSecret
} from "@/app/actions/integrationActions";

interface IntegrationConfigModalProps {
  integration: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function IntegrationConfigModal({
  integration,
  onClose,
  onSaved
}: IntegrationConfigModalProps) {
  const [activeTab, setActiveTab] = useState<"credentials" | "settings" | "webhooks" | "test" | "logs">("credentials");
  
  // State for form
  const [environment, setEnvironment] = useState<"sandbox" | "production">(integration.environment || "production");
  const [credentials, setCredentials] = useState<Record<string, any>>(integration.savedCredentials || {});
  const [settings, setSettings] = useState<Record<string, any>>(integration.savedSettings || {});
  const [isEnabled, setIsEnabled] = useState<boolean>(integration.isEnabled ?? true);

  // UI helpers
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Action states
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; latencyMs?: number; error?: string } | null>(null);
  
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message?: string } | null>(null);

  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Initialize defaults if empty
  useEffect(() => {
    const initialCreds = { ...(integration.savedCredentials || {}) };
    const initialSettings = { ...(integration.savedSettings || {}) };

    integration.fields.forEach((f: any) => {
      if (initialCreds[f.key] === undefined && f.defaultValue !== undefined) {
        initialCreds[f.key] = f.defaultValue;
      }
    });

    setCredentials(initialCreds);
    setSettings(initialSettings);
  }, [integration]);

  // Load logs on tab switch
  useEffect(() => {
    if (activeTab === "logs") {
      setLoadingLogs(true);
      getIntegrationLogs(integration.id)
        .then(res => {
          if (res.success) setLogs(res.logs);
        })
        .finally(() => setLoadingLogs(false));
    }
  }, [activeTab, integration.id]);

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPasswordMap(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveIntegrationConfig(integration.id, {
        environment,
        credentials,
        settings,
        isEnabled
      });

      if (res.success) {
        onSaved();
        onClose();
      } else {
        alert(res.error || "Failed to save configuration");
      }
    } catch (e: any) {
      alert(e.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testIntegrationConnection(integration.id, credentials, environment);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({
        success: false,
        error: e.message || "Test connection failed"
      });
    } finally {
      setTesting(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await triggerIntegrationSync(integration.id, "FULL_SYNC");
      setSyncResult(res);
      if (res.success) {
        onSaved();
      }
    } catch (e: any) {
      setSyncResult({ success: false, message: e.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleRegenerateSecret = async () => {
    if (!confirm("Regenerating the webhook secret will require updating it in your external platform. Continue?")) return;
    const res = await generateWebhookSecret(integration.id);
    if (res.success) {
      onSaved();
    }
  };

  // Construct absolute webhook URL
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "https://app.espon.in";
  const absoluteWebhookUrl = `${currentOrigin}${integration.webhookUrl || `/api/webhooks/integrations/${integration.id}`}`;

  return (
    <div 
      className="config-modal-overlay" 
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="config-modal-panel" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header-section">
          <div className="modal-header-left">
            <div className="modal-brand-icon" style={{ borderColor: `${integration.brandColor}40` }}>
              {integration.logo}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 className="modal-title">{integration.name}</h2>
                {integration.badge && (
                  <span className="card-badge" style={{ background: `${integration.brandColor}15`, color: integration.brandColor }}>
                    {integration.badge}
                  </span>
                )}
              </div>
              <p className="modal-subtitle">{integration.tagline}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="modal-nav-tabs">
          <button
            className={`modal-nav-tab ${activeTab === "credentials" ? "active" : ""}`}
            onClick={() => setActiveTab("credentials")}
          >
            <Key size={16} />
            <span>API Credentials</span>
          </button>
          <button
            className={`modal-nav-tab ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <Sliders size={16} />
            <span>Automation & Sync</span>
          </button>
          {integration.supportsWebhooks !== false && (
            <button
              className={`modal-nav-tab ${activeTab === "webhooks" ? "active" : ""}`}
              onClick={() => setActiveTab("webhooks")}
            >
              <Webhook size={16} />
              <span>Webhooks</span>
            </button>
          )}
          <button
            className={`modal-nav-tab ${activeTab === "test" ? "active" : ""}`}
            onClick={() => setActiveTab("test")}
          >
            <Zap size={16} />
            <span>Test Connection</span>
          </button>
          <button
            className={`modal-nav-tab ${activeTab === "logs" ? "active" : ""}`}
            onClick={() => setActiveTab("logs")}
          >
            <Activity size={16} />
            <span>Activity Logs</span>
          </button>
        </div>

        {/* Body Content based on active tab */}
        <div className="modal-body-scrollable">
          
          {/* TAB 1: CREDENTIALS */}
          {activeTab === "credentials" && (
            <div>
              {/* Environment Switcher */}
              <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "13px", color: "#1e293b" }}>Environment Mode</div>
                  <div style={{ fontSize: "11.5px", color: "#64748b" }}>Choose between Sandbox (Testing) or Live Production API</div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setEnvironment("production")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: environment === "production" ? "#10b981" : "#cbd5e1",
                      background: environment === "production" ? "#ecfdf5" : "#ffffff",
                      color: environment === "production" ? "#059669" : "#64748b"
                    }}
                  >
                    ● Production (Live)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnvironment("sandbox")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: environment === "sandbox" ? "#f59e0b" : "#cbd5e1",
                      background: environment === "sandbox" ? "#fffbeb" : "#ffffff",
                      color: environment === "sandbox" ? "#d97706" : "#64748b"
                    }}
                  >
                    ● Sandbox (Test)
                  </button>
                </div>
              </div>

              {/* Dynamic Field Inputs */}
              {integration.fields.map((field: any) => {
                const isPassword = field.type === "password";
                const isVisible = showPasswordMap[field.key];
                const value = credentials[field.key] || "";

                if (field.type === "checkbox") {
                  return (
                    <label key={field.key} className="form-checkbox-row">
                      <input
                        type="checkbox"
                        checked={!!credentials[field.key]}
                        onChange={(e) => setCredentials({ ...credentials, [field.key]: e.target.checked })}
                      />
                      <div className="checkbox-text">
                        <div className="cb-title">{field.label}</div>
                        {field.description && <div className="cb-desc">{field.description}</div>}
                      </div>
                    </label>
                  );
                }

                if (field.type === "select") {
                  return (
                    <div key={field.key} className="form-group-item">
                      <label className="form-label">{field.label}</label>
                      <select
                        className="form-select"
                        value={value}
                        onChange={(e) => setCredentials({ ...credentials, [field.key]: e.target.value })}
                      >
                        {field.options?.map((opt: any) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {field.description && <div className="form-label-desc">{field.description}</div>}
                    </div>
                  );
                }

                return (
                  <div key={field.key} className="form-group-item">
                    <label className="form-label">
                      {field.label} {field.required && <span style={{ color: "#ef4444" }}>*</span>}
                    </label>
                    <div className="input-with-action">
                      <input
                        type={isPassword && !isVisible ? "password" : "text"}
                        placeholder={field.placeholder || ""}
                        value={value}
                        onChange={(e) => setCredentials({ ...credentials, [field.key]: e.target.value })}
                      />
                      {isPassword && (
                        <button
                          type="button"
                          className="input-icon-btn"
                          onClick={() => togglePasswordVisibility(field.key)}
                          title={isVisible ? "Hide" : "Show"}
                        >
                          {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      )}
                    </div>
                    {field.description && <div className="form-label-desc">{field.description}</div>}
                  </div>
                );
              })}

              {/* Status Toggle & Documentation Link */}
              <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <label className="switch-label">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => setIsEnabled(e.target.checked)}
                    />
                    <span className="switch-slider"></span>
                  </label>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                    Enable this integration
                  </span>
                </div>

                <a
                  href={integration.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: "12px", color: "#4f46e5", display: "flex", alignItems: "center", gap: "4px", textDecoration: "none", fontWeight: 600 }}
                >
                  Official API Docs <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: AUTOMATION & SETTINGS */}
          {activeTab === "settings" && (
            <div>
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                  Automated Synchronization Rules
                </h4>
                <p style={{ margin: 0, fontSize: "12.5px", color: "#64748b" }}>
                  Configure how this integration triggers actions in your ERP and vice versa.
                </p>
              </div>

              {integration.category === "SHIPPING" && (
                <div>
                  <label className="form-checkbox-row">
                    <input
                      type="checkbox"
                      checked={settings.autoGenerateAwb !== false}
                      onChange={(e) => setSettings({ ...settings, autoGenerateAwb: e.target.checked })}
                    />
                    <div className="checkbox-text">
                      <div className="cb-title">Auto-Generate Waybill (AWB) upon Dispatch Approval</div>
                      <div className="cb-desc">When a warehouse manager approves a dispatch slip, automatically request tracking AWB and courier manifest.</div>
                    </div>
                  </label>

                  <label className="form-checkbox-row">
                    <input
                      type="checkbox"
                      checked={settings.sendWhatsAppTracking !== false}
                      onChange={(e) => setSettings({ ...settings, sendWhatsAppTracking: e.target.checked })}
                    />
                    <div className="checkbox-text">
                      <div className="cb-title">Send Instant WhatsApp Tracking Link to Customer</div>
                      <div className="cb-desc">Trigger automated message with live courier GPS tracking URL directly to customer's registered WhatsApp.</div>
                    </div>
                  </label>

                  <label className="form-checkbox-row">
                    <input
                      type="checkbox"
                      checked={settings.autoNDRAlerts !== false}
                      onChange={(e) => setSettings({ ...settings, autoNDRAlerts: e.target.checked })}
                    />
                    <div className="checkbox-text">
                      <div className="cb-title">Non-Delivery (NDR) Alert Escalation</div>
                      <div className="cb-desc">Notify sales executive when a delivery attempt fails so they can immediately contact the client.</div>
                    </div>
                  </label>
                </div>
              )}

              {integration.category === "ECOMMERCE" && (
                <div>
                  <label className="form-checkbox-row">
                    <input
                      type="checkbox"
                      checked={settings.autoImportOrders !== false}
                      onChange={(e) => setSettings({ ...settings, autoImportOrders: e.target.checked })}
                    />
                    <div className="checkbox-text">
                      <div className="cb-title">Automatic Order Ingestion</div>
                      <div className="cb-desc">Immediately create confirmed sales orders in ERP as soon as a customer checks out on your online store.</div>
                    </div>
                  </label>

                  <label className="form-checkbox-row">
                    <input
                      type="checkbox"
                      checked={settings.twoWayStockSync !== false}
                      onChange={(e) => setSettings({ ...settings, twoWayStockSync: e.target.checked })}
                    />
                    <div className="checkbox-text">
                      <div className="cb-title">Two-Way Inventory Sync (Prevent Stockouts & Overselling)</div>
                      <div className="cb-desc">Synchronize SKU stock levels across offline wholesale orders and online store inventory.</div>
                    </div>
                  </label>

                  <label className="form-checkbox-row">
                    <input
                      type="checkbox"
                      checked={settings.pushFulfillmentTracking !== false}
                      onChange={(e) => setSettings({ ...settings, pushFulfillmentTracking: e.target.checked })}
                    />
                    <div className="checkbox-text">
                      <div className="cb-title">Write-back Courier Tracking to Storefront</div>
                      <div className="cb-desc">Mark orders as 'Fulfilled' / 'Dispatched' on your storefront with the exact tracking URL when packed here.</div>
                    </div>
                  </label>
                </div>
              )}

              {/* Supported Features Checklist */}
              <div style={{ marginTop: "24px", background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#1e293b", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <ShieldCheck size={16} color="#059669" /> Platform Capabilities Enabled
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {integration.features.map((feat: string, idx: number) => (
                    <div key={idx} style={{ fontSize: "11.5px", color: "#475569", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Check size={13} color="#10b981" /> {feat}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WEBHOOKS */}
          {activeTab === "webhooks" && (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                  Real-time Webhook Receiver
                </h4>
                <p style={{ margin: 0, fontSize: "12.5px", color: "#64748b" }}>
                  Paste this Webhook URL in your {integration.name} developer portal or webhook settings to receive instant updates.
                </p>
              </div>

              {/* Webhook Endpoint */}
              <div className="webhook-info-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>Incoming Webhook URL</span>
                  <span style={{ fontSize: "11px", color: "#059669", fontWeight: 700, background: "#ecfdf5", padding: "2px 6px", borderRadius: "4px" }}>
                    HTTP POST Active
                  </span>
                </div>
                <div className="code-display-box">
                  <span>{absoluteWebhookUrl}</span>
                  <button
                    type="button"
                    className="code-copy-btn"
                    onClick={() => handleCopy(absoluteWebhookUrl, "webhookUrl")}
                  >
                    {copiedKey === "webhookUrl" ? <Check size={12} /> : <Copy size={12} />}
                    {copiedKey === "webhookUrl" ? "Copied" : "Copy URL"}
                  </button>
                </div>
              </div>

              {/* Webhook Signing Secret */}
              <div className="webhook-info-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>Webhook Signing Secret / HMAC</span>
                  <button
                    type="button"
                    onClick={handleRegenerateSecret}
                    style={{ background: "none", border: "none", color: "#4f46e5", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Regenerate Secret
                  </button>
                </div>
                <div className="code-display-box" style={{ color: "#a5f3fc" }}>
                  <span>{integration.webhookSecret || "whsec_live_9a8b7c6d5e4f3a2b1"}</span>
                  <button
                    type="button"
                    className="code-copy-btn"
                    onClick={() => handleCopy(integration.webhookSecret || "whsec_live_9a8b7c6d5e4f3a2b1", "secret")}
                  >
                    {copiedKey === "secret" ? <Check size={12} /> : <Copy size={12} />}
                    {copiedKey === "secret" ? "Copied" : "Copy Secret"}
                  </button>
                </div>
              </div>

              {/* Supported Events List */}
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b", marginBottom: "8px" }}>
                  Supported Webhook Event Topics:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {integration.supportedEvents?.map((ev: string) => (
                    <span
                      key={ev}
                      style={{
                        fontSize: "11px",
                        fontFamily: "monospace",
                        background: "#f1f5f9",
                        color: "#334155",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0"
                      }}
                    >
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TEST CONNECTION */}
          {activeTab === "test" && (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                  Live API Diagnostics & Handshake
                </h4>
                <p style={{ margin: 0, fontSize: "12.5px", color: "#64748b" }}>
                  Perform an instant test to check if your credentials can authenticate with {integration.name}'s servers.
                </p>
              </div>

              <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "14px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>{integration.logo}</div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                  Validate Connection with {integration.name}
                </div>
                <div style={{ fontSize: "12.5px", color: "#64748b", maxWidth: "460px", margin: "6px auto 16px auto" }}>
                  This will test API authentication, ping the endpoint, and check response latency in {environment.toUpperCase()} mode.
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleTestConnection}
                  disabled={testing}
                  style={{ margin: "0 auto", padding: "10px 24px", fontSize: "13.5px" }}
                >
                  {testing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> Testing Connection...
                    </>
                  ) : (
                    <>
                      <Zap size={16} /> Test Live Connection Now
                    </>
                  )}
                </button>
              </div>

              {/* Diagnostic Test Result Box */}
              {testResult && (
                <div className={`test-diagnostic-box ${testResult.success ? "success" : "error"}`}>
                  <div className="diagnostic-header">
                    {testResult.success ? (
                      <>
                        <CheckCircle2 size={18} /> API Handshake Succeeded!
                      </>
                    ) : (
                      <>
                        <AlertCircle size={18} /> Connection Failed
                      </>
                    )}
                    {testResult.latencyMs !== undefined && (
                      <span className="diagnostic-latency">{testResult.latencyMs} ms</span>
                    )}
                  </div>
                  <div style={{ fontSize: "12.5px", lineHeight: "1.5" }}>
                    {testResult.message || testResult.error}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ACTIVITY & SYNC LOGS */}
          {activeTab === "logs" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h4 style={{ margin: "0 0 2px 0", fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                    Recent Sync & Webhook History
                  </h4>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                    Audit trail of order imports, tracking updates, and webhook events.
                  </p>
                </div>

                <button
                  type="button"
                  className="sync-now-btn"
                  onClick={handleManualSync}
                  disabled={syncing}
                >
                  <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
                  {syncing ? "Syncing..." : "Sync Now"}
                </button>
              </div>

              {syncResult && (
                <div style={{ padding: "10px 14px", borderRadius: "8px", background: syncResult.success ? "#ecfdf5" : "#fef2f2", border: "1px solid", borderColor: syncResult.success ? "#a7f3d0" : "#fecaca", color: syncResult.success ? "#065f46" : "#991b1b", fontSize: "12px", marginBottom: "14px" }}>
                  {syncResult.message}
                </div>
              )}

              {loadingLogs ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                  <RefreshCw size={18} className="animate-spin" style={{ margin: "0 auto 8px auto", display: "block" }} />
                  Loading activity logs...
                </div>
              ) : logs.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <FileText size={28} color="#94a3b8" style={{ margin: "0 auto 8px auto", display: "block" }} />
                  <div style={{ fontWeight: 600, color: "#334155", fontSize: "13px" }}>No activity logs yet</div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                    Logs will appear here when webhooks arrive or when you trigger an automated sync.
                  </div>
                </div>
              ) : (
                <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Event / Type</th>
                        <th>Status</th>
                        <th>Processed</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id}>
                          <td style={{ whiteSpace: "nowrap", color: "#64748b" }}>
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </td>
                          <td style={{ fontWeight: 600, fontFamily: "monospace", fontSize: "11px" }}>
                            {log.syncType}
                          </td>
                          <td>
                            <span className={`log-status-badge ${log.status === "SUCCESS" ? "success" : "failed"}`}>
                              {log.status}
                            </span>
                          </td>
                          <td>{log.recordsProcessed || 0}</td>
                          <td style={{ fontSize: "11.5px", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {log.details || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="modal-footer-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
