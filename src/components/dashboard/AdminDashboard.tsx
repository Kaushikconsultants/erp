"use client";

import React, { useState, useMemo } from 'react';
import SalesChart from '@/components/dashboard/SalesChart';
import TopProductsChart from '@/components/dashboard/TopProductsChart';
import Link from 'next/link';
import { ArrowUpRight, Flame, Users, CalendarClock, TrendingUp, Activity, UserCheck, Trophy, Zap, Rocket, AlertCircle, ShieldCheck, Target, ClipboardList, Sparkles, Plus, Pencil, MessageSquare, RefreshCw, Package } from 'lucide-react';
import KPIDetailsModal from './KPIDetailsModal';
import EditSalespersonTargetsModal from './EditSalespersonTargetsModal';
import AssignTaskModal from './AssignTaskModal';
import AISprintCoachModal from './AISprintCoachModal';
import AIReorderPredictorModal from '../ai/AIReorderPredictorModal';
import DeadStockInsightsModal from '../products/DeadStockInsightsModal';
import AskERPAssistantModal from '../ai/AskERPAssistantModal';

interface AdminDashboardProps {
  totalRevenue: number;
  totalCustomers: number;
  totalOrders: number;
  pendingCalls: number;
  atRiskCustomersCount?: number;
  salesData: any[];
  topProductsData: any[];
  teamPerformance: any[];
  hotCustomers: any[];
  liveAttendance?: any[];
  todayOrdersCount?: number;
  liveLeaderboard?: any[];
  isCheckedIn?: boolean;
  isCheckedOut?: boolean;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  sprintTeamHealth?: any[];
}

