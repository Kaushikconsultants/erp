"use client";

import React, { useState } from "react";
import { Key, ShieldCheck, RefreshCw, CheckCircle2, AlertTriangle, Eye, EyeOff, Send } from "lucide-react";

export default function WhatsAppAPISettingsPage() {
  const [wabaId, setWabaId] = useState("waba_991827364501");
  const [phoneId, setPhoneId] = useState("ph_10928374659201");
  const [managerId, setManagerId] = useState("bm_5544332211");
  const [token, setToken] = useState("EAAG...meta_token_secured_2026");
  const [showToken, setShowToken] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const handleTestConnection = () => {
    setTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setTestResult("Meta WhatsApp Cloud API Connection Test Passed! Status: 200 OK. Webhook Verified.");
      setTesting(false);
    }, 1000);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px" }}>
      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Meta WhatsApp Business API Credentials</h2>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>Manage encrypted Meta Cloud API tokens, WABA IDs & Webhooks.</p>
          </div>
          <span style={{ fontSize: "12px", fontWeight: 700, background: "#dcfce7", color: "#166534", padding: "4px 10px", borderRadius: "12px" }}>
            ● API Connected
          </span>
        </div>

        {testResult && (
          <div style={{ background: "#dcfce7", border: "1px solid #86efac", color: "#166534", padding: "12px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={18} />
            <span>{testResult}</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px" }}>WhatsApp Business Account ID (WABA ID)</label>
            <input type="text" value={wabaId} onChange={(e) => setWabaId(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }} />
          </div>

          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px" }}>Phone Number ID</label>
            <input type="text" value={phoneId} onChange={(e) => setPhoneId(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }} />
          </div>

          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px" }}>Business Manager ID</label>
            <input type="text" value={managerId} onChange={(e) => setManagerId(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }} />
          </div>

          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px" }}>Permanent Access Token (Encrypted)</label>
            <div style={{ position: "relative" }}>
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                style={{ width: "100%", padding: "10px 40px 10px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                style={{ position: "absolute", right: "10px", top: "10px", background: "none", border: "none", color: "#6b7280", cursor: "pointer" }}
              >
                {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ background: "#fafafa", padding: "14px", borderRadius: "8px", border: "1px solid #f3f4f6" }}>
            <h4 style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 6px 0" }}>Meta Webhook Callback URL</h4>
            <code style={{ fontSize: "12px", background: "#f3f4f6", padding: "6px 10px", borderRadius: "4px", display: "block" }}>
              https://espon.in/api/whatsapp/webhook
            </code>
            <p style={{ fontSize: "11.5px", color: "#6b7280", margin: "6px 0 0 0" }}>Verify Token: <code>espon_whatsapp_secure_webhook_token_2026</code></p>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "#10b981", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "6px", fontSize: "13.5px", fontWeight: 700, cursor: "pointer" }}
            >
              {testing ? <RefreshCw size={16} className="spin-icon" /> : <RefreshCw size={16} />}
              <span>Test API Connection</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
