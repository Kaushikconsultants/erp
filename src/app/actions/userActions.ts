"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

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

    await prisma.user.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/settings");
    revalidatePath("/settings/roles");
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
