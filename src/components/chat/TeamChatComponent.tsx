"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  getDirectConversations, 
  getConversationMessages, 
  sendDirectMessage 
} from "@/app/actions/chatActions";
import { AttachmentItem } from "@/app/actions/broadcastActions";
import NewChatModal from "./NewChatModal";
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  Search, 
  Check, 
  CheckCheck, 
  Circle, 
  Plus, 
  Download, 
  FileText, 
  Image as ImageIcon,
  User as UserIcon,
  Clock,
  Sparkles,
  ArrowLeft,
  X
} from "lucide-react";

interface TeamChatComponentProps {
  currentUserId: string;
  initialConversationId?: string;
}

export default function TeamChatComponent({
  currentUserId,
  initialConversationId,
}: TeamChatComponentProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialConversationId || null
  );
  const [activePartner, setActivePartner] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);

  const [messageInput, setMessageInput] = useState<string>("");
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentItem[]>([]);
  const [isNewChatOpen, setIsNewChatOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeConvRef = useRef<string | null>(activeConversationId);

  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Initial Load of Conversations
  const loadConversations = async () => {
    try {
      const res = await getDirectConversations();
      if (res.success && res.conversations) {
        setConversations(res.conversations);
        if (!activeConvRef.current && res.conversations.length > 0) {
          // On desktop (window width > 768), select first conversation by default
          if (typeof window !== "undefined" && window.innerWidth >= 768) {
            setActiveConversationId(res.conversations[0].id);
            setActivePartner(res.conversations[0].partner);
          }
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // 2. Fetch messages for active conversation (with explicit markRead on user open)
  const loadMessages = async (convId: string, isBackground = false) => {
    if (!isBackground) setLoadingMessages(true);
    try {
      const res = await getConversationMessages(convId, !isBackground);
      if (res.success) {
        setMessages(res.messages || []);
        if (res.partner) setActivePartner(res.partner);
        if (!isBackground) setTimeout(scrollToBottom, 50);
      }
    } catch (e) {}
    if (!isBackground) setLoadingMessages(false);
  };

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId, false);
    }
  }, [activeConversationId]);

  // 3. Lightweight Background Sync: Every 8s, only if tab is visible
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(() => {
      if (!isMounted || document.hidden) return;
      
      // Background conversation sync
      getDirectConversations().then((res) => {
        if (isMounted && res.success && res.conversations) {
          setConversations(res.conversations);
        }
      }).catch(() => {});

      // Background active chat message sync (readOnly without write lock)
      if (activeConvRef.current) {
        getConversationMessages(activeConvRef.current, false).then((res) => {
          if (isMounted && res.success) {
            setMessages(res.messages || []);
            if (res.partner) setActivePartner(res.partner);
          }
        }).catch(() => {});
      }
    }, 8000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Handle file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is too large (max 5MB)`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setPendingAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            url: reader.result as string,
            type: file.type.startsWith("image/") ? "image" : "document",
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingAttachment = (idx: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activePartner?.id) return;
    if (!messageInput.trim() && pendingAttachments.length === 0) return;

    const content = messageInput.trim();
    const attachments = [...pendingAttachments];

    setMessageInput("");
    setPendingAttachments([]);
    setSending(true);

    const res = await sendDirectMessage(activePartner.id, content, attachments);
    setSending(false);

    if (res.success && res.message) {
      setMessages((prev) => [...prev, res.message]);
      if (res.conversationId && res.conversationId !== activeConversationId) {
        setActiveConversationId(res.conversationId);
      }
      loadConversations();
      setTimeout(scrollToBottom, 50);
    }
  };

  const handleStartChatWithUser = (user: any) => {
    setIsNewChatOpen(false);
    setActivePartner(user);
    // Find existing conversation if any
    const existing = conversations.find((c) => c.partner.id === user.id);
    if (existing) {
      setActiveConversationId(existing.id);
    } else {
      setActiveConversationId(null);
      setMessages([]);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.partner.name.toLowerCase().includes(q) ||
      c.partner.department.toLowerCase().includes(q) ||
      (c.lastMessageText && c.lastMessageText.toLowerCase().includes(q))
    );
  });

  return (
    <div
      className="team-chat-wrapper"
      style={{
        display: "flex",
        height: "calc(100vh - 150px)",
        minHeight: "520px",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* LEFT PANE: Conversations list & Search */}
      <div
        className={`team-chat-sidebar ${activePartner ? "chat-active" : ""}`}
        style={{
          width: "320px",
          minWidth: "280px",
          borderRight: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f8fafc",
          flexShrink: 0,
        }}
      >
        {/* Header with + New Chat */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
              <MessageSquare size={18} color="#4f46e5" /> Team Chat
            </h2>
            <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
              <Circle size={6} fill="#10b981" color="#10b981" /> Live Sync Active
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsNewChatOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 12px",
              borderRadius: "6px",
              backgroundColor: "#4f46e5",
              color: "#ffffff",
              border: "none",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={14} /> New Chat
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search chat or colleague..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 10px 7px 30px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "0.8rem",
                outline: "none",
                backgroundColor: "#ffffff",
              }}
            />
          </div>
        </div>

        {/* Conversations List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {filteredConversations.length === 0 ? (
            <div style={{ padding: "30px 16px", textAlign: "center", color: "#94a3b8", fontSize: "0.82rem" }}>
              <p style={{ margin: 0 }}>No active chats.</p>
              <button
                type="button"
                onClick={() => setIsNewChatOpen(true)}
                style={{ marginTop: "8px", background: "none", border: "none", color: "#4f46e5", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
              >
                + Start your first conversation
              </button>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === activeConversationId;
              const presence = conv.partner.presence;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveConversationId(conv.id);
                    setActivePartner(conv.partner);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "#e0e7ff" : "transparent",
                    border: isSelected ? "1px solid #c7d2fe" : "1px solid transparent",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {/* Avatar + presence dot */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: isSelected ? "#4338ca" : "#6366f1", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem" }}>
                      {conv.partner.name.charAt(0).toUpperCase()}
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
                      title={`${presence.label} (${presence.lastSeen})`}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.875rem", fontWeight: isSelected ? 700 : 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {conv.partner.name}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                        {new Date(conv.lastMessageAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                      <span style={{ fontSize: "0.75rem", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                        {conv.lastMessageText}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, backgroundColor: "#10b981", color: "#ffffff", padding: "1px 6px", borderRadius: "10px" }}>
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANE: Active Chat Window */}
      {activePartner ? (
        <div style={{ display: "flex", flexDirection: "column", backgroundColor: "#ffffff", flex: 1, minWidth: 0 }}>
          {/* Active Partner Top Bar */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Back button on mobile */}
              <button
                type="button"
                onClick={() => {
                  setActivePartner(null);
                  setActiveConversationId(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: "4px",
                  cursor: "pointer",
                  color: "#4f46e5",
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "6px",
                }}
                title="Back to conversations"
              >
                <ArrowLeft size={20} />
              </button>

              <div style={{ position: "relative" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "#4f46e5", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.95rem" }}>
                  {activePartner.name.charAt(0).toUpperCase()}
                </div>
                <div
                  style={{
                    position: "absolute",
                    bottom: "-1px",
                    right: "-1px",
                    width: "11px",
                    height: "11px",
                    borderRadius: "50%",
                    backgroundColor: activePartner.presence?.color || "#94a3b8",
                    border: "2px solid #ffffff",
                  }}
                />
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                    {activePartner.name}
                  </h3>
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "1px 6px", borderRadius: "4px", backgroundColor: "#e2e8f0", color: "#475569" }}>
                    {activePartner.department || activePartner.role}
                  </span>
                </div>
                <div style={{ fontSize: "0.75rem", color: activePartner.presence?.color || "#94a3b8", display: "flex", alignItems: "center", gap: "4px", marginTop: "1px", fontWeight: 500 }}>
                  <Circle size={6} fill={activePartner.presence?.color || "#94a3b8"} color={activePartner.presence?.color || "#94a3b8"} />
                  <span>{activePartner.presence?.label || "Offline"}</span>
                  <span style={{ color: "#94a3b8" }}>• {activePartner.presence?.lastSeen}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages Stream */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px", backgroundColor: "#fdfdfd" }}>
            {loadingMessages ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                Loading conversation...
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: "center", margin: "auto", padding: "40px", color: "#94a3b8" }}>
                <Sparkles size={32} color="#818cf8" style={{ margin: "0 auto 8px auto" }} />
                <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "#475569" }}>
                  This is the start of your direct chat with {activePartner.name}.
                </p>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem" }}>
                  Send a message or share an attachment below.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                let attachments: AttachmentItem[] = [];
                if (msg.attachments) {
                  try {
                    attachments = JSON.parse(msg.attachments);
                  } catch (e) {}
                }

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isMe ? "flex-end" : "flex-start",
                      maxWidth: "100%",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "75%",
                        padding: "10px 14px",
                        borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                        backgroundColor: isMe ? "#4f46e5" : "#f1f5f9",
                        color: isMe ? "#ffffff" : "#1e293b",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      }}
                    >
                      {/* Message Text */}
                      {msg.content && (
                        <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {msg.content}
                        </p>
                      )}

                      {/* Attachments */}
                      {attachments.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: msg.content ? "8px" : 0 }}>
                          {attachments.map((att, aIdx) => (
                            <div key={aIdx}>
                              {att.type === "image" ? (
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  onClick={() => setEnlargedImage(att.url)}
                                  style={{
                                    maxWidth: "240px",
                                    maxHeight: "180px",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    display: "block",
                                  }}
                                />
                              ) : (
                                <a
                                  href={att.url}
                                  download={att.name}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "6px 10px",
                                    borderRadius: "6px",
                                    backgroundColor: isMe ? "rgba(255,255,255,0.15)" : "#ffffff",
                                    color: isMe ? "#ffffff" : "#4f46e5",
                                    textDecoration: "none",
                                    fontSize: "0.78rem",
                                    fontWeight: 600,
                                    border: isMe ? "none" : "1px solid #cbd5e1",
                                  }}
                                >
                                  <FileText size={16} />
                                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                                    {att.name}
                                  </span>
                                  <Download size={14} style={{ marginLeft: "auto" }} />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Time & Read Receipts */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: "4px",
                          marginTop: "4px",
                          fontSize: "0.68rem",
                          color: isMe ? "rgba(255,255,255,0.75)" : "#94a3b8",
                        }}
                      >
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                        </span>

                        {isMe && (
                          <span
                            title={msg.isRead && msg.readAt ? `Read at ${new Date(msg.readAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}` : "Sent"}
                            style={{ display: "inline-flex", alignItems: "center" }}
                          >
                            {msg.isRead ? (
                              <CheckCheck size={14} color="#67e8f9" />
                            ) : (
                              <Check size={14} color="rgba(255,255,255,0.75)" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pending Attachments Bar */}
          {pendingAttachments.length > 0 && (
            <div style={{ padding: "6px 20px", backgroundColor: "#f1f5f9", borderTop: "1px solid #e2e8f0", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Attachments ({pendingAttachments.length}):</span>
              {pendingAttachments.map((att, aIdx) => (
                <span
                  key={aIdx}
                  style={{
                    fontSize: "0.72rem",
                    backgroundColor: "#ffffff",
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
                    onClick={() => removePendingAttachment(aIdx)}
                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "11px", padding: 0 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Bottom Chat Input Bar */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: "12px 20px",
              borderTop: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            {/* File uploader trigger */}
            <label
              style={{
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#f8fafc",
                color: "#64748b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
              }}
              title="Attach image or file"
            >
              <Paperclip size={18} />
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </label>

            {/* Input field */}
            <input
              type="text"
              placeholder={`Message ${activePartner.name}...`}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.875rem",
                outline: "none",
                backgroundColor: "#f8fafc",
              }}
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={sending || (!messageInput.trim() && pendingAttachments.length === 0)}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#4f46e5",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                opacity: sending || (!messageInput.trim() && pendingAttachments.length === 0) ? 0.6 : 1,
              }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc", color: "#94a3b8", flex: 1 }}>
          <div style={{ textAlign: "center" }}>
            <MessageSquare size={48} color="#cbd5e1" style={{ margin: "0 auto 12px auto" }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#475569", margin: 0 }}>Select a Conversation</h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px" }}>
              Choose a colleague from the left or start a new chat.
            </p>
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      {isNewChatOpen && (
        <NewChatModal
          onClose={() => setIsNewChatOpen(false)}
          onSelectUser={handleStartChatWithUser}
        />
      )}

      {/* Image Lightbox */}
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
                fontWeight: 700,
                fontSize: "1.2rem",
              }}
            >
              ×
            </button>
            <img
              src={enlargedImage}
              alt="Preview"
              style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: "8px" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
