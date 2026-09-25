"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions, parseUserAgent } from "@/lib/auth";
import { getTenantOrgId, checkTenantQuota } from "@/lib/tenant";
import { generateUniqueEmployeeId } from "@/lib/employeeHelper";

export async function getHiredCandidates() {
  try {
    const candidates = await prisma.candidate.findMany({
      where: {
        status: { in: ['HIRED', 'ROUND_3_PASSED', 'ROUND_2_PASSED', 'NEW'] }
      },
      select: {
        id: true,
        candidateNumber: true,
        name: true,
        email: true,
        phone: true,
        appliedRole: true,
        experienceYears: true,
        expectedSalary: true,
        resumeUrl: true,
        referenceName: true,
        status: true,
        finalConclusion: true,
        createdAt: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 50
    });
    return { success: true, candidates };
  } catch (error: any) {
    console.error("Failed to fetch candidates:", error);
    return { error: error?.message || "Failed to fetch candidates", candidates: [] };
  }
}

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;
  const department = formData.get("department") as string;
  const designation = formData.get("designation") as string;
  const employeeCode = formData.get("employeeCode") as string;
  const mobile = formData.get("mobile") as string;
  const joiningDateStr = formData.get("joiningDate") as string;
  const birthday = formData.get("birthday") as string;
  const gender = formData.get("gender") as string;
  const bloodGroup = formData.get("bloodGroup") as string;
  const emergencyContactName = formData.get("emergencyContactName") as string;
  const emergencyContactPhone = formData.get("emergencyContactPhone") as string;
  const address = formData.get("address") as string;
  const resumeUrl = formData.get("resumeUrl") as string;
  const avatarUrl = formData.get("avatarUrl") as string;
  const candidateId = formData.get("candidateId") as string;
  const allowedSections = formData.get("allowedSections") as string;
  const canManageSettingsRaw = formData.get("canManageSettings");

  const bankName = formData.get("bankName") as string;
  const bankAccountNo = formData.get("bankAccountNo") as string;
  const ifscCode = formData.get("ifscCode") as string;
  const panNumber = formData.get("panNumber") as string;
  const aadhaarNumber = formData.get("aadhaarNumber") as string;

  const salaryStr = formData.get("salary") as string;
  const salary = salaryStr ? parseFloat(salaryStr) : null;

  if (!name || !email || !password || !role) {
    return { error: "Name, email, password, and role are required" };
  }

  if (password.trim().length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const callerRole = (session.user as any).role;
    const callerCanManage = (session.user as any).canManageSettings;
    if (callerRole !== "ADMIN" && callerRole !== "SUPER_ADMIN" && !callerCanManage) {
      return { error: "Permission denied. Only administrators can create users." };
    }

    if (role === "SUPER_ADMIN" && callerRole !== "SUPER_ADMIN") {
      return { error: "Only Super Admins can create another Super Admin account." };
    }

    const organizationId = await getTenantOrgId();

    const quotaCheck = await checkTenantQuota(organizationId, 'USERS');
    if (!quotaCheck.allowed) {
      return { error: quotaCheck.error };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim() },
    });

    if (existingUser) {
      return { error: "A user with this email address already exists" };
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    const isSuperOrAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
    const canManageSettings = canManageSettingsRaw !== null ? canManageSettingsRaw === "true" : isSuperOrAdmin;

    const departmentMap: Record<string, string> = {
      HR: "HR & Recruitment",
      SALES: "Sales & CRM",
      DISPATCH: "Dispatch & Logistics",
      ACCOUNTS: "Accounts & Finance",
      WAREHOUSE: "Warehouse & Stock",
      PURCHASE: "Purchase & Procurement",
      SUPPORT: "Customer Support",
      MANAGER: "Operations Management",
      ADMIN: "Administration",
      SUPER_ADMIN: "Executive Leadership"
    };

    const resolvedDepartment = department?.trim() || departmentMap[role] || "General Operations";

    const bankDetailsObj = {
      bankName: bankName?.trim() || "",
      bankAccountNo: bankAccountNo?.trim() || "",
      ifscCode: ifscCode?.trim() || "",
      panNumber: panNumber?.trim() || "",
      aadhaarNumber: aadhaarNumber?.trim() || ""
    };

    const notesObj = {
      birthday: birthday?.trim() || "",
      gender: gender?.trim() || "",
      bloodGroup: bloodGroup?.trim() || "",
      resumeUrl: resumeUrl?.trim() || "",
      candidateId: candidateId?.trim() || "",
      onboardedAt: new Date().toISOString()
    };

    let emergencyContactCombined = "";
    if (emergencyContactName?.trim() || emergencyContactPhone?.trim()) {
      emergencyContactCombined = `${emergencyContactName?.trim() || 'Contact'} (${emergencyContactPhone?.trim() || 'N/A'})`;
    }

    const user = await prisma.user.create({
      data: {
        organizationId,
        name: name.trim(),
        email: email.trim(),
        password: hashedPassword,
        role,
        canManageSettings,
        allowedSections: allowedSections || null,
        avatarUrl: avatarUrl?.trim() || null,
        image: avatarUrl?.trim() || null,
      },
    });

    const empCode = employeeCode?.trim() || await generateUniqueEmployeeId(prisma);
    const joiningDate = joiningDateStr ? new Date(joiningDateStr) : new Date();

    await prisma.employee.create({
      data: {
        organizationId,
        userId: user.id,
        employeeId: empCode,
        department: resolvedDepartment,
        designation: designation?.trim() || null,
        mobile: mobile?.trim() || null,
        joiningDate: isNaN(joiningDate.getTime()) ? new Date() : joiningDate,
        employmentStatus: "Active",
        salary: salary,
        address: address?.trim() || null,
        emergencyContact: emergencyContactCombined || null,
        bankDetails: JSON.stringify(bankDetailsObj),
        notes: JSON.stringify(notesObj)
      }
    });

    if (candidateId) {
      await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          status: 'HIRED',
          finalConclusion: `Onboarded as Staff Member (${user.name}) on ${new Date().toLocaleDateString()}`
        }
      }).catch((e) => console.warn("Failed to link candidate status:", e));
    }

    revalidatePath("/settings");
    revalidatePath("/settings/roles");
    revalidatePath("/hrms");
    revalidatePath("/hrms/payroll");
    revalidatePath("/payroll");
    revalidatePath("/hiring");
    return { success: true, userId: user.id };
  } catch (error: any) {
    console.error("Failed to create user:", error);
    return { error: error?.message || "Failed to create user. Please try again." };
  }
}

