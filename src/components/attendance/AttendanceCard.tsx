"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateAttendanceAdmin, updateCheckInOut } from '@/app/actions/attendanceActions';
import "@/components/ui/modal.css";
import "./attendance.css";
import { Clock, CheckCircle2, AlertCircle, Trash2, Plus, Calendar, User, Zap } from 'lucide-react';

const STATUS_COLOR: Record<string, string> = {
  Present: '#22c55e',
  Absent: '#ef4444',
  'Half Day': '#f59e0b',
  Leave: '#8b5cf6',
};

interface AttendanceCardProps {
  emp: any;
  isAdmin: boolean;
  year: number;
  mon: number;
  daysArr: number[];
  today: Date;
}

// Convert a Date/string to 12h display string e.g. "09:30 AM"
const toTimeDisplay = (dt: string | Date | null | undefined): string => {
  if (!dt) return '';
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).toUpperCase();
  } catch {
    return '';
  }
};

// Split a Date into {h, m, ampm} parts (12-hour format)
const to12hParts = (dt: string | Date | null | undefined, defaultH = '09', defaultM = '00', defaultAmpm: 'AM'|'PM' = 'AM') => {
  if (!dt) return { h: defaultH, m: defaultM, ampm: defaultAmpm };
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return { h: defaultH, m: defaultM, ampm: defaultAmpm };
    const timeStr = d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    // Expected output format: "09:30 AM" or "09:30 am"
    const parts = timeStr.trim().split(/\s+/);
    const [h, m] = parts[0].split(':');
    const ampm = ((parts[1] || 'AM').toUpperCase()) as 'AM' | 'PM';
    return { 
      h: String(h).padStart(2, '0'), 
      m: String(m).padStart(2, '0'), 
      ampm 
    };
  } catch {
    return { h: defaultH, m: defaultM, ampm: defaultAmpm };
  }
};

