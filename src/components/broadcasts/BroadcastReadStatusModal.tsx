"use client";

import React, { useState, useEffect } from "react";
import { getBroadcastAudienceReadStatus } from "@/app/actions/broadcastActions";
import { Users, Eye, CheckCircle2, Clock, Search, X, Circle } from "lucide-react";
import "@/components/ui/modal.css";

interface BroadcastReadStatusModalProps {
  broadcastId: string;
  broadcastTitle: string;
  onClose: () => void;
}

export default function BroadcastReadStatusModal({
  broadcastId,
  broadcastTitle,
  onClose,
}: BroadcastReadStatusModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | "READ" | "UNREAD">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    const res = await getBroadcastAudienceReadStatus(broadcastId);
    if (res.success) {
      setData(res);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Live refresh every 4 seconds while modal is open
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [broadcastId]);

  const audience = data?.audience || [];
  const stats = data?.stats || { totalTargeted: 0, readCount: 0, unreadCount: 0, onlineCount: 0, idleCount: 0 };

  const filteredList = audience.filter((m: any) => {
    if (activeTab === "READ" && !m.isRead) return false;
    if (activeTab === "UNREAD" && m.isRead) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content glass-panel animate-in"
        style={{ width: "100%", maxWidth: "600px", maxHeight: "85vh", display: "flex", flexDirection: "column", padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc", borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <Eye size={20} color="#4f46e5" /> Read Receipts & Live Presence
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "460px" }}>
              Notice: <strong>&quot;{broadcastTitle}&quot;</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "1.5rem", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", padding: "14px 20px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#ffffff" }}>
          <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", textAlign: "center" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b" }}>{stats.totalTargeted}</div>
            <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Targeted</div>
          </div>
          <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", textAlign: "center" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#059669" }}>{stats.readCount}</div>
            <div style={{ fontSize: "0.7rem", color: "#047857", fontWeight: 600 }}>✅ Read</div>
          </div>
          <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "#fef2f2", border: "1px solid #fca5a5", textAlign: "center" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#dc2626" }}>{stats.unreadCount}</div>
            <div style={{ fontSize: "0.7rem", color: "#b91c1c", fontWeight: 600 }}>⏳ Unread</div>
          </div>
          <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", textAlign: "center" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              <Circle size={8} fill="#10b981" color="#10b981" /> {stats.onlineCount}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#1d4ed8", fontWeight: 600 }}>🟢 Online Now</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ padding: "12px 20px", display: "flex", gap: "10px", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", gap: "4px", backgroundColor: "#f1f5f9", padding: "3px", borderRadius: "6px" }}>
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              style={{
                padding: "4px 10px",
                borderRadius: "4px",
                border: "none",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                backgroundColor: activeTab === "ALL" ? "#ffffff" : "transparent",
                color: activeTab === "ALL" ? "#0f172a" : "#64748b",
                boxShadow: activeTab === "ALL" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              All ({stats.totalTargeted})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("READ")}
              style={{
                padding: "4px 10px",
                borderRadius: "4px",
                border: "none",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                backgroundColor: activeTab === "READ" ? "#ffffff" : "transparent",
                color: activeTab === "READ" ? "#059669" : "#64748b",
                boxShadow: activeTab === "READ" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              Read ({stats.readCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("UNREAD")}
              style={{
                padding: "4px 10px",
                borderRadius: "4px",
                border: "none",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                backgroundColor: activeTab === "UNREAD" ? "#ffffff" : "transparent",
                color: activeTab === "UNREAD" ? "#dc2626" : "#64748b",
                boxShadow: activeTab === "UNREAD" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              Unread ({stats.unreadCount})
            </button>
          </div>

          <div style={{ position: "relative", flex: 1 }}>
            <Search size={14} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search member..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", padding: "6px 8px 6px 28px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.8rem", outline: "none", backgroundColor: "#ffffff" }}
            />
          </div>
        </div>

        {/* Member List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px" }}>
          {loading ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
              Loading read receipts...
            </div>
          ) : filteredList.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
              No team members match this filter.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {filteredList.map((m: any) => {
                const presence = m.presence;

                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      backgroundColor: m.isRead ? "#ffffff" : "#fefefe",
                    }}
                  >
                    {/* User info & live presence */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ position: "relative" }}>
                        <div style={{ width: "34px", height: "34px", borderRadius: "50%", backgroundColor: "#e0e7ff", color: "#4338ca", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem" }}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        {/* Live Presence indicator dot */}
                        <div
                          style={{
                            position: "absolute",
                            bottom: "-1px",
                            right: "-1px",
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            backgroundColor: presence.color,
                            border: "2px solid #ffffff",
                          }}
                          title={`${presence.label} (${presence.lastSeen})`}
                        />
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>{m.name}</span>
                          <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "1px 6px", borderRadius: "4px", backgroundColor: "#f1f5f9", color: "#475569" }}>
                            {m.department}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: presence.color, display: "flex", alignItems: "center", gap: "4px", marginTop: "1px", fontWeight: 500 }}>
                          <Circle size={6} fill={presence.color} color={presence.color} />
                          <span>{presence.label}</span>
                          <span style={{ color: "#94a3b8" }}>• {presence.lastSeen}</span>
                        </div>
                      </div>
                    </div>

                    {/* Read Status Badge */}
                    <div>
                      {m.isRead ? (
                        <div style={{ textAlign: "right" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", fontWeight: 700, color: "#059669", backgroundColor: "#ecfdf5", padding: "3px 8px", borderRadius: "12px", border: "1px solid #a7f3d0" }}>
                            <CheckCircle2 size={12} /> Read
                          </span>
                          {m.readAt && (
                            <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: "2px" }}>
                              {new Date(m.readAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", fontWeight: 600, color: "#b91c1c", backgroundColor: "#fef2f2", padding: "3px 8px", borderRadius: "12px", border: "1px solid #fca5a5" }}>
                          <Clock size={12} /> Unread
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", backgroundColor: "#f8fafc", borderRadius: "0 0 12px 12px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "7px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
