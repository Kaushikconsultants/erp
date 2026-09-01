"use client";

import React, { useState, useEffect } from "react";
import { 
  Tag, 
  Palmtree, 
  Megaphone, 
  AlertTriangle, 
  Calendar, 
  Info, 
  Pin, 
  MessageSquare, 
  Send, 
  Trash2, 
  Eye, 
  Download, 
  Paperclip, 
  Clock, 
  User as UserIcon, 
  CheckCircle2, 
  Search, 
  Sparkles,
  Image as ImageIcon,
  FileText,
  X
} from "lucide-react";
import { 
  getBroadcasts,
  addBroadcastReply, 
  deleteBroadcast, 
  togglePinBroadcast, 
  markBroadcastAsRead, 
  AttachmentItem 
} from "@/app/actions/broadcastActions";
import CreateBroadcastModal from "./CreateBroadcastModal";
import BroadcastReadStatusModal from "./BroadcastReadStatusModal";

interface BroadcastListClientProps {
  initialBroadcasts: any[];
  currentUserId: string;
  isAdmin: boolean;
  employees: any[];
}

const CATEGORY_MAP: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  OFFER: { label: "Offer of the Day", icon: Tag, color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0" },
  HOLIDAY: { label: "Holiday Notice", icon: Palmtree, color: "#06b6d4", bg: "#ecfeff", border: "#a5f3fc" },
  ANNOUNCEMENT: { label: "Announcement", icon: Megaphone, color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
  URGENT: { label: "Urgent Notice", icon: AlertTriangle, color: "#ef4444", bg: "#fef2f2", border: "#fca5a5" },
  MEETING: { label: "Meeting / Event", icon: Calendar, color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  GENERAL: { label: "General Update", icon: Info, color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
};

export default function BroadcastListClient({
  initialBroadcasts,
  currentUserId,
  isAdmin,
  employees,
}: BroadcastListClientProps) {
  const [broadcasts, setBroadcasts] = useState<any[]>(initialBroadcasts);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [selectedReadStatusBroadcast, setSelectedReadStatusBroadcast] = useState<{ id: string; title: string } | null>(null);

  // Per-broadcast reply input state
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({});
  const [replyAttachments, setReplyAttachments] = useState<Record<string, AttachmentItem[]>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  // Sync if props update
  useEffect(() => {
    setBroadcasts(initialBroadcasts);
  }, [initialBroadcasts]);

  // Live Auto-sync polling every 15 seconds (only when tab is active)
  useEffect(() => {
    let isMounted = true;
    const fetchLatest = async () => {
      if (document.hidden) return;
      try {
        const res = await getBroadcasts();
        if (isMounted && res.success && res.broadcasts) {
          setBroadcasts(res.broadcasts);
        }
      } catch (e) {}
    };

    const interval = setInterval(fetchLatest, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Mark visible broadcasts as read
  useEffect(() => {
    initialBroadcasts.forEach((b) => {
      const alreadyRead = b.reads?.some((r: any) => r.userId === currentUserId);
      if (!alreadyRead) {
        markBroadcastAsRead(b.id);
      }
    });
  }, [initialBroadcasts, currentUserId]);

  const handleReplyChange = (broadcastId: string, text: string) => {
    setReplyTexts((prev) => ({ ...prev, [broadcastId]: text }));
  };

  const handleReplyFileUpload = (broadcastId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const item: AttachmentItem = {
          name: file.name,
          url: reader.result as string,
          type: file.type.startsWith("image/") ? "image" : "document",
          size: file.size,
        };
        setReplyAttachments((prev) => ({
          ...prev,
          [broadcastId]: [...(prev[broadcastId] || []), item],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSendReply = async (broadcastId: string) => {
    const text = replyTexts[broadcastId];
    const attachments = replyAttachments[broadcastId];
    if (!text?.trim() && (!attachments || attachments.length === 0)) return;

    setReplyLoading((prev) => ({ ...prev, [broadcastId]: true }));

    const res = await addBroadcastReply(broadcastId, text || "Sent an attachment", attachments);

    setReplyLoading((prev) => ({ ...prev, [broadcastId]: false }));

    if (res.success && res.reply) {
      setBroadcasts((prev) =>
        prev.map((b) => {
          if (b.id === broadcastId) {
            return {
              ...b,
              replies: [...(b.replies || []), res.reply],
            };
          }
          return b;
        })
      );
      setReplyTexts((prev) => ({ ...prev, [broadcastId]: "" }));
      setReplyAttachments((prev) => ({ ...prev, [broadcastId]: [] }));
      setExpandedReplies((prev) => ({ ...prev, [broadcastId]: true }));
    }
  };

  const handleDelete = async (broadcastId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete broadcast "${title}"?`)) return;
    const res = await deleteBroadcast(broadcastId);
    if (res.success) {
      setBroadcasts((prev) => prev.filter((b) => b.id !== broadcastId));
    }
  };

  const handleTogglePin = async (broadcastId: string) => {
    const res = await togglePinBroadcast(broadcastId);
    if (res.success) {
      setBroadcasts((prev) =>
        prev.map((b) => (b.id === broadcastId ? { ...b, isPinned: res.isPinned } : b))
      );
    }
  };

  const filteredBroadcasts = broadcasts.filter((b) => {
    const matchesTab = activeTab === "ALL" || b.category === activeTab;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm.trim() ||
      b.title.toLowerCase().includes(q) ||
      b.content.toLowerCase().includes(q) ||
      b.author?.name?.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Action Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        {/* Search Bar & Live Sync Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", flex: 1 }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "360px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search notices, daily offers, holidays..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px 10px 36px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.875rem",
                backgroundColor: "#ffffff",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                outline: "none",
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "14px" }}
              >
                ×
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "#059669", backgroundColor: "#ecfdf5", padding: "4px 10px", borderRadius: "12px", border: "1px solid #a7f3d0", fontWeight: 600 }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#10b981", display: "inline-block" }} />
            Live Sync Active (Auto-updating)
          </div>
        </div>

        {/* Admin Compose Button */}
        {isAdmin && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="primary-btn hover-lift"
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", fontSize: "0.875rem", fontWeight: 600 }}
          >
            <Megaphone size={16} /> Create New Broadcast
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", borderBottom: "1px solid #e2e8f0" }}>
        {[
          { key: "ALL", label: "All Notices", icon: Sparkles },
          { key: "OFFER", label: "Offers of the Day", icon: Tag },
          { key: "HOLIDAY", label: "Holiday Notices", icon: Palmtree },
          { key: "ANNOUNCEMENT", label: "Announcements", icon: Megaphone },
          { key: "URGENT", label: "Urgent Notices", icon: AlertTriangle },
          { key: "MEETING", label: "Meetings & Events", icon: Calendar },
        ].map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: isActive ? "#4f46e5" : "transparent",
                color: isActive ? "#ffffff" : "#64748b",
                fontWeight: isActive ? 700 : 500,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              <IconComponent size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Broadcast Feed */}
      {filteredBroadcasts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 16px", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
          <Megaphone size={40} color="#94a3b8" style={{ margin: "0 auto 12px auto" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#334155", margin: 0 }}>No broadcasts found</h3>
          <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "6px" }}>
            {searchTerm ? "Try searching for a different keyword or category." : "There are currently no active announcements on the board."}
          </p>
          {isAdmin && (
            <button
              onClick={() => setIsCreateOpen(true)}
              style={{ marginTop: "14px", padding: "8px 16px", backgroundColor: "#4f46e5", color: "#ffffff", border: "none", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
            >
              + Post First Broadcast
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filteredBroadcasts.map((b) => {
            const cat = CATEGORY_MAP[b.category] || CATEGORY_MAP.GENERAL;
            const CatIcon = cat.icon;
            let attachments: AttachmentItem[] = [];
            if (b.attachments) {
              try {
                attachments = JSON.parse(b.attachments);
              } catch (e) {}
            }

            const replies = b.replies || [];
            const isRepliesExpanded = expandedReplies[b.id] || replies.length <= 2;
            const readCount = b.reads?.length || 0;

            return (
              <div
                key={b.id}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  border: b.isPinned ? "2px solid #f59e0b" : "1px solid #e2e8f0",
                  boxShadow: b.isPinned ? "0 4px 12px rgba(245, 158, 11, 0.08)" : "0 2px 4px rgba(0,0,0,0.02)",
                  overflow: "hidden",
                }}
              >
                {/* Card Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px 20px", borderBottom: "1px solid #f1f5f9", backgroundColor: b.isPinned ? "#fffbeb" : "#ffffff", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flex: 1 }}>
                    <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: cat.bg, color: cat.color, border: `1px solid ${cat.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CatIcon size={18} />
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: "12px", backgroundColor: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}>
                          {cat.label}
                        </span>
                        {b.priority === "URGENT" && (
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: "12px", backgroundColor: "#fee2e2", color: "#b91c1c" }}>
                            🚨 Urgent
                          </span>
                        )}
                        {b.isPinned && (
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: "12px", backgroundColor: "#fef3c7", color: "#b45309", display: "flex", alignItems: "center", gap: "3px" }}>
                            <Pin size={11} /> Pinned
                          </span>
                        )}
                        {b.targetAudience === "SELECTED" && (
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: "12px", backgroundColor: "#e0e7ff", color: "#4338ca" }}>
                            👥 Targeted
                          </span>
                        )}
                      </div>

                      <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                        {b.title}
                      </h3>

                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px", fontSize: "0.78rem", color: "#64748b" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <UserIcon size={12} /> Posted by <strong>{b.author?.name || "Admin"}</strong>
                        </span>
                        <span>•</span>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Clock size={12} /> {new Date(b.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} at {new Date(b.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                        </span>
                        {b.expiresAt && (
                          <>
                            <span>•</span>
                            <span style={{ color: "#d97706", fontWeight: 600 }}>
                              ⏳ Valid until {new Date(b.expiresAt).toLocaleDateString("en-GB")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Admin Controls */}
                  {isAdmin && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => handleTogglePin(b.id)}
                        title={b.isPinned ? "Unpin notice" : "Pin notice"}
                        style={{
                          padding: "6px 8px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: b.isPinned ? "#fef3c7" : "#ffffff",
                          color: b.isPinned ? "#b45309" : "#64748b",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}
                      >
                        <Pin size={13} /> {b.isPinned ? "Unpin" : "Pin"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(b.id, b.title)}
                        title="Delete broadcast"
                        style={{
                          padding: "6px 8px",
                          borderRadius: "6px",
                          border: "1px solid #fca5a5",
                          backgroundColor: "#fef2f2",
                          color: "#ef4444",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Content Body */}
                <div style={{ padding: "18px 20px" }}>
                  <p style={{ margin: 0, fontSize: "0.92rem", color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {b.content}
                  </p>

                  {/* Attachments Section */}
                  {attachments.length > 0 && (
                    <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
                        Attachments ({attachments.length})
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
                        {attachments.map((att, idx) => (
                          <div
                            key={idx}
                            style={{
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              overflow: "hidden",
                              backgroundColor: "#f8fafc",
                            }}
                          >
                            {att.type === "image" ? (
                              <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setEnlargedImage(att.url)}>
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }}
                                />
                                <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.2)", opacity: 0, transition: "opacity 0.2s", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.8rem", fontWeight: 600 }}
                                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                                >
                                  🔍 Click to View
                                </div>
                              </div>
                            ) : (
                              <div style={{ padding: "16px 12px", display: "flex", alignItems: "center", gap: "10px" }}>
                                <FileText size={28} color="#4f46e5" />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {att.name}
                                  </div>
                                  <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Document</span>
                                </div>
                              </div>
                            )}
                            <div style={{ padding: "6px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", backgroundColor: "#ffffff" }}>
                              <span style={{ fontSize: "0.72rem", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "110px" }}>
                                {att.name}
                              </span>
                              <a
                                href={att.url}
                                download={att.name}
                                style={{ color: "#4f46e5", display: "flex", alignItems: "center", gap: "2px", textDecoration: "none", fontSize: "0.72rem", fontWeight: 600 }}
                              >
                                <Download size={12} /> Save
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Read Receipts Badge - Clickable for Admin to inspect live presence & read status */}
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: "12px", fontSize: "0.75rem", color: "#94a3b8" }}>
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => setSelectedReadStatusBroadcast({ id: b.id, title: b.title })}
                        title="Click to view detailed read receipts & live presence status"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          borderRadius: "16px",
                          padding: "3px 10px",
                          color: "#475569",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#e0e7ff";
                          e.currentTarget.style.borderColor = "#818cf8";
                          e.currentTarget.style.color = "#3730a3";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#f1f5f9";
                          e.currentTarget.style.borderColor = "#cbd5e1";
                          e.currentTarget.style.color = "#475569";
                        }}
                      >
                        <Eye size={13} color="#4f46e5" /> <strong>{readCount} viewed</strong> • Check Read Status 📊
                      </button>
                    ) : (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Eye size={13} /> {readCount} team {readCount === 1 ? "member" : "members"} viewed
                      </span>
                    )}
                  </div>
                </div>

                {/* Team Reply Thread Section */}
                <div style={{ backgroundColor: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "14px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
                      <MessageSquare size={15} color="#4f46e5" /> Team Discussion & Replies ({replies.length})
                    </div>
                    {replies.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedReplies((prev) => ({ ...prev, [b.id]: !isRepliesExpanded }))
                        }
                        style={{ background: "none", border: "none", color: "#4f46e5", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                      >
                        {isRepliesExpanded ? "Collapse Replies" : `View all ${replies.length} replies`}
                      </button>
                    )}
                  </div>

                  {/* Replies List */}
                  {replies.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                      {(isRepliesExpanded ? replies : replies.slice(-2)).map((rep: any) => {
                        let repAttachments: AttachmentItem[] = [];
                        if (rep.attachments) {
                          try {
                            repAttachments = JSON.parse(rep.attachments);
                          } catch (e) {}
                        }
                        const isSelf = rep.userId === currentUserId;

                        return (
                          <div
                            key={rep.id}
                            style={{
                              backgroundColor: isSelf ? "#eff6ff" : "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              padding: "10px 12px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a" }}>
                                  {rep.user?.name || "Team Member"}
                                </span>
                                {rep.user?.role && (
                                  <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "1px 6px", borderRadius: "4px", backgroundColor: "#e2e8f0", color: "#475569" }}>
                                    {rep.user.role}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                                {new Date(rep.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                              </span>
                            </div>

                            <p style={{ margin: 0, fontSize: "0.85rem", color: "#334155", lineHeight: 1.4 }}>
                              {rep.content}
                            </p>

                            {repAttachments.length > 0 && (
                              <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                                {repAttachments.map((att, aIdx) => (
                                  <a
                                    key={aIdx}
                                    href={att.url}
                                    download={att.name}
                                    style={{ fontSize: "0.72rem", color: "#2563eb", textDecoration: "none", display: "flex", alignItems: "center", gap: "2px", backgroundColor: "#ffffff", padding: "2px 6px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                                  >
                                    <Paperclip size={11} /> {att.name}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Team Reply Input Box */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input
                        type="text"
                        placeholder="Revert or reply to this notice (e.g. Acknowledged / Count me in / Queries)..."
                        value={replyTexts[b.id] || ""}
                        onChange={(e) => handleReplyChange(b.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSendReply(b.id);
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: "9px 12px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.85rem",
                          backgroundColor: "#ffffff",
                          outline: "none",
                        }}
                      />

                      {/* File attachment button */}
                      <label
                        style={{
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#ffffff",
                          color: "#64748b",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="Attach file to reply"
                      >
                        <Paperclip size={16} />
                        <input
                          type="file"
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                          onChange={(e) => handleReplyFileUpload(b.id, e)}
                          style={{ display: "none" }}
                        />
                      </label>

                      <button
                        type="button"
                        disabled={replyLoading[b.id]}
                        onClick={() => handleSendReply(b.id)}
                        style={{
                          padding: "9px 16px",
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: "#4f46e5",
                          color: "#ffffff",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Send size={14} /> {replyLoading[b.id] ? "Sending..." : "Reply"}
                      </button>
                    </div>

                    {/* Pending Reply Attachments preview */}
                    {replyAttachments[b.id] && replyAttachments[b.id].length > 0 && (
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Attachments:</span>
                        {replyAttachments[b.id].map((att, aIdx) => (
                          <span
                            key={aIdx}
                            style={{
                              fontSize: "0.72rem",
                              backgroundColor: "#eef2ff",
                              color: "#4f46e5",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              border: "1px solid #c7d2fe",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {att.name}
                            <button
                              type="button"
                              onClick={() =>
                                setReplyAttachments((prev) => ({
                                  ...prev,
                                  [b.id]: prev[b.id].filter((_, i) => i !== aIdx),
                                }))
                              }
                              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "11px", padding: 0 }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Compose Modal */}
      {isCreateOpen && (
        <CreateBroadcastModal
          onClose={() => setIsCreateOpen(false)}
          employees={employees}
        />
      )}

      {/* Admin Read & Presence Status Inspection Modal */}
      {selectedReadStatusBroadcast && (
        <BroadcastReadStatusModal
          broadcastId={selectedReadStatusBroadcast.id}
          broadcastTitle={selectedReadStatusBroadcast.title}
          onClose={() => setSelectedReadStatusBroadcast(null)}
        />
      )}

      {/* Lightbox / Full Image Preview Modal */}
      {enlargedImage && (
        <div
          className="modal-backdrop"
          onClick={() => setEnlargedImage(null)}
          style={{ zIndex: 99999, backgroundColor: "rgba(0,0,0,0.85)" }}
        >
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setEnlargedImage(null)}
              style={{
                position: "absolute",
                top: "-15px",
                right: "-15px",
                background: "#ffffff",
                color: "#0f172a",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                fontSize: "1.2rem",
                fontWeight: 700,
              }}
            >
              ×
            </button>
            <img
              src={enlargedImage}
              alt="Enlarged Preview"
              style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: "8px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
