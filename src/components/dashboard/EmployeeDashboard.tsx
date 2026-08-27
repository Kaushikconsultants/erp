"use client";

import React, { useState, useMemo } from 'react';
import CheckInButton from '@/components/ui/CheckInButton';
import { IncentiveResult, calculateIncentives, OrderData } from '@/lib/incentiveEngine';
import { 
  Users, 
  PhoneCall, 
  ShoppingCart, 
  CalendarRange, 
  Sparkles, 
  Pencil, 
  CheckCircle2, 
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  ArrowUpRight,
  PhoneForwarded,
  Award,
  Calendar,
  ChevronRight,
  Filter,
  X,
  ExternalLink,
  DollarSign,
  Calculator
} from 'lucide-react';
import Link from 'next/link';
import { removeFollowUp, rescheduleFollowUp } from '@/app/actions/callActions';
import "@/components/ui/modal.css";

function FollowUpCard({ call }: { call: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRemove = async () => {
    setIsProcessing(true);
    await removeFollowUp(call.id);
    setIsProcessing(false);
  };

  const handleReschedule = async () => {
    if (!newDate) return;
    setIsProcessing(true);
    await rescheduleFollowUp(call.id, newDate);
    setIsProcessing(false);
    setIsEditing(false);
  };

  const cleanPhone = (call.customer?.mobile || '').replace(/[^0-9]/g, '');
  const priority = call.priority || (call.customer?.leadStage === 'Negotiation' ? 'HIGH' : 'MEDIUM');

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: '#ffffff', 
      padding: '14px', 
      borderRadius: '12px', 
      border: priority === 'HIGH' ? '1px solid #f87171' : '1px solid #cbd5e1', 
      opacity: isProcessing ? 0.6 : 1,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
              {call.customer?.businessName || 'Unknown Customer'}
            </h4>
            <span style={{ 
              fontSize: '10px', 
              fontWeight: 700, 
              padding: '2px 8px', 
              borderRadius: '10px',
              backgroundColor: priority === 'HIGH' ? '#fee2e2' : '#fef3c7',
              color: priority === 'HIGH' ? '#dc2626' : '#d97706'
            }}>
              {priority}
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            {call.customer?.contactPerson || 'Contact Person'} • {call.notes || 'Scheduled follow-up call'}
          </p>
        </div>
      </div>
      
      {isEditing ? (
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          <input 
            type="date" 
            value={newDate} 
            onChange={(e) => setNewDate(e.target.value)}
            className="zoho-input-field" 
            style={{ padding: '6px 10px', fontSize: '13px' }}
          />
          <button onClick={handleReschedule} disabled={!newDate} className="primary-btn" style={{ padding: '6px 12px', fontSize: '13px' }}>Save</button>
          <button onClick={() => setIsEditing(false)} className="secondary-btn" style={{ padding: '6px 12px', fontSize: '13px' }}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
          {cleanPhone && (
            <>
              <a 
                href={`tel:${cleanPhone}`} 
                className="action-btn outline-success" 
                style={{ textDecoration: 'none', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <PhoneCall size={13} /> Call Now
              </a>
              <a 
                href={`https://wa.me/91${cleanPhone}`} 
                target="_blank" 
                rel="noreferrer" 
                className="action-btn" 
                style={{ textDecoration: 'none', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#25D366', color: '#fff' }}
              >
                <MessageSquare size={13} /> WhatsApp
              </a>
            </>
          )}
          <Link href={`/calls?customerId=${call.customerId}`} className="action-btn outline-primary" style={{ textDecoration: 'none', padding: '6px 10px', fontSize: '12px' }}>
            Log Call
          </Link>
          <button onClick={() => setIsEditing(true)} className="action-btn" style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer', border: '1px solid #cbd5e1', color: '#475569', background: 'transparent' }}>
            <Pencil size={13} /> Reschedule
          </button>
          <button onClick={handleRemove} className="action-btn" style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent' }}>
            <CheckCircle2 size={13} /> Done
          </button>
        </div>
      )}
    </div>
  );
}

interface EmployeeDashboardProps {
  employee: any;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  incentiveData: IncentiveResult;
  todayFollowUps?: any[];
  allOrders?: any[];
  allFollowUps?: any[];
}

type TimeFilterType = "TODAY" | "WEEKLY" | "MONTHLY" | "ALL";

export default function EmployeeDashboard({ 
  employee, 
  isCheckedIn, 
  isCheckedOut, 
  checkInTime,
  checkOutTime,
  incentiveData: initialIncentiveData,
  todayFollowUps = [],
  allOrders = [],
  allFollowUps = []
}: EmployeeDashboardProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>("MONTHLY");
  const [activeModal, setActiveModal] = useState<"SALES" | "FOLLOWUPS" | "TARGET" | "PAYOUT" | null>(null);

  const todayDateStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const targetMonthlyGoal = employee?.target || 500000;

  // Compute date ranges
  const { filteredOrders, previousOrders, filteredFollowUps, periodLabel, targetPeriodGoal } = useMemo(() => {
    const now = new Date();
    
    // Today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    // This Week (Monday to Sunday)
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    const prevWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    // This Month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    let orders: any[] = [];
    let prevOrders: any[] = [];
    let followUps: any[] = [];
    let label = "This Month";
    let periodGoal = targetMonthlyGoal;

    if (timeFilter === "TODAY") {
      label = "Today";
      periodGoal = Math.round(targetMonthlyGoal / 25);
      orders = allOrders.filter(o => {
        if (!o.orderDate) return false;
        const d = new Date(o.orderDate);
        return d >= todayStart && d < todayEnd;
      });
      prevOrders = allOrders.filter(o => {
        if (!o.orderDate) return false;
        const d = new Date(o.orderDate);
        return d >= yesterdayStart && d < todayStart;
      });
      followUps = allFollowUps.filter(f => {
        if (!f.followUpDate) return false;
        const d = new Date(f.followUpDate);
        return d >= todayStart && d < todayEnd;
      });
    } else if (timeFilter === "WEEKLY") {
      label = "This Week";
      periodGoal = Math.round(targetMonthlyGoal / 4);
      orders = allOrders.filter(o => {
        if (!o.orderDate) return false;
        const d = new Date(o.orderDate);
        return d >= weekStart;
      });
      prevOrders = allOrders.filter(o => {
        if (!o.orderDate) return false;
        const d = new Date(o.orderDate);
        return d >= prevWeekStart && d < weekStart;
      });
      followUps = allFollowUps.filter(f => {
        if (!f.followUpDate) return false;
        const d = new Date(f.followUpDate);
        return d >= weekStart;
      });
    } else if (timeFilter === "MONTHLY") {
      label = "This Month";
      periodGoal = targetMonthlyGoal;
      orders = allOrders.filter(o => {
        if (!o.orderDate) return false;
        const d = new Date(o.orderDate);
        return d >= monthStart;
      });
      prevOrders = allOrders.filter(o => {
        if (!o.orderDate) return false;
        const d = new Date(o.orderDate);
        return d >= prevMonthStart && d <= prevMonthEnd;
      });
      followUps = allFollowUps.filter(f => {
        if (!f.followUpDate) return false;
        const d = new Date(f.followUpDate);
        return d >= monthStart;
      });
    } else {
      label = "All Time";
      periodGoal = targetMonthlyGoal * 6;
      orders = allOrders;
      prevOrders = [];
      followUps = allFollowUps;
    }

    return {
      filteredOrders: orders,
      previousOrders: prevOrders,
      filteredFollowUps: followUps,
      periodLabel: label,
      targetPeriodGoal: periodGoal
    };
  }, [allOrders, allFollowUps, timeFilter, targetMonthlyGoal]);

  // Calculate Sales Amount
  const totalSales = filteredOrders.reduce((sum, o) => sum + (o.subtotal || o.totalValue || 0), 0);
  const prevTotalSales = previousOrders.reduce((sum, o) => sum + (o.subtotal || o.totalValue || 0), 0);

  // Calculate Real Growth %
  let growthPercent = 0;
  let growthIsPositive = true;
  if (totalSales > 0 && prevTotalSales === 0) {
    growthPercent = 100;
    growthIsPositive = true;
  } else if (prevTotalSales > 0) {
    growthPercent = Math.round(((totalSales - prevTotalSales) / prevTotalSales) * 100);
    growthIsPositive = growthPercent >= 0;
  }

  // Calculate Target Progress
  const targetPercent = targetPeriodGoal > 0 ? Math.min(100, Math.round((totalSales / targetPeriodGoal) * 100)) : 0;
  const remainingGap = Math.max(0, targetPeriodGoal - totalSales);

  // Calculate Incentive & Payout
  const formattedOrderData: OrderData[] = (filteredOrders || []).map(order => ({
    id: order.id,
    taxableValue: Number(order.subtotal !== null && order.subtotal !== undefined ? order.subtotal : order.totalValue !== null && order.totalValue !== undefined ? order.totalValue : 0),
    discount: Number(order.discount || 0),
    isCreditCustomer: order.customer?.status?.toLowerCase() === 'credit' || order.customer?.preferredPaymentMethod?.toLowerCase() === 'credit'
  }));
  const calculatedIncentive = calculateIncentives(formattedOrderData, targetPeriodGoal);
  const totalPayout = (Number(employee?.salary) || 0) + (Number(calculatedIncentive?.totalIncentive) || 0);

  return (
    <div className="dashboard-container employee-dashboard">
      
      {/* ─── MOBILE COMMAND CENTER HEADER ─── */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {todayDateStr} • Today's Shift
          </span>
          <h1 className="page-title" style={{ fontSize: '1.25rem', marginTop: '2px' }}>
            Good Morning, {employee?.user?.name ? employee.user.name.split(' ')[0] : 'Team'}! 👋
          </h1>
        </div>
        <div>
          <CheckInButton 
            isCheckedIn={isCheckedIn} 
            isCheckedOut={isCheckedOut} 
            checkInTime={checkInTime}
            checkOutTime={checkOutTime}
          />
        </div>
      </div>

      {/* ─── PERFORMANCE FILTER TABS ─── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              My Performance
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({periodLabel})</span>
          </div>

          {/* Time Filter Pills */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
            {[
              { key: "TODAY", label: "Daily (Today)" },
              { key: "WEEKLY", label: "This Week" },
              { key: "MONTHLY", label: "This Month" },
              { key: "ALL", label: "All Time" }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTimeFilter(tab.key as TimeFilterType)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: timeFilter === tab.key ? 700 : 500,
                  backgroundColor: timeFilter === tab.key ? '#4f46e5' : 'transparent',
                  color: timeFilter === tab.key ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── 4 INTERACTIVE CLICKABLE KPI BLOCKS ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          
          {/* BLOCK 1: Sales Metric (Clickable) */}
          <div 
            onClick={() => setActiveModal("SALES")}
            style={{ 
              padding: '14px', 
              borderRadius: '12px', 
              backgroundColor: '#ffffff', 
              border: '1px solid #cbd5e1', 
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#818cf8';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(79, 70, 229, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)';
            }}
            title="Click to view sales breakdown"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{periodLabel} Sales</span>
              <span style={{ fontSize: '0.65rem', color: '#4f46e5', fontWeight: 700 }}>View 🔍</span>
            </div>

            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
              ₹{(totalSales / 1000).toFixed(1)}k
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {totalSales === 0 ? (
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                  0 orders
                </span>
              ) : (
                <span style={{ fontSize: '0.7rem', color: growthIsPositive ? '#10b981' : '#ef4444', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  {growthIsPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {growthIsPositive ? `+${growthPercent}%` : `${growthPercent}%`}
                </span>
              )}
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{filteredOrders.length} orders</span>
            </div>
          </div>

          {/* BLOCK 2: Follow-ups Due (Clickable) */}
          <div 
            onClick={() => setActiveModal("FOLLOWUPS")}
            style={{ 
              padding: '14px', 
              borderRadius: '12px', 
              backgroundColor: '#ffffff', 
              border: '1px solid #cbd5e1', 
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#f59e0b';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(245, 158, 11, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)';
            }}
            title="Click to view follow-ups"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Follow-ups Due</span>
              <span style={{ fontSize: '0.65rem', color: '#d97706', fontWeight: 700 }}>View 🔍</span>
            </div>

            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#d97706', margin: '4px 0' }}>
              {filteredFollowUps.length}
            </div>

            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
              {filteredFollowUps.length > 0 ? `${filteredFollowUps.length} Pending` : 'All Cleared 🎉'}
            </span>
          </div>

          {/* BLOCK 3: Target Progress (Clickable) */}
          <div 
            onClick={() => setActiveModal("TARGET")}
            style={{ 
              padding: '14px', 
              borderRadius: '12px', 
              backgroundColor: '#ffffff', 
              border: '1px solid #cbd5e1', 
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#818cf8';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(99, 102, 241, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)';
            }}
            title="Click to view target progress details"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Target Progress</span>
              <span style={{ fontSize: '0.65rem', color: '#6366f1', fontWeight: 700 }}>View 🔍</span>
            </div>

            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#6366f1', margin: '4px 0' }}>
              {targetPercent}%
            </div>

            <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700 }}>
              Goal: ₹{(targetPeriodGoal / 100000).toFixed(1)}L
            </span>
          </div>

          {/* BLOCK 4: Est. Total Payout (Clickable) */}
          <div 
            onClick={() => setActiveModal("PAYOUT")}
            style={{ 
              padding: '14px', 
              borderRadius: '12px', 
              backgroundColor: '#ffffff', 
              border: '1px solid #cbd5e1', 
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#34d399';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(16, 185, 129, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)';
            }}
            title="Click to view earnings and slab breakdown"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Est. Total Payout</span>
              <span style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 700 }}>View 🔍</span>
            </div>

            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>
              ₹{(totalPayout / 1000).toFixed(1)}k
            </div>

            <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700 }}>
              Slab: {calculatedIncentive.currentSlab}
            </span>
          </div>

        </div>
      </div>

      {/* ─── TODAY'S FOLLOW-UPS PRIORITY SECTION ─── */}
      <div className="zoho-card" style={{ marginBottom: '20px', borderLeft: todayFollowUps.length > 0 ? '4px solid #ef4444' : '1px solid #cbd5e1' }}>
        <div className="zoho-header" style={{ paddingBottom: '12px' }}>
          <div className="zoho-title-group">
            <div className="zoho-title-icon" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}>
              <PhoneForwarded size={18} />
            </div>
            <div>
              <h2 className="zoho-title" style={{ fontSize: '1rem' }}>
                Today's Follow-ups ({todayFollowUps.length})
              </h2>
              <p className="zoho-subtitle" style={{ fontSize: '0.75rem' }}>Priority calls scheduled for today</p>
            </div>
          </div>
          <Link href="/calls" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textDecoration: 'none' }}>
            View All →
          </Link>
        </div>

        <div style={{ padding: '12px 14px' }}>
          {todayFollowUps.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {todayFollowUps.map((call: any) => (
                <FollowUpCard key={call.id} call={call} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 10px', color: '#64748b' }}>
              <CheckCircle2 size={32} style={{ color: '#10b981', margin: '0 auto 8px auto' }} />
              <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>No pending follow-ups today!</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem' }}>You're all caught up. Schedule new leads or log fresh calls.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── DRILL-DOWN POPUP MODALS ─── */}

      {/* 1. SALES DRILLDOWN MODAL */}
      {activeModal === "SALES" && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content glass-panel animate-in" style={{ maxWidth: '640px', width: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px 12px 0 0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingCart size={18} color="#4f46e5" /> {periodLabel} Sales Breakdown
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Showing {filteredOrders.length} orders total</span>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>

            <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Total Sales</span>
                <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>₹{totalSales.toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Orders Count</span>
                <strong style={{ fontSize: '1.1rem', color: '#4f46e5' }}>{filteredOrders.length}</strong>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Avg Order Value</span>
                <strong style={{ fontSize: '1.1rem', color: '#059669' }}>
                  ₹{filteredOrders.length > 0 ? Math.round(totalSales / filteredOrders.length).toLocaleString('en-IN') : 0}
                </strong>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
              {filteredOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  <ShoppingCart size={36} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>No orders found in this time period.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredOrders.map((o: any) => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>#{o.orderNumber || o.id.slice(0, 8)}</span>
                          <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: o.status === 'DELIVERED' ? '#ecfdf5' : '#eff6ff', color: o.status === 'DELIVERED' ? '#059669' : '#2563eb', fontWeight: 600 }}>
                            {o.status || 'CONFIRMED'}
                          </span>
                          <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: (o.discount || 0) === 0 ? '#ecfdf5' : (o.discount || 0) > 15 ? '#fffbeb' : '#f1f5f9', color: (o.discount || 0) === 0 ? '#059669' : (o.discount || 0) > 15 ? '#d97706' : '#475569', fontWeight: 700 }}>
                            {(o.discount || 0) === 0 ? '0% Disc (Bonus)' : `${o.discount}% Disc`}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{o.customer?.businessName || 'Customer'}</span>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          {o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                          ₹{(o.subtotal || o.totalValue || 0).toLocaleString('en-IN')}
                        </div>
                        <Link href={`/orders/${o.id}`} style={{ fontSize: '0.72rem', color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>
                          View Order →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc', borderRadius: '0 0 12px 12px' }}>
              <button onClick={() => setActiveModal(null)} className="secondary-btn" style={{ padding: '6px 14px' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. FOLLOW-UPS DRILLDOWN MODAL */}
      {activeModal === "FOLLOWUPS" && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content glass-panel animate-in" style={{ maxWidth: '640px', width: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px 12px 0 0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PhoneCall size={18} color="#d97706" /> {periodLabel} Follow-ups
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{filteredFollowUps.length} follow-ups scheduled</span>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredFollowUps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  <CheckCircle2 size={36} style={{ color: '#10b981', margin: '0 auto 8px auto' }} />
                  <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>All caught up!</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>No pending follow-ups for {periodLabel.toLowerCase()}.</p>
                </div>
              ) : (
                filteredFollowUps.map((call: any) => (
                  <FollowUpCard key={call.id} call={call} />
                ))
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '0 0 12px 12px' }}>
              <Link href="/calls" style={{ fontSize: '0.8rem', color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
                Open Full Calls Page →
              </Link>
              <button onClick={() => setActiveModal(null)} className="secondary-btn" style={{ padding: '6px 14px' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TARGET PROGRESS MODAL */}
      {activeModal === "TARGET" && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content glass-panel animate-in" style={{ maxWidth: '520px', width: '95%', padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px 12px 0 0' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} color="#6366f1" /> Target & Achievement Details
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: '#6366f1' }}>{targetPercent}%</span>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Target Achieved for {periodLabel}</span>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '10px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden', marginBottom: '20px' }}>
                <div style={{ width: `${Math.min(100, targetPercent)}%`, height: '100%', backgroundColor: '#6366f1', borderRadius: '5px', transition: 'width 0.5s ease' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Target Goal ({periodLabel})</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>₹{targetPeriodGoal.toLocaleString('en-IN')}</div>
                </div>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Current Sales</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>₹{totalSales.toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '0.82rem', color: '#1e40af' }}>
                💡 Remaining to hit target: <strong>₹{remainingGap.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc', borderRadius: '0 0 12px 12px' }}>
              <button onClick={() => setActiveModal(null)} className="secondary-btn" style={{ padding: '6px 14px' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. PAYOUT & INCENTIVE MODAL */}
      {activeModal === "PAYOUT" && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content glass-panel animate-in" style={{ maxWidth: '640px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff', position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px 12px 0 0' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} color="#10b981" /> Estimated Payout & Incentive Computation
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Top Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Base Salary</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>₹{(employee?.salary || 0).toLocaleString('en-IN')}</div>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 700 }}>Incentive Earned</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>₹{calculatedIncentive.totalIncentive.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#1d4ed8', fontWeight: 700 }}>Total Est. Payout</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>₹{totalPayout.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>

              {/* Step-by-Step Calculation Breakdown */}
              <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calculator size={15} color="#4f46e5" /> Calculation Step-by-Step ({periodLabel})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                    <span>
                      <strong>1. Slab Incentive:</strong> ₹{calculatedIncentive.eligibleSales.toLocaleString('en-IN')} × {calculatedIncentive.slabRate}%
                    </span>
                    <strong style={{ color: '#0f172a' }}>
                      ₹{calculatedIncentive.slabIncentive.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                    <span>
                      <strong>2. Zero-Disc Bonus (+2%):</strong> ₹{calculatedIncentive.zeroDiscountSales.toLocaleString('en-IN')} × 2%
                    </span>
                    <strong style={{ color: '#059669' }}>
                      + ₹{calculatedIncentive.bonusIncentive.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                    <span>
                      <strong>3. Flat 1% Deals:</strong> ₹{calculatedIncentive.flatSales.toLocaleString('en-IN')} × 1%
                    </span>
                    <strong style={{ color: '#475569' }}>
                      + ₹{calculatedIncentive.flatIncentive.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px dashed #bfdbfe', fontWeight: 800 }}>
                    <span style={{ color: '#1d4ed8' }}>Total Incentive Earned</span>
                    <span style={{ color: '#1e40af' }}>
                      = ₹{calculatedIncentive.totalIncentive.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual 5-Tier Slab Matrix */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', fontSize: '0.78rem' }}>
                <div style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', fontWeight: 700, color: '#334155' }}>
                  Company Monthly Incentive Slab Matrix
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {[
                      { range: '₹0 – ₹2,49,999', rate: '1.0%', label: '1%' },
                      { range: '₹2,50,000 – ₹4,99,999', rate: '1.75%', label: '1.75%' },
                      { range: '₹5,00,000 – ₹6,99,999', rate: '2.5%', label: '2.5%' },
                      { range: '₹7,00,000 – ₹8,99,999', rate: '3.5%', label: '3.5%' },
                      { range: '₹9,00,000 and above', rate: '5.0%', label: '5%' },
                    ].map((s) => {
                      const isCurrent = calculatedIncentive.currentSlab === s.label;
                      return (
                        <tr key={s.range} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isCurrent ? '#ecfdf5' : 'transparent' }}>
                          <td style={{ padding: '8px 12px', fontWeight: isCurrent ? 700 : 400, color: isCurrent ? '#047857' : '#334155' }}>{s.range}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 800, color: isCurrent ? '#059669' : '#0f172a', textAlign: 'center' }}>{s.rate}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            {isCurrent && <span style={{ backgroundColor: '#a7f3d0', color: '#065f46', fontWeight: 800, padding: '2px 8px', borderRadius: '8px', fontSize: '0.7rem' }}>Active Tier ✨</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {calculatedIncentive.nextSlabAt && calculatedIncentive.nextSlabAt > 0 ? (
                <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', fontSize: '0.78rem', color: '#92400e', fontWeight: 600 }}>
                  🚀 Sell <strong>₹{calculatedIncentive.nextSlabAt.toLocaleString('en-IN')}</strong> more to unlock the <strong>{calculatedIncentive.nextSlabPercent}%</strong> slab!
                </div>
              ) : null}

              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                * Note: Payout calculations reflect sales recorded for {periodLabel.toLowerCase()}. Final payroll disbursements are approved by accounts at month end.
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc', borderRadius: '0 0 12px 12px' }}>
              <button onClick={() => setActiveModal(null)} className="secondary-btn" style={{ padding: '6px 14px' }}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
