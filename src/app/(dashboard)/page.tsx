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
    // ADMIN DASHBOARD DATA (Tenant Scoped)
    // ---------------------------------------------------------
    const totalCustomers = await prisma.customer.count({
      where: { organizationId: orgId }
    });
    const totalOrders = await prisma.order.count({
      where: { organizationId: orgId }
    });
    const totalRevenueResult = await prisma.order.aggregate({
      where: { organizationId: orgId },
      _sum: { totalValue: true }
    });
    const totalRevenue = totalRevenueResult._sum.totalValue || 0;
    
    const todayStartOfDay = new Date();
    todayStartOfDay.setHours(0, 0, 0, 0);

    const pendingCalls = await prisma.call.count({
      where: { 
        customer: { organizationId: orgId },
        followUpDate: { gte: todayStartOfDay }
      }
    });

    // --- LIVE PANEL & ATTENDANCE DATA ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let adminCheckedIn = false;
    let adminCheckedOut = false;

    if (employee) {
      const adminAtt = await prisma.attendance.findFirst({
        where: {
          employeeId: employee.id,
          date: { gte: todayStart }
        }
      });
      if (adminAtt) {
        adminCheckedIn = true;
        if (adminAtt.checkOut) adminCheckedOut = true;
      }
    }

    const todayOrdersCount = await prisma.order.count({
      where: { organizationId: orgId, orderDate: { gte: todayStart } }
    });

    const activeAttendances = await prisma.attendance.findMany({
      where: {
        date: { gte: todayStart },
        employee: { organizationId: orgId }
      },
      include: { employee: { include: { user: true } } },
      orderBy: { checkIn: 'desc' }
    });
    
    const liveAttendance = activeAttendances.map(a => ({
      id: a.id,
      name: a.employee?.user?.name || 'Team Member',
      checkInStr: a.checkIn ? new Date(a.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : 'Just now',
      isShiftActive: !a.checkOut
    }));

    const todayOrdersList = await prisma.order.findMany({
      where: { organizationId: orgId, orderDate: { gte: todayStart } },
      include: { salesperson: { include: { user: true } } }
    });
    
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
    // -----------------------

    // Mock Sales Data for Chart (replace with real grouped data later)
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
    const allOrderItemsForTopCat = await prisma.orderItem.findMany({
      where: { order: { organizationId: orgId } },
      include: { product: true },
      take: 100
    });

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

    // Fetch team performance (Employees and their MTD sales)
    const employees = await prisma.employee.findMany({
      where: { organizationId: orgId },
      include: {
        user: true,
        orders: {
          where: { organizationId: orgId, orderDate: { gte: startOfMonth } },
          select: { totalValue: true }
        }
      }
    });

    const teamPerformance = employees.map(emp => {
      const salesMTD = emp.orders.reduce((sum, o) => sum + o.totalValue, 0);
      const target = emp.target || 500000;
      return {
        id: emp.id,
        name: emp.user?.name || 'Unknown',
        sales: salesMTD,
        targetPercent: Math.min(100, Math.round((salesMTD / target) * 100))
      };
    }).sort((a, b) => b.sales - a.sales); // sort highest sales first

    // Fetch Hot Customers (Negotiation stage)
    const hotLeads = await prisma.customer.findMany({
      where: { organizationId: orgId, leadStage: 'Negotiation' },
      include: { assignedSalesperson: { include: { user: true } } },
      take: 5,
      orderBy: { updatedAt: 'desc' }
    });

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
        />
      </>
    );
  } else if (userRole === 'TEAM_LEADER') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const teamMembers = await prisma.employee.findMany({
      where: { organizationId: orgId },
      include: { user: true }
    });

    const teamCallsToday = await prisma.call.findMany({
      where: { 
        customer: { organizationId: orgId },
        createdAt: { gte: todayStart } 
      },
      include: { customer: true }
    });

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
    let isCheckedIn = false;
    let isCheckedOut = false;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (employee) {
      const attendanceRecord = await prisma.attendance.findFirst({
        where: {
          employeeId: employee.id,
          date: {
            gte: todayStart,
            lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });
      if (attendanceRecord) {
        isCheckedIn = true;
        if (attendanceRecord.checkOut) {
          isCheckedOut = true;
        }
      }
    }

    const todayTasks = employee ? await prisma.task.findMany({
      where: {
        assigneeId: employee.id,
        status: { not: 'Completed' },
        dueDate: { lte: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000) }
      }
    }) : [];

    const missedCalls = employee ? await prisma.call.findMany({
      where: {
        employeeId: employee.id,
        outcome: { in: ["Missed", "No Answer", "Busy", "Voicemail"] },
      },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    }) : [];

    const todayCallsCount = employee ? await prisma.call.count({
      where: {
        employeeId: employee.id,
        createdAt: { gte: todayStart }
      }
    }) : 0;

    const recommendations = await getFollowUpRecommendations();

    return (
      <>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 20px 0 20px' }}>
          <BroadcastBanner userId={userId} userRole={userRole} />
        </div>
        <TelecallerDashboard 
          employee={employee}
          isCheckedIn={isCheckedIn}
          isCheckedOut={isCheckedOut}
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
    let isCheckedIn = false;
    let isCheckedOut = false;
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (employee) {

      const attendanceRecord = await prisma.attendance.findFirst({
        where: {
          employeeId: employee.id,
          date: {
            gte: todayStart,
            lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });

      if (attendanceRecord) {
        isCheckedIn = true;
        if (attendanceRecord.checkOut) {
          isCheckedOut = true;
        }
      }
    }

    // Fetch all employee orders (for Daily / Weekly / Monthly interactive filtering)
    const allEmployeeOrders = employee ? await prisma.order.findMany({
      where: {
        salespersonId: employee.id
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
    }) : [];

    const formattedOrders: OrderData[] = allEmployeeOrders
      .filter(o => o.orderDate && new Date(o.orderDate) >= startOfMonth)
      .map(order => ({
        id: order.id,
        taxableValue: Number(order.subtotal ?? order.totalValue ?? 0),
        discount: Number(order.discount || 0),
        isCreditCustomer: order.customer?.status?.toLowerCase() === 'credit' || order.customer?.preferredPaymentMethod?.toLowerCase() === 'credit'
      }));

    const targetGoal = employee?.target || 500000;
    const incentiveData = calculateIncentives(formattedOrders, targetGoal);

    // Fetch all follow-ups for employee
    const allFollowUps = employee ? await prisma.call.findMany({
      where: {
        employeeId: employee.id,
        followUpDate: { not: null }
      },
      include: { customer: true },
      orderBy: { followUpDate: 'asc' }
    }) : [];

    const todayFollowUps = allFollowUps.filter(c => {
      if (!c.followUpDate) return false;
      const d = new Date(c.followUpDate);
      return d >= todayStart && d < new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    });

    // Serialize cleanly for client component props
    const serializedOrders = allEmployeeOrders.map(o => ({
      ...o,
      orderDate: o.orderDate ? o.orderDate.toISOString() : null
    }));

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
          incentiveData={incentiveData}
          todayFollowUps={serializedTodayFollowUps}
          allOrders={serializedOrders}
          allFollowUps={serializedFollowUps}
        />
      </>
    );
  }
}