export async function updateUser(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const callerRole = (session.user as any).role;
  const callerCanManage = (session.user as any).canManageSettings;
  if (callerRole !== "ADMIN" && callerRole !== "SUPER_ADMIN" && !callerCanManage) {
    return { error: "Permission denied. Only administrators can update users." };
  }

  const role = formData.get("role") as string;
  const canManageSettings = formData.get("canManageSettings") === "true";
  const isActive = formData.get("isActive") === "true";
  const allowedSections = formData.get("allowedSections") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!id) {
    return { error: "User ID is required" };
  }

  try {
    const callerOrgId = await getTenantOrgId();
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { organizationId: true, role: true }
    });

    if (!targetUser || targetUser.organizationId !== callerOrgId) {
      return { error: "User not found or access denied." };
    }

    if (role === "SUPER_ADMIN" && callerRole !== "SUPER_ADMIN") {
      return { error: "Only Super Admins can promote an account to Super Admin." };
    }

    const updateData: any = {
      role,
      canManageSettings,
      isActive,
      allowedSections: allowedSections || null
    };

    if (newPassword && newPassword.trim().length > 0) {
      if (newPassword.trim().length < 8) {
        return { error: "Password must be at least 8 characters long." };
      }
      updateData.password = await bcrypt.hash(newPassword.trim(), 10);
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: updateData,
      });

      // Keep employee status in sync
      const emp = await tx.employee.findUnique({ where: { userId: id } });
      if (emp) {
        await tx.employee.update({
          where: { id: emp.id },
          data: { employmentStatus: isActive ? "Active" : "Inactive" }
        });
      }
    });

    revalidatePath("/settings");
    revalidatePath("/settings/roles");
    revalidatePath("/hrms");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update user:", error);
    return { error: error?.message || "Failed to update user. Please try again." };
  }
}