// Convert 12h parts back to "HH:MM" 24h string for server
const to24h = (h: string, m: string, ampm: string): string => {
  let hour = parseInt(h, 10) || 0;
  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Safely extract day of month regardless of timezone quirks
const getDayFromDate = (dateVal: string | Date): number => {
  if (typeof dateVal === 'string') {
    const parts = dateVal.split('T')[0].split('-');
    if (parts.length === 3) {
      const parsedDay = parseInt(parts[2], 10);
      if (!isNaN(parsedDay)) return parsedDay;
    }
  }
  return new Date(dateVal).getDate();
};

export default function AttendanceCard({ emp, isAdmin, year, mon, daysArr, today }: AttendanceCardProps) {
  const router = useRouter();
  const [attendances, setAttendances] = useState<any[]>(emp.attendances || []);
  const [editingDay, setEditingDay] = useState<{ day: number; record: any } | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'timing'>('status');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [newStatus, setNewStatus] = useState("Present");
  
  // Check-in 12h parts
  const [ciH, setCiH] = useState('09');
  const [ciM, setCiM] = useState('00');
  const [ciAmpm, setCiAmpm] = useState<'AM'|'PM'>('AM');
  
  // Check-out 12h parts
  const [coH, setCoH] = useState('06');
  const [coM, setCoM] = useState('00');
  const [coAmpm, setCoAmpm] = useState<'AM'|'PM'>('PM');
  const [hasCheckOut, setHasCheckOut] = useState(false);

  useEffect(() => {
    setAttendances(emp.attendances || []);
  }, [emp.attendances]);

  const attendanceMap: Record<number, any> = {};
  attendances.forEach((a: any) => {
    const day = getDayFromDate(a.date);
    attendanceMap[day] = a;
  });

  const presentDays = attendances.filter((a: any) => a.status === 'Present').length;
  const absentDays = attendances.filter((a: any) => a.status === 'Absent').length;
  const halfDays = attendances.filter((a: any) => a.status === 'Half Day').length;
  const leaveDays = attendances.filter((a: any) => a.status === 'Leave').length;

  const empName = emp.user?.name || 'Employee';
  const initials = empName
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'EM';

  const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === mon;
  const todayDateNum = today.getDate();

  const handleCellClick = (day: number, record: any) => {
    if (!isAdmin) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setEditingDay({ day, record });
    setActiveTab('status');
    setNewStatus(record ? record.status : "Present");
    
    const ci = to12hParts(record?.checkIn, '09', '00', 'AM');
    setCiH(ci.h); 
    setCiM(ci.m); 
    setCiAmpm(ci.ampm);

    const co = to12hParts(record?.checkOut, '06', '00', 'PM');
    setCoH(co.h); 
    setCoM(co.m); 
    setCoAmpm(co.ampm);
    setHasCheckOut(!!record?.checkOut);
  };

  const dateStr = editingDay
    ? `${year}-${String(mon).padStart(2, '0')}-${String(editingDay.day).padStart(2, '0')}`
    : '';

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDay) return;
    setLoading(true);
    setErrorMessage(null);

    const dateStart = new Date(year, mon - 1, editingDay.day, 0, 0, 0, 0).toISOString();
    const dateEnd = new Date(year, mon - 1, editingDay.day, 23, 59, 59, 999).toISOString();
    const defaultCheckIn = new Date(year, mon - 1, editingDay.day, 9, 0, 0, 0).toISOString();

    const res = await updateAttendanceAdmin(emp.id, dateStr, newStatus, dateStart, dateEnd, defaultCheckIn);
    setLoading(false);

    if (res?.error) {
      setErrorMessage(res.error);
      return;
    }

    // Optimistic local state update
    setAttendances(prev => {
      const filtered = prev.filter(a => getDayFromDate(a.date) !== editingDay.day);
      if (newStatus === 'DELETE') {
        return filtered;
      }
      const existing = prev.find(a => getDayFromDate(a.date) === editingDay.day);
      const updatedRecord = {
        ...(existing || { id: `temp-${Date.now()}`, employeeId: emp.id, date: new Date(year, mon - 1, editingDay.day, 0, 0, 0) }),
        status: newStatus
      };
      return [...filtered, updatedRecord];
    });

    setSuccessMessage("Status updated successfully");
    setTimeout(() => {
      setEditingDay(null);
      router.refresh();
    }, 400);
  };

  const handleSaveTiming = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDay) return;
    setErrorMessage(null);

    const checkIn24 = to24h(ciH, ciM, ciAmpm);
    const checkOut24 = hasCheckOut ? to24h(coH, coM, coAmpm) : '';

    const [ih, im] = checkIn24.split(':').map(Number);
    const checkInDate = new Date(year, mon - 1, editingDay.day, ih, im, 0, 0);
    const checkInIso = checkInDate.toISOString();

    let checkOutDate: Date | null = null;
    let checkOutIso: string | null = null;

    if (hasCheckOut && checkOut24) {
      const [oh, om] = checkOut24.split(':').map(Number);
      checkOutDate = new Date(year, mon - 1, editingDay.day, oh, om, 0, 0);
      if (checkOutDate.getTime() <= checkInDate.getTime()) {
        setErrorMessage('Check-out time must be after check-in time.');
        return;
      }
      checkOutIso = checkOutDate.toISOString();
    }

    const dateStartIso = new Date(year, mon - 1, editingDay.day, 0, 0, 0, 0).toISOString();
    const dateEndIso = new Date(year, mon - 1, editingDay.day, 23, 59, 59, 999).toISOString();

    setLoading(true);
    const res = await updateCheckInOut(
      editingDay.record?.id || '',
      emp.id,
      dateStr,
      checkInIso,
      checkOutIso,
      dateStartIso,
      dateEndIso
    );
    setLoading(false);

    if (res?.error) {
      setErrorMessage(res.error);
      return;
    }

    // Calculate updated working hours for optimistic display
    let calcWorkingHours: number | null = null;
    if (checkInDate && checkOutDate) {
      calcWorkingHours = Math.round(((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60)) * 100) / 100;
    }

    // Optimistic local state update
    setAttendances(prev => {
      const filtered = prev.filter(a => getDayFromDate(a.date) !== editingDay.day);
      const existing = prev.find(a => getDayFromDate(a.date) === editingDay.day);
      const updatedRecord = {
        ...(existing || { id: `temp-${Date.now()}`, employeeId: emp.id, date: checkInDate }),
        checkIn: checkInDate,
        checkOut: checkOutDate,
        workingHours: calcWorkingHours,
        status: existing?.status === "Absent" ? "Present" : (existing?.status || "Present")
      };
      return [...filtered, updatedRecord];
    });

    setSuccessMessage("Timings updated successfully");
    setTimeout(() => {
      setEditingDay(null);
      router.refresh();
    }, 400);
  };

  // Compute working hours for display in cell tooltip
  const getWorkingHours = (record: any) => {
    if (!record?.checkIn) return '';
    const co = record.checkOut ? new Date(record.checkOut) : null;
    if (!co) return `In: ${toTimeDisplay(record.checkIn)}`;
    const hrs = ((co.getTime() - new Date(record.checkIn).getTime()) / (1000 * 60 * 60)).toFixed(1);
    return `${toTimeDisplay(record.checkIn)} – ${toTimeDisplay(co)} (${hrs}h)`;
  };

  // Compute short working hours for mobile cell badge
  const getMobileHoursBadge = (record: any) => {
    if (!record?.checkIn) return '';
    if (!record.checkOut) return 'In';
    const hrs = ((new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime()) / (1000 * 60 * 60)).toFixed(1);
    return `${hrs}h`;
  };

  // Preset setter helper
  const applyPreset = (type: 'ci' | 'co', h: string, m: string, ampm: 'AM' | 'PM') => {
    if (type === 'ci') {
      setCiH(h);
      setCiM(m);
      setCiAmpm(ampm);
    } else {
      setCoH(h);
      setCoM(m);
      setCoAmpm(ampm);
      setHasCheckOut(true);
    }
  };

  const applyNow = (type: 'ci' | 'co') => {
    const now = new Date();
    const parts = to12hParts(now);
    if (type === 'ci') {
      setCiH(parts.h);
      setCiM(parts.m);
      setCiAmpm(parts.ampm);
    } else {
      setCoH(parts.h);
      setCoM(parts.m);
      setCoAmpm(parts.ampm);
      setHasCheckOut(true);
    }
  };

  return (
    <div className="attendance-emp-card">
      {/* ─── Employee Header Row ─── */}
      <div className="attendance-emp-header">
        <div className="attendance-emp-profile">
          <div className="attendance-emp-avatar">
            {initials}
          </div>
          <div className="attendance-emp-info">
            <span className="attendance-emp-name">{empName}</span>
            <span className="attendance-emp-dept">{emp.department || 'Sales & Operations'}</span>
          </div>
        </div>

        {/* Status Count Badges */}
        <div className="attendance-badges-group">
          <span className="attendance-badge-pill attendance-badge-present">
            ✓ {presentDays} Present
          </span>
          <span className="attendance-badge-pill attendance-badge-absent">
            ✗ {absentDays} Absent
          </span>
          {halfDays > 0 && (
            <span className="attendance-badge-pill attendance-badge-halfday">
              ◐ {halfDays} Half Day
            </span>
          )}
          {leaveDays > 0 && (
            <span className="attendance-badge-pill attendance-badge-leave">
              ★ {leaveDays} Leave
            </span>
          )}
        </div>
      </div>

      {/* ─── Calendar Grid (7 Columns) ─── */}
      <div className="attendance-cal-grid">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="attendance-weekday-header">{d}</div>
        ))}
        {Array.from({ length: (new Date(year, mon - 1, 1).getDay() + 6) % 7 }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {daysArr.map(day => {
          const record = attendanceMap[day];
          const isPast = new Date(year, mon - 1, day) <= today;
          const isToday = isCurrentMonth && day === todayDateNum;
          const color = record ? STATUS_COLOR[record.status] || '#22c55e' : (isPast ? '#f1f5f9' : 'transparent');
          const hasTime = record?.checkIn;
          const mobileHours = getMobileHoursBadge(record);

          return (
            <div
              key={day}
              onClick={() => handleCellClick(day, record)}
              className={`attendance-day-cell ${isToday ? 'is-today' : ''}`}
              style={{
                background: color, 
                color: record ? '#ffffff' : (isPast ? '#64748b' : '#94a3b8'),
                boxShadow: record ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
              title={record ? `${record.status}${hasTime ? '\n' + getWorkingHours(record) : ''}` : (isToday ? 'Today' : 'Not marked')}
            >
              <div className="attendance-day-num">{day}</div>
              
              {/* Desktop full timing view */}
              {hasTime && (
                <div className="attendance-day-timing">
                  {record.checkOut ? (
                    <span>{toTimeDisplay(record.checkIn)} – {toTimeDisplay(record.checkOut)}</span>
                  ) : (
                    <span>{toTimeDisplay(record.checkIn)}</span>
                  )}
                </div>
              )}

              {/* Mobile compact duration badge (No text overflow!) */}
              {hasTime && mobileHours && (
                <div className="attendance-day-mobile-badge">
                  {mobileHours}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Legend Bar ─── */}
      <div className="attendance-legend-bar">
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <div key={status} className="attendance-legend-item">
            <div className="attendance-legend-dot" style={{ background: color }} />
            <span>{status}</span>
          </div>
        ))}
        {isAdmin && (
          <div className="attendance-admin-hint">
            <Zap size={13} color="#4f46e5" />
            <span>Click any day to edit status or shift hours</span>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingDay && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel animate-in" style={{ maxWidth: '460px', borderRadius: '16px', padding: '0', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={18} style={{ color: 'var(--accent-primary, #4f46e5)' }} />
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Edit Attendance</h2>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  {emp.user.name} &bull; <span style={{ fontWeight: 600 }}>{dateStr}</span>
                </p>
              </div>
              <button 
                className="close-btn" 
                onClick={() => setEditingDay(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {/* Error / Success Banners */}
            {errorMessage && (
              <div style={{ margin: '16px 20px 0', padding: '10px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div style={{ margin: '16px 20px 0', padding: '10px 14px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#ffffff', padding: '0 16px' }}>
              {(['status', 'timing'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { setActiveTab(tab); setErrorMessage(null); }}
                  style={{
                    flex: 1, 
                    padding: '12px 16px', 
                    border: 'none', 
                    background: 'transparent',
                    fontWeight: 700, 
                    fontSize: '0.88rem', 
                    cursor: 'pointer',
                    color: activeTab === tab ? 'var(--accent-primary, #4f46e5)' : '#64748b',
                    borderBottom: activeTab === tab ? '2.5px solid var(--accent-primary, #4f46e5)' : '2.5px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab === 'status' ? '📋 Status' : '🕐 Check-in / Check-out'}
                </button>
              ))}
            </div>

            {/* Tab: Status */}
            {activeTab === 'status' && (
              <form onSubmit={handleSaveStatus} style={{ padding: '20px 24px' }}>
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                    Attendance Status
                  </label>
                  <select 
                    value={newStatus} 
                    onChange={e => setNewStatus(e.target.value)} 
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      cursor: 'pointer',
                      outline: 'none',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                  >
                    <option value="Present">🟢 Present</option>
                    <option value="Absent">🔴 Absent</option>
                    <option value="Half Day">🟡 Half Day</option>
                    <option value="Leave">🟣 Leave</option>
                    <option value="DELETE">⚪ Remove Record (Not Marked)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => setEditingDay(null)}
                    style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="primary-btn" 
                    disabled={loading}
                    style={{ padding: '9px 22px', borderRadius: '8px', background: 'var(--accent-primary, #4f46e5)', color: '#ffffff', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
                  >
                    {loading ? 'Saving...' : 'Save Status'}
                  </button>
                </div>
              </form>
            )}

            {/* Tab: Timing */}
            {activeTab === 'timing' && (
              <form onSubmit={handleSaveTiming} style={{ padding: '20px 24px' }}>

                {/* ── Check-in Time Group ── */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                      Check-in Time <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        type="button" 
                        onClick={() => applyPreset('ci', '09', '00', 'AM')}
                        style={{ padding: '2px 7px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', cursor: 'pointer' }}
                      >
                        9:00 AM
                      </button>
                      <button 
                        type="button" 
                        onClick={() => applyPreset('ci', '09', '30', 'AM')}
                        style={{ padding: '2px 7px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', cursor: 'pointer' }}
                      >
                        9:30 AM
                      </button>
                      <button 
                        type="button" 
                        onClick={() => applyNow('ci')}
                        style={{ padding: '2px 7px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Now
                      </button>
                    </div>
                  </div>

                  {/* Isolated Row Layout: Hour : Minute | AM/PM */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr 90px', gap: '8px', alignItems: 'center' }}>
                    {/* Hour Select */}
                    <select
                      value={ciH}
                      onChange={e => setCiH(e.target.value)}
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 10px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        textAlign: 'center',
                        cursor: 'pointer',
                        outline: 'none',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(hh => (
                        <option key={hh} value={hh}>{hh}</option>
                      ))}
                    </select>

                    <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#64748b' }}>:</span>

                    {/* Minute Select */}
                    <select
                      value={ciM}
                      onChange={e => setCiM(e.target.value)}
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 10px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        textAlign: 'center',
                        cursor: 'pointer',
                        outline: 'none',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(mm => (
                        <option key={mm} value={mm}>{mm}</option>
                      ))}
                    </select>

                    {/* AM / PM Toggle Pill Selector */}
                    <select
                      value={ciAmpm}
                      onChange={e => setCiAmpm(e.target.value as 'AM' | 'PM')}
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 10px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        backgroundColor: '#f1f5f9',
                        fontSize: '0.92rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        textAlign: 'center',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                {/* ── Check-out Time Group ── */}
                {hasCheckOut ? (
                  <div style={{ marginBottom: '18px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                        Check-out Time
                      </label>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <button 
                          type="button" 
                          onClick={() => applyPreset('co', '06', '00', 'PM')}
                          style={{ padding: '2px 7px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#475569', cursor: 'pointer' }}
                        >
                          6:00 PM
                        </button>
                        <button 
                          type="button" 
                          onClick={() => applyPreset('co', '06', '30', 'PM')}
                          style={{ padding: '2px 7px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#475569', cursor: 'pointer' }}
                        >
                          6:30 PM
                        </button>
                        <button 
                          type="button" 
                          onClick={() => applyNow('co')}
                          style={{ padding: '2px 7px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Now
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setHasCheckOut(false)}
                          style={{ marginLeft: '4px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr 90px', gap: '8px', alignItems: 'center' }}>
                      {/* Hour Select */}
                      <select
                        value={coH}
                        onChange={e => setCoH(e.target.value)}
                        style={{
                          width: '100%',
                          height: '42px',
                          padding: '0 10px',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          textAlign: 'center',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(hh => (
                          <option key={hh} value={hh}>{hh}</option>
                        ))}
                      </select>

                      <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#64748b' }}>:</span>

                      {/* Minute Select */}
                      <select
                        value={coM}
                        onChange={e => setCoM(e.target.value)}
                        style={{
                          width: '100%',
                          height: '42px',
                          padding: '0 10px',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          textAlign: 'center',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(mm => (
                          <option key={mm} value={mm}>{mm}</option>
                        ))}
                      </select>

                      {/* AM / PM Toggle */}
                      <select
                        value={coAmpm}
                        onChange={e => setCoAmpm(e.target.value as 'AM' | 'PM')}
                        style={{
                          width: '100%',
                          height: '42px',
                          padding: '0 10px',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          backgroundColor: '#f1f5f9',
                          fontSize: '0.92rem',
                          fontWeight: 800,
                          color: '#0f172a',
                          textAlign: 'center',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setHasCheckOut(true)}
                    style={{
                      width: '100%',
                      marginBottom: '16px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px dashed var(--accent-primary, #4f46e5)',
                      background: 'rgba(79, 70, 229, 0.04)',
                      color: 'var(--accent-primary, #4f46e5)',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'background-color 0.15s'
                    }}
                  >
                    <Plus size={16} /> Add Check-out Time
                  </button>
                )}

                {/* Duration / Calculation summary badge */}
                {hasCheckOut && (() => {
                  const ci24 = to24h(ciH, ciM, ciAmpm);
                  const co24 = to24h(coH, coM, coAmpm);
                  const [ih, im] = ci24.split(':').map(Number);
                  const [oh, om] = co24.split(':').map(Number);
                  const startMin = ih * 60 + im;
                  const endMin = oh * 60 + om;
                  const diffMin = endMin - startMin;

                  if (diffMin <= 0) {
                    return (
                      <div style={{ marginBottom: '14px', padding: '8px 12px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', fontSize: '0.82rem', color: '#b91c1c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={15} /> Check-out time must be later than check-in time.
                      </div>
                    );
                  }

                  const hrs = Math.floor(diffMin / 60);
                  const mins = diffMin % 60;
                  const totalHrs = (diffMin / 60).toFixed(1);

                  return (
                    <div style={{ marginBottom: '14px', padding: '9px 14px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.84rem', color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={16} /> Total Working Shift: {hrs}h {mins > 0 ? `${mins}m ` : ''}({totalHrs} hrs)
                    </div>
                  );
                })()}

                <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '4px 0 16px 0', lineHeight: 1.4 }}>
                  ⚡ Admin override &bull; Updates {emp.user.name}'s attendance record for {dateStr}.
                </p>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => setEditingDay(null)}
                    style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="primary-btn" 
                    disabled={loading}
                    style={{ padding: '9px 22px', borderRadius: '8px', background: 'var(--accent-primary, #4f46e5)', color: '#ffffff', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
                  >
                    {loading ? 'Saving...' : 'Save Times'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
