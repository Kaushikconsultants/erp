"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { getTenantOrgId } from "@/lib/tenant";

export async function logCall(formData: FormData) {
  const customerId = formData.get("customerId") as string;
  const leadId = formData.get("leadId") as string;
  const type = formData.get("type") as string || "OUTBOUND";
  const outcome = formData.get("outcome") as string;
  const notes = formData.get("notes") as string;
  const followUpDateStr = formData.get("followUpDate") as string;
  const recordingUrl = formData.get("recordingUrl") as string;
  const summary = formData.get("summary") as string;

  if ((!customerId && !leadId) || !outcome) {
    return { error: "Customer/Lead and Outcome are required" };
  }

  try {
    const organizationId = await getTenantOrgId();
    // Get the logged-in user's session to find THEIR employee record
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    let employee = null;
    if (userId) {
      employee = await prisma.employee.findUnique({ where: { userId } });
    }
    // Fallback scoped to current organization
    if (!employee) {
      employee = await prisma.employee.findFirst({ where: { organizationId } });
    }

    if (!employee) {
      return { error: "No employee record found. Please set up your profile first." };
    }

    let followUpDate = null;
    if (followUpDateStr) {
      followUpDate = new Date(followUpDateStr);
    }

    // Build base data
    const dataObj: any = {
      employeeId: employee.id,
      callType: type,
      status: "Completed",
      outcome,
      notes: notes || null,
      followUpDate,
      recordingUrl: recordingUrl || null,
      summary: summary || await generateCallSummary(notes, outcome),
    };
    if (customerId) dataObj.customerId = customerId;
    if (leadId) dataObj.leadId = leadId;

    const callRecord = await prisma.call.create({
      data: dataObj,
    });

    // --- Automated Follow-Up Sequence ---
    const noContactOutcomes = ["No Answer", "Busy", "Voicemail", "Missed"];
    if (noContactOutcomes.includes(outcome) && employee) {
      const autoDueDate = new Date();
      autoDueDate.setDate(autoDueDate.getDate() + 2);

      await prisma.task.create({
        data: {
          title: `Automated Follow-up: ${outcome} on previous call`,
          description: `Automatically scheduled because the previous call outcome was ${outcome}. Notes: ${notes || "None"}`,
          priority: "High",
          dueDate: autoDueDate,
          status: "To Do",
          assigneeId: employee.id,
          creatorId: employee.id,
          customerId: customerId || null,
          leadId: leadId || null,
        }
      });
    }

    revalidatePath("/calls");
    return { success: true, callRecord };
  } catch (error) {
    console.error("Failed to log call:", error);
    return { error: "Failed to log call. Please try again." };
  }
}


export async function updateCall(callId: string, data: { outcome?: string; callType?: string; notes?: string; followUpDate?: string | null }) {
  try {
    await prisma.call.update({
      where: { id: callId },
      data: {
        ...(data.outcome ? { outcome: data.outcome } : {}),
        ...(data.callType ? { callType: data.callType } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      }
    });
    revalidatePath("/calls");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to update call:", error);
    return { error: "Failed to update call record." };
  }
}

export async function deleteCall(callId: string) {
  try {
    await prisma.call.delete({
      where: { id: callId }
    });
    revalidatePath("/calls");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete call:", error);
    return { error: "Failed to delete call record." };
  }
}

export async function removeFollowUp(callId: string) {
  try {
    await prisma.call.update({
      where: { id: callId },
      data: { followUpDate: null }
    });
    revalidatePath("/");
    revalidatePath("/calls");
    return { success: true };
  } catch (error) {
    console.error("Failed to remove follow up:", error);
    return { error: "Failed to remove follow up." };
  }
}

export async function rescheduleFollowUp(callId: string, newDateStr: string) {
  try {
    const call = await prisma.call.update({
      where: { id: callId },
      data: { followUpDate: new Date(newDateStr) }
    });
    if (call.leadId) {
      revalidatePath(`/leads/${call.leadId}`);
      revalidatePath("/leads");
    } else if (call.customerId) {
      revalidatePath(`/customers/${call.customerId}`);
      revalidatePath("/customers");
    }
    revalidatePath("/calls");
    return { success: true };
  } catch (error) {
    console.error("Failed to reschedule follow up:", error);
    return { error: "Failed to reschedule follow up." };
  }
}

async function generateCallSummary(notes: string, outcome: string) {
  if (!notes) return `Call resulted in ${outcome}.`;
  return `[AI Summary] Customer discussed: ${notes}. Result: ${outcome}.`;
}
