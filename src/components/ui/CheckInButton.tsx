"use client";

import React, { useState, useEffect } from "react";
import { toggleAttendance } from "@/app/actions/attendanceActions";
import { Clock, CheckCircle2 } from "lucide-react";

interface CheckInButtonProps {
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  checkInTime?: string | Date | null;
  checkOutTime?: string | Date | null;
}

const formatTo12HourTime = (dt: string | Date | null | undefined): string => {
  if (!dt) return "";
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch {
    return "";
  }
};

export default function CheckInButton({ 
  isCheckedIn, 
  isCheckedOut, 
  checkInTime, 
  checkOutTime 
}: CheckInButtonProps) {
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    const res = await toggleAttendance();
    setLoading(false);
    if (res?.error) {
      alert(res.error);
    } else {
      window.location.reload();
    }
  };

  const formattedCheckIn = mounted ? formatTo12HourTime(checkInTime) : "";
  const formattedCheckOut = mounted ? formatTo12HourTime(checkOutTime) : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "5px" }}>
      {isCheckedOut ? (
        <button 
          type="button"
          className="primary-btn" 
          disabled 
          style={{ 
            backgroundColor: "#64748b", 
            color: "#ffffff", 
            cursor: "not-allowed",
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            padding: "9px 18px",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: 700,
            border: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
          }}
        >
          <CheckCircle2 size={16} />
          Shift Completed
        </button>
      ) : (
        <button 
          type="button"
          className={`primary-btn hover-lift ${isCheckedIn ? "checked-in" : ""}`}
          style={{ 
            backgroundColor: isCheckedIn ? "var(--warning, #d97706)" : "var(--success, #059669)",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            padding: "9px 18px",
            fontSize: "0.875rem",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: isCheckedIn ? "0 2px 8px rgba(217, 119, 6, 0.25)" : "0 2px 8px rgba(5, 150, 105, 0.25)",
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            transition: "all 0.15s ease",
            opacity: loading ? 0.75 : 1
          }}
          onClick={handleToggle}
          disabled={loading}
        >
          <Clock size={16} />
          {loading ? "Processing..." : isCheckedIn ? "Check Out (End Shift)" : "Check In (Start Shift)"}
        </button>
      )}

      {/* ─── CHECK-IN TIME DISPLAY BELOW BUTTON ─── */}
      {isCheckedIn && (
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          fontSize: "0.78rem",
          fontWeight: 600,
          color: isCheckedOut ? "#475569" : "#b45309",
          backgroundColor: isCheckedOut ? "#f1f5f9" : "#fef3c7",
          padding: "3px 10px",
          borderRadius: "6px",
          border: `1px solid ${isCheckedOut ? "#e2e8f0" : "#fde68a"}`
        }}>
          <Clock size={12} style={{ color: isCheckedOut ? "#64748b" : "#d97706" }} />
          <span>
            {isCheckedOut ? (
              <>In: <strong>{formattedCheckIn || "09:00 AM"}</strong> • Out: <strong>{formattedCheckOut || "Completed"}</strong></>
            ) : (
              <>Check-in Time: <strong>{formattedCheckIn || "Active"}</strong></>
            )}
          </span>
        </div>
      )}

      {!isCheckedIn && !isCheckedOut && (
        <div style={{
          fontSize: "0.72rem",
          color: "#94a3b8",
          fontWeight: 500,
          paddingRight: "2px"
        }}>
          Shift not started
        </div>
      )}
    </div>
  );
}
