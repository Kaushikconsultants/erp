"use client";

import React, { useState } from "react";
import { GitFork, Plus, Play, CheckCircle, ArrowRight, Bot, Users, Database, FileText } from "lucide-react";

export default function WhatsAppChatbotBuilderPage() {
  const [nodes, setNodes] = useState([
    { id: "1", type: "START", title: "1. Customer Hello / Entry Trigger", details: "Keyword: HI, HELLO, CATALOG, PRICING" },
    { id: "2", type: "QUESTION", title: "2. Inquiry Category Buttons", details: "Options: [Wholesale Catalog] [Check Order Status] [Speak with Sales]" },
    { id: "3", type: "CATALOG", title: "3. Send Product Catalog PDF", details: "Action: Send 2026 Wholesale Apparel Catalog Link" },
    { id: "4", type: "CRM_ACTION", title: "4. Create CRM Lead & Assign Salesperson", details: "Action: Tag 'Hot Lead' + Round-Robin Employee Assignment" }
  ]);

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Visual No-Code Chatbot Flow Builder</h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>Build interactive WhatsApp conversational bots with automatic CRM lead intake & agent handover.</p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f3f4f6", border: "1px solid #d1d5db", padding: "8px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            <Plus size={16} /> Add Node
          </button>
          <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "#10b981", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            <Play size={16} /> Publish Bot Flow
          </button>
        </div>
      </div>

      {/* Visual Node Flow Visualizer */}
      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px", minHeight: "400px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
          {nodes.map((node, i) => (
            <React.Fragment key={node.id}>
              <div style={{ width: "420px", background: "#fafafa", border: "2px solid #10b981", borderRadius: "10px", padding: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "4px" }}>
                    {node.type} NODE
                  </span>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>Step {i + 1}</span>
                </div>
                <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#111827", margin: "0 0 4px 0" }}>{node.title}</h4>
                <p style={{ fontSize: "12px", color: "#4b5563", margin: 0 }}>{node.details}</p>
              </div>

              {i < nodes.length - 1 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#10b981" }}>
                  <div style={{ width: "2px", height: "20px", background: "#10b981" }}></div>
                  <ArrowRight size={18} style={{ transform: "rotate(90deg)" }} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
