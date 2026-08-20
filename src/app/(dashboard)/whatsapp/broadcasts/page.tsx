"use client";

import React, { useState } from "react";
import { Radio, Send, Users, FileCode, CheckCircle2 } from "lucide-react";
import { createWhatsAppBroadcastCampaign } from "@/app/actions/whatsAppPlatformActions";

export default function WhatsAppBroadcastsPage() {
  const [campaignName, setCampaignName] = useState("Festive Season Wholesale Offer");
  const [segment, setSegment] = useState("High Value Wholesalers (Surat & Gujarat)");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLaunchBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await createWhatsAppBroadcastCampaign({
      name: campaignName,
      templateId: "festive_wholesale_launch",
      totalAudience: 420
    });
    if (res.success) {
      setStatus(`Broadcast Campaign "${campaignName}" launched to 420 contacts! Tracking real-time delivery.`);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "700px" }}>
      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <Radio size={24} color="#10b981" />
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Create WhatsApp Audience Broadcast</h2>
        </div>

        {status && (
          <div style={{ background: "#dcfce7", border: "1px solid #86efac", color: "#166534", padding: "12px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={18} />
            <span>{status}</span>
          </div>
        )}

        <form onSubmit={handleLaunchBroadcast} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px" }}>Broadcast Campaign Name</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", outline: "none" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px" }}>Target Audience Segment</label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px" }}
            >
              <option value="High Value Wholesalers (Surat & Gujarat)">High Value Wholesalers (420 Contacts)</option>
              <option value="Pending Payment Customers">Pending Payment Customers (85 Contacts)</option>
              <option value="Inactive 90 Days">Inactive 90 Days Buyers (310 Contacts)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 700, display: "block", marginBottom: "6px" }}>Approved Template</label>
            <select style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px" }}>
              <option value="festive_wholesale_launch">festive_wholesale_launch (Marketing Approved)</option>
              <option value="order_confirmation_v2">order_confirmation_v2 (Utility Approved)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#10b981", color: "#ffffff", border: "none", padding: "12px", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
          >
            <Send size={16} />
            <span>{loading ? "Launching Broadcast..." : "Launch WhatsApp Broadcast"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
