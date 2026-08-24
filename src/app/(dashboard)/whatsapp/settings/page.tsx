"use client";

import React, { useState, useEffect } from "react";
import { Settings, ShieldCheck, Clock, Users, Bell, Key, CheckCircle2 } from "lucide-react";
import { getWhatsAppSettingsAction, saveWhatsAppSettingsAction } from "@/app/actions/whatsAppPlatformActions";

export default function WhatsAppSettingsPage() {
  const [workingHoursStart, setWorkingHoursStart] = useState("09:00");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("19:00");
  const [slaMinutes, setSlaMinutes] = useState(15);
  const [autoAssignStrategy, setAutoAssignStrategy] = useState("ROUND_ROBIN");
  const [aiModel, setAiModel] = useState("gpt-4o");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Registration State
  const [regPhoneId, setRegPhoneId] = useState("1452456104611061");
  const [regWabaId, setRegWabaId] = useState("1516902396907674");
  const [regAccessToken, setRegAccessToken] = useState("EAAWP02IA6owBSWjokkrCixnFe5VtdAIzV5Gpo1Ut9X3L6Pyr7zWqiRYUZABwKWdNLGTr7p7LJtUm0feN74pbKuEupEVsFAv8qNTAM7NkkDDuEhM1QpOL6n22foFUdYx98ZAUBOC0Hy7y10oFMdFCtpuQ9NA2mZACQXEiL4D3gBKJsY6Y9ixKZCmPYy9zmgZDZD");
  const [regPin, setRegPin] = useState("");
  const [regStatus, setRegStatus] = useState<{type: 'idle' | 'loading' | 'success' | 'error', msg: string}>({type: 'idle', msg: ''});

  useEffect(() => {
    const fetchSettings = async () => {
      const res = await getWhatsAppSettingsAction();
      if (res.success && res.settings) {
        setWorkingHoursStart(res.settings.workingHoursStart || "09:00");
        setWorkingHoursEnd(res.settings.workingHoursEnd || "19:00");
        setSlaMinutes(res.settings.slaWarningMinutes || 15);
        setAutoAssignStrategy(res.settings.autoAssignStrategy || "ROUND_ROBIN");
        setAiModel(res.settings.aiModel || "gpt-4o");
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await saveWhatsAppSettingsAction({
      workingHoursStart,
      workingHoursEnd,
      slaWarningMinutes: slaMinutes,
      autoAssignStrategy,
      aiModel
    });
    
    if (res.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleRegisterPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regPhoneId || !regPin) {
      setRegStatus({ type: 'error', msg: 'Please enter both Phone ID and 6-digit PIN' });
      return;
    }
    
    setRegStatus({ type: 'loading', msg: 'Registering phone number with Meta...' });
    
    try {
      const res = await fetch('/api/whatsapp/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumberId: regPhoneId, 
          wabaId: regWabaId,
          accessToken: regAccessToken,
          pin: regPin 
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setRegStatus({ type: 'success', msg: 'Phone number successfully registered and verified by Meta!' });
      } else {
        setRegStatus({ type: 'error', msg: data.error || 'Failed to register phone number' });
      }
    } catch (error: any) {
      setRegStatus({ type: 'error', msg: error.message || 'Network error' });
    }
  };

  if (loading) return <div style={{ padding: "20px" }}>Loading settings...</div>;

  return (
    <div style={{ padding: "20px", maxWidth: "750px" }}>
      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px 0" }}>WhatsApp Platform & SLA Settings</h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 20px 0" }}>Configure working hours, automatic team routing rules, SLA breach warning thresholds & security controls.</p>

        {saved && (
          <div style={{ background: "#dcfce7", border: "1px solid #86efac", color: "#166534", padding: "10px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle2 size={16} /> WhatsApp Settings saved successfully!
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", gap: "16px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px" }}>Working Hours Start</label>
              <input type="time" value={workingHoursStart} onChange={(e) => setWorkingHoursStart(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px" }}>Working Hours End</label>
              <input type="time" value={workingHoursEnd} onChange={(e) => setWorkingHoursEnd(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px" }}>SLA Response Time Warning Threshold (Minutes)</label>
            <input type="number" value={slaMinutes} onChange={(e) => setSlaMinutes(parseInt(e.target.value))} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }} />
            <p style={{ fontSize: "11.5px", color: "#6b7280", margin: "4px 0 0 0" }}>Conversations un-responded after {slaMinutes} mins show an Orange alert; after {slaMinutes * 2} mins turn Red (SLA Breached).</p>
          </div>

          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px" }}>Auto Assignment Strategy</label>
            <select value={autoAssignStrategy} onChange={(e) => setAutoAssignStrategy(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }}>
              <option value="ROUND_ROBIN">Round Robin (Equal distribution among active reps)</option>
              <option value="LEAST_ASSIGNED">Least Assigned (Assign to agent with fewest open chats)</option>
              <option value="LOCATION_BASED">Territory & State Based Routing</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px" }}>AI Engine / LLM Router</label>
            <select value={aiModel} onChange={(e) => setAiModel(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }}>
              <option value="gpt-4o">OpenAI (GPT-4o) - Recommended</option>
              <option value="claude-3-5-sonnet">Anthropic (Claude 3.5 Sonnet)</option>
              <option value="gemini-1.5-pro">Google (Gemini 1.5 Pro)</option>
            </select>
            <p style={{ fontSize: "11.5px", color: "#6b7280", margin: "4px 0 0 0" }}>Select the active AI Model to use for the WhatsApp Chatbot. Requires correct API Keys configured in your environment.</p>
          </div>

          <button type="submit" style={{ background: "#10b981", color: "#ffffff", border: "none", padding: "12px", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer", marginTop: "10px" }}>
            Save WhatsApp Settings
          </button>
        </form>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px", marginTop: "24px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px 0" }}>Meta WhatsApp Phone Registration</h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 20px 0" }}>Register your business phone number with Meta API. Requires a 6-digit PIN.</p>

        {regStatus.type === 'success' && (
          <div style={{ background: "#dcfce7", border: "1px solid #86efac", color: "#166534", padding: "10px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle2 size={16} /> {regStatus.msg}
          </div>
        )}
        
        {regStatus.type === 'error' && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, marginBottom: "16px" }}>
            {regStatus.msg}
          </div>
        )}

        <form onSubmit={handleRegisterPhone} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px" }}>Permanent Access Token</label>
            <input type="password" value={regAccessToken} onChange={(e) => setRegAccessToken(e.target.value)} placeholder="EAA..." required style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }} />
          </div>
          
          <div style={{ display: "flex", gap: "16px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px" }}>WhatsApp Business Account (WABA) ID</label>
              <input type="text" value={regWabaId} onChange={(e) => setRegWabaId(e.target.value)} placeholder="e.g. 1516902396907674" required style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px" }}>Phone Number ID</label>
              <input type="text" value={regPhoneId} onChange={(e) => setRegPhoneId(e.target.value)} placeholder="e.g. 1452456104611061" required style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }} />
            </div>
          </div>
          
          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px" }}>6-Digit Registration PIN</label>
            <input type="password" value={regPin} onChange={(e) => setRegPin(e.target.value)} placeholder="e.g. 123456" required maxLength={6} pattern="\d{6}" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }} />
          </div>

          <button type="submit" disabled={regStatus.type === 'loading'} style={{ background: regStatus.type === 'loading' ? "#9ca3af" : "#2563eb", color: "#ffffff", border: "none", padding: "12px", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: regStatus.type === 'loading' ? "not-allowed" : "pointer", marginTop: "10px" }}>
            {regStatus.type === 'loading' ? 'Registering...' : 'Register Phone Number'}
          </button>
        </form>
      </div>
    </div>
  );
}
