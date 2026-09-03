"use client";

import React, { useState, useMemo } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  Search, 
  Layers, 
  Check, 
  X, 
  RotateCcw,
  UserCheck
} from "lucide-react";
import { updateLeaveStatus } from "@/app/actions/leaveActions";

interface AdminLeavePanelProps {
  leaves: any[];
}

export default function AdminLeavePanel({ leaves }: AdminLeavePanelProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleStatusUpdate = async (leaveId: string, status: 'Approved' | 'Rejected' | 'Pending') => {
    setIsUpdating(leaveId);
    try {
      const res = await updateLeaveStatus({ leaveId, status });
      if (res.error) {
        alert(`Failed to update leave status: ${res.error}`);
      }
    } catch (e: any) {
      alert(`Error updating leave: ${e.message}`);
    } finally {
      setIsUpdating(null);
    }
  };

  const pendingLeaves = useMemo(() => leaves.filter(l => l.status === 'Pending'), [leaves]);
  const approvedLeaves = useMemo(() => leaves.filter(l => l.status === 'Approved'), [leaves]);
  const rejectedLeaves = useMemo(() => leaves.filter(l => l.status === 'Rejected'), [leaves]);

  const filteredLeaves = useMemo(() => {
    let list = leaves;
    if (activeTab === 'pending') list = pendingLeaves;
    else if (activeTab === 'approved') list = approvedLeaves;
    else if (activeTab === 'rejected') list = rejectedLeaves;

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter(l => {
      const empName = l.employee?.user?.name?.toLowerCase() || '';
      const email = l.employee?.user?.email?.toLowerCase() || '';
      const type = l.leaveType?.toLowerCase() || '';
      const reason = l.reason?.toLowerCase() || '';
      return empName.includes(q) || email.includes(q) || type.includes(q) || reason.includes(q);
    });
  }, [leaves, pendingLeaves, approvedLeaves, rejectedLeaves, activeTab, searchQuery]);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            Leave Approvals & Records 📋
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '3px 0 0 0' }}>
            Review, approve, or reject employee leave applications across your organization.
          </p>
        </div>

        {pendingLeaves.length > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', color: '#b45309', fontWeight: 600, fontSize: '0.78rem' }}>
            <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
            {pendingLeaves.length} Action{pendingLeaves.length === 1 ? '' : 's'} Required
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Pending Card */}
        <div 
          onClick={() => setActiveTab('pending')}
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '12px', 
            padding: '18px 20px', 
            border: `1.5px solid ${activeTab === 'pending' ? '#f59e0b' : '#e2e8f0'}`, 
            borderLeft: '4px solid #f59e0b',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Pending Review</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#b45309' }}>{pendingLeaves.length}</div>
          <div style={{ fontSize: '0.74rem', color: '#d97706', marginTop: '3px', fontWeight: 500 }}>
            {pendingLeaves.length > 0 ? 'Requires immediate action' : 'All caught up'}
          </div>
        </div>

        {/* Approved Card */}
        <div 
          onClick={() => setActiveTab('approved')}
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '12px', 
            padding: '18px 20px', 
            border: `1.5px solid ${activeTab === 'approved' ? '#10b981' : '#e2e8f0'}`, 
            borderLeft: '4px solid #10b981',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Approved Leaves</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#15803d' }}>{approvedLeaves.length}</div>
          <div style={{ fontSize: '0.74rem', color: '#16a34a', marginTop: '3px', fontWeight: 500 }}>
            Granted time off
          </div>
        </div>

        {/* Rejected Card */}
        <div 
          onClick={() => setActiveTab('rejected')}
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '12px', 
            padding: '18px 20px', 
            border: `1.5px solid ${activeTab === 'rejected' ? '#ef4444' : '#e2e8f0'}`, 
            borderLeft: '4px solid #ef4444',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Rejected Requests</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <XCircle size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#b91c1c' }}>{rejectedLeaves.length}</div>
          <div style={{ fontSize: '0.74rem', color: '#dc2626', marginTop: '3px', fontWeight: 500 }}>
            Declined requests
          </div>
        </div>

        {/* Total Card */}
        <div 
          onClick={() => setActiveTab('all')}
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '12px', 
            padding: '18px 20px', 
            border: `1.5px solid ${activeTab === 'all' ? '#4f46e5' : '#e2e8f0'}`, 
            borderLeft: '4px solid #4f46e5',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total Applications</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#4338ca' }}>{leaves.length}</div>
          <div style={{ fontSize: '0.74rem', color: '#4f46e5', marginTop: '3px', fontWeight: 500 }}>
            All-time logged leaves
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div 
        style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: '14px', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          overflow: 'hidden'
        }}
      >
        {/* Card Toolbar & Filter Tabs */}
        <div 
          style={{ 
            padding: '14px 18px', 
            borderBottom: '1px solid #e2e8f0', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '12px',
            backgroundColor: '#f8fafc'
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                backgroundColor: activeTab === 'pending' ? '#ffffff' : 'transparent',
                color: activeTab === 'pending' ? '#b45309' : '#64748b',
                boxShadow: activeTab === 'pending' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Clock size={13} /> Pending ({pendingLeaves.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                backgroundColor: activeTab === 'all' ? '#ffffff' : 'transparent',
                color: activeTab === 'all' ? '#4338ca' : '#64748b',
                boxShadow: activeTab === 'all' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              All Requests ({leaves.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('approved')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                backgroundColor: activeTab === 'approved' ? '#ffffff' : 'transparent',
                color: activeTab === 'approved' ? '#15803d' : '#64748b',
                boxShadow: activeTab === 'approved' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Approved ({approvedLeaves.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rejected')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                backgroundColor: activeTab === 'rejected' ? '#ffffff' : 'transparent',
                color: activeTab === 'rejected' ? '#b91c1c' : '#64748b',
                boxShadow: activeTab === 'rejected' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Rejected ({rejectedLeaves.length})
            </button>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search employee, leave type, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                backgroundColor: '#ffffff',
                outline: 'none',
                color: '#0f172a'
              }}
            />
          </div>
        </div>

        {/* Table View */}
        <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '820px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '0.74rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                  Employee
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.74rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                  Leave Type
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.74rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                  Date Duration
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.74rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                  Days
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.74rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', minWidth: '180px' }}>
                  Reason
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.74rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                  Status
                </th>
                <th style={{ padding: '12px 18px', textAlign: 'right', fontSize: '0.74rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.length > 0 ? (
                filteredLeaves.map((leave) => {
                  const typeBadge = getLeaveTypeBadge(leave.leaveType);
                  const empName = leave.employee?.user?.name || 'Unknown Employee';
                  const empEmail = leave.employee?.user?.email || '';
                  const initials = empName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'E';

                  return (
                    <tr 
                      key={leave.id} 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Employee */}
                      <td style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div 
                            style={{ 
                              width: '34px', 
                              height: '34px', 
                              borderRadius: '8px', 
                              backgroundColor: '#e0e7ff', 
                              color: '#4338ca', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontWeight: 600, 
                              fontSize: '0.8rem',
                              flexShrink: 0
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>
                              {empName}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {empEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Leave Type */}
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                        <span 
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px', 
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            backgroundColor: typeBadge.bg, 
                            color: typeBadge.text, 
                            border: `1px solid ${typeBadge.border}`,
                            fontSize: '0.76rem',
                            fontWeight: 500,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span>{typeBadge.emoji}</span>
                          <span>{leave.leaveType}</span>
                        </span>
                      </td>

                      {/* Date Duration */}
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#334155', fontSize: '0.82rem', fontWeight: 500 }}>
                          <Calendar size={13} style={{ color: '#94a3b8' }} />
                          {formatDate(leave.startDate)}
                          <span style={{ color: '#94a3b8' }}>→</span>
                          {formatDate(leave.endDate)}
                        </div>
                      </td>

                      {/* Days */}
                      <td style={{ padding: '12px 14px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: '5px', backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 600, fontSize: '0.78rem' }}>
                          {leave.numberOfDays} {leave.numberOfDays === 1 ? 'Day' : 'Days'}
                        </span>
                      </td>

                      {/* Reason */}
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4, maxWidth: '280px' }}>
                          {leave.reason || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No reason provided</span>}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 14px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                        {leave.status === 'Pending' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.72rem', fontWeight: 600 }}>
                            <Clock size={11} /> Pending
                          </span>
                        )}
                        {leave.status === 'Approved' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '0.72rem', fontWeight: 600 }}>
                            <Check size={11} /> Approved
                          </span>
                        )}
                        {leave.status === 'Rejected' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', fontSize: '0.72rem', fontWeight: 600 }}>
                            <X size={11} /> Rejected
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 18px', textAlign: 'right', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                        {leave.status === 'Pending' ? (
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button 
                              type="button"
                              onClick={() => handleStatusUpdate(leave.id, 'Approved')}
                              disabled={isUpdating === leave.id}
                              style={{ 
                                padding: '5px 12px', 
                                fontSize: '0.78rem', 
                                fontWeight: 600,
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 1px 2px rgba(16, 185, 129, 0.2)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleStatusUpdate(leave.id, 'Rejected')}
                              disabled={isUpdating === leave.id}
                              style={{ 
                                padding: '5px 12px', 
                                fontSize: '0.78rem', 
                                fontWeight: 600,
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <X size={13} /> Reject
                            </button>
                          </div>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => handleStatusUpdate(leave.id, 'Pending')}
                            disabled={isUpdating === leave.id}
                            style={{ 
                              padding: '4px 10px', 
                              fontSize: '0.75rem', 
                              fontWeight: 500,
                              backgroundColor: '#f8fafc',
                              color: '#64748b',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                            title="Revert back to Pending status"
                          >
                            <RotateCcw size={12} /> Revert to Pending
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <UserCheck size={32} style={{ color: '#cbd5e1' }} />
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem' }}>No leave applications found</div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>There are no {activeTab !== 'all' ? activeTab : ''} leave requests matching your filter.</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
