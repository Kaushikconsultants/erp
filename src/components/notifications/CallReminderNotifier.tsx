"use client";

import React, { useState, useEffect } from "react";
import { PhoneCall, Calendar, Clock, X, Bell, ExternalLink, Volume2 } from "lucide-react";
import PhoneDialerModal from "../ui/PhoneDialerModal";

export default function CallReminderNotifier() {
  const [activeReminder, setActiveReminder] = useState<any | null>(null);
  const [isDialerOpen, setIsDialerOpen] = useState<boolean>(false);
  const [dialerPhone, setDialerPhone] = useState<string>("");
  const [dialerName, setDialerName] = useState<string>("");

  useEffect(() => {
    // Request Notification permission on mount
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }

    // Check for upcoming calls periodically (every 45s)
    const checkUpcomingReminders = async () => {
      try {
        const res = await fetch("/api/cron/workflows", { method: "GET" }).catch(() => null);
        if (!res || !res.ok) return;
        const data = await res.json().catch(() => null);

        if (data && data.dueCalls && data.dueCalls.length > 0) {
          const topCall = data.dueCalls[0];
          setActiveReminder(topCall);

          // Native Browser Push Notification
          if ("Notification" in window && Notification.permission === "granted") {
            const customerName = topCall.customerName || topCall.leadName || "B2B Client";
            new Notification(`📞 Call Follow-up Due: ${customerName}`, {
              body: `Follow-up call scheduled for today. Phone: ${topCall.phone || "Click to dial"}`,
              icon: "/logo.jpg"
            });
          }
        }
      } catch (e) {
        // Silently handle
      }
    };

    checkUpcomingReminders();
    const interval = setInterval(checkUpcomingReminders, 45000);
    return () => clearInterval(interval);
  }, []);

  if (!activeReminder) return null;

  const handleCallNow = () => {
    const phone = activeReminder.phone || "";
    const name = activeReminder.customerName || activeReminder.leadName || "";
    setDialerPhone(phone);
    setDialerName(name);
    setIsDialerOpen(true);
    setActiveReminder(null);
  };

  return (
    <>
      {/* Floating Top Screen Call Follow-Up Toast Reminder */}
      <div
        style={{
          position: "fixed",
          top: "16px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "calc(100% - 32px)",
          maxWidth: "480px",
          backgroundColor: "#0f172a",
          color: "#ffffff",
          borderRadius: "16px",
          padding: "14px 16px",
          boxShadow: "0 16px 36px rgba(15, 23, 42, 0.35)",
          zIndex: 99999,
          border: "1px solid #334155",
          animation: "slideDownToast 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#10b981", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PhoneCall size={15} />
            </div>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Upcoming Call Reminder
            </span>
          </div>
          <button onClick={() => setActiveReminder(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "2px" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#ffffff", marginBottom: "2px" }}>
          {activeReminder.customerName || activeReminder.leadName || "B2B Client"}
        </div>
        <p style={{ margin: "0 0 10px 0", fontSize: "0.76rem", color: "#cbd5e1", lineHeight: 1.3 }}>
          {activeReminder.notes ? `Notes: ${activeReminder.notes}` : `Scheduled follow-up due now.`}
        </p>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleCallNow}
            style={{
              flex: 1,
              backgroundColor: "#10b981",
              color: "#ffffff",
              border: "none",
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.35)"
            }}
          >
            <PhoneCall size={15} />
            <span>Call Now</span>
          </button>

          <button
            onClick={() => setActiveReminder(null)}
            style={{
              padding: "8px 12px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              color: "#cbd5e1",
              border: "1px solid #475569",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Snooze
          </button>
        </div>
      </div>

      {/* Embedded Phone Dialer Modal */}
      <PhoneDialerModal
        isOpen={isDialerOpen}
        onClose={() => setIsDialerOpen(false)}
        initialPhone={dialerPhone}
        initialName={dialerName}
      />
    </>
  );
}
