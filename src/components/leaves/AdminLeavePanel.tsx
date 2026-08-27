"use client";

import React, { useState, useMemo } from 'react';
import { 
  CalendarRange, 
  Check, 
  X, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search, 
  User, 
  Filter, 
  Sparkles,
  Calendar,
  Layers
} from 'lucide-react';
import { updateLeaveStatus } from '@/app/actions/leaveActions';

interface AdminLeavePanelProps {
  leaves: any[];
}

export default function AdminLeavePanel({ leaves }: AdminLeavePanelProps) {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const handleStatusUpdate = async (leaveId: string, status: "Approved" | "Rejected" | "Pending") => {
    setIsUpdating(leaveId);
    try {
      await updateLeaveStatus(leaveId, status);
    } catch (err) {
      console.error(err);
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            Leave Approvals & Records 📋
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Review, approve, or reject employee leave applications across your organization.
          </p>
        </div>

        {pendingLeaves.length > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', color: '#b45309', fontWeight: 700, fontSize: '0.85rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b', animation: 'pulse 1.5s infinite' }}></span>
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
            borderRadius: '14px', 
            padding: '20px', 
            border: `2px solid ${activeTab === 'pending' ? '#f59e0b' : '#e2e8f0'}`, 
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Pending Review</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#b45309' }}>{pendingLeaves.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '4px', fontWeight: 600 }}>
            {pendingLeaves.length > 0 ? 'Requires immediate action' : 'All caught up'}
          </div>
        </div>

        {/* Approved Card */}
        <div 
          onClick={() => setActiveTab('approved')}
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '14px', 
            padding: '20px', 
            border: `2px solid ${activeTab === 'approved' ? '#10b981' : '#e2e8f0'}`, 
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Approved Leaves</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#15803d' }}>{approvedLeaves.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '4px', fontWeight: 600 }}>
            Granted time off
          </div>
        </div>

        {/* Rejected Card */}
        <div 
          onClick={() => setActiveTab('rejected')}
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '14px', 
            padding: '20px', 
            border: `2px solid ${activeTab === 'rejected' ? '#ef4444' : '#e2e8f0'}`, 
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Rejected Requests</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <XCircle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#b91c1c' }}>{rejectedLeaves.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '4px', fontWeight: 600 }}>
            Declined requests
          </div>
        </div>

        {/* Total Card */}
        <div 
          onClick={() => setActiveTab('all')}
          style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '14px', 
            padding: '20px', 
            border: `2px solid ${activeTab === 'all' ? '#6366f1' : '#e2e8f0'}`, 
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Total Applications</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#4338ca' }}>{leaves.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#4f46e5', marginTop: '4px', fontWeight: 600 }}>
            All-time logged leaves
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div 
        style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: '16px', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden'
        }}
      >
        {/* Card Toolbar & Filter Tabs */}
        <div 
          style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid #e2e8f0', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '14px',
            backgroundColor: '#f8fafc'
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '6px', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '10px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                backgroundColor: activeTab === 'pending' ? '#ffffff' : 'transparent',
                color: activeTab === 'pending' ? '#b45309' : '#64748b',
                boxShadow: activeTab === 'pending' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Clock size={14} /> Pending ({pendingLeaves.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                backgroundColor: activeTab === 'all' ? '#ffffff' : 'transparent',
                color: activeTab === 'all' ? '#0f172a' : '#64748b',
                boxShadow: activeTab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              All Requests ({leaves.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('approved')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                backgroundColor: activeTab === 'approved' ? '#ffffff' : 'transparent',
                color: activeTab === 'approved' ? '#15803d' : '#64748b',
                boxShadow: activeTab === 'approved' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Approved ({approvedLeaves.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rejected')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                backgroundColor: activeTab === 'rejected' ? '#ffffff' : 'transparent',
                color: activeTab === 'rejected' ? '#b91c1c' : '#64748b',
                boxShadow: activeTab === 'rejected' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Rejected ({rejectedLeaves.length})
            </button>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search employee, leave type, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
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
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                  Employee
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                  Leave Type
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                  Date Duration
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                  Days
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', minWidth: '180px' }}>
                  Reason
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                  Status
                </th>
                <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
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
                      <td style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div 
                            style={{ 
                              width: '38px', 
                              height: '38px', 
                              borderRadius: '10px', 
                              backgroundColor: '#e0e7ff', 
                              color: '#4338ca', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              flexShrink: 0
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                              {empName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {empEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Leave Type */}
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <span 
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '5px', 
                            padding: '4px 10px', 
                            borderRadius: '6px', 
                            backgroundColor: typeBadge.bg, 
                            color: typeBadge.text, 
                            border: `1px solid ${typeBadge.border}`,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span>{typeBadge.emoji}</span>
                          <span>{leave.leaveType}</span>
                        </span>
                      </td>

                      {/* Date Duration */}
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>
                          <Calendar size={14} style={{ color: '#94a3b8' }} />
                          {formatDate(leave.startDate)}
                          <span style={{ color: '#94a3b8' }}>→</span>
                          {formatDate(leave.endDate)}
                        </div>
                      </td>

                      {/* Days */}
                      <td style={{ padding: '14px 16px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 800, fontSize: '0.8rem' }}>
                          {leave.numberOfDays} {leave.numberOfDays === 1 ? 'Day' : 'Days'}
                        </span>
                      </td>

                      {/* Reason */}
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.4, maxWidth: '280px' }}>
                          {leave.reason || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No reason provided</span>}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                        {leave.status === 'Pending' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.75rem', fontWeight: 700 }}>
                            <Clock size={12} /> Pending
                          </span>
                        )}
                        {leave.status === 'Approved' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '0.75rem', fontWeight: 700 }}>
                            <Check size={12} /> Approved
                          </span>
                        )}
                        {leave.status === 'Rejected' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', fontSize: '0.75rem', fontWeight: 700 }}>
                            <X size={12} /> Rejected
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'right', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                        {leave.status === 'Pending' ? (
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button 
                              type="button"
                              onClick={() => handleStatusUpdate(leave.id, 'Approved')}
                              disabled={isUpdating === leave.id}
                              style={{ 
                                padding: '6px 14px', 
                                fontSize: '0.8rem', 
                                fontWeight: 700,
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                boxShadow: '0 1px 2px rgba(16, 185, 129, 0.2)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Check size={14} /> Approve
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleStatusUpdate(leave.id, 'Rejected')}
                              disabled={isUpdating === leave.id}
                              style={{ 
                                padding: '6px 14px', 
                                fontSize: '0.8rem', 
                                fontWeight: 700,
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => handleStatusUpdate(leave.id, 'Pending')}
                            disabled={isUpdating === leave.id}
                            style={{ 
                              padding: '5px 12px', 
                              fontSize: '0.78rem', 
                              fontWeight: 700,
                              backgroundColor: '#f8fafc',
                              color: '#64748b',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <RefreshCw size={12} /> Revert to Pending
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        {activeTab === 'pending' ? <CheckCircle2 size={32} style={{ color: '#10b981' }} /> : <CalendarRange size={32} />}
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                        {activeTab === 'pending' 
                          ? '🎉 All Caught Up!' 
                          : searchQuery 
                            ? 'No matching requests found' 
                            : 'No leave applications in this view'}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, maxWidth: '400px' }}>
                        {activeTab === 'pending' 
                          ? 'There are currently no employee leave requests waiting for your approval.' 
                          : searchQuery 
                            ? `No records matched your search query "${searchQuery}".` 
                            : 'Employee leave requests will appear here once submitted.'}
                      </p>
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
