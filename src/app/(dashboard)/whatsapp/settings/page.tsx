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
    </div>
  );
}
