"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  Trash2,
  Plus,
  Compass,
  Navigation,
  ArrowRight,
  BookOpen,
  Volume2,
  Check,
  AlertCircle,
  HelpCircle,
  KeyRound,
  FileText,
  Users,
  Package,
  Wallet,
  Clock,
  Truck,
  PhoneCall,
  Factory,
  BarChart3
} from "lucide-react";
import { saveVoiceLearningRule, getVoiceLearningRules, deleteVoiceLearningRule } from "@/app/actions/voiceLearningActions";

const ERP_ROUTE_OPTIONS = [
  { value: "/settings/roles", label: "🔑 Change Password & User Directory", icon: KeyRound },
  { value: "/settings", label: "⚙️ Company Settings & Profile", icon: KeyRound },
  { value: "/quotations/new", label: "📝 Create New Quotation", icon: FileText },
  { value: "/quotations", label: "📋 Quotations Register", icon: FileText },
  { value: "/orders/new", label: "🧾 Create Tax Invoice / Bill", icon: FileText },
  { value: "/orders", label: "📦 Sales Orders & Invoices", icon: FileText },
  { value: "/customers/new", label: "👤 Add New Customer / Party", icon: Users },
  { value: "/customers", label: "👥 Customers Directory", icon: Users },
  { value: "/products/new", label: "📦 Add New Product / Article", icon: Package },
  { value: "/products", label: "🏷️ Inventory & Catalog", icon: Package },
  { value: "/leads", label: "🎯 Leads CRM & Pipeline", icon: Users },
  { value: "/expenses", label: "💸 Business Expenses & Petty Cash", icon: Wallet },
  { value: "/attendance", label: "⏱️ Mark Staff Attendance", icon: Clock },
  { value: "/payroll", label: "💼 Payroll & Salary Slips", icon: Wallet },
  { value: "/transfers/new", label: "🚚 Godown Stock Transfer", icon: Truck },
  { value: "/gst-filing", label: "📑 GST Portal Filing (1/3B/2B)", icon: FileText },
  { value: "/eway-bills", label: "📜 E-Way Bills Register", icon: Truck },
  { value: "/delivery-challans", label: "📄 Delivery Challans / Dispatches", icon: Truck },
  { value: "/calls", label: "📞 Telecaller Calls & Recordings", icon: PhoneCall },
  { value: "/production", label: "🏭 Production & Job Orders", icon: Factory },
  { value: "/reports", label: "📊 Reports & Analytics", icon: BarChart3 },
];

export interface LearnedRuleItem {
  id?: string;
  phrase: string;
  action: "NAVIGATE" | "EXPLAIN" | "ADD_QUOTATION_ITEM";
  route?: string;
  actionLabel?: string;
  response?: string;
  useCount?: number;
}

interface LearningModePanelProps {
  initialPhrase?: string;
  onRuleTrained?: (rule: LearnedRuleItem) => void;
  onSwitchToCopilot?: () => void;
}

