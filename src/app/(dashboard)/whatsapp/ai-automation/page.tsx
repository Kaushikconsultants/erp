"use client";

import React, { useState } from "react";
import { Bot, Zap, CheckCircle2, Sliders, ShieldAlert, Cpu, UserCheck, Tag } from "lucide-react";

export default function WhatsAppAIAutomationPage() {
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(85);
  const [autoQualify, setAutoQualify] = useState<boolean>(true);
  const [autoCatalog, setAutoCatalog] = useState<boolean>(true);
  const [autoAssign, setAutoAssign] = useState<boolean>(true);

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#ede9fe", color: "#6d28d9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>AI Intent Recognition & Auto Response Engine</h2>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>Automatically reads incoming WhatsApp messages, classifies customer intent, qualifies leads & syncs with CRM.</p>
          </div>
        </div>

        {/* Confidence Threshold Slider */}
        <div style={{ background: "#fafafa", border: "1px solid #f3f4f6", borderRadius: "10px", padding: "16px", marginTop: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#111827" }}>AI Confidence Score Threshold for Auto-Reply</span>
            <span style={{ fontSize: "14px", fontWeight: 800, color: "#6d28d9" }}>{confidenceThreshold}% Confidence</span>
          </div>
          <input
            type="range"
            min="50"
            max="98"
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
            style={{ width: "100%", accentColor: "#6d28d9" }}
          />
          <p style={{ fontSize: "12px", color: "#6b7280", margin: "6px 0 0 0" }}>
            If AI confidence drops below {confidenceThreshold}%, the conversation is automatically transferred to a human sales rep with a notification.
          </p>
        </div>
      </div>

      {/* Recognized Intents List */}
      <div>
        <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>Recognized Customer Intents & Auto Actions</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
          {[
            { intent: "Product Inquiry", keyword: "t-shirt, catalog, polo, stock", action: "Share 2026 Wholesale PDF Catalog", confidence: "96%" },
            { intent: "Price & Discount Inquiry", keyword: "rate, price, wholesale cost, slab", action: "Share Tiered Price Slab + 5% Cash Discount", confidence: "94%" },
            { intent: "Payment Inquiry", keyword: "pay, bank, upi, payment link", action: "Generate & Send WhatsApp Payment Link", confidence: "98%" },
            { intent: "Order Status Inquiry", keyword: "tracking, awb, dispatch, status", action: "Fetch Live Shipment Status from ERP", confidence: "92%" },
            { intent: "Wholesale Registration", keyword: "gst, bulk, dealer, distributor", action: "Send WhatsApp Onboarding Form + Create Lead", confidence: "90%" },
            { intent: "Escalation / Complaint", keyword: "damaged, refund, wrong size, issue", action: "Transfer to Human Manager immediately", confidence: "88%" }
          ].map((item, i) => (
            <div key={i} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, background: "#f3e8ff", color: "#6b21a8", padding: "2px 6px", borderRadius: "4px" }}>Intent: {item.intent}</span>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#10b981" }}>{item.confidence} Avg</span>
              </div>
              <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 8px 0" }}>Keywords: <code>{item.keyword}</code></p>
              <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#111827", background: "#f9fafb", padding: "8px", borderRadius: "6px" }}>
                Auto Action: {item.action}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
