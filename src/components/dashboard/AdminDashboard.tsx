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
  // Live Leaderboard Timeframe Switcher
  const [leaderboardMode, setLeaderboardMode] = useState<'DAILY' | 'MONTHLY'>('DAILY');

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

  const currentLeaderboardList = useMemo(() => {
    if (leaderboardMode === 'DAILY') {
      return (liveLeaderboard || []).map((emp: any) => ({
        name: emp.name,
        orders: emp.orders,
        total: Number(emp.total || 0),
        subtitle: `${emp.orders} ${emp.orders === 1 ? 'order' : 'orders'}`
      }));
    } else {
      return (teamPerformance || []).map((emp: any) => ({
        name: emp.name,
        orders: 0,
        total: Number(emp.sales || 0),
        targetPercent: emp.targetPercent,
        subtitle: `${emp.targetPercent}% target`
      }));
    }
  }, [leaderboardMode, liveLeaderboard, teamPerformance]);

  const maxLeaderboardTotal = useMemo(() => {
    if (!currentLeaderboardList || currentLeaderboardList.length === 0) return 1;
    return Math.max(...currentLeaderboardList.map((emp: any) => Number(emp.total) || 0), 1);
  }, [currentLeaderboardList]);

  // Organization-wide Sprint Summary for Executive Pacing Bar
  const orgSprintSummary = useMemo(() => {
    if (!sprintTeamHealth || sprintTeamHealth.length === 0) {
      return null;
    }
    const totalSprintRevenue = sprintTeamHealth.reduce((sum: number, s: any) => sum + (Number(s.currentSprintRevenue) || 0), 0);
    const totalSprintTarget = sprintTeamHealth.reduce((sum: number, s: any) => sum + (Number(s.currentSprintTarget) || 0), 0);
    const avgHealthScore = Math.round(
      sprintTeamHealth.reduce((sum: number, s: any) => sum + (Number(s.sprintHealthScore) || 0), 0) / Math.max(1, sprintTeamHealth.length)
    );
    const excellentCount = sprintTeamHealth.filter((s: any) => s.healthStatus === 'EXCELLENT').length;
    const onTrackCount = sprintTeamHealth.filter((s: any) => s.healthStatus === 'ON_TRACK').length;
    const atRiskCount = sprintTeamHealth.filter((s: any) => s.healthStatus === 'AT_RISK').length;
    const currentWeekNum = sprintTeamHealth[0]?.weekNumber || 1;
    const currentWeekName = sprintTeamHealth[0]?.weekName || `Sprint ${currentWeekNum}: Pipeline & Prospecting`;
    const daysLeft = sprintTeamHealth[0]?.daysRemainingInSprint || 1;
    const weekStartStr = sprintTeamHealth[0]?.weekStartStr || '';
    const weekEndStr = sprintTeamHealth[0]?.weekEndStr || '';
    const sprintOverallPercent = totalSprintTarget > 0 ? Math.min(100, Math.round((totalSprintRevenue / totalSprintTarget) * 100)) : 0;

    return {
      totalSprintRevenue,
      totalSprintTarget,
      avgHealthScore,
      excellentCount,
      onTrackCount,
      atRiskCount,
      currentWeekNum,
      currentWeekName,
      daysLeft,
      weekStartStr,
      weekEndStr,
      sprintOverallPercent
    };
  }, [sprintTeamHealth]);

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
                        In: <span style={{ fontWeight: 600, color: '#334155' }}>
                          {att.checkIn ? (
                            new Date(att.checkIn).toLocaleTimeString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })
                          ) : (
                            att.checkInStr || 'Just now'
                          )}
                        </span>
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
                    {leaderboardMode === 'DAILY' ? "Today's Live Leaderboard" : "Monthly Team Rankings"}
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>
                    {leaderboardMode === 'DAILY' ? "Real-time deals closed by sales team" : "Month-to-date sales performance"}
                  </div>
                </div>
              </div>

              {/* Segmented Timeframe Switcher */}
              <div style={{
                display: 'inline-flex',
                backgroundColor: '#f1f5f9',
                padding: '2px',
                borderRadius: '7px',
                border: '1px solid #e2e8f0'
              }}>
                <button
                  type="button"
                  onClick={() => setLeaderboardMode('DAILY')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '5px',
                    border: 'none',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: leaderboardMode === 'DAILY' ? '#ffffff' : 'transparent',
                    color: leaderboardMode === 'DAILY' ? '#7c3aed' : '#64748b',
                    boxShadow: leaderboardMode === 'DAILY' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ⚡ Daily ({todayOrdersCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardMode('MONTHLY')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '5px',
                    border: 'none',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: leaderboardMode === 'MONTHLY' ? '#ffffff' : 'transparent',
                    color: leaderboardMode === 'MONTHLY' ? '#7c3aed' : '#64748b',
                    boxShadow: leaderboardMode === 'MONTHLY' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  🏆 MTD
                </button>
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
              {currentLeaderboardList.length > 0 ? currentLeaderboardList.map((emp: any, index: number) => {
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
                            ({emp.subtitle})
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
                  {leaderboardMode === 'DAILY' ? 'No sales orders recorded yet today.' : 'No sales records this month.'}
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
        
        {/* Team Leaderboard with Sprint Health Velocity & Weekly Pacing */}
        <div className="detail-card glass-panel" style={{ gridColumn: 'span 2' }}>
          <div className="detail-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', paddingBottom: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={19} color="#4f46e5"/>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  Team Performance, Sprint Targets & Weekly Pacing
                </h3>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Real-time weekly sprint velocity, activity health meters, and AI delegation.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {orgSprintSummary && (
                <div style={{
                  backgroundColor: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#6d28d9'
                }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#7c3aed', animation: 'pulse 2s infinite' }} />
                  <span>Week {orgSprintSummary.currentWeekNum} Active</span>
                  <span style={{ color: '#8b5cf6' }}>•</span>
                  <span>{orgSprintSummary.daysLeft} {orgSprintSummary.daysLeft === 1 ? 'day' : 'days'} left in sprint</span>
                </div>
              )}
              <Link href="/payroll" className="view-all-link" style={{ fontSize: '0.8rem' }}>Payroll & Team →</Link>
            </div>
          </div>

          {/* Executive Active Sprint Health & Pacing Overview Banner */}
          {orgSprintSummary && (
            <div style={{
              margin: '0 0 16px 0',
              padding: '14px 16px',
              backgroundColor: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                
                {/* Sprint Revenue & Pacing Progress */}
                <div style={{ flex: '1 1 260px', minWidth: '240px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Zap size={14} color="#7c3aed" /> Current Sprint Pacing (Week {orgSprintSummary.currentWeekNum})
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                      ₹{orgSprintSummary.totalSprintRevenue.toLocaleString('en-IN')} <span style={{ fontWeight: 500, color: '#64748b' }}>/ ₹{orgSprintSummary.totalSprintTarget.toLocaleString('en-IN')}</span>
                      <span style={{ marginLeft: '6px', color: orgSprintSummary.sprintOverallPercent >= 75 ? '#16a34a' : '#6366f1', fontWeight: 700 }}>
                        ({orgSprintSummary.sprintOverallPercent}%)
                      </span>
                    </span>
                  </div>

                  {/* Team-wide Sprint Progress Bar */}
                  <div style={{ width: '100%', height: '7px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, orgSprintSummary.sprintOverallPercent)}%`,
                      height: '100%',
                      background: orgSprintSummary.sprintOverallPercent >= 80 
                        ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' 
                        : 'linear-gradient(90deg, #6366f1 0%, #3b82f6 100%)',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>

                {/* Team Momentum & Status Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>TEAM MOMENTUM</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: orgSprintSummary.avgHealthScore >= 70 ? '#16a34a' : orgSprintSummary.avgHealthScore >= 45 ? '#4f46e5' : '#dc2626' }}>
                      {orgSprintSummary.avgHealthScore}% Health
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#dcfce7',
                      color: '#15803d',
                      border: '1px solid #bbf7d0',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      🚀 {orgSprintSummary.excellentCount} Ahead
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#e0e7ff',
                      color: '#4338ca',
                      border: '1px solid #c7d2fe',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      🎯 {orgSprintSummary.onTrackCount} On Track
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #fecaca',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      ⚠️ {orgSprintSummary.atRiskCount} At Risk
                    </span>
                  </div>
                </div>
              </div>

              {/* 4-Week Month Sprint Timeline Bar */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '8px',
                paddingTop: '8px',
                borderTop: '1px dashed #e2e8f0'
              }}>
                {[
                  { week: 1, label: 'Sprint 1 (Days 1–7)', weight: '20% Vol', title: 'Pipeline & Prospecting' },
                  { week: 2, label: 'Sprint 2 (Days 8–14)', weight: '25% Vol', title: 'Warm Conversions' },
                  { week: 3, label: 'Sprint 3 (Days 15–21)', weight: '30% Vol', title: 'Peak Volume' },
                  { week: 4, label: 'Sprint 4 (Days 22–End)', weight: '25% Vol', title: 'Closing & Buffer' },
                ].map((s) => {
                  const isActive = s.week === orgSprintSummary.currentWeekNum;
                  const isCompleted = s.week < orgSprintSummary.currentWeekNum;
                  return (
                    <div
                      key={s.week}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        backgroundColor: isActive ? '#f5f3ff' : isCompleted ? '#f8fafc' : '#ffffff',
                        border: isActive ? '1.5px solid #8b5cf6' : '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        boxShadow: isActive ? '0 2px 6px rgba(139, 92, 246, 0.12)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isActive ? '#6d28d9' : '#334155' }}>
                          {s.label}
                        </span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: isActive ? '#7c3aed' : '#94a3b8' }}>
                          {s.weight}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: isActive ? '#5b21b6' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isActive ? `⚡ Active (${orgSprintSummary.daysLeft}d left)` : isCompleted ? '✓ Passed' : s.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Performance & Sprint Health Table */}
          <div className="table-responsive">
            <table className="dashboard-table">
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <th style={{ minWidth: '180px', padding: '14px 18px', fontWeight: 600, fontSize: '0.82rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee</th>
                  <th style={{ minWidth: '200px', padding: '14px 18px', fontWeight: 600, fontSize: '0.82rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Sales (MTD)</th>
                  <th style={{ minWidth: '270px', padding: '14px 18px', fontWeight: 600, fontSize: '0.82rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Sprint (Week {orgSprintSummary?.currentWeekNum || 1} Bar)</th>
                  <th style={{ minWidth: '210px', padding: '14px 18px', fontWeight: 600, fontSize: '0.82rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sprint Health Score</th>
                  <th style={{ textAlign: 'right', minWidth: '260px', padding: '14px 18px', fontWeight: 600, fontSize: '0.82rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target & Task Management</th>
                </tr>
              </thead>
              <tbody>
                {teamPerformance.length > 0 ? teamPerformance.map((emp) => {
                  const sprintInfo = sprintTeamHealth.find((s: any) => s.employeeId === emp.id || s.name === emp.name);
                  const healthScore = sprintInfo?.sprintHealthScore ?? 0;
                  const healthStatus = sprintInfo?.healthStatus ?? "ON_TRACK";
                  const streak = sprintInfo?.streakDays ?? 0;

                  // Real Monthly Target & Progress
                  const employeeMonthlyTarget = sprintInfo?.monthlyTarget || emp.target || 500000;
                  const employeeTargetPercent = employeeMonthlyTarget > 0 
                    ? Math.min(100, Math.round((emp.sales / employeeMonthlyTarget) * 100)) 
                    : 0;

                  // Current sprint calculations
                  const sprintTarget = sprintInfo?.currentSprintTarget || Math.round(employeeMonthlyTarget * 0.25);
                  const sprintRevenue = sprintInfo?.currentSprintRevenue || 0;
                  const sprintProgress = sprintInfo?.sprintProgressPercent || (sprintTarget > 0 ? Math.round((sprintRevenue / sprintTarget) * 100) : 0);
                  const daysRemaining = sprintInfo?.daysRemainingInSprint || orgSprintSummary?.daysLeft || 1;
                  const gap = Math.max(0, sprintTarget - sprintRevenue);
                  const dailyRunRate = sprintInfo?.dailyRunRateNeeded || Math.round(gap / daysRemaining);

                  const todayCalls = sprintInfo?.todayCalls ?? 0;
                  const todayQuotes = sprintInfo?.todayQuotesSent ?? 0;

                  const employeeTargetObj = {
                    employeeId: emp.id,
                    name: emp.name,
                    email: sprintInfo?.email,
                    monthlyTarget: employeeMonthlyTarget,
                    dailyCallsTarget: sprintInfo?.dailyCallsTarget,
                    dailyFollowUpsTarget: sprintInfo?.dailyFollowUpsTarget,
                    dailyQuotesTarget: sprintInfo?.dailyQuotesTarget,
                    dailyDealsTarget: sprintInfo?.dailyDealsTarget,
                    sprintWeightsJson: sprintInfo?.sprintWeightsJson,
                    currentSprintTarget: sprintTarget,
                    currentSprintRevenue: sprintRevenue,
                    sprintProgressPercent: sprintProgress,
                    sprintHealthScore: healthScore,
                    healthStatus
                  };

                  return (
                    <tr key={emp.id} style={{ transition: 'background-color 0.15s ease', borderBottom: '1px solid #f1f5f9' }}>
                      
                      {/* Employee Column */}
                      <td className="font-medium" style={{ padding: '16px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{emp.name}</span>
                            {streak > 0 && (
                              <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#fef08a', color: '#854d0e', padding: '1px 5px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                <Flame size={10} color="#d97706" /> {streak}d
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            Today: <span style={{ fontWeight: 600, color: '#334155' }}>{todayCalls} calls</span> • <span style={{ fontWeight: 600, color: '#334155' }}>{todayQuotes} quotes</span>
                          </div>
                        </div>
                      </td>

                      {/* Monthly Sales (MTD) */}
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                              ₹{emp.sales.toLocaleString('en-IN')}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: employeeTargetPercent >= 80 ? '#16a34a' : '#4f46e5' }}>
                              {employeeTargetPercent}% MTD
                            </span>
                          </div>
                          
                          {/* Mini Progress Bar */}
                          <div className="mini-progress-bar" style={{ height: '5px', margin: 0, backgroundColor: '#e2e8f0' }}>
                            <div 
                              className={`mini-progress-fill ${employeeTargetPercent >= 100 ? 'bg-success' : 'bg-primary'}`} 
                              style={{ width: `${Math.min(100, employeeTargetPercent)}%`, height: '100%' }} 
                            />
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                            Target: <span style={{ fontWeight: 600, color: '#334155' }}>₹{Number(employeeMonthlyTarget).toLocaleString('en-IN')}</span>
                          </span>
                        </div>
                      </td>

                      {/* Current Sprint Progress Bar (Week X) */}
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                              ₹{sprintRevenue.toLocaleString('en-IN')} <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#64748b' }}>/ ₹{sprintTarget.toLocaleString('en-IN')}</span>
                            </span>
                            <span style={{
                              fontSize: '0.73rem',
                              fontWeight: 700,
                              color: sprintProgress >= 100 ? '#15803d' : sprintProgress >= 60 ? '#4338ca' : '#b91c1c'
                            }}>
                              {sprintProgress}% pace
                            </span>
                          </div>

                          {/* Dynamic Sprint Pacing Health Bar */}
                          <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(100, sprintProgress)}%`,
                              height: '100%',
                              background: sprintProgress >= 100 
                                ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' 
                                : sprintProgress >= 60 
                                  ? 'linear-gradient(90deg, #6366f1 0%, #3b82f6 100%)' 
                                  : 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)',
                              borderRadius: '3px',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>

                          {/* Gap & Daily Pace indicator */}
                          <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {sprintProgress >= 100 ? (
                              <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Sprint Target Met 🎉</span>
                            ) : (
                              <>
                                <span>Gap: <strong style={{ color: '#475569' }}>₹{gap.toLocaleString('en-IN')}</strong></span>
                                <span style={{ fontWeight: 700, color: '#d97706' }}>₹{dailyRunRate.toLocaleString('en-IN')}/day</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Sprint Health Score & Health Velocity Meter */}
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
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
                          </div>

                          {/* Health Velocity Meter Bar */}
                          <div style={{ width: '100%', height: '5px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(100, Math.max(5, healthScore))}%`,
                              height: '100%',
                              background: healthStatus === 'EXCELLENT'
                                ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                                : healthStatus === 'ON_TRACK'
                                  ? 'linear-gradient(90deg, #6366f1 0%, #3b82f6 100%)'
                                  : 'linear-gradient(90deg, #f87171 0%, #ef4444 100%)',
                              borderRadius: '3px',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>

                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            Calls: <strong style={{ color: '#334155' }}>{todayCalls}/{employeeTargetObj.dailyCallsTarget || 15}</strong> • Quotes: <strong style={{ color: '#334155' }}>{todayQuotes}/{employeeTargetObj.dailyQuotesTarget || 2}</strong>
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right', padding: '16px 18px' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                          
                          {/* Edit Targets */}
                          <button
                            type="button"
                            onClick={() => setEditingTargetsEmployee(employeeTargetObj)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 9px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
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
                              padding: '6px 9px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
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
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid #ddd6fe',
                              backgroundColor: '#f5f3ff',
                              color: '#7c3aed',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(124, 58, 237, 0.12)',
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
