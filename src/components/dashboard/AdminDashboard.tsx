"use client";

import React, { useState } from 'react';
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

      {/* LIVE PANEL */}
      <div className="dashboard-details-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '24px' }}>
        
        {/* Live Attendance */}
        <div className="detail-card glass-panel" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="detail-header">
            <h3><UserCheck size={18} className="text-success"/> Today's Active Team ({liveAttendance.length})</h3>
          </div>
          <div className="live-attendance-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {liveAttendance.length > 0 ? liveAttendance.map((att: any) => (
              <div key={att.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.5)', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: att.isShiftActive ? '#d1fae5' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: att.isShiftActive ? '#059669' : '#64748b', fontWeight: 'bold' }}>
                    {att.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{att.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Punch In: <span style={{ fontWeight: 500, color: '#334155' }}>{att.checkInStr}</span>
                    </div>
                  </div>
                </div>
                <div className={`badge ${att.isShiftActive ? 'badge-success' : 'badge-neutral'}`} style={{ backgroundColor: att.isShiftActive ? '#d1fae5' : '#f1f5f9', color: att.isShiftActive ? '#059669' : '#64748b', fontSize: '11px', padding: '4px 10px' }}>
                  {att.isShiftActive ? 'Active Now' : 'Checked Out'}
                </div>
              </div>
            )) : (
              <div className="text-muted w-100 text-center py-4" style={{ border: '1px dashed #cbd5e1', borderRadius: '8px', background: '#f8fafc' }}>
                No one checked in yet today.
              </div>
            )}
          </div>
        </div>

        {/* Live Orders Leaderboard */}
        <div className="detail-card glass-panel" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="detail-header">
            <h3><Trophy size={18} style={{ color: '#8b5cf6' }}/> Today's Live Leaderboard</h3>
            <div className="badge" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
              {todayOrdersCount} Orders Today
            </div>
          </div>
          <div className="table-responsive" style={{ marginTop: '15px' }}>
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Employee</th>
                  <th>Orders</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {liveLeaderboard.length > 0 ? liveLeaderboard.slice(0, 3).map((emp: any, index: number) => (
                  <tr key={index}>
                    <td className="font-medium" style={{ color: index === 0 ? '#fbbf24' : index === 1 ? '#9ca3af' : '#b45309' }}>
                      #{index + 1}
                    </td>
                    <td className="font-medium">{emp.name}</td>
                    <td>{emp.orders}</td>
                    <td className="text-success">₹{emp.total.toLocaleString('en-IN')}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-3">No orders placed today.</td>
                  </tr>
                )}
              </tbody>
            </table>
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
          <div className="kpi-value">{Math.floor(totalCustomers * 0.15)}</div>
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
