"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function toggleAttendance() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized. Please log in." };

    const userId = (session.user as any).id;
    let employee = await prisma.employee.findUnique({ where: { userId } });

    if (!employee) {
      // Auto-create an employee record for the logged in user
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return { error: "User not found" };

      employee = await prisma.employee.create({
        data: {
          userId: user.id,
          employeeId: `EMP-${Date.now().toString().slice(-4)}`,
          joiningDate: new Date(),
          employmentStatus: "Active",
          department: user.role || "SALES",
          designation: user.role || "SALES"
        }
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        date: {
          gte: todayStart,
          lt: todayEnd
        }
      }
    });

    if (existingAttendance) {
      if (!existingAttendance.checkOut) {
        // Check out
        const now = new Date();
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
          checkIn: new Date(),
          status: "Present",
        }
      });
    }

    revalidatePath("/");
    revalidatePath("/payroll");
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle attendance:", error);
    return { error: "Failed to update attendance." };
  }
}

export async function updateAttendanceAdmin(employeeId: string, dateStr: string, status: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };
    
    const role = (session.user as any).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return { error: "Unauthorized. Admin only." };
    }

    // dateStr format: YYYY-MM-DD
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    const targetDateEnd = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employeeId,
        date: {
          gte: targetDate,
          lt: targetDateEnd
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
        await prisma.attendance.create({
          data: {
            employeeId,
            date: targetDate,
            status,
            checkIn: new Date(targetDate.getTime() + 9 * 60 * 60 * 1000) // Default 9 AM check-in for manual records
          }
        });
      }
    }

    revalidatePath("/attendance");
    revalidatePath("/payroll");
    return { success: true };
  } catch (error) {
    console.error("Failed to update attendance admin:", error);
    return { error: "Failed to update attendance." };
  }
}

