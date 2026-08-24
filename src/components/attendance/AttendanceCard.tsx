"use client";

import React, { useState } from 'react';
import { updateAttendanceAdmin, updateCheckInOut } from '@/app/actions/attendanceActions';
import "@/components/ui/modal.css";

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

const toTimeInput = (dt: string | Date | null | undefined): string => {
  if (!dt) return '';
  const d = new Date(dt);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function AttendanceCard({ emp, isAdmin, year, mon, daysArr, today }: AttendanceCardProps) {
  const [editingDay, setEditingDay] = useState<{ day: number; record: any } | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'timing'>('status');
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState("Present");
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  const attendanceMap: Record<number, any> = {};
  emp.attendances.forEach((a: any) => {
    const day = new Date(a.date).getDate();
    attendanceMap[day] = a;
  });

  const presentDays = emp.attendances.filter((a: any) => a.status === 'Present').length;
  const absentDays = emp.attendances.filter((a: any) => a.status === 'Absent').length;

  const handleCellClick = (day: number, record: any) => {
    if (!isAdmin) return;
    setEditingDay({ day, record });
    setActiveTab('status');
    setNewStatus(record ? record.status : "Present");
    setCheckIn(toTimeInput(record?.checkIn));
    setCheckOut(toTimeInput(record?.checkOut));
  };

  const dateStr = editingDay
    ? `${year}-${String(mon).padStart(2, '0')}-${String(editingDay.day).padStart(2, '0')}`
    : '';

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDay) return;
    setLoading(true);
    await updateAttendanceAdmin(emp.id, dateStr, newStatus);
    setLoading(false);
    setEditingDay(null);
  };

  const handleSaveTiming = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDay) return;
    if (!checkIn) { alert('Check-in time is required.'); return; }
    if (checkOut && checkOut <= checkIn) { alert('Check-out must be after check-in.'); return; }
    setLoading(true);
    const res = await updateCheckInOut(
      editingDay.record?.id || '',
      emp.id,
      dateStr,
      checkIn,
      checkOut
    );
    setLoading(false);
    if ((res as any).error) { alert((res as any).error); return; }
    setEditingDay(null);
  };

  // Compute working hours for display in cell tooltip
  const getWorkingHours = (record: any) => {
    if (!record?.checkIn) return '';
    const ci = new Date(record.checkIn);
    const co = record.checkOut ? new Date(record.checkOut) : null;
    if (!co) return `In: ${toTimeInput(ci)}`;
    const hrs = ((co.getTime() - ci.getTime()) / (1000 * 60 * 60)).toFixed(1);
    return `${toTimeInput(ci)} – ${toTimeInput(co)} (${hrs}h)`;
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{emp.user.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{emp.department || 'Sales'}</div>
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '0.875rem' }}>
          <span style={{ color: '#22c55e', fontWeight: 600 }}>✓ {presentDays} Present</span>
          <span style={{ color: '#ef4444', fontWeight: 600 }}>✗ {absentDays} Absent</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, padding: '4px' }}>{d}</div>
        ))}
        {Array.from({ length: (new Date(year, mon - 1, 1).getDay() + 6) % 7 }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {daysArr.map(day => {
          const record = attendanceMap[day];
          const isPast = new Date(year, mon - 1, day) <= today;
          const color = record ? STATUS_COLOR[record.status] : (isPast ? '#e5e7eb' : 'transparent');
          const hasTime = record?.checkIn;
          return (
            <div
              key={day}
              onClick={() => handleCellClick(day, record)}
              style={{
                textAlign: 'center', padding: '6px 4px 4px 4px', borderRadius: '6px',
                background: color, fontSize: '0.8rem', fontWeight: record ? 700 : 400,
                color: record ? '#fff' : 'var(--text-muted)',
                cursor: isAdmin ? 'pointer' : 'default', border: '1px solid transparent',
                transition: 'transform 0.1s', position: 'relative'
              }}
              title={record ? `${record.status}${hasTime ? '\n' + getWorkingHours(record) : ''}` : 'Not marked'}
              onMouseEnter={e => isAdmin && (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={e => isAdmin && (e.currentTarget.style.transform = 'scale(1)')}
            >
              {day}
              {hasTime && (
                <div style={{ fontSize: '8px', opacity: 0.85, lineHeight: 1, marginTop: '2px' }}>
                  {toTimeInput(record.checkIn)}
                  {record.checkOut ? `–${toTimeInput(record.checkOut)}` : '…'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '0.75rem', flexWrap: 'wrap' }}>
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 12, height: 12, borderRadius: '3px', background: color }} />
            <span style={{ color: 'var(--text-muted)' }}>{status}</span>
          </div>
        ))}
        {isAdmin && <div style={{ marginLeft: 'auto', color: 'var(--accent-primary)', fontWeight: 600 }}>* Click any day to edit</div>}
      </div>

      {/* Edit Modal */}
      {editingDay && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel animate-in" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0 }}>Edit Attendance</h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {emp.user.name} — {dateStr}
                </p>
              </div>
              <button className="close-btn" onClick={() => setEditingDay(null)}>×</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', margin: '0 0 16px 0' }}>
              {(['status', 'timing'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1, padding: '10px', border: 'none', background: 'transparent',
                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                    color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-muted)',
                    borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    marginBottom: '-2px', transition: 'all 0.15s'
                  }}
                >
                  {tab === 'status' ? '📋 Status' : '🕐 Check-in / Check-out'}
                </button>
              ))}
            </div>

            {/* Tab: Status */}
            {activeTab === 'status' && (
              <form onSubmit={handleSaveStatus} className="modal-body">
                <div className="vertical-group">
                  <label>Attendance Status</label>
                  <select value={newStatus} onChange={e => setNewStatus(e.target.value)} required>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Leave">Leave</option>
                    <option value="DELETE">Remove Record (Not Marked)</option>
                  </select>
                </div>
                <div className="modal-footer" style={{ marginTop: '16px', background: 'transparent', padding: '0', border: 'none' }}>
                  <button type="button" className="btn-secondary" onClick={() => setEditingDay(null)}>Cancel</button>
                  <button type="submit" className="primary-btn" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Status'}
                  </button>
                </div>
              </form>
            )}

            {/* Tab: Timing */}
            {activeTab === 'timing' && (
              <form onSubmit={handleSaveTiming} className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="vertical-group">
                    <label>Check-in Time <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="time"
                      value={checkIn}
                      onChange={e => setCheckIn(e.target.value)}
                      required
                    />
                  </div>
                  <div className="vertical-group">
                    <label>Check-out Time</label>
                    <input
                      type="time"
                      value={checkOut}
                      onChange={e => setCheckOut(e.target.value)}
                    />
                  </div>
                </div>

                {checkIn && checkOut && checkOut > checkIn && (
                  <div style={{
                    marginTop: '10px', padding: '8px 12px', borderRadius: '6px',
                    background: 'rgba(34,197,94,0.1)', border: '1px solid #bbf7d0',
                    fontSize: '0.82rem', color: '#166534', fontWeight: 600
                  }}>
                    ⏱ Working hours: {
                      (() => {
                        const [ih, im] = checkIn.split(':').map(Number);
                        const [oh, om] = checkOut.split(':').map(Number);
                        const hrs = (oh * 60 + om - ih * 60 - im) / 60;
                        return `${hrs.toFixed(1)} hrs`;
                      })()
                    }
                  </div>
                )}

                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  ⚠️ Admin override — this will update the employee's check-in/out record for {dateStr}.
                </p>

                <div className="modal-footer" style={{ marginTop: '12px', background: 'transparent', padding: '0', border: 'none' }}>
                  <button type="button" className="btn-secondary" onClick={() => setEditingDay(null)}>Cancel</button>
                  <button type="submit" className="primary-btn" disabled={loading}>
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
