"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";

export async function toggleAttendance() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized. Please log in." };

    const organizationId = (session.user as any).organizationId || (await getTenantOrgId());
    const userId = (session.user as any).id;
    let employee = await prisma.employee.findFirst({
      where: {
        userId,
        ...(organizationId ? { organizationId } : {})
      }
    });

    if (!employee) {
      // Auto-create an employee record for the logged in user
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return { error: "User not found" };

      employee = await prisma.employee.create({
        data: {
          organizationId: organizationId || null,
          userId: user.id,
          employeeId: `EMP-${Date.now().toString().slice(-4)}`,
          joiningDate: new Date(),
          employmentStatus: "Active",
          department: user.role || "SALES",
          designation: user.role || "SALES"
        }
      });
    }

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const istYear = istNow.getUTCFullYear();
    const istMonth = istNow.getUTCMonth();
    const istDate = istNow.getUTCDate();

    const todayStart = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0) - istOffset);
    const todayEnd = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffset);

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        date: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });

    if (existingAttendance) {
      if (!existingAttendance.checkOut) {
        // Check out
        const checkInTime = existingAttendance.checkIn || existingAttendance.date;
        const diffHours = (now.getTime() - new Date(checkInTime).getTime()) / (1000 * 60 * 60);

        await prisma.attendance.update({
          where: { id: existingAttendance.id },
          data: { 
            checkOut: now,
            workingHours: Math.round(diffHours * 100) / 100
          }
        });
      } else {
        return { error: "Already checked out for today." };
      }
    } else {
      // Check in
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
