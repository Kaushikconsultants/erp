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

    const leave = await prisma.leave.update({
      where: { id: leaveId },
      data: { status }
    });
    revalidatePath("/leaves");
    return { success: true, data: leave };
  } catch (error: any) {
    console.error("Error updating leave status:", error);
    return { success: false, error: error.message };
  }
}
