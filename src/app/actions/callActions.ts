"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId, getTenantScope } from "@/lib/tenant";
import { notifyNewLead } from "@/lib/pushNotifications";
import { askSmartAIJSON } from "@/lib/aiClient";
import { parseTranscriptDialogue } from "@/lib/transcriptUtils";

export async function logCall(formData: FormData) {
  const rawCustomerId = (formData.get("customerId") as string || "").trim();
  const rawLeadId = (formData.get("leadId") as string || "").trim();
  let customerId = (rawCustomerId && rawCustomerId !== "undefined" && rawCustomerId !== "null") ? rawCustomerId : null;
  let leadId = (rawLeadId && rawLeadId !== "undefined" && rawLeadId !== "null") ? rawLeadId : null;
  const type = (formData.get("type") as string || "OUTBOUND").toUpperCase();
  const outcome = (formData.get("outcome") as string || "Connected / Follow-up Needed").trim();
  const notes = (formData.get("notes") as string || "").trim();
  const followUpDateStr = (formData.get("followUpDate") as string || "").trim();
  const recordingUrl = (formData.get("recordingUrl") as string || "").trim();
  const summary = (formData.get("summary") as string || "").trim();
  
  // Enterprise TeleCRM Duration & Status
  const rawDuration = formData.get("durationSec") as string;
  const parsedDuration = rawDuration ? parseInt(rawDuration, 10) : null;
  let durationSec = (parsedDuration !== null && !isNaN(parsedDuration) && parsedDuration >= 0) ? parsedDuration : null;
  const status = (formData.get("status") as string || "Completed").trim();
  const phone = (formData.get("phone") as string || "").trim();
  const newLeadName = (formData.get("newLeadName") as string || "").trim();
  const newLeadShop = (formData.get("newLeadShop") as string || "").trim();

  // If call was not connected or answered, duration is strictly 0
  const isNotConnected = ["missed", "busy", "no answer", "rejected", "failed", "cancelled", "not connected", "voicemail", "callback", "call later", "wrong number"].some(
    s => status.toLowerCase().includes(s) || outcome.toLowerCase().includes(s)
  ) || (status !== "Completed" && status !== "Connected") || (durationSec !== null && durationSec <= 0);
  if (isNotConnected) {
    durationSec = 0;
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
    if (!employee && organizationId) {
      employee = await prisma.employee.findFirst({ where: { organizationId } });
    }
    if (!employee) {
      employee = await prisma.employee.findFirst();
    }

    if (!employee) {
      return { error: "No employee record found. Please set up your profile first." };
    }

    // Safety check: if customerId is provided with phone, ensure the phone actually matches customer
    if (customerId && phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      // If phone is short (e.g. 121, 100, 198) or doesn't match the customer at all, detach customerId
      if (cleanPhone.length < 7) {
        customerId = null;
      } else {
        const cust = await prisma.customer.findUnique({
          where: { id: customerId },
          select: { mobile: true, whatsappNumber: true, alternatePhone: true }
        });
        if (cust) {
          const custPhones = [cust.mobile, cust.whatsappNumber, cust.alternatePhone].filter(Boolean).map(p => p!.replace(/\D/g, ""));
          const matches = custPhones.some(cp => cp.includes(cleanPhone) || cleanPhone.includes(cp) || cp.slice(-10) === cleanPhone.slice(-10));
          if (!matches) {
            customerId = null;
          }
        }
      }
    }

    // Auto-match or create lead if unmapped phone is provided
    if (!customerId && !leadId && phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length >= 7) {
        const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
        // Check existing customer
        const matchCustomer = await prisma.customer.findFirst({
          where: {
            organizationId: organizationId || undefined,
            OR: [
              { mobile: { contains: last10 } },
              { whatsappNumber: { contains: last10 } },
              { alternatePhone: { contains: last10 } }
            ]
          }
        });
        if (matchCustomer) {
          customerId = matchCustomer.id;
        } else {
          // Check existing lead using last 10 digits
          const matchLead = await prisma.lead.findFirst({
            where: {
              organizationId: organizationId || undefined,
              whatsappNumber: { contains: last10 }
            }
          });
          if (matchLead) {
            leadId = matchLead.id;
            // If user supplied a custom/real name, update the lead's name in CRM
            if (newLeadName && (matchLead.name.startsWith("Contact ") || matchLead.name.startsWith("Lead ") || matchLead.name === "New Phone Lead" || matchLead.name !== newLeadName)) {
              try {
                await prisma.lead.update({
                  where: { id: matchLead.id },
                  data: {
                    name: newLeadName,
                    ...(newLeadShop ? { shopName: newLeadShop } : {})
                  }
                });
              } catch (updateErr) {
                console.warn("Could not update lead name on call log:", updateErr);
              }
            }
          } else if (newLeadName || newLeadShop || phone) {
            // Auto-create a quick lead so CRM integrity is maintained
            try {
              const createdLead = await prisma.lead.create({
                data: {
                  name: newLeadName || `Contact ${last10.slice(-4)}`,
                  shopName: newLeadShop || "Phone Inquiry",
                  whatsappNumber: phone,
                  status: "New",
                  assignedSalespersonId: employee.id,
                  organizationId: organizationId || undefined
                }
              });
              leadId = createdLead.id;

              notifyNewLead({
                leadId: createdLead.id,
                name: createdLead.name,
                whatsappNumber: createdLead.whatsappNumber,
                shopName: createdLead.shopName,
                assignedSalespersonId: createdLead.assignedSalespersonId,
                organizationId: organizationId || null,
                source: "Phone Dialer Call"
              }).catch(() => {});
            } catch (leadErr) {
              console.warn("Could not auto-create lead:", leadErr);
            }
          }
        }
      }
    }

    // Also update existing lead if leadId was directly provided and newLeadName or newLeadShop is provided
    if (leadId && (newLeadName || newLeadShop)) {
      try {
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            ...(newLeadName ? { name: newLeadName } : {}),
            ...(newLeadShop ? { shopName: newLeadShop } : {})
          }
        });
      } catch (e) {
        console.warn("Notice: could not update lead name from leadId:", e);
      }
    }

    let followUpDate = null;
    if (followUpDateStr) {
      const parsed = new Date(followUpDateStr);
      if (!isNaN(parsed.getTime())) {
        followUpDate = parsed;
      }
    }

    let finalNotes = notes || null;
    if (isNotConnected || durationSec === 0) {
      if (finalNotes) {
        finalNotes = finalNotes
          .replace(/\[Auto-Transcript\][\s\S]*?(?=\n\n|$)/g, "")
          .replace(/\[AI Summary\][\s\S]*?(?=\n\n|$)/g, "")
          .trim() || null;
      }
    }

    if (phone && !customerId && !leadId) {
      if (!finalNotes || !finalNotes.includes("[Dialed:")) {
        finalNotes = finalNotes ? `[Dialed: ${phone}]\n${finalNotes}` : `[Dialed: ${phone}]`;
      }
    }

    // Build base call data
    const dataObj: any = {
      employeeId: employee.id,
      callType: type,
      durationSec: durationSec,
      status: isNotConnected ? "No Answer" : status,
      outcome: outcome || (isNotConnected ? "No Answer / Busy" : "Completed"),
      notes: finalNotes,
      followUpDate,
      recordingUrl: (isNotConnected || durationSec === 0) ? null : (recordingUrl || null),
      summary: (isNotConnected || durationSec === 0) ? null : (summary || await generateCallSummary(notes, outcome, durationSec)),
    };
    if (customerId) dataObj.customerId = customerId;
    if (leadId) dataObj.leadId = leadId;

    // Deduplication check: verify if an automated device call was logged in the last 15 minutes for this target
    const cleanPhoneDigits = (phone || "").replace(/\D/g, "");
    const last10Digits = cleanPhoneDigits.length >= 10 ? cleanPhoneDigits.slice(-10) : cleanPhoneDigits;
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

    let existingDeviceCall = null;
    if (last10Digits.length >= 7 || customerId || leadId) {
      existingDeviceCall = await prisma.call.findFirst({
        where: {
          employeeId: employee.id,
          createdAt: { gte: fifteenMinAgo },
          OR: [
            ...(customerId ? [{ customerId }] : []),
            ...(leadId ? [{ leadId }] : []),
            ...(last10Digits.length >= 7 ? [
              { notes: { contains: last10Digits } }
            ] : [])
          ],
          outcome: { in: ["Outgoing Call Connected", "Incoming Call Connected", "Missed Call", "No Answer / Busy", "Connected"] }
        },
        orderBy: { createdAt: "desc" }
      });
    }

    let callRecord;
    if (existingDeviceCall) {
      // Merge into the existing device call instead of creating a duplicate!
      callRecord = await prisma.call.update({
        where: { id: existingDeviceCall.id },
        data: {
          ...dataObj,
          notes: existingDeviceCall.notes?.includes("[DeviceCallId:")
            ? `${dataObj.notes || ""}\n${existingDeviceCall.notes.match(/\[DeviceCallId:[^\]]+\]/)?.[0] || ""}`.trim()
            : dataObj.notes
        },
        include: {
          customer: true,
          lead: true,
          employee: {
            include: { user: true }
          }
        }
      });
    } else {
      callRecord = await prisma.call.create({
        data: dataObj,
        include: {
          customer: true,
          lead: true,
          employee: {
            include: { user: true }
          }
        }
      });
    }

    // --- Automated Follow-Up Task Sequence for No-Contact Outcomes ---
    const noContactOutcomes = ["No Answer", "Busy", "Voicemail", "Missed", "No Answer / Busy", "Voicemail / Switched Off"];
    const isNoContact = noContactOutcomes.some(nc => outcome.toLowerCase().includes(nc.toLowerCase()));
    
    if (isNoContact && employee) {
      const autoDueDate = new Date();
      autoDueDate.setDate(autoDueDate.getDate() + 1); // follow up next day
      autoDueDate.setHours(11, 0, 0, 0);

      await prisma.task.create({
        data: {
          title: `Follow-up: ${outcome} on call (${phone || "Contact"})`,
          description: `Automatically created for unanswered/busy call. Duration: ${durationSec || 0}s. Notes: ${notes || "None"}`,
          priority: "High",
          dueDate: autoDueDate,
          status: "To Do",
          assigneeId: employee.id,
          creatorId: employee.id,
          customerId: customerId || null,
          leadId: leadId || null,
        }
      }).catch(e => console.error("Task auto-create err:", e));
    }

    revalidatePath("/calls");
    revalidatePath("/follow-ups");
    revalidatePath("/customers");
    revalidatePath("/leads");
    revalidatePath("/");
    
    return { success: true, callRecord };
  } catch (error: any) {
    console.error("Failed to log call:", error);
    return { error: error?.message || "Failed to log call. Please try again." };
  }
}

