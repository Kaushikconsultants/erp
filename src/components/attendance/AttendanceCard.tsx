"use client";

import React, { useState } from 'react';
import { updateAttendanceAdmin } from '@/app/actions/attendanceActions';
import "@/components/ui/modal.css"; // Reuse modal styling

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

export default function AttendanceCard({ emp, isAdmin, year, mon, daysArr, today }: AttendanceCardProps) {
  const [editingDay, setEditingDay] = useState<{ day: number; record: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState("Present");

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
    setNewStatus(record ? record.status : "Present");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDay) return;
    
    setLoading(true);
    // Construct date string (YYYY-MM-DD)
    const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(editingDay.day).padStart(2, '0')}`;
    
    await updateAttendanceAdmin(emp.id, dateStr, newStatus);
    
    setLoading(false);
    setEditingDay(null);
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
        {/* Offset for first day */}
        {Array.from({ length: (new Date(year, mon - 1, 1).getDay() + 6) % 7 }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {daysArr.map(day => {
          const record = attendanceMap[day];
          const isPast = new Date(year, mon - 1, day) <= today;
          const color = record ? STATUS_COLOR[record.status] : (isPast ? '#e5e7eb' : 'transparent');
          return (
            <div 
              key={day} 
              onClick={() => handleCellClick(day, record)}
              style={{
                textAlign: 'center', padding: '8px 4px', borderRadius: '6px',
                background: color, fontSize: '0.8rem', fontWeight: record ? 700 : 400,
                color: record ? '#fff' : 'var(--text-muted)',
                cursor: isAdmin ? 'pointer' : 'default', border: '1px solid transparent',
                transition: 'transform 0.1s'
              }}
              title={record ? record.status : 'Not marked'}
              onMouseEnter={(e) => isAdmin && (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={(e) => isAdmin && (e.currentTarget.style.transform = 'scale(1)')}
            >
              {day}
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
        {isAdmin && <div style={{marginLeft: 'auto', color: 'var(--accent-primary)', fontWeight: 600}}>* Click any day to edit</div>}
      </div>

      {/* Edit Modal */}
      {editingDay && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel animate-in" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Edit Attendance</h2>
              <button className="close-btn" onClick={() => setEditingDay(null)}>×</button>
            </div>
            <form onSubmit={handleSave} className="modal-body">
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Updating attendance for <strong>{emp.user.name}</strong> on <strong>{year}-{String(mon).padStart(2, '0')}-{String(editingDay.day).padStart(2, '0')}</strong>.
              </p>
              <div className="vertical-group">
                <label>Status</label>
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
                  {loading ? "Saving..." : "Save Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
