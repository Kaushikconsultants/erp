"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, X, ExternalLink, Sparkles, MessageSquare, PhoneCall, FileCheck, Package, Info } from "lucide-react";
import { getMyNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/app/actions/notificationActions";
import { playNotificationChime } from "@/components/notifications/PushNotificationManager";
import { triggerHaptic } from "@/lib/capacitor";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastSeenNotifIdRef = useRef<string | null>(null);
  const router = useRouter();

  const fetchNotifications = async (isBackgroundPoll = false) => {
    try {
      const res = await getMyNotifications();
      if (res.success && Array.isArray(res.notifications)) {
        const fetched = res.notifications;

        // If background poll finds a NEW unread notification that we haven't seen yet
        if (isBackgroundPoll && fetched.length > 0) {
          const topNotif = fetched[0];
          if (!topNotif.isRead && lastSeenNotifIdRef.current && topNotif.id !== lastSeenNotifIdRef.current) {
            playNotificationChime();
            triggerHaptic("success").catch(() => {});
          }
        }

        if (fetched.length > 0) {
          lastSeenNotifIdRef.current = fetched[0].id;
        }

        setNotifications(fetched);
      }
    } catch (e) {
      // Silent catch for background poll
    }
  };

  useEffect(() => {
    fetchNotifications(false);

    // Auto-poll every 15 seconds for real-time lead & message updates
    const pollInterval = setInterval(() => {
      fetchNotifications(true);
    }, 15000);

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await markNotificationAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleMarkAllRead = async () => {
    setIsLoading(true);
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setIsLoading(false);
    triggerHaptic("light").catch(() => {});
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id);
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)));
    }
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "lead":
        return <Sparkles size={14} className="text-emerald-600" />;
      case "message":
        return <MessageSquare size={14} className="text-blue-600" />;
      case "call":
        return <PhoneCall size={14} className="text-amber-600" />;
      case "quotation":
        return <FileCheck size={14} className="text-purple-600" />;
      case "order":
        return <Package size={14} className="text-indigo-600" />;
      default:
        return <Info size={14} className="text-slate-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef} style={{ position: "relative" }}>
      {/* Bell Button */}
      <button
        type="button"
        className="icon-btn hover-lift"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications(false);
        }}
        title="Notifications"
        style={{
          position: "relative",
          cursor: "pointer",
          border: "none",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "38px",
          height: "38px",
          borderRadius: "50%"
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "4px",
              right: "4px",
              backgroundColor: "#ef4444",
              color: "#ffffff",
              fontSize: "0.62rem",
              fontWeight: 800,
              minWidth: "16px",
              height: "16px",
              borderRadius: "9999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              border: "2px solid #ffffff",
              boxShadow: "0 2px 4px rgba(239, 68, 68, 0.4)"
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Backdrop for Mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.3)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            zIndex: 99990
          }}
        />
      )}

      {/* High-Z-Index Responsive Notification Panel */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: "60px",
            right: "12px",
            width: "calc(100vw - 24px)",
            maxWidth: "380px",
            maxHeight: "min(80vh, 520px)",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 20px 35px -5px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0,0,0,0.06)",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "slideDownNotif 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid #f1f5f9",
              backgroundColor: "#ffffff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Bell size={15} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                  Notifications
                </h3>
                <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                  {unreadCount} unread alert{unreadCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={isLoading}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#4f46e5",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: "6px"
                  }}
                  title="Mark all as read"
                >
                  <CheckCheck size={14} style={{ display: "inline", marginRight: "3px" }} />
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px"
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* List of Notifications */}
          <div style={{ overflowY: "auto", flex: 1, maxHeight: "380px" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: "2rem", marginBottom: "6px" }}>🎉</div>
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#334155" }}>
                  You're all caught up!
                </div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>
                  New leads and alerts will appear here in real-time.
                </div>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #f8fafc",
                    backgroundColor: n.isRead ? "#ffffff" : "#f0fdf4",
                    display: "flex",
                    gap: "10px",
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                    position: "relative"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = n.isRead ? "#f8fafc" : "#ecfdf5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = n.isRead ? "#ffffff" : "#f0fdf4";
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      backgroundColor: n.isRead ? "#f1f5f9" : "#dcfce7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "2px"
                    }}
                  >
                    {getNotifIcon(n.type)}
                  </div>

                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "0.82rem",
                          fontWeight: n.isRead ? 600 : 700,
                          color: n.isRead ? "#334155" : "#0f172a",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                      >
                        {n.title}
                      </h4>
                      {!n.isRead && (
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            backgroundColor: "#10b981",
                            flexShrink: 0
                          }}
                        />
                      )}
                    </div>
                    <p
                      style={{
                        margin: "3px 0 0 0",
                        fontSize: "0.75rem",
                        color: n.isRead ? "#64748b" : "#1e293b",
                        lineHeight: 1.35,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}
                    >
                      {n.message}
                    </p>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        color: "#94a3b8",
                        marginTop: "5px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span>•</span>
                      <span>{new Date(n.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                    </div>
                  </div>

                  {/* Mark as read quick button */}
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                        padding: "4px",
                        borderRadius: "4px",
                        alignSelf: "flex-start"
                      }}
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "10px 16px",
              backgroundColor: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              textAlign: "center"
            }}
          >
            <Link
              href="/settings/notifications"
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#4f46e5",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <span>Manage Mobile Alerts & Push Settings</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