export async function updateCall(callId: string, data: { 
  outcome?: string; 
  callType?: string; 
  status?: string;
  durationSec?: number | null;
  notes?: string; 
  followUpDate?: string | null 
}) {
  try {
    const { isAdmin, employeeId } = await getTenantScope().catch(() => ({ isAdmin: false, employeeId: null }));
    if (!isAdmin) {
      const empId = employeeId || "no-match";
      const existing = await prisma.call.findUnique({
        where: { id: callId },
        include: { customer: true, lead: true }
      });
      if (!existing) return { error: "Call record not found." };
      const isOwner = existing.employeeId === empId ||
        existing.customer?.assignedSalespersonId === empId ||
        existing.lead?.assignedSalespersonId === empId;
      if (!isOwner) {
        return { error: "You are not authorized to edit this call record." };
      }
    }

    const isNotConnected = (data.status && (["missed", "busy", "no answer", "rejected", "failed", "cancelled", "not connected", "voicemail", "callback", "call later", "wrong number"].some(s => data.status!.toLowerCase().includes(s)) || (data.status !== "Completed" && data.status !== "Connected"))) ||
      (data.outcome && ["missed", "busy", "no answer", "rejected", "failed", "cancelled", "not connected", "voicemail", "callback", "call later", "wrong number"].some(s => data.outcome!.toLowerCase().includes(s))) ||
      (data.durationSec !== undefined && data.durationSec !== null && data.durationSec <= 0);
    const finalDuration = isNotConnected ? 0 : data.durationSec;

    let cleanNotes = data.notes;
    if (isNotConnected && cleanNotes) {
      cleanNotes = cleanNotes
        .replace(/\[Auto-Transcript\][\s\S]*?(?=\n\n|$)/g, "")
        .replace(/\[AI Summary\][\s\S]*?(?=\n\n|$)/g, "")
        .trim();
    }

    const updated = await prisma.call.update({
      where: { id: callId },
      data: {
        ...(data.outcome ? { outcome: data.outcome } : {}),
        ...(data.callType ? { callType: data.callType } : {}),
        ...(data.status ? { status: isNotConnected ? "No Answer" : data.status } : {}),
        ...(finalDuration !== undefined ? { durationSec: finalDuration } : {}),
        ...(cleanNotes !== undefined ? { notes: cleanNotes } : {}),
        ...(isNotConnected ? { recordingUrl: null, summary: null } : {}),
        ...(data.followUpDate !== undefined ? { followUpDate: data.followUpDate ? new Date(data.followUpDate) : null } : {}),
      }
    });
    revalidatePath("/calls");
    revalidatePath("/follow-ups");
    revalidatePath("/");
    return { success: true, call: updated };
  } catch (error) {
    console.error("Failed to update call:", error);
    return { error: "Failed to update call record." };
  }
}

/**
 * Update or Schedule Follow-up & Details for Recent Call Card
 */
