"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { calculateIncentives, OrderData } from "@/lib/incentiveEngine";

export async function processSalary(employeeId: string, month: string, data: {
  basicSalary: number;
  hra: number;
  allowances: number;
  deductions: number;
  bonus: number;
  advance: number;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return { error: "Unauthorized" };

  try {
    const netSalary = data.basicSalary + data.hra + data.allowances + data.bonus - data.deductions - data.advance;

    const existing = await prisma.salary.findFirst({ where: { employeeId, month } });

    if (existing) {
      await prisma.salary.update({
        where: { id: existing.id },
        data: { ...data, netSalary, status: 'Processed' }
      });
    } else {
      await prisma.salary.create({
        data: { employeeId, month, netSalary, status: 'Processed', ...data }
      });
    }

    // Also update default base salary on Employee record
    await prisma.employee.update({
      where: { id: employeeId },
      data: { salary: data.basicSalary }
    });

    revalidatePath("/payroll");
    return { success: true, netSalary };
  } catch (error: any) {
    return { error: "Failed to process salary: " + error.message };
  }
}

export async function updateEmployeeSalary(employeeId: string, baseSalary: number) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return { error: "Unauthorized" };

  try {
    await prisma.employee.update({
      where: { id: employeeId },
      data: { salary: baseSalary }
    });
    revalidatePath("/payroll");
    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to update employee base salary: " + error.message };
  }
}

export async function markSalaryPaid(salaryId: string) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return { error: "Unauthorized" };

  try {
    await prisma.salary.update({
      where: { id: salaryId },
      data: { status: 'Paid', paymentDate: new Date() }
    });
    revalidatePath("/payroll");
    return { success: true };
  } catch { return { error: "Failed to mark salary as paid" }; }
}

export async function getPayrollData(month: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };
  const role = (session.user as any)?.role;
  const userId = (session.user as any)?.id;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  try {
    const whereEmp: any = {};
    if (!isAdmin) whereEmp.userId = userId;

    const [yearStr, monthStr] = month.split('-');
    const startDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
    const endDate = new Date(parseInt(yearStr), parseInt(monthStr), 1);

    const employees = await prisma.employee.findMany({
      where: whereEmp,
      include: {
        user: { select: { name: true, email: true } },
        salaries: { where: { month }, take: 1 },
        incentives: { where: { month }, take: 1 },
        orders: {
          where: {
            orderDate: {
              gte: startDate,
              lt: endDate
            }
          },
          select: { 
            id: true, 
            subtotal: true, 
            totalValue: true, 
            discount: true, 
            customer: { select: { status: true, preferredPaymentMethod: true } } 
          }
        }
      }
    });

    const processedEmployees = employees.map(emp => {
      const formattedOrders: OrderData[] = emp.orders.map((order: any) => ({
        id: order.id,
        taxableValue: order.subtotal || order.totalValue,
        discount: order.discount || 0,
        isCreditCustomer: order.customer?.status?.toLowerCase() === 'credit' || order.customer?.preferredPaymentMethod?.toLowerCase() === 'credit'
      }));
      
      const targetGoal = emp.target || 500000;
      const calculatedIncentive = calculateIncentives(formattedOrders, targetGoal);

      return {
        ...emp,
        dynamicIncentive: calculatedIncentive.totalIncentive
      };
    });

    return { success: true, employees: processedEmployees, isAdmin };
  } catch (error: any) {
    return { error: "Failed to fetch payroll data: " + error.message };
  }
}

export async function getAttendanceSummary(employeeId: string, month: string) {
  try {
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 0, 23, 59, 59);

    const records = await prisma.attendance.findMany({
      where: { employeeId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' }
    });

    const presentDays = records.filter(r => r.status === 'Present').length;
    const absentDays = records.filter(r => r.status === 'Absent').length;
    const halfDays = records.filter(r => r.status === 'Half Day').length;
    const leaveDays = records.filter(r => r.status === 'Leave').length;
    const totalWorkingHours = records.reduce((s, r) => s + (r.workingHours || 0), 0);

    return { success: true, records, presentDays, absentDays, halfDays, leaveDays, totalWorkingHours };
  } catch (error: any) {
    return { error: "Failed to fetch attendance" };
  }
}

export async function markAttendance(employeeId: string, status: string, date?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findFirst({
      where: { employeeId, date: { gte: targetDate, lt: new Date(targetDate.getTime() + 86400000) } }
    });

    if (existing) {
      await prisma.attendance.update({ where: { id: existing.id }, data: { status } });
    } else {
      await prisma.attendance.create({ data: { employeeId, date: targetDate, status } });
    }

    revalidatePath("/attendance");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to mark attendance" };
  }
}
