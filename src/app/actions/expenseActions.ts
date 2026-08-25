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
  const employee = await prisma.employee.findUnique({ where: { userId } });
  if (!employee) return { error: "Employee record not found" };

  try {
    const count = await prisma.expense.count();
    const expenseNumber = `EXP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    await prisma.expense.create({
      data: {
        expenseNumber,
        category: formData.get("category") as string,
        amount: parseFloat(formData.get("amount") as string),
        description: formData.get("description") as string || null,
        employeeId: employee.id,
        date: formData.get("date") ? new Date(formData.get("date") as string) : new Date(),
        status: "Pending",
      }
    });

    revalidatePath("/expenses");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to submit expense: " + error.message };
  }
}

export async function approveExpense(id: string) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return { error: "Unauthorized" };

  try {
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
    await prisma.expense.update({ where: { id }, data: { status: "Paid" } });
    revalidatePath("/expenses");
    return { success: true };
  } catch { return { error: "Failed to mark expense as paid" }; }
}