export async function saveOrUpdateCallFollowUp(params: {
  callId: string;
  phoneNumber?: string;
  contactName?: string;
  outcome?: string;
  notes?: string;
  followUpDate?: string | null;
}) {
  try {
    const rawOrgId = await getTenantOrgId().catch(() => null);
    const orgId = (rawOrgId && rawOrgId !== "default-org" && rawOrgId !== "UNAUTHENTICATED") ? rawOrgId : undefined;
    const session = await getServerSession(authOptions).catch(() => null);
    const userId = (session?.user as any)?.id;

    const followUpDateObj = params.followUpDate ? new Date(params.followUpDate) : null;

    // 1. Try finding existing call by ID
    let existingCall = null;
    if (params.callId && !params.callId.startsWith("dev_")) {
      existingCall = await prisma.call.findUnique({
        where: { id: params.callId },
        include: { customer: true, lead: true, employee: true }
      });
    }

    if (existingCall) {
      const callOrgId = existingCall.customer?.organizationId || existingCall.lead?.organizationId || existingCall.employee?.organizationId;
      if (orgId && callOrgId && callOrgId !== orgId) {
        return { success: false, error: "Unauthorized access to call record" };
      }
      const updated = await prisma.call.update({
        where: { id: existingCall.id },
        data: {
          ...(params.outcome ? { outcome: params.outcome } : {}),
          ...(params.notes !== undefined ? { notes: params.notes } : {}),
          ...(params.followUpDate !== undefined ? { followUpDate: followUpDateObj } : {})
        }
      });

      // Also update linked Customer's nextFollowUp
      if (params.followUpDate !== undefined && updated.customerId) {
        await prisma.customer.update({
          where: { id: updated.customerId },
          data: { nextFollowUp: followUpDateObj }
        }).catch(() => {});
      }

      revalidatePath("/calls");
      revalidatePath("/follow-ups");
      revalidatePath("/");
      return { success: true, call: updated };
    }

    // 2. If it's a device call log or not yet in DB, find or create the Call record
    let employee = null;
    if (userId) {
      employee = await prisma.employee.findUnique({ where: { userId } });
    }
    if (!employee && orgId) {
      employee = await prisma.employee.findFirst({ where: { organizationId: orgId } });
    }
    if (!employee) {
      employee = await prisma.employee.findFirst();
    }
    if (!employee) {
      return { success: false, error: "No employee profile found" };
    }

    const cleanPhone = String(params.phoneNumber || "").replace(/\D/g, "");
    const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

    // Check if customer or lead matches phone
    let customerId: string | null = null;
    let leadId: string | null = null;

    if (last10) {
      const matchCustomer = await prisma.customer.findFirst({
        where: {
          organizationId: orgId || undefined,
          OR: [
            { mobile: { contains: last10 } },
            { whatsappNumber: { contains: last10 } }
          ]
        },
        select: { id: true }
      });
      if (matchCustomer) {
        customerId = matchCustomer.id;
      } else {
        const matchLead = await prisma.lead.findFirst({
          where: {
            organizationId: orgId || undefined,
            whatsappNumber: { contains: last10 }
          },
          select: { id: true }
        });
        if (matchLead) {
          leadId = matchLead.id;
        }
      }
    }

    // Check if an existing call with this phone was created in last 24h
    let targetCall = null;
    if (last10) {
      targetCall = await prisma.call.findFirst({
        where: {
          notes: { contains: last10 }
        },
        orderBy: { createdAt: "desc" }
      });
    }

    if (targetCall) {
      const updated = await prisma.call.update({
        where: { id: targetCall.id },
        data: {
          ...(params.outcome ? { outcome: params.outcome } : {}),
          ...(params.notes !== undefined ? { notes: params.notes } : {}),
          ...(params.followUpDate !== undefined ? { followUpDate: followUpDateObj } : {})
        }
      });
      revalidatePath("/calls");
      revalidatePath("/follow-ups");
      revalidatePath("/");
      return { success: true, call: updated };
    }

    // Otherwise create brand new Call record
    const noteParts = [];
    if (params.phoneNumber) noteParts.push(`[Phone: ${params.phoneNumber}]`);
    if (params.contactName) noteParts.push(`[Name: ${params.contactName}]`);
    if (params.notes) noteParts.push(params.notes);

    const created = await prisma.call.create({
      data: {
        callType: "OUTBOUND",
        status: "Completed",
        outcome: params.outcome || "Follow-up Scheduled",
        notes: noteParts.join(" ") || "Follow-up Call",
        followUpDate: followUpDateObj,
        durationSec: 0,
        employeeId: employee.id,
        customerId,
        leadId
      }
    });

    if (followUpDateObj && customerId) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { nextFollowUp: followUpDateObj }
      }).catch(() => {});
    }

    revalidatePath("/calls");
    revalidatePath("/follow-ups");
    revalidatePath("/");
    return { success: true, call: created };
  } catch (error: any) {
    console.error("Failed to save or update call follow up:", error);
    return { error: error?.message || "Failed to update call follow-up." };
  }
}

export async function deleteCall(callId: string) {
  try {
    const { organizationId, isAdmin, employeeId } = await getTenantScope().catch(() => ({
      organizationId: null,
      isAdmin: false,
      employeeId: null
    }));
    const rawOrgId = organizationId || (await getTenantOrgId().catch(() => null));
    const orgId = (rawOrgId && rawOrgId !== "default-org" && rawOrgId !== "UNAUTHENTICATED") ? rawOrgId : undefined;

    const session = await getServerSession(authOptions).catch(() => null);
    if (!session?.user) {
      return { error: "Unauthorized" };
    }

    const existing = await prisma.call.findUnique({
      where: { id: callId },
      select: {
        id: true,
        leadId: true,
        customerId: true,
        employeeId: true,
        recordingUrl: true,
        customer: { select: { organizationId: true, assignedSalespersonId: true } },
        lead: { select: { organizationId: true, assignedSalespersonId: true } },
        employee: { select: { organizationId: true } }
      }
    });
    if (!existing) {
      return { success: true };
    }

    // Permission check: Admin can delete any call in org; salesperson can delete their own calls or assigned contacts
    if (!isAdmin) {
      const isCallOwner = employeeId && existing.employeeId === employeeId;
      const isAssigned = employeeId && (
        existing.customer?.assignedSalespersonId === employeeId ||
        existing.lead?.assignedSalespersonId === employeeId
      );
      const isSameOrg = orgId && (
        existing.customer?.organizationId === orgId ||
        existing.lead?.organizationId === orgId ||
        existing.employee?.organizationId === orgId
      );

      if (!isCallOwner && !isAssigned && !isSameOrg) {
        return { error: "You do not have permission to delete this call record." };
      }
    }

    await prisma.call.delete({
      where: { id: callId }
    });

    revalidatePath("/calls");
    revalidatePath("/follow-ups");
    revalidatePath("/leads");
    if (existing.leadId) {
      revalidatePath(`/leads/${existing.leadId}`);
    }
    revalidatePath("/customers");
    if (existing.customerId) {
      revalidatePath(`/customers/${existing.customerId}`);
    }
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete call:", error);
    return { error: "Failed to delete call record." };
  }
}

export async function deleteCallRecording(callId: string) {
  try {
    const { organizationId, isAdmin, employeeId } = await getTenantScope().catch(() => ({
      organizationId: null,
      isAdmin: false,
      employeeId: null
    }));
    const rawOrgId = organizationId || (await getTenantOrgId().catch(() => null));
    const orgId = (rawOrgId && rawOrgId !== "default-org" && rawOrgId !== "UNAUTHENTICATED") ? rawOrgId : undefined;

    const session = await getServerSession(authOptions).catch(() => null);
    if (!session?.user) {
      return { error: "Unauthorized" };
    }

    const existing = await prisma.call.findUnique({
      where: { id: callId },
      select: {
        id: true,
        leadId: true,
        customerId: true,
        employeeId: true,
        recordingUrl: true,
        customer: { select: { organizationId: true, assignedSalespersonId: true } },
        lead: { select: { organizationId: true, assignedSalespersonId: true } },
        employee: { select: { organizationId: true } }
      }
    });
    if (!existing) {
      return { error: "Call record not found." };
    }

    if (!isAdmin) {
      const isCallOwner = employeeId && existing.employeeId === employeeId;
      const isAssigned = employeeId && (
        existing.customer?.assignedSalespersonId === employeeId ||
        existing.lead?.assignedSalespersonId === employeeId
      );
      const isSameOrg = orgId && (
        existing.customer?.organizationId === orgId ||
        existing.lead?.organizationId === orgId ||
        existing.employee?.organizationId === orgId
      );

      if (!isCallOwner && !isAssigned && !isSameOrg) {
        return { error: "You do not have permission to delete this recording." };
      }
    }

    await prisma.call.update({
      where: { id: callId },
      data: { recordingUrl: null }
    });

    revalidatePath("/calls");
    revalidatePath("/follow-ups");
    revalidatePath("/leads");
    if (existing.leadId) {
      revalidatePath(`/leads/${existing.leadId}`);
    }
    revalidatePath("/customers");
    if (existing.customerId) {
      revalidatePath(`/customers/${existing.customerId}`);
    }
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete call recording:", error);
    return { error: "Failed to delete call recording." };
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
    revalidatePath("/follow-ups");
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
    revalidatePath("/follow-ups");
    return { success: true };
  } catch (error) {
    console.error("Failed to reschedule follow up:", error);
    return { error: "Failed to reschedule follow up." };
  }
}

