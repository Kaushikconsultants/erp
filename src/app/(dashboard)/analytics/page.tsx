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
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantOrgId } from '@/lib/tenant';
import './analytics.css';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ [key: string]: string | undefined }>;

export default async function AnalyticsPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const activeTab = searchParams?.tab || 'executive';
  const selectedAgentId = searchParams?.agent || 'all';
  const selectedState = searchParams?.state || 'all';
  const selectedTimeframe = searchParams?.timeframe || 'This Month';
  const customFrom = searchParams?.from || '';
  const customTo = searchParams?.to || '';

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

  // ─── TIMEFRAME & DATE COMPUTATION (IST AWARE) ───
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const istYear = istNow.getUTCFullYear();
  const istMonth = istNow.getUTCMonth();
  const istDate = istNow.getUTCDate();

  let filterStartDate: Date | null = null;
  let filterEndDate: Date | null = null;

  const normTf = (selectedTimeframe || '').toLowerCase().trim().replace(/[-_]/g, ' ');

  if (normTf === 'today') {
    filterStartDate = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0) - istOffset);
    filterEndDate = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffset);
  } else if (normTf === 'yesterday') {
    filterStartDate = new Date(Date.UTC(istYear, istMonth, istDate - 1, 0, 0, 0) - istOffset);
    filterEndDate = new Date(Date.UTC(istYear, istMonth, istDate - 1, 23, 59, 59, 999) - istOffset);
  } else if (normTf === 'last 7 days') {
    filterStartDate = new Date(Date.UTC(istYear, istMonth, istDate - 6, 0, 0, 0) - istOffset);
    filterEndDate = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffset);
  } else if (normTf === 'last 30 days') {
    filterStartDate = new Date(Date.UTC(istYear, istMonth, istDate - 29, 0, 0, 0) - istOffset);
    filterEndDate = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffset);
  } else if (normTf === 'last month') {
    filterStartDate = new Date(Date.UTC(istYear, istMonth - 1, 1, 0, 0, 0) - istOffset);
    filterEndDate = new Date(Date.UTC(istYear, istMonth, 0, 23, 59, 59, 999) - istOffset);
  } else if (normTf === 'this quarter') {
    const quarterMonth = Math.floor(istMonth / 3) * 3;
    filterStartDate = new Date(Date.UTC(istYear, quarterMonth, 1, 0, 0, 0) - istOffset);
    filterEndDate = new Date(Date.UTC(istYear, quarterMonth + 3, 0, 23, 59, 59, 999) - istOffset);
  } else if (normTf === 'this year') {
    filterStartDate = new Date(Date.UTC(istYear, 0, 1, 0, 0, 0) - istOffset);
    filterEndDate = new Date(Date.UTC(istYear, 11, 31, 23, 59, 59, 999) - istOffset);
  } else if (normTf === 'all time') {
    filterStartDate = null;
    filterEndDate = null;
  } else if (normTf === 'custom range' && customFrom && customTo) {
    const [fy, fm, fd] = customFrom.split('-').map(Number);
    const [ty, tm, td] = customTo.split('-').map(Number);
    filterStartDate = new Date(Date.UTC(fy, (fm || 1) - 1, fd || 1, 0, 0, 0) - istOffset);
    filterEndDate = new Date(Date.UTC(ty, (tm || 1) - 1, td || 1, 23, 59, 59, 999) - istOffset);
  } else {
    // Default: 'This Month'
    filterStartDate = new Date(Date.UTC(istYear, istMonth, 1, 0, 0, 0) - istOffset);
    filterEndDate = new Date(Date.UTC(istYear, istMonth + 1, 0, 23, 59, 59, 999) - istOffset);
  }

  // Current Month Anchor (for Monthly Target card)
  const currentMonthStartDate = new Date(Date.UTC(istYear, istMonth, 1, 0, 0, 0) - istOffset);
  const currentMonthEndDate = new Date(Date.UTC(istYear, istMonth + 1, 0, 23, 59, 59, 999) - istOffset);
  const daysInCurrentMonth = new Date(istYear, istMonth + 1, 0).getDate();
  const currentDay = istDate;
  const daysLeftInMonth = Math.max(1, daysInCurrentMonth - currentDay);

  // ─── FETCH MONTHLY TARGET ───
  let settings: any = null;
  try {
    settings = await prisma.companySettings.findFirst({ where: { organizationId: orgId } });
  } catch (e) {
    console.error('Failed to fetch companySettings:', e);
  }
  const MONTHLY_GOAL = settings?.monthlyTarget || 2000000;

  // ─── FETCH AGENTS & EMPLOYEES ───
  let allEmployees: any[] = [];
  try {
    allEmployees = await prisma.employee.findMany({
      where: { organizationId: orgId, employmentStatus: { not: 'Inactive' } },
      include: { user: true },
      orderBy: { user: { name: 'asc' } }
    });
  } catch (e) {
    console.error('Failed to fetch employees:', e);
  }

  let salesUsers: any[] = [];
  try {
    salesUsers = await prisma.user.findMany({
      where: { 
        organizationId: orgId, 
        role: { in: ['Sales', 'SALES', 'Sales Executive', 'Admin', 'ADMIN', 'SUPER_ADMIN'] } 
      },
      select: { id: true, name: true, role: true }
    });
  } catch (e) {
    console.error('Failed to fetch salesUsers:', e);
  }

  // Consolidate agents dropdown list - ensure every unique agent appears exactly ONCE
  const agents: { id: string; name: string }[] = [];
  const seenUserIds = new Set<string>();
  const seenNames = new Set<string>();

  allEmployees.forEach(emp => {
    const name = (emp.user?.name || emp.employeeId || 'Sales Rep').trim();
    const nameLower = name.toLowerCase();
    if (!seenNames.has(nameLower)) {
      seenNames.add(nameLower);
      if (emp.userId) seenUserIds.add(emp.userId);
      agents.push({ id: emp.id, name });
    }
  });

  salesUsers.forEach(u => {
    const name = (u.name || 'Sales User').trim();
    const nameLower = name.toLowerCase();
    if (!seenUserIds.has(u.id) && !seenNames.has(nameLower)) {
      seenUserIds.add(u.id);
      seenNames.add(nameLower);
      agents.push({ id: u.id, name });
    }
  });

  agents.sort((a, b) => a.name.localeCompare(b.name));

  // Resolve selectedAgentId: map to both employee ID and user ID
  const matchedEmployee = selectedAgentId !== 'all'
    ? allEmployees.find(e => e.id === selectedAgentId || e.userId === selectedAgentId)
    : null;
  const canonicalAgentId = matchedEmployee ? matchedEmployee.id : selectedAgentId;
  const targetEmployeeId = matchedEmployee ? matchedEmployee.id : selectedAgentId;
  const targetUserId = matchedEmployee ? matchedEmployee.userId : selectedAgentId;

  // ─── FETCH DISTINCT NORMALIZED STATES ───
  let customerStatesResult: any[] = [];
  let orderStatesResult: any[] = [];
  try {
    const [cStates, oStates] = await Promise.all([
      prisma.customer.findMany({
        select: { state: true },
        distinct: ['state'],
        where: { organizationId: orgId, state: { not: null } }
      }),
      prisma.order.findMany({
        select: { placeOfSupply: true },
        distinct: ['placeOfSupply'],
        where: { organizationId: orgId, placeOfSupply: { not: null } }
      })
    ]);
    customerStatesResult = cStates;
    orderStatesResult = oStates;
  } catch (e) {
    console.error('Failed to fetch distinct states:', e);
  }

  const stateSet = new Set<string>();
  customerStatesResult.forEach(s => {
    const trimmed = (s.state || '').trim();
    if (trimmed) stateSet.add(trimmed);
  });
  orderStatesResult.forEach(o => {
    const trimmed = (o.placeOfSupply || '').trim();
    if (trimmed) stateSet.add(trimmed);
  });
  const states = Array.from(stateSet).sort();

  // ─── BUILD SCOPED WHERE CLAUSES ───
  const orderAndConditions: any[] = [
    { organizationId: orgId },
    { orderStatus: { not: 'Cancelled' } }
  ];
  const quoteAndConditions: any[] = [
    { organizationId: orgId },
    { status: { in: ['Confirmed', 'converted', 'Converted'] } }
  ];
  const customerAndConditions: any[] = [
    { organizationId: orgId }
  ];

  if (selectedState !== 'all') {
    orderAndConditions.push({
      OR: [
        { customer: { state: { equals: selectedState, mode: 'insensitive' } } },
        { placeOfSupply: { equals: selectedState, mode: 'insensitive' } }
      ]
    });
    quoteAndConditions.push({
      customer: { state: { equals: selectedState, mode: 'insensitive' } }
    });
    customerAndConditions.push({
      state: { equals: selectedState, mode: 'insensitive' }
    });
  }

  if (selectedAgentId !== 'all') {
    const agentMatchConditions: any[] = [
      { salespersonId: targetEmployeeId },
      { customer: { assignedSalespersonId: targetEmployeeId } }
    ];
    if (targetUserId) {
      agentMatchConditions.push(
        { salespersonId: targetUserId },
        { salesperson: { userId: targetUserId } },
        { customer: { assignedSalespersonId: targetUserId } },
        { customer: { assignedSalesperson: { userId: targetUserId } } }
      );
    }

    orderAndConditions.push({ OR: agentMatchConditions });
    quoteAndConditions.push({ OR: agentMatchConditions });
    customerAndConditions.push({
      OR: [
        { assignedSalespersonId: targetEmployeeId },
        ...(targetUserId ? [
          { assignedSalespersonId: targetUserId },
          { assignedSalesperson: { userId: targetUserId } }
        ] : [])
      ]
    });
  }

  const orderWhere: any = { AND: orderAndConditions };
  const quoteWhere: any = { AND: quoteAndConditions };
  const customerWhere: any = { AND: customerAndConditions };

  // Apply Date Range filter to orders & quotations
  const orderDateFilter = filterStartDate && filterEndDate ? {
    gte: filterStartDate,
    lte: filterEndDate
  } : undefined;

  const quoteDateFilter = filterStartDate && filterEndDate ? {
    gte: filterStartDate,
    lte: filterEndDate
  } : undefined;

  // ─── QUERY DATA IN PARALLEL SAFELY ───
  let allOrders: any[] = [];
  let allQuotations: any[] = [];
  let allCustomers: any[] = [];
  let currentMonthOrders: any[] = [];
  let currentMonthQuotations: any[] = [];

  try {
    const results = await Promise.allSettled([
      prisma.order.findMany({
        where: {
          ...orderWhere,
          ...(orderDateFilter ? { orderDate: orderDateFilter } : {})
        },
        select: {
          id: true,
          orderNumber: true,
          totalValue: true,
          orderDate: true,
          paymentStatus: true,
          paymentReceived: true,
          outstandingAmount: true,
          notes: true,
          salespersonId: true,
          salesperson: { select: { id: true, userId: true, user: { select: { name: true } } } },
          customer: { select: { id: true, businessName: true, state: true } },
          items: {
            select: {
              quantity: true,
              total: true,
              product: { select: { id: true, name: true, category: true } }
            }
          }
        },
        take: 5000,
        orderBy: { orderDate: 'desc' }
      }),
      prisma.quotation.findMany({
        where: {
          ...quoteWhere,
          ...(quoteDateFilter ? { date: quoteDateFilter } : {})
        },
        select: {
          id: true,
          quotationNumber: true,
          totalValue: true,
          date: true,
          createdAt: true,
          salespersonId: true,
          salesperson: { select: { id: true, userId: true, user: { select: { name: true } } } },
          customer: { select: { id: true, businessName: true, state: true } },
          items: {
            select: {
              quantity: true,
              total: true,
              product: { select: { id: true, name: true, category: true } }
            }
          }
        },
        take: 5000,
        orderBy: { date: 'desc' }
      }),
      prisma.customer.findMany({
        where: customerWhere,
        select: {
          id: true,
          businessName: true,
          mobile: true,
          state: true,
          status: true,
          preferredPaymentMethod: true,
          regularDiscount: true,
          assignedSalesperson: { select: { id: true, userId: true, user: { select: { name: true } } } },
          orders: {
            where: { orderStatus: { not: 'Cancelled' } },
            select: { totalValue: true, subtotal: true, discount: true, orderDate: true }
          },
          quotations: {
            where: { status: { in: ['Confirmed', 'converted', 'Converted'] } },
            select: { totalValue: true, subtotal: true, itemDiscount: true, additionalDiscount: true, date: true }
          }
        }
      }),
      // Current month orders specifically for Monthly Target
      prisma.order.findMany({
        where: {
          ...orderWhere,
          orderDate: { gte: currentMonthStartDate, lte: currentMonthEndDate }
        },
        select: { totalValue: true, notes: true }
      }),
      // Current month confirmed quotations specifically for Monthly Target
      prisma.quotation.findMany({
        where: {
          ...quoteWhere,
          date: { gte: currentMonthStartDate, lte: currentMonthEndDate }
        },
        select: { totalValue: true, quotationNumber: true }
      })
    ]);

    if (results[0].status === 'fulfilled') allOrders = results[0].value;
    else console.error('Analytics allOrders query failed:', results[0].reason);

    if (results[1].status === 'fulfilled') allQuotations = results[1].value;
    else console.error('Analytics allQuotations query failed:', results[1].reason);

    if (results[2].status === 'fulfilled') allCustomers = results[2].value;
    else console.error('Analytics allCustomers query failed:', results[2].reason);

    if (results[3].status === 'fulfilled') currentMonthOrders = results[3].value;
    else console.error('Analytics currentMonthOrders query failed:', results[3].reason);

    if (results[4].status === 'fulfilled') currentMonthQuotations = results[4].value;
    else console.error('Analytics currentMonthQuotations query failed:', results[4].reason);
  } catch (err) {
    console.error('Analytics parallel query error:', err);
  }

  // ─── UNIFY ORDERS & DEDUPLICATE STANDALONE CONFIRMED QUOTATIONS ───
  const convertedQuoteNumbers = new Set<string>();
  allOrders.forEach((o: any) => {
    const match = (o.notes || '').match(/Quotation\s*#?\s*([A-Za-z0-9-]+)/i);
    if (match && match[1]) {
      convertedQuoteNumbers.add(match[1].trim());
    }
  });

  const standaloneQuotes = allQuotations.filter((q: any) => 
    !convertedQuoteNumbers.has((q.quotationNumber || '').trim())
  );

  const ordersRevenue = allOrders.reduce((sum, o) => sum + (Number(o.totalValue) || 0), 0);
  const quotesRevenue = standaloneQuotes.reduce((sum, q) => sum + (Number(q.totalValue) || 0), 0);
  const totalRevenue = ordersRevenue + quotesRevenue;
  const totalOrdersCount = allOrders.length + standaloneQuotes.length;

  // ─── CUSTOMERS & RETENTION CALCULATIONS ───
  const totalCustomers = allCustomers.length;
  let maturedCustomers = 0;
  let repeatBuyers = 0;
  let count0Percent = 0;
  let count1to15Percent = 0;
  let count15PlusPercent = 0;
  let countCredit = 0;

  allCustomers.forEach(c => {
    const validOrders = c.orders || [];
    const validQuotes = c.quotations || [];
    const totalTransactions = validOrders.length + validQuotes.length;

    if (totalTransactions > 0) {
      maturedCustomers++;
      if (totalTransactions > 1) repeatBuyers++;

      const isCredit = (c.status || '').toLowerCase() === 'credit' || (c.preferredPaymentMethod || '').toLowerCase() === 'credit';
      if (isCredit) {
        countCredit++;
      } else {
        // Calculate true weighted discount percentage from both orders and quotations
        const discountPercentages: number[] = [];
        validOrders.forEach((o: any) => {
          const gross = Number(o.subtotal || o.totalValue || 0);
          const disc = Number(o.discount || 0);
          if (gross > 0 && disc > 0) {
            discountPercentages.push((disc / gross) * 100);
          } else if (gross > 0) {
            discountPercentages.push(0);
          }
        });

        validQuotes.forEach((q: any) => {
          const gross = Number(q.subtotal || q.totalValue || 0);
          const disc = Number((q.itemDiscount || 0) + (q.additionalDiscount || 0));
          if (gross > 0 && disc > 0) {
            discountPercentages.push((disc / gross) * 100);
          } else if (gross > 0) {
            discountPercentages.push(0);
          }
        });

        let avgDiscount = discountPercentages.length > 0
          ? discountPercentages.reduce((a, b) => a + b, 0) / discountPercentages.length
          : 0;

        // Fallback to customer's preset regularDiscount
        if (avgDiscount === 0 && c.regularDiscount) {
          const parsed = parseFloat(c.regularDiscount.replace('%', ''));
          if (!isNaN(parsed)) avgDiscount = parsed;
        }

        if (avgDiscount === 0) count0Percent++;
        else if (avgDiscount > 0 && avgDiscount <= 15) count1to15Percent++;
        else count15PlusPercent++;
      }
    }
  });

  const retentionRate = maturedCustomers > 0 ? ((repeatBuyers / maturedCustomers) * 100).toFixed(0) : '0';
  const aov = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
  const customerLTV = maturedCustomers > 0 ? totalRevenue / maturedCustomers : 0;

  // ─── MONTHLY TARGET & RUN-RATE (Current Month Scope) ───
  const currentMonthConvertedQuotes = new Set<string>();
  currentMonthOrders.forEach((o: any) => {
    const match = (o.notes || '').match(/Quotation\s*#?\s*([A-Za-z0-9-]+)/i);
    if (match && match[1]) currentMonthConvertedQuotes.add(match[1].trim());
  });
  const currentMonthStandaloneQuotes = currentMonthQuotations.filter((q: any) => 
    !currentMonthConvertedQuotes.has((q.quotationNumber || '').trim())
  );

  const currentMonthRevenue = currentMonthOrders.reduce((sum, o) => sum + (Number(o.totalValue) || 0), 0) +
    currentMonthStandaloneQuotes.reduce((sum, q) => sum + (Number(q.totalValue) || 0), 0);

  // Target goal scoped to agent if selected
  const activeEmployee = selectedAgentId !== 'all' ? matchedEmployee : null;
  const effectiveGoal = activeEmployee?.target ? Number(activeEmployee.target) : MONTHLY_GOAL;

  const remainingTarget = Math.max(0, effectiveGoal - currentMonthRevenue);
  const runRateRequired = daysLeftInMonth > 0 ? remainingTarget / daysLeftInMonth : 0;
  const currentRunRate = currentDay > 0 ? currentMonthRevenue / currentDay : 0;
  const expectedClosing = currentMonthRevenue + (currentRunRate * daysLeftInMonth);
  const nextMonthForecast = Math.round(expectedClosing * 1.14); // +14% MoM
  const progressPercent = effectiveGoal > 0 ? Math.min(100, (currentMonthRevenue / effectiveGoal) * 100) : 0;

  // ─── TOP PRODUCTS & CATEGORY REVENUE (Scoped to Timeframe & Filters) ───
  const categoryRevenueMap: Record<string, number> = {};
  const productRevenueMap: Record<string, { name: string; revenue: number; qty: number }> = {};

  const processItem = (item: any) => {
    const cat = item.product?.category || 'General';
    categoryRevenueMap[cat] = (categoryRevenueMap[cat] || 0) + Number(item.total || 0);

    const prodId = item.product?.id || item.product?.name || 'unknown';
    const prodName = item.product?.name || 'Standard Item';
    if (!productRevenueMap[prodId]) {
      productRevenueMap[prodId] = { name: prodName, revenue: 0, qty: 0 };
    }
    productRevenueMap[prodId].revenue += Number(item.total || 0);
    productRevenueMap[prodId].qty += Number(item.quantity || 0);
  };

  allOrders.forEach(o => o.items?.forEach(processItem));
  standaloneQuotes.forEach(q => q.items?.forEach(processItem));

  const categoryData = Object.entries(categoryRevenueMap)
    .map(([category, revenue]) => ({ category, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  const topProductsData = Object.values(productRevenueMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  // ─── VIP CUSTOMERS (Scoped to Filtered Customers & Real Purchases) ───
  const vipCustomers = allCustomers
    .map(c => {
      const orderPurchases = (c.orders || []).reduce((sum: number, o: any) => sum + (Number(o.totalValue) || 0), 0);
      const quotePurchases = (c.quotations || []).reduce((sum: number, q: any) => sum + (Number(q.totalValue) || 0), 0);
      const calculatedTotal = orderPurchases + quotePurchases;
      return {
        ...c,
        totalOrdersCount: (c.orders || []).length + (c.quotations || []).length,
        calculatedTotalPurchase: calculatedTotal
      };
    })
    .filter(c => c.calculatedTotalPurchase > 0)
    .sort((a, b) => b.calculatedTotalPurchase - a.calculatedTotalPurchase)
    .slice(0, 10);

  // ─── TEAM & INCENTIVES PERFORMANCE (Scoped to Timeframe & Orders/Quotes) ───
  const repPerformanceData = allEmployees
    .filter(emp => selectedAgentId === 'all' || emp.id === canonicalAgentId || emp.userId === canonicalAgentId || emp.id === selectedAgentId || emp.userId === selectedAgentId)
    .map(emp => {
      // Find orders matching this employee
      const empOrders = allOrders.filter(o => 
        o.salespersonId === emp.id || 
        o.salespersonId === emp.userId ||
        o.salesperson?.userId === emp.userId ||
        o.salesperson?.id === emp.id
      );
      const empQuotes = standaloneQuotes.filter(q =>
        q.salespersonId === emp.id ||
        q.salespersonId === emp.userId ||
        q.salesperson?.userId === emp.userId ||
        q.salesperson?.id === emp.id
      );

      const empSales = empOrders.reduce((sum, o) => sum + Number(o.totalValue || 0), 0) +
        empQuotes.reduce((sum, q) => sum + Number(q.totalValue || 0), 0);

      // Target
      const empTarget = emp.target ? Number(emp.target) : (MONTHLY_GOAL / Math.max(allEmployees.length, 1));
      
      // Estimated 1% to 2% commission earned
      const incentiveEarned = Math.round(empSales * 0.015);

      return {
        name: emp.user?.name || emp.employeeId || 'Sales Rep',
        sales: empSales,
        ordersCount: empOrders.length + empQuotes.length,
        target: empTarget,
        incentives: incentiveEarned
      };
    })
    .sort((a, b) => b.sales - a.sales);

  // ─── SALES TREND & CUSTOMER GROWTH OVER TIME ───
  const salesTrendData = [];
  const customerGrowthData = [];

  // Determine interval points based on timeframe
  const trendDays = normTf === 'last 7 days' || normTf === 'today' || normTf === 'yesterday' ? 7 : 10;
  
  for (let i = trendDays - 1; i >= 0; i--) {
    const dayStart = new Date(Date.UTC(istYear, istMonth, istDate - i, 0, 0, 0) - istOffset);
    const dayEnd = new Date(Date.UTC(istYear, istMonth, istDate - i, 23, 59, 59, 999) - istOffset);
    const dateStr = dayStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    const dayOrders = allOrders.filter(o => {
      if (!o.orderDate) return false;
      const od = new Date(o.orderDate);
      return od >= dayStart && od <= dayEnd;
    });

    const dayQuotes = standaloneQuotes.filter(q => {
      const qd = q.date ? new Date(q.date) : q.createdAt ? new Date(q.createdAt) : null;
      return qd ? qd >= dayStart && qd <= dayEnd : false;
    });

    const dayRevenue = dayOrders.reduce((sum, o) => sum + (Number(o.totalValue) || 0), 0) +
      dayQuotes.reduce((sum, q) => sum + (Number(q.totalValue) || 0), 0);
    const dayCount = dayOrders.length + dayQuotes.length;

    salesTrendData.push({
      date: dateStr,
      revenue: Math.round(dayRevenue),
      orders: dayCount
    });

    const dayMatured = allCustomers.filter(c => {
      const hasOrderOnDay = (c.orders || []).some((o: any) => {
        if (!o.orderDate) return false;
        const od = new Date(o.orderDate);
        return od >= dayStart && od <= dayEnd;
      });
      return hasOrderOnDay;
    }).length;

    customerGrowthData.push({
      date: dateStr,
      newCustomers: dayCount > 0 ? Math.ceil(dayCount * 0.6) : 0,
      matured: dayMatured
    });
  }

  // ─── REGIONAL & PAYMENTS BREAKDOWN ───
  const regionalMap: Record<string, { revenue: number; orderCount: number }> = {};
  const paymentStatusMap: Record<string, number> = {};
  let totalPaymentCollected = 0;
  let totalOutstanding = 0;

  allOrders.forEach(o => {
    // Regional
    const st = (o.customer?.state || 'Unknown').trim();
    if (!regionalMap[st]) regionalMap[st] = { revenue: 0, orderCount: 0 };
    regionalMap[st].revenue += Number(o.totalValue || 0);
    regionalMap[st].orderCount++;

    // Payments
    const status = o.paymentStatus || 'Unpaid';
    paymentStatusMap[status] = (paymentStatusMap[status] || 0) + Number(o.totalValue || 0);

    totalPaymentCollected += Number(o.paymentReceived || 0);
    totalOutstanding += Number(o.outstandingAmount || 0);
  });

  standaloneQuotes.forEach(q => {
    const st = (q.customer?.state || 'Unknown').trim();
    if (!regionalMap[st]) regionalMap[st] = { revenue: 0, orderCount: 0 };
    regionalMap[st].revenue += Number(q.totalValue || 0);
    regionalMap[st].orderCount++;

    paymentStatusMap['Quotation / Pending'] = (paymentStatusMap['Quotation / Pending'] || 0) + Number(q.totalValue || 0);
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

  // Preserve all query params across tab switcher
  const searchParamsQuery = new URLSearchParams();
  if (selectedTimeframe && selectedTimeframe !== 'This Month') searchParamsQuery.set('timeframe', selectedTimeframe);
  if (customFrom) searchParamsQuery.set('from', customFrom);
  if (customTo) searchParamsQuery.set('to', customTo);
  if (selectedAgentId !== 'all') searchParamsQuery.set('agent', canonicalAgentId);
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
            <p className="analytics-subtitle">
              Live graphical insights • {selectedTimeframe} • {selectedAgentId === 'all' ? 'All Agents' : (matchedEmployee?.user?.name || 'Filtered Agent')} • {selectedState === 'all' ? 'All States' : selectedState}
            </p>
          </div>
        </div>
        <Link href="/reports" className="analytics-btn-pdf">
          <Crown size={16} /> Master Report (PDF)
        </Link>
      </div>

      {/* ─── FILTERS (Reactive Client Component) ─── */}
      <AnalyticsFilters 
        activeTab={activeTab}
        selectedAgentId={canonicalAgentId}
        selectedState={selectedState}
        selectedTimeframe={selectedTimeframe}
        startDate={customFrom}
        endDate={customTo}
        agents={agents}
        states={states}
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
                      <div className="analytics-card-subtitle">
                        Goal: {formatINR(effectiveGoal)} {selectedAgentId !== 'all' && activeEmployee ? `(${activeEmployee.user?.name || 'Rep'})` : ''}
                      </div>
                    </div>
                  </div>
                  <EditGoalModal currentTarget={effectiveGoal} />
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
                      <div className="analytics-card-subtitle">Projection based on current run-rate ({daysLeftInMonth} days remaining)</div>
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

          {/* 8 KPI METRICS GRID (Accurately Scoped to Selected Timeframe) */}
          <div className="analytics-kpi-grid">
            <Link href="/orders" className="analytics-kpi-card">
              <div className="analytics-kpi-header">
                <div className="analytics-kpi-label">Total Revenue ({selectedTimeframe})</div>
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
                <div className="analytics-kpi-label">Total Orders ({selectedTimeframe})</div>
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

          {/* ─── MATURED CUSTOMER BREAKDOWN (Accurate Percentage Distribution) ─── */}
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
                  <Box size={17} color="#06b6d4" /> Revenue by Category ({selectedTimeframe})
                </h3>
              </div>
              {categoryData.length > 0 ? (
                <TopProductsChart data={categoryData} />
              ) : (
                <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No category data available for this timeframe.</div>
              )}
            </div>

            {/* Top Performing Products Card */}
            <div className="analytics-section-card">
              <div className="analytics-section-header">
                <h3 className="analytics-section-title">
                  <Star size={17} color="#f59e0b" /> Top Performing Products ({selectedTimeframe})
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
                        <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No products found for this period.</td>
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
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Daily revenue volume and order frequency over recent activity</p>
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
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>High-value accounts contributing the largest portion of revenue</p>
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
                        <td style={{ color: '#2563eb', fontWeight: 600, textAlign: 'center' }}>{vip.totalOrdersCount}</td>
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
                  <Trophy size={18} style={{ color: 'var(--accent-primary, #00a884)' }} /> Team Performance ({selectedTimeframe})
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Comparing revenue generated vs deals closed per salesperson in this period.</p>
              </div>
            </div>
            {repPerformanceData.length > 0 ? (
              <RepPerformanceChart data={repPerformanceData.map(r => ({ name: r.name, sales: r.sales, calls: r.ordersCount }))} />
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
                  <Zap size={18} style={{ color: '#f59e0b' }} /> Incentives & Targets Breakdown ({selectedTimeframe})
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Detailed breakdown of sales achieved, targets, and estimated incentive earned.</p>
              </div>
            </div>
            <div className="analytics-table-wrapper">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th style={{ textAlign: 'center' }}>Orders Closed</th>
                    <th style={{ textAlign: 'right' }}>Target</th>
                    <th style={{ textAlign: 'right' }}>Total Sales</th>
                    <th style={{ textAlign: 'center' }}>% Achieved</th>
                    <th style={{ textAlign: 'right' }}>Incentive Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {repPerformanceData.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>No data available.</td>
                    </tr>
                  ) : (
                    repPerformanceData.map((emp, idx) => {
                      const pctAchieved = emp.target > 0 ? (emp.sales / emp.target) * 100 : 0;
                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{emp.name}</td>
                          <td style={{ color: '#2563eb', fontWeight: 600, textAlign: 'center' }}>{emp.ordersCount}</td>
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

      {/* ─── TAB CONTENT: REGIONAL & PAYMENTS ─── */}
      {activeTab === 'regional' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
          {/* Regional Table */}
          <div className="analytics-section-card">
            <div className="analytics-section-header">
              <h3 className="analytics-section-title">
                <MapPin size={18} color="#2563eb" /> Regional Revenue Breakdown ({selectedTimeframe})
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
                      <td colSpan={3} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>No regional data found for this period.</td>
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
                <IndianRupee size={18} style={{ color: 'var(--accent-primary, #00a884)' }} /> Payment Collections & Status ({selectedTimeframe})
              </h3>
            </div>

            {/* Collection Summary Chips */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={13} /> Collected
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#15803d', marginTop: '2px' }}>
                  {formatINR(totalPaymentCollected)}
                </div>
              </div>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '0.74rem', color: '#991b1b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} /> Outstanding
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#b91c1c', marginTop: '2px' }}>
                  {formatINR(totalOutstanding)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {paymentData.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No payment data found for this period.</div>
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
