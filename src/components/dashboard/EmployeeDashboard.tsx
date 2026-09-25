"use client";

import DatePicker from '@/components/ui/DatePicker';

import React, { useState, useMemo } from 'react';
import CheckInButton from '@/components/ui/CheckInButton';
import { IncentiveResult, calculateIncentives, OrderData } from '@/lib/incentiveEngine';
import { SprintData, logDailySalesActivity } from '@/app/actions/sprintActions';
import { openPhoneDialer } from '@/lib/dialer';
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
  Trophy,
  FileText,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { removeFollowUp, rescheduleFollowUp } from '@/app/actions/callActions';
import "@/components/ui/modal.css";

function isFollowUpForToday(dateInput: any): boolean {
  if (!dateInput) return false;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return false;

  const now = new Date();
  // 1. Local browser date check
  if (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  ) {
    return true;
  }

  // 2. IST date check (UTC + 5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const istTarget = new Date(d.getTime() + istOffset);
  if (
    istTarget.getUTCFullYear() === istNow.getUTCFullYear() &&
    istTarget.getUTCMonth() === istNow.getUTCMonth() &&
    istTarget.getUTCDate() === istNow.getUTCDate()
  ) {
    return true;
  }

  // 3. String YYYY-MM-DD match
  if (typeof dateInput === 'string' && dateInput.length >= 10) {
    const raw = dateInput.substring(0, 10);
    const pad = (n: number) => String(n).padStart(2, '0');
    const localStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const istStr = `${istNow.getUTCFullYear()}-${pad(istNow.getUTCMonth() + 1)}-${pad(istNow.getUTCDate())}`;
    if (raw === localStr || raw === istStr) return true;
  }

  return false;
}

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
      padding: '10px', 
      borderRadius: '10px', 
      border: priority === 'HIGH' ? '1px solid #fecaca' : '1px solid #e2e8f0', 
      borderLeft: priority === 'HIGH' ? '3.5px solid #ef4444' : '3.5px solid #3b82f6',
      opacity: isProcessing ? 0.6 : 1,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      transition: 'all 0.15s ease'
    }}>
      {/* CARD HEADER: NAME & BADGES */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
          <Link 
            href={detailsHref} 
            title={displayName}
            style={{ 
              margin: 0, 
              fontSize: '0.86rem', 
              fontWeight: 700, 
              color: '#0f172a', 
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '200px'
            }}
          >
            {displayName}
          </Link>
          {isLead && (
            <span style={{ 
              fontSize: '9.5px', 
              fontWeight: 700, 
              padding: '1px 5px', 
              borderRadius: '4px', 
              backgroundColor: '#e0e7ff', 
              color: '#4338ca',
              lineHeight: '1.2',
              flexShrink: 0
            }}>
              Lead
            </span>
          )}
          <span style={{ 
            fontSize: '9.5px', 
            fontWeight: 700, 
            padding: '1px 5px', 
            borderRadius: '4px', 
            backgroundColor: priority === 'HIGH' ? '#fee2e2' : '#fef3c7',
            color: priority === 'HIGH' ? '#dc2626' : '#d97706',
            lineHeight: '1.2',
            flexShrink: 0
          }}>
            {priority}
          </span>
        </div>
      </div>
      
      {/* SUBTITLE: CONTACT PERSON & NOTES */}
      <p style={{ 
        margin: '3px 0 0 0', 
        fontSize: '0.74rem', 
        color: '#64748b',
        lineHeight: 1.35,
        wordBreak: 'break-word'
      }}>
        {contactPerson && contactPerson !== displayName ? <strong style={{ color: '#334155' }}>{contactPerson} • </strong> : ''}
        {call.notes || 'Scheduled follow-up call'}
      </p>
      
      {isEditing ? (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
          <DatePicker 
            value={newDate} 
            onChange={(e) => setNewDate(e.target.value)}
            className="zoho-input-field" 
            style={{ padding: '3px 7px', fontSize: '11.5px', height: '28px', flex: 1, minWidth: 0 }}
          />
          <button onClick={handleReschedule} disabled={!newDate} className="primary-btn" style={{ padding: '3px 10px', fontSize: '11px', height: '28px', flexShrink: 0 }}>Save</button>
          <button onClick={() => setIsEditing(false)} className="secondary-btn" style={{ padding: '3px 10px', fontSize: '11px', height: '28px', flexShrink: 0 }}>Cancel</button>
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '5px', 
          marginTop: '8px', 
          paddingTop: '6px', 
          borderTop: '1px solid #f1f5f9' 
        }}>
          {/* ROW 1: COMMUNICATION ACTIONS (3 EQUAL COLUMNS) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: cleanPhone ? 'repeat(3, 1fr)' : '1fr', 
            gap: '6px' 
          }}>
            {cleanPhone ? (
              <>
                <button 
                  type="button"
                  onClick={() => openPhoneDialer({
                    phone: cleanPhone,
                    name: customerName || contactPerson || 'Customer'
                  })}
                  style={{ 
                    padding: '5px 4px', 
                    fontSize: '11.5px', 
                    fontWeight: 700, 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '4px',
                    borderRadius: '6px',
                    backgroundColor: '#f0fdf4',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    cursor: 'pointer',
                    height: '30px',
                    whiteSpace: 'nowrap'
                  }}
                  title={`Call ${customerName || contactPerson || 'Customer'}`}
                >
                  <PhoneCall size={12} /> Call
                </button>
                <a 
                  href={`https://wa.me/91${cleanPhone}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  style={{ 
                    textDecoration: 'none', 
                    padding: '5px 4px', 
                    fontSize: '11.5px', 
                    fontWeight: 700, 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '4px', 
                    borderRadius: '6px',
                    backgroundColor: '#25D366', 
                    color: '#ffffff',
                    height: '30px',
                    boxShadow: '0 1px 2px rgba(37,211,102,0.25)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <MessageSquare size={12} /> WhatsApp
                </a>
                <Link 
                  href={logCallHref} 
                  style={{ 
                    textDecoration: 'none', 
                    padding: '5px 4px', 
                    fontSize: '11.5px', 
                    fontWeight: 700, 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '4px',
                    borderRadius: '6px',
                    backgroundColor: '#eff6ff', 
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    height: '30px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Log Call
                </Link>
              </>
            ) : (
              <Link 
                href={logCallHref} 
                style={{ 
                  textDecoration: 'none', 
                  padding: '5px 4px', 
                  fontSize: '11.5px', 
                  fontWeight: 700, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '4px',
                  borderRadius: '6px',
                  backgroundColor: '#eff6ff', 
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                  height: '30px',
                  whiteSpace: 'nowrap'
                }}
              >
                Log Call / Add Notes
              </Link>
            )}
          </div>

          {/* ROW 2: WORKFLOW & STATUS ACTIONS (2 EQUAL COLUMNS) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '6px' 
          }}>
            <button 
              type="button"
              onClick={() => setIsEditing(true)} 
              style={{ 
                padding: '5px 4px', 
                fontSize: '11.5px', 
                fontWeight: 700, 
                cursor: 'pointer', 
                borderRadius: '6px',
                border: '1px solid #cbd5e1', 
                color: '#475569', 
                background: '#f8fafc',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                height: '30px',
                whiteSpace: 'nowrap'
              }}
            >
              <Pencil size={12} /> Reschedule
            </button>
            <button 
              type="button"
              onClick={handleRemove} 
              style={{ 
                padding: '5px 4px', 
                fontSize: '11.5px', 
                fontWeight: 700, 
                cursor: 'pointer', 
                borderRadius: '6px',
                border: '1px solid #fecdd3', 
                color: '#e11d48', 
                background: '#fff1f2',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                height: '30px',
                whiteSpace: 'nowrap'
              }}
            >
              <CheckCircle2 size={12} /> Done
            </button>
          </div>
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
  const [followUpTab, setFollowUpTab] = useState<'TODAY' | 'OVERDUE'>('TODAY');

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
  const validAllFollowUps = useMemo(() => {
    return allFollowUps.filter((c: any) => 
      (c.customer && Boolean((c.customer.businessName || '').trim() || (c.customer.contactPerson || '').trim())) ||
      (c.lead && Boolean((c.lead.shopName || '').trim() || (c.lead.name || '').trim())) ||
      Boolean(c.customerId || c.leadId)
    );
  }, [allFollowUps]);

  const validTodayFollowUps = useMemo(() => {
    return validAllFollowUps.filter((c: any) => isFollowUpForToday(c.followUpDate));
  }, [validAllFollowUps]);

  const overdueFollowUps = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return validAllFollowUps.filter((c: any) => {
      if (!c.followUpDate || isFollowUpForToday(c.followUpDate)) return false;
      const d = new Date(c.followUpDate);
      return !isNaN(d.getTime()) && d < todayStart;
    });
  }, [validAllFollowUps]);

  const displayedFollowUps = followUpTab === 'TODAY' ? validTodayFollowUps : overdueFollowUps;

  // Dynamic Time-Period calculations based on selected filter
  const { filteredOrders, previousOrders, filteredFollowUps, periodLabel, targetPeriodGoal } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    
    // Week Start (Monday) & End
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now.getFullYear(), now.getMonth(), diff);
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), diff + 7);
    const prevWeekStart = new Date(now.getFullYear(), now.getMonth(), diff - 7);

    // Month Start & End
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
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
      followUps = validAllFollowUps.filter(f => isFollowUpForToday(f.followUpDate));
    } else if (timeFilter === "WEEKLY") {
      label = "This Week";
      periodGoal = Math.round(targetMonthlyGoal / 4);
      orders = allOrders.filter(o => {
        if (!o.orderDate) return false;
        const d = new Date(o.orderDate);
        return d >= weekStart && d < weekEnd;
      });
      prevOrders = allOrders.filter(o => {
        if (!o.orderDate) return false;
        const d = new Date(o.orderDate);
        return d >= prevWeekStart && d < weekStart;
      });
      followUps = validAllFollowUps.filter(f => {
        if (!f.followUpDate) return false;
        const d = new Date(f.followUpDate);
        return d >= weekStart && d < weekEnd;
      });
    } else if (timeFilter === "MONTHLY") {
      label = "This Month";
      periodGoal = targetMonthlyGoal;
      orders = allOrders.filter(o => {
        if (!o.orderDate) return false;
        const d = new Date(o.orderDate);
        return d >= monthStart && d <= monthEnd;
      });
      prevOrders = allOrders.filter(o => {
        if (!o.orderDate) return false;
        const d = new Date(o.orderDate);
        return d >= prevMonthStart && d <= prevMonthEnd;
      });
      followUps = validAllFollowUps.filter(f => {
        if (!f.followUpDate) return false;
        const d = new Date(f.followUpDate);
        return d >= monthStart && d <= monthEnd;
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
      <div className="employee-dashboard-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: '12px',
        marginBottom: '16px',
        flexWrap: 'nowrap'
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div suppressHydrationWarning style={{ 
            fontSize: '0.72rem', 
            fontWeight: 700, 
            color: '#ef4444', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
            {todayDateStr} • Today's Shift
          </div>
          <h1 className="page-title" style={{ 
            fontSize: '1.2rem', 
            margin: '3px 0 0 0',
            lineHeight: 1.25,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            Good Morning, {employee?.user?.name ? employee.user.name.split(' ')[0] : 'Team'}! 👋
          </h1>
        </div>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <CheckInButton 
            isCheckedIn={isCheckedIn} 
            isCheckedOut={isCheckedOut} 
            checkInTime={checkInTime}
            checkOutTime={checkOutTime}
            employeeId={employee?.id}
          />
        </div>
      </div>

      {/* ─── TOP DUAL WORKFLOW & PERFORMANCE HUB: TODAY'S FOLLOW-UPS + SALES LEADERBOARD ─── */}
      <div className="dashboard-dual-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', 
        gap: '16px', 
        marginBottom: '20px' 
      }}>
        
        {/* LEFT: TODAY'S FOLLOW-UPS */}
        <div className="zoho-card follow-ups-card" style={{
          borderLeft: validTodayFollowUps.length > 0 ? '3px solid #ef4444' : '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '260px'
        }}>
          <div>
            {/* CARD HEADER */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingBottom: '10px',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '10px'
            }}>
              {/* ROW 1: ICON + TITLE + BADGE ON LEFT, VIEW ALL LINK ON RIGHT */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    backgroundColor: '#fee2e2',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <PhoneForwarded size={16} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <h2 style={{
                      margin: 0,
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      whiteSpace: 'nowrap'
                    }}>
                      Today's Follow-ups
                    </h2>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      padding: '1px 7px',
                      borderRadius: '10px',
                      flexShrink: 0
                    }}>
                      {validTodayFollowUps.length}
                    </span>
                  </div>
                </div>

                <Link 
                  href="/calls" 
                  style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    color: '#ef4444', 
                    textDecoration: 'none',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#fff1f2',
                    border: '1px solid #fecdd3',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  View All →
                </Link>
              </div>

              {/* ROW 2: SUBTITLE ON LEFT, TODAY / OVERDUE FILTER TABS ON RIGHT */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
                  Priority calls scheduled for today
                </p>

                {overdueFollowUps.length > 0 && (
                  <div style={{
                    display: 'inline-flex',
                    backgroundColor: '#f1f5f9',
                    padding: '2px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <button
                      type="button"
                      onClick={() => setFollowUpTab('TODAY')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: followUpTab === 'TODAY' ? '#ffffff' : 'transparent',
                        color: followUpTab === 'TODAY' ? '#dc2626' : '#64748b',
                        boxShadow: followUpTab === 'TODAY' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      Today ({validTodayFollowUps.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFollowUpTab('OVERDUE')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: followUpTab === 'OVERDUE' ? '#ffffff' : 'transparent',
                        color: followUpTab === 'OVERDUE' ? '#d97706' : '#64748b',
                        boxShadow: followUpTab === 'OVERDUE' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      Overdue ({overdueFollowUps.length})
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '2px 2px', maxHeight: '340px', overflowY: 'auto' }}>
              {displayedFollowUps.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {displayedFollowUps.map((call: any) => (
                    <FollowUpCard key={call.id} call={call} />
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '28px 10px', color: '#64748b' }}>
                  <CheckCircle2 size={28} style={{ color: '#10b981', margin: '0 auto 6px auto' }} />
                  <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                    {followUpTab === 'TODAY' ? "No pending follow-ups today!" : "No overdue follow-ups!"}
                  </p>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.72rem' }}>
                    {followUpTab === 'TODAY' ? "You're all caught up. Schedule new leads or log fresh calls." : "Great job keeping up with your calls!"}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 4px 2px 4px', borderTop: '1px solid #f1f5f9', marginTop: '8px' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              {validTodayFollowUps.length} call{validTodayFollowUps.length === 1 ? '' : 's'} scheduled today
            </span>
            <Link href="/calls" style={{ fontSize: '0.74rem', fontWeight: 700, color: '#ef4444', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              Open Call Center →
            </Link>
          </div>
        </div>

        {/* RIGHT: TEAM SALES LEADERBOARD (DAILY & MONTHLY) */}
        <div className="zoho-card" style={{
          borderLeft: '3px solid #8b5cf6',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '260px'
        }}>
          <div>
            {/* Header with Title, Live Badge, and Timeframe Tabs */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '10px',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '10px',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div className="zoho-title-group">
                <div className="zoho-title-icon" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed', width: '32px', height: '32px', borderRadius: '8px' }}>
                  <Trophy size={16} />
                </div>
                <div>
                  <h2 className="zoho-title" style={{ fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
          <div className="sprint-health-banner" style={{ 
            background: sprintData.healthStatus === 'EXCELLENT' 
              ? 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)' 
              : sprintData.healthStatus === 'ON_TRACK'
              ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)'
              : 'linear-gradient(135deg, #450a0a 0%, #991b1b 50%, #dc2626 100%)',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '16px 18px',
            boxShadow: '0 8px 24px -4px rgba(0,0,0,0.14), 0 2px 6px -1px rgba(0,0,0,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
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

            {/* Top Row: Icon + Sprint Badges */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.22)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {sprintData.healthStatus === 'EXCELLENT' ? <Rocket size={18} color="#ffffff" /> : sprintData.healthStatus === 'ON_TRACK' ? <Zap size={18} color="#ffffff" /> : <AlertCircle size={18} color="#ffffff" />}
                </div>
                <span style={{ 
                  fontSize: '0.72rem', 
                  fontWeight: 700, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.4px', 
                  backgroundColor: 'rgba(255,255,255,0.18)', 
                  border: '1px solid rgba(255,255,255,0.22)', 
                  padding: '3px 10px', 
                  borderRadius: '20px' 
                }}>
                  Sprint {sprintData.weekNumber} of 4 ({sprintData.weekStartStr} - {sprintData.weekEndStr})
                </span>
                {sprintData.streakDays > 0 && (
                  <span style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    backgroundColor: 'rgba(254, 240, 138, 0.95)', 
                    color: '#854d0e', 
                    padding: '3px 10px', 
                    borderRadius: '20px', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px' 
                  }}>
                    <Flame size={12} color="#d97706" /> {sprintData.streakDays}-Day Streak
                  </span>
                )}
              </div>
            </div>

            {/* Health Message (Aligned cleanly across full width) */}
            <div style={{ 
              fontSize: '0.98rem', 
              fontWeight: 700, 
              lineHeight: 1.4, 
              letterSpacing: '-0.01em', 
              color: '#ffffff',
              zIndex: 1,
              padding: '2px 0'
            }}>
              {sprintData.healthMessage}
            </div>

            {/* Bottom 2-Column Metrics Box (Responsive & Aligned) */}
            <div className="sprint-metrics-box" style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '10px', 
              backgroundColor: 'rgba(0, 0, 0, 0.18)', 
              border: '1px solid rgba(255, 255, 255, 0.12)', 
              borderRadius: '12px', 
              padding: '10px 14px',
              zIndex: 1 
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ fontSize: '0.68rem', opacity: 0.82, fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                  Sprint Velocity Score
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {sprintData.sprintHealthScore}<span style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 500 }}>/100</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '1px solid rgba(255, 255, 255, 0.15)', paddingLeft: '12px' }}>
                <div style={{ fontSize: '0.68rem', opacity: 0.82, fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                  Days Left in Sprint
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {sprintData.daysRemainingInSprint} {sprintData.daysRemainingInSprint === 1 ? 'Day' : 'Days'}
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
          <div className="cockpit-container">
            <div className="cockpit-header">
              <div>
                <div className="cockpit-title-row">
                  <div className="target-badge-icon" style={{ backgroundColor: '#fef3c7' }}>
                    <Zap size={13} color="#d97706" />
                  </div>
                  <h3 className="cockpit-title">
                    Today's Action Targets
                  </h3>
                </div>
                <p className="cockpit-subtitle">
                  Consistent daily actions directly drive weekly sprint conversions.
                </p>
              </div>
              <Link href="/quotations/new" className="create-quote-pill-btn">
                <Plus size={13} />
                <span className="perf-label-mobile">Quote</span>
                <span className="perf-label-desktop">Create Quote</span>
              </Link>
            </div>

            {/* 4 ALIGNED DAILY TARGET CARDS */}
            <div className="action-targets-grid">
              
              {/* TARGET 1: CALLS */}
              {(() => {
                const callsPercent = sprintData.todayCallsTarget > 0 
                  ? Math.min(100, Math.round((currentTodayCalls / sprintData.todayCallsTarget) * 100)) 
                  : 0;
                const callsMet = currentTodayCalls >= sprintData.todayCallsTarget;

                return (
                  <div className={`action-target-card ${callsMet ? 'goal-met' : ''}`}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div className="target-badge-icon" style={{ backgroundColor: '#eff6ff' }}>
                            <PhoneCall size={11} color="#2563eb" />
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Calls
                          </span>
                        </div>
                        <span style={{ 
                          fontSize: '9.5px', 
                          fontWeight: 600, 
                          padding: '1px 5px', 
                          borderRadius: '4px', 
                          backgroundColor: callsMet ? '#ecfdf5' : '#f1f5f9', 
                          color: callsMet ? '#059669' : '#64748b' 
                        }}>
                          Goal: {sprintData.todayCallsTarget}
                        </span>
                      </div>

                      <div style={{ fontSize: '1.22rem', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
                        {currentTodayCalls} <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>/ {sprintData.todayCallsTarget}</span>
                      </div>

                      <div style={{ width: '100%', height: '3.5px', backgroundColor: '#f1f5f9', borderRadius: '2px', overflow: 'hidden', margin: '4px 0 6px 0' }}>
                        <div style={{ 
                          width: `${Math.max(3, callsPercent)}%`, 
                          height: '100%', 
                          background: callsMet ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #3b82f6, #2563eb)', 
                          borderRadius: '2px', 
                          transition: 'width 0.3s ease' 
                        }} />
                      </div>
                    </div>

                    <div className="target-card-btn-slot" style={{ gap: '5px' }}>
                      <button
                        type="button"
                        onClick={() => handleAdjustCalls(-1)}
                        disabled={currentTodayCalls === 0 || isSavingActivity}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: currentTodayCalls === 0 ? 'not-allowed' : 'pointer',
                          padding: 0,
                          flexShrink: 0,
                          opacity: currentTodayCalls === 0 ? 0.4 : 1
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
                          flex: 1,
                          height: '26px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '0 4px',
                          boxShadow: '0 1px 2px rgba(37, 99, 235, 0.25)',
                          transition: 'background-color 0.15s ease'
                        }}
                        title="Log 1 more call"
                      >
                        <Plus size={11} /> Call
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* TARGET 2: FOLLOW-UPS DONE */}
              {(() => {
                const followUpsPercent = sprintData.todayFollowUpsTarget > 0 
                  ? Math.min(100, Math.round((sprintData.todayFollowUps / sprintData.todayFollowUpsTarget) * 100)) 
                  : 0;
                const followUpsMet = sprintData.todayFollowUps >= sprintData.todayFollowUpsTarget;

                return (
                  <div 
                    onClick={() => setActiveModal("FOLLOWUPS")}
                    className={`action-target-card ${followUpsMet ? 'goal-met' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div className="target-badge-icon" style={{ backgroundColor: '#fef3c7' }}>
                            <Clock size={11} color="#d97706" />
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Follow-ups
                          </span>
                        </div>
                        <span style={{ 
                          fontSize: '9.5px', 
                          fontWeight: 600, 
                          padding: '1px 5px', 
                          borderRadius: '4px', 
                          backgroundColor: followUpsMet ? '#ecfdf5' : '#f1f5f9', 
                          color: followUpsMet ? '#059669' : '#64748b' 
                        }}>
                          Goal: {sprintData.todayFollowUpsTarget}
                        </span>
                      </div>

                      <div style={{ fontSize: '1.22rem', fontWeight: 700, color: '#d97706', margin: '4px 0 2px 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
                        {sprintData.todayFollowUps} <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>/ {sprintData.todayFollowUpsTarget}</span>
                      </div>

                      <div style={{ width: '100%', height: '3.5px', backgroundColor: '#f1f5f9', borderRadius: '2px', overflow: 'hidden', margin: '4px 0 6px 0' }}>
                        <div style={{ 
                          width: `${Math.max(3, followUpsPercent)}%`, 
                          height: '100%', 
                          background: followUpsMet ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #f59e0b, #d97706)', 
                          borderRadius: '2px', 
                          transition: 'width 0.3s ease' 
                        }} />
                      </div>
                    </div>

                    <div className="target-card-btn-slot">
                      <div style={{
                        width: '100%',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        fontSize: '11px',
                        fontWeight: 600,
                        transition: 'all 0.15s ease'
                      }}>
                        <span>View List</span>
                        <ArrowRight size={11} />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TARGET 3: QUOTES SENT */}
              {(() => {
                const quotesPercent = sprintData.todayQuotesSentTarget > 0 
                  ? Math.min(100, Math.round((sprintData.todayQuotesSent / sprintData.todayQuotesSentTarget) * 100)) 
                  : 0;
                const quotesMet = sprintData.todayQuotesSent >= sprintData.todayQuotesSentTarget;

                return (
                  <div className={`action-target-card ${quotesMet ? 'goal-met' : ''}`}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div className="target-badge-icon" style={{ backgroundColor: '#f3e8ff' }}>
                            <FileText size={11} color="#7c3aed" />
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Quotes
                          </span>
                        </div>
                        <span style={{ 
                          fontSize: '9.5px', 
                          fontWeight: 600, 
                          padding: '1px 5px', 
                          borderRadius: '4px', 
                          backgroundColor: quotesMet ? '#ecfdf5' : '#f1f5f9', 
                          color: quotesMet ? '#059669' : '#64748b' 
                        }}>
                          Goal: {sprintData.todayQuotesSentTarget}
                        </span>
                      </div>

                      <div style={{ fontSize: '1.22rem', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
                        {sprintData.todayQuotesSent} <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>/ {sprintData.todayQuotesSentTarget}</span>
                      </div>

                      <div style={{ width: '100%', height: '3.5px', backgroundColor: '#f1f5f9', borderRadius: '2px', overflow: 'hidden', margin: '4px 0 6px 0' }}>
                        <div style={{ 
                          width: `${Math.max(3, quotesPercent)}%`, 
                          height: '100%', 
                          background: quotesMet ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #8b5cf6, #7c3aed)', 
                          borderRadius: '2px', 
                          transition: 'width 0.3s ease' 
                        }} />
                      </div>
                    </div>

                    <div className="target-card-btn-slot">
                      <Link href="/quotations" style={{
                        width: '100%',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: '#f5f3ff',
                        border: '1px solid #ddd6fe',
                        color: '#7c3aed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'all 0.15s ease'
                      }}>
                        <span>Pipeline</span>
                        <ArrowRight size={11} />
                      </Link>
                    </div>
                  </div>
                );
              })()}

              {/* TARGET 4: DEALS CONFIRMED */}
              {(() => {
                const dealsPercent = sprintData.todayQuotesConfirmedTarget > 0 
                  ? Math.min(100, Math.round((sprintData.todayQuotesConfirmed / sprintData.todayQuotesConfirmedTarget) * 100)) 
                  : 0;
                const dealsMet = sprintData.todayQuotesConfirmed >= sprintData.todayQuotesConfirmedTarget;

                return (
                  <div className={`action-target-card ${dealsMet ? 'goal-met' : ''}`}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div className="target-badge-icon" style={{ backgroundColor: '#ecfdf5' }}>
                            <Award size={11} color="#059669" />
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Deals
                          </span>
                        </div>
                        <span style={{ 
                          fontSize: '9.5px', 
                          fontWeight: 600, 
                          padding: '1px 5px', 
                          borderRadius: '4px', 
                          backgroundColor: dealsMet ? '#ecfdf5' : '#f1f5f9', 
                          color: dealsMet ? '#059669' : '#64748b' 
                        }}>
                          Goal: {sprintData.todayQuotesConfirmedTarget}
                        </span>
                      </div>

                      <div style={{ fontSize: '1.22rem', fontWeight: 700, color: '#059669', margin: '4px 0 2px 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
                        {sprintData.todayQuotesConfirmed} <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>/ {sprintData.todayQuotesConfirmedTarget}</span>
                      </div>

                      <div style={{ width: '100%', height: '3.5px', backgroundColor: '#f1f5f9', borderRadius: '2px', overflow: 'hidden', margin: '4px 0 6px 0' }}>
                        <div style={{ 
                          width: `${Math.max(3, dealsPercent)}%`, 
                          height: '100%', 
                          background: 'linear-gradient(90deg, #10b981, #059669)', 
                          borderRadius: '2px', 
                          transition: 'width 0.3s ease' 
                        }} />
                      </div>
                    </div>

                    <div className="target-card-btn-slot">
                      <div style={{
                        width: '100%',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: sprintData.todayQuotesConfirmed > 0 ? '#ecfdf5' : '#f8fafc',
                        border: sprintData.todayQuotesConfirmed > 0 ? '1px solid #86efac' : '1px solid #e2e8f0',
                        color: sprintData.todayQuotesConfirmed > 0 ? '#15803d' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        fontSize: '11px',
                        fontWeight: 600
                      }}>
                        {sprintData.todayQuotesConfirmed > 0 ? (
                          <>
                            <CheckCircle2 size={11} color="#16a34a" />
                            <span>Sale Secured!</span>
                          </>
                        ) : (
                          <span>Awaiting close</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>

        </div>
      )}

      {/* ─── PERFORMANCE FILTER TABS ─── */}
      <div style={{ marginBottom: '20px' }}>
        <div className="performance-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              My Performance
            </span>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>({periodLabel})</span>
          </div>

          {/* Time Filter Pills - Segmented Control */}
          <div className="performance-segmented-control">
            {[
              { key: "TODAY", short: "Today", full: "Daily (Today)" },
              { key: "WEEKLY", short: "Week", full: "This Week" },
              { key: "MONTHLY", short: "Month", full: "This Month" },
              { key: "ALL", short: "All", full: "All Time" }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTimeFilter(tab.key as TimeFilterType)}
                className={`perf-segment-btn ${timeFilter === tab.key ? 'active' : ''}`}
              >
                <span className="perf-label-mobile">{tab.short}</span>
                <span className="perf-label-desktop">{tab.full}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── 4 INTERACTIVE CLICKABLE KPI BLOCKS ─── */}
        <div className="kpi-cards-grid">
          
          {/* BLOCK 1: Sales Metric (Clickable) */}
          <div 
            onClick={() => setActiveModal("SALES")}
            className="kpi-metric-card"
            title="Click to view sales breakdown"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.2 }}>
                {periodLabel} Sales
              </span>
              <div className="kpi-corner-btn">
                <ArrowUpRight size={12} />
              </div>
            </div>

            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px 0', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              ₹{(totalSales / 1000).toFixed(1)}k
            </div>

            <div className="kpi-footer-slot" style={{ justifyContent: 'space-between' }}>
              {totalSales === 0 ? (
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>
                  0 orders
                </span>
              ) : (
                <span style={{ fontSize: '0.7rem', color: growthIsPositive ? '#059669' : '#dc2626', backgroundColor: growthIsPositive ? '#ecfdf5' : '#fef2f2', padding: '1px 6px', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  {growthIsPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {growthIsPositive ? `+${growthPercent}%` : `${growthPercent}%`}
                </span>
              )}
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                {filteredOrders.length} sale{filteredOrders.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* BLOCK 2: Follow-ups Due (Clickable) */}
          <div 
            onClick={() => setActiveModal("FOLLOWUPS")}
            className="kpi-metric-card"
            title="Click to view follow-ups"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.2 }}>
                Follow-ups Due
              </span>
              <div className="kpi-corner-btn">
                <ArrowUpRight size={12} />
              </div>
            </div>

            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#d97706', margin: '4px 0 2px 0', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {filteredFollowUps.length}
            </div>

            <div className="kpi-footer-slot">
              <span style={{ fontSize: '0.7rem', color: filteredFollowUps.length > 0 ? '#b45309' : '#059669', backgroundColor: filteredFollowUps.length > 0 ? '#fef3c7' : '#ecfdf5', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                {filteredFollowUps.length > 0 ? `${filteredFollowUps.length} Pending` : 'All Cleared ✓'}
              </span>
            </div>
          </div>

          {/* BLOCK 3: Target Progress (Clickable) */}
          <div 
            onClick={() => setActiveModal("TARGET")}
            className="kpi-metric-card"
            title="Click to view target progress details"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.2 }}>
                Target Progress
              </span>
              <div className="kpi-corner-btn">
                <ArrowUpRight size={12} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#4f46e5', margin: '4px 0 2px 0', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                {targetPercent}%
              </div>
              <div style={{ width: '100%', height: '3px', backgroundColor: '#e0e7ff', borderRadius: '2px', overflow: 'hidden', margin: '3px 0 2px 0' }}>
                <div style={{ width: `${Math.min(100, targetPercent)}%`, height: '100%', backgroundColor: '#4f46e5', borderRadius: '2px', transition: 'width 0.3s ease' }} />
              </div>
            </div>

            <div className="kpi-footer-slot">
              <span style={{ fontSize: '0.7rem', color: '#4338ca', backgroundColor: '#eef2ff', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                Goal: ₹{(targetPeriodGoal / 100000).toFixed(1)}L
              </span>
            </div>
          </div>

          {/* BLOCK 4: Est. Total Payout (Clickable) */}
          <div 
            onClick={() => setActiveModal("PAYOUT")}
            className="kpi-metric-card"
            title="Click to view earnings and slab breakdown"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.2 }}>
                Est. Total Payout
              </span>
              <div className="kpi-corner-btn">
                <ArrowUpRight size={12} />
              </div>
            </div>

            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#059669', margin: '4px 0 2px 0', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              ₹{(totalPayout / 1000).toFixed(1)}k
            </div>

            <div className="kpi-footer-slot">
              <span 
                style={{ 
                  fontSize: '0.7rem', 
                  color: '#047857', 
                  backgroundColor: '#ecfdf5', 
                  padding: '1px 6px', 
                  borderRadius: '4px', 
                  fontWeight: 600, 
                  maxWidth: '100%', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  display: 'inline-block'
                }}
                title={`Slab: ${calculatedIncentive.currentSlab}`}
              >
                Slab: {calculatedIncentive.currentSlab}
              </span>
            </div>
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

      {/* Mobile Bottom Clearance for Navigation Bar & Floating Heart */}
      <div style={{ height: '76px', width: '100%', flexShrink: 0 }} />

    </div>
  );
}