export async function cleanupOrphanFollowUps() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const res = await prisma.call.updateMany({
      where: {
        followUpDate: { not: null },
        customerId: null,
        leadId: null
      },
      data: { followUpDate: null }
    });

    revalidatePath("/");
    revalidatePath("/calls");
    revalidatePath("/follow-ups");
    return { success: true, count: res.count };
  } catch (error: any) {
    console.error("Failed to cleanup orphan follow-ups:", error);
    return { error: error.message || "Failed to cleanup orphan follow-ups" };
  }
}

async function generateCallSummary(notes: string, outcome: string, durationSec?: number | null) {
  const durationText = durationSec ? ` (${Math.floor(durationSec / 60)}m ${durationSec % 60}s)` : "";
  if (!notes) return `Call${durationText} resulted in ${outcome}.`;
  return `[TeleCRM Summary] Result: ${outcome}${durationText}. Discussion: ${notes}.`;
}

export async function getCustomersForCallModal() {
  try {
    const { organizationId, isAdmin, employeeId } = await getTenantScope().catch(() => ({
      organizationId: null,
      isAdmin: false,
      employeeId: null
    }));
    const rawOrgId = organizationId || (await getTenantOrgId().catch(() => null));
    const orgId = (rawOrgId && rawOrgId !== "default-org" && rawOrgId !== "UNAUTHENTICATED") ? rawOrgId : undefined;
    const session = await getServerSession(authOptions).catch(() => null);
    if (!session?.user) return { success: false, customers: [] };

    const empId = employeeId || "no-match";
    const whereScope: any = {
      AND: [
        ...(orgId ? [{
          OR: [{ organizationId: orgId }, { organizationId: null }, { organizationId: "default-org" }]
        }] : []),
        ...(!isAdmin ? [{
          assignedSalespersonId: empId
        }] : [])
      ]
    };

    const [customers, leads] = await Promise.all([
      prisma.customer.findMany({
        where: whereScope,
        select: { id: true, businessName: true, contactPerson: true, mobile: true, whatsappNumber: true, alternatePhone: true, city: true },
        orderBy: { businessName: 'asc' },
        take: 500
      }).catch(err => {
        console.warn("Customer findMany error in call modal:", err);
        return [];
      }),
      prisma.lead.findMany({
        where: whereScope,
        select: { id: true, name: true, shopName: true, whatsappNumber: true },
        orderBy: { name: 'asc' },
        take: 500
      }).catch(err => {
        console.warn("Lead findMany error in call modal:", err);
        return [];
      })
    ]);

    const mapped = [
      ...(Array.isArray(customers) ? customers : []).map(c => ({
        id: c.id,
        companyName: c.businessName || c.contactPerson || "Customer",
        contactPerson: c.contactPerson || c.businessName || "",
        phone: c.mobile || c.whatsappNumber || (c as any).alternatePhone || '',
        city: c.city || '',
        type: 'Customer'
      })),
      ...(Array.isArray(leads) ? leads : []).map(l => ({
        id: l.id,
        companyName: l.shopName || l.name || "Lead",
        contactPerson: l.name || l.shopName || "",
        phone: l.whatsappNumber || '',
        city: '',
        type: 'Lead'
      }))
    ];

    return { success: true, customers: mapped };
  } catch (err) {
    console.error("Failed to fetch customers for call modal:", err);
    return { success: false, customers: [] };
  }
}

/**
 * Fetch Recent Calls for Phone Dialer Call Logs / History Tab
 */
export async function getDialerRecentCalls(limit: number = 40) {
  try {
    const { organizationId, isAdmin, employeeId } = await getTenantScope().catch(() => ({
      organizationId: null,
      isAdmin: false,
      employeeId: null
    }));
    const rawOrgId = organizationId || (await getTenantOrgId().catch(() => null));
    const orgId = (rawOrgId && rawOrgId !== "default-org" && rawOrgId !== "UNAUTHENTICATED") ? rawOrgId : undefined;
    const session = await getServerSession(authOptions).catch(() => null);
    if (!session?.user) return { success: false, calls: [] };

    const empId = employeeId || "no-match";
    const whereClause: any = {
      AND: [
        ...(orgId ? [{
          OR: [
            { customer: { organizationId: orgId } },
            { lead: { organizationId: orgId } },
            { employee: { organizationId: orgId } }
          ]
        }] : []),
        ...(!isAdmin ? [{
          OR: [
            { employeeId: empId },
            { customer: { assignedSalespersonId: empId } },
            { lead: { assignedSalespersonId: empId } }
          ]
        }] : [])
      ]
    };

    const calls = await prisma.call.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        customer: {
          select: { id: true, businessName: true, contactPerson: true, mobile: true, whatsappNumber: true, city: true }
        },
        lead: {
          select: { id: true, name: true, shopName: true, whatsappNumber: true }
        },
        employee: {
          select: { id: true, user: { select: { name: true } } }
        }
      }
    }).catch(err => {
      console.warn("Prisma call.findMany error in getDialerRecentCalls:", err);
      return [];
    });

    const formattedCalls = (Array.isArray(calls) ? calls : [])
      .filter(c => {
        const extractedPhone = c.notes?.match(/\[(?:Dialed|Phone|Caller|Incoming|Missed): ([^\]]+)\]/)?.[1]
          || (c.notes?.match(/\+?[0-9]{10,13}/)?.[0]);
        const hasValidParty = !!(c.customer || c.lead || extractedPhone);
        if (!hasValidParty) {
          // Asynchronously clean up orphan whose lead/customer was deleted
          prisma.call.delete({ where: { id: c.id } }).catch(() => {});
          return false;
        }
        return true;
      })
      .map(c => {
        const extractedPhone = c.notes?.match(/\[(?:Dialed|Phone|Caller|Incoming|Missed): ([^\]]+)\]/)?.[1]
          || (c.notes?.match(/\+?[0-9]{10,13}/)?.[0]);
        const extractedName = c.notes?.match(/\[Name: ([^\]]+)\]/)?.[1];
        const contactName = c.customer?.businessName || c.lead?.shopName || c.lead?.name || extractedName || (extractedPhone ? `Direct (${extractedPhone})` : "Direct Contact");
        const contactPerson = c.customer?.contactPerson || c.lead?.name || extractedName || "";
        const phone = c.customer?.mobile || c.customer?.whatsappNumber || c.lead?.whatsappNumber || extractedPhone || "";
        const contactType = c.customer ? "Customer" : c.lead ? "Lead" : "Direct";

        return {
          id: c.id,
          createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
          callType: c.callType || "OUTBOUND",
          durationSec: c.durationSec || 0,
          status: c.status || "Completed",
          outcome: c.outcome || "Completed",
          notes: c.notes || "",
          followUpDate: c.followUpDate ? new Date(c.followUpDate).toISOString() : null,
          contactName,
          contactPerson,
          phone,
          phoneNumber: phone,
          contactType,
          customerId: c.customerId,
          leadId: c.leadId,
          employeeName: c.employee?.user?.name || "Agent",
          recordingUrl: c.recordingUrl || null,
          summary: c.summary || null
        };
      });

    // Deduplicate calls within 15 minutes for the same contact/phone
    const deduplicatedCalls: typeof formattedCalls = [];
    const callsToDeleteIds: string[] = [];

    for (const call of formattedCalls) {
      const cleanPhone = (call.phone || "").replace(/\D/g, "").slice(-10);
      const callTime = new Date(call.createdAt).getTime();

      const existingIndex = deduplicatedCalls.findIndex(prev => {
        const prevCleanPhone = (prev.phone || "").replace(/\D/g, "").slice(-10);
        const prevTime = new Date(prev.createdAt).getTime();
        const sameTarget = (call.customerId && call.customerId === prev.customerId) ||
          (call.leadId && call.leadId === prev.leadId) ||
          (cleanPhone && prevCleanPhone && cleanPhone === prevCleanPhone);
        return sameTarget && Math.abs(callTime - prevTime) < 15 * 60 * 1000;
      });

      if (existingIndex >= 0) {
        const prev = deduplicatedCalls[existingIndex];
        const isPrevDevice = prev.outcome === "Outgoing Call Connected" || prev.outcome === "Incoming Call Connected" || prev.notes.includes("Device outgoing call");
        const isCurrDevice = call.outcome === "Outgoing Call Connected" || call.outcome === "Incoming Call Connected" || call.notes.includes("Device outgoing call");

        if (isPrevDevice && !isCurrDevice) {
          callsToDeleteIds.push(prev.id);
          deduplicatedCalls[existingIndex] = call;
        } else if (!isPrevDevice && isCurrDevice) {
          callsToDeleteIds.push(call.id);
        } else {
          const prevScore = (prev.recordingUrl ? 2 : 0) + prev.notes.length;
          const currScore = (call.recordingUrl ? 2 : 0) + call.notes.length;
          if (currScore > prevScore) {
            callsToDeleteIds.push(prev.id);
            deduplicatedCalls[existingIndex] = call;
          } else {
            callsToDeleteIds.push(call.id);
          }
        }
      } else {
        deduplicatedCalls.push(call);
      }
    }

    if (callsToDeleteIds.length > 0) {
      prisma.call.deleteMany({ where: { id: { in: callsToDeleteIds } } }).catch(() => {});
    }

    return { success: true, calls: deduplicatedCalls };
  } catch (err: any) {
    console.error("Failed to fetch dialer recent calls:", err);
    return { success: false, calls: [], error: err?.message || "Failed to fetch calls" };
  }
}

