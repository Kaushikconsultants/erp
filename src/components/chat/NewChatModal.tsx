"use client";

import React, { useState, useEffect } from "react";
import { getTeamDirectoryForChat } from "@/app/actions/chatActions";
import { Users, Search, MessageSquare, Circle, X } from "lucide-react";
import "@/components/ui/modal.css";

interface NewChatModalProps {
  onClose: () => void;
  onSelectUser: (user: any) => void;
}

export default function NewChatModal({ onClose, onSelectUser }: NewChatModalProps) {
  const [loading, setLoading] = useState(true);
  const [directory, setDirectory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function load() {
      const res = await getTeamDirectoryForChat();
      if (res.success && res.directory) {
        setDirectory(res.directory);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = directory.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.designation.toLowerCase().includes(q)
    );
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content glass-panel animate-in"
        style={{ width: "100%", maxWidth: "480px", maxHeight: "80vh", display: "flex", flexDirection: "column", padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc", borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <MessageSquare size={20} color="#4f46e5" />
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Start a New Conversation
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "1.4rem", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#ffffff" }}>
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search colleague by name, department, role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px 8px 32px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                outline: "none",
                backgroundColor: "#f8fafc",
              }}
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
          {loading ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
              Loading team directory...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
              No colleagues found matching &quot;{searchTerm}&quot;
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {filtered.map((user) => {
                const presence = user.presence;
                return (
                  <div
                    key={user.id}
                    onClick={() => onSelectUser(user)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      border: "1px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#eff6ff";
                      e.currentTarget.style.borderColor = "#c7d2fe";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.borderColor = "transparent";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ position: "relative" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#4f46e5", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem" }}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
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
                        />
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>{user.name}</span>
                          <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "1px 6px", borderRadius: "4px", backgroundColor: "#f1f5f9", color: "#475569" }}>
                            {user.department}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: presence.color, display: "flex", alignItems: "center", gap: "4px", marginTop: "1px" }}>
                          <Circle size={6} fill={presence.color} color={presence.color} />
                          <span>{presence.label}</span>
                          <span style={{ color: "#94a3b8" }}>• {presence.lastSeen}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      style={{
                        padding: "5px 12px",
                        borderRadius: "6px",
                        border: "1px solid #c7d2fe",
                        backgroundColor: "#eef2ff",
                        color: "#4f46e5",
                        fontWeight: 600,
                        fontSize: "0.78rem",
                        cursor: "pointer",
                      }}
                    >
                      Chat
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
