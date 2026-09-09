"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";

export async function toggleAttendance(passedEmployeeId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized. Please log in." };

    const organizationId = (session.user as any).organizationId || (await getTenantOrgId());
    let userId = (session.user as any).id || (session.user as any).sub;
    const userRole = ((session.user as any).role || "").toUpperCase();
    const userEmail = session.user.email ? session.user.email.trim().toLowerCase() : null;

    if (!userId && userEmail) {
      const dbUser = await prisma.user.findFirst({
        where: { email: { equals: userEmail, mode: 'insensitive' } }
      });
      if (dbUser) userId = dbUser.id;
    }

    let employee = null;

    // Security check: ONLY admins/HR can pass a different employeeId
    const isAdminOrHR = userRole === "ADMIN" || userRole === "SUPER_ADMIN" || userRole === "HR" || userRole === "MANAGER" || userRole === "OWNER";

    if (passedEmployeeId && isAdminOrHR) {
      employee = await prisma.employee.findFirst({
        where: { 
          id: passedEmployeeId,
          ...(organizationId ? { organizationId } : {})
        },
        include: { user: true }
      });
    }

    // For regular employees or fallback, strictly resolve the employee profile belonging to THIS logged-in user
    if (!employee && userId) {
      employee = await prisma.employee.findFirst({
        where: {
          userId,
          ...(organizationId ? { organizationId } : {})
        },
        include: { user: true }
      });
    }

    if (!employee && userEmail) {
      employee = await prisma.employee.findFirst({
        where: {
          user: { email: { equals: userEmail, mode: 'insensitive' } },
          ...(organizationId ? { organizationId } : {})
        },
        include: { user: true }
      });
    }

    if (!employee && userId) {
      // Auto-create an employee record strictly for the logged in user
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return { error: "User profile not found. Please log in again." };

      employee = await prisma.employee.create({
        data: {
          organizationId: organizationId || user.organizationId || null,
          userId: user.id,
          employeeId: `EMP-${Date.now().toString().slice(-4)}`,
          joiningDate: new Date(),
          employmentStatus: "Active",
          department: user.role || "SALES",
          designation: user.role || "SALES"
        },
        include: { user: true }
      });
    }

    if (!employee) {
      return { error: "Employee record not found. Please contact your admin." };
    }

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const istYear = istNow.getUTCFullYear();
    const istMonth = istNow.getUTCMonth();
    const istDate = istNow.getUTCDate();

    const todayStart = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0) - istOffset);
    const todayEnd = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffset);

    // Fetch all attendance records strictly for THIS specific employee for today
    const existingAttendances = await prisma.attendance.findMany({
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
    });

    // Find if there is an active shift (!checkOut)
    const activeAttendance = existingAttendances.find(a => !a.checkOut);

    if (activeAttendance) {
      // Check out strictly the active shift for this individual employee
      const checkInTime = activeAttendance.checkIn || activeAttendance.date;
      const diffHours = (now.getTime() - new Date(checkInTime).getTime()) / (1000 * 60 * 60);

      await prisma.attendance.update({
        where: { id: activeAttendance.id },
        data: { 
          checkOut: now,
          workingHours: Math.max(0, Math.round(diffHours * 100) / 100)
        }
      });
    } else if (existingAttendances.length > 0 && existingAttendances.some(a => a.checkOut)) {
      // Shift already completed for today
      return { error: "Shift already completed for today." };
    } else if (existingAttendances.length > 0) {
      // Record exists without checkIn timestamp (e.g. created by admin or placeholder)
      const target = existingAttendances[0];
      await prisma.attendance.update({
        where: { id: target.id },
        data: {
          checkIn: now,
          status: target.status === 'Absent' ? 'Present' : (target.status || 'Present')
        }
      });
    } else {
      // Check in: create fresh attendance record for this employee
      await prisma.attendance.create({
        data: {
          employeeId: employee.id,
          date: todayStart,
          checkIn: now,
          status: "Present",
        }
      });
    }

    revalidatePath("/");
    revalidatePath("/payroll");
    revalidatePath("/attendance");
    revalidatePath("/leaves");
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle attendance:", error);
    return { error: "Failed to update attendance." };
  }
}