/**
 * Enterprise TeleCRM Analytics Action
 * Calculates organization & employee call stats, talk-time, connect rates, and outcome distribution.
 */
export async function getEmployeeCallAnalytics(options?: {
  timeframe?: "today" | "yesterday" | "this_week" | "this_month" | "all";
  employeeId?: string;
}) {
  try {
    const { organizationId, isAdmin, employeeId } = await getTenantScope().catch(() => ({
      organizationId: null,
      isAdmin: false,
      employeeId: null
    }));
    const rawOrgId = organizationId || (await getTenantOrgId().catch(() => null));
    const orgId = (rawOrgId && rawOrgId !== "default-org" && rawOrgId !== "UNAUTHENTICATED") ? rawOrgId : undefined;
    const session = await getServerSession(authOptions).catch(() => null);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const empId = employeeId || "no-match";

    const timeframe = options?.timeframe || "today";
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();

    if (timeframe === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (timeframe === "yesterday") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
    } else if (timeframe === "this_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
    } else if (timeframe === "this_month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else {
      startDate = new Date(2020, 0, 1);
    }

    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      },
      AND: [
        ...(orgId ? [{
          OR: [
            { customer: { organizationId: orgId } },
            { lead: { organizationId: orgId } },
            { employee: { organizationId: orgId } }
          ]
        }] : []),
        ...(!isAdmin ? [{
          OR: [
            { employeeId: empId },
            { customer: { assignedSalespersonId: empId } },
            { lead: { assignedSalespersonId: empId } }
          ]
        }] : (options?.employeeId ? [{ employeeId: options.employeeId }] : []))
      ]
    };

    const [calls, allEmployees] = await Promise.all([
      prisma.call.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            include: { user: true }
          },
          customer: true,
          lead: true
        }
      }),
      prisma.employee.findMany({
        where: {
          ...(orgId ? { organizationId: orgId } : {}),
          ...(!isAdmin ? { id: empId } : {})
        },
        include: { user: true },
        orderBy: { user: { name: "asc" } }
      })
    ]);

    const totalCalls = calls.length;
    const noContactKeywords = ["no answer", "busy", "voicemail", "missed", "switched off", "wrong number"];
    const isConnectedCall = (outcome: string) => {
      if (!outcome) return false;
      const lower = outcome.toLowerCase();
      return !noContactKeywords.some(k => lower.includes(k));
    };

    const connectedCalls = calls.filter(c => isConnectedCall(c.outcome)).length;
    const connectRate = totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0;
    const totalDurationSec = calls.reduce((acc, c) => acc + (c.durationSec || 0), 0);
    const avgDurationSec = totalCalls > 0 ? Math.round(totalDurationSec / totalCalls) : 0;
    const outboundCalls = calls.filter(c => (c.callType || "").toUpperCase() === "OUTBOUND").length;
    const inboundCalls = calls.filter(c => (c.callType || "").toUpperCase() === "INBOUND").length;

    // Outcomes summary
    const outcomesSummary: Record<string, number> = {};
    calls.forEach(c => {
      const oc = c.outcome || "Other";
      outcomesSummary[oc] = (outcomesSummary[oc] || 0) + 1;
    });

    // Hourly distribution for today (08:00 to 20:00)
    const hourlyActivity: { hour: number; label: string; calls: number; durationSec: number }[] = [];
    for (let h = 8; h <= 20; h++) {
      const hCalls = calls.filter(c => {
        const d = new Date(c.createdAt);
        return d.getHours() === h;
      });
      const hDur = hCalls.reduce((acc, c) => acc + (c.durationSec || 0), 0);
      const label = h > 12 ? `${h - 12} PM` : h === 12 ? "12 PM" : `${h} AM`;
      hourlyActivity.push({
        hour: h,
        label,
        calls: hCalls.length,
        durationSec: hDur
      });
    }

    // Per-Employee stats
    const employeeStats = allEmployees.map(emp => {
      const empCalls = calls.filter(c => c.employeeId === emp.id);
      const empConnected = empCalls.filter(c => isConnectedCall(c.outcome)).length;
      const empDuration = empCalls.reduce((acc, c) => acc + (c.durationSec || 0), 0);
      const empConnectRate = empCalls.length > 0 ? Math.round((empConnected / empCalls.length) * 100) : 0;
      const empAvgDuration = empCalls.length > 0 ? Math.round(empDuration / empCalls.length) : 0;

      const empOutcomes: Record<string, number> = {};
      empCalls.forEach(c => {
        const oc = c.outcome || "Other";
        empOutcomes[oc] = (empOutcomes[oc] || 0) + 1;
      });

      const dailyTarget = 40; // Default target calls per day
      const targetPercent = Math.min(100, Math.round((empCalls.length / dailyTarget) * 100));

      const formattedEmpCalls = empCalls.map(c => ({
        id: c.id,
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
        callType: c.callType || "OUTBOUND",
        durationSec: c.durationSec || 0,
        status: c.status || "Completed",
        outcome: c.outcome || "Completed",
        notes: c.notes || "",
        summary: c.summary || null,
        followUpDate: c.followUpDate ? new Date(c.followUpDate).toISOString() : null,
        recordingUrl: c.recordingUrl || null,
        customerId: c.customerId,
        leadId: c.leadId,
        customerName: c.customer?.businessName || c.lead?.shopName || c.lead?.name || c.customer?.contactPerson || "Contact",
        contactPerson: c.customer?.contactPerson || c.lead?.name || "",
        phone: c.customer?.mobile || c.customer?.whatsappNumber || c.lead?.whatsappNumber || "",
        employeeName: emp.user?.name || (emp as any)?.name || "Agent",
        isCustomer: Boolean(c.customerId),
        isOldCustomer: Boolean(c.customerId),
      }));

      return {
        id: emp.id,
        name: emp.user?.name || "Unknown Agent",
        email: emp.user?.email || "",
        role: emp.user?.role || "SALES",
        avatar: emp.user?.avatarUrl || emp.user?.image || null,
        totalCalls: empCalls.length,
        connectedCalls: empConnected,
        connectRate: empConnectRate,
        totalDurationSec: empDuration,
        avgDurationSec: empAvgDuration,
        outcomes: empOutcomes,
        target: dailyTarget,
        targetPercent,
        allCalls: formattedEmpCalls,
        recentCalls: formattedEmpCalls.slice(0, 3)
      };
    }).sort((a, b) => b.totalCalls - a.totalCalls);

    const formattedCalls = calls.map(c => ({
      id: c.id,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
      callType: c.callType || "OUTBOUND",
      durationSec: c.durationSec || 0,
      status: c.status || "Completed",
      outcome: c.outcome || "Completed",
      notes: c.notes || "",
      summary: c.summary || null,
      followUpDate: c.followUpDate ? new Date(c.followUpDate).toISOString() : null,
      recordingUrl: c.recordingUrl || null,
      customerId: c.customerId,
      leadId: c.leadId,
      employeeId: c.employeeId,
      employeeName: c.employee?.user?.name || (c.employee as any)?.name || "Agent",
      customerName: c.customer?.businessName || c.lead?.shopName || c.lead?.name || c.customer?.contactPerson || "Contact",
      contactPerson: c.customer?.contactPerson || c.lead?.name || "",
      phone: c.customer?.mobile || c.customer?.whatsappNumber || c.lead?.whatsappNumber || "",
      isCustomer: Boolean(c.customerId),
      isOldCustomer: Boolean(c.customerId),
    }));

    return {
      success: true,
      timeframe,
      metrics: {
        totalCalls,
        connectedCalls,
        connectRate,
        totalDurationSec,
        avgDurationSec,
        outboundCalls,
        inboundCalls
      },
      outcomesSummary,
      hourlyActivity,
      employeeStats,
      calls: formattedCalls
    };
  } catch (err: any) {
    console.error("Failed to get employee call analytics:", err);
    return { success: false, error: err?.message || "Failed to fetch telecrm analytics" };
  }
}

