import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import TelecallerDashboard from '@/components/dashboard/TelecallerDashboard';
import TeamLeaderDashboard from '@/components/dashboard/TeamLeaderDashboard';
import BroadcastBanner from '@/components/dashboard/BroadcastBanner';
import { calculateIncentives, OrderData } from '@/lib/incentiveEngine';
import { getFollowUpRecommendations } from '@/app/actions/customerActions';
import { getSprintData, getAdminSprintTeamHealth } from '@/app/actions/sprintActions';
import { getDormantAndReorderInsights } from '@/app/actions/aiReorderActions';
import './dashboard.css';

import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const orgId = await getTenantOrgId();
  const userRole = (session.user as any).role || 'SALES';
  const userId = (session.user as any).id;

  // Find the employee profile linked to this user
  const employee = await prisma.employee.findUnique({
    where: { userId: userId },
    include: { user: true }
  });

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
    // ---------------------------------------------------------
    // ADMIN DASHBOARD DATA (Tenant Scoped - Concurrent Fetching)
    // ---------------------------------------------------------
    const todayStartOfDay = new Date();
    todayStartOfDay.setHours(0, 0, 0, 0);

    const [
      totalCustomers,
      allOrdersInOrg,
      allConfirmedQuotesInOrg,
      pendingCalls,
      adminAtt,
      activeAttendances,
      allOrderItemsForTopCat,
      employees,
      hotLeads
    ] = await Promise.all([
      prisma.customer.count({ where: { organizationId: orgId } }),
      prisma.order.findMany({
        where: { organizationId: orgId },
        include: { salesperson: { include: { user: true } }, customer: true }
      }),
      prisma.quotation.findMany({
        where: { organizationId: orgId, status: { in: ['Confirmed', 'Converted'] } },
        include: { salesperson: { include: { user: true } }, customer: true }
      }),
      prisma.call.count({
        where: { 
          customer: { organizationId: orgId },
          followUpDate: { gte: todayStartOfDay }
        }
      }),
      employee ? prisma.attendance.findFirst({
        where: {
          employeeId: employee.id,
          date: { gte: todayStartOfDay }
        }
      }) : Promise.resolve(null),
      prisma.attendance.findMany({
        where: {
          date: { gte: todayStartOfDay },
          employee: { organizationId: orgId }
        },
        include: { employee: { include: { user: true } } },
        orderBy: { checkIn: 'desc' }
      }),
      prisma.orderItem.findMany({
        where: { order: { organizationId: orgId } },
        include: { product: true },
        take: 100
      }),
      prisma.employee.findMany({
        where: { organizationId: orgId },
        include: {
          user: true,
          orders: {
            where: { organizationId: orgId, orderDate: { gte: startOfMonth } },
            select: { totalValue: true }
          }
        }
      }),
      prisma.customer.findMany({
        where: { organizationId: orgId, leadStage: 'Negotiation' },
        include: { assignedSalesperson: { include: { user: true } } },
        take: 5,
        orderBy: { updatedAt: 'desc' }
      })
    ]);

    // Quotation numbers already represented as Orders
    const convertedQuoteNumbers = new Set<string>();
    allOrdersInOrg.forEach(o => {
      const match = (o.notes || '').match(/Quotation #([A-Za-z0-9-]+)/);
      if (match && match[1]) {
        convertedQuoteNumbers.add(match[1].trim());
      }
    });

    // Standalone confirmed quotations (not yet an Order in prisma.order)
    const standaloneConfirmedQuotes = allConfirmedQuotesInOrg.filter(q => 
      q.status === 'Confirmed' && !convertedQuoteNumbers.has((q.quotationNumber || '').trim())
    );

    // Total Revenue & Combined Total Orders
    const ordersRevenue = allOrdersInOrg.reduce((sum, o) => sum + Number(o.totalValue || 0), 0);
    const standaloneQuotRevenue = standaloneConfirmedQuotes.reduce((sum, q) => sum + Number(q.totalValue || 0), 0);
    const totalRevenue = ordersRevenue + standaloneQuotRevenue;
    const combinedTotalOrders = allOrdersInOrg.length + standaloneConfirmedQuotes.length;

    const adminCheckedIn = !!adminAtt;
    const adminCheckedOut = !!adminAtt?.checkOut;

    const liveAttendance = activeAttendances.map(a => ({
      id: a.id,
      name: a.employee?.user?.name || 'Team Member',
      checkInStr: a.checkIn ? new Date(a.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : 'Just now',
      isShiftActive: !a.checkOut
    }));

    // Today's orders count and live leaderboard
    const salesMap: Record<string, { name: string, total: number, orders: number }> = {};
    let todayOrdersCount = 0;

    allOrdersInOrg
      .filter(o => o.orderDate && new Date(o.orderDate) >= todayStartOfDay)
      .forEach(o => {
        todayOrdersCount += 1;
        const spId = o.salespersonId;
        if (!salesMap[spId]) {
          salesMap[spId] = { name: o.salesperson?.user?.name || 'Unknown', total: 0, orders: 0 };
        }
        salesMap[spId].total += Number(o.totalValue || 0);
        salesMap[spId].orders += 1;
      });

    standaloneConfirmedQuotes
      .filter(q => (q.date && new Date(q.date) >= todayStartOfDay) || (q.createdAt && new Date(q.createdAt) >= todayStartOfDay))
      .forEach(q => {
        todayOrdersCount += 1;
        const spId = q.salespersonId || '';
        if (spId) {
          if (!salesMap[spId]) {
            salesMap[spId] = { name: q.salesperson?.user?.name || 'Unknown', total: 0, orders: 0 };
          }
          salesMap[spId].total += Number(q.totalValue || 0);
          salesMap[spId].orders += 1;
        }
      });

    const liveLeaderboard = Object.values(salesMap).sort((a, b) => b.total - a.total);

    // Mock Sales Data for Chart
    const salesData = [
      { name: 'Mon', sales: 4000 },
      { name: 'Tue', sales: 3000 },
      { name: 'Wed', sales: 2000 },
      { name: 'Thu', sales: 2780 },
      { name: 'Fri', sales: 1890 },
      { name: 'Sat', sales: 2390 },
      { name: 'Sun', sales: totalRevenue > 0 ? totalRevenue : 3490 },
    ];

    // Calculate Top Categories from real DB order items if available
    const categoryMap: Record<string, number> = {};
    allOrderItemsForTopCat.forEach(item => {
      const catName = item.product?.category || 'Uncategorized';
      categoryMap[catName] = (categoryMap[catName] || 0) + item.total;
    });

    const realTopCategories = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, category: name, value, revenue: value }))
      .sort((a, b) => b.value - a.value);

    const topProductsData = realTopCategories.length > 0 ? realTopCategories : [
      { name: 'T-Shirts', category: 'T-Shirts', value: 40000, revenue: 40000 },
      { name: 'Track Pants', category: 'Track Pants', value: 30000, revenue: 30000 },
      { name: 'Shorts', category: 'Shorts', value: 20000, revenue: 20000 },
      { name: 'Jackets', category: 'Jackets', value: 15000, revenue: 15000 },
    ];

    const teamPerformance = employees.map(emp => {
      const empOrdersMTD = allOrdersInOrg.filter(o => 
        (o.salespersonId === emp.id || (o as any).customer?.assignedSalespersonId === emp.id) &&
        o.orderDate && new Date(o.orderDate) >= startOfMonth
      );
      const empStandaloneQuotesMTD = standaloneConfirmedQuotes.filter(q => 
        (q.salespersonId === emp.id || (q as any).customer?.assignedSalespersonId === emp.id) &&
        ((q.date && new Date(q.date) >= startOfMonth) || (q.createdAt && new Date(q.createdAt) >= startOfMonth))
      );

      const salesMTD = empOrdersMTD.reduce((sum, o) => sum + Number(o.totalValue || 0), 0) +
                       empStandaloneQuotesMTD.reduce((sum, q) => sum + Number(q.totalValue || 0), 0);
      const target = emp.target || 500000;
      return {
        id: emp.id,
        name: emp.user?.name || 'Unknown',
        sales: salesMTD,
        targetPercent: Math.min(100, Math.round((salesMTD / target) * 100))
      };
    }).sort((a, b) => b.sales - a.sales);

    const hotCustomers = hotLeads.map(lead => ({
      id: lead.id,
      businessName: lead.businessName,
      contactPerson: lead.contactPerson,
      mobile: lead.mobile,
      salesperson: lead.assignedSalesperson?.user?.name || 'Unassigned'
    }));

    const [sprintTeamHealth, reorderInsightsRes] = await Promise.all([
      getAdminSprintTeamHealth(orgId),
      getDormantAndReorderInsights()
    ]);

    const atRiskCount = reorderInsightsRes.success && reorderInsightsRes.data 
      ? (reorderInsightsRes.data.highRiskCount + reorderInsightsRes.data.dueForReorderCount) 
      : 0;

    return (
      <>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 20px 0 20px' }}>
          <BroadcastBanner userId={userId} userRole={userRole} />
        </div>
        <AdminDashboard 
          totalRevenue={totalRevenue}
          totalCustomers={totalCustomers}
          totalOrders={combinedTotalOrders}
          pendingCalls={pendingCalls}
          atRiskCustomersCount={atRiskCount}
          salesData={salesData}
          topProductsData={topProductsData}
          teamPerformance={teamPerformance}
          hotCustomers={hotCustomers}
          liveAttendance={liveAttendance}
          todayOrdersCount={todayOrdersCount}
          liveLeaderboard={liveLeaderboard}
          isCheckedIn={adminCheckedIn}
          isCheckedOut={adminCheckedOut}
          checkInTime={adminAtt?.checkIn ? adminAtt.checkIn.toISOString() : null}
          checkOutTime={adminAtt?.checkOut ? adminAtt.checkOut.toISOString() : null}
          sprintTeamHealth={sprintTeamHealth}
        />
      </>
    );
  } else if (userRole === 'TEAM_LEADER') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [teamMembers, teamCallsToday] = await Promise.all([
      prisma.employee.findMany({
        where: { organizationId: orgId },
        include: { user: true }
      }),
      prisma.call.findMany({
        where: { 
          createdAt: { gte: todayStart },
          OR: [
            { customer: { organizationId: orgId } },
            { lead: { organizationId: orgId } }
          ]
        },
        include: { customer: true, lead: true }
      })
    ]);

    return (
      <>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 20px 0 20px' }}>
          <BroadcastBanner userId={userId} userRole={userRole} />
        </div>
        <TeamLeaderDashboard 
          teamMembers={teamMembers}
          teamCallsToday={teamCallsToday}
        />
      </>
    );
  } else if (userRole === 'TELECALLER') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      attendanceRecord,
      todayTasks,
      missedCalls,
      todayCallsCount,
      recommendations
    ] = await Promise.all([
      employee ? prisma.attendance.findFirst({
        where: {
          employeeId: employee.id,
          date: {
            gte: todayStart,
            lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      }) : Promise.resolve(null),
      employee ? prisma.task.findMany({
        where: {
          assigneeId: employee.id,
          status: { not: 'Completed' },
          dueDate: { lte: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000) }
        }
      }) : Promise.resolve([]),
      employee ? prisma.call.findMany({
        where: {
          employeeId: employee.id,
          outcome: { in: ["Missed", "No Answer", "Busy", "Voicemail"] },
          OR: [
            { customer: { organizationId: orgId } },
            { lead: { organizationId: orgId } }
          ]
        },
        include: { customer: true, lead: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      }) : Promise.resolve([]),
      employee ? prisma.call.count({
        where: {
          employeeId: employee.id,
          createdAt: { gte: todayStart },
          OR: [
            { customer: { organizationId: orgId } },
            { lead: { organizationId: orgId } }
          ]
        }
      }) : Promise.resolve(0),
      getFollowUpRecommendations()
    ]);

    const isCheckedIn = !!attendanceRecord;
    const isCheckedOut = !!attendanceRecord?.checkOut;

    return (
      <>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 20px 0 20px' }}>
          <BroadcastBanner userId={userId} userRole={userRole} />
        </div>
        <TelecallerDashboard 
          employee={employee}
          isCheckedIn={isCheckedIn}
          isCheckedOut={isCheckedOut}
          checkInTime={attendanceRecord?.checkIn ? attendanceRecord.checkIn.toISOString() : null}
          checkOutTime={attendanceRecord?.checkOut ? attendanceRecord.checkOut.toISOString() : null}
          todayTasks={todayTasks}
          missedCalls={missedCalls}
          todayCallsCount={todayCallsCount}
          recommendations={recommendations.success ? recommendations : { overdue: [], reorderDue: [] }}
        />
      </>
    );
  } else {
    // ---------------------------------------------------------
    // EMPLOYEE / SALES DASHBOARD DATA
    // ---------------------------------------------------------
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      attendanceRecord,
      allEmployeeOrders,
      allConfirmedQuotations,
      allFollowUps,
      allOrgOrdersMTD,
      allOrgQuotesMTD,
      allOrgEmployees
    ] = await Promise.all([
      employee ? prisma.attendance.findFirst({
        where: {
          employeeId: employee.id,
          date: {
            gte: todayStart,
            lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      }) : Promise.resolve(null),
      employee ? prisma.order.findMany({
        where: {
          OR: [
            { salespersonId: employee.id },
            { customer: { assignedSalespersonId: employee.id } }
          ]
        },
        select: { 
          id: true, 
          orderNumber: true, 
          orderDate: true, 
          subtotal: true, 
          totalValue: true, 
          discount: true, 
          orderStatus: true,
          notes: true,
          customer: { select: { id: true, businessName: true, contactPerson: true, status: true, preferredPaymentMethod: true } } 
        },
        orderBy: { orderDate: 'desc' }
      }) : Promise.resolve([]),
      // Confirmed quotations count as sales for this salesperson
      employee ? prisma.quotation.findMany({
        where: {
          status: 'Confirmed',
          OR: [
            { salespersonId: employee.id },
            { customer: { assignedSalespersonId: employee.id } }
          ]
        },
        select: {
          id: true,
          quotationNumber: true,
          date: true,
          subtotal: true,
          totalValue: true,
          status: true,
          customer: { select: { id: true, businessName: true, contactPerson: true, status: true, preferredPaymentMethod: true } }
        },
        orderBy: { date: 'desc' }
      }) : Promise.resolve([]),
      employee ? prisma.call.findMany({
        where: {
          employeeId: employee.id,
          followUpDate: { not: null },
          OR: [
            { customer: { organizationId: orgId } },
            { lead: { organizationId: orgId } }
          ]
        },
        include: {
          customer: { select: { id: true, businessName: true, contactPerson: true, mobile: true, phone: true, whatsappNumber: true, leadStage: true, status: true, city: true, state: true } },
          lead: { select: { id: true, name: true, shopName: true, mobile: true, whatsappNumber: true, stage: true, city: true, state: true } }
        },
        orderBy: { followUpDate: 'asc' }
      }) : Promise.resolve([]),
      prisma.order.findMany({
        where: {
          organizationId: orgId,
          orderDate: { gte: startOfMonth }
        },
        include: { salesperson: { include: { user: true } } }
      }),
      prisma.quotation.findMany({
        where: {
          organizationId: orgId,
          status: { in: ['Confirmed', 'Converted'] },
          OR: [
            { date: { gte: startOfMonth } },
            { createdAt: { gte: startOfMonth } }
          ]
        },
        include: { salesperson: { include: { user: true } } }
      }),
      prisma.employee.findMany({
        where: { organizationId: orgId },
        include: { user: true }
      })
    ]);

    const isCheckedIn = !!attendanceRecord;
    const isCheckedOut = !!attendanceRecord?.checkOut;

    // Deduplicate confirmed quotations already converted to orders
    const convertedQuoteNumbersForEmp = new Set<string>();
    allEmployeeOrders.forEach((o: any) => {
      const match = (o.notes || '').match(/Quotation\s*#?\s*([A-Za-z0-9-]+)/i);
      if (match && match[1]) {
        convertedQuoteNumbersForEmp.add(match[1].trim());
      }
    });

    const standaloneConfirmedQuotAsOrders = allConfirmedQuotations
      .filter((q: any) => {
        if (q.status !== 'Confirmed') return false;
        const qNum = (q.quotationNumber || '').trim();
        if (qNum && convertedQuoteNumbersForEmp.has(qNum)) return false;
        if (qNum && allEmployeeOrders.some((o: any) => (o.notes || '').includes(qNum))) return false;
        return true;
      })
      .map((q: any) => ({
        id: q.id,
        orderNumber: q.quotationNumber,
        orderDate: q.date ? q.date.toISOString() : null,
        subtotal: Number(q.subtotal ?? q.totalValue ?? 0),
        totalValue: Number(q.totalValue ?? q.subtotal ?? 0),
        discount: 0,
        orderStatus: 'Confirmed',
        customer: q.customer
      }));

    // Combined list: real orders + standalone confirmed quotations
    const allCombinedSales = [
      ...allEmployeeOrders.map((o: any) => ({
        ...o,
        orderDate: o.orderDate ? o.orderDate.toISOString() : null,
        totalValue: Number(o.totalValue ?? o.subtotal ?? 0),
        subtotal: Number(o.subtotal ?? o.totalValue ?? 0)
      })),
      ...standaloneConfirmedQuotAsOrders
    ];

    const formattedOrders: OrderData[] = allCombinedSales
      .filter(o => o.orderDate && new Date(o.orderDate) >= startOfMonth)
      .map(order => ({
        id: order.id,
        taxableValue: Number(order.totalValue ?? order.subtotal ?? 0),
        discount: Number((order as any).discount || 0),
        isCreditCustomer: order.customer?.status?.toLowerCase() === 'credit' || order.customer?.preferredPaymentMethod?.toLowerCase() === 'credit'
      }));

    let activePolicy = undefined;
    try {
      const ruleRecord = await prisma.incentiveRule.findFirst({
        where: { name: "ORGANIZATION_ACTIVE_INCENTIVE_POLICY" },
        orderBy: { updatedAt: "desc" }
      });
      if (ruleRecord?.condition) {
        activePolicy = JSON.parse(ruleRecord.condition);
      }
    } catch (e) {}

    const targetGoal = employee?.target || 500000;
    const incentiveData = calculateIncentives(formattedOrders, targetGoal, activePolicy);

    // Filter out orphan/ghost calls without real customer or lead data
    const validFollowUps = allFollowUps.filter(c => {
      if (!c.followUpDate) return false;
      const hasCustomer = c.customer && Boolean((c.customer.businessName || '').trim() || (c.customer.contactPerson || '').trim());
      const hasLead = c.lead && Boolean((c.lead.shopName || '').trim() || (c.lead.name || '').trim());
      return hasCustomer || hasLead;
    });

    const todayFollowUps = validFollowUps.filter(c => {
      const d = new Date(c.followUpDate);
      return d >= todayStart && d < new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    });

    // Serialize cleanly for client component props - include confirmed quotations
    const serializedOrders = allCombinedSales;

    const serializedFollowUps = validFollowUps.map(f => ({
      ...f,
      followUpDate: f.followUpDate ? f.followUpDate.toISOString() : null,
      createdAt: f.createdAt ? f.createdAt.toISOString() : null
    }));

    const serializedTodayFollowUps = todayFollowUps.map(c => ({
      ...c,
      followUpDate: c.followUpDate ? c.followUpDate.toISOString() : null,
      createdAt: c.createdAt ? c.createdAt.toISOString() : null
    }));

    const sprintData = employee ? await getSprintData(employee.id) : null;

    // ---------------------------------------------------------
    // ORG-WIDE LEADERBOARDS: DAILY & MONTHLY
    // ---------------------------------------------------------
    // Find all quotation numbers that already have an order created
    const allConvertedQuoteNumbers = new Set<string>();
    allOrgOrdersMTD.forEach((o: any) => {
      const match = (o.notes || '').match(/Quotation\s*#?\s*([A-Za-z0-9-]+)/i);
      if (match && match[1]) {
        allConvertedQuoteNumbers.add(match[1].trim());
      }
    });

    // Standalone confirmed quotations (ONLY 'Confirmed' that are NOT yet converted and NOT represented in orders)
    const standaloneOrgConfirmedQuotes = allOrgQuotesMTD.filter((q: any) => {
      if (q.status !== 'Confirmed') return false;
      const qNum = (q.quotationNumber || '').trim();
      if (qNum && allConvertedQuoteNumbers.has(qNum)) return false;
      if (qNum && allOrgOrdersMTD.some((o: any) => (o.notes || '').includes(qNum))) return false;
      return true;
    });

    // 1. Daily Leaderboard (Today)
    const dailyMap: Record<string, { id: string, name: string, orders: number, total: number, isCurrentEmployee: boolean }> = {};
    let todayOrgOrdersCount = 0;

    allOrgOrdersMTD
      .filter(o => o.orderDate && new Date(o.orderDate) >= todayStart)
      .forEach(o => {
        todayOrgOrdersCount += 1;
        const spId = o.salespersonId || 'unassigned';
        const name = o.salesperson?.user?.name || 'Sales Champion';
        if (!dailyMap[spId]) {
          dailyMap[spId] = { id: spId, name, orders: 0, total: 0, isCurrentEmployee: spId === employee?.id };
        }
        dailyMap[spId].orders += 1;
        dailyMap[spId].total += Number(o.totalValue ?? o.subtotal ?? 0);
      });

    standaloneOrgConfirmedQuotes
      .filter(q => (q.date && new Date(q.date) >= todayStart) || (q.createdAt && new Date(q.createdAt) >= todayStart))
      .forEach(q => {
        todayOrgOrdersCount += 1;
        const spId = q.salespersonId || 'unassigned';
        const name = q.salesperson?.user?.name || 'Sales Champion';
        if (!dailyMap[spId]) {
          dailyMap[spId] = { id: spId, name, orders: 0, total: 0, isCurrentEmployee: spId === employee?.id };
        }
        dailyMap[spId].orders += 1;
        dailyMap[spId].total += Number(q.totalValue ?? q.subtotal ?? 0);
      });

    const dailyLeaderboard = Object.values(dailyMap).sort((a, b) => b.total - a.total);

    // 2. Monthly Leaderboard (MTD)
    const monthlyMap: Record<string, { id: string, name: string, orders: number, total: number, target: number, targetPercent: number, isCurrentEmployee: boolean }> = {};
    
    allOrgEmployees.forEach(emp => {
      const spId = emp.id;
      const target = emp.target || 500000;
      monthlyMap[spId] = {
        id: spId,
        name: emp.user?.name || 'Sales Champion',
        orders: 0,
        total: 0,
        target,
        targetPercent: 0,
        isCurrentEmployee: spId === employee?.id
      };
    });

    allOrgOrdersMTD.forEach(o => {
      const spId = o.salespersonId;
      if (spId && monthlyMap[spId]) {
        monthlyMap[spId].orders += 1;
        monthlyMap[spId].total += Number(o.totalValue ?? o.subtotal ?? 0);
      }
    });

    standaloneOrgConfirmedQuotes.forEach(q => {
      const spId = q.salespersonId;
      if (spId && monthlyMap[spId]) {
        monthlyMap[spId].orders += 1;
        monthlyMap[spId].total += Number(q.totalValue ?? q.subtotal ?? 0);
      }
    });

    Object.values(monthlyMap).forEach(m => {
      m.targetPercent = m.target > 0 ? Math.min(100, Math.round((m.total / m.target) * 100)) : 0;
    });

    const monthlyLeaderboard = Object.values(monthlyMap).sort((a, b) => b.total - a.total);

    return (
      <>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 20px 0 20px' }}>
          <BroadcastBanner userId={userId} userRole={userRole} />
        </div>
        <EmployeeDashboard 
          employee={employee}
          isCheckedIn={isCheckedIn}
          isCheckedOut={isCheckedOut}
          checkInTime={attendanceRecord?.checkIn ? attendanceRecord.checkIn.toISOString() : null}
          checkOutTime={attendanceRecord?.checkOut ? attendanceRecord.checkOut.toISOString() : null}
          incentiveData={incentiveData}
          todayFollowUps={serializedTodayFollowUps}
          allOrders={serializedOrders}
          allFollowUps={serializedFollowUps}
          sprintData={sprintData}
          dailyLeaderboard={dailyLeaderboard}
          monthlyLeaderboard={monthlyLeaderboard}
          todayOrdersCount={todayOrgOrdersCount}
        />
      </>
    );
  }
}