export async function updateUserPassword(
  userId: string, 
  newPassword: string, 
  signOutAllDevices: boolean = false
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  if (!userId || !newPassword || newPassword.trim().length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  try {
    const currentUserId = (session.user as any).id;
    const callerRole = (session.user as any).role;
    const callerCanManage = (session.user as any).canManageSettings;
    const callerOrgId = await getTenantOrgId();

    const isSelf = currentUserId === userId;
    const isAdmin = callerRole === "ADMIN" || callerRole === "SUPER_ADMIN" || callerCanManage;

    if (!isSelf && !isAdmin) {
      return { error: "Permission denied." };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true }
    });

    if (!targetUser || (!isSelf && targetUser.organizationId !== callerOrgId)) {
      return { error: "User not found or access denied." };
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
    const updateData: any = { 
      password: hashedPassword
    };

    if (signOutAllDevices) {
      updateData.presenceStatus = "OFFLINE";
      updateData.updatedAt = new Date();
      try {
        await prisma.auditLog.updateMany({
          where: {
            userId,
            module: "AUTH_SESSION",
            action: "DEVICE_LOGIN"
          },
          data: {
            newValue: "REVOKED"
          }
        });
      } catch {}
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    revalidatePath("/settings");
    revalidatePath("/settings/roles");
    return { 
      success: true, 
      message: signOutAllDevices 
        ? "Password updated and signed out of all devices successfully!" 
        : "User password updated successfully!" 
    };
  } catch (error: any) {
    console.error("Failed to update password:", error);
    return { error: error?.message || "Failed to update password. Please try again." };
  }
}

/**
 * Get active devices currently logged in for a user
 */
export async function getUserActiveDevices(userId: string): Promise<{
  success: boolean;
  count: number;
  devices: {
    id: string;
    deviceType: string;
    browser: string;
    os: string;
    ipAddress?: string | null;
    lastActiveAt: string;
    isCurrent?: boolean;
  }[];
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, count: 0, devices: [], error: "Unauthorized" };

    const currentUserId = (session.user as any).id;
    const currentRole = (session.user as any).role;
    const canManage = (session.user as any).canManageSettings;

    // Must be admin or self
    if (currentUserId !== userId && currentRole !== "ADMIN" && currentRole !== "SUPER_ADMIN" && !canManage) {
      return { success: false, count: 0, devices: [], error: "Permission denied." };
    }

    const callerOrgId = await getTenantOrgId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        organizationId: true,
        lastActiveAt: true,
        presenceStatus: true,
        updatedAt: true
      }
    });

    if (!user || user.organizationId !== callerOrgId) {
      return { success: false, count: 0, devices: [], error: "User not found or access denied." };
    }

    // Fetch device sessions from AuditLog (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let sessionLogs: any[] = [];
    try {
      sessionLogs = await prisma.auditLog.findMany({
        where: {
          userId,
          module: "AUTH_SESSION",
          action: "DEVICE_LOGIN",
          newValue: "ACTIVE",
          createdAt: { gte: thirtyDaysAgo }
        },
        orderBy: { createdAt: "desc" },
        take: 50
      });
    } catch (logErr) {
      console.warn("Could not query session logs:", logErr);
    }

    const deviceMap = new Map<string, any>();
    for (const log of sessionLogs) {
      if (!deviceMap.has(log.recordId)) {
        try {
          const parsed = JSON.parse(log.previousValue || "{}");
          deviceMap.set(log.recordId, {
            id: log.id,
            deviceType: parsed.deviceType || "Desktop",
            browser: parsed.browser || "Web Browser",
            os: parsed.os || "Unknown OS",
            ipAddress: parsed.ipAddress || null,
            lastActiveAt: log.createdAt.toISOString()
          });
        } catch {
          deviceMap.set(log.recordId, {
            id: log.id,
            deviceType: "Desktop",
            browser: "Web Browser",
            os: "Unknown OS",
            ipAddress: null,
            lastActiveAt: log.createdAt.toISOString()
          });
        }
      }
    }

    // Auto-detect and register current caller's device session if not already tracked
    try {
      const hdrs = await headers();
      const currentUa = hdrs.get("user-agent") || "";
      const forwarded = hdrs.get("x-forwarded-for") || hdrs.get("x-real-ip") || "";
      const currentIp = forwarded ? forwarded.split(",")[0].trim() : null;
      if (currentUa) {
        const uaInfo = parseUserAgent(currentUa);
        const currentFingerprint = `${uaInfo.deviceType}-${uaInfo.browser}-${uaInfo.os}-${currentIp || 'local'}`;
        if (!deviceMap.has(currentFingerprint)) {
          await prisma.auditLog.create({
            data: {
              userId,
              action: "DEVICE_LOGIN",
              module: "AUTH_SESSION",
              recordId: currentFingerprint,
              previousValue: JSON.stringify({
                deviceType: uaInfo.deviceType,
                browser: uaInfo.browser,
                os: uaInfo.os,
                ipAddress: currentIp,
                lastActiveAt: new Date().toISOString()
              }),
              newValue: "ACTIVE"
            }
          }).catch(() => {});

          deviceMap.set(currentFingerprint, {
            id: "current-" + Date.now(),
            deviceType: uaInfo.deviceType,
            browser: uaInfo.browser,
            os: uaInfo.os,
            ipAddress: currentIp,
            lastActiveAt: new Date().toISOString(),
            isCurrent: true
          });
        }
      }
    } catch (hdrErr) {
      console.warn("Could not inspect current headers in getUserActiveDevices:", hdrErr);
    }

    const devices = Array.from(deviceMap.values());
    if (devices.length > 0) {
      return {
        success: true,
        count: devices.length,
        devices
      };
    }

    const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : new Date(user.updatedAt);
    return {
      success: true,
      count: 1,
      devices: [
        {
          id: "primary-device",
          deviceType: "Desktop",
          browser: "Chrome / Web Browser",
          os: "Primary Device",
          ipAddress: null,
          lastActiveAt: lastActive.toISOString(),
          isCurrent: true
        }
      ]
    };
  } catch (error: any) {
    console.error("getUserActiveDevices error:", error);
    return { success: false, count: 1, devices: [], error: error?.message };
  }
}