/**
 * Fetch Today's Telecalling Queue for Mobile Reps
 */
export async function getTelecallingQueue() {
  try {
    const { organizationId, isAdmin, employeeId } = await getTenantScope().catch(() => ({
      organizationId: null,
      isAdmin: false,
      employeeId: null
    }));
    const rawOrgId = organizationId || (await getTenantOrgId().catch(() => null));
    const orgId = (rawOrgId && rawOrgId !== "default-org" && rawOrgId !== "UNAUTHENTICATED") ? rawOrgId : undefined;
    const session = await getServerSession(authOptions).catch(() => null);
    if (!session?.user) return { success: false, overdue: [], todayDue: [], freshLeads: [] };

    const empId = employeeId || "no-match";
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const baseOrgFilter: any = orgId ? {
      OR: [
        { customer: { organizationId: orgId } },
        { lead: { organizationId: orgId } },
        { employee: { organizationId: orgId } }
      ]
    } : {};

    const userScopeFilter: any = !isAdmin ? {
      OR: [
        { employeeId: empId },
        { customer: { assignedSalespersonId: empId } },
        { lead: { assignedSalespersonId: empId } }
      ]
    } : {};

    const [overdueCalls, todayCalls, freshLeads] = await Promise.all([
      // Overdue follow-up calls
      prisma.call.findMany({
        where: {
          ...baseOrgFilter,
          followUpDate: {
            lt: startOfToday
          },
          ...userScopeFilter
        },
        orderBy: { followUpDate: "asc" },
        take: 20,
        include: { customer: true, lead: true, employee: { include: { user: true } } }
      }).catch(err => {
        console.warn("Overdue calls fetch err:", err);
        return [];
      }),

      // Today's scheduled calls
      prisma.call.findMany({
        where: {
          ...baseOrgFilter,
          followUpDate: {
            gte: startOfToday,
            lte: endOfToday
          },
          ...userScopeFilter
        },
        orderBy: { followUpDate: "asc" },
        take: 30,
        include: { customer: true, lead: true, employee: { include: { user: true } } }
      }).catch(err => {
        console.warn("Today calls fetch err:", err);
        return [];
      }),

      // Fresh uncontacted leads
      prisma.lead.findMany({
        where: {
          ...(orgId ? { organizationId: orgId } : {}),
          status: { in: ["NEW", "New Lead", "INTERESTED", "PROSPECT"] },
          calls: { none: {} },
          ...(!isAdmin ? { assignedSalespersonId: empId } : {})
        },
        orderBy: { createdAt: "desc" },
        take: 20
      }).catch(err => {
        console.warn("Fresh leads fetch err:", err);
        return [];
      })
    ]);

    return {
      success: true,
      overdue: Array.isArray(overdueCalls) ? overdueCalls : [],
      todayDue: Array.isArray(todayCalls) ? todayCalls : [],
      freshLeads: Array.isArray(freshLeads) ? freshLeads : []
    };
  } catch (err: any) {
    console.error("Failed to fetch telecalling queue:", err);
    return { success: false, overdue: [], todayDue: [], freshLeads: [] };
  }
}

export interface NemotronTelecallingCoachResult {
  headline: string;
  summary: string;
  teamStatus: "OPTIMAL" | "ATTENTION" | "PACE_LAG" | "CRITICAL";
  priorityAction: string;
  smartDirectives: string[];
  repInsights?: Array<{ repName: string; feedback: string }>;
  provider?: string;
}

/**
 * AI Telecalling Performance Coach
 */
