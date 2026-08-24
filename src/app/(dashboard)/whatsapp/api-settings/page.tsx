"use client";

import React, { useState, useEffect } from "react";
import { Key, ShieldCheck, RefreshCw, CheckCircle2, AlertTriangle, Eye, EyeOff, Send, Save, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getWhatsAppApiCredentialsAction, saveWhatsAppApiCredentialsAction } from "@/app/actions/whatsAppPlatformActions";

export default function WhatsAppAPISettingsPage() {
  const [wabaId, setWabaId] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [token, setToken] = useState("");
  const [webhookToken, setWebhookToken] = useState("espon_whatsapp_secure_webhook_token_2026");
  const [showToken, setShowToken] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Registration State
  const [pin, setPin] = useState("");
  const [registering, setRegistering] = useState(false);
  const [regResult, setRegResult] = useState<{ success: boolean; text: string } | null>(null);

  // Test Message State
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; text: string } | null>(null);

  useEffect(() => {
    getWhatsAppApiCredentialsAction().then((res) => {
      if (res.success && res.credentials) {
        setWabaId(res.credentials.businessAccountId || "");
        setPhoneId(res.credentials.phoneId || "");
        setManagerId(res.credentials.businessManagerId || "");
        setPhoneNumber(res.credentials.phoneNumber || "");
        setToken(res.credentials.accessToken || "");
        setWebhookToken(res.credentials.webhookVerifyToken || "espon_whatsapp_secure_webhook_token_2026");
        setIsConnected(res.isConnected || false);
      }
      setLoading(false);
    });
  }, []);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setResultMsg(null);

    const res = await saveWhatsAppApiCredentialsAction({
      wabaId,
      phoneId,
      managerId,
      accessToken: token,
      phoneNumber,
      webhookVerifyToken: webhookToken
    });

    if (res.success) {
      setIsConnected(Boolean(res.isConnected));
      setResultMsg({
        success: Boolean(res.isConnected),
        text: res.message || "Credentials updated."
      });
    } else {
      setResultMsg({
        success: false,
        text: res.error || "Failed to save API credentials."
      });
    }
    setSaving(false);
  };

  const handleRegisterPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneId || !pin || !token || !wabaId) {
      setRegResult({ success: false, text: "Please enter your Phone ID, WABA ID, Access Token, and 6-digit PIN before registering." });
      return;
    }
    
    setRegistering(true);
    setRegResult(null);
    
    try {
      const res = await fetch('/api/whatsapp/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumberId: phoneId, 
          wabaId: wabaId,
          accessToken: token,
          pin: pin 
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setRegResult({ success: true, text: "Phone number successfully registered and verified by Meta! Your credentials are saved." });
        setIsConnected(true);
      } else {
        setRegResult({ success: false, text: data.error || "Failed to register phone number" });
      }
    } catch (error: any) {
      setRegResult({ success: false, text: error.message || "Network error while registering" });
    }
    setRegistering(false);
  };

  const handleTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) {
      setTestResult({ success: false, text: "Please enter a phone number to test." });
      return;
    }
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const res = await fetch('/api/whatsapp/test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone })
      });
      const data = await res.json();
      
      if (data.success) {
        setTestResult({ success: true, text: "Test message sent successfully! Check your WhatsApp." });
      } else {
        setTestResult({ success: false, text: data.error || "Failed to send test message" });
      }
    } catch (error: any) {
      setTestResult({ success: false, text: error.message || "Network error while testing" });
    }
    setTesting(false);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "840px" }}>
      {/* Alert Header */}
      {!isConnected && (
        <div style={{ background: "#fffbe5", border: "1px solid #fde047", color: "#854d0e", padding: "14px 18px", borderRadius: "10px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertTriangle size={20} color="#ca8a04" />
            <div>
              <strong style={{ fontSize: "14px", display: "block" }}>WhatsApp API Not Connected</strong>
              <span style={{ fontSize: "12.5px" }}>Please enter your Meta WABA Account ID, Phone Number ID, and Permanent Access Token below to enable live messaging.</span>
            </div>
          </div>
        </div>
      )}

      {resultMsg && (
        <div style={{ background: resultMsg.success ? "#dcfce7" : "#fee2e2", border: `1px solid ${resultMsg.success ? "#86efac" : "#fca5a5"}`, color: resultMsg.success ? "#166534" : "#991b1b", padding: "12px 16px", borderRadius: "8px", fontSize: "13.5px", fontWeight: 600, marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
          {resultMsg.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{resultMsg.text}</span>
        </div>
      )}

      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px", boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#111827" }}>Meta WhatsApp Business API Credentials</h2>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>Manage Meta Cloud API tokens, WABA IDs & Webhook Configuration.</p>
          </div>

          <span style={{ fontSize: "12px", fontWeight: 700, background: isConnected ? "#dcfce7" : "#fee2e2", color: isConnected ? "#166534" : "#991b1b", padding: "4px 10px", borderRadius: "12px" }}>
            ● {isConnected ? "API CONNECTED" : "NOT CONNECTED"}
          </span>
        </div>

        <form onSubmit={handleSaveCredentials} autoComplete="off" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px", color: "#374151" }}>
                WhatsApp Phone Number <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                autoComplete="off"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +91 9876543210"
                required
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px", color: "#374151" }}>
                Meta Phone Number ID <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                autoComplete="off"
                value={phoneId}
                onChange={(e) => setPhoneId(e.target.value)}
                placeholder="e.g. 10928374659201"
                required
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px", color: "#374151" }}>
                WhatsApp Business Account ID (WABA ID) <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                autoComplete="off"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="e.g. 991827364501"
                required
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px", color: "#374151" }}>
                Business Manager ID (Optional)
              </label>
              <input
                type="text"
                autoComplete="off"
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                placeholder="e.g. 5544332211"
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px", color: "#374151" }}>
              Permanent Meta System User Access Token <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showToken ? "text" : "password"}
                autoComplete="new-password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste Meta Permanent Token starting with EAAG..."
                required
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

          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <h4 style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 6px 0", color: "#0f172a" }}>Meta Webhook Endpoint Information</h4>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 8px 0" }}>Configure this Callback URL inside your Meta Developer Dashboard under WhatsApp API Webhooks:</p>
            <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", marginBottom: "8px" }}>
              <code style={{ fontSize: "12px", color: "#0f172a", fontWeight: 600 }}>
                {typeof window !== "undefined" ? `${window.location.origin}/api/whatsapp/webhook` : "https://your-domain.com/api/whatsapp/webhook"}
              </code>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
              Verify Token: <strong>{webhookToken}</strong>
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
            <button
              type="submit"
              disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "#10b981", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", fontSize: "13.5px", fontWeight: 700, cursor: "pointer" }}
            >
              {saving ? <RefreshCw size={16} className="spin-icon" /> : <Save size={16} />}
              <span>{saving ? "Testing & Connecting..." : "Test & Save API Credentials"}</span>
            </button>
          </div>
        </form>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px", marginTop: "24px", boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px 0", color: "#111827" }}>Meta WhatsApp Phone Registration</h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 20px 0" }}>Register your business phone number with Meta API. Make sure your Phone ID, WABA ID, and Access Token are filled above. Requires a 6-digit PIN.</p>

        {regResult && (
          <div style={{ background: regResult.success ? "#dcfce7" : "#fee2e2", border: `1px solid ${regResult.success ? "#86efac" : "#fca5a5"}`, color: regResult.success ? "#166534" : "#991b1b", padding: "12px 16px", borderRadius: "8px", fontSize: "13.5px", fontWeight: 600, marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            {regResult.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{regResult.text}</span>
          </div>
        )}

        <form onSubmit={handleRegisterPhone} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px", color: "#374151" }}>
              6-Digit Registration PIN <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="e.g. 123456"
              required
              maxLength={6}
              pattern="\d{6}"
              style={{ width: "100%", maxWidth: "300px", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
            <button
              type="submit"
              disabled={registering}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: registering ? "#9ca3af" : "#2563eb", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", fontSize: "13.5px", fontWeight: 700, cursor: registering ? "not-allowed" : "pointer" }}
            >
              {registering ? <RefreshCw size={16} className="spin-icon" /> : <Send size={16} />}
              <span>{registering ? "Registering with Meta..." : "Register Phone Number"}</span>
            </button>
          </div>
        </form>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px", marginTop: "24px", boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px 0", color: "#111827" }}>Test API Connection</h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 20px 0" }}>Send a <code>hello_world</code> template message to verify your Meta API connection is working.</p>

        {testResult && (
          <div style={{ background: testResult.success ? "#dcfce7" : "#fee2e2", border: `1px solid ${testResult.success ? "#86efac" : "#fca5a5"}`, color: testResult.success ? "#166534" : "#991b1b", padding: "12px 16px", borderRadius: "8px", fontSize: "13.5px", fontWeight: 600, marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            {testResult.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{testResult.text}</span>
          </div>
        )}

        <form onSubmit={handleTestMessage} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px", color: "#374151" }}>
              Test Phone Number (with Country Code)
            </label>
            <input
              type="text"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="e.g. 919876543210"
              required
              style={{ width: "100%", maxWidth: "300px", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
            <button
              type="submit"
              disabled={testing || !isConnected}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: testing || !isConnected ? "#9ca3af" : "#f59e0b", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", fontSize: "13.5px", fontWeight: 700, cursor: testing || !isConnected ? "not-allowed" : "pointer" }}
            >
              {testing ? <RefreshCw size={16} className="spin-icon" /> : <Send size={16} />}
              <span>{testing ? "Sending..." : "Send hello_world Template"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
