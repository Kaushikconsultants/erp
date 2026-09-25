"use client";

import React, { useState } from "react";
import { Mic, Sparkles, CheckCircle2, Volume2, ArrowRight } from "lucide-react";

export default function VoiceAiDemoWidget() {
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  const prompts = [
    {
      speech: "Create sales order for 50 boxes of Cotton Fabric at ₹1,200 for Sharma Textiles.",
      parsed: {
        action: "CREATE_SALES_ORDER",
        customer: "Sharma Textiles",
        items: [{ item: "Cotton Fabric", qty: "50 Boxes", rate: "₹1,200/box" }],
        taxRate: "5% GST",
        total: "₹63,000",
        status: "Draft Order Ready for 1-Click WhatsApp Dispatch",
      },
    },
    {
      speech: "Show all pending PDCs clearing between today and Friday.",
      parsed: {
        action: "QUERY_PDC_VAULT",
        count: 4,
        totalValue: "₹4,82,500",
        banks: ["HDFC Bank", "ICICI Bank", "SBI"],
        status: "Alerts Dispatched to Accounts Head",
      },
    },
    {
      speech: "Generate 1-click e-Way bill for dispatch DC-1049 via Shipmozo courier.",
      parsed: {
        action: "GENERATE_EWAY_BILL",
        document: "DC-1049",
        transporter: "Shipmozo Express",
        distanceKm: "284 km",
        status: "IRN & e-Way Bill Active • Tracking Link Created",
      },
    },
  ];

  const handleSelectPrompt = (index: number) => {
    setIsSimulating(true);
    setActivePromptIndex(index);
    setTimeout(() => {
      setIsSimulating(false);
    }, 500);
  };

  const current = prompts[activePromptIndex];

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "20px",
        border: "1px solid #e2e8f0",
        padding: "24px",
        boxShadow: "0 10px 30px -5px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
            }}
          >
            <Mic size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>Interactive Voice AI Engine</div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Natural Language to ERP Transaction</div>
          </div>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 10px",
            background: "#ecfdf5",
            borderRadius: "20px",
            fontSize: "0.75rem",
            color: "#059669",
            fontWeight: 700,
            border: "1px solid #a7f3d0",
          }}
        >
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
          Online Copilot
        </div>
      </div>

      {/* Prompt Selector Pills */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "18px" }}>
        {prompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSelectPrompt(idx)}
            style={{
              background: activePromptIndex === idx ? "#eef2ff" : "#f8fafc",
              border: activePromptIndex === idx ? "1px solid #6366f1" : "1px solid #e2e8f0",
              borderRadius: "9999px",
              padding: "6px 14px",
              fontSize: "0.775rem",
              fontWeight: 600,
              color: activePromptIndex === idx ? "#4f46e5" : "#64748b",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Demo #{idx + 1}
          </button>
        ))}
      </div>

      {/* Captured Voice Speech Display */}
      <div
        style={{
          background: "#f8fafc",
          borderRadius: "14px",
          padding: "16px",
          border: "1px solid #e2e8f0",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <Volume2 size={16} color="#4f46e5" />
          <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
            Voice Audio Input
          </span>
        </div>
        <p style={{ fontSize: "0.95rem", color: "#1e293b", fontStyle: "italic", lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
          &ldquo;{current.speech}&rdquo;
        </p>
      </div>

      {/* AI Parsed Live Result */}
      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "14px",
          padding: "16px",
          opacity: isSimulating ? 0.4 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.825rem", color: "#166534", fontWeight: 800 }}>
            <Sparkles size={14} /> AI Parsed Transaction
          </div>
          <span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
            <CheckCircle2 size={13} /> 99.8% Match
          </span>
        </div>

        <div style={{ fontSize: "0.825rem", color: "#334155", lineHeight: 1.6 }}>
          <div><strong>Action:</strong> <span style={{ color: "#4f46e5", fontWeight: 700 }}>{current.parsed.action}</span></div>
          {"customer" in current.parsed && <div><strong>Party:</strong> {current.parsed.customer}</div>}
          {"total" in current.parsed && <div><strong>Estimated Value:</strong> <span style={{ color: "#059669", fontWeight: 800 }}>{current.parsed.total}</span></div>}
          {"count" in current.parsed && <div><strong>Cheques Found:</strong> {current.parsed.count} ({current.parsed.totalValue})</div>}
          {"document" in current.parsed && <div><strong>Doc Ref:</strong> {current.parsed.document}</div>}
          <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: "1px dashed #cbd5e1", color: "#64748b" }}>
            <strong>Output:</strong> {current.parsed.status}
          </div>
        </div>
      </div>
    </div>
  );
}