export async function updateAttendanceAdmin(
  employeeId: string, 
  dateStr: string, 
  status: string,
  dateStartIso?: string,
  dateEndIso?: string,
  defaultCheckInIso?: string
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized. Please log in." };
    
    const userRole = ((session.user as any).role || "").toUpperCase();
    const canManage = (session.user as any).canManageSettings;
    const isAuthorized = userRole === "ADMIN" || userRole === "SUPER_ADMIN" || userRole === "HR" || userRole === "MANAGER" || userRole === "OWNER" || canManage;
    
    if (!isAuthorized) {
      return { error: "Unauthorized. Administrator or HR privileges required." };
    }

    let targetDate: Date;
    let targetDateEnd: Date;

    if (dateStartIso && dateEndIso) {
      targetDate = new Date(dateStartIso);
      targetDateEnd = new Date(dateEndIso);
    } else {
      const [year, month, day] = dateStr.split("-").map(Number);
      targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      targetDateEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    }

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employeeId,
        date: {
          gte: targetDate,
          lte: targetDateEnd
        }
      }
    });

    if (status === "DELETE") {
      if (existingAttendance) {
        await prisma.attendance.delete({
          where: { id: existingAttendance.id }
        });
      }
    } else {
      if (existingAttendance) {
        await prisma.attendance.update({
          where: { id: existingAttendance.id },
          data: { status }
        });
      } else {
        const checkInDate = defaultCheckInIso ? new Date(defaultCheckInIso) : targetDate;
        await prisma.attendance.create({
          data: {
            employeeId,
            date: targetDate,
            status,
            checkIn: checkInDate
          }
        });
      }
    }

    revalidatePath("/attendance");
    revalidatePath("/payroll");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to update attendance admin:", error);
    return { error: "Failed to update attendance." };
  }
}

// Admin-only: Edit check-in and check-out times for any employee
export async function updateCheckInOut(
  attendanceId: string,
  employeeId: string,
  dateStr: string,
  checkInTimeOrIso: string,         // Exact ISO string timestamp or "HH:MM"
  checkOutTimeOrIso?: string | null, // Exact ISO string timestamp or "HH:MM" or null
  dateStartIso?: string,
  dateEndIso?: string
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized. Please log in." };

    const userRole = ((session.user as any).role || "").toUpperCase();
    const canManage = (session.user as any).canManageSettings;
    const isAuthorized = userRole === "ADMIN" || userRole === "SUPER_ADMIN" || userRole === "HR" || userRole === "MANAGER" || userRole === "OWNER" || canManage;

    if (!isAuthorized) {
      return { error: "Unauthorized. Only administrators or HR can edit check-in/out times." };
    }

    // Parse or convert Check-in Date
    let checkIn: Date | null = null;
    if (checkInTimeOrIso) {
      if (checkInTimeOrIso.includes("T") || checkInTimeOrIso.includes("-")) {
        checkIn = new Date(checkInTimeOrIso);
      } else {
        const [year, month, day] = dateStr.split("-").map(Number);
        const [h, m] = checkInTimeOrIso.split(":").map(Number);
        checkIn = new Date(Date.UTC(year, month - 1, day, h, m, 0));
      }
    }

    // Parse or convert Check-out Date
    let checkOut: Date | null = null;
    if (checkOutTimeOrIso) {
      if (checkOutTimeOrIso.includes("T") || checkOutTimeOrIso.includes("-")) {
        checkOut = new Date(checkOutTimeOrIso);
      } else {
        const [year, month, day] = dateStr.split("-").map(Number);
        const [h, m] = checkOutTimeOrIso.split(":").map(Number);
        checkOut = new Date(Date.UTC(year, month - 1, day, h, m, 0));
      }
    }

    let workingHours: number | null = null;
    if (checkIn && checkOut) {
      const diffMs = checkOut.getTime() - checkIn.getTime();
      if (diffMs < 0) {
        return { error: "Check-out time cannot be earlier than check-in time." };
      }
      workingHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    }

    let targetDate: Date;
    let targetDateEnd: Date;

    if (dateStartIso && dateEndIso) {
      targetDate = new Date(dateStartIso);
      targetDateEnd = new Date(dateEndIso);
    } else {
      const [year, month, day] = dateStr.split("-").map(Number);
      targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      targetDateEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    }

    let targetRecord = null;
    if (attendanceId) {
      targetRecord = await prisma.attendance.findUnique({ where: { id: attendanceId } });
    }

    if (!targetRecord) {
      targetRecord = await prisma.attendance.findFirst({
        where: {
          employeeId,
          date: { gte: targetDate, lte: targetDateEnd }
        }
      });
    }

    if (targetRecord) {
      // Update existing record
      await prisma.attendance.update({
        where: { id: targetRecord.id },
        data: {
          checkIn: checkIn,
          checkOut: checkOut,
          workingHours: workingHours,
          status: targetRecord.status === "Absent" ? "Present" : targetRecord.status
        }
      });
    } else {
      // Create new attendance record for this day
      await prisma.attendance.create({
        data: {
          employeeId,
          date: targetDate,
          checkIn: checkIn,
          checkOut: checkOut,
          workingHours: workingHours,
          status: "Present"
        }
      });
    }

    revalidatePath("/attendance");
    revalidatePath("/payroll");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to update check-in/out:", error);
    return { error: "Failed to update check-in/out times. Please try again." };
  }
}

