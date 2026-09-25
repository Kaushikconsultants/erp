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
import { getOrCreateEmployee } from '@/lib/employeeHelper';
import './dashboard.css';

import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch (e) {
    console.error("Session lookup error on dashboard:", e);
  }
  
  if (!session?.user) {
    redirect('/login');
  }

  const userEmail = session.user.email ? session.user.email.trim().toLowerCase() : null;
  let userId = (session.user as any)?.id || (session.user as any)?.sub;
  let userRole = (session.user as any)?.role || 'SALES';

  // If userId or role is missing from session, fetch directly from DB
  if ((!userId || !userRole) && userEmail) {
    try {
      const dbUser = await prisma.user.findFirst({
        where: { email: { equals: userEmail, mode: 'insensitive' } }
      });
      if (dbUser) {
        userId = dbUser.id;
        userRole = dbUser.role || userRole;
      }
    } catch (e) {
      console.error("User DB lookup error:", e);
    }
  }

  let orgId = (session.user as any)?.organizationId;
  if (!orgId) {
    try {
      orgId = await getTenantOrgId();
    } catch (e) {
      console.error("Failed to get tenant org id:", e);
    }
  }

  // Find the employee profile linked to this user safely
  let employee = null;
  if (userId) {
    try {
      employee = await prisma.employee.findUnique({
        where: { userId: userId },
        include: { user: true }
      });
    } catch (e) {
      console.error("Employee lookup error by userId:", e);
    }
  }

  if (!employee && userEmail) {
    try {
      employee = await prisma.employee.findFirst({
        where: {
          user: { email: { equals: userEmail, mode: 'insensitive' } }
        },
        include: { user: true }
      });
    } catch (e) {
      console.error("Employee lookup error by email:", e);
    }
  }

  // For non-admin roles without an employee record, auto-create one
  if (!employee && userId && userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    try {
      employee = await getOrCreateEmployee(userId, session.user);
    } catch (e) {
      console.error("Failed to auto-create employee profile:", e);
    }
  }

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
    // ---------------------------------------------------------
    // ADMIN DASHBOARD DATA (Tenant Scoped - Concurrent Fetching)
    // ---------------------------------------------------------
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const istYear = istNow.getUTCFullYear();
    const istMonth = istNow.getUTCMonth();
    const istDate = istNow.getUTCDate();

    const todayStartOfDay = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0) - istOffset);
    const todayEndOfDay = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffset);

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
      prisma.customer.count({ where: orgId ? { organizationId: orgId } : {} }).catch(() => 0),
      prisma.order.findMany({
        where: orgId ? { organizationId: orgId } : {},
        include: { salesperson: { include: { user: true } }, customer: true }
      }).catch(() => []),
      prisma.quotation.findMany({
        where: { 
          ...(orgId ? { organizationId: orgId } : {}), 
          status: { in: ['Confirmed', 'Converted'] } 
        },
        include: { 
          salesperson: { include: { user: true } }, 
          customer: true,
          activities: {
            where: { action: { in: ['Quotation Confirmed', 'Converted to Order'] } },
            select: { action: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 2
          }
        }
      }).catch(() => []),
      prisma.call.count({
        where: { 
          OR: [
            { customer: orgId ? { organizationId: orgId } : {} },
            { lead: orgId ? { organizationId: orgId } : {} }
          ],
          followUpDate: { gte: todayStartOfDay, lte: todayEndOfDay }
        }
      }).catch(() => 0),
      (employee?.id) ? prisma.attendance.findMany({
        where: {
          employeeId: employee.id,
          date: { gte: todayStartOfDay, lte: todayEndOfDay }
        },
        orderBy: [
          { checkIn: 'desc' },
          { createdAt: 'desc' }
        ]
      }).then((atts: any[]) => atts.find((a: any) => !a.checkOut) || atts[0] || null).catch(() => null) : Promise.resolve(null),
      prisma.attendance.findMany({
        where: {
          OR: [
            { date: { gte: todayStartOfDay, lte: todayEndOfDay } },
            { checkIn: { gte: todayStartOfDay, lte: todayEndOfDay } },
            { createdAt: { gte: todayStartOfDay, lte: todayEndOfDay } }
          ],
          ...(orgId ? {
            employee: {
              OR: [
                { organizationId: orgId },
                { user: { organizationId: orgId } }
              ]
            }
          } : {})
        },
        include: { employee: { include: { user: true } } },
        orderBy: [
          { checkIn: 'desc' },
          { createdAt: 'desc' }
        ]
      }).catch(() => []),
      prisma.orderItem.findMany({
        where: orgId ? { order: { organizationId: orgId } } : {},
        include: { product: true },
        take: 100
      }).catch(() => []),
      prisma.employee.findMany({
        where: {
          employmentStatus: { not: 'Inactive' },
          ...(orgId ? {
            OR: [
              { organizationId: orgId },
              { user: { organizationId: orgId } }
            ]
          } : {})
        },
        include: {
          user: true,
          orders: {
            where: { ...(orgId ? { organizationId: orgId } : {}), orderDate: { gte: startOfMonth } },
            select: { totalValue: true }
          }
        },
        orderBy: { user: { name: 'asc' } }
      }).catch(() => []),
      prisma.customer.findMany({
        where: { ...(orgId ? { organizationId: orgId } : {}), leadStage: 'Negotiation' },
        include: { assignedSalesperson: { include: { user: true } } },
        take: 5,
        orderBy: { updatedAt: 'desc' }
      }).catch(() => [])
    ]);

    // Build lookup map for org confirmed/converted quotes to trace original deal closing date
    const orgQuoteByNumber = new Map<string, any>();
    allConfirmedQuotesInOrg.forEach((q: any) => {
      if (q.quotationNumber) {
        orgQuoteByNumber.set(q.quotationNumber.trim().toUpperCase(), q);
      }
    });

    // Quotation numbers already represented as Orders
    const convertedQuoteNumbers = new Set<string>();
    allOrdersInOrg.forEach((o: any) => {
      const match = (o.notes || '').match(/Quotation\s*#?\s*([A-Za-z0-9\-_/.]+)/i);
      if (match && match[1]) {
        convertedQuoteNumbers.add(match[1].trim().toUpperCase());
      }
    });

    // Standalone confirmed quotations (not yet an Order in prisma.order)
    const standaloneConfirmedQuotes = allConfirmedQuotesInOrg.filter((q: any) => {
      if (q.status !== 'Confirmed') return false;
      const qNum = (q.quotationNumber || '').trim().toUpperCase();
      if (!qNum) return false;
      if (convertedQuoteNumbers.has(qNum)) return false;
      if (allOrdersInOrg.some((o: any) => (o.notes || '').toUpperCase().includes(qNum))) return false;
      return true;
    });

    // Helper: determine the true deal confirmation date (when quote was confirmed/won)
    const getQuotationDealDate = (q: any): Date => {
      if (q.acceptedDate) return new Date(q.acceptedDate);
      if (q.activities && q.activities.length > 0) {
        const confirmAct = q.activities.find((a: any) => a.action === 'Quotation Confirmed');
        if (confirmAct?.createdAt) return new Date(confirmAct.createdAt);
        const convertAct = q.activities.find((a: any) => a.action === 'Converted to Order');
        if (convertAct?.createdAt) return new Date(convertAct.createdAt);
      }
      if ((q.status === 'Confirmed' || q.status === 'Converted') && q.updatedAt) {
        return new Date(q.updatedAt);
      }
      return q.date ? new Date(q.date) : (q.createdAt ? new Date(q.createdAt) : new Date());
    };

    // Helper: determine the true deal closing date for an order (if converted from a quotation, use quotation's confirmation deal date)
    const getEffectiveOrderDate = (o: any): Date => {
      const match = (o.notes || '').match(/Quotation\s*#?\s*([A-Za-z0-9\-_/.]+)/i);
      if (match && match[1]) {
        const qNum = match[1].trim().toUpperCase();
        const linkedQuote = orgQuoteByNumber.get(qNum);
        if (linkedQuote) {
          return getQuotationDealDate(linkedQuote);
        }
      }
      return o.orderDate ? new Date(o.orderDate) : (o.createdAt ? new Date(o.createdAt) : new Date());
    };

    // Total Revenue & Combined Total Orders
    const ordersRevenue = allOrdersInOrg.reduce((sum: number, o: any) => sum + Number(o.totalValue || 0), 0);
    const standaloneQuotRevenue = standaloneConfirmedQuotes.reduce((sum: number, q: any) => sum + Number(q.totalValue || 0), 0);
    const totalRevenue = ordersRevenue + standaloneQuotRevenue;
    const combinedTotalOrders = allOrdersInOrg.length + standaloneConfirmedQuotes.length;

    const adminCheckedIn = !!adminAtt?.checkIn || (!!adminAtt && adminAtt.status === 'Present');
    const adminCheckedOut = !!adminAtt?.checkOut;

    // Deduplicate attendance records per employee with robust priority scoring
    const getAttendanceScore = (rec: any): number => {
      const hasIn = !!rec.checkIn;
      const hasOut = !!rec.checkOut;
      const st = (rec.status || '').toLowerCase();
      if (hasIn && !hasOut) return 100; // Actively working shift
      if (hasIn && hasOut) return 80;   // Completed shift
      if (st === 'leave') return 70;    // On Leave
      if (st === 'half day') return 60; // Half Day
      if (hasIn) return 50;             // Punched in
      if (st === 'present') return 30;  // Present
      return 10;                        // Placeholder / Pending
    };

    const attendanceByEmployee = new Map<string, any>();
    activeAttendances.forEach((a: any) => {
      const empKey = a.employeeId || a.employee?.id || a.id;
      if (!attendanceByEmployee.has(empKey)) {
        attendanceByEmployee.set(empKey, a);
      } else {
        const existing = attendanceByEmployee.get(empKey);
        const scoreA = getAttendanceScore(a);
        const scoreExisting = getAttendanceScore(existing);

        if (scoreA > scoreExisting) {
          attendanceByEmployee.set(empKey, a);
        } else if (scoreA === scoreExisting) {
          const timeA = new Date(a.checkIn || a.createdAt || a.date).getTime();
          const timeExisting = new Date(existing.checkIn || existing.createdAt || existing.date).getTime();
          if (timeA > timeExisting) {
            attendanceByEmployee.set(empKey, a);
          }
        }
      }
    });

    const liveAttendance: any[] = [];
    const processedEmpIds = new Set<string>();

    (employees || []).forEach((emp: any) => {
      processedEmpIds.add(emp.id);
      const a = attendanceByEmployee.get(emp.id);

      if (a) {
        const hasActualCheckIn = !!a.checkIn;
        const hasActualCheckOut = !!a.checkOut;
        const rawStatus = (a.status || '').toLowerCase();
        const isLeave = rawStatus === 'leave';
        const isHalfDay = rawStatus === 'half day';
        const isAbsent = rawStatus === 'absent';
        const isPresent = rawStatus === 'present' || (!isLeave && !isAbsent && !isHalfDay);

        const isShiftActive = isPresent && hasActualCheckIn && !hasActualCheckOut;

        let checkInStr = 'Not Checked In';
        if (a.checkIn) {
          try {
            checkInStr = new Date(a.checkIn).toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }).toUpperCase();
          } catch {
            checkInStr = new Date(a.checkIn).toLocaleTimeString().toUpperCase();
          }
        } else if (isLeave) {
          checkInStr = 'LEAVE';
        } else if (a.status && a.status.toLowerCase() !== 'present') {
          checkInStr = a.status.toUpperCase();
        }

        let checkOutStr = null;
        if (a.checkOut) {
          try {
            checkOutStr = new Date(a.checkOut).toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }).toUpperCase();
          } catch {
            checkOutStr = new Date(a.checkOut).toLocaleTimeString().toUpperCase();
          }
        }

        let resolvedStatus = 'Present';
        if (isLeave) {
          resolvedStatus = 'Leave';
        } else if (isAbsent) {
          resolvedStatus = 'Absent';
        } else if (isHalfDay) {
          resolvedStatus = 'Half Day';
        } else if (hasActualCheckOut) {
          resolvedStatus = 'Shift Ended';
        } else if (hasActualCheckIn) {
          resolvedStatus = 'Present';
        } else {
          resolvedStatus = a.status || 'Pending';
        }

        liveAttendance.push({
          id: a.id,
          employeeId: emp.id,
          name: emp.user?.name || emp.employeeId || 'Team Member',
          role: emp.user?.role || emp.department || 'Staff',
          checkIn: a.checkIn ? new Date(a.checkIn).toISOString() : null,
          checkOut: a.checkOut ? new Date(a.checkOut).toISOString() : null,
          checkInStr,
          checkOutStr,
          status: resolvedStatus,
          isShiftActive,
          isCheckedOut: hasActualCheckOut
        });
      } else {
        // Employee exists but has not checked in today
        liveAttendance.push({
          id: `unmarked-${emp.id}`,
          employeeId: emp.id,
          name: emp.user?.name || emp.employeeId || 'Team Member',
          role: emp.user?.role || emp.department || 'Staff',
          checkIn: null,
          checkOut: null,
          checkInStr: 'Not Checked In',
          checkOutStr: null,
          status: 'Not Marked',
          isShiftActive: false,
          isCheckedOut: false
        });
      }
    });

    // Also include any attendee not in the main employees array
    attendanceByEmployee.forEach((a: any, empId: string) => {
      if (!processedEmpIds.has(empId)) {
        const hasActualCheckIn = !!a.checkIn;
        const hasActualCheckOut = !!a.checkOut;
        const rawStatus = (a.status || '').toLowerCase();
        const isLeave = rawStatus === 'leave';
        const isHalfDay = rawStatus === 'half day';
        const isAbsent = rawStatus === 'absent';
        const isPresent = rawStatus === 'present' || (!isLeave && !isAbsent && !isHalfDay);
        const isShiftActive = isPresent && hasActualCheckIn && !hasActualCheckOut;

        let checkInStr = 'Not Checked In';
        if (a.checkIn) {
          try {
            checkInStr = new Date(a.checkIn).toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }).toUpperCase();
          } catch {
            checkInStr = new Date(a.checkIn).toLocaleTimeString().toUpperCase();
          }
        }

        let checkOutStr = null;
        if (a.checkOut) {
          try {
            checkOutStr = new Date(a.checkOut).toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }).toUpperCase();
          } catch {
            checkOutStr = new Date(a.checkOut).toLocaleTimeString().toUpperCase();
          }
        }

        let resolvedStatus = 'Present';
        if (isLeave) resolvedStatus = 'Leave';
        else if (isAbsent) resolvedStatus = 'Absent';
        else if (isHalfDay) resolvedStatus = 'Half Day';
        else if (hasActualCheckOut) resolvedStatus = 'Shift Ended';
        else if (hasActualCheckIn) resolvedStatus = 'Present';
        else resolvedStatus = a.status || 'Pending';

        liveAttendance.push({
          id: a.id,
          employeeId: empId,
          name: a.employee?.user?.name || a.employee?.employeeId || 'Team Member',
          role: a.employee?.user?.role || a.employee?.department || 'Staff',
          checkIn: a.checkIn ? new Date(a.checkIn).toISOString() : null,
          checkOut: a.checkOut ? new Date(a.checkOut).toISOString() : null,
          checkInStr,
          checkOutStr,
          status: resolvedStatus,
          isShiftActive,
          isCheckedOut: hasActualCheckOut
        });
      }
    });

    // Sort: Active first, then Shift Ended, then Leave, then Not Marked
    liveAttendance.sort((a, b) => {
      if (a.isShiftActive && !b.isShiftActive) return -1;
      if (!a.isShiftActive && b.isShiftActive) return 1;
      if (a.isCheckedOut && !b.isCheckedOut) return -1;
      if (!a.isCheckedOut && b.isCheckedOut) return 1;
      return a.name.localeCompare(b.name);
    });

    // Today's orders count and live leaderboard
    const salesMap: Record<string, { name: string, total: number, orders: number }> = {};
    let todayOrdersCount = 0;

    allOrdersInOrg
      .filter((o: any) => {
        const effDate = getEffectiveOrderDate(o);
        return effDate >= todayStartOfDay && effDate <= todayEndOfDay;
      })
      .forEach((o: any) => {
        todayOrdersCount += 1;
        const spId = o.salespersonId || 'unassigned';
        if (!salesMap[spId]) {
          salesMap[spId] = { name: o.salesperson?.user?.name || 'Unknown', total: 0, orders: 0 };
        }
        salesMap[spId].total += Number(o.totalValue || 0);
        salesMap[spId].orders += 1;
      });

    standaloneConfirmedQuotes
      .filter((q: any) => {
        const qDate = getQuotationDealDate(q);
        return qDate >= todayStartOfDay && qDate <= todayEndOfDay;
      })
      .forEach((q: any) => {
        todayOrdersCount += 1;
        const spId = q.salespersonId || 'unassigned';
        if (spId) {
          if (!salesMap[spId]) {
            salesMap[spId] = { name: q.salesperson?.user?.name || 'Unknown', total: 0, orders: 0 };
          }
          salesMap[spId].total += Number(q.totalValue || 0);
          salesMap[spId].orders += 1;
        }
      });

    const liveLeaderboard = Object.values(salesMap).sort((a, b) => b.total - a.total);

    // ---------------------------------------------------------
    // REAL DAILY SALES DATA ACCORDING TO ACTUAL ORDER DATES
    // ---------------------------------------------------------
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayOfWeek = istNow.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    // 1. Current Week (Monday to Sunday in IST)
    const thisWeekData = dayNames.map((name, i) => {
      const dayStartIST = new Date(Date.UTC(istYear, istMonth, istDate + mondayOffset + i, 0, 0, 0, 0));
      const dayEndIST = new Date(Date.UTC(istYear, istMonth, istDate + mondayOffset + i, 23, 59, 59, 999));
      const dayStartUTC = new Date(dayStartIST.getTime() - istOffset);
      const dayEndUTC = new Date(dayEndIST.getTime() - istOffset);

      const ordersSum = allOrdersInOrg
        .filter((o: any) => {
          const d = getEffectiveOrderDate(o);
          return d >= dayStartUTC && d <= dayEndUTC;
        })
        .reduce((sum: number, o: any) => sum + Number(o.totalValue || 0), 0);

      const quotesSum = standaloneConfirmedQuotes
        .filter((q: any) => {
          const d = getQuotationDealDate(q);
          return d >= dayStartUTC && d <= dayEndUTC;
        })
        .reduce((sum: number, q: any) => sum + Number(q.totalValue || 0), 0);

      const monthShort = dayStartIST.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' });
      return {
        name,
        sales: Math.round(ordersSum + quotesSum),
        dateStr: `${dayStartIST.getUTCDate()} ${monthShort}`
      };
    });

    // 2. Rolling Last 7 Days (ending today)
    const last7DaysData = Array.from({ length: 7 }, (_, idx) => {
      const dayIndex = 6 - idx; // 6 days ago ... today
      const targetIST = new Date(Date.UTC(istYear, istMonth, istDate - dayIndex, 0, 0, 0, 0));
      const targetEndIST = new Date(Date.UTC(istYear, istMonth, istDate - dayIndex, 23, 59, 59, 999));
      const startUTC = new Date(targetIST.getTime() - istOffset);
      const endUTC = new Date(targetEndIST.getTime() - istOffset);

      const dayOfWeekIdx = targetIST.getUTCDay();
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeekIdx];

      const ordersSum = allOrdersInOrg
        .filter((o: any) => {
          const d = getEffectiveOrderDate(o);
          return d >= startUTC && d <= endUTC;
        })
        .reduce((sum: number, o: any) => sum + Number(o.totalValue || 0), 0);

      const quotesSum = standaloneConfirmedQuotes
        .filter((q: any) => {
          const d = getQuotationDealDate(q);
          return d >= startUTC && d <= endUTC;
        })
        .reduce((sum: number, q: any) => sum + Number(q.totalValue || 0), 0);

      const monthShort = targetIST.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' });
      return {
        name: dayIndex === 0 ? 'Today' : dayName,
        sales: Math.round(ordersSum + quotesSum),
        dateStr: `${targetIST.getUTCDate()} ${monthShort}`
      };
    });

    // 3. Day of Week distribution across all orders (All Time)
    const dayOfWeekMap: Record<string, number> = {
      Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0
    };

    allOrdersInOrg.forEach((o: any) => {
      const d = getEffectiveOrderDate(o);
      const istD = new Date(d.getTime() + istOffset);
      const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][istD.getUTCDay()];
      if (dayOfWeekMap[day] !== undefined) {
        dayOfWeekMap[day] += Number(o.totalValue || 0);
      }
    });

    standaloneConfirmedQuotes.forEach((q: any) => {
      const d = getQuotationDealDate(q);
      const istD = new Date(d.getTime() + istOffset);
      const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][istD.getUTCDay()];
      if (dayOfWeekMap[day] !== undefined) {
        dayOfWeekMap[day] += Number(q.totalValue || 0);
      }
    });

    const allDaysData = dayNames.map(name => ({
      name,
      sales: Math.round(dayOfWeekMap[name] || 0)
    }));

    // 4. Current Month Daily Breakdown
    const daysInMonth = new Date(istYear, istMonth + 1, 0).getDate();
    const thisMonthData = Array.from({ length: daysInMonth }, (_, idx) => {
      const dayNum = idx + 1;
      const startIST = new Date(Date.UTC(istYear, istMonth, dayNum, 0, 0, 0, 0));
      const endIST = new Date(Date.UTC(istYear, istMonth, dayNum, 23, 59, 59, 999));
      const startUTC = new Date(startIST.getTime() - istOffset);
      const endUTC = new Date(endIST.getTime() - istOffset);

      const ordersSum = allOrdersInOrg
        .filter((o: any) => {
          const d = getEffectiveOrderDate(o);
          return d >= startUTC && d <= endUTC;
        })
        .reduce((sum: number, o: any) => sum + Number(o.totalValue || 0), 0);

      const quotesSum = standaloneConfirmedQuotes
        .filter((q: any) => {
          const d = getQuotationDealDate(q);
          return d >= startUTC && d <= endUTC;
        })
        .reduce((sum: number, q: any) => sum + Number(q.totalValue || 0), 0);

      return {
        name: `${dayNum}`,
        sales: Math.round(ordersSum + quotesSum),
        dateStr: `${dayNum} ${startIST.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' })}`
      };
    });

    const thisWeekTotal = thisWeekData.reduce((sum, d) => sum + d.sales, 0);
    const last7DaysTotal = last7DaysData.reduce((sum, d) => sum + d.sales, 0);
    const allDaysTotal = allDaysData.reduce((sum, d) => sum + d.sales, 0);

    const salesData = {
      thisWeek: thisWeekData,
      last7Days: last7DaysData,
      thisMonth: thisMonthData,
      allDays: allDaysData,
      defaultView: thisWeekTotal > 0 ? 'THIS_WEEK' : (last7DaysTotal > 0 ? 'LAST_7_DAYS' : (allDaysTotal > 0 ? 'ALL_DAYS' : 'THIS_WEEK'))
    };

    // Calculate Top Categories from real DB order items if available
    const categoryMap: Record<string, number> = {};
    allOrderItemsForTopCat.forEach((item: any) => {
      const catName = item.product?.category || 'Uncategorized';
      categoryMap[catName] = (categoryMap[catName] || 0) + (Number(item.total) || 0);
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

    const teamPerformance = (employees || []).map((emp: any) => {
      const empOrdersMTD = (allOrdersInOrg || []).filter((o: any) => 
        (o.salespersonId === emp.id || (o as any).customer?.assignedSalespersonId === emp.id) &&
        getEffectiveOrderDate(o) >= startOfMonth
      );
      const empStandaloneQuotesMTD = (standaloneConfirmedQuotes || []).filter((q: any) => 
        (q.salespersonId === emp.id || (q as any).customer?.assignedSalespersonId === emp.id) &&
        getQuotationDealDate(q) >= startOfMonth
      );

      const salesMTD = empOrdersMTD.reduce((sum: number, o: any) => sum + Number(o.totalValue || 0), 0) +
                       empStandaloneQuotesMTD.reduce((sum: number, q: any) => sum + Number(q.totalValue || 0), 0);
      const target = (emp.target !== null && emp.target !== undefined && Number(emp.target) > 0) ? Number(emp.target) : 500000;
      return {
        id: emp.id,
        name: emp.user?.name || 'Unknown',
        sales: salesMTD,
        target: target,
        targetPercent: target > 0 ? Math.min(100, Math.round((salesMTD / target) * 100)) : 0
      };
    }).sort((a: any, b: any) => b.sales - a.sales);

    const hotCustomers = (hotLeads || []).map((lead: any) => ({
      id: lead.id,
      businessName: lead.businessName,
      contactPerson: lead.contactPerson,
      mobile: lead.mobile,
      salesperson: lead.assignedSalesperson?.user?.name || 'Unassigned'
    }));

    let sprintTeamHealth: any[] = [];
    let reorderInsightsRes: any = { success: false, data: null };
    try {
      [sprintTeamHealth, reorderInsightsRes] = await Promise.all([
        getAdminSprintTeamHealth(orgId).catch(() => []),
        getDormantAndReorderInsights().catch(() => ({ success: false }))
      ]);
    } catch (e) {
      console.error("Admin sprint/reorder insights fetch error:", e);
    }

    const atRiskCount = reorderInsightsRes?.success && reorderInsightsRes.data 
      ? ((reorderInsightsRes.data.highRiskCount || 0) + (reorderInsightsRes.data.dueForReorderCount || 0)) 
      : 0;

    return (
      <>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 20px 0 20px' }}>
          <BroadcastBanner userId={userId || ''} userRole={userRole} />
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
        where: orgId ? { organizationId: orgId } : {},
        include: { user: true }
      }).catch(() => []),
      prisma.call.findMany({
        where: { 
          createdAt: { gte: todayStart },
          OR: [
            { customer: orgId ? { organizationId: orgId } : {} },
            { lead: orgId ? { organizationId: orgId } : {} }
          ]
        },
        include: { customer: true, lead: true }
      }).catch(() => [])
    ]);

    return (
      <>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 20px 0 20px' }}>
          <BroadcastBanner userId={userId || ''} userRole={userRole} />
        </div>
        <TeamLeaderDashboard 
          teamMembers={teamMembers}
          teamCallsToday={teamCallsToday}
        />
      </>
    );
  } else if (userRole === 'TELECALLER') {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const istYear = istNow.getUTCFullYear();
    const istMonth = istNow.getUTCMonth();
    const istDate = istNow.getUTCDate();

    const todayStart = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0) - istOffset);
    const todayEnd = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffset);
    const startOfMonth = new Date(istYear, istMonth, 1);

    const [
      attendanceRecord,
      todayTasks,
      missedCalls,
      todayCallsCount,
      recommendations
    ] = await Promise.all([
      employee?.id ? prisma.attendance.findMany({
        where: {
          employeeId: employee.id,
          date: {
            gte: todayStart,
            lte: todayEnd
          }
        },
        orderBy: [
          { checkIn: 'desc' },
          { createdAt: 'desc' }
        ]
      }).then((atts: any[]) => atts.find((a: any) => !a.checkOut) || atts[0] || null).catch(() => null) : Promise.resolve(null),
      employee?.id ? prisma.task.findMany({
        where: {
          assigneeId: employee.id,
          status: { not: 'Completed' },
          dueDate: { lte: todayEnd }
        }
      }).catch(() => []) : Promise.resolve([]),
      employee?.id ? prisma.call.findMany({
        where: {
          employeeId: employee.id,
          outcome: { in: ["Missed", "No Answer", "Busy", "Voicemail"] },
          OR: [
            { customer: orgId ? { organizationId: orgId } : {} },
            { lead: orgId ? { organizationId: orgId } : {} }
          ]
        },
        include: { customer: true, lead: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      }).catch(() => []) : Promise.resolve([]),
      employee?.id ? prisma.call.count({
        where: {
          employeeId: employee.id,
          createdAt: { gte: todayStart },
          OR: [
            { customer: orgId ? { organizationId: orgId } : {} },
            { lead: orgId ? { organizationId: orgId } : {} }
          ]
        }
      }).catch(() => 0) : Promise.resolve(0),
      getFollowUpRecommendations().catch(() => ({ success: false, overdue: [], reorderDue: [] }))
    ]);

    const isCheckedIn = !!attendanceRecord?.checkIn || (!!attendanceRecord && attendanceRecord.status === 'Present');
    const isCheckedOut = !!attendanceRecord?.checkOut;

    return (
      <>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 20px 0 20px' }}>
          <BroadcastBanner userId={userId || ''} userRole={userRole} />
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
          recommendations={recommendations?.success ? recommendations : { overdue: [], reorderDue: [] }}
        />
      </>
    );
  } else {
    // ---------------------------------------------------------
    // EMPLOYEE / SALES DASHBOARD DATA
    // ---------------------------------------------------------
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const istYear = istNow.getUTCFullYear();
    const istMonth = istNow.getUTCMonth();
    const istDate = istNow.getUTCDate();

    const todayStart = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0) - istOffset);
    const todayEnd = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffset);
    const startOfMonth = new Date(istYear, istMonth, 1);

    const [
      attendanceRecord,
      allEmployeeOrders,
      allConfirmedQuotations,
      allFollowUps,
      allOrgOrdersMTD,
      allOrgQuotesMTD,
      allOrgEmployees
    ] = await Promise.all([
      employee?.id ? prisma.attendance.findMany({
        where: {
          employeeId: employee.id,
          date: {
            gte: todayStart,
            lte: todayEnd
          }
        },
        orderBy: [
          { checkIn: 'desc' },
          { createdAt: 'desc' }
        ]
      }).then((atts: any[]) => atts.find((a: any) => !a.checkOut) || atts[0] || null).catch(() => null) : Promise.resolve(null),
      employee?.id ? prisma.order.findMany({
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
      }).catch(() => []) : Promise.resolve([]),
      // Confirmed quotations count as sales for this salesperson
      employee?.id ? prisma.quotation.findMany({
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
          createdAt: true,
          customer: { select: { id: true, businessName: true, contactPerson: true, status: true, preferredPaymentMethod: true } } 
        },
        orderBy: { date: 'desc' }
      }).catch(() => []) : Promise.resolve([]),
      employee?.id ? prisma.call.findMany({
        where: {
          followUpDate: { not: null },
          OR: [
            { employeeId: employee.id },
            { customer: { assignedSalespersonId: employee.id } },
            { lead: { assignedSalespersonId: employee.id } }
          ],
          ...(orgId ? {
            AND: [
              {
                OR: [
                  { customer: { organizationId: orgId } },
                  { lead: { organizationId: orgId } },
                  { employee: { organizationId: orgId } }
                ]
              }
            ]
          } : {})
        },
        include: {
          customer: true,
          lead: true,
          employee: { include: { user: true } }
        },
        orderBy: { followUpDate: 'asc' }
      }).catch((err) => {
        console.error("Employee dashboard follow-ups fetch error:", err);
        return [];
      }) : Promise.resolve([]),
      prisma.order.findMany({
        where: {
          ...(orgId ? { organizationId: orgId } : {}),
          orderDate: { gte: startOfMonth }
        },
        include: { salesperson: { include: { user: true } } }
      }).catch(() => []),
      prisma.quotation.findMany({
        where: {
          ...(orgId ? { organizationId: orgId } : {}),
          status: { in: ['Confirmed', 'Converted'] },
          OR: [
            { date: { gte: startOfMonth } },
            { createdAt: { gte: startOfMonth } },
            { acceptedDate: { gte: startOfMonth } },
            { updatedAt: { gte: startOfMonth } }
          ]
        },
        include: { 
          salesperson: { include: { user: true } },
          activities: {
            where: { action: { in: ['Quotation Confirmed', 'Converted to Order'] } },
            select: { action: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 2
          }
        }
      }).catch(() => []),
      prisma.employee.findMany({
        where: orgId ? { organizationId: orgId } : {},
        include: { user: true }
      }).catch(() => [])
    ]);

    const isCheckedIn = !!attendanceRecord;
    const isCheckedOut = !!attendanceRecord?.checkOut;

    const empQuoteByNumber = new Map<string, any>();
    allConfirmedQuotations.forEach((q: any) => {
      if (q.quotationNumber) {
        empQuoteByNumber.set(q.quotationNumber.trim().toUpperCase(), q);
      }
    });

    // Deduplicate confirmed quotations already converted to orders
    const convertedQuoteNumbersForEmp = new Set<string>();
    allEmployeeOrders.forEach((o: any) => {
      const match = (o.notes || '').match(/Quotation\s*#?\s*([A-Za-z0-9\-_/.]+)/i);
      if (match && match[1]) {
        convertedQuoteNumbersForEmp.add(match[1].trim().toUpperCase());
      }
    });

    const standaloneConfirmedQuotAsOrders = allConfirmedQuotations
      .filter((q: any) => {
        if (q.status !== 'Confirmed') return false;
        const qNum = (q.quotationNumber || '').trim().toUpperCase();
        if (qNum && convertedQuoteNumbersForEmp.has(qNum)) return false;
        if (qNum && allEmployeeOrders.some((o: any) => (o.notes || '').toUpperCase().includes(qNum))) return false;
        return true;
      })
      .map((q: any) => ({
        id: q.id,
        orderNumber: q.quotationNumber,
        orderDate: q.date ? q.date.toISOString() : (q.createdAt ? q.createdAt.toISOString() : null),
        subtotal: Number(q.subtotal ?? q.totalValue ?? 0),
        totalValue: Number(q.totalValue ?? q.subtotal ?? 0),
        discount: 0,
        orderStatus: 'Confirmed',
        customer: q.customer
      }));

    // Combined list: real orders (with effective date if converted from quote) + standalone confirmed quotations
    const allCombinedSales = [
      ...allEmployeeOrders.map((o: any) => {
        let effDateStr: string | null = o.orderDate ? (typeof o.orderDate === 'string' ? o.orderDate : o.orderDate.toISOString()) : null;
        const match = (o.notes || '').match(/Quotation\s*#?\s*([A-Za-z0-9\-_/.]+)/i);
        if (match && match[1]) {
          const lq = empQuoteByNumber.get(match[1].trim().toUpperCase());
          if (lq && (lq.date || lq.createdAt)) {
            const d = new Date(lq.date || lq.createdAt);
            effDateStr = d.toISOString();
          }
        }
        return {
          ...o,
          orderDate: effDateStr,
          totalValue: Number(o.totalValue ?? o.subtotal ?? 0),
          subtotal: Number(o.subtotal ?? o.totalValue ?? 0)
        };
      }),
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
    const validFollowUps = allFollowUps.filter((c: any) => {
      if (!c.followUpDate) return false;
      const hasCustomer = c.customer && Boolean((c.customer.businessName || '').trim() || (c.customer.contactPerson || '').trim());
      const hasLead = c.lead && Boolean((c.lead.shopName || '').trim() || (c.lead.name || '').trim());
      return hasCustomer || hasLead || Boolean(c.customerId || c.leadId);
    });

    const padZero = (n: number) => String(n).padStart(2, '0');
    const istTodayDateStr = `${istYear}-${padZero(istMonth + 1)}-${padZero(istDate)}`;

    const todayFollowUps = validFollowUps.filter((c: any) => {
      if (!c.followUpDate) return false;
      const d = new Date(c.followUpDate);
      if (isNaN(d.getTime())) return false;
      if (d >= todayStart && d <= todayEnd) return true;
      if (typeof c.followUpDate === 'string' && c.followUpDate.substring(0, 10) === istTodayDateStr) return true;
      return false;
    });

    // Serialize cleanly for client component props - include confirmed quotations
    const serializedOrders = allCombinedSales;

    const serializedFollowUps = validFollowUps.map((f: any) => ({
      ...f,
      followUpDate: f.followUpDate ? (typeof f.followUpDate === 'string' ? f.followUpDate : f.followUpDate.toISOString()) : null,
      createdAt: f.createdAt ? (typeof f.createdAt === 'string' ? f.createdAt : f.createdAt.toISOString()) : null
    }));

    const serializedTodayFollowUps = todayFollowUps.map((c: any) => ({
      ...c,
      followUpDate: c.followUpDate ? (typeof c.followUpDate === 'string' ? c.followUpDate : c.followUpDate.toISOString()) : null,
      createdAt: c.createdAt ? (typeof c.createdAt === 'string' ? c.createdAt : c.createdAt.toISOString()) : null
    }));

    let sprintData = null;
    if (employee?.id) {
      try {
        sprintData = await getSprintData(employee.id);
      } catch (e) {
        console.error("Sprint data fetch error:", e);
      }
    }

    // ---------------------------------------------------------
    // ORG-WIDE LEADERBOARDS: DAILY & MONTHLY
    // ---------------------------------------------------------
    const orgQuoteByNumberMTD = new Map<string, any>();
    allOrgQuotesMTD.forEach((q: any) => {
      if (q.quotationNumber) {
        orgQuoteByNumberMTD.set(q.quotationNumber.trim().toUpperCase(), q);
      }
    });

    // Find all quotation numbers that already have an order created
    const allConvertedQuoteNumbers = new Set<string>();
    allOrgOrdersMTD.forEach((o: any) => {
      const match = (o.notes || '').match(/Quotation\s*#?\s*([A-Za-z0-9\-_/.]+)/i);
      if (match && match[1]) {
        allConvertedQuoteNumbers.add(match[1].trim().toUpperCase());
      }
    });

    // Standalone confirmed quotations (ONLY 'Confirmed' that are NOT yet converted and NOT represented in orders)
    const standaloneOrgConfirmedQuotes = allOrgQuotesMTD.filter((q: any) => {
      if (q.status !== 'Confirmed') return false;
      const qNum = (q.quotationNumber || '').trim().toUpperCase();
      if (qNum && allConvertedQuoteNumbers.has(qNum)) return false;
      if (qNum && allOrgOrdersMTD.some((o: any) => (o.notes || '').toUpperCase().includes(qNum))) return false;
      return true;
    });

    const getOrgQuotationDealDate = (q: any): Date => {
      if (q.acceptedDate) return new Date(q.acceptedDate);
      if (q.activities && q.activities.length > 0) {
        const confirmAct = q.activities.find((a: any) => a.action === 'Quotation Confirmed');
        if (confirmAct?.createdAt) return new Date(confirmAct.createdAt);
        const convertAct = q.activities.find((a: any) => a.action === 'Converted to Order');
        if (convertAct?.createdAt) return new Date(convertAct.createdAt);
      }
      if ((q.status === 'Confirmed' || q.status === 'Converted') && q.updatedAt) {
        return new Date(q.updatedAt);
      }
      return q.date ? new Date(q.date) : (q.createdAt ? new Date(q.createdAt) : new Date());
    };

    const getEffectiveOrgOrderDate = (o: any): Date => {
      const match = (o.notes || '').match(/Quotation\s*#?\s*([A-Za-z0-9\-_/.]+)/i);
      if (match && match[1]) {
        const qNum = match[1].trim().toUpperCase();
        const linkedQuote = orgQuoteByNumberMTD.get(qNum);
        if (linkedQuote) {
          return getOrgQuotationDealDate(linkedQuote);
        }
      }
      return o.orderDate ? new Date(o.orderDate) : (o.createdAt ? new Date(o.createdAt) : new Date());
    };

    // 1. Daily Leaderboard (Today)
    const dailyMap: Record<string, { id: string, name: string, orders: number, total: number, isCurrentEmployee: boolean }> = {};
    let todayOrgOrdersCount = 0;

    allOrgOrdersMTD
      .filter((o: any) => {
        const effDate = getEffectiveOrgOrderDate(o);
        return effDate >= todayStart && effDate <= todayEnd;
      })
      .forEach((o: any) => {
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
      .filter((q: any) => {
        const qDate = getOrgQuotationDealDate(q);
        return qDate >= todayStart && qDate <= todayEnd;
      })
      .forEach((q: any) => {
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
    
    allOrgEmployees.forEach((emp: any) => {
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

    allOrgOrdersMTD
      .filter((o: any) => getEffectiveOrgOrderDate(o) >= startOfMonth)
      .forEach((o: any) => {
        const spId = o.salespersonId;
        if (spId && monthlyMap[spId]) {
          monthlyMap[spId].orders += 1;
          monthlyMap[spId].total += Number(o.totalValue ?? o.subtotal ?? 0);
        }
      });

    standaloneOrgConfirmedQuotes
      .filter((q: any) => {
        const qDate = getOrgQuotationDealDate(q);
        return qDate >= startOfMonth;
      })
      .forEach((q: any) => {
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
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '4px 0 12px 0' }}>
          <BroadcastBanner userId={userId || ''} userRole={userRole} />
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
