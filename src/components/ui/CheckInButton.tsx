"use client";

import React, { useState, useEffect } from "react";
import { toggleAttendance } from "@/app/actions/attendanceActions";
import { Clock, CheckCircle2, Loader2 } from "lucide-react";

interface CheckInButtonProps {
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  checkInTime?: string | Date | null;
  checkOutTime?: string | Date | null;
  employeeId?: string;
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
    }).toUpperCase();
  } catch {
    return "";
  }
};

export default function CheckInButton({ 
  isCheckedIn, 
  isCheckedOut, 
  checkInTime, 
  checkOutTime,
  employeeId
}: CheckInButtonProps) {
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      const res = await toggleAttendance(employeeId);
      if (res?.error) {
        alert(res.error);
        setLoading(false);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      console.error("Attendance toggle error:", err);
      alert(err?.message || "Failed to update attendance. Please try again.");
      setLoading(false);
    }
  };

  const formattedCheckIn = mounted ? formatTo12HourTime(checkInTime) : "";
  const formattedCheckOut = mounted ? formatTo12HourTime(checkOutTime) : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
      {isCheckedOut ? (
        <button 
          type="button"
          disabled 
          style={{ 
            backgroundColor: "#64748b", 
            color: "#ffffff", 
            cursor: "not-allowed",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
            height: "40px",
            padding: "0 16px",
            borderRadius: "10px",
            fontSize: "0.84rem",
            fontWeight: 700,
            border: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            whiteSpace: "nowrap"
          }}
        >
          <CheckCircle2 size={16} />
          Shift Completed
        </button>
      ) : (
        <button 
          type="button"
          onClick={handleToggle}
          disabled={loading}
          style={{ 
            backgroundColor: isCheckedIn ? "#d97706" : "#059669",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            height: "40px",
            padding: "0 16px",
            fontSize: "0.84rem",
            fontWeight: 700,
            cursor: loading ? "wait" : "pointer",
            boxShadow: isCheckedIn ? "0 2px 8px rgba(217, 119, 6, 0.28)" : "0 2px 8px rgba(5, 150, 105, 0.28)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
            transition: "all 0.15s ease",
            opacity: loading ? 0.8 : 1,
            whiteSpace: "nowrap",
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation"
          }}
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>Updating...</span>
            </>
          ) : (
            <>
              <Clock size={16} />
              <span>{isCheckedIn ? "Check Out (End Shift)" : "Check In (Start Shift)"}</span>
            </>
          )}
        </button>
      )}

      {/* ─── CHECK-IN TIME DISPLAY BELOW BUTTON ─── */}
      {isCheckedIn && (
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          fontSize: "0.74rem",
          fontWeight: 600,
          color: isCheckedOut ? "#475569" : "#b45309",
          backgroundColor: isCheckedOut ? "#f1f5f9" : "#fef3c7",
          padding: "2px 8px",
          borderRadius: "6px",
          border: `1px solid ${isCheckedOut ? "#e2e8f0" : "#fde68a"}`
        }}>
          <Clock size={11} style={{ color: isCheckedOut ? "#64748b" : "#d97706" }} />
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

