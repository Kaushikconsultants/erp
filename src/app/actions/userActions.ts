"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;
  const allowedSections = formData.get("allowedSections") as string;

  const salaryStr = formData.get("salary") as string;
  const salary = salaryStr ? parseFloat(salaryStr) : null;

  if (!name || !email || !password || !role) {
    return { error: "All required fields must be filled" };
  }

  try {
    const organizationId = await getTenantOrgId();

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "A user with this email address already exists" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const isSuperOrAdmin = role === "SUPER_ADMIN" || role === "ADMIN";

    const user = await prisma.user.create({
      data: {
        organizationId,
        name,
        email,
        password: hashedPassword,
        role,
        canManageSettings: isSuperOrAdmin,
        allowedSections: allowedSections || null
      },
    });

    // Automatically create an employee record for them
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

    await prisma.employee.create({
      data: {
        organizationId,
        userId: user.id,
        employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        department: departmentMap[role] || "General Operations",
        employmentStatus: "Active",
        salary: salary,
      }
    });

    revalidatePath("/settings");
    revalidatePath("/settings/roles");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create user:", error);
    return { error: error?.message || "Failed to create user. Please try again." };
  }
}

export async function updateUser(id: string, formData: FormData) {
  const role = formData.get("role") as string;
  const canManageSettings = formData.get("canManageSettings") === "true";
  const isActive = formData.get("isActive") === "true";
  const allowedSections = formData.get("allowedSections") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!id) {
    return { error: "User ID is required" };
  }

  try {
    const updateData: any = {
      role,
      canManageSettings,
      isActive,
      allowedSections: allowedSections || null
    };

    if (newPassword && newPassword.trim().length >= 4) {
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

export async function updateUserPassword(userId: string, newPassword: string) {
  if (!userId || !newPassword || newPassword.trim().length < 4) {
    return { error: "Password must be at least 4 characters long" };
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    revalidatePath("/settings");
    revalidatePath("/settings/roles");
    return { success: true, message: "User password updated successfully!" };
  } catch (error: any) {
    console.error("Failed to update password:", error);
    return { error: error?.message || "Failed to update password. Please try again." };
  }
}

export async function toggleUserStatus(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const currentUserId = (session.user as any).id;
  if (currentUserId === userId) {
    return { error: "You cannot deactivate your own account." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true }
    });

    if (!user) return { error: "User not found." };

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

  const currentUserId = (session.user as any).id;
  if (currentUserId === userId) {
    return { error: "You cannot delete your own account." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true }
    });

    if (!user) return { error: "User not found." };

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
