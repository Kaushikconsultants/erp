"use client";

import React, { useState } from "react";
import { Users2, UserCheck, Clock, CheckCircle2, Sliders } from "lucide-react";

export default function WhatsAppTeamInboxPage() {
  const [routingMethod, setRoutingMethod] = useState("ROUND_ROBIN");

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Team Inbox & Intelligent Workload Routing</h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>Manage employee assignments, response times, workload distribution & SLA monitoring.</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12.5px", fontWeight: 700 }}>Routing Rule:</span>
          <select value={routingMethod} onChange={(e) => setRoutingMethod(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}>
            <option value="ROUND_ROBIN">Round Robin</option>
            <option value="LEAST_ASSIGNED">Least Assigned</option>
            <option value="LOCATION_BASED">Location Based</option>
          </select>
        </div>
      </div>

      {/* Team Leaderboard Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
        {[
          { name: "Ikra (Senior Sales Executive)", role: "Sales Lead", activeChats: 14, avgResponse: "2.4 min", resolution: "96%", sales: "₹14,50,000" },
          { name: "Rahul Sharma", role: "Sales Representative", activeChats: 8, avgResponse: "3.1 min", resolution: "92%", sales: "₹8,90,000" },
          { name: "Pooja Verma", role: "Customer Support Executive", activeChats: 5, avgResponse: "1.8 min", resolution: "98%", sales: "₹4,20,000" }
        ].map((emp, idx) => (
          <div key={idx} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
              <div>
                <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#111827", margin: 0 }}>{emp.name}</h4>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>{emp.role}</span>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, background: "#dcfce7", color: "#166534", padding: "2px 6px", borderRadius: "4px" }}>Active</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px", background: "#fafafa", padding: "10px", borderRadius: "6px" }}>
              <div>
                <span style={{ fontSize: "10.5px", color: "#6b7280", display: "block" }}>Active Chats</span>
                <strong style={{ fontSize: "14px", color: "#111827" }}>{emp.activeChats}</strong>
              </div>
              <div>
                <span style={{ fontSize: "10.5px", color: "#6b7280", display: "block" }}>Avg Response</span>
                <strong style={{ fontSize: "14px", color: "#10b981" }}>{emp.avgResponse}</strong>
              </div>
              <div>
                <span style={{ fontSize: "10.5px", color: "#6b7280", display: "block" }}>SLA Resolution</span>
                <strong style={{ fontSize: "14px", color: "#2563eb" }}>{emp.resolution}</strong>
              </div>
              <div>
                <span style={{ fontSize: "10.5px", color: "#6b7280", display: "block" }}>Sales Generated</span>
                <strong style={{ fontSize: "14px", color: "#059669" }}>{emp.sales}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