/**
 * Sign out of all active devices immediately for a user
 */
export async function signOutAllUserDevices(userId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const currentUserId = (session.user as any).id;
    const currentRole = (session.user as any).role;
    const canManage = (session.user as any).canManageSettings;

    if (currentUserId !== userId && currentRole !== "ADMIN" && currentRole !== "SUPER_ADMIN" && !canManage) {
      return { success: false, error: "Permission denied." };
    }

    const callerOrgId = await getTenantOrgId();
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true }
    });

    if (!targetUser || targetUser.organizationId !== callerOrgId) {
      return { success: false, error: "User not found or access denied." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        presenceStatus: "OFFLINE",
        updatedAt: new Date()
      }
    });

    try {
      await prisma.auditLog.updateMany({
        where: {
          userId,
          module: "AUTH_SESSION",
          action: "DEVICE_LOGIN"
        },
        data: {
          newValue: "REVOKED"
        }
      });
    } catch {}

    revalidatePath("/settings");
    revalidatePath("/settings/roles");
    return { success: true, message: "Successfully signed out of all devices!" };
  } catch (error: any) {
    console.error("signOutAllUserDevices error:", error);
    return { success: false, error: error?.message || "Failed to sign out all devices." };
  }
}

export async function getUserCurrentPassword(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const currentRole = (session.user as any).role;
  const canManage = (session.user as any).canManageSettings;
  if (currentRole !== "ADMIN" && currentRole !== "SUPER_ADMIN" && !canManage) {
    return { error: "Permission denied. Only administrators can view user credentials." };
  }

  try {
    const callerOrgId = await getTenantOrgId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        organizationId: true,
        name: true,
        email: true,
        password: true,
        updatedAt: true
      }
    });

    if (!user || user.organizationId !== callerOrgId) return { error: "User not found" };

    return { 
      success: true, 
      hasPassword: Boolean(user.password),
      updatedAt: user.updatedAt
    };
  } catch (error: any) {
    console.error("Failed to fetch user credentials:", error);
    return { error: error?.message || "Failed to retrieve credential status" };
  }
}

export async function toggleUserStatus(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const callerRole = (session.user as any).role;
  const callerCanManage = (session.user as any).canManageSettings;
  if (callerRole !== "ADMIN" && callerRole !== "SUPER_ADMIN" && !callerCanManage) {
    return { error: "Permission denied. Only administrators can update user status." };
  }

  const currentUserId = (session.user as any).id;
  if (currentUserId === userId) {
    return { error: "You cannot deactivate your own account." };
  }

  try {
    const callerOrgId = await getTenantOrgId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true }
    });

    if (!user || user.organizationId !== callerOrgId) return { error: "User not found." };

    const newStatus = !user.isActive;

    // Prevent deactivating the only active Super Admin
    if (!newStatus && user.role === 'SUPER_ADMIN') {
      const activeSuperAdmins = await prisma.user.count({
        where: {
          role: 'SUPER_ADMIN',
          isActive: true,
          organizationId: user.organizationId
        }
      });
      if (activeSuperAdmins <= 1) {
        return { error: "Cannot deactivate the only active Super Admin account." };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { isActive: newStatus }
      });

      if (user.employee) {
        await tx.employee.update({
          where: { id: user.employee.id },
          data: { employmentStatus: newStatus ? "Active" : "Inactive" }
        });
      }

      await tx.auditLog.create({
        data: {
          userId: currentUserId,
          action: newStatus ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
          module: 'Settings',
          recordId: userId,
          newValue: JSON.stringify({ name: user.name, email: user.email, isActive: newStatus })
        }
      });
    });

    revalidatePath("/settings");
    revalidatePath("/settings/roles");
    revalidatePath("/hrms");
    return { success: true, isActive: newStatus };
  } catch (error: any) {
    console.error("Failed to toggle user status:", error);
    return { error: error?.message || "Failed to update user status." };
  }
}

