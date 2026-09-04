import React from 'react';
import { prisma } from '@/lib/prisma';
import SalesTrendChart from '@/components/dashboard/SalesTrendChart';
import CustomerGrowthChart from '@/components/dashboard/CustomerGrowthChart';
import RepPerformanceChart from '@/components/dashboard/RepPerformanceChart';
import TopProductsChart from '@/components/dashboard/TopProductsChart';
import AnalyticsFilters from '@/components/dashboard/AnalyticsFilters';
import EditGoalModal from '@/components/dashboard/EditGoalModal';
import { 
  TrendingUp, 
  Users, 
  Target, 
  Zap, 
  Trophy, 
  Crown, 
  MapPin, 
  ShoppingCart, 
  Repeat, 
  Percent, 
  IndianRupee, 
  Star, 
  ShieldCheck, 
  Box,
  Download,
  Sparkles,
  ArrowUpRight,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantOrgId } from '@/lib/tenant';
import './analytics.css';

type SearchParams = Promise<{ [key: string]: string | undefined }>;

export default async function AnalyticsPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const activeTab = searchParams?.tab || 'executive';
  const selectedAgentId = searchParams?.agent || 'all';
  const selectedState = searchParams?.state || 'all';

  // ─── CHECK PERMISSIONS ───
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  let canView = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  
  if (!canView && session?.user) {
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      include: { roleDef: true }
    });
    if (user?.roleDef?.permissions) {
      try {
        const perms = JSON.parse(user.roleDef.permissions);
        if (perms.includes("View Analytics")) canView = true;
      } catch (e) {}
    }
  }

  if (!canView) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ 
          width: '56px', 
          height: '56px', 
          borderRadius: '12px', 
          background: '#fee2e2', 
          color: '#ef4444', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 16px auto' 
        }}>
          <ShieldCheck size={28} />
        </div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Unauthorized Access</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>You do not have permission to view Analytics.</p>
      </div>
    );
  }

  const orgId = await getTenantOrgId();

  // ─── FETCH MONTHLY TARGET ───
  const settings = await prisma.companySettings.findFirst({ where: { organizationId: orgId } });
  const MONTHLY_GOAL = settings?.monthlyTarget || 2000000;

  // ─── FETCH FILTERS ───
  const agents = await prisma.user.findMany({
    where: { organizationId: orgId, role: { in: ['Sales', 'SALES'] } },
    select: { id: true, name: true }
  });

  // Get distinct states from customers
  const distinctStatesResult = await prisma.customer.findMany({
    select: { state: true },
    distinct: ['state'],
    where: { organizationId: orgId, state: { not: null } }
  });
  const states = distinctStatesResult.map(s => s.state).filter(Boolean);

  // Build Prisma Where clauses based on filters
  const customerWhere: any = { organizationId: orgId };
  if (selectedState !== 'all') customerWhere.state = selectedState;
  if (selectedAgentId !== 'all') {
    customerWhere.assignedSalesperson = { userId: selectedAgentId };
  }

  const orderWhere: any = { organizationId: orgId, orderStatus: { not: 'Cancelled' } };
  if (selectedState !== 'all') orderWhere.customer = { state: selectedState };
  if (selectedAgentId !== 'all') orderWhere.salesperson = { userId: selectedAgentId };

  // ─── BASE METRICS FETCHING ───
  const totalCustomers = await prisma.customer.count({ where: customerWhere });
  const allCustomers = await prisma.customer.findMany({
    where: customerWhere,
    select: { 
      id: true, 
      totalOrders: true, 
      totalPurchaseValue: true,
      status: true,
      preferredPaymentMethod: true,
      orders: { select: { discount: true } }
    }
  });

  let maturedCustomers = 0;
  let repeatBuyers = 0;
  let count0Percent = 0;
  let count1to15Percent = 0;
  let count15PlusPercent = 0;
  let countCredit = 0;

  for (const c of allCustomers) {
    if (c.totalOrders > 0 || c.orders.length > 0) {
      maturedCustomers++;
      if (c.totalOrders > 1 || c.orders.length > 1) repeatBuyers++;

      const isCredit = c.status?.toLowerCase() === 'credit' || c.preferredPaymentMethod?.toLowerCase() === 'credit';
      if (isCredit) {
        countCredit++;
      } else {
        const validOrders = c.orders.filter(o => o.discount !== undefined && o.discount !== null);
        const avgDiscount = validOrders.length > 0 ? validOrders.reduce((sum, o) => sum + Number(o.discount || 0), 0) / validOrders.length : 0;
        
        if (avgDiscount === 0) count0Percent++;
        else if (avgDiscount > 0 && avgDiscount <= 15) count1to15Percent++;
        else count15PlusPercent++;
      }
    }
  }

  const retentionRate = maturedCustomers > 0 ? ((repeatBuyers / maturedCustomers) * 100).toFixed(0) : 0;

  // ─── AGGREGATE ORDERS ───
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  const startDate = new Date(currentYear, currentMonth, 1);
  const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
  
  const daysInMonth = endDate.getDate();
  const currentDay = new Date().getDate();
  const daysLeft = daysInMonth - currentDay;

  const allOrders = await prisma.order.findMany({
    select: { totalValue: true, orderDate: true, paymentStatus: true, customer: { select: { state: true } } },
    where: orderWhere
  });

  const totalRevenue = allOrders.reduce((sum, o) => sum + o.totalValue, 0);
  const totalOrdersCount = allOrders.length;
  const aov = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
  const customerLTV = maturedCustomers > 0 ? totalRevenue / maturedCustomers : 0;

  // ─── MONTHLY TARGET CALCULATIONS ───
  const currentMonthOrders = allOrders.filter(o => o.orderDate >= startDate && o.orderDate <= endDate);
  const currentMonthRevenue = currentMonthOrders.reduce((sum, o) => sum + o.totalValue, 0);
  
  const remainingTarget = Math.max(0, MONTHLY_GOAL - currentMonthRevenue);
  const runRateRequired = daysLeft > 0 ? remainingTarget / daysLeft : 0;
  const currentRunRate = currentDay > 0 ? currentMonthRevenue / currentDay : 0;
  const expectedClosing = currentMonthRevenue + (currentRunRate * daysLeft);
  const nextMonthForecast = expectedClosing * 1.14; // +14% MoM
  
  const progressPercent = Math.min(100, (currentMonthRevenue / MONTHLY_GOAL) * 100);

  // ─── TOP PRODUCTS & CATEGORIES ───
  const allOrderItems = await prisma.orderItem.findMany({
    where: { order: orderWhere },
    include: { product: true }
  });

  const categoryRevenueMap: Record<string, number> = {};
  const productRevenueMap: Record<string, { name: string; revenue: number; qty: number }> = {};

  allOrderItems.forEach(item => {
    const cat = item.product.category || 'Uncategorized';
    categoryRevenueMap[cat] = (categoryRevenueMap[cat] || 0) + item.total;

    const prodId = item.productId;
    if (!productRevenueMap[prodId]) {
      productRevenueMap[prodId] = { name: item.product.name, revenue: 0, qty: 0 };
    }
    productRevenueMap[prodId].revenue += item.total;
    productRevenueMap[prodId].qty += item.quantity;
  });

  const categoryData = Object.entries(categoryRevenueMap)
    .map(([category, revenue]) => ({ category, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  const topProductsData = Object.values(productRevenueMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  // ─── VIP CUSTOMERS ───
  const vipCustomersRaw = await prisma.customer.findMany({
    where: customerWhere,
    include: { 
      assignedSalesperson: { include: { user: true } },
      orders: { select: { totalValue: true } }
    }
  });

  const vipCustomers = vipCustomersRaw
    .map(c => ({
      ...c,
      calculatedTotalPurchase: c.orders.reduce((sum, o) => sum + o.totalValue, 0)
    }))
    .filter(c => c.calculatedTotalPurchase > 0)
    .sort((a, b) => b.calculatedTotalPurchase - a.calculatedTotalPurchase)
    .slice(0, 10);

  // ─── TEAM DATA ───
  const employees = await prisma.employee.findMany({
    where: { organizationId: orgId },
    include: {
      user: true,
      orders: {
        where: selectedState !== 'all' ? { customer: { state: selectedState } } : undefined
      },
      calls: true,
      incentives: true,
    }
  });

  let filteredEmployees = employees;
  if (selectedAgentId !== 'all') {
    filteredEmployees = employees.filter(emp => emp.userId === selectedAgentId);
  }

  const repPerformanceData = filteredEmployees.map(emp => ({
    name: emp.user?.name || 'Unknown',
    sales: emp.orders.reduce((sum, order) => sum + order.totalValue, 0),
    calls: emp.calls.length,
    incentives: emp.incentives.reduce((sum, inc) => sum + inc.incentiveEarned, 0),
    target: emp.target || 0
  })).sort((a, b) => b.sales - a.sales);

  const salesTrendData = [];
  const customerGrowthData = [];
  
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
  tenDaysAgo.setHours(0, 0, 0, 0);

  const recentCustomers = await prisma.customer.findMany({
    where: { ...customerWhere, createdAt: { gte: tenDaysAgo } },
    select: { createdAt: true, totalOrders: true }
  });

  for (let i = 9; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const dateStr = dayStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    const dayOrders = allOrders.filter(o => {
      if (!o.orderDate) return false;
      const od = new Date(o.orderDate);
      return od >= dayStart && od <= dayEnd;
    });

    const dayRevenue = dayOrders.reduce((sum, o) => sum + (Number(o.totalValue) || 0), 0);
    const dayOrderCount = dayOrders.length;

    salesTrendData.push({
      date: dateStr,
      revenue: Math.round(dayRevenue),
      orders: dayOrderCount
    });

    const dayNewCustomers = recentCustomers.filter(c => {
      if (!c.createdAt) return false;
      const cd = new Date(c.createdAt);
      return cd >= dayStart && cd <= dayEnd;
    });

    const dayMatured = dayNewCustomers.filter(c => (c.totalOrders || 0) > 0).length;

    customerGrowthData.push({
      date: dateStr,
      newCustomers: dayNewCustomers.length,
      matured: dayMatured
    });
  }

  // ─── REGIONAL & PAYMENTS DATA ───
  const regionalMap: Record<string, { revenue: number; orderCount: number }> = {};
  const paymentStatusMap: Record<string, number> = {};

  allOrders.forEach(o => {
    // Regional
    const st = o.customer?.state || 'Unknown';
    if (!regionalMap[st]) regionalMap[st] = { revenue: 0, orderCount: 0 };
    regionalMap[st].revenue += o.totalValue;
    regionalMap[st].orderCount++;

    // Payments
    const status = o.paymentStatus || 'Unknown';
    paymentStatusMap[status] = (paymentStatusMap[status] || 0) + o.totalValue;
  });

  const regionalData = Object.keys(regionalMap).map(st => ({
    state: st,
    revenue: regionalMap[st].revenue,
    orders: regionalMap[st].orderCount
  })).sort((a, b) => b.revenue - a.revenue);

  const paymentData = Object.keys(paymentStatusMap).map(status => ({
    status,
    value: paymentStatusMap[status]
  })).sort((a, b) => b.value - a.value);

  // Formatting helpers
  const formatINR = (val: number) => `₹${Math.round(val).toLocaleString('en-IN')}`;

  const searchParamsQuery = new URLSearchParams();
  if (selectedAgentId !== 'all') searchParamsQuery.set('agent', selectedAgentId);
  if (selectedState !== 'all') searchParamsQuery.set('state', selectedState);
  const currentQueryStr = searchParamsQuery.toString();

  return (
    <div className="analytics-container">
      
      {/* ─── HEADER ─── */}
      <div className="analytics-header">
        <div className="analytics-title-group">
          <div className="analytics-title-icon-badge">
            <TrendingUp size={22} />
          </div>
          <div>
            <h1 className="analytics-title">
              Analytics & Reports
            </h1>
            <p className="analytics-subtitle">Graphical insights across all timeframes, states & agents</p>
          </div>
        </div>
        <Link href="/reports" className="analytics-btn-pdf">
          <Crown size={16} /> Master Report (PDF)
        </Link>
      </div>

      {/* ─── FILTERS (Client Component) ─── */}
      <AnalyticsFilters 
        activeTab={activeTab}
        selectedAgentId={selectedAgentId}
        selectedState={selectedState}
        agents={agents}
        states={states as string[]}
      />

      {/* ─── INTERACTIVE TABS (Segmented Control Bar) ─── */}
      <div className="analytics-tabs-wrapper">
        <Link 
          href={`?tab=executive${currentQueryStr ? '&' + currentQueryStr : ''}`} 
          className={`analytics-tab-item ${activeTab === 'executive' ? 'active' : ''}`}
        >
          <TrendingUp size={15} /> Executive Overview
        </Link>
        <Link 
          href={`?tab=vips${currentQueryStr ? '&' + currentQueryStr : ''}`} 
          className={`analytics-tab-item ${activeTab === 'vips' ? 'active' : ''}`}
        >
          <Crown size={15} /> VIPs & Retention
        </Link>
        <Link 
          href={`?tab=team${currentQueryStr ? '&' + currentQueryStr : ''}`} 
          className={`analytics-tab-item ${activeTab === 'team' ? 'active' : ''}`}
        >
          <Trophy size={15} /> Team & Incentives
        </Link>
        <Link 
          href={`?tab=regional${currentQueryStr ? '&' + currentQueryStr : ''}`} 
          className={`analytics-tab-item ${activeTab === 'regional' ? 'active' : ''}`}
        >
          <MapPin size={15} /> Regional & Payments
        </Link>
      </div>

      {/* ─── TAB CONTENT: EXECUTIVE OVERVIEW ─── */}
      {activeTab === 'executive' && (
        <>
          {/* Target & Forecast Cards */}
          <div className="analytics-target-forecast-grid">
            
            {/* Monthly Target Card */}
            <div className="analytics-feature-card">
              <div>
                <div className="analytics-card-header">
                  <div className="analytics-card-title-group">
                    <div className="analytics-card-icon-badge target">
                      <Target size={20} />
                    </div>
                    <div>
                      <h2 className="analytics-card-title">Monthly Target</h2>
                      <div className="analytics-card-subtitle">Goal: {formatINR(MONTHLY_GOAL)}</div>
                    </div>
                  </div>
                  <EditGoalModal currentTarget={MONTHLY_GOAL} />
                </div>
                
                {/* Progress Bar */}
                <div className="analytics-progress-wrapper">
                  <div className="analytics-progress-labels">
                    <span style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.78rem', fontWeight: 500 }}>Target Achieved</span>
                    <span style={{ color: 'var(--text-primary, #1e293b)', fontWeight: 600 }}>{progressPercent.toFixed(1)}%</span>
                  </div>
                  <div className="analytics-progress-track">
                    <div 
                      className="analytics-progress-fill" 
                      style={{ width: `${progressPercent}%` }} 
                    />
                  </div>
                </div>
              </div>

              <div className="analytics-stats-chips-grid">
                <div className="analytics-stat-chip">
                  <div className="analytics-stat-chip-label">Current Revenue</div>
                  <div className="analytics-stat-chip-value">{formatINR(currentMonthRevenue)}</div>
                </div>
                <div className="analytics-stat-chip">
                  <div className="analytics-stat-chip-label">Remaining</div>
                  <div className="analytics-stat-chip-value danger">{formatINR(remainingTarget)}</div>
                </div>
                <div className="analytics-stat-chip">
                  <div className="analytics-stat-chip-label">Req. Run-Rate</div>
                  <div className="analytics-stat-chip-value info">{formatINR(runRateRequired)}/d</div>
                </div>
              </div>
            </div>

            {/* AI Forecast Engine Card */}
            <div className="analytics-feature-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%)', borderColor: '#ccfbf1' }}>
              <div>
                <div className="analytics-card-header">
                  <div className="analytics-card-title-group">
                    <div className="analytics-card-icon-badge forecast">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 className="analytics-card-title">AI Forecast Engine</h2>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: 600, 
                          backgroundColor: '#ccfbf1', 
                          color: '#0f766e', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          letterSpacing: '0.02em'
                        }}>
                          PREDICTION
                        </span>
                      </div>
                      <div className="analytics-card-subtitle">Projection based on current run-rate</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="analytics-forecast-rows">
                <div className="analytics-forecast-row" style={{ backgroundColor: '#ffffff' }}>
                  <span className="analytics-forecast-label">Expected Closing (This Month)</span>
                  <span className="analytics-forecast-val" style={{ color: 'var(--accent-primary, #00a884)' }}>
                    {formatINR(expectedClosing)}
                  </span>
                </div>
                <div className="analytics-forecast-row" style={{ backgroundColor: '#ffffff' }}>
                  <span className="analytics-forecast-label">Next-Month Forecast</span>
                  <div className="analytics-forecast-val-group">
                    <span className="analytics-badge-mom">
                      <ArrowUpRight size={11} /> +14% MoM
                    </span>
                    <span className="analytics-forecast-val">
                      {formatINR(nextMonthForecast)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* 8 KPI METRICS GRID */}
          <div className="analytics-kpi-grid">
            <Link href="/orders" className="analytics-kpi-card">
              <div className="analytics-kpi-header">
                <div className="analytics-kpi-label">Total Revenue</div>
                <div className="analytics-kpi-icon-box" style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }}>
                  <IndianRupee size={16} />
                </div>
              </div>
              <div className="analytics-kpi-value">{formatINR(totalRevenue)}</div>
              <div className="analytics-kpi-footer">
                <span>View all orders</span> <ArrowRight size={11} />
              </div>
            </Link>

            <Link href="/orders" className="analytics-kpi-card">
              <div className="analytics-kpi-header">
                <div className="analytics-kpi-label">Total Orders</div>
                <div className="analytics-kpi-icon-box" style={{ backgroundColor: '#ffe4e6', color: '#e11d48' }}>
                  <ShoppingCart size={16} />
                </div>
              </div>
              <div className="analytics-kpi-value">{totalOrdersCount}</div>
              <div className="analytics-kpi-footer">
                <span>View order ledger</span> <ArrowRight size={11} />
              </div>
            </Link>

            <Link href="/customers" className="analytics-kpi-card">
              <div className="analytics-kpi-header">
                <div className="analytics-kpi-label">Total Customers</div>
                <div className="analytics-kpi-icon-box" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                  <Users size={16} />
                </div>
              </div>
              <div className="analytics-kpi-value">{totalCustomers}</div>
              <div className="analytics-kpi-footer">
                <span>Customer directory</span> <ArrowRight size={11} />
              </div>
            </Link>

            <Link href="/customers" className="analytics-kpi-card">
              <div className="analytics-kpi-header">
                <div className="analytics-kpi-label">Matured Customers</div>
                <div className="analytics-kpi-icon-box" style={{ backgroundColor: '#d1fae5', color: '#059669' }}>
                  <ShieldCheck size={16} />
                </div>
              </div>
              <div className="analytics-kpi-value">{maturedCustomers}</div>
              <div className="analytics-kpi-footer">
                <span>Active buyers</span> <ArrowRight size={11} />
              </div>
            </Link>

            <Link href={`?tab=vips${currentQueryStr ? '&' + currentQueryStr : ''}`} className="analytics-kpi-card">
              <div className="analytics-kpi-header">
                <div className="analytics-kpi-label">Repeat Buyers</div>
                <div className="analytics-kpi-icon-box" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                  <Repeat size={16} />
                </div>
              </div>
              <div className="analytics-kpi-value">{repeatBuyers}</div>
              <div className="analytics-kpi-footer">
                <span>VIP leaderboard</span> <ArrowRight size={11} />
              </div>
            </Link>

            <Link href={`?tab=vips${currentQueryStr ? '&' + currentQueryStr : ''}`} className="analytics-kpi-card">
              <div className="analytics-kpi-header">
                <div className="analytics-kpi-label">Retention Rate</div>
                <div className="analytics-kpi-icon-box" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
                  <Percent size={16} />
                </div>
              </div>
              <div className="analytics-kpi-value">{retentionRate}%</div>
              <div className="analytics-kpi-footer">
                <span>Cohort analytics</span> <ArrowRight size={11} />
              </div>
            </Link>

            <Link href="/orders" className="analytics-kpi-card">
              <div className="analytics-kpi-header">
                <div className="analytics-kpi-label">Avg Order Value</div>
                <div className="analytics-kpi-icon-box" style={{ backgroundColor: '#ffedd5', color: '#ea580c' }}>
                  <IndianRupee size={16} />
                </div>
              </div>
              <div className="analytics-kpi-value">{formatINR(aov)}</div>
              <div className="analytics-kpi-footer">
                <span>Order statistics</span> <ArrowRight size={11} />
              </div>
            </Link>

            <Link href={`?tab=vips${currentQueryStr ? '&' + currentQueryStr : ''}`} className="analytics-kpi-card">
              <div className="analytics-kpi-header">
                <div className="analytics-kpi-label">Customer LTV</div>
                <div className="analytics-kpi-icon-box" style={{ backgroundColor: '#ccfbf1', color: '#0d9488' }}>
                  <Star size={16} />
                </div>
              </div>
              <div className="analytics-kpi-value">{formatINR(customerLTV)}</div>
              <div className="analytics-kpi-footer">
                <span>Lifetime value</span> <ArrowRight size={11} />
              </div>
            </Link>
          </div>

          {/* ─── MATURED CUSTOMER BREAKDOWN ─── */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#059669" /> Matured Customers Discount Breakdown
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div className="analytics-stat-chip" style={{ background: '#ffffff', border: '1px solid var(--border)', padding: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div className="analytics-stat-chip-label">0% Discount</div>
                <div className="analytics-stat-chip-value">{count0Percent}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Full price purchasers</div>
              </div>
              <div className="analytics-stat-chip" style={{ background: '#ffffff', border: '1px solid var(--border)', padding: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div className="analytics-stat-chip-label">1-15% Discount</div>
                <div className="analytics-stat-chip-value" style={{ color: '#0284c7' }}>{count1to15Percent}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Standard tier buyers</div>
              </div>
              <div className="analytics-stat-chip" style={{ background: '#ffffff', border: '1px solid var(--border)', padding: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div className="analytics-stat-chip-label">15%+ Discount</div>
                <div className="analytics-stat-chip-value" style={{ color: '#d97706' }}>{count15PlusPercent}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>High incentive buyers</div>
              </div>
              <div className="analytics-stat-chip" style={{ background: '#ffffff', border: '1px solid var(--border)', padding: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div className="analytics-stat-chip-label">Credit Customers</div>
                <div className="analytics-stat-chip-value" style={{ color: '#9333ea' }}>{countCredit}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Credit term accounts</div>
              </div>
            </div>
          </div>

          {/* ─── B2B REPORTS ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            
            {/* Category Revenue Card */}
            <div className="analytics-section-card">
              <div className="analytics-section-header">
                <h3 className="analytics-section-title">
                  <Box size={17} color="#06b6d4" /> Revenue by Category
                </h3>
              </div>
              {categoryData.length > 0 ? (
                <TopProductsChart data={categoryData} />
              ) : (
                <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No category data available.</div>
              )}
            </div>

            {/* Top Performing Products Card */}
            <div className="analytics-section-card">
              <div className="analytics-section-header">
                <h3 className="analytics-section-title">
                  <Star size={17} color="#f59e0b" /> Top Performing Products
                </h3>
              </div>
              <div className="analytics-table-wrapper">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th style={{ textAlign: 'center' }}>Qty Sold</th>
                      <th style={{ textAlign: 'right' }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProductsData.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No products found.</td>
                      </tr>
                    ) : (
                      topProductsData.map((prod, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{prod.name}</td>
                          <td style={{ color: '#2563eb', fontWeight: 600, textAlign: 'center' }}>{prod.qty}</td>
                          <td style={{ color: 'var(--accent-primary, #00a884)', fontWeight: 600, textAlign: 'right' }}>{formatINR(prod.revenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sales Trend Card */}
          <div className="analytics-section-card">
            <div className="analytics-section-header">
              <div>
                <h3 className="analytics-section-title">
                  <TrendingUp size={17} style={{ color: 'var(--accent-primary, #00a884)' }} /> Sales & Order Trend
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Daily revenue volume and order frequency over the last 10 days</p>
              </div>
              <Link 
                href="/reports" 
                style={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid var(--border)', 
                  color: 'var(--text-secondary)', 
                  padding: '5px 12px', 
                  borderRadius: 'var(--radius-sm, 6px)', 
                  fontSize: '0.8rem', 
                  fontWeight: 500, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  textDecoration: 'none', 
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Download size={13} /> Export Data
              </Link>
            </div>
            <SalesTrendChart data={salesTrendData} />
          </div>
        </>
      )}

      {/* ─── TAB CONTENT: VIPS & RETENTION ─── */}
      {activeTab === 'vips' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          
          <div className="analytics-section-card" style={{ flex: 2 }}>
            <div className="analytics-section-header">
              <div>
                <h3 className="analytics-section-title">
                  <Crown size={18} color="#f59e0b" /> Top 10 VIP Customers
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>High-value accounts contributing the largest portion of total revenue</p>
              </div>
            </div>
            <div className="analytics-table-wrapper">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>Rank</th>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Agent</th>
                    <th style={{ textAlign: 'center' }}>Orders</th>
                    <th style={{ textAlign: 'right' }}>Total Purchase</th>
                  </tr>
                </thead>
                <tbody>
                  {vipCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>No VIP customers found matching the filters.</td>
                    </tr>
                  ) : (
                    vipCustomers.map((vip, idx) => (
                      <tr key={vip.id}>
                        <td>
                          <span className={`analytics-rank-badge ${idx === 0 ? 'analytics-rank-1' : idx === 1 ? 'analytics-rank-2' : idx === 2 ? 'analytics-rank-3' : 'analytics-rank-other'}`}>
                            {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          <Link href={`/customers/${vip.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {vip.businessName} <ArrowUpRight size={12} color="#94a3b8" />
                          </Link>
                        </td>
                        <td style={{ color: '#2563eb', fontWeight: 500 }}>{vip.mobile}</td>
                        <td style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{vip.assignedSalesperson?.user?.name || 'Unassigned'}</td>
                        <td style={{ color: '#2563eb', fontWeight: 600, textAlign: 'center' }}>{vip.orders?.length || vip.totalOrders}</td>
                        <td style={{ color: 'var(--accent-primary, #00a884)', fontWeight: 600, textAlign: 'right' }}>{formatINR(vip.calculatedTotalPurchase)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="analytics-section-card" style={{ flex: 1, alignSelf: 'start' }}>
            <div className="analytics-section-header">
              <h3 className="analytics-section-title">
                <Users size={17} style={{ color: 'var(--accent-primary, #00a884)' }} /> Customer Acquisition Growth
              </h3>
            </div>
            <CustomerGrowthChart data={customerGrowthData} />
          </div>

        </div>
      )}

      {/* ─── TAB CONTENT: TEAM & INCENTIVES ─── */}
      {activeTab === 'team' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          <div className="analytics-section-card">
            <div className="analytics-section-header">
              <div>
                <h3 className="analytics-section-title">
                  <Trophy size={18} style={{ color: 'var(--accent-primary, #00a884)' }} /> Team Performance
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Comparing total revenue generated vs calls logged per salesperson.</p>
              </div>
            </div>
            {repPerformanceData.length > 0 ? (
              <RepPerformanceChart data={repPerformanceData} />
            ) : (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                No employee data available for the selected filters.
              </div>
            )}
          </div>

          <div className="analytics-section-card">
            <div className="analytics-section-header">
              <div>
                <h3 className="analytics-section-title">
                  <Zap size={18} style={{ color: '#f59e0b' }} /> Incentives & Targets Breakdown
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Detailed breakdown of targets achieved and incentives earned.</p>
              </div>
            </div>
            <div className="analytics-table-wrapper">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th style={{ textAlign: 'right' }}>Target</th>
                    <th style={{ textAlign: 'right' }}>Total Sales</th>
                    <th style={{ textAlign: 'center' }}>% Achieved</th>
                    <th style={{ textAlign: 'right' }}>Incentive Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {repPerformanceData.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>No data available.</td>
                    </tr>
                  ) : (
                    repPerformanceData.map((emp, idx) => {
                      const pctAchieved = emp.target > 0 ? (emp.sales / emp.target) * 100 : 0;
                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{emp.name}</td>
                          <td style={{ color: 'var(--text-secondary)', textAlign: 'right', fontWeight: 500 }}>{emp.target > 0 ? formatINR(emp.target) : '-'}</td>
                          <td style={{ color: '#2563eb', fontWeight: 600, textAlign: 'right' }}>{formatINR(emp.sales)}</td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '9999px', 
                              fontSize: '0.72rem', 
                              fontWeight: 600,
                              backgroundColor: pctAchieved >= 100 ? '#dcfce7' : pctAchieved >= 50 ? '#fef9c3' : '#fee2e2',
                              color: pctAchieved >= 100 ? '#166534' : pctAchieved >= 50 ? '#854d0e' : '#991b1b',
                              border: `1px solid ${pctAchieved >= 100 ? '#bbf7d0' : pctAchieved >= 50 ? '#fde047' : '#fecaca'}`
                            }}>
                              {pctAchieved > 0 ? `${pctAchieved.toFixed(1)}%` : '-'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--accent-primary, #00a884)', fontWeight: 600, textAlign: 'right' }}>
                            {formatINR(emp.incentives)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: REGIONAL ─── */}
      {activeTab === 'regional' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
          {/* Regional Table */}
          <div className="analytics-section-card">
            <div className="analytics-section-header">
              <h3 className="analytics-section-title">
                <MapPin size={18} color="#2563eb" /> Regional Revenue Breakdown
              </h3>
            </div>
            <div className="analytics-table-wrapper">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>State / Region</th>
                    <th style={{ textAlign: 'center' }}>Total Orders</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {regionalData.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>No regional data found.</td>
                    </tr>
                  ) : (
                    regionalData.map((reg, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{reg.state}</td>
                        <td style={{ color: '#2563eb', fontWeight: 600, textAlign: 'center' }}>{reg.orders}</td>
                        <td style={{ color: 'var(--accent-primary, #00a884)', fontWeight: 600, textAlign: 'right' }}>{formatINR(reg.revenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments Breakdown */}
          <div className="analytics-section-card" style={{ alignSelf: 'start' }}>
            <div className="analytics-section-header">
              <h3 className="analytics-section-title">
                <IndianRupee size={18} style={{ color: 'var(--accent-primary, #00a884)' }} /> Payment Status
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {paymentData.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No payment data found.</div>
              ) : (
                paymentData.map((pay, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md, 8px)',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9'
                  }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: pay.status === 'Paid' ? '#10b981' : pay.status === 'Unpaid' ? '#ef4444' : '#f59e0b'
                      }} />
                      {pay.status}
                    </span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>{formatINR(pay.value)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