export default function AdminDashboard({
  totalRevenue,
  totalCustomers,
  totalOrders,
  pendingCalls,
  atRiskCustomersCount = 0,
  salesData,
  topProductsData,
  teamPerformance,
  hotCustomers,
  liveAttendance = [],
  todayOrdersCount = 0,
  liveLeaderboard = [],
  isCheckedIn = false,
  isCheckedOut = false,
  checkInTime,
  checkOutTime,
  sprintTeamHealth = []
}: AdminDashboardProps) {
  
  const [activeModalType, setActiveModalType] = useState<'customers' | 'orders' | 'calls' | null>(null);

  // Target & Task Delegation Modals
  const [editingTargetsEmployee, setEditingTargetsEmployee] = useState<any | null>(null);
  const [assigningTaskEmployee, setAssigningTaskEmployee] = useState<any | null>(null);
  const [aiCoachEmployee, setAiCoachEmployee] = useState<any | null>(null);

  // Executive AI Suite Modals
  const [showAskERPModal, setShowAskERPModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showDeadStockModal, setShowDeadStockModal] = useState(false);

  // Live Team Presence Filter
  const [teamAttendanceFilter, setTeamAttendanceFilter] = useState<'ALL' | 'ACTIVE' | 'CHECKED_OUT'>('ALL');

  const activeTeamCount = useMemo(() => {
    return liveAttendance.filter((att: any) => att.isShiftActive).length;
  }, [liveAttendance]);

  const checkedOutTeamCount = useMemo(() => {
    return liveAttendance.filter((att: any) => !att.isShiftActive).length;
  }, [liveAttendance]);

  const filteredAttendance = useMemo(() => {
    return liveAttendance.filter((att: any) => {
      if (teamAttendanceFilter === 'ACTIVE') return att.isShiftActive;
      if (teamAttendanceFilter === 'CHECKED_OUT') return !att.isShiftActive;
      return true;
    });
  }, [liveAttendance, teamAttendanceFilter]);

  const maxLeaderboardTotal = useMemo(() => {
    if (!liveLeaderboard || liveLeaderboard.length === 0) return 1;
    return Math.max(...liveLeaderboard.map((emp: any) => Number(emp.total) || 0), 1);
  }, [liveLeaderboard]);

  return (
    <div className="dashboard-container admin-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Admin Command Center 👑</h1>
          <p className="page-subtitle">Overview of your entire business, sales velocity, and executive AI intelligence.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowAskERPModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: '#7c3aed',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={15} />
            <span>Ask ERP Copilot</span>
          </button>
          <Link href="/reports" className="primary-btn hover-lift">View Full Reports</Link>
        </div>
      </div>

      {/* EXECUTIVE AI INTELLIGENCE BANNER */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {/* 1. Ask ERP Assistant Card */}
        <div
          onClick={() => setShowAskERPModal(true)}
          style={{
            backgroundColor: '#f5f3ff',
            border: '1px solid #ddd6fe',
            borderRadius: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#7c3aed', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#5b21b6' }}>Ask ERP Assistant</span>
              <span style={{ fontSize: '0.68rem', backgroundColor: '#ede9fe', color: '#6d28d9', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>Gemini 2.5</span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#6d28d9' }}>
              Voice & text Q&A on revenue, profit, cash flow & KPIs.
            </p>
          </div>
        </div>

        {/* 2. AI Customer Re-Order & Churn Predictor */}
        <div
          onClick={() => setShowReorderModal(true)}
          style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <RefreshCw size={19} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e40af' }}>Re-Order & Churn Engine</span>
              <span style={{ fontSize: '0.68rem', backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>Smart Nudge</span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#1d4ed8' }}>
              Detect overdue buyers & send 1-click repeat quotations.
            </p>
          </div>
        </div>

        {/* 3. Dead Stock Liquidation */}
        <div
          onClick={() => setShowDeadStockModal(true)}
          style={{
            backgroundColor: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#ea580c', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Flame size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#9a3412' }}>Dead Stock Liquidation</span>
              <span style={{ fontSize: '0.68rem', backgroundColor: '#ffedd5', color: '#c2410c', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>Clearance</span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#c2410c' }}>
              Liquidate slow-moving articles with flash B2B deals.
            </p>
          </div>
        </div>
      </div>

      {/* ─── LIVE OPERATIONS & PERFORMANCE COMMAND CENTER ─── */}
      <div className="dashboard-details-grid" style={{ gridTemplateColumns: '1.2fr 1fr', marginBottom: '24px', gap: '16px' }}>
        
        {/* Live Attendance / Team Presence */}
        <div className="detail-card glass-panel" style={{
          borderLeft: '4px solid #10b981',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '310px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div>
            {/* Header with Title & Filter Chips */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UserCheck size={17} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Today's Active Team
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      backgroundColor: '#ecfdf5',
                      color: '#059669',
                      padding: '1px 7px',
                      borderRadius: '12px',
                      border: '1px solid #a7f3d0'
                    }}>
                      {liveAttendance.length} Total
                    </span>
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#059669', fontWeight: 600 }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                      {activeTeamCount} Active Now
                    </span>
                    <span>·</span>
                    <span style={{ color: '#64748b' }}>{checkedOutTeamCount} Shift Ended</span>
                  </div>
                </div>
              </div>

              {/* Segmented Filter Pills */}
              <div style={{
                display: 'inline-flex',
                backgroundColor: '#f1f5f9',
                padding: '2px',
                borderRadius: '7px',
                border: '1px solid #e2e8f0'
              }}>
                <button
                  type="button"
                  onClick={() => setTeamAttendanceFilter('ALL')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '5px',
                    border: 'none',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: teamAttendanceFilter === 'ALL' ? '#ffffff' : 'transparent',
                    color: teamAttendanceFilter === 'ALL' ? '#0f172a' : '#64748b',
                    boxShadow: teamAttendanceFilter === 'ALL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  All ({liveAttendance.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTeamAttendanceFilter('ACTIVE')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '5px',
                    border: 'none',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: teamAttendanceFilter === 'ACTIVE' ? '#ffffff' : 'transparent',
                    color: teamAttendanceFilter === 'ACTIVE' ? '#059669' : '#64748b',
                    boxShadow: teamAttendanceFilter === 'ACTIVE' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  🟢 Active ({activeTeamCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTeamAttendanceFilter('CHECKED_OUT')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '5px',
                    border: 'none',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: teamAttendanceFilter === 'CHECKED_OUT' ? '#ffffff' : 'transparent',
                    color: teamAttendanceFilter === 'CHECKED_OUT' ? '#475569' : '#64748b',
                    boxShadow: teamAttendanceFilter === 'CHECKED_OUT' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Shift Ended ({checkedOutTeamCount})
                </button>
              </div>
            </div>

            {/* Creative Multi-Column Micro-Grid with Scroll Area */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))',
              gap: '8px',
              marginTop: '12px',
              maxHeight: '220px',
              overflowY: 'auto',
              paddingRight: '2px'
            }}>
              {filteredAttendance.length > 0 ? filteredAttendance.map((att: any) => (
                <div 
                  key={att.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '8px 10px', 
                    background: att.isShiftActive ? 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)' : '#ffffff', 
                    border: att.isShiftActive ? '1px solid #bbf7d0' : '1px solid #e2e8f0', 
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = att.isShiftActive ? '#86efac' : '#cbd5e1';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = att.isShiftActive ? '#bbf7d0' : '#e2e8f0';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                    {/* Avatar with live status dot */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '8px', 
                        background: att.isShiftActive ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f1f5f9', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: att.isShiftActive ? '#ffffff' : '#64748b', 
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        boxShadow: att.isShiftActive ? '0 2px 5px rgba(16, 185, 129, 0.25)' : 'none'
                      }}>
                        {att.name.charAt(0).toUpperCase()}
                      </div>
                      {att.isShiftActive && (
                        <span style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          width: '9px',
                          height: '9px',
                          borderRadius: '50%',
                          backgroundColor: '#10b981',
                          border: '2px solid #ffffff'
                        }}></span>
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: 600, 
                        color: '#0f172a', 
                        fontSize: '0.8rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '95px'
                      }} title={att.name}>
                        {att.name}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        In: <span style={{ fontWeight: 600, color: '#334155' }}>{att.checkInStr}</span>
                      </div>
                    </div>
                  </div>

                  <span style={{ 
                    backgroundColor: att.isShiftActive ? '#ecfdf5' : '#f1f5f9', 
                    color: att.isShiftActive ? '#059669' : '#64748b', 
                    border: `1px solid ${att.isShiftActive ? '#a7f3d0' : '#e2e8f0'}`,
                    fontSize: '0.66rem', 
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}>
                    {att.isShiftActive ? 'Active' : 'Ended'}
                  </span>
                </div>
              )) : (
                <div style={{ 
                  gridColumn: '1 / -1',
                  textAlign: 'center', 
                  padding: '28px 12px', 
                  border: '1px dashed #cbd5e1', 
                  borderRadius: '8px', 
                  background: '#f8fafc',
                  color: '#64748b',
                  fontSize: '0.78rem'
                }}>
                  No team members found in this status.
                </div>
              )}
            </div>
          </div>

          {/* Bottom Link */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
            <Link 
              href="/attendance" 
              style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
            >
              View Full Attendance Register →
            </Link>
          </div>
        </div>

        {/* Live Orders Leaderboard */}
        <div className="detail-card glass-panel" style={{
          borderLeft: '4px solid #8b5cf6',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '310px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#f5f3ff',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Trophy size={17} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                    Today's Live Leaderboard
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>
                    Real-time deals closed by sales team
                  </div>
                </div>
              </div>

              <div style={{
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                color: '#7c3aed',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: '12px',
                border: '1px solid rgba(139, 92, 246, 0.2)'
              }}>
                🔥 {todayOrdersCount} Orders Today
              </div>
            </div>

            {/* Leaderboard Cards Container with matching fixed height */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginTop: '12px',
              maxHeight: '220px',
              overflowY: 'auto',
              paddingRight: '2px'
            }}>
              {liveLeaderboard.length > 0 ? liveLeaderboard.map((emp: any, index: number) => {
                const percentOfTop = Math.round((Number(emp.total || 0) / maxLeaderboardTotal) * 100);
                const medalBg = index === 0 ? '#fef3c7' : index === 1 ? '#f1f5f9' : index === 2 ? '#ffedd5' : '#f8fafc';
                const medalColor = index === 0 ? '#d97706' : index === 1 ? '#475569' : index === 2 ? '#c2410c' : '#64748b';
                const medalBorder = index === 0 ? '#fde68a' : index === 1 ? '#e2e8f0' : index === 2 ? '#fed7aa' : '#e2e8f0';

                return (
                  <div
                    key={index}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: index === 0 ? 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)' : '#ffffff',
                      border: index === 0 ? '1px solid #fde68a' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          backgroundColor: medalBg,
                          color: medalColor,
                          border: `1px solid ${medalBorder}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          flexShrink: 0
                        }}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </span>
                        <div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{emp.name}</span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '6px' }}>
                            ({emp.orders} {emp.orders === 1 ? 'order' : 'orders'})
                          </span>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#059669' }}>
                        ₹{Number(emp.total || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* Performance Velocity Bar */}
                    <div style={{ width: '100%', height: '4px', backgroundColor: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${percentOfTop}%`,
                        height: '100%',
                        background: index === 0 ? 'linear-gradient(90deg, #f59e0b 0%, #10b981 100%)' : 'linear-gradient(90deg, #8b5cf6 0%, #3b82f6 100%)',
                        borderRadius: '2px'
                      }}></div>
                    </div>
                  </div>
                );
              }) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '28px 12px', 
                  border: '1px dashed #cbd5e1', 
                  borderRadius: '8px', 
                  background: '#f8fafc',
                  color: '#64748b',
                  fontSize: '0.78rem'
                }}>
                  No sales orders recorded yet today.
                </div>
              )}
            </div>
          </div>

          {/* Bottom Link */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
            <Link 
              href="/orders" 
              style={{ fontSize: '0.74rem', color: '#7c3aed', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
            >
              View All Orders & Sales →
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card glass-panel hover-lift" onClick={() => setActiveModalType('orders')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-header">
            <div className="kpi-title">Total Revenue</div>
            <TrendingUp size={18} className="kpi-icon positive" />
          </div>
          <div className="kpi-value">₹{totalRevenue.toLocaleString('en-IN')}</div>
          <div className="kpi-trend positive">All-time</div>
        </div>
        <div className="kpi-card glass-panel hover-lift" onClick={() => setActiveModalType('customers')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-header">
            <div className="kpi-title">Customers</div>
            <Users size={18} className="kpi-icon neutral" />
          </div>
          <div className="kpi-value">{totalCustomers}</div>
          <div className="kpi-trend positive">Total Accounts</div>
        </div>
        <div className="kpi-card glass-panel hover-lift" onClick={() => setActiveModalType('orders')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-header">
            <div className="kpi-title">Total Orders</div>
            <ArrowUpRight size={18} className="kpi-icon positive" />
          </div>
          <div className="kpi-value">{totalOrders}</div>
          <div className="kpi-trend neutral">Orders + Confirmed Quotes</div>
        </div>
        <div className="kpi-card glass-panel hover-lift" onClick={() => setActiveModalType('calls')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-header">
            <div className="kpi-title">Pending Follow-ups</div>
            <CalendarClock size={18} className="kpi-icon negative" />
          </div>
          <div className="kpi-value">{pendingCalls}</div>
          <div className="kpi-trend negative">Team-wide attention needed</div>
        </div>
        <div 
          className="kpi-card glass-panel hover-lift" 
          onClick={() => setShowReorderModal(true)} 
          style={{ cursor: 'pointer' }}
          title="Click to view At-Risk & Churn Prediction Insights"
        >
          <div className="kpi-icon-header">
            <div className="kpi-title">At-Risk Customers</div>
            <Users size={18} className="kpi-icon warning text-orange-500" />
          </div>
          <div className="kpi-value">{atRiskCustomersCount}</div>
          <div className="kpi-trend negative">Needs retention follow-up</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="dashboard-charts">
        <div className="chart-container glass-panel">
          <h3>Revenue Overview</h3>
          <SalesChart data={salesData} />
        </div>
        <div className="chart-container glass-panel">
          <h3>Top Categories</h3>
          <TopProductsChart data={topProductsData} />
        </div>
      </div>

      {/* Two-Column Detail Section */}
      <div className="dashboard-details-grid">
        
        {/* Team Leaderboard with Sprint Health Velocity */}
        <div className="detail-card glass-panel" style={{ gridColumn: 'span 2' }}>
          <div className="detail-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="#4f46e5"/>
              <h3 style={{ margin: 0 }}>Team Performance, Sprint Targets & AI Delegation</h3>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Link href="/payroll" className="view-all-link">Payroll & Team</Link>
            </div>
          </div>
          <div className="table-responsive">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Sales (MTD)</th>
                  <th>Target %</th>
                  <th>Sprint Health</th>
                  <th style={{ textAlign: 'right' }}>Target & Task Management</th>
                </tr>
              </thead>
              <tbody>
                {teamPerformance.length > 0 ? teamPerformance.map((emp) => {
                  const sprintInfo = sprintTeamHealth.find((s: any) => s.employeeId === emp.id || s.name === emp.name);
                  const healthScore = sprintInfo?.sprintHealthScore ?? 0;
                  const healthStatus = sprintInfo?.healthStatus ?? "ON_TRACK";
                  const streak = sprintInfo?.streakDays ?? 0;

                  const employeeTargetObj = {
                    employeeId: emp.id,
                    name: emp.name,
                    email: sprintInfo?.email,
                    monthlyTarget: sprintInfo?.monthlyTarget || 500000,
                    dailyCallsTarget: sprintInfo?.dailyCallsTarget,
                    dailyFollowUpsTarget: sprintInfo?.dailyFollowUpsTarget,
                    dailyQuotesTarget: sprintInfo?.dailyQuotesTarget,
                    dailyDealsTarget: sprintInfo?.dailyDealsTarget,
                    sprintWeightsJson: sprintInfo?.sprintWeightsJson,
                    currentSprintTarget: sprintInfo?.currentSprintTarget,
                    currentSprintRevenue: sprintInfo?.currentSprintRevenue,
                    sprintProgressPercent: sprintInfo?.sprintProgressPercent,
                    sprintHealthScore: healthScore,
                    healthStatus
                  };

                  return (
                    <tr key={emp.id}>
                      <td className="font-medium">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600 }}>{emp.name}</span>
                          {streak > 0 && (
                            <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#fef08a', color: '#854d0e', padding: '1px 5px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              <Flame size={10} color="#d97706" /> {streak}d
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>₹{emp.sales.toLocaleString('en-IN')}</td>
                      <td>
                        <div className="mini-progress-bar">
                          <div 
                            className={`mini-progress-fill ${emp.targetPercent >= 100 ? 'bg-success' : 'bg-primary'}`} 
                            style={{ width: `${Math.min(100, emp.targetPercent)}%` }} 
                          />
                        </div>
                        <span className="mini-progress-text">{emp.targetPercent}%</span>
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: healthStatus === 'EXCELLENT' ? '#dcfce7' : healthStatus === 'ON_TRACK' ? '#e0e7ff' : '#fee2e2',
                          color: healthStatus === 'EXCELLENT' ? '#15803d' : healthStatus === 'ON_TRACK' ? '#4338ca' : '#b91c1c',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: healthStatus === 'EXCELLENT' ? '#16a34a' : healthStatus === 'ON_TRACK' ? '#4f46e5' : '#dc2626'
                          }} />
                          {healthScore}% {healthStatus === 'EXCELLENT' ? 'Strong' : healthStatus === 'ON_TRACK' ? 'On Track' : 'At Risk'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
                          
                          {/* Edit Targets */}
                          <button
                            type="button"
                            onClick={() => setEditingTargetsEmployee(employeeTargetObj)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 9px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title="Edit Monthly Target and Daily Action Goals"
                          >
                            <Target size={13} color="#4f46e5" />
                            <span>Targets</span>
                          </button>

                          {/* Assign Task */}
                          <button
                            type="button"
                            onClick={() => setAssigningTaskEmployee(employeeTargetObj)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 9px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title="Assign a Sales Task to this Employee"
                          >
                            <ClipboardList size={13} color="#16a34a" />
                            <span>Task</span>
                          </button>

                          {/* AI Sprint Coach */}
                          <button
                            type="button"
                            onClick={() => setAiCoachEmployee(employeeTargetObj)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid #ddd6fe',
                              backgroundColor: '#f5f3ff',
                              color: '#7c3aed',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title="AI Target Recovery & Action Plan"
                          >
                            <Sparkles size={13} color="#7c3aed" />
                            <span>AI Coach</span>
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">No team data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hot Customers Pipeline */}
        <div className="detail-card glass-panel" style={{ gridColumn: 'span 2' }}>
          <div className="detail-header">
            <h3><Flame size={18} className="text-danger"/> Hot Customers (Negotiation)</h3>
            <Link href="/customers" className="view-all-link">View All</Link>
          </div>
          <div className="hot-customers-list">
            {hotCustomers.length > 0 ? hotCustomers.map(customer => (
              <div key={customer.id} className="hot-customer-item hover-lift">
                <div className="hc-info">
                  <h4>{customer.businessName}</h4>
                  <p>{customer.contactPerson} • {customer.mobile}</p>
                </div>
                <div className="hc-salesperson">
                  Assigned to: <span className="badge">{customer.salesperson}</span>
                </div>
              </div>
            )) : (
              <div className="empty-state text-center text-muted py-4">
                No customers currently in negotiation stage.
              </div>
            )}
          </div>
        </div>

      </div>

      {activeModalType && (
        <KPIDetailsModal 
          type={activeModalType} 
          onClose={() => setActiveModalType(null)} 
        />
      )}

      {/* Edit Targets Modal */}
      {editingTargetsEmployee && (
        <EditSalespersonTargetsModal
          salesperson={editingTargetsEmployee}
          onClose={() => setEditingTargetsEmployee(null)}
          onSuccess={() => window.location.reload()}
        />
      )}

      {/* Assign Task Modal */}
      {assigningTaskEmployee && (
        <AssignTaskModal
          salesperson={assigningTaskEmployee}
          customers={hotCustomers.map(c => ({ id: c.id, name: c.businessName }))}
          onClose={() => setAssigningTaskEmployee(null)}
          onSuccess={() => window.location.reload()}
        />
      )}

      {/* AI Sprint Coach Modal */}
      {aiCoachEmployee && (
        <AISprintCoachModal
          salesperson={aiCoachEmployee}
          onClose={() => setAiCoachEmployee(null)}
          onSuccess={() => window.location.reload()}
        />
      )}

      {/* Ask ERP Assistant Modal */}
      {showAskERPModal && (
        <AskERPAssistantModal
          onClose={() => setShowAskERPModal(false)}
        />
      )}

      {/* AI Customer Re-Order & Churn Predictor Modal */}
      {showReorderModal && (
        <AIReorderPredictorModal
          onClose={() => setShowReorderModal(false)}
        />
      )}

      {/* Dead Stock Liquidation Modal */}
      {showDeadStockModal && (
        <DeadStockInsightsModal
          onClose={() => setShowDeadStockModal(false)}
        />
      )}
    </div>
  );
}