export async function deleteUser(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const callerRole = (session.user as any).role;
  if (callerRole !== "ADMIN" && callerRole !== "SUPER_ADMIN") {
    return { error: "Permission denied. Only administrators can delete user accounts." };
  }

  const currentUserId = (session.user as any).id;
  if (currentUserId === userId) {
    return { error: "You cannot delete your own account." };
  }

  try {
    const callerOrgId = await getTenantOrgId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true }
    });

    if (!user || user.organizationId !== callerOrgId) return { error: "User not found." };

    // Prevent deleting the last Super Admin
    if (user.role === 'SUPER_ADMIN') {
      const totalSuperAdmins = await prisma.user.count({
        where: {
          role: 'SUPER_ADMIN',
          organizationId: user.organizationId
        }
      });
      if (totalSuperAdmins <= 1) {
        return { error: "Cannot delete the primary Super Admin account." };
      }
    }

    await prisma.$transaction(async (tx) => {
      if (user.employee) {
        const empId = user.employee.id;

        // 1. Unassign customers
        await tx.customer.updateMany({
          where: { assignedSalespersonId: empId },
          data: { assignedSalespersonId: null }
        });

        // 2. Clean up tasks
        await tx.task.deleteMany({
          where: {
            OR: [
              { assigneeId: empId },
              { creatorId: empId }
            ]
          }
        });

        // 3. Clean up employee-related activity logs & records
        await tx.call.deleteMany({ where: { employeeId: empId } });
        await tx.followUp.deleteMany({ where: { employeeId: empId } });
        await tx.dailySalesLog.deleteMany({ where: { employeeId: empId } });
        await tx.attendance.deleteMany({ where: { employeeId: empId } });
        await tx.leave.deleteMany({ where: { employeeId: empId } });
        await tx.salary.deleteMany({ where: { employeeId: empId } });
        await tx.incentive.deleteMany({ where: { employeeId: empId } });
        await tx.workerProductionLog.deleteMany({ where: { employeeId: empId } });

        // 4. Delete Employee record
        await tx.employee.delete({ where: { id: empId } });
      }

      // 5. Clean up user notifications, broadcasts, audits
      await tx.notification.deleteMany({ where: { userId } });
      await tx.broadcastRead.deleteMany({ where: { userId } });
      await tx.broadcastReply.deleteMany({ where: { userId } });
      await tx.teamBroadcast.deleteMany({ where: { authorId: userId } });
      await tx.auditLog.deleteMany({ where: { userId } });

      // 6. Audit log for user deletion
      await tx.auditLog.create({
        data: {
          userId: currentUserId,
          action: 'USER_DELETED',
          module: 'Settings',
          recordId: userId,
          newValue: JSON.stringify({ name: user.name, email: user.email, role: user.role })
        }
      });

      // 7. Delete User record
      await tx.user.delete({ where: { id: userId } });
    });

    revalidatePath("/settings");
    revalidatePath("/settings/roles");
    revalidatePath("/hrms");
    revalidatePath("/customers");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete user:", error);
    return { error: error?.message || "Failed to delete user." };
  }
}