export async function getNemotronTelecallingCoach(payload: {
  timeframe: string;
  totalCalls: number;
  totalDurationSec: number;
  connectedCalls: number;
  connectRate: number;
  employeeStats: Array<{
    name: string;
    role: string;
    totalCalls: number;
    target: number;
    targetPercent: number;
    connectedCalls: number;
    connectRate: number;
    totalDurationSec: number;
  }>;
}): Promise<{ success: boolean; data?: NemotronTelecallingCoachResult; error?: string }> {
  try {
    const prompt = `
You are an Executive AI Telecalling Director and Coach for an Indian wholesale enterprise CRM.
Analyze the live sales calling metrics below and generate high-impact, actionable telecalling coaching directives:

Timeframe: ${payload.timeframe}
Team Aggregates:
- Total Calls Made: ${payload.totalCalls}
- Connected Calls: ${payload.connectedCalls} (${payload.connectRate}% connect rate)
- Total Talk Time: ${Math.round(payload.totalDurationSec / 60)} minutes

Sales Rep Performance:
${payload.employeeStats.map(e => `- ${e.name} (${e.role}): ${e.totalCalls}/${e.target} calls (${e.targetPercent}% target), ${e.connectedCalls} connected (${e.connectRate}%), ${Math.round(e.totalDurationSec / 60)} min talk time`).join('\n')}

Instructions:
1. "headline": Crisp 4-7 word executive status (e.g. "Calling Pace Lag: Outbound Push Required")
2. "summary": 2 punchy sentences evaluating team momentum and conversion velocity.
3. "teamStatus": "OPTIMAL" (>=80% target), "ATTENTION" (40-79%), "PACE_LAG" (<40% or 0 calls), or "CRITICAL".
4. "priorityAction": 1 immediate high-leverage tactical step the team leader should take right now.
5. "smartDirectives": Array of 2-3 strategic tips (e.g., peak connect hours, handling objections, pipeline recovery).
6. "repInsights": Array of { repName: string, feedback: string } giving personalized 1-sentence guidance for each rep.

Respond strictly in JSON format without markdown fences:
{
  "headline": "...",
  "summary": "...",
  "teamStatus": "PACE_LAG",
  "priorityAction": "...",
  "smartDirectives": ["...", "..."],
  "repInsights": [{"repName": "...", "feedback": "..."}]
}
`;

    const aiRes = await askSmartAIJSON<NemotronTelecallingCoachResult>(prompt, {
      systemPrompt: "You are an Executive AI Telecalling Coach. Output valid JSON only.",
      temperature: 0.2,
      maxTokens: 1024,
      preferredProvider: "gemini"
    });

    if (aiRes.success && aiRes.data?.headline) {
      return {
        success: true,
        data: {
          ...aiRes.data,
          provider: aiRes.provider || "gemini"
        }
      };
    }

    // Algorithmic Fallback if AI unavailable
    return {
      success: true,
      data: {
        headline: payload.totalCalls === 0 ? "Daily Calling Pace: Inactive" : "Calling Momentum In Progress",
        summary: payload.totalCalls === 0 
          ? `0 calls logged for ${payload.timeframe}. To hit daily revenue targets, initiate outbound calls to high-probability buyers.`
          : `${payload.totalCalls} calls logged with ${payload.connectRate}% connect rate across ${payload.employeeStats.length} reps.`,
        teamStatus: payload.totalCalls === 0 ? "PACE_LAG" : (payload.connectRate >= 40 ? "OPTIMAL" : "ATTENTION"),
        priorityAction: "Launch Outbound Power Dialing queue to connect with pending leads and repeat buyers.",
        smartDirectives: [
          "Focus outbound outreach between 11:00 AM and 1:30 PM for maximum decision-maker connect rates.",
          "Prioritize wholesale buyers who haven't placed orders in the last 30 days.",
          "Log detailed call outcomes immediately after each interaction to sync customer pipelines."
        ],
        repInsights: payload.employeeStats.map(e => ({
          repName: e.name,
          feedback: e.totalCalls === 0 ? "Needs to initiate first calling block to build daily momentum." : "Continue driving outbound follow-ups."
        })),
        provider: "rule-engine"
      }
    };
  } catch (error: any) {
    console.error("Telecalling Coach Error:", error);
    return { success: false, error: error.message };
  }
}

export interface SyncCallLogInput {
  id?: string;
  number: string;
  name?: string;
  type: "INCOMING" | "OUTGOING" | "MISSED" | "REJECTED" | "BLOCKED" | "VOICEMAIL";
  timestamp: number;
  duration: number;
}

/**
 * Sync native device call history (missed, incoming, outbound calls) into CRM database.
 * Auto-matches phone numbers to existing customers and leads.
 */
export async function syncDeviceCallLogs(deviceLogs: SyncCallLogInput[]) {
  if (!Array.isArray(deviceLogs) || deviceLogs.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const rawOrgId = await getTenantOrgId().catch(() => null);
    const orgId = (rawOrgId && rawOrgId !== "default-org") ? rawOrgId : undefined;
    const session = await getServerSession(authOptions).catch(() => null);
    const userId = (session?.user as any)?.id;

    let employee = null;
    if (userId) {
      employee = await prisma.employee.findUnique({ where: { userId } });
    }
    if (!employee && orgId) {
      employee = await prisma.employee.findFirst({ where: { organizationId: orgId } });
    }
    if (!employee) {
      employee = await prisma.employee.findFirst();
    }

    if (!employee) {
      return { success: false, error: "No employee profile found" };
    }

    let syncedCount = 0;

    for (const log of deviceLogs) {
      if (!log || !log.number) continue;
      const cleanPhone = String(log.number).replace(/\D/g, "");
      if (cleanPhone.length < 5) continue; // Skip carrier USSD codes or invalid numbers

      const callDate = new Date(log.timestamp);
      if (isNaN(callDate.getTime())) continue;

      const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

      // Match Customer or Lead first
      let customerId: string | null = null;
      let leadId: string | null = null;

      const matchCustomer = await prisma.customer.findFirst({
        where: {
          organizationId: orgId || undefined,
          OR: [
            { mobile: { contains: last10 } },
            { whatsappNumber: { contains: last10 } },
            { alternatePhone: { contains: last10 } }
          ]
        },
        select: { id: true }
      });

      if (matchCustomer) {
        customerId = matchCustomer.id;
      } else {
        const matchLead = await prisma.lead.findFirst({
          where: {
            organizationId: orgId || undefined,
            whatsappNumber: { contains: last10 }
          },
          select: { id: true }
        });
        if (matchLead) {
          leadId = matchLead.id;
        }
      }

      // Deduplication check: verify if a call with this number or lead/customer already exists within +/- 15 minutes
      const minTime = new Date(log.timestamp - (15 * 60 * 1000));
      const maxTime = new Date(log.timestamp + (15 * 60 * 1000));

      const existingCall = await prisma.call.findFirst({
        where: {
          createdAt: { gte: minTime, lte: maxTime },
          OR: [
            ...(customerId ? [{ customerId }] : []),
            ...(leadId ? [{ leadId }] : []),
            { notes: { contains: last10 } }
          ]
        },
        select: { id: true }
      });

      if (existingCall) {
        continue; // Already recorded
      }

      const isMissed = log.type === "MISSED" || log.type === "REJECTED" || log.type === "BLOCKED";
      const isIncoming = log.type === "INCOMING";
      const callType = (isIncoming || isMissed) ? "INBOUND" : "OUTBOUND";
      const status = isMissed ? "No Answer" : (log.duration > 0 ? "Completed" : "No Answer");
      const outcome = isMissed
        ? "Missed Call"
        : isIncoming
          ? (log.duration > 0 ? "Incoming Call Connected" : "Missed Call")
          : (log.duration > 0 ? "Outgoing Call Connected" : "No Answer / Busy");

      const callerName = log.name && log.name !== log.number ? log.name.trim() : "";
      const noteParts = [`[Phone: ${log.number}]`];
      if (callerName) noteParts.push(`[Name: ${callerName}]`);
      if (log.id) noteParts.push(`[DeviceCallId: ${log.id}]`);
      noteParts.push(`Device ${log.type.toLowerCase()} call`);

      await prisma.call.create({
        data: {
          callType,
          status,
          outcome,
          durationSec: isMissed ? 0 : Math.max(0, log.duration || 0),
          notes: noteParts.join(" "),
          createdAt: callDate,
          employeeId: employee.id,
          customerId,
          leadId
        }
      });

      syncedCount++;
    }

    if (syncedCount > 0) {
      revalidatePath("/calls");
    }

    return { success: true, count: syncedCount };
  } catch (err: any) {
    console.error("syncDeviceCallLogs error:", err);
    return { success: false, error: err?.message || "Failed to sync device call logs" };
  }
}

/**
 * Auto-correct inverted call transcripts in the database.
 */
