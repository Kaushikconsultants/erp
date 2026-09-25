"use client";

import React, { useState, useEffect } from "react";
import { toggleAttendance } from "@/app/actions/attendanceActions";
import { Clock, Loader2 } from "lucide-react";

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

  if (isCheckedOut) {
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
        <button 
          type="button"
          disabled 
          style={{ 
            backgroundColor: "#475569", 
            color: "#ffffff", 
            cursor: "not-allowed",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            height: "32px",
            padding: "0 14px",
            borderRadius: "20px",
            fontSize: "0.78rem",
            fontWeight: 700,
            border: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            whiteSpace: "nowrap"
          }}
        >
          <Clock size={13} style={{ opacity: 0.8 }} />
          <span>Check Out</span>
        </button>
        {formattedCheckIn && (
          <span style={{
            fontSize: "0.68rem",
            color: "#64748b",
            fontWeight: 600,
            letterSpacing: "0.2px",
            whiteSpace: "nowrap"
          }}>
            Check in: {formattedCheckIn}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
      <button 
        type="button"
        onClick={handleToggle}
        disabled={loading}
        style={{ 
          background: isCheckedIn 
            ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" 
            : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          color: "#ffffff",
          border: "none",
          borderRadius: "20px",
          height: "32px",
          padding: "0 14px",
          fontSize: "0.78rem",
          fontWeight: 700,
          cursor: loading ? "wait" : "pointer",
          boxShadow: isCheckedIn 
            ? "0 2px 8px rgba(217, 119, 6, 0.3)" 
            : "0 2px 8px rgba(5, 150, 105, 0.3)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          transition: "all 0.15s ease",
          opacity: loading ? 0.85 : 1,
          whiteSpace: "nowrap",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation"
        }}
      >
        {loading ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            <span>Updating...</span>
          </>
        ) : isCheckedIn ? (
          <>
            <Clock size={13} />
            <span>Check Out</span>
          </>
        ) : (
          <>
            <Clock size={13} />
            <span>Check In</span>
          </>
        )}
      </button>

      {isCheckedIn && formattedCheckIn && (
        <span style={{
          fontSize: "0.68rem",
          color: "#64748b",
          fontWeight: 600,
          letterSpacing: "0.2px",
          whiteSpace: "nowrap"
        }}>
          Check in: {formattedCheckIn}
        </span>
      )}
    </div>
  );
}


