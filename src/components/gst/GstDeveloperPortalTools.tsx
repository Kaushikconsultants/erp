"use client";

import React, { useState } from "react";
import { 
  actionSearchTaxpayer, 
  actionSearchByPan, 
  actionTrackReturns, 
  actionSearchHsn, 
  actionVerifyIrn, 
  actionTrackEwb,
  actionVerifyCashfree,
  actionValidateTpStatus
} from "@/app/actions/gstPublicActions";
import { 
  ShieldCheck, 
  Search, 
  FileCheck2, 
  FileText, 
  Truck, 
  QrCode, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  Building2, 
  Calendar, 
  MapPin, 
  CreditCard,
  Hash,
  Sparkles,
  Key,
  Check
} from "lucide-react";

export default function GstDeveloperPortalTools() {
  const [activeTab, setActiveTab] = useState<'tpstatus' | 'cashfree' | 'taxpayer' | 'pan' | 'returns' | 'hsn' | 'einvoice' | 'ewaybill'>('tpstatus');

  // 0. Official GST TP Status API (/commonapi/v1.0/tpstatus) state
  const [tpStatusGstin, setTpStatusGstin] = useState("29AAICP2912R1ZR");
  const [tpStatusDomain, setTpStatusDomain] = useState("");
  const [tpStatusLoading, setTpStatusLoading] = useState(false);
  const [tpStatusData, setTpStatusData] = useState<any>(null);
  const [tpStatusError, setTpStatusError] = useState("");

  // 0b. Cashfree GSTIN Verification state
  const [cashfreeGstin, setCashfreeGstin] = useState("29AAACP2916R1ZR");
  const [cashfreeClientId, setCashfreeClientId] = useState("");
  const [cashfreeClientSecret, setCashfreeClientSecret] = useState("");
  const [cashfreeIsSandbox, setCashfreeIsSandbox] = useState(true);
  const [cashfreeLoading, setCashfreeLoading] = useState(false);
  const [cashfreeData, setCashfreeData] = useState<any>(null);
  const [cashfreeError, setCashfreeError] = useState("");

  // 1. Taxpayer state
  const [gstinInput, setGstinInput] = useState("06AAHCE7721Q1Z4");
  const [taxpayerLoading, setTaxpayerLoading] = useState(false);
  const [taxpayerData, setTaxpayerData] = useState<any>(null);
  const [taxpayerError, setTaxpayerError] = useState("");

  // 2. PAN state
  const [panInput, setPanInput] = useState("AAHCE7721Q");
  const [panLoading, setPanLoading] = useState(false);
  const [panData, setPanData] = useState<any>(null);
  const [panError, setPanError] = useState("");

  // 3. Returns track state
  const [returnGstin, setReturnGstin] = useState("06AAHCE7721Q1Z4");
  const [fyInput, setFyInput] = useState("2025-26");
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [returnsData, setReturnsData] = useState<any>(null);
  const [returnsError, setReturnsError] = useState("");

  // 4. HSN state
  const [hsnQuery, setHsnQuery] = useState("");
  const [hsnLoading, setHsnLoading] = useState(false);
  const [hsnResults, setHsnResults] = useState<any[]>([]);

  // 5. E-Invoice IRN state
  const [irnInput, setIrnInput] = useState("7b5e4a8f9c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f");
  const [irnLoading, setIrnLoading] = useState(false);
  const [irnData, setIrnData] = useState<any>(null);
  const [irnError, setIrnError] = useState("");

  // 6. E-Way bill state
  const [ewbInput, setEwbInput] = useState("121049281920");
  const [ewbLoading, setEwbLoading] = useState(false);
  const [ewbData, setEwbData] = useState<any>(null);
  const [ewbError, setEwbError] = useState("");

  // Handlers
  const handleSearchTaxpayer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTaxpayerLoading(true);
    setTaxpayerError("");
    setTaxpayerData(null);
    const res = await actionSearchTaxpayer(gstinInput) as any;
    setTaxpayerLoading(false);
    if (res && res.success && res.data) {
      setTaxpayerData(res.data);
    } else {
      setTaxpayerError(res?.error || "Taxpayer not found");
    }
  };

  const handleSearchPan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPanLoading(true);
    setPanError("");
    setPanData(null);
    const res = await actionSearchByPan(panInput) as any;
    setPanLoading(false);
    if (res && res.success && res.data) {
      setPanData(res.data);
    } else {
      setPanError(res?.error || "No GSTINs found for PAN");
    }
  };

  const handleTrackReturns = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setReturnsLoading(true);
    setReturnsError("");
    setReturnsData(null);
    const res = await actionTrackReturns(returnGstin, fyInput) as any;
    setReturnsLoading(false);
    if (res && res.success && res.data) {
      setReturnsData(res.data);
    } else {
      setReturnsError(res?.error || "Failed to track returns");
    }
  };

  const handleSearchHsn = async (query: string) => {
    setHsnQuery(query);
    setHsnLoading(true);
    const res = await actionSearchHsn(query) as any;
    setHsnLoading(false);
    if (res && res.success && res.data) {
      setHsnResults(res.data);
    }
  };

  const handleVerifyIrn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIrnLoading(true);
    setIrnError("");
    setIrnData(null);
    const res = await actionVerifyIrn(irnInput) as any;
    setIrnLoading(false);
    if (res && res.success && res.data) {
      setIrnData(res.data);
    } else {
      setIrnError(res?.error || "IRN verification failed");
    }
  };

  const handleTrackEwb = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setEwbLoading(true);
    setEwbError("");
    setEwbData(null);
    const res = await actionTrackEwb(ewbInput) as any;
    setEwbLoading(false);
    if (res && res.success && res.data) {
      setEwbData(res.data);
    } else {
      setEwbError(res?.error || "E-Way Bill not found");
    }
  };

  const handleVerifyCashfree = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCashfreeLoading(true);
    setCashfreeError("");
    setCashfreeData(null);
    const res = await actionVerifyCashfree(cashfreeGstin, {
      clientId: cashfreeClientId.trim() || undefined,
      clientSecret: cashfreeClientSecret.trim() || undefined,
      isSandbox: cashfreeIsSandbox
    }) as any;
    setCashfreeLoading(false);
    if (res && res.success) {
      setCashfreeData(res);
    } else {
      setCashfreeError(res?.error || "Cashfree GSTIN verification failed");
    }
  };

  const handleValidateTpStatus = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTpStatusLoading(true);
    setTpStatusError("");
    setTpStatusData(null);
    const res = await actionValidateTpStatus(tpStatusGstin, tpStatusDomain.trim() || undefined) as any;
    setTpStatusLoading(false);
    if (res && res.success && res.data) {
      setTpStatusData(res.data);
    } else {
      setTpStatusError(res?.error || "Failed to validate taxpayer status");
    }
  };

  return (
    <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={22} color="#2563eb" /> GST Public APIs & Taxpayer Verification Suite
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
            Official GST Developer Portal (<code>developer.gst.gov.in/apiportal/</code>) & Cashfree (<code>sandbox.cashfree.com/verification/gstin</code>)
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <a 
            href="https://developer.gst.gov.in/apiportal/" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.78rem", fontWeight: 600, color: "#2563eb", textDecoration: "none", backgroundColor: "#eff6ff", padding: "6px 12px", borderRadius: "6px", border: "1px solid #bfdbfe" }}
          >
            GST Portal Docs <ExternalLink size={12} />
          </a>
          <a 
            href="https://sandbox.cashfree.com/verification/gstin" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.78rem", fontWeight: 600, color: "#059669", textDecoration: "none", backgroundColor: "#ecfdf5", padding: "6px 12px", borderRadius: "6px", border: "1px solid #a7f3d0" }}
          >
            Cashfree Docs <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "24px", backgroundColor: "#f8fafc", padding: "6px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
        {[
          { id: 'tpstatus', label: '⚡ Validate Status (/tpstatus)', icon: Check },
          { id: 'cashfree', label: '💳 Cashfree GSTIN Verifier', icon: ShieldCheck },
          { id: 'taxpayer', label: '🔍 Search Taxpayer (GSTIN)', icon: Search },
          { id: 'pan', label: '🪪 Search by PAN', icon: CreditCard },
          { id: 'returns', label: '📊 Track Return Filing Status', icon: FileCheck2 },
          { id: 'hsn', label: '🏷️ HSN / SAC Finder', icon: Hash },
          { id: 'einvoice', label: '🧾 E-Invoice IRN Verifier', icon: QrCode },
          { id: 'ewaybill', label: '🚚 E-Way Bill Tracker', icon: Truck },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'hsn' && hsnResults.length === 0) handleSearchHsn("");
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "7px",
                border: "none",
                backgroundColor: isActive ? "#2563eb" : "transparent",
                color: isActive ? "#ffffff" : "#475569",
                fontWeight: isActive ? 700 : 500,
                fontSize: "0.82rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: isActive ? "0 2px 5px rgba(37,99,235,0.25)" : "none"
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── TAB -1: OFFICIAL GST TPSTATUS API (GET /commonapi/v1.0/tpstatus?gstin={}&action=TP) ─── */}
      {activeTab === 'tpstatus' && (
        <div>
          {/* API Info Header */}
          <div style={{ backgroundColor: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: "10px", padding: "14px 16px", marginBottom: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#0f766e", display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={16} /> Official Public Taxpayer Status API (v1.0 /tpstatus)
              </span>
              <span style={{ fontSize: "0.72rem", backgroundColor: "#ccfbf1", color: "#115e59", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
                METHOD: GET • ACTION: TP
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "0.76rem", color: "#134e4a", fontFamily: "monospace" }}>
              GET https://{tpStatusDomain.trim() || 'domain-name'}/commonapi/v1.0/tpstatus?gstin={tpStatusGstin}&action=TP
            </p>
          </div>

          <form onSubmit={handleValidateTpStatus} style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: "10px", alignItems: "flex-end" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Domain / Gateway <span style={{ color: "#64748b", fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  value={tpStatusDomain}
                  onChange={e => setTpStatusDomain(e.target.value)}
                  placeholder="e.g. dev.gst.gov.in"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.84rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  GSTIN to Validate
                </label>
                <input
                  type="text"
                  value={tpStatusGstin}
                  onChange={e => setTpStatusGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 29AAICP2912R1ZR"
                  maxLength={15}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase" }}
                />
              </div>

              <button
                type="submit"
                disabled={tpStatusLoading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 20px",
                  backgroundColor: "#0d9488",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: tpStatusLoading ? "not-allowed" : "pointer"
                }}
              >
                {tpStatusLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {tpStatusLoading ? "Validating..." : "Validate GSTIN Status"}
              </button>
            </div>
          </form>

          {/* TP Status Error */}
          {tpStatusError && (
            <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", padding: "12px 16px", borderRadius: "8px", fontSize: "0.84rem", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <AlertCircle size={18} />
              <span>{tpStatusError}</span>
            </div>
          )}

          {/* Official TP Status JSON Response Card */}
          {tpStatusData && (
            <div style={{ backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                    GSTIN Validation Response
                    <span style={{ fontSize: "0.74rem", backgroundColor: tpStatusData.validGstin ? "#ecfdf5" : "#fef2f2", color: tpStatusData.validGstin ? "#059669" : "#b91c1c", padding: "2px 8px", borderRadius: "4px", fontWeight: 700, border: `1px solid ${tpStatusData.validGstin ? '#a7f3d0' : '#fca5a5'}` }}>
                      {tpStatusData.validGstin ? "✓ VALID GSTIN" : "✗ INVALID GSTIN"}
                    </span>
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                    Status: <strong style={{ color: tpStatusData.status === "Active" ? "#059669" : "#d97706" }}>{tpStatusData.status}</strong> • State: <strong>{tpStatusData.stateName} ({tpStatusData.stateCode})</strong>
                  </p>
                </div>
              </div>

              {/* Response Fields Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                <div style={{ backgroundColor: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, display: "block", textTransform: "uppercase" }}>gstin</span>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0f172a", marginTop: "2px", fontFamily: "monospace" }}>
                    {tpStatusData.gstin}
                  </div>
                </div>

                <div style={{ backgroundColor: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, display: "block", textTransform: "uppercase" }}>validGstin</span>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: tpStatusData.validGstin ? "#059669" : "#b91c1c", marginTop: "2px", fontFamily: "monospace" }}>
                    {String(tpStatusData.validGstin)}
                  </div>
                </div>

                <div style={{ backgroundColor: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, display: "block", textTransform: "uppercase" }}>status</span>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: tpStatusData.status === "Active" ? "#059669" : "#0f172a", marginTop: "2px" }}>
                    {tpStatusData.status}
                  </div>
                </div>

                <div style={{ backgroundColor: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, display: "block", textTransform: "uppercase" }}>stateCode & stateName</span>
                  <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                    {tpStatusData.stateCode} - {tpStatusData.stateName}
                  </div>
                </div>
              </div>

              {/* JSON Payload View */}
              <div style={{ backgroundColor: "#0f172a", borderRadius: "8px", padding: "14px", color: "#38bdf8", fontFamily: "monospace", fontSize: "0.8rem", overflowX: "auto" }}>
                <span style={{ color: "#94a3b8", display: "block", marginBottom: "4px", fontSize: "0.72rem" }}>Official Response JSON Payload:</span>
                <pre style={{ margin: 0 }}>
{JSON.stringify({
  gstin: tpStatusData.gstin,
  stateCode: tpStatusData.stateCode,
  stateName: tpStatusData.stateName,
  status: tpStatusData.status,
  validGstin: tpStatusData.validGstin
}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 0: CASHFREE GSTIN VERIFIER (sandbox.cashfree.com/verification/gstin) ─── */}
      {activeTab === 'cashfree' && (
        <div>
          {/* Credentials Info Header */}
          <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "14px 16px", marginBottom: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#166534", display: "flex", alignItems: "center", gap: "6px" }}>
                <ShieldCheck size={16} /> Cashfree Verification API (Sandbox / Production)
              </span>
              <span style={{ fontSize: "0.72rem", backgroundColor: cashfreeIsSandbox ? "#dbeafe" : "#fef3c7", color: cashfreeIsSandbox ? "#1e40af" : "#92400e", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
                {cashfreeIsSandbox ? "SANDBOX MODE" : "PRODUCTION MODE"}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "0.76rem", color: "#15803d" }}>
              Endpoint: <code>{cashfreeIsSandbox ? "https://sandbox.cashfree.com/verification/gstin" : "https://api.cashfree.com/verification/gstin"}</code>
            </p>
          </div>

          <form onSubmit={handleVerifyCashfree} style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Cashfree Client ID <span style={{ color: "#64748b", fontWeight: 400 }}>(Optional if set in Settings / .env)</span>
                </label>
                <input
                  type="text"
                  value={cashfreeClientId}
                  onChange={e => setCashfreeClientId(e.target.value)}
                  placeholder="e.g. CF_CLIENT_ID..."
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Cashfree Client Secret <span style={{ color: "#64748b", fontWeight: 400 }}>(Optional if set in Settings / .env)</span>
                </label>
                <input
                  type="password"
                  value={cashfreeClientSecret}
                  onChange={e => setCashfreeClientSecret(e.target.value)}
                  placeholder="e.g. CF_CLIENT_SECRET..."
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  15-Digit GSTIN to Verify
                </label>
                <input
                  type="text"
                  value={cashfreeGstin}
                  onChange={e => setCashfreeGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 29AAACP2916R1ZR"
                  maxLength={15}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "20px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.78rem", fontWeight: 600, color: "#475569", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={cashfreeIsSandbox}
                    onChange={e => setCashfreeIsSandbox(e.target.checked)}
                  />
                  <span>Sandbox</span>
                </label>
                <button
                  type="submit"
                  disabled={cashfreeLoading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "10px 18px",
                    backgroundColor: "#059669",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: cashfreeLoading ? "not-allowed" : "pointer"
                  }}
                >
                  {cashfreeLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  {cashfreeLoading ? "Verifying..." : "Verify with Cashfree"}
                </button>
              </div>
            </div>
          </form>

          {/* Cashfree Error */}
          {cashfreeError && (
            <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", padding: "12px 16px", borderRadius: "8px", fontSize: "0.84rem", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <AlertCircle size={18} />
              <span>{cashfreeError}</span>
            </div>
          )}

          {/* Cashfree Verified Result Card */}
          {cashfreeData && (
            <div style={{ backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                    {cashfreeData.companyName || cashfreeData.legalName || "Verified Taxpayer"}
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                    Trade Name: <strong style={{ color: "#0f172a" }}>{cashfreeData.tradeName || cashfreeData.legalName || "-"}</strong>
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ display: "inline-block", backgroundColor: "#ecfdf5", color: "#059669", padding: "4px 10px", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 700, border: "1px solid #a7f3d0" }}>
                    ✓ {cashfreeData.status || "ACTIVE"}
                  </span>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "4px" }}>
                    Ref ID: {cashfreeData.referenceId || "N/A"}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                <div style={{ backgroundColor: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, display: "block", textTransform: "uppercase" }}>GSTIN & PAN</span>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0f172a", marginTop: "2px", fontFamily: "monospace" }}>
                    {cashfreeData.gstin}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                    PAN: {cashfreeData.pan || "-"}
                  </div>
                </div>

                <div style={{ backgroundColor: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, display: "block", textTransform: "uppercase" }}>Taxpayer Type</span>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                    {cashfreeData.taxpayerType || "Regular"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                    Reg: {cashfreeData.dateOfRegistration || "-"}
                  </div>
                </div>

                <div style={{ backgroundColor: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", gridColumn: "span 2" }}>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, display: "block", textTransform: "uppercase" }}>Principal Place Address</span>
                  <div style={{ fontSize: "0.84rem", color: "#1e293b", marginTop: "2px", lineHeight: 1.4 }}>
                    {cashfreeData.address || "-"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                    City: <strong>{cashfreeData.city || "-"}</strong> • State: <strong>{cashfreeData.state || "-"}</strong> • Pincode: <strong>{cashfreeData.pincode || "-"}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 1: SEARCH TAXPAYER BY GSTIN ─── */}
      {activeTab === 'taxpayer' && (
        <div>
          <form onSubmit={handleSearchTaxpayer} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                type="text"
                value={gstinInput}
                onChange={e => setGstinInput(e.target.value.toUpperCase())}
                placeholder="Enter 15-digit GSTIN (e.g. 06AAHCE7721Q1Z4)"
                maxLength={15}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase" }}
              />
            </div>
            <button
              type="submit"
              disabled={taxpayerLoading}
              style={{ padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "#2563eb", color: "#ffffff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {taxpayerLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Search Taxpayer
            </button>
          </form>

          {taxpayerError && (
            <div style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "12px", borderRadius: "8px", border: "1px solid #fca5a5", fontSize: "0.85rem", marginBottom: "16px" }}>
              {taxpayerError}
            </div>
          )}

          {taxpayerData && (
            <div style={{ backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "14px", marginBottom: "14px" }}>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", padding: "3px 8px", borderRadius: "6px", fontSize: "0.74rem", fontWeight: 800, marginBottom: "4px" }}>
                    <CheckCircle2 size={13} color="#059669" /> STATUS: {taxpayerData.status.toUpperCase()}
                  </div>
                  <h3 style={{ margin: "2px 0 0", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
                    {taxpayerData.legalName}
                  </h3>
                  <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                    Trade Name: <strong style={{ color: "#334155" }}>{taxpayerData.tradeName}</strong>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: "0.95rem", fontWeight: 800, color: "#2563eb", backgroundColor: "#eff6ff", padding: "6px 12px", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
                  {taxpayerData.gstin}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", fontSize: "0.82rem" }}>
                <div>
                  <div style={{ color: "#64748b", fontWeight: 600 }}>Constitution of Business:</div>
                  <div style={{ fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>{taxpayerData.constitutionOfBusiness}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontWeight: 600 }}>Taxpayer Type:</div>
                  <div style={{ fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>{taxpayerData.taxpayerType}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontWeight: 600 }}>State & Code:</div>
                  <div style={{ fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>{taxpayerData.state} ({taxpayerData.stateCode})</div>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontWeight: 600 }}>PAN Number:</div>
                  <div style={{ fontWeight: 700, color: "#0f172a", marginTop: "2px", fontFamily: "monospace" }}>{taxpayerData.pan}</div>
                </div>
              </div>

              <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontWeight: 600, fontSize: "0.8rem", marginBottom: "3px" }}>
                  Principal Place of Business:
                </div>
                <div style={{ fontSize: "0.85rem", color: "#1e293b", fontWeight: 600 }}>
                  <MapPin size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px", color: "#2563eb" }} />
                  {taxpayerData.principalPlaceOfBusiness.fullAddress}
                </div>
              </div>

              <div style={{ marginTop: "12px", display: "flex", gap: "20px", fontSize: "0.75rem", color: "#64748b" }}>
                <div>State Jurisdiction: <strong style={{ color: "#334155" }}>{taxpayerData.jurisdiction.stateJurisdiction}</strong></div>
                <div>Centre Jurisdiction: <strong style={{ color: "#334155" }}>{taxpayerData.jurisdiction.centreJurisdiction}</strong></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: SEARCH BY PAN ─── */}
      {activeTab === 'pan' && (
        <div>
          <form onSubmit={handleSearchPan} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input
              type="text"
              value={panInput}
              onChange={e => setPanInput(e.target.value.toUpperCase())}
              placeholder="Enter 10-digit PAN (e.g. AAHCE7721Q)"
              maxLength={10}
              style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase" }}
            />
            <button
              type="submit"
              disabled={panLoading}
              style={{ padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "#2563eb", color: "#ffffff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {panLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Search All GSTINs
            </button>
          </form>

          {panError && (
            <div style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "12px", borderRadius: "8px", border: "1px solid #fca5a5", fontSize: "0.85rem", marginBottom: "16px" }}>
              {panError}
            </div>
          )}

          {panData && (
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "10px" }}>
                Found {panData.count} Registered GST Registrations for PAN: <code style={{ color: "#2563eb" }}>{panData.pan}</code>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}>
                      <th style={{ padding: "8px 12px" }}>GSTIN</th>
                      <th style={{ padding: "8px 12px" }}>State</th>
                      <th style={{ padding: "8px 12px" }}>Code</th>
                      <th style={{ padding: "8px 12px" }}>Business Constitution</th>
                      <th style={{ padding: "8px 12px" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {panData.gstinList.map((item: any) => (
                      <tr key={item.gstin} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: "#2563eb" }}>{item.gstin}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>{item.state}</td>
                        <td style={{ padding: "8px 12px" }}>{item.stateCode}</td>
                        <td style={{ padding: "8px 12px" }}>{item.authType}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ backgroundColor: "#ecfdf5", color: "#065f46", padding: "2px 6px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 800 }}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: TRACK RETURN FILING COMPLIANCE ─── */}
      {activeTab === 'returns' && (
        <div>
          <form onSubmit={handleTrackReturns} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input
              type="text"
              value={returnGstin}
              onChange={e => setReturnGstin(e.target.value.toUpperCase())}
              placeholder="Enter GSTIN (e.g. 06AAHCE7721Q1Z4)"
              maxLength={15}
              style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", fontFamily: "monospace", fontWeight: 700 }}
            />
            <select
              value={fyInput}
              onChange={e => setFyInput(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", fontWeight: 600, backgroundColor: "#ffffff" }}
            >
              <option value="2025-26">FY 2025-26</option>
              <option value="2024-25">FY 2024-25</option>
              <option value="2023-24">FY 2023-24</option>
            </select>
            <button
              type="submit"
              disabled={returnsLoading}
              style={{ padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "#2563eb", color: "#ffffff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {returnsLoading ? <Loader2 size={16} className="animate-spin" /> : <FileCheck2 size={16} />}
              Track Returns
            </button>
          </form>

          {returnsError && (
            <div style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "12px", borderRadius: "8px", border: "1px solid #fca5a5", fontSize: "0.85rem", marginBottom: "16px" }}>
              {returnsError}
            </div>
          )}

          {returnsData && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", backgroundColor: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>{returnsData.legalName}</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Financial Year: {returnsData.financialYear} • GSTIN: {returnsData.gstin}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Compliance Rating:</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#16a34a" }}>{returnsData.complianceScore}%</div>
                </div>
              </div>

              <div style={{ maxHeight: "320px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f1f5f9", textAlign: "left", position: "sticky", top: 0 }}>
                      <th style={{ padding: "8px 12px" }}>Return Type</th>
                      <th style={{ padding: "8px 12px" }}>Tax Period</th>
                      <th style={{ padding: "8px 12px" }}>Date of Filing</th>
                      <th style={{ padding: "8px 12px" }}>ARN Number</th>
                      <th style={{ padding: "8px 12px" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnsData.returns.map((r: any, i: number) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 700, color: "#2563eb" }}>{r.returnType}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>{r.taxPeriod}</td>
                        <td style={{ padding: "8px 12px" }}>{r.filingDate || "—"}</td>
                        <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: "0.75rem" }}>{r.arn || "—"}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            backgroundColor: r.status === 'Filed' ? '#ecfdf5' : '#fef2f2',
                            color: r.status === 'Filed' ? '#065f46' : '#b91c1c'
                          }}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: HSN / SAC FINDER ─── */}
      {activeTab === 'hsn' && (
        <div>
          <div style={{ marginBottom: "16px" }}>
            <input
              type="text"
              value={hsnQuery}
              onChange={e => handleSearchHsn(e.target.value)}
              placeholder="Search by HSN/SAC code (e.g. 6109, 6203, 9983) or description (cotton, t-shirt, software)..."
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}>
                  <th style={{ padding: "8px 12px" }}>HSN/SAC Code</th>
                  <th style={{ padding: "8px 12px" }}>Description</th>
                  <th style={{ padding: "8px 12px" }}>Category</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>GST %</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>CGST</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>SGST</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>IGST</th>
                </tr>
              </thead>
              <tbody>
                {hsnResults.map(item => (
                  <tr key={item.code} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 800, color: "#2563eb" }}>{item.code}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{item.description}</div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{item.chapter}</div>
                    </td>
                    <td style={{ padding: "8px 12px" }}>{item.category}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>{item.gstRate}%</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>{item.cgstRate}%</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>{item.sgstRate}%</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#2563eb" }}>{item.igstRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 5: E-INVOICE IRN VERIFIER ─── */}
      {activeTab === 'einvoice' && (
        <div>
          <form onSubmit={handleVerifyIrn} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input
              type="text"
              value={irnInput}
              onChange={e => setIrnInput(e.target.value.toLowerCase())}
              placeholder="Enter 64-character SHA-256 Invoice Reference Number (IRN)"
              maxLength={64}
              style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", fontFamily: "monospace" }}
            />
            <button
              type="submit"
              disabled={irnLoading}
              style={{ padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "#2563eb", color: "#ffffff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {irnLoading ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
              Verify IRN
            </button>
          </form>

          {irnError && (
            <div style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "12px", borderRadius: "8px", border: "1px solid #fca5a5", fontSize: "0.85rem", marginBottom: "16px" }}>
              {irnError}
            </div>
          )}

          {irnData && (
            <div style={{ backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "14px" }}>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", padding: "3px 8px", borderRadius: "6px", fontSize: "0.74rem", fontWeight: 800 }}>
                    <CheckCircle2 size={13} color="#059669" /> IRP VERIFIED • ACTIVE
                  </div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>Ack No: {irnData.ackNo}</div>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Seller GSTIN: <strong>{irnData.sellerGstin}</strong>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", fontSize: "0.82rem" }}>
                <div>
                  <span style={{ color: "#64748b" }}>Document:</span>
                  <div style={{ fontWeight: 700 }}>{irnData.docNumber} ({irnData.docType})</div>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Taxable Value:</span>
                  <div style={{ fontWeight: 700 }}>₹{irnData.taxableValue?.toLocaleString()}</div>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Total GST:</span>
                  <div style={{ fontWeight: 700 }}>₹{irnData.totalGst?.toLocaleString()}</div>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Grand Total:</span>
                  <div style={{ fontWeight: 800, color: "#2563eb" }}>₹{irnData.grandTotal?.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 6: E-WAY BILL GOVERNMENT TRACKER ─── */}
      {activeTab === 'ewaybill' && (
        <div>
          <form onSubmit={handleTrackEwb} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input
              type="text"
              value={ewbInput}
              onChange={e => setEwbInput(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 12-digit E-Way Bill Number (e.g. 121049281920)"
              maxLength={12}
              style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", fontFamily: "monospace", fontWeight: 700 }}
            />
            <button
              type="submit"
              disabled={ewbLoading}
              style={{ padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "#2563eb", color: "#ffffff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {ewbLoading ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
              Track E-Way Bill
            </button>
          </form>

          {ewbError && (
            <div style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "12px", borderRadius: "8px", border: "1px solid #fca5a5", fontSize: "0.85rem", marginBottom: "16px" }}>
              {ewbError}
            </div>
          )}

          {ewbData && (
            <div style={{ backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "14px" }}>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", padding: "3px 8px", borderRadius: "6px", fontSize: "0.74rem", fontWeight: 800 }}>
                    <CheckCircle2 size={13} color="#059669" /> EWB ACTIVE • IN TRANSIT
                  </div>
                  <h3 style={{ margin: "4px 0 0", fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                    E-Way Bill #{ewbData.ewbNo}
                  </h3>
                </div>
                <div style={{ textAlign: "right", fontSize: "0.8rem", color: "#64748b" }}>
                  Valid Upto: <strong style={{ color: "#0f172a" }}>{ewbData.validUpto}</strong>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div style={{ backgroundColor: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.8rem" }}>
                  <div style={{ color: "#2563eb", fontWeight: 700, marginBottom: "4px" }}>DISPATCHED FROM:</div>
                  <div style={{ fontWeight: 800 }}>{ewbData.fromTrdName}</div>
                  <div style={{ color: "#64748b" }}>GSTIN: {ewbData.fromGstin} • PIN: {ewbData.fromPincode}</div>
                </div>

                <div style={{ backgroundColor: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.8rem" }}>
                  <div style={{ color: "#16a34a", fontWeight: 700, marginBottom: "4px" }}>DELIVERED TO:</div>
                  <div style={{ fontWeight: 800 }}>{ewbData.toTrdName}</div>
                  <div style={{ color: "#64748b" }}>GSTIN: {ewbData.toGstin} • PIN: {ewbData.toPincode}</div>
                </div>
              </div>

              <div style={{ backgroundColor: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.8rem" }}>
                <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>Active Transport Vehicle (Part B):</div>
                <div style={{ display: "flex", gap: "20px", color: "#475569" }}>
                  <div>Vehicle No: <strong style={{ color: "#0f172a" }}>{ewbData.vehicleList[0]?.vehicleNo}</strong></div>
                  <div>Mode: <strong>{ewbData.vehicleList[0]?.transMode}</strong></div>
                  <div>From: <strong>{ewbData.vehicleList[0]?.from}</strong></div>
                  <div>Trip Sheet: <strong>{ewbData.vehicleList[0]?.tripshtNo}</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
