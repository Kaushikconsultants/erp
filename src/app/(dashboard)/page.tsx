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
import './dashboard.css';

import { getTenantOrgId } from '@/lib/tenant';

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
      totalOrders,
      totalRevenueResult,
      confirmedQuotationsRevenue,
      confirmedQuotationsThisMonth,
      pendingCalls,
      adminAtt,
      todayOrdersCount,
      activeAttendances,
      todayOrdersList,
      allOrderItemsForTopCat,
      employees,
      hotLeads
    ] = await Promise.all([
      prisma.customer.count({ where: { organizationId: orgId } }),
      prisma.order.count({ where: { organizationId: orgId } }),
      prisma.order.aggregate({
        where: { organizationId: orgId },
        _sum: { totalValue: true }
      }),
      // Confirmed quotations count as confirmed sales - sum their totalValue
      prisma.quotation.aggregate({
        where: { organizationId: orgId, status: 'Confirmed' },
        _sum: { totalValue: true }
      }),
      // Confirmed quotations this month per salesperson for team performance
      prisma.quotation.findMany({
        where: {
          organizationId: orgId,
          status: 'Confirmed',
          date: { gte: startOfMonth }
        },
        select: { salespersonId: true, totalValue: true }
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
      prisma.order.count({
        where: { organizationId: orgId, orderDate: { gte: todayStartOfDay } }
      }),
      prisma.attendance.findMany({
        where: {
          date: { gte: todayStartOfDay },
          employee: { organizationId: orgId }
        },
        include: { employee: { include: { user: true } } },
        orderBy: { checkIn: 'desc' }
      }),
      prisma.order.findMany({
        where: { organizationId: orgId, orderDate: { gte: todayStartOfDay } },
        include: { salesperson: { include: { user: true } } }
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

    // Combine orders revenue + confirmed quotations revenue for total
    const ordersRevenue = totalRevenueResult._sum.totalValue || 0;
    const quotRevenue = confirmedQuotationsRevenue._sum.totalValue || 0;
    const totalRevenue = ordersRevenue + quotRevenue;
    const adminCheckedIn = !!adminAtt;
    const adminCheckedOut = !!adminAtt?.checkOut;

    // Build a map of confirmed quotation value per salesperson this month
    const confirmedQuotMap: Record<string, number> = {};
    for (const q of confirmedQuotationsThisMonth) {
      if (q.salespersonId) {
        confirmedQuotMap[q.salespersonId] = (confirmedQuotMap[q.salespersonId] || 0) + (q.totalValue || 0);
      }
    }

    const liveAttendance = activeAttendances.map(a => ({
      id: a.id,
      name: a.employee?.user?.name || 'Team Member',
      checkInStr: a.checkIn ? new Date(a.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : 'Just now',
      isShiftActive: !a.checkOut
    }));

    const salesMap: Record<string, { name: string, total: number, orders: number }> = {};
    todayOrdersList.forEach(o => {
      const spId = o.salespersonId;
      if (!salesMap[spId]) {
        salesMap[spId] = { name: o.salesperson?.user?.name || 'Unknown', total: 0, orders: 0 };
      }
      salesMap[spId].total += o.totalValue;
      salesMap[spId].orders += 1;
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
      const orderSalesMTD = emp.orders.reduce((sum, o) => sum + o.totalValue, 0);
      // Add confirmed quotation value to this employee's MTD sales
      const quotSalesMTD = confirmedQuotMap[emp.id] || 0;
      const salesMTD = orderSalesMTD + quotSalesMTD;
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

    return (
      <>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 20px 0 20px' }}>
          <BroadcastBanner userId={userId} userRole={userRole} />
        </div>
        <AdminDashboard 
          totalRevenue={totalRevenue}
          totalCustomers={totalCustomers}
          totalOrders={totalOrders}
          pendingCalls={pendingCalls}
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
          customer: { organizationId: orgId },
          createdAt: { gte: todayStart } 
        },
        include: { customer: true }
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
        },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      }) : Promise.resolve([]),
      employee ? prisma.call.count({
        where: {
          employeeId: employee.id,
          createdAt: { gte: todayStart }
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
      allFollowUps
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
          followUpDate: { not: null }
        },
        include: { customer: true },
        orderBy: { followUpDate: 'asc' }
      }) : Promise.resolve([])
    ]);

    const isCheckedIn = !!attendanceRecord;
    const isCheckedOut = !!attendanceRecord?.checkOut;

    // Merge confirmed quotations into the orders list so all metric cards see them
    // Map quotations to the same shape as orders (use orderDate = quote date)
    const confirmedQuotAsOrders = allConfirmedQuotations.map((q: any) => ({
      id: q.id,
      orderNumber: q.quotationNumber,
      orderDate: q.date ? q.date.toISOString() : null,
      subtotal: q.subtotal,
      totalValue: q.totalValue,
      discount: 0,
      orderStatus: 'Confirmed',
      customer: q.customer
    }));

    // Combined list: real orders + confirmed quotations
    const allCombinedSales = [
      ...allEmployeeOrders.map((o: any) => ({
        ...o,
        orderDate: o.orderDate ? o.orderDate.toISOString() : null
      })),
      ...confirmedQuotAsOrders
    ];

    const formattedOrders: OrderData[] = allCombinedSales
      .filter(o => o.orderDate && new Date(o.orderDate) >= startOfMonth)
      .map(order => ({
        id: order.id,
        taxableValue: Number(order.subtotal ?? order.totalValue ?? 0),
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

    const todayFollowUps = allFollowUps.filter(c => {
      if (!c.followUpDate) return false;
      const d = new Date(c.followUpDate);
      return d >= todayStart && d < new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    });

    // Serialize cleanly for client component props - include confirmed quotations
    const serializedOrders = allCombinedSales;

    const serializedFollowUps = allFollowUps.map(f => ({
      ...f,
      followUpDate: f.followUpDate ? f.followUpDate.toISOString() : null,
      createdAt: f.createdAt ? f.createdAt.toISOString() : null
    }));

    const serializedTodayFollowUps = todayFollowUps.map(c => ({
      ...c,
      followUpDate: c.followUpDate ? c.followUpDate.toISOString() : null,
      createdAt: c.createdAt ? c.createdAt.toISOString() : null
    }));

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
        />
      </>
    );
  }
}
