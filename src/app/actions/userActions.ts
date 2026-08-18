"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  const salaryStr = formData.get("salary") as string;
  const salary = salaryStr ? parseFloat(salaryStr) : null;

  if (!name || !email || !password || !role) {
    return { error: "All fields are required" };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "Email already exists" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });

    // Automatically create an employee record for them
    await prisma.employee.create({
      data: {
        userId: user.id,
        employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        department: role === "HR" ? "HR" : role === "SALES" ? "Sales" : "Management",
        employmentStatus: "Active",
        salary: salary,
      }
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to create user:", error);
    return { error: "Failed to create user. Please try again." };
  }
}

export async function updateUser(id: string, formData: FormData) {
  const role = formData.get("role") as string;
  const canManageSettings = formData.get("canManageSettings") === "true";
  const isActive = formData.get("isActive") === "true";

  if (!id) {
    return { error: "User ID is required" };
  }

  try {
    await prisma.user.update({
      where: { id },
      data: {
        role,
        canManageSettings,
        isActive,
      },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update user:", error);
    return { error: "Failed to update user. Please try again." };
  }
}
