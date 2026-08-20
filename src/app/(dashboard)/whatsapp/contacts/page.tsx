"use client";

import React, { useState, useEffect } from "react";
import { Users, Search, MessageSquare, Phone, Tag, Building, MapPin } from "lucide-react";
import { getWhatsAppConversations } from "@/app/actions/whatsAppPlatformActions";

export default function WhatsAppContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getWhatsAppConversations({ search }).then((res) => {
      if (res.success && res.conversations) {
        setContacts(res.conversations.map((c) => c.customer));
      }
    });
  }, [search]);

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>WhatsApp Contacts & Synchronized CRM Directory</h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>All WhatsApp numbers automatically link to unified 360° CRM profiles.</p>
        </div>
        <div style={{ position: "relative", width: "300px" }}>
          <Search size={16} style={{ position: "absolute", left: "10px", top: "10px", color: "#9ca3af" }} />
          <input
            type="text"
            placeholder="Search contacts by name, phone, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px", outline: "none" }}
          />
        </div>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", color: "#4b5563", fontWeight: 700 }}>
              <th style={{ padding: "12px 16px" }}>Customer / Company</th>
              <th style={{ padding: "12px 16px" }}>WhatsApp Number</th>
              <th style={{ padding: "12px 16px" }}>Location</th>
              <th style={{ padding: "12px 16px" }}>Type</th>
              <th style={{ padding: "12px 16px" }}>CRM Stage</th>
              <th style={{ padding: "12px 16px" }}>Total Purchases</th>
              <th style={{ padding: "12px 16px" }}>Tags</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "20px", textAlign: "center", color: "#9ca3af" }}>No contacts found</td>
              </tr>
            ) : (
              contacts.map((c, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 700, color: "#111827" }}>{c?.businessName || c?.contactPerson}</div>
                    <div style={{ fontSize: "11.5px", color: "#6b7280" }}>{c?.contactPerson}</div>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#059669", fontWeight: 600 }}>+91 {c?.mobile}</td>
                  <td style={{ padding: "12px 16px", color: "#4b5563" }}>{c?.city || "Surat"}, {c?.state || "Gujarat"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, background: "#e0e7ff", color: "#3730a3", padding: "2px 6px", borderRadius: "4px" }}>
                      {c?.customerType || "Wholesaler"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, background: "#dcfce7", color: "#166534", padding: "2px 6px", borderRadius: "4px" }}>
                      {c?.leadStage || "New Lead"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: "#111827" }}>
                    ₹{(c?.totalPurchaseValue || 0).toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: "11px", color: "#6b7280", background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px" }}>
                      {c?.tags || "Hot Lead"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
