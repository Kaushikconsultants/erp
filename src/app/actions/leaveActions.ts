"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function submitLeaveRequest(data: {
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
}) {
  try {
    const leave = await prisma.leave.create({
      data: {
        employeeId: data.employeeId,
        leaveType: data.leaveType,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        numberOfDays: data.numberOfDays,
        reason: data.reason,
        status: "Pending"
      }
    });
    revalidatePath("/leaves");
    return { success: true, data: leave };
  } catch (error: any) {
    console.error("Error submitting leave:", error);
    return { success: false, error: error.message };
  }
}

export async function updateLeaveStatus(
  leaveIdOrPayload: string | { leaveId: string; status: "Approved" | "Rejected" | "Pending" },
  maybeStatus?: "Approved" | "Rejected" | "Pending"
) {
  try {
    const leaveId = typeof leaveIdOrPayload === "string" ? leaveIdOrPayload : leaveIdOrPayload.leaveId;
    const status = typeof leaveIdOrPayload === "string" ? maybeStatus! : leaveIdOrPayload.status;

    const existingLeave = await prisma.leave.findUnique({ where: { id: leaveId } });
    if (!existingLeave) return { success: false, error: "Leave request not found" };

    const leave = await prisma.leave.update({
      where: { id: leaveId },
      data: { status }
    });

    // If approved, automatically record Attendance entries with status 'Leave'
    if (status === "Approved") {
      const curr = new Date(existingLeave.startDate);
      const end = new Date(existingLeave.endDate);
      while (curr <= end) {
        const dayStart = new Date(curr);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart.getTime() + 86400000);

        const existingAtt = await prisma.attendance.findFirst({
          where: {
            employeeId: existingLeave.employeeId,
            date: { gte: dayStart, lt: dayEnd }
          }
        });

        if (existingAtt) {
          await prisma.attendance.update({
            where: { id: existingAtt.id },
            data: { status: "Leave", workingHours: 0 }
          });
        } else {
          await prisma.attendance.create({
            data: {
              employeeId: existingLeave.employeeId,
              date: dayStart,
              status: "Leave",
              workingHours: 0
            }
          });
        }
        curr.setDate(curr.getDate() + 1);
      }
    } else if (existingLeave.status === "Approved" && (status === "Rejected" || status === "Pending")) {
      // Revert leave attendance records if rejected/reset
      const curr = new Date(existingLeave.startDate);
      const end = new Date(existingLeave.endDate);
      while (curr <= end) {
        const dayStart = new Date(curr);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart.getTime() + 86400000);

        await prisma.attendance.deleteMany({
          where: {
            employeeId: existingLeave.employeeId,
            status: "Leave",
            date: { gte: dayStart, lt: dayEnd }
          }
        });
        curr.setDate(curr.getDate() + 1);
      }
    }

    revalidatePath("/leaves");
    revalidatePath("/attendance");
    revalidatePath("/payroll");
    return { success: true, data: leave };
  } catch (error: any) {
    console.error("Error updating leave status:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteLeaveRequest(leaveId: string) {
  try {
    const leave = await prisma.leave.findUnique({ where: { id: leaveId } });
    if (!leave) return { success: false, error: "Leave record not found" };

    if (leave.status === "Approved") {
      const curr = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      while (curr <= end) {
        const dayStart = new Date(curr);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart.getTime() + 86400000);

        await prisma.attendance.deleteMany({
          where: {
            employeeId: leave.employeeId,
            status: "Leave",
            date: { gte: dayStart, lt: dayEnd }
          }
        });
        curr.setDate(curr.getDate() + 1);
      }
    }

    await prisma.leave.delete({ where: { id: leaveId } });

    revalidatePath("/leaves");
    revalidatePath("/attendance");
    revalidatePath("/payroll");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting leave request:", error);
    return { success: false, error: error.message };
  }
}
