"use client";
import React from 'react';
import SalesChart from '@/components/dashboard/SalesChart';
import TopProductsChart from '@/components/dashboard/TopProductsChart';
import Link from 'next/link';
import { ArrowUpRight, Flame, Users, CalendarClock, TrendingUp, Activity, UserCheck, Trophy } from 'lucide-react';
import KPIDetailsModal from './KPIDetailsModal';
import CheckInButton from '@/components/ui/CheckInButton';
import { useState } from 'react';

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
  checkOutTime
}: AdminDashboardProps) {
  
  const [activeModalType, setActiveModalType] = useState<'customers' | 'orders' | 'calls' | null>(null);

  return (
    <div className="dashboard-container admin-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Admin Command Center 👑</h1>
          <p className="page-subtitle">Overview of your entire business and team performance.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <CheckInButton 
            isCheckedIn={isCheckedIn} 
            isCheckedOut={isCheckedOut} 
            checkInTime={checkInTime}
            checkOutTime={checkOutTime}
          />
          <Link href="/reports" className="primary-btn hover-lift">View Full Reports</Link>
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
          <div className="kpi-trend neutral">All-time</div>
        </div>
        <div className="kpi-card glass-panel hover-lift" onClick={() => setActiveModalType('calls')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-header">
            <div className="kpi-title">Pending Follow-ups</div>
            <CalendarClock size={18} className="kpi-icon negative" />
          </div>
          <div className="kpi-value">{pendingCalls}</div>
          <div className="kpi-trend negative">Team-wide attention needed</div>
        </div>
        <div className="kpi-card glass-panel hover-lift" style={{ cursor: 'pointer' }}>
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
        
        {/* Team Leaderboard */}
        <div className="detail-card glass-panel">
          <div className="detail-header">
            <h3><Users size={18}/> Team Performance</h3>
            <Link href="/payroll" className="view-all-link">View All</Link>
          </div>
          <div className="table-responsive">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Sales (MTD)</th>
                  <th>Target %</th>
                </tr>
              </thead>
              <tbody>
                {teamPerformance.length > 0 ? teamPerformance.map((emp) => (
                  <tr key={emp.id}>
                    <td className="font-medium">{emp.name}</td>
                    <td>₹{emp.sales.toLocaleString('en-IN')}</td>
                    <td>
                      <div className="mini-progress-bar">
                        <div 
                          className={`mini-progress-fill ${emp.targetPercent >= 100 ? 'bg-success' : 'bg-primary'}`} 
                          style={{ width: `${Math.min(100, emp.targetPercent)}%` }} 
                        />
                      </div>
                      <span className="mini-progress-text">{emp.targetPercent}%</span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="text-center text-muted py-4">No team data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hot Customers Pipeline */}
        <div className="detail-card glass-panel">
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
    </div>
  );
}
