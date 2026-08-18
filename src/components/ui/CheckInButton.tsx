"use client";

import React, { useState } from "react";
import { toggleAttendance } from "@/app/actions/attendanceActions";

interface CheckInButtonProps {
  isCheckedIn: boolean;
  isCheckedOut: boolean;
}

export default function CheckInButton({ isCheckedIn, isCheckedOut }: CheckInButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    await toggleAttendance();
    setLoading(false);
  };

  if (isCheckedOut) {
    return (
      <button className="primary-btn" disabled style={{ backgroundColor: 'var(--text-muted)' }}>
        Shift Completed
      </button>
    );
  }

  return (
    <button 
      className={`primary-btn hover-lift ${isCheckedIn ? 'checked-in' : ''}`}
      style={{ backgroundColor: isCheckedIn ? 'var(--warning)' : 'var(--success)' }}
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? "Processing..." : isCheckedIn ? "Check Out (End Shift)" : "Check In (Start Shift)"}
    </button>
  );
}
