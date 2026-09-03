"use client";

import DatePicker from '@/components/ui/DatePicker';
import React, { useState } from 'react';
import { 
  CalendarRange, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  CheckCircle2, 
  FileText 
} from 'lucide-react';
import { submitLeaveRequest } from '@/app/actions/leaveActions';

interface EmployeeLeavePanelProps {
  employeeId: string;
  leaves: any[];
}

export default function EmployeeLeavePanel({ employeeId, leaves }: EmployeeLeavePanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = {
      employeeId,
      leaveType: formData.get('leaveType') as string,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      numberOfDays: Number(formData.get('numberOfDays')),
      reason: formData.get('reason') as string,
    };

    const res = await submitLeaveRequest(data);
    if (res.success) {
      setMessage({ text: '🎉 Leave request submitted successfully! Your manager has been notified.', type: 'success' });
      form.reset();
    } else {
      setMessage({ text: `Failed to submit: ${res.error}`, type: 'error' });
    }
    setIsSubmitting(false);
  };

  const pendingLeaves = leaves.filter(l => l.status === 'Pending');
  const approvedLeaves = leaves.filter(l => l.status === 'Approved');
  const totalDaysTaken = approvedLeaves.reduce((sum, l) => sum + (Number(l.numberOfDays) || 0), 0);

  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case 'Sick Leave':
        return { bg: '#fef3c7', text: '#b45309', border: '#fde68a', emoji: '🤒' };
      case 'Casual Leave':
        return { bg: '#e0e7ff', text: '#4338ca', border: '#c7d2fe', emoji: '🌴' };
      case 'Earned Leave':
        return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', emoji: '🎖️' };
      case 'Unpaid Leave':
        return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', emoji: '⏳' };
      default:
        return { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff', emoji: '📋' };
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            Leave Management & Requests 🌴
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '3px 0 0 0' }}>
            Request time off, view your leave quota, and track real-time approval status.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px 18px', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '4px' }}>Approved Days Taken</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#15803d' }}>{totalDaysTaken} <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#64748b' }}>Days</span></div>
          <div style={{ fontSize: '0.74rem', color: '#16a34a', marginTop: '3px', fontWeight: 500 }}>Approved time off</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px 18px', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '4px' }}>Pending Approvals</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#b45309' }}>{pendingLeaves.length}</div>
          <div style={{ fontSize: '0.74rem', color: '#d97706', marginTop: '3px', fontWeight: 500 }}>Under manager review</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px 18px', border: '1px solid #e2e8f0', borderLeft: '4px solid #4f46e5', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '4px' }}>Total Applications</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#4338ca' }}>{leaves.length}</div>
          <div style={{ fontSize: '0.74rem', color: '#4f46e5', marginTop: '3px', fontWeight: 500 }}>All-time history</div>
        </div>
      </div>

      {/* Grid: Form (1) vs History (2) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', alignItems: 'start' }}>
        
        {/* Request Form */}
        <div 
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '14px', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarRange size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>Apply for Leave</h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>Submit a new time-off request to admin.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Leave Type <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select 
                name="leaveType" 
                required 
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', backgroundColor: '#ffffff', fontWeight: 500, color: '#0f172a', outline: 'none' }}
              >
                <option value="Casual Leave">🌴 Casual Leave</option>
                <option value="Sick Leave">🤒 Sick Leave</option>
                <option value="Earned Leave">🎖️ Earned Leave</option>
                <option value="Unpaid Leave">⏳ Unpaid Leave (LWP)</option>
              </select>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Start Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <DatePicker 
                  name="startDate" 
                  required 
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', backgroundColor: '#ffffff', outline: 'none' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  End Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <DatePicker 
                  name="endDate" 
                  required 
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', backgroundColor: '#ffffff', outline: 'none' }} 
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Total Number of Days <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                type="number" 
                step="0.5" 
                min="0.5" 
                name="numberOfDays" 
                required 
                placeholder="e.g. 1 or 0.5"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', backgroundColor: '#ffffff', outline: 'none' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Reason for Leave <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea 
                name="reason" 
                required 
                rows={3} 
                placeholder="Describe your reason for time off..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', backgroundColor: '#ffffff', outline: 'none', resize: 'vertical' }}
              ></textarea>
            </div>

            {message && (
              <div 
                style={{ 
                  padding: '10px 12px', 
                  borderRadius: '6px', 
                  fontSize: '0.8rem', 
                  fontWeight: 500,
                  backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                  color: message.type === 'success' ? '#15803d' : '#dc2626',
                  border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`
                }}
              >
                {message.text}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="primary-btn"
              style={{ 
                padding: '9px 18px', 
                borderRadius: '6px', 
                fontSize: '0.82rem', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              {isSubmitting ? 'Submitting...' : <><Send size={14} /> Submit Leave Request</>}
            </button>
          </form>
        </div>

        {/* Leave History */}
        <div 
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '14px', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} style={{ color: '#4f46e5' }} /> My Leave History ({leaves.length})
            </h3>
            <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '2px 0 0 0' }}>Track previous requests and current approval status.</p>
          </div>

          <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '580px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Dates</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Days</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Reason</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length > 0 ? (
                  leaves.map((leave) => {
                    const typeBadge = getLeaveTypeBadge(leave.leaveType);
                    return (
                      <tr 
                        key={leave.id} 
                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>
                          <span 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px', 
                              padding: '2px 7px', 
                              borderRadius: '5px', 
                              backgroundColor: typeBadge.bg, 
                              color: typeBadge.text, 
                              border: `1px solid ${typeBadge.border}`,
                              fontSize: '0.72rem',
                              fontWeight: 500
                            }}
                          >
                            <span>{typeBadge.emoji}</span>
                            <span>{leave.leaveType}</span>
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#334155', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '5px', backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 600, fontSize: '0.75rem' }}>
                            {leave.numberOfDays}d
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#64748b' }}>
                          <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {leave.reason}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                          {leave.status === 'Pending' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.72rem', fontWeight: 600 }}>
                              <Clock size={11} /> Pending
                            </span>
                          )}
                          {leave.status === 'Approved' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '0.72rem', fontWeight: 600 }}>
                              <CheckCircle size={11} /> Approved
                            </span>
                          )}
                          {leave.status === 'Rejected' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', fontSize: '0.72rem', fontWeight: 600 }}>
                              <XCircle size={11} /> Rejected
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '30px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                      No leave requests submitted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