/**
 * Fetch real-time live team presence and attendance list for Admin Dashboard
 */
export async function getLiveTeamAttendance() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, data: [] };

    const orgId = (session.user as any).organizationId || (await getTenantOrgId());

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const istYear = istNow.getUTCFullYear();
    const istMonth = istNow.getUTCMonth();
    const istDate = istNow.getUTCDate();

    const todayStartOfDay = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0) - istOffset);
    const todayEndOfDay = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffset);

    // 1. Fetch all active employees in the organization
    // 2. Fetch all today's attendance entries
    const [employees, activeAttendances] = await Promise.all([
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
        include: { user: true },
        orderBy: { user: { name: 'asc' } }
      }).catch(() => []),
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
      }).catch(() => [])
    ]);

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

    const teamList: any[] = [];
    const processedEmpIds = new Set<string>();

    employees.forEach((emp: any) => {
      processedEmpIds.add(emp.id);
      const att = attendanceByEmployee.get(emp.id);

      if (att) {
        const hasActualCheckIn = !!att.checkIn;
        const hasActualCheckOut = !!att.checkOut;
        const rawStatus = (att.status || '').toLowerCase();
        const isLeave = rawStatus === 'leave';
        const isHalfDay = rawStatus === 'half day';
        const isAbsent = rawStatus === 'absent';
        const isPresent = rawStatus === 'present' || (!isLeave && !isAbsent && !isHalfDay);

        const isShiftActive = isPresent && hasActualCheckIn && !hasActualCheckOut;

        let checkInStr = 'Not Checked In';
        if (att.checkIn) {
          try {
            checkInStr = new Date(att.checkIn).toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }).toUpperCase();
          } catch {
            checkInStr = new Date(att.checkIn).toLocaleTimeString().toUpperCase();
          }
        } else if (isLeave) {
          checkInStr = 'LEAVE';
        }

        let checkOutStr = null;
        if (att.checkOut) {
          try {
            checkOutStr = new Date(att.checkOut).toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }).toUpperCase();
          } catch {
            checkOutStr = new Date(att.checkOut).toLocaleTimeString().toUpperCase();
          }
        }

        let resolvedStatus = 'Present';
        if (isLeave) resolvedStatus = 'Leave';
        else if (isAbsent) resolvedStatus = 'Absent';
        else if (isHalfDay) resolvedStatus = 'Half Day';
        else if (hasActualCheckOut) resolvedStatus = 'Shift Ended';
        else if (hasActualCheckIn) resolvedStatus = 'Present';
        else resolvedStatus = att.status || 'Pending';

        teamList.push({
          id: att.id,
          employeeId: emp.id,
          name: emp.user?.name || emp.employeeId || 'Team Member',
          role: emp.user?.role || emp.department || 'Staff',
          checkIn: att.checkIn ? new Date(att.checkIn).toISOString() : null,
          checkOut: att.checkOut ? new Date(att.checkOut).toISOString() : null,
          checkInStr,
          checkOutStr,
          status: resolvedStatus,
          isShiftActive,
          isCheckedOut: hasActualCheckOut
        });
      } else {
        // Employee exists in organization but hasn't punched attendance today
        teamList.push({
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

    // Also include any attendances from employees not caught in the main list
    attendanceByEmployee.forEach((att: any, empId: string) => {
      if (!processedEmpIds.has(empId)) {
        const hasActualCheckIn = !!att.checkIn;
        const hasActualCheckOut = !!att.checkOut;
        const rawStatus = (att.status || '').toLowerCase();
        const isLeave = rawStatus === 'leave';
        const isHalfDay = rawStatus === 'half day';
        const isAbsent = rawStatus === 'absent';
        const isPresent = rawStatus === 'present' || (!isLeave && !isAbsent && !isHalfDay);
        const isShiftActive = isPresent && hasActualCheckIn && !hasActualCheckOut;

        let checkInStr = 'Not Checked In';
        if (att.checkIn) {
          try {
            checkInStr = new Date(att.checkIn).toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }).toUpperCase();
          } catch {
            checkInStr = new Date(att.checkIn).toLocaleTimeString().toUpperCase();
          }
        }

        let checkOutStr = null;
        if (att.checkOut) {
          try {
            checkOutStr = new Date(att.checkOut).toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }).toUpperCase();
          } catch {
            checkOutStr = new Date(att.checkOut).toLocaleTimeString().toUpperCase();
          }
        }

        let resolvedStatus = 'Present';
        if (isLeave) resolvedStatus = 'Leave';
        else if (isAbsent) resolvedStatus = 'Absent';
        else if (isHalfDay) resolvedStatus = 'Half Day';
        else if (hasActualCheckOut) resolvedStatus = 'Shift Ended';
        else if (hasActualCheckIn) resolvedStatus = 'Present';
        else resolvedStatus = att.status || 'Pending';

        teamList.push({
          id: att.id,
          employeeId: empId,
          name: att.employee?.user?.name || att.employee?.employeeId || 'Team Member',
          role: att.employee?.user?.role || att.employee?.department || 'Staff',
          checkIn: att.checkIn ? new Date(att.checkIn).toISOString() : null,
          checkOut: att.checkOut ? new Date(att.checkOut).toISOString() : null,
          checkInStr,
          checkOutStr,
          status: resolvedStatus,
          isShiftActive,
          isCheckedOut: hasActualCheckOut
        });
      }
    });

    // Sort: Active shifts first, then Shift Ended, then Leave, then Not Marked
    teamList.sort((a, b) => {
      if (a.isShiftActive && !b.isShiftActive) return -1;
      if (!a.isShiftActive && b.isShiftActive) return 1;
      if (a.isCheckedOut && !b.isCheckedOut) return -1;
      if (!a.isCheckedOut && b.isCheckedOut) return 1;
      return a.name.localeCompare(b.name);
    });

    return { success: true, data: teamList };
  } catch (error) {
    console.error("Failed to get live team attendance:", error);
    return { success: false, data: [] };
  }
}