export default function LearningModePanel({
  initialPhrase = "",
  onRuleTrained,
  onSwitchToCopilot
}: LearningModePanelProps) {
  const [spokenPhrase, setSpokenPhrase] = useState(initialPhrase);
  const [actionType, setActionType] = useState<"NAVIGATE" | "EXPLAIN">("NAVIGATE");
  const [selectedRoute, setSelectedRoute] = useState("/settings/roles");
  const [customResponse, setCustomResponse] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [learnedRules, setLearnedRules] = useState<LearnedRuleItem[]>([]);

  // Load existing learned rules from localStorage + Database
  useEffect(() => {
    try {
      const stored = localStorage.getItem("heart_learned_rules");
      if (stored) {
        setLearnedRules(JSON.parse(stored));
      }
    } catch {}

    async function loadDbRules() {
      try {
        const res = await getVoiceLearningRules();
        if (res.success && res.rules && res.rules.length > 0) {
          const formatted: LearnedRuleItem[] = res.rules.map(r => ({
            id: r.id,
            phrase: r.spokenPhrase,
            action: r.resolvedAction as any,
            route: (r.resolvedData as any)?.route,
            actionLabel: (r.resolvedData as any)?.actionLabel || (r.resolvedData as any)?.route,
            response: (r.resolvedData as any)?.response,
            useCount: r.useCount
          }));

          setLearnedRules(prev => {
            const combined = [...prev];
            for (const item of formatted) {
              if (!combined.some(c => c.phrase.toLowerCase() === item.phrase.toLowerCase())) {
                combined.push(item);
              }
            }
            return combined;
          });
        }
      } catch (e) {
        console.warn("Could not load DB rules:", e);
      }
    }

    loadDbRules();
  }, []);

  // Update phrase if passed via prop
  useEffect(() => {
    if (initialPhrase) {
      setSpokenPhrase(initialPhrase);
    }
  }, [initialPhrase]);

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhrase = spokenPhrase.trim();
    if (!cleanPhrase) {
      setErrorMsg("Please enter the spoken phrase (e.g., 'password change', 'naya order').");
      return;
    }

    setIsSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    const routeObj = ERP_ROUTE_OPTIONS.find(r => r.value === selectedRoute);
    const actionLabel = routeObj ? routeObj.label.replace(/^.*? /, '') : selectedRoute;
    const defaultResp = actionType === "NAVIGATE"
      ? `Opening ${actionLabel}. Here is the screen you requested.`
      : customResponse || `Guidance for ${cleanPhrase}`;

    const newRule: LearnedRuleItem = {
      phrase: cleanPhrase,
      action: actionType,
      route: actionType === "NAVIGATE" ? selectedRoute : undefined,
      actionLabel: actionLabel,
      response: customResponse.trim() || defaultResp,
      useCount: 1
    };

    // 1. Save locally to localStorage for immediate zero-latency execution
    try {
      const current = JSON.parse(localStorage.getItem("heart_learned_rules") || "[]");
      const filtered = current.filter((r: any) => r.phrase.toLowerCase() !== cleanPhrase.toLowerCase());
      filtered.unshift(newRule);
      localStorage.setItem("heart_learned_rules", JSON.stringify(filtered));
      setLearnedRules(filtered);
    } catch {}

    // 2. Save to organization database
    try {
      await saveVoiceLearningRule({
        spokenPhrase: cleanPhrase,
        resolvedAction: actionType,
        resolvedData: {
          route: newRule.route,
          actionLabel: newRule.actionLabel,
          response: newRule.response
        },
        category: "ACTION"
      });
    } catch (e) {
      console.warn("Notice: Saved locally to browser cache.", e);
    }

    setIsSaving(false);
    setSuccessMsg(`Learned! Whenever you say "${cleanPhrase}", Heart will ${actionType === "NAVIGATE" ? `open ${actionLabel}` : "explain this action"}.`);
    setSpokenPhrase("");
    setCustomResponse("");
    onRuleTrained?.(newRule);
  };

  const handleDeleteRule = async (phraseToDelete: string, id?: string) => {
    try {
      const updated = learnedRules.filter(r => r.phrase !== phraseToDelete);
      setLearnedRules(updated);
      localStorage.setItem("heart_learned_rules", JSON.stringify(updated));
      if (id) {
        await deleteVoiceLearningRule(id);
      }
    } catch {}
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%", overflowY: "auto", padding: "4px" }}>
      {/* Learning Mode Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
          border: "1px solid #a7f3d0",
          borderRadius: "12px",
          padding: "14px 16px",
          display: "flex",
          alignItems: "flex-start",
          gap: "12px"
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            backgroundColor: "#10b981",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}
        >
          <Sparkles size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#065f46", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>Train Heart Agent (Software Learning Mode)</span>
            <span style={{ fontSize: "0.68rem", backgroundColor: "#d1fae5", color: "#047857", padding: "1px 7px", borderRadius: "6px", fontWeight: 700 }}>
              Bilingual (Hindi + English)
            </span>
          </div>
          <p style={{ margin: "3px 0 0 0", fontSize: "0.78rem", color: "#047857", lineHeight: 1.4 }}>
            Teach Heart custom phrases in English or Hindi (e.g. <em>&quot;password badlo&quot;</em>, <em>&quot;mera quotation&quot;</em>, <em>&quot;new buyer&quot;</em>). Heart will learn and execute the exact task every time.
          </p>
        </div>
      </div>

      {/* Training Card Form */}
      <form
        onSubmit={handleSaveRule}
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
        }}
      >
        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
          <Plus size={16} color="#10b981" />
          <span>Teach a New Command or Custom Phrase</span>
        </div>

        {errorMsg && (
          <div style={{ padding: "8px 12px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <AlertCircle size={14} /> {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ padding: "8px 12px", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", color: "#065f46", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle2 size={16} color="#059669" /> {successMsg}
          </div>
        )}

        {/* 1. Spoken Phrase */}
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
            WHEN I SAY (ENGLISH, HINDI, OR HINGLISH):
          </label>
          <input
            type="text"
            value={spokenPhrase}
            onChange={e => setSpokenPhrase(e.target.value)}
            placeholder="e.g. 'password badlo', 'change password', 'nayi party', 'aaj ki sale'..."
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "0.84rem",
              outline: "none",
              color: "#1e293b",
              backgroundColor: "#f8fafc"
            }}
            required
          />
        </div>

        {/* 2. Action Type */}
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
              WHAT SHOULD HEART DO?
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setActionType("NAVIGATE")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: actionType === "NAVIGATE" ? "1.5px solid #10b981" : "1px solid #cbd5e1",
                  backgroundColor: actionType === "NAVIGATE" ? "#ecfdf5" : "#ffffff",
                  color: actionType === "NAVIGATE" ? "#065f46" : "#475569",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <Navigation size={14} />
                <span>Open Screen / Initiate Task</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType("EXPLAIN")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: actionType === "EXPLAIN" ? "1.5px solid #10b981" : "1px solid #cbd5e1",
                  backgroundColor: actionType === "EXPLAIN" ? "#ecfdf5" : "#ffffff",
                  color: actionType === "EXPLAIN" ? "#065f46" : "#475569",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <BookOpen size={14} />
                <span>Explain / Speak Answer</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Target Screen Dropdown (If Navigate) */}
        {actionType === "NAVIGATE" && (
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
              TARGET ERP SCREEN:
            </label>
            <select
              value={selectedRoute}
              onChange={e => setSelectedRoute(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.82rem",
                color: "#1e293b",
                backgroundColor: "#ffffff",
                outline: "none"
              }}
            >
              {ERP_ROUTE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.value})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 4. Custom Response / Speech */}
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
            SPOKEN RESPONSE & CONFIRMATION (OPTIONAL):
          </label>
          <input
            type="text"
            value={customResponse}
            onChange={e => setCustomResponse(e.target.value)}
            placeholder={
              actionType === "NAVIGATE"
                ? "e.g. 'Opening password settings. You can set your new password here.'"
                : "e.g. 'To change your password, open Settings > Users and click the key icon.'"
            }
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "0.82rem",
              outline: "none",
              color: "#1e293b",
              backgroundColor: "#f8fafc"
            }}
          />
        </div>

        {/* Submit Button */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
          <button
            type="submit"
            disabled={isSaving}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              backgroundColor: "#059669",
              color: "#ffffff",
              border: "none",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: isSaving ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 3px rgba(5, 150, 105, 0.3)"
            }}
          >
            <Sparkles size={14} />
            <span>{isSaving ? "Teaching Heart..." : "Save & Train Heart"}</span>
          </button>
        </div>
      </form>

      {/* Learned Rules List */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
            Trained Commands & Custom Rules ({learnedRules.length})
          </div>
          {onSwitchToCopilot && (
            <button
              type="button"
              onClick={onSwitchToCopilot}
              style={{
                background: "none",
                border: "none",
                color: "#2563eb",
                fontSize: "0.74rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px"
              }}
            >
              <span>Test in Copilot</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>

        {learnedRules.length === 0 ? (
          <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontSize: "0.78rem" }}>
            No custom rules trained yet. Train your first command above!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {learnedRules.map((r, idx) => (
              <div
                key={r.id || idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  fontSize: "0.78rem"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>&quot;{r.phrase}&quot;</span>
                  <ArrowRight size={12} color="#94a3b8" />
                  <span
                    style={{
                      fontSize: "0.7rem",
                      backgroundColor: r.action === "NAVIGATE" ? "#eff6ff" : "#ecfdf5",
                      color: r.action === "NAVIGATE" ? "#1d4ed8" : "#047857",
                      padding: "2px 7px",
                      borderRadius: "6px",
                      fontWeight: 600
                    }}
                  >
                    {r.action === "NAVIGATE" ? `Opens ${r.actionLabel || r.route}` : "Explains Answer"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteRule(r.phrase, r.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    padding: "4px"
                  }}
                  title="Delete this learned rule"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
