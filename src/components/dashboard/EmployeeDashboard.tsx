"use client";

import DatePicker from '@/components/ui/DatePicker';

import React, { useState, useMemo } from 'react';
import CheckInButton from '@/components/ui/CheckInButton';
import { IncentiveResult, calculateIncentives, OrderData } from '@/lib/incentiveEngine';
import { SprintData, logDailySalesActivity } from '@/app/actions/sprintActions';
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
  Calculator,
  Zap,
  Flame,
  ShieldCheck,
  AlertCircle,
  Plus,
  Minus,
  CheckCircle,
  BarChart3,
  Rocket,
  Trophy
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

  const isLead = !call.customer && !!call.lead;
  const customerName = (call.customer?.businessName || call.lead?.shopName || call.lead?.name || '').trim();
  const contactPerson = (call.customer?.contactPerson || (call.lead?.shopName ? call.lead?.name : '') || '').trim();
  const rawPhone = call.customer?.mobile || call.customer?.phone || call.customer?.whatsappNumber || call.lead?.whatsappNumber || call.lead?.mobile || '';
  const cleanPhone = (rawPhone || '').replace(/[^0-9]/g, '');
  const priority = call.priority || ((call.customer?.leadStage === 'Negotiation' || call.lead?.stage === 'Negotiation') ? 'HIGH' : 'MEDIUM');

  // If this record has neither customer nor lead data, suppress the ghost card
  if (!customerName && !contactPerson && !call.customerId && !call.leadId) {
    return null;
  }

  const displayName = customerName || contactPerson || 'Customer';
  const detailsHref = call.customerId ? `/customers/${call.customerId}` : call.leadId ? `/leads/${call.leadId}` : '/calls';
  const logCallHref = call.customerId ? `/calls?customerId=${call.customerId}` : call.leadId ? `/calls?leadId=${call.leadId}` : '/calls';

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Link href={detailsHref} style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', textDecoration: 'none' }}>
              {displayName}
            </Link>
            {isLead && (
              <span style={{ 
                fontSize: '10px', 
                fontWeight: 700, 
                padding: '1px 6px', 
                borderRadius: '6px', 
                backgroundColor: '#eef2ff', 
                color: '#4f46e5' 
              }}>
                Lead
              </span>
            )}
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
            {contactPerson && contactPerson !== displayName ? `${contactPerson} • ` : ''}{call.notes || 'Scheduled follow-up call'}
          </p>
        </div>
      </div>
      
      {isEditing ? (
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          <DatePicker 
             
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
          <Link href={logCallHref} className="action-btn outline-primary" style={{ textDecoration: 'none', padding: '6px 10px', fontSize: '12px' }}>
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
  sprintData?: SprintData | null;
  dailyLeaderboard?: any[];
  monthlyLeaderboard?: any[];
  todayOrdersCount?: number;
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
  allFollowUps = [],
  sprintData,
  dailyLeaderboard = [],
  monthlyLeaderboard = [],
  todayOrdersCount = 0
}: EmployeeDashboardProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>("MONTHLY");
  const [activeModal, setActiveModal] = useState<"SALES" | "FOLLOWUPS" | "TARGET" | "PAYOUT" | null>(null);
  const [leaderboardTimeframe, setLeaderboardTimeframe] = useState<'DAILY' | 'MONTHLY'>('DAILY');

  // Optimistic tracking for daily call counters
  const [callsOffset, setCallsOffset] = useState(0);
  const [isSavingActivity, setIsSavingActivity] = useState(false);

  const handleAdjustCalls = async (delta: number) => {
    if (!employee?.id) return;
    setCallsOffset(prev => prev + delta);
    setIsSavingActivity(true);
    try {
      await logDailySalesActivity({
        employeeId: employee.id,
        callsDelta: delta
      });
    } catch (err) {
      console.error("Failed to log activity:", err);
    } finally {
      setIsSavingActivity(false);
    }
  };

  const currentTodayCalls = Math.max(0, (sprintData?.todayCalls || 0) + callsOffset);

  const todayDateStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const targetMonthlyGoal = employee?.target || 500000;

  // Filter out any ghost/orphan follow-ups that lack valid customer/lead identification
  const validTodayFollowUps = useMemo(() => {
    return todayFollowUps.filter((c: any) => 
      (c.customer && Boolean((c.customer.businessName || '').trim() || (c.customer.contactPerson || '').trim())) ||
      (c.lead && Boolean((c.lead.shopName || '').trim() || (c.lead.name || '').trim()))
    );
  }, [todayFollowUps]);

  const validAllFollowUps = useMemo(() => {
    return allFollowUps.filter((c: any) => 
      (c.customer && Boolean((c.customer.businessName || '').trim() || (c.customer.contactPerson || '').trim())) ||
      (c.lead && Boolean((c.lead.shopName || '').trim() || (c.lead.name || '').trim()))
    );
  }, [allFollowUps]);

  // Dynamic Time-Period calculations based on selected filter
  const { filteredOrders, previousOrders, filteredFollowUps, periodLabel, targetPeriodGoal } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    
    // Week Start (Monday)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now.getFullYear(), now.getMonth(), diff);
    const prevWeekStart = new Date(now.getFullYear(), now.getMonth(), diff - 7);

    // Month Start
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

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
      followUps = validAllFollowUps.filter(f => {
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
      followUps = validAllFollowUps.filter(f => {
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
      followUps = validAllFollowUps.filter(f => {
        if (!f.followUpDate) return false;
        const d = new Date(f.followUpDate);
        return d >= monthStart;
      });
    } else {
      label = "All Time";
      periodGoal = targetMonthlyGoal * 6;
      orders = allOrders;
      prevOrders = [];
      followUps = validAllFollowUps;
    }

    return {
      filteredOrders: orders,
      previousOrders: prevOrders,
      filteredFollowUps: followUps,
      periodLabel: label,
      targetPeriodGoal: periodGoal
    };
  }, [allOrders, validAllFollowUps, timeFilter, targetMonthlyGoal]);

  // Calculate Sales Amount using totalValue as true order value
  const totalSales = filteredOrders.reduce((sum, o) => sum + Number(o.totalValue !== null && o.totalValue !== undefined ? o.totalValue : (o.subtotal || 0)), 0);
  const prevTotalSales = previousOrders.reduce((sum, o) => sum + Number(o.totalValue !== null && o.totalValue !== undefined ? o.totalValue : (o.subtotal || 0)), 0);

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
    taxableValue: Number(order.totalValue !== null && order.totalValue !== undefined ? order.totalValue : (order.subtotal || 0)),
    discount: Number(order.discount || 0),
    isCreditCustomer: order.customer?.status?.toLowerCase() === 'credit' || order.customer?.preferredPaymentMethod?.toLowerCase() === 'credit'
  }));
  const calculatedIncentive = calculateIncentives(formattedOrderData, targetPeriodGoal);
  const totalPayout = (Number(employee?.salary) || 0) + (Number(calculatedIncentive?.totalIncentive) || 0);

  // ─── LEADERBOARD MEMOIZED COMPUTATIONS ───
  const activeLeaderboard = useMemo(() => {
    return leaderboardTimeframe === 'DAILY' ? dailyLeaderboard : monthlyLeaderboard;
  }, [leaderboardTimeframe, dailyLeaderboard, monthlyLeaderboard]);

  const maxLeaderboardVal = useMemo(() => {
    if (!activeLeaderboard || activeLeaderboard.length === 0) return 1;
    return Math.max(...activeLeaderboard.map((item: any) => Number(item.total) || 0), 1);
  }, [activeLeaderboard]);

  const currentEmployeeRank = useMemo(() => {
    if (!activeLeaderboard || !employee?.id) return null;
    const index = activeLeaderboard.findIndex((item: any) => item.id === employee.id || item.isCurrentEmployee);
    if (index === -1) return null;
    return {
      rank: index + 1,
      item: activeLeaderboard[index],
      gapToLeader: index > 0 ? Math.max(0, Number(activeLeaderboard[0].total || 0) - Number(activeLeaderboard[index].total || 0)) : 0
    };
  }, [activeLeaderboard, employee?.id]);

  return (
    <div className="dashboard-container employee-dashboard">
      
      {/* ─── MOBILE COMMAND CENTER HEADER ─── */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <span suppressHydrationWarning style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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

      {/* ─── TOP DUAL WORKFLOW & PERFORMANCE HUB: TODAY'S FOLLOW-UPS + SALES LEADERBOARD ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* LEFT: TODAY'S FOLLOW-UPS */}
        <div className="zoho-card" style={{
          borderLeft: validTodayFollowUps.length > 0 ? '4px solid #ef4444' : '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '340px'
        }}>
          <div>
            <div className="zoho-header" style={{ paddingBottom: '12px' }}>
              <div className="zoho-title-group">
                <div className="zoho-title-icon" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}>
                  <PhoneForwarded size={18} />
                </div>
                <div>
                  <h2 className="zoho-title" style={{ fontSize: '1rem' }}>
                    Today's Follow-ups ({validTodayFollowUps.length})
                  </h2>
                  <p className="zoho-subtitle" style={{ fontSize: '0.75rem' }}>Priority calls scheduled for today</p>
                </div>
              </div>
              <Link href="/calls" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textDecoration: 'none' }}>
                View All →
              </Link>
            </div>

            <div style={{ padding: '4px 6px', maxHeight: '270px', overflowY: 'auto' }}>
              {validTodayFollowUps.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {validTodayFollowUps.map((call: any) => (
                    <FollowUpCard key={call.id} call={call} />
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '36px 10px', color: '#64748b' }}>
                  <CheckCircle2 size={32} style={{ color: '#10b981', margin: '0 auto 8px auto' }} />
                  <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>No pending follow-ups today!</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem' }}>You're all caught up. Schedule new leads or log fresh calls.</p>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 14px', borderTop: '1px solid #f1f5f9' }}>
            <Link href="/calls" style={{ fontSize: '0.74rem', fontWeight: 700, color: '#ef4444', textDecoration: 'none' }}>
              Open Call Center →
            </Link>
          </div>
        </div>

        {/* RIGHT: TEAM SALES LEADERBOARD (DAILY & MONTHLY) */}
        <div className="zoho-card" style={{
          borderLeft: '4px solid #8b5cf6',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '340px'
        }}>
          <div>
            {/* Header with Title, Live Badge, and Timeframe Tabs */}
            <div className="zoho-header" style={{ paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div className="zoho-title-group">
                <div className="zoho-title-icon" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
                  <Trophy size={18} />
                </div>
                <div>
                  <h2 className="zoho-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Sales Leaderboard
                    {leaderboardTimeframe === 'DAILY' && todayOrdersCount > 0 && (
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        backgroundColor: '#f5f3ff',
                        color: '#7c3aed',
                        padding: '1px 7px',
                        borderRadius: '10px',
                        border: '1px solid rgba(139, 92, 246, 0.2)'
                      }}>
                        🔥 {todayOrdersCount} Deals Today
                      </span>
                    )}
                  </h2>
                  <p className="zoho-subtitle" style={{ fontSize: '0.75rem' }}>
                    {leaderboardTimeframe === 'DAILY' ? "Today's live closing rankings" : "Month-to-date (MTD) sales performance"}
                  </p>
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
                  onClick={() => setLeaderboardTimeframe('DAILY')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    border: 'none',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: leaderboardTimeframe === 'DAILY' ? '#ffffff' : 'transparent',
                    color: leaderboardTimeframe === 'DAILY' ? '#7c3aed' : '#64748b',
                    boxShadow: leaderboardTimeframe === 'DAILY' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ⚡ Daily (Today)
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardTimeframe('MONTHLY')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    border: 'none',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: leaderboardTimeframe === 'MONTHLY' ? '#ffffff' : 'transparent',
                    color: leaderboardTimeframe === 'MONTHLY' ? '#7c3aed' : '#64748b',
                    boxShadow: leaderboardTimeframe === 'MONTHLY' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  🏆 Monthly (MTD)
                </button>
              </div>
            </div>

            {/* Current Salesperson Standings Banner */}
            {currentEmployeeRank && (
              <div style={{
                margin: '0 6px 10px 6px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: currentEmployeeRank.rank === 1
                  ? 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)'
                  : 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                border: currentEmployeeRank.rank === 1 ? '1px solid #fde68a' : '1px solid #ddd6fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1rem' }}>
                    {currentEmployeeRank.rank === 1 ? '🥇' : currentEmployeeRank.rank === 2 ? '🥈' : currentEmployeeRank.rank === 3 ? '🥉' : '🎯'}
                  </span>
                  <span style={{ fontWeight: 700, color: currentEmployeeRank.rank === 1 ? '#92400e' : '#5b21b6' }}>
                    Your Standing: #{currentEmployeeRank.rank}
                  </span>
                  <span style={{ color: currentEmployeeRank.rank === 1 ? '#b45309' : '#6d28d9' }}>
                    • ₹{Number(currentEmployeeRank.item.total || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                {currentEmployeeRank.rank === 1 ? (
                  <span style={{ fontWeight: 700, color: '#d97706', fontSize: '0.7rem' }}>Leading the Board! 🔥</span>
                ) : currentEmployeeRank.gapToLeader > 0 ? (
                  <span style={{ color: '#7c3aed', fontWeight: 600, fontSize: '0.7rem' }}>
                    ₹{currentEmployeeRank.gapToLeader.toLocaleString('en-IN')} to #1 🥇
                  </span>
                ) : null}
              </div>
            )}

            {/* Scrollable Leaderboard Rows */}
            <div style={{
              padding: '0 6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '215px',
              overflowY: 'auto'
            }}>
              {activeLeaderboard && activeLeaderboard.length > 0 ? (
                activeLeaderboard.map((item: any, index: number) => {
                  const isCurrent = item.id === employee?.id || item.isCurrentEmployee;
                  const percentOfTop = Math.round((Number(item.total || 0) / maxLeaderboardVal) * 100);
                  const medalBg = index === 0 ? '#fef3c7' : index === 1 ? '#f1f5f9' : index === 2 ? '#ffedd5' : '#f8fafc';
                  const medalColor = index === 0 ? '#d97706' : index === 1 ? '#475569' : index === 2 ? '#c2410c' : '#64748b';
                  const medalBorder = index === 0 ? '#fde68a' : index === 1 ? '#e2e8f0' : index === 2 ? '#fed7aa' : '#e2e8f0';

                  return (
                    <div
                      key={index}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: isCurrent ? '#faf5ff' : '#ffffff',
                        border: isCurrent ? '1.5px solid #a855f7' : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: isCurrent ? '0 2px 6px rgba(168, 85, 247, 0.12)' : '0 1px 2px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        transition: 'all 0.15s ease'
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
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isCurrent ? '#7c3aed' : '#0f172a' }}>
                                {item.name}
                              </span>
                              {isCurrent && (
                                <span style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  backgroundColor: '#7c3aed',
                                  color: '#ffffff',
                                  padding: '0 5px',
                                  borderRadius: '4px'
                                }}>
                                  YOU
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                              {item.orders} {item.orders === 1 ? 'deal' : 'deals'}
                              {leaderboardTimeframe === 'MONTHLY' && item.targetPercent !== undefined && (
                                <span style={{ marginLeft: '6px', color: item.targetPercent >= 100 ? '#059669' : '#4f46e5', fontWeight: 600 }}>
                                  ({item.targetPercent}% target)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.84rem', fontWeight: 800, color: isCurrent ? '#7c3aed' : '#059669' }}>
                          ₹{Number(item.total || 0).toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* Velocity bar */}
                      <div style={{ width: '100%', height: '3px', backgroundColor: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${percentOfTop}%`,
                          height: '100%',
                          background: isCurrent
                            ? 'linear-gradient(90deg, #a855f7 0%, #ec4899 100%)'
                            : index === 0
                            ? 'linear-gradient(90deg, #f59e0b 0%, #10b981 100%)'
                            : 'linear-gradient(90deg, #8b5cf6 0%, #3b82f6 100%)',
                          borderRadius: '2px'
                        }}></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 10px', color: '#64748b', fontSize: '0.78rem' }}>
                  <Trophy size={28} style={{ color: '#cbd5e1', margin: '0 auto 6px auto' }} />
                  <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>
                    {leaderboardTimeframe === 'DAILY' ? 'No orders placed yet today.' : 'No orders recorded this month.'}
                  </p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem' }}>Close deals and watch your rank climb!</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 14px', borderTop: '1px solid #f1f5f9' }}>
            <Link href="/orders" style={{ fontSize: '0.74rem', fontWeight: 700, color: '#7c3aed', textDecoration: 'none' }}>
              View All Orders & Sales →
            </Link>
          </div>
        </div>
      </div>

      {/* ─── SPRINT FRAMEWORK COCKPIT (WEEKLY SPRINT & DAILY ACTION HUBS) ─── */}
      {sprintData && (
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* TOP BANNER: SPRINT HEALTH & MOMENTUM GAUGE */}
          <div style={{ 
            background: sprintData.healthStatus === 'EXCELLENT' 
              ? 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)' 
              : sprintData.healthStatus === 'ON_TRACK'
              ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)'
              : 'linear-gradient(135deg, #450a0a 0%, #991b1b 50%, #dc2626 100%)',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '16px 22px',
            boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12), 0 2px 6px -1px rgba(0,0,0,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Ambient background glow element */}
            <div style={{
              position: 'absolute',
              right: '-40px',
              top: '-40px',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', zIndex: 1 }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {sprintData.healthStatus === 'EXCELLENT' ? <Rocket size={22} color="#ffffff" /> : sprintData.healthStatus === 'ON_TRACK' ? <Zap size={22} color="#ffffff" /> : <AlertCircle size={22} color="#ffffff" />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', backgroundColor: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.2)', padding: '2px 9px', borderRadius: '20px' }}>
                    Sprint {sprintData.weekNumber} of 4 ({sprintData.weekStartStr} - {sprintData.weekEndStr})
                  </span>
                  {sprintData.streakDays > 0 && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, backgroundColor: 'rgba(254, 240, 138, 0.95)', color: '#854d0e', padding: '2px 9px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Flame size={12} color="#d97706" /> {sprintData.streakDays}-Day Streak
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.98rem', fontWeight: 600, marginTop: '4px', letterSpacing: '-0.1px', opacity: 0.95 }}>
                  {sprintData.healthMessage}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', zIndex: 1 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 500, letterSpacing: '0.2px' }}>Sprint Velocity Score</div>
                <div style={{ fontSize: '1.45rem', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {sprintData.sprintHealthScore}<span style={{ fontSize: '0.85rem', opacity: 0.7, fontWeight: 500 }}>/100</span>
                </div>
              </div>
              <div style={{
                height: '36px',
                width: '1px',
                backgroundColor: 'rgba(255,255,255,0.2)'
              }} />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 500, letterSpacing: '0.2px' }}>Days Left in Sprint</div>
                <div style={{ fontSize: '1.45rem', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {sprintData.daysRemainingInSprint}
                </div>
              </div>
            </div>
          </div>

          {/* MAIN SPRINT CARD: WEEKLY TARGET SPRINT + CREATIVE MULTI-STAGE ROADMAP */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '20px 22px',
            boxShadow: '0 4px 20px -2px rgba(99, 102, 241, 0.05), 0 2px 6px -1px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  color: '#4f46e5',
                  border: '1px solid #e0e7ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Target size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 650, color: '#0f172a', letterSpacing: '-0.2px' }}>
                    {sprintData.weekName}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 450 }}>
                    Weekly Target: ₹{sprintData.currentSprintTarget.toLocaleString('en-IN')} (Targeted for this sprint period)
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>Sprint Closed / Target:</span>
                  <div style={{ fontSize: '1.02rem', fontWeight: 650, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ color: '#059669' }}>₹{sprintData.currentSprintRevenue.toLocaleString('en-IN')}</span> <span style={{ color: '#94a3b8', fontWeight: 400 }}>/</span> ₹{sprintData.currentSprintTarget.toLocaleString('en-IN')}
                  </div>
                </div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: sprintData.sprintProgressPercent >= 100 ? '#ecfdf5' : sprintData.sprintProgressPercent >= 60 ? '#eff6ff' : '#fef2f2',
                  color: sprintData.sprintProgressPercent >= 100 ? '#059669' : sprintData.sprintProgressPercent >= 60 ? '#4f46e5' : '#dc2626',
                  border: sprintData.sprintProgressPercent >= 100 ? '1px solid #a7f3d0' : sprintData.sprintProgressPercent >= 60 ? '1px solid #bfdbfe' : '1px solid #fecaca'
                }}>
                  {sprintData.sprintProgressPercent}%
                </span>
              </div>
            </div>

            {/* HIGH-TECH GLOWING SPRINT PROGRESS BAR */}
            <div style={{ 
              width: '100%', 
              height: '9px', 
              backgroundColor: '#f1f5f9', 
              borderRadius: '20px', 
              overflow: 'hidden', 
              marginBottom: '16px',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
            }}>
              <div style={{
                width: `${Math.min(100, Math.max(2, sprintData.sprintProgressPercent))}%`,
                height: '100%',
                background: sprintData.sprintProgressPercent >= 100 
                  ? 'linear-gradient(90deg, #10b981, #059669)' 
                  : 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #4f46e5 100%)',
                borderRadius: '20px',
                boxShadow: sprintData.sprintProgressPercent >= 100 ? '0 0 10px rgba(16, 185, 129, 0.4)' : '0 0 10px rgba(99, 102, 241, 0.35)',
                transition: 'width 0.4s ease'
              }} />
            </div>

            {/* 4-SPRINT CONNECTED ROADMAP CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', paddingTop: '12px', borderTop: '1px solid #f8fafc' }}>
              {sprintData.sprints.map(s => {
                const isCurrent = s.status === 'CURRENT';
                const isPassed = s.isPassed;
                const stagePercent = s.target > 0 ? Math.min(100, Math.round((s.actual / s.target) * 100)) : 0;

                return (
                  <div key={s.week} style={{
                    padding: '11px 13px',
                    borderRadius: '12px',
                    border: isCurrent 
                      ? '1.5px solid #6366f1' 
                      : isPassed 
                      ? '1px solid #bbf7d0' 
                      : '1px solid #e2e8f0',
                    background: isCurrent 
                      ? 'linear-gradient(135deg, #fbfaff 0%, #f5f3ff 100%)' 
                      : isPassed 
                      ? '#f0fdf4' 
                      : '#f8fafc',
                    boxShadow: isCurrent ? '0 4px 12px rgba(99, 102, 241, 0.1)' : 'none',
                    position: 'relative',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: isCurrent ? '#4f46e5' : isPassed ? '#16a34a' : '#64748b' }}>
                        Sprint {s.week} <span style={{ opacity: 0.7, fontWeight: 500 }}>({s.weightPercent}%)</span>
                      </span>
                      {isPassed ? (
                        <CheckCircle size={14} color="#16a34a" />
                      ) : isCurrent ? (
                        <span style={{ fontSize: '8.5px', fontWeight: 600, backgroundColor: '#4f46e5', color: '#fff', padding: '1px 6px', borderRadius: '10px', letterSpacing: '0.4px' }}>ACTIVE</span>
                      ) : null}
                    </div>

                    <div style={{ fontSize: '0.88rem', fontWeight: 650, color: '#0f172a', fontVariantNumeric: 'tabular-nums', marginBottom: '6px' }}>
                      ₹{s.actual > 0 ? (s.actual / 1000).toFixed(1) + 'k' : '0'} <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>/ {(s.target / 1000).toFixed(0)}k</span>
                    </div>

                    {/* Micro stage progress line */}
                    <div style={{ width: '100%', height: '3.5px', backgroundColor: isCurrent ? '#ddd6fe' : '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${stagePercent}%`,
                        height: '100%',
                        backgroundColor: isPassed ? '#16a34a' : isCurrent ? '#4f46e5' : '#94a3b8',
                        borderRadius: '4px'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DAILY ACTION POWER COCKPIT */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={16} color="#d97706" />
                  <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: '#0f172a' }}>
                    Today's Action Targets (Lead Indicators)
                  </h3>
                </div>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                  Consistent daily actions directly drive weekly sprint conversions.
                </p>
              </div>
              <Link href="/quotations/new" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 11px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'all 0.15s ease'
              }}>
                <Plus size={13} /> Create Quote
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              
              {/* TARGET 1: CALLS */}
              <div style={{
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: currentTodayCalls >= sprintData.todayCallsTarget ? '1px solid #86efac' : '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 550, color: '#475569', textTransform: 'uppercase' }}>
                      📞 Calls Logged
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 500, color: currentTodayCalls >= sprintData.todayCallsTarget ? '#16a34a' : '#64748b' }}>
                      Goal: {sprintData.todayCallsTarget}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a', margin: '4px 0 2px 0', fontVariantNumeric: 'tabular-nums' }}>
                    {currentTodayCalls} <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 400 }}>/ {sprintData.todayCallsTarget}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleAdjustCalls(-1)}
                    disabled={currentTodayCalls === 0 || isSavingActivity}
                    style={{
                      flex: 1,
                      padding: '4px 0',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      cursor: currentTodayCalls === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 500
                    }}
                    title="Decrease call count"
                  >
                    <Minus size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustCalls(1)}
                    disabled={isSavingActivity}
                    style={{
                      flex: 1.5,
                      padding: '4px 0',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                      fontSize: '11px',
                      fontWeight: 500
                    }}
                    title="Log 1 more call"
                  >
                    <Plus size={11} /> Call
                  </button>
                </div>
              </div>

              {/* TARGET 2: FOLLOW-UPS DONE */}
              <div 
                onClick={() => setActiveModal("FOLLOWUPS")}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  border: sprintData.todayFollowUps >= sprintData.todayFollowUpsTarget ? '1px solid #86efac' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 550, color: '#475569', textTransform: 'uppercase' }}>
                      🤝 Follow-ups
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 500, color: sprintData.todayFollowUps >= sprintData.todayFollowUpsTarget ? '#16a34a' : '#64748b' }}>
                      Goal: {sprintData.todayFollowUpsTarget}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#d97706', margin: '4px 0 2px 0', fontVariantNumeric: 'tabular-nums' }}>
                    {sprintData.todayFollowUps} <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 400 }}>/ {sprintData.todayFollowUpsTarget}</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 500, marginTop: '6px' }}>
                  View Today's List →
                </div>
              </div>

              {/* TARGET 3: QUOTES SENT */}
              <div style={{
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: sprintData.todayQuotesSent >= sprintData.todayQuotesSentTarget ? '1px solid #86efac' : '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 550, color: '#475569', textTransform: 'uppercase' }}>
                      📄 Quotes Sent
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 500, color: sprintData.todayQuotesSent >= sprintData.todayQuotesSentTarget ? '#16a34a' : '#64748b' }}>
                      Goal: {sprintData.todayQuotesSentTarget}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a', margin: '4px 0 2px 0', fontVariantNumeric: 'tabular-nums' }}>
                    {sprintData.todayQuotesSent} <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 400 }}>/ {sprintData.todayQuotesSentTarget}</span>
                  </div>
                </div>
                <Link href="/quotations" style={{ fontSize: '0.72rem', color: '#4f46e5', fontWeight: 500, textDecoration: 'none', marginTop: '6px' }}>
                  Quotes Pipeline →
                </Link>
              </div>

              {/* TARGET 4: QUOTES CONFIRMED (DEALS CLOSED) */}
              <div style={{
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: sprintData.todayQuotesConfirmed > 0 ? '#f0fdf4' : '#f8fafc',
                border: sprintData.todayQuotesConfirmed >= sprintData.todayQuotesConfirmedTarget ? '1px solid #86efac' : '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 550, color: '#475569', textTransform: 'uppercase' }}>
                      🎯 Deals Confirmed
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 500, color: sprintData.todayQuotesConfirmed >= sprintData.todayQuotesConfirmedTarget ? '#16a34a' : '#64748b' }}>
                      Goal: {sprintData.todayQuotesConfirmedTarget}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#16a34a', margin: '4px 0 2px 0', fontVariantNumeric: 'tabular-nums' }}>
                    {sprintData.todayQuotesConfirmed} <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 400 }}>/ {sprintData.todayQuotesConfirmedTarget}</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 550, marginTop: '6px' }}>
                  {sprintData.todayQuotesConfirmed > 0 ? "🎉 Sale Secured!" : "Awaiting close"}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

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
              padding: '14px 16px', 
              borderRadius: '14px', 
              backgroundColor: '#ffffff', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#818cf8';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(79, 70, 229, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 8px -2px rgba(0,0,0,0.04)';
            }}
            title="Click to view sales breakdown"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 550 }}>{periodLabel} Sales</span>
              <span style={{ fontSize: '0.68rem', color: '#4f46e5', fontWeight: 600 }}>View 🔍</span>
            </div>

            <div style={{ fontSize: '1.3rem', fontWeight: 650, color: '#0f172a', margin: '4px 0', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              ₹{(totalSales / 1000).toFixed(1)}k
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {totalSales === 0 ? (
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>
                  0 orders
                </span>
              ) : (
                <span style={{ fontSize: '0.7rem', color: growthIsPositive ? '#10b981' : '#ef4444', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  {growthIsPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {growthIsPositive ? `+${growthPercent}%` : `${growthPercent}%`}
                </span>
              )}
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 450 }}>
                {filteredOrders.length} sale{filteredOrders.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* BLOCK 2: Follow-ups Due (Clickable) */}
          <div 
            onClick={() => setActiveModal("FOLLOWUPS")}
            style={{ 
              padding: '14px 16px', 
              borderRadius: '14px', 
              backgroundColor: '#ffffff', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#f59e0b';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 8px -2px rgba(0,0,0,0.04)';
            }}
            title="Click to view follow-ups"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 550 }}>Follow-ups Due</span>
              <span style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: 600 }}>View 🔍</span>
            </div>

            <div style={{ fontSize: '1.3rem', fontWeight: 650, color: '#d97706', margin: '4px 0', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {filteredFollowUps.length}
            </div>

            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
              {filteredFollowUps.length > 0 ? `${filteredFollowUps.length} Pending` : 'All Cleared 🎉'}
            </span>
          </div>

          {/* BLOCK 3: Target Progress (Clickable) */}
          <div 
            onClick={() => setActiveModal("TARGET")}
            style={{ 
              padding: '14px 16px', 
              borderRadius: '14px', 
              backgroundColor: '#ffffff', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#818cf8';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 8px -2px rgba(0,0,0,0.04)';
            }}
            title="Click to view target progress details"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 550 }}>Target Progress</span>
              <span style={{ fontSize: '0.68rem', color: '#6366f1', fontWeight: 600 }}>View 🔍</span>
            </div>

            <div style={{ fontSize: '1.3rem', fontWeight: 650, color: '#6366f1', margin: '4px 0', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {targetPercent}%
            </div>

            <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 600 }}>
              Goal: ₹{(targetPeriodGoal / 100000).toFixed(1)}L
            </span>
          </div>

          {/* BLOCK 4: Est. Total Payout (Clickable) */}
          <div 
            onClick={() => setActiveModal("PAYOUT")}
            style={{ 
              padding: '14px 16px', 
              borderRadius: '14px', 
              backgroundColor: '#ffffff', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#34d399';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 8px -2px rgba(0,0,0,0.04)';
            }}
            title="Click to view earnings and slab breakdown"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 550 }}>Est. Total Payout</span>
              <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>View 🔍</span>
            </div>

            <div style={{ fontSize: '1.3rem', fontWeight: 650, color: '#059669', margin: '4px 0', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              ₹{(totalPayout / 1000).toFixed(1)}k
            </div>

            <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>
              Slab: {calculatedIncentive.currentSlab}
            </span>
          </div>

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
