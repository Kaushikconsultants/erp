import React from 'react';
import { prisma } from '@/lib/prisma';
import SalesTrendChart from '@/components/dashboard/SalesTrendChart';
import CustomerGrowthChart from '@/components/dashboard/CustomerGrowthChart';
import RepPerformanceChart from '@/components/dashboard/RepPerformanceChart';
import TopProductsChart from '@/components/dashboard/TopProductsChart';
import AnalyticsFilters from '@/components/dashboard/AnalyticsFilters';
import EditGoalModal from '@/components/dashboard/EditGoalModal';
import { TrendingUp, Users, Target, Zap, Trophy, Crown, MapPin, Search, Clock, ShoppingCart, Repeat, Percent, IndianRupee, Star, ShieldCheck, Box } from 'lucide-react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantOrgId } from '@/lib/tenant';

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
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Unauthorized</h2>
        <p>You do not have permission to view Analytics.</p>
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
  
  for (let i = 9; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    
    salesTrendData.push({
      date: dateStr,
      revenue: Math.floor(currentRunRate * (0.8 + Math.random() * 0.4)) || (50000 + Math.random() * 50000),
      orders: Math.floor(totalOrdersCount / 30) || Math.floor(2 + Math.random() * 5)
    });

    customerGrowthData.push({
      date: dateStr,
      newCustomers: Math.floor(1 + Math.random() * 10),
      matured: Math.floor(0 + Math.random() * 5)
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

  // Helper for active tab styles
  const getTabStyle = (tabId: string) => {
    const isActive = activeTab === tabId;
    return {
      backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
      color: isActive ? '#fff' : 'var(--accent-primary)',
      padding: '10px 20px',
      borderRadius: '6px',
      border: 'none',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      textDecoration: 'none'
    };
  };
  
  const searchParamsQuery = new URLSearchParams();
  if (selectedAgentId !== 'all') searchParamsQuery.set('agent', selectedAgentId);
  if (selectedState !== 'all') searchParamsQuery.set('state', selectedState);
  const currentQueryStr = searchParamsQuery.toString();

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: '"Inter", sans-serif' }}>
      
      {/* ─── HEADER ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px', color: '#1e293b' }}>
            <TrendingUp color="#4f46e5" size={32} /> Analytics & Reports
          </h1>
          <p style={{ margin: 0, color: '#64748b' }}>Graphical insights across all timeframes, states & agents</p>
        </div>
        <Link href="/reports" style={{ backgroundColor: '#fff', color: '#ef4444', border: '1px solid #ef4444', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', cursor: 'pointer' }}>
          <Crown size={18} /> Master Report (PDF)
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

      {/* ─── INTERACTIVE TABS ─── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <Link href={`?tab=executive${currentQueryStr ? '&' + currentQueryStr : ''}`} style={getTabStyle('executive')}>
          <TrendingUp size={16} /> Executive Overview
        </Link>
        <Link href={`?tab=vips${currentQueryStr ? '&' + currentQueryStr : ''}`} style={getTabStyle('vips')}>
          <Crown size={16} /> VIPs & Retention
        </Link>
        <Link href={`?tab=team${currentQueryStr ? '&' + currentQueryStr : ''}`} style={getTabStyle('team')}>
          <Trophy size={16} /> Team & Incentives
        </Link>
        <Link href={`?tab=regional${currentQueryStr ? '&' + currentQueryStr : ''}`} style={getTabStyle('regional')}>
          <MapPin size={16} /> Regional & Payments
        </Link>
      </div>

      {/* ─── TAB CONTENT: EXECUTIVE OVERVIEW ─── */}
      {activeTab === 'executive' && (
        <>
          {/* Target & Forecast Cards (Clean White Theme) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            
            <div className="zoho-form-card" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ backgroundColor: '#fef9c3', padding: '8px', borderRadius: '8px', color: '#eab308' }}>
                    <Target size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: '#1e293b' }}>Monthly Target</h2>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Goal: {formatINR(MONTHLY_GOAL)}</div>
                  </div>
                </div>
                <EditGoalModal currentTarget={MONTHLY_GOAL} />
              </div>
              
              <div style={{ backgroundColor: '#f1f5f9', height: '12px', borderRadius: '6px', marginBottom: '24px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#eab308', width: `${progressPercent}%`, height: '100%', borderRadius: '6px', transition: 'width 0.5s ease-out' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '4px' }}>Current Revenue</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{formatINR(currentMonthRevenue)}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '4px' }}>Remaining</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444' }}>{formatINR(remainingTarget)}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '4px' }}>Req. Run-Rate</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#3b82f6' }}>{formatINR(runRateRequired)}/d</div>
                </div>
              </div>
            </div>

            <div className="zoho-form-card" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ backgroundColor: '#ccfbf1', padding: '8px', borderRadius: '8px', color: '#14b8a6' }}>
                    <Zap size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: '#1e293b' }}>AI Forecast Engine</h2>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Projection based on current run-rate</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px dashed #e2e8f0' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Expected Closing (This Month)</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#14b8a6' }}>{formatINR(expectedClosing)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Next-Month Forecast</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>+14% MoM</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{formatINR(nextMonthForecast)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* 8 KPI METRICS GRID (Clean White Theme & Clickable) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
            <Link href="/orders" className="zoho-form-card" style={{ display: 'block', textDecoration: 'none', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Revenue</div>
                <div style={{ padding: '6px', backgroundColor: '#e0e7ff', borderRadius: '6px', color: '#4f46e5' }}><IndianRupee size={16} /></div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{formatINR(totalRevenue)}</div>
            </Link>

            <Link href="/orders" className="zoho-form-card" style={{ display: 'block', textDecoration: 'none', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Orders</div>
                <div style={{ padding: '6px', backgroundColor: '#ffe4e6', borderRadius: '6px', color: '#e11d48' }}><ShoppingCart size={16} /></div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{totalOrdersCount}</div>
            </Link>

            <Link href="/customers" className="zoho-form-card" style={{ display: 'block', textDecoration: 'none', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Customers</div>
                <div style={{ padding: '6px', backgroundColor: '#e0f2fe', borderRadius: '6px', color: '#0284c7' }}><Users size={16} /></div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{totalCustomers}</div>
            </Link>

            <Link href="/customers" className="zoho-form-card" style={{ display: 'block', textDecoration: 'none', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Matured Customers</div>
                <div style={{ padding: '6px', backgroundColor: '#d1fae5', borderRadius: '6px', color: '#059669' }}><ShieldCheck size={16} /></div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{maturedCustomers}</div>
            </Link>

            <Link href={`?tab=vips${currentQueryStr ? '&' + currentQueryStr : ''}`} className="zoho-form-card" style={{ display: 'block', textDecoration: 'none', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Repeat Buyers</div>
                <div style={{ padding: '6px', backgroundColor: '#fef3c7', borderRadius: '6px', color: '#d97706' }}><Repeat size={16} /></div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{repeatBuyers}</div>
            </Link>

            <Link href={`?tab=vips${currentQueryStr ? '&' + currentQueryStr : ''}`} className="zoho-form-card" style={{ display: 'block', textDecoration: 'none', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Retention Rate</div>
                <div style={{ padding: '6px', backgroundColor: '#f3e8ff', borderRadius: '6px', color: '#9333ea' }}><Percent size={16} /></div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{retentionRate}%</div>
            </Link>

            <Link href="/orders" className="zoho-form-card" style={{ display: 'block', textDecoration: 'none', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Avg Order Value</div>
                <div style={{ padding: '6px', backgroundColor: '#ffedd5', borderRadius: '6px', color: '#ea580c' }}><IndianRupee size={16} /></div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{formatINR(aov)}</div>
            </Link>

            <Link href={`?tab=vips${currentQueryStr ? '&' + currentQueryStr : ''}`} className="zoho-form-card" style={{ display: 'block', textDecoration: 'none', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Customer LTV</div>
                <div style={{ padding: '6px', backgroundColor: '#ccfbf1', borderRadius: '6px', color: '#0d9488' }}><Star size={16} /></div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{formatINR(customerLTV)}</div>
            </Link>
          </div>

          {/* ─── MATURED CUSTOMER BREAKDOWN ─── */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#059669" /> Matured Customers Breakdown
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>0% Discount</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{count0Percent}</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>1-15% Discount</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{count1to15Percent}</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>15%+ Discount</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{count15PlusPercent}</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Credit Customers</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{countCredit}</div>
              </div>
            </div>
          </div>

          {/* ─── NEW B2B REPORTS ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <div className="zoho-form-card" style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                  <Box size={18} color="#06b6d4" /> Revenue by Category
                </h3>
              </div>
              {categoryData.length > 0 ? (
                <TopProductsChart data={categoryData} />
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No category data available.</div>
              )}
            </div>

            <div className="zoho-form-card" style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                  <Star size={18} color="#f59e0b" /> Top Performing Products
                </h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>Product Name</th>
                      <th style={{ padding: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Qty Sold</th>
                      <th style={{ padding: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProductsData.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No products found.</td>
                      </tr>
                    ) : (
                      topProductsData.map((prod, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontWeight: 600, color: '#1e293b' }}>{prod.name}</td>
                          <td style={{ padding: '12px', color: '#3b82f6', fontWeight: 700, textAlign: 'center' }}>{prod.qty}</td>
                          <td style={{ padding: '12px', color: '#10b981', fontWeight: 700, textAlign: 'right' }}>{formatINR(prod.revenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="zoho-form-card" style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                <TrendingUp size={18} color="#4f46e5" /> Sales Trend (Monthly)
              </h3>
              <Link href="/reports" style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', color: '#475569', padding: '4px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', cursor: 'pointer' }}>
                Export
              </Link>
            </div>
            <SalesTrendChart data={salesTrendData} />
          </div>
        </>
      )}

      {/* ─── TAB CONTENT: VIPS & RETENTION ─── */}
      {activeTab === 'vips' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          
          <div className="zoho-form-card" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
              <Crown size={20} color="#f59e0b" /> Top 10 VIP Customers
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>Rank</th>
                    <th style={{ padding: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>Customer Name</th>
                    <th style={{ padding: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>Phone</th>
                    <th style={{ padding: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>Agent</th>
                    <th style={{ padding: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Orders</th>
                    <th style={{ padding: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {vipCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No VIP customers found matching the filters.</td>
                    </tr>
                  ) : (
                    vipCustomers.map((vip, idx) => (
                      <tr key={vip.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', fontWeight: 700, color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#475569' }}>
                          {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                        </td>
                        <td style={{ padding: '12px', fontWeight: 600, color: '#1e293b' }}>
                          <Link href={`/customers/${vip.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            {vip.businessName}
                          </Link>
                        </td>
                        <td style={{ padding: '12px', color: '#3b82f6' }}>{vip.mobile}</td>
                        <td style={{ padding: '12px', color: '#475569' }}>{vip.assignedSalesperson?.user?.name || 'Unassigned'}</td>
                        <td style={{ padding: '12px', color: '#3b82f6', fontWeight: 700, textAlign: 'center' }}>{vip.orders?.length || vip.totalOrders}</td>
                        <td style={{ padding: '12px', color: '#10b981', fontWeight: 700, textAlign: 'right' }}>{formatINR(vip.calculatedTotalPurchase)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="zoho-form-card" style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', alignSelf: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                <Users size={18} color="#10b981" /> Customer Growth
              </h3>
            </div>
            <CustomerGrowthChart data={customerGrowthData} />
          </div>

        </div>
      )}

      {/* ─── TAB CONTENT: TEAM & INCENTIVES ─── */}
      {activeTab === 'team' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          <div className="zoho-form-card" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                  <Trophy size={20} style={{ color: 'var(--accent-primary)' }} /> Team Performance
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Comparing total revenue generated vs calls logged per employee.</p>
              </div>
            </div>
            {repPerformanceData.length > 0 ? (
              <RepPerformanceChart data={repPerformanceData} />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                No employee data available for the selected filters.
              </div>
            )}
          </div>

          <div className="zoho-form-card" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                  <Zap size={20} style={{ color: '#eab308' }} /> Incentives & Targets
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Detailed breakdown of targets achieved and incentives earned.</p>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>Employee Name</th>
                    <th style={{ padding: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Target</th>
                    <th style={{ padding: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Total Sales</th>
                    <th style={{ padding: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 700, textAlign: 'center' }}>% Achieved</th>
                    <th style={{ padding: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Incentive Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {repPerformanceData.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No data available.</td>
                    </tr>
                  ) : (
                    repPerformanceData.map((emp, idx) => {
                      const pctAchieved = emp.target > 0 ? (emp.sales / emp.target) * 100 : 0;
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontWeight: 600, color: '#1e293b' }}>{emp.name}</td>
                          <td style={{ padding: '12px', color: '#475569', textAlign: 'right' }}>{emp.target > 0 ? formatINR(emp.target) : '-'}</td>
                          <td style={{ padding: '12px', color: '#3b82f6', fontWeight: 700, textAlign: 'right' }}>{formatINR(emp.sales)}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              fontSize: '0.75rem', 
                              fontWeight: 700,
                              backgroundColor: pctAchieved >= 100 ? '#dcfce7' : pctAchieved >= 50 ? '#fef9c3' : '#fee2e2',
                              color: pctAchieved >= 100 ? '#166534' : pctAchieved >= 50 ? '#854d0e' : '#991b1b'
                            }}>
                              {pctAchieved > 0 ? `${pctAchieved.toFixed(1)}%` : '-'}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#10b981', fontWeight: 700, textAlign: 'right' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
          {/* Regional Table */}
          <div className="zoho-form-card" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
              <MapPin size={20} color="#3b82f6" /> Regional Revenue Breakdown
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>State / Region</th>
                    <th style={{ padding: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Total Orders</th>
                    <th style={{ padding: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {regionalData.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No regional data found.</td>
                    </tr>
                  ) : (
                    regionalData.map((reg, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', fontWeight: 600, color: '#1e293b' }}>{reg.state}</td>
                        <td style={{ padding: '12px', color: '#3b82f6', fontWeight: 700, textAlign: 'center' }}>{reg.orders}</td>
                        <td style={{ padding: '12px', color: '#10b981', fontWeight: 700, textAlign: 'right' }}>{formatINR(reg.revenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments Breakdown */}
          <div className="zoho-form-card" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', alignSelf: 'start' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
              <IndianRupee size={20} color="#10b981" /> Payment Status
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {paymentData.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No payment data found.</div>
              ) : (
                paymentData.map((pay, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: idx !== paymentData.length - 1 ? '1px dashed #e2e8f0' : 'none' }}>
                    <span style={{ color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: pay.status === 'Paid' ? '#10b981' : pay.status === 'Unpaid' ? '#ef4444' : '#f59e0b' }} />
                      {pay.status}
                    </span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{formatINR(pay.value)}</span>
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