export async function updateEmployee(employeeId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };
  const userRole = (session.user as any)?.role;
  const canManageSettings = (session.user as any)?.canManageSettings;
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && !canManageSettings) {
    return { error: "You don't have permission to edit employee details." };
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const mobile = formData.get("mobile") as string;
  const department = formData.get("department") as string;
  const designation = formData.get("designation") as string;
  const employeeCode = formData.get("employeeCode") as string;
  const joiningDateStr = formData.get("joiningDate") as string;
  const salaryStr = formData.get("salary") as string;
  const targetStr = formData.get("target") as string;
  
  const birthday = formData.get("birthday") as string;
  const gender = formData.get("gender") as string;
  const bloodGroup = formData.get("bloodGroup") as string;
  const emergencyContactName = formData.get("emergencyContactName") as string;
  const emergencyContactPhone = formData.get("emergencyContactPhone") as string;
  const address = formData.get("address") as string;
  const avatarUrl = formData.get("avatarUrl") as string;

  const bankName = formData.get("bankName") as string;
  const bankAccountNo = formData.get("bankAccountNo") as string;
  const ifscCode = formData.get("ifscCode") as string;
  const panNumber = formData.get("panNumber") as string;
  const aadhaarNumber = formData.get("aadhaarNumber") as string;

  const role = formData.get("role") as string;
  const allowedSections = formData.get("allowedSections") as string;
  const canManageSettingsVal = formData.get("canManageSettings") === "true";
  const isActive = formData.get("isActive") === "true";
  const newPassword = formData.get("newPassword") as string;

  if (!employeeId) return { error: "Employee ID is required." };
  if (!name?.trim()) return { error: "Employee name is required." };

  try {
    const existingEmp = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true }
    });

    if (!existingEmp) return { error: "Employee record not found." };

    const salary = salaryStr && !isNaN(parseFloat(salaryStr)) ? parseFloat(salaryStr) : null;
    const target = targetStr && !isNaN(parseFloat(targetStr)) ? parseFloat(targetStr) : null;

    let parsedNotes: any = {};
    try {
      if (existingEmp.notes) parsedNotes = JSON.parse(existingEmp.notes);
    } catch {}

    const updatedNotes = {
      ...parsedNotes,
      birthday: birthday?.trim() ?? parsedNotes.birthday ?? "",
      gender: gender?.trim() ?? parsedNotes.gender ?? "",
      bloodGroup: bloodGroup?.trim() ?? parsedNotes.bloodGroup ?? "",
      updatedAt: new Date().toISOString()
    };

    const bankDetailsObj = {
      bankName: bankName?.trim() || "",
      bankAccountNo: bankAccountNo?.trim() || "",
      ifscCode: ifscCode?.trim() || "",
      panNumber: panNumber?.trim() || "",
      aadhaarNumber: aadhaarNumber?.trim() || ""
    };

    let emergencyContactCombined = "";
    if (emergencyContactName?.trim() || emergencyContactPhone?.trim()) {
      emergencyContactCombined = `${emergencyContactName?.trim() || 'Contact'} (${emergencyContactPhone?.trim() || 'N/A'})`;
    }

    const joiningDate = joiningDateStr ? new Date(joiningDateStr) : existingEmp.joiningDate;

    await prisma.$transaction(async (tx) => {
      // 1. Update Employee table
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          department: department?.trim() || existingEmp.department,
          designation: designation?.trim() || null,
          mobile: mobile?.trim() || null,
          employeeId: employeeCode?.trim() || existingEmp.employeeId,
          joiningDate: joiningDate && !isNaN(joiningDate.getTime()) ? joiningDate : existingEmp.joiningDate,
          employmentStatus: isActive ? "Active" : "Inactive",
          salary: salary !== null ? salary : existingEmp.salary,
          target: target !== null ? target : existingEmp.target,
          address: address?.trim() || null,
          emergencyContact: emergencyContactCombined || existingEmp.emergencyContact,
          bankDetails: JSON.stringify(bankDetailsObj),
          notes: JSON.stringify(updatedNotes)
        }
      });

      // 2. Update User table
      if (existingEmp.userId) {
        const userUpdateData: any = {
          name: name.trim(),
          isActive,
          avatarUrl: avatarUrl?.trim() || existingEmp.user?.avatarUrl
        };

        if (email?.trim() && email.trim().toLowerCase() !== existingEmp.user?.email) {
          const emailCheck = await tx.user.findUnique({
            where: { email: email.trim().toLowerCase() }
          });
          if (emailCheck && emailCheck.id !== existingEmp.userId) {
            throw new Error("This email is already in use by another user account.");
          }
          userUpdateData.email = email.trim().toLowerCase();
        }

        if (role) userUpdateData.role = role;
        if (allowedSections) userUpdateData.allowedSections = allowedSections;
        if (formData.has("canManageSettings")) userUpdateData.canManageSettings = canManageSettingsVal;
        if (newPassword && newPassword.trim().length >= 4) {
          userUpdateData.password = await bcrypt.hash(newPassword.trim(), 10);
        }

        await tx.user.update({
          where: { id: existingEmp.userId },
          data: userUpdateData
        });
      }
    });

    revalidatePath("/payroll");
    revalidatePath("/hrms");
    revalidatePath("/hrms/payroll");
    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update employee:", error);
    return { error: error?.message || "Failed to update employee details." };
  }
}