export async function autoFixAllInvertedCallTranscripts() {
  try {
    const calls = await prisma.call.findMany({
      where: {
        notes: { contains: "[Auto-Transcript]" }
      },
      include: {
        employee: { include: { user: true } },
        lead: true,
        customer: true
      }
    });

    let fixedCount = 0;
    for (const call of calls) {
      if (!call.notes) continue;
      const rep = call.employee?.user?.name || "Ikra";
      const cust = call.customer?.businessName || call.lead?.name || "Customer";
      const parsed = parseTranscriptDialogue(call.notes, rep, cust);
      if (parsed.wasInverted) {
        const parts: string[] = [];
        if (parsed.cleanedTranscript) parts.push(`[Auto-Transcript]:\n${parsed.cleanedTranscript}`);
        if (parsed.aiSummary) parts.push(`[AI Summary]: ${parsed.aiSummary}`);
        if (parsed.userNotes) parts.push(parsed.userNotes);

        await prisma.call.update({
          where: { id: call.id },
          data: { notes: parts.join("\n\n") }
        });
        fixedCount++;
      }
    }

    if (fixedCount > 0) {
      revalidatePath("/calls");
      revalidatePath("/leads");
      revalidatePath("/customers");
    }

    return { success: true, fixedCount };
  } catch (err: any) {
    console.error("autoFixAllInvertedCallTranscripts error:", err);
    return { success: false, error: err?.message };
  }
}

/**
 * Automatically clean up any unconnected calls (0s duration, No Answer, Busy, Voicemail, Switched Off)
 * that have an [Auto-Transcript] or attached audio recording mistakenly saved.
 */
export async function cleanUnconnectedCallTranscripts() {
  try {
    const calls = await prisma.call.findMany({
      where: {
        OR: [
          { notes: { contains: "[Auto-Transcript]" } },
          { recordingUrl: { not: null } }
        ]
      }
    });

    let cleanedCount = 0;
    for (const call of calls) {
      const isUnconnected = (call.durationSec === 0 || call.durationSec === null) ||
        ["missed", "busy", "no answer", "rejected", "failed", "cancelled", "not connected", "voicemail", "callback", "call later", "wrong number"].some(
          s => (call.status || "").toLowerCase().includes(s) || (call.outcome || "").toLowerCase().includes(s)
        ) || (call.status !== "Completed" && call.status !== "Connected");

      if (isUnconnected) {
        let cleanNotes = call.notes
          ? call.notes.replace(/\[Auto-Transcript\][\s\S]*?(?=\n\n|$)/g, "").replace(/\[AI Summary\][\s\S]*?(?=\n\n|$)/g, "").trim()
          : null;
        if (!cleanNotes) cleanNotes = null;

        await prisma.call.update({
          where: { id: call.id },
          data: {
            notes: cleanNotes,
            recordingUrl: null,
            summary: null,
            durationSec: 0
          }
        });
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      revalidatePath("/calls");
      revalidatePath("/leads");
      revalidatePath("/customers");
    }

    return { success: true, cleanedCount };
  } catch (err: any) {
    console.error("cleanUnconnectedCallTranscripts error:", err);
    return { success: false, error: err?.message };
  }
}

/**
 * Deduplicate any calls that were saved twice (e.g. from device log + manual dialer save)
 * and merge duplicate leads that share the same 10-digit phone number.
 */
export async function mergeDuplicateRecentCallsAndLeads() {
  try {
    let mergedCalls = 0;
    let mergedLeads = 0;

    // 1. Deduplicate Calls (e.g. from the past 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCalls = await prisma.call.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "desc" },
      include: { customer: true, lead: true }
    });

    const callsToDelete = new Set<string>();

    for (let i = 0; i < recentCalls.length; i++) {
      const c1 = recentCalls[i];
      if (callsToDelete.has(c1.id)) continue;

      const phone1 = c1.lead?.whatsappNumber || c1.customer?.mobile || c1.customer?.whatsappNumber || (c1.notes?.match(/\[Phone:\s*([+0-9]+)\]/)?.[1]) || "";
      const last10_1 = phone1.replace(/\D/g, "").slice(-10);
      const time1 = new Date(c1.createdAt).getTime();

      for (let j = i + 1; j < recentCalls.length; j++) {
        const c2 = recentCalls[j];
        if (callsToDelete.has(c2.id)) continue;

        const time2 = new Date(c2.createdAt).getTime();
        if (Math.abs(time1 - time2) > 15 * 60 * 1000) break;

        const phone2 = c2.lead?.whatsappNumber || c2.customer?.mobile || c2.customer?.whatsappNumber || (c2.notes?.match(/\[Phone:\s*([+0-9]+)\]/)?.[1]) || "";
        const last10_2 = phone2.replace(/\D/g, "").slice(-10);

        const sameTarget = (c1.customerId && c1.customerId === c2.customerId) ||
          (c1.leadId && c1.leadId === c2.leadId) ||
          (last10_1 && last10_2 && last10_1 === last10_2);

        if (sameTarget) {
          const c1IsDevice = c1.outcome === "Outgoing Call Connected" || c1.outcome === "Incoming Call Connected" || (c1.notes?.includes("Device outgoing call") || false);
          const c2IsDevice = c2.outcome === "Outgoing Call Connected" || c2.outcome === "Incoming Call Connected" || (c2.notes?.includes("Device outgoing call") || false);

          if (c1IsDevice && !c2IsDevice) {
            callsToDelete.add(c1.id);
          } else if (!c1IsDevice && c2IsDevice) {
            callsToDelete.add(c2.id);
          } else if (c1.durationSec === c2.durationSec && Math.abs(time1 - time2) < 5 * 60 * 1000) {
            const c1Score = (c1.recordingUrl ? 2 : 0) + (c1.notes?.length || 0);
            const c2Score = (c2.recordingUrl ? 2 : 0) + (c2.notes?.length || 0);
            if (c1Score >= c2Score) {
              callsToDelete.add(c2.id);
            } else {
              callsToDelete.add(c1.id);
            }
          }
        }
      }
    }

    if (callsToDelete.size > 0) {
      await prisma.call.deleteMany({
        where: { id: { in: Array.from(callsToDelete) } }
      });
      mergedCalls = callsToDelete.size;
    }

    // 2. Deduplicate Leads:
    const allLeads = await prisma.lead.findMany({
      orderBy: { createdAt: "asc" }
    });

    const leadsByNumber = new Map<string, typeof allLeads>();
    for (const lead of allLeads) {
      const last10 = (lead.whatsappNumber || "").replace(/\D/g, "").slice(-10);
      if (last10.length >= 7) {
        if (!leadsByNumber.has(last10)) leadsByNumber.set(last10, []);
        leadsByNumber.get(last10)!.push(lead);
      }
    }

    for (const [_, duplicates] of leadsByNumber.entries()) {
      if (duplicates.length <= 1) continue;

      const primary = duplicates.find(l => !l.name.startsWith("Contact ") && !l.name.startsWith("Lead ") && l.name !== "New Phone Lead") || duplicates[0];
      const dupesToDelete = duplicates.filter(l => l.id !== primary.id);

      for (const dupe of dupesToDelete) {
        await prisma.call.updateMany({ where: { leadId: dupe.id }, data: { leadId: primary.id } });
        await prisma.followUp.updateMany({ where: { leadId: dupe.id }, data: { leadId: primary.id } });
        await prisma.task.updateMany({ where: { leadId: dupe.id }, data: { leadId: primary.id } });
        await prisma.lead.delete({ where: { id: dupe.id } }).catch(() => {});
        mergedLeads++;
      }
    }

    if (mergedCalls > 0 || mergedLeads > 0) {
      revalidatePath("/calls");
      revalidatePath("/leads");
      revalidatePath("/");
    }

    return { success: true, mergedCalls, mergedLeads };
  } catch (err: any) {
    console.error("mergeDuplicateRecentCallsAndLeads error:", err);
    return { success: false, error: err?.message };
  }
}


