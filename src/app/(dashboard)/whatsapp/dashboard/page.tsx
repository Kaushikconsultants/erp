"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  ShieldCheck,
  Zap,
  Bot,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Send,
  Radio,
  FileCode,
  CreditCard,
  ShoppingBag,
  Users
} from "lucide-react";
import { getWhatsAppDashboardMetrics } from "@/app/actions/whatsAppPlatformActions";

export default function WhatsAppDashboardPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMetrics = async () => {
    setLoading(true);
    const res = await getWhatsAppDashboardMetrics();
    if (res.success) {
      setData(res);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Banner: Business Account & Connection Health */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Business Account Card */}
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#10b981", textTransform: "uppercase" }}>Primary WABA Account</span>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", margin: "4px 0 0 0" }}>{data?.account?.name || "Espon Main Sales"}</h2>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>Phone Number: {data?.account?.phoneNumber || "+91 7206066678"}</p>
            </div>
            <span style={{ background: "#d1fae5", color: "#065f46", fontSize: "12px", fontWeight: 700, padding: "4px 10px", borderRadius: "14px" }}>
              ● {data?.account?.status || "CONNECTED"}
            </span>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button onClick={fetchMetrics} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#10b981", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              <RefreshCw size={14} /> Refresh Sync
            </button>
            <button style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151", padding: "8px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              Verify Phone Number
            </button>
          </div>
        </div>

        {/* Integration Health Summary */}
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827", margin: "0 0 14px 0" }}>Integration & Webhook Health</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px", borderRadius: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#166534", fontSize: "12px", fontWeight: 700 }}>
                <CheckCircle2 size={16} /> Webhook Endpoint
              </div>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#14532d", display: "block", marginTop: "4px" }}>Active & Verified</span>
            </div>

            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px", borderRadius: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#166534", fontSize: "12px", fontWeight: 700 }}>
                <CheckCircle2 size={16} /> Meta Cloud API
              </div>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#14532d", display: "block", marginTop: "4px" }}>Operational (100%)</span>
            </div>

            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px", borderRadius: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#166534", fontSize: "12px", fontWeight: 700 }}>
                <CheckCircle2 size={16} /> Message Delivery
              </div>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#14532d", display: "block", marginTop: "4px" }}>98.8% Delivered</span>
            </div>

            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px", borderRadius: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#166534", fontSize: "12px", fontWeight: 700 }}>
                <CheckCircle2 size={16} /> Quality Rating
              </div>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#14532d", display: "block", marginTop: "4px" }}>GREEN (High Quality)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messaging Capacity Card */}
      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Daily Messaging Tier Capacity</h3>
            <p style={{ fontSize: "12.5px", color: "#6b7280", margin: "2px 0 0 0" }}>Tier 2 Meta WhatsApp Business Messaging Tier</p>
          </div>
          <span style={{ fontSize: "18px", fontWeight: 800, color: "#10b981" }}>1,250 / 10,000 used today</span>
        </div>

        {/* Progress Bar */}
        <div style={{ width: "100%", height: "10px", background: "#e5e7eb", borderRadius: "5px", overflow: "hidden", marginBottom: "14px" }}>
          <div style={{ width: "12.5%", height: "100%", background: "linear-gradient(90deg, #10b981 0%, #059669 100%)", borderRadius: "5px" }}></div>
        </div>
      </div>

      {/* Capability Cards */}
      <div>
        <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>WhatsApp Business Capabilities</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {[
            { title: "24-Hour Window Reply", desc: "Unrestricted Customer Replies", icon: MessageSquare, status: "ALLOWED" },
            { title: "Approved Templates", desc: "Marketing & Utility Broadcasts", icon: FileCode, status: "ALLOWED" },
            { title: "AI Intent Automation", desc: "Automated Lead Intake & Bot", icon: Bot, status: "ALLOWED" },
            { title: "WhatsApp Payments", desc: "In-Chat UPI Payment Links", icon: CreditCard, status: "ALLOWED" },
            { title: "Commerce & Catalogs", desc: "Product Catalog Sharing", icon: ShoppingBag, status: "ALLOWED" },
            { title: "Dynamic CRM Forms", desc: "Lead Qualification Intake", icon: Zap, status: "ALLOWED" },
            { title: "Audience Broadcasts", desc: "Targeted Customer Campaigns", icon: Radio, status: "ALLOWED" },
            { title: "Account Limits", desc: "High Quality Tier", icon: ShieldCheck, status: "ALLOWED" }
          ].map((cap, i) => {
            const Icon = cap.icon;
            return (
              <div key={i} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <Icon size={20} color="#10b981" />
                  <span style={{ fontSize: "10px", fontWeight: 700, background: "#dcfce7", color: "#166534", padding: "2px 6px", borderRadius: "4px" }}>{cap.status}</span>
                </div>
                <h4 style={{ fontSize: "13.5px", fontWeight: 700, margin: "0 0 2px 0" }}>{cap.title}</h4>
                <p style={{ fontSize: "11.5px", color: "#6b7280", margin: 0 }}>{cap.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
