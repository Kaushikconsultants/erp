"use client";

import React, { useState } from "react";
import { PieChart, TrendingUp, Clock, CheckCircle2, Bot, Users, DollarSign, BarChart2 } from "lucide-react";

export default function WhatsAppAnalyticsPage() {
  const [range, setRange] = useState("30d");

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>WhatsApp CRM Intelligence & SLA Analytics</h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>Comprehensive response time, SLA compliance, AI resolution rates & revenue conversion metrics.</p>
        </div>

        <select value={range} onChange={(e) => setRange(e.target.value)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Quarter to Date</option>
        </select>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "16px" }}>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>First Response Time</span>
          <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#10b981", margin: "4px 0 0 0" }}>2.1 mins</h3>
          <span style={{ fontSize: "11px", color: "#059669", fontWeight: 600 }}>98.4% Within SLA (Green)</span>
        </div>
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "16px" }}>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>AI Resolution Rate</span>
          <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#8b5cf6", margin: "4px 0 0 0" }}>64.2%</h3>
          <span style={{ fontSize: "11px", color: "#6b7280" }}>Handled automatically by AI</span>
        </div>
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "16px" }}>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>Message Read Rate</span>
          <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#3b82f6", margin: "4px 0 0 0" }}>94.8%</h3>
          <span style={{ fontSize: "11px", color: "#2563eb" }}>High Engagement</span>
        </div>
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "16px" }}>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>Total WhatsApp Revenue</span>
          <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#059669", margin: "4px 0 0 0" }}>₹24,80,000</h3>
          <span style={{ fontSize: "11px", color: "#059669" }}>34 Closed Orders</span>
        </div>
      </div>

      {/* AI vs Human Breakdown Visualizer */}
      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 14px 0" }}>AI vs Human Agent Conversation Breakdown</h3>
        <div style={{ display: "flex", gap: "20px" }}>
          <div style={{ flex: 1, background: "#f5f3ff", border: "1px solid #ddd6fe", padding: "16px", borderRadius: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6d28d9", fontWeight: 700 }}>
              <Bot size={20} /> AI Agent Handled (64%)
            </div>
            <p style={{ fontSize: "13px", color: "#4c1d95", margin: "6px 0 0 0" }}>1,420 Conversations qualified, catalogs shared & FAQs answered without human intervention.</p>
          </div>

          <div style={{ flex: 1, background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "16px", borderRadius: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#15803d", fontWeight: 700 }}>
              <Users size={20} /> Human Agent Handled (36%)
            </div>
            <p style={{ fontSize: "13px", color: "#14532d", margin: "6px 0 0 0" }}>810 High-value negotiations, custom quotation creation & complex sales closures.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
