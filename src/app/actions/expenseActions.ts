"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getTenantOrgId } from "@/lib/tenant";

export async function getExpenses() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const organizationId = await getTenantOrgId();
  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  try {
    let whereClause: any = { employee: { organizationId } };
    if (!isAdmin) {
      const employee = await prisma.employee.findFirst({ where: { userId, organizationId } });
      if (!employee) return { error: "Employee record not found" };
      whereClause.employeeId = employee.id;
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        employee: { include: { user: { select: { name: true } } } }
      },
      orderBy: { date: 'desc' }
    });

    return { success: true, expenses, isAdmin };
  } catch (error: any) {
    return { error: "Failed to fetch expenses: " + error.message };
  }
}

export async function submitExpense(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const userId = (session.user as any).id;
  const organizationId = await getTenantOrgId();

  let employee = await prisma.employee.findFirst({ where: { userId, organizationId } });
  if (!employee) {
    employee = await prisma.employee.findUnique({ where: { userId } });
  }
  if (!employee) return { error: "Employee record not linked to your user account. Please contact an admin." };

  try {
    const count = await prisma.expense.count();
    const expenseNumber = `EXP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const category = formData.get("category") as string;
    const amountStr = formData.get("amount") as string;
    const description = (formData.get("description") as string) || null;
    const dateStr = formData.get("date") as string;

    if (!category || !amountStr) {
      return { error: "Category and Amount are required fields." };
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return { error: "Please provide a valid amount greater than 0." };
    }

    await prisma.expense.create({
      data: {
        expenseNumber,
        category: category.trim(),
        amount,
        description: description?.trim() || null,
        employeeId: employee.id,
        date: dateStr ? new Date(dateStr) : new Date(),
        status: "Pending",
      }
    });

    revalidatePath("/expenses");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to submit expense: " + error.message };
  }
}

export async function updateExpense(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  try {
    const existing = await prisma.expense.findUnique({
      where: { id },
      include: { employee: true }
    });

    if (!existing) return { error: "Expense record not found." };

    // STRICT LOCK: "no changes will be made after approval"
    if (existing.status !== "Pending") {
      return {
        error: `Expense claim #${existing.expenseNumber} is already "${existing.status}". No changes are permitted after approval or settlement.`
      };
    }

    // Permission check: admin or creator
    if (!isAdmin && existing.employee?.userId !== userId) {
      return { error: "You can only edit your own pending expense claims." };
    }

    const category = formData.get("category") as string;
    const amountStr = formData.get("amount") as string;
    const description = (formData.get("description") as string) || null;
    const dateStr = formData.get("date") as string;

    if (!category || !amountStr) {
      return { error: "Category and Amount are required fields." };
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return { error: "Please provide a valid amount greater than 0." };
    }

    await prisma.expense.update({
      where: { id },
      data: {
        category: category.trim(),
        amount,
        description: description?.trim() || null,
        date: dateStr ? new Date(dateStr) : existing.date
      }
    });

    revalidatePath("/expenses");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to update expense: " + error.message };
  }
}

export async function deleteExpense(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  try {
    const existing = await prisma.expense.findUnique({
      where: { id },
      include: { employee: true }
    });

    if (!existing) return { error: "Expense record not found." };

    if (existing.status !== "Pending") {
      return { error: "Approved or finalized expenses cannot be deleted." };
    }

    if (!isAdmin && existing.employee?.userId !== userId) {
      return { error: "You can only delete your own pending claims." };
    }

    await prisma.expense.delete({ where: { id } });
    revalidatePath("/expenses");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to delete expense: " + error.message };
  }
}

export async function approveExpense(id: string) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const existing = await prisma.expense.findUnique({
      where: { id },
      include: { employee: { select: { organizationId: true } } }
    });
    if (!existing) return { error: "Expense not found" };
    if (existing.employee?.organizationId && organizationId && existing.employee.organizationId !== organizationId) {
      return { error: "Unauthorized access to expense" };
    }

    await prisma.expense.update({ where: { id }, data: { status: "Approved" } });
    revalidatePath("/expenses");
    return { success: true };
  } catch { return { error: "Failed to approve expense" }; }
}

export async function rejectExpense(id: string) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const existing = await prisma.expense.findUnique({
      where: { id },
      include: { employee: { select: { organizationId: true } } }
    });
    if (!existing) return { error: "Expense not found" };
    if (existing.employee?.organizationId && organizationId && existing.employee.organizationId !== organizationId) {
      return { error: "Unauthorized access to expense" };
    }

    await prisma.expense.update({ where: { id }, data: { status: "Rejected" } });
    revalidatePath("/expenses");
    return { success: true };
  } catch { return { error: "Failed to reject expense" }; }
}

export async function markExpensePaid(id: string) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const existing = await prisma.expense.findUnique({
      where: { id },
      include: { employee: { select: { organizationId: true } } }
    });
    if (!existing) return { error: "Expense not found" };
    if (existing.employee?.organizationId && organizationId && existing.employee.organizationId !== organizationId) {
      return { error: "Unauthorized access to expense" };
    }

    await prisma.expense.update({ where: { id }, data: { status: "Paid" } });
    revalidatePath("/expenses");
    return { success: true };
  } catch { return { error: "Failed to mark expense as paid" }; }
}
