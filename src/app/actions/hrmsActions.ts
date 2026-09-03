"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { calculateIncentives, OrderData } from "@/lib/incentiveEngine";
import { getTenantOrgId } from "@/lib/tenant";

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
      data: { status: 'Paid', disbursementDate: new Date() }
    });
    revalidatePath("/payroll");
    return { success: true };
  } catch { return { error: "Failed to mark salary as paid" }; }
}

export async function getPayrollData(month: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };
  const organizationId = await getTenantOrgId();
  const role = (session.user as any)?.role;
  const userId = (session.user as any)?.id;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  try {
    const whereEmp: any = { organizationId };
    if (!isAdmin) whereEmp.userId = userId;

    const [yearStr, monthStr] = month.split('-');
    const startDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
    const endDate = new Date(parseInt(yearStr), parseInt(monthStr), 1);

    const employees = await prisma.employee.findMany({
      where: whereEmp,
      include: {
        user: { select: { id: true, name: true, email: true, role: true, isActive: true, canManageSettings: true, allowedSections: true, avatarUrl: true } },
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
            orderNumber: true,
            orderDate: true,
            orderStatus: true,
            paymentStatus: true,
            subtotal: true, 
            totalValue: true, 
            tax: true,
            discount: true,
            notes: true,
            customer: { 
              select: { 
                id: true,
                businessName: true, 
                contactPerson: true,
                status: true, 
                preferredPaymentMethod: true 
              } 
            } 
          },
          orderBy: { orderDate: 'desc' }
        },
        quotations: {
          where: {
            date: {
              gte: startDate,
              lt: endDate
            },
            status: { in: ['Confirmed', 'Accepted'] }
          },
          select: {
            id: true,
            quotationNumber: true,
            date: true,
            status: true,
            subtotal: true,
            taxableAmount: true,
            totalValue: true,
            taxTotal: true,
            itemDiscount: true,
            additionalDiscount: true,
            receivedAmount: true,
            customer: {
              select: {
                id: true,
                businessName: true,
                contactPerson: true,
                status: true,
                preferredPaymentMethod: true
              }
            }
          },
          orderBy: { date: 'desc' }
        },
        attendances: {
          where: {
            date: {
              gte: startDate,
              lt: endDate
            }
          }
        }
      }
    });

    // Query saved policy for the organization
    let activePolicy = undefined;
    try {
      const ruleRecord = await prisma.incentiveRule.findFirst({
        where: { name: "ORGANIZATION_ACTIVE_INCENTIVE_POLICY" },
        orderBy: { updatedAt: "desc" }
      });
      if (ruleRecord?.condition) {
        activePolicy = JSON.parse(ruleRecord.condition);
      }
    } catch (e) {
      console.error("Failed to load active incentive policy:", e);
    }

    const highDiscThreshold = activePolicy?.highDiscountThresholdPercent ?? 15;
    const highDiscRate = (activePolicy?.highDiscountRatePercent ?? 1) / 100;
    const zeroDiscBonus = (activePolicy?.zeroDiscountBonusPercent ?? 2) / 100;

    const processedEmployees = employees.map((emp: any) => {
      const rawOrders = emp.orders || [];
      const rawQuotations = emp.quotations || [];
      const empAttendances = emp.attendances || [];

      // Deduplicate confirmed quotations that are already converted to orders
      const convertedQuoteNumbersForEmp = new Set<string>();
      rawOrders.forEach((o: any) => {
        const match = (o.notes || '').match(/Quotation #([A-Za-z0-9-]+)/);
        if (match && match[1]) {
          convertedQuoteNumbersForEmp.add(match[1].trim());
        }
      });

      // Standalone confirmed quotations (not yet an Order in prisma.order)
      const standaloneConfirmedQuotAsOrders = rawQuotations
        .filter((q: any) => !convertedQuoteNumbersForEmp.has((q.quotationNumber || '').trim()))
        .map((q: any) => ({
          id: q.id,
          orderNumber: q.quotationNumber,
          orderDate: q.date,
          orderStatus: q.status || 'Confirmed',
          paymentStatus: (q.receivedAmount || 0) >= q.totalValue ? 'Paid' : (q.receivedAmount || 0) > 0 ? 'Partially Paid' : 'Pending',
          subtotal: Number(q.subtotal ?? q.taxableAmount ?? q.totalValue ?? 0),
          totalValue: Number(q.totalValue ?? q.subtotal ?? 0),
          tax: Number(q.taxTotal || 0),
          discount: Number(q.itemDiscount || 0) + Number(q.additionalDiscount || 0),
          customer: q.customer,
          isQuotation: true
        }));

      // Combined MTD sales: Invoice Orders + Confirmed Quotations
      const allCombinedSales = [
        ...rawOrders.map((o: any) => ({
          ...o,
          isQuotation: false
        })),
        ...standaloneConfirmedQuotAsOrders
      ];

      const formattedOrders: OrderData[] = allCombinedSales.map((order: any) => ({
        id: order.id,
        taxableValue: Number(order.subtotal) || Number(order.totalValue) || 0,
        discount: Number(order.discount) || 0,
        isCreditCustomer: order.customer?.status?.toLowerCase() === 'credit' || order.customer?.preferredPaymentMethod?.toLowerCase() === 'credit'
      }));
      
      const targetGoal = emp.target || 500000;
      const calculatedIncentive = calculateIncentives(formattedOrders, targetGoal, activePolicy);

      // Enriched sales with their incentive tier
      const enrichedOrders = allCombinedSales.map((order: any) => {
        const taxable = Number(order.subtotal) || Number(order.totalValue) || 0;
        const disc = Number(order.discount) || 0;
        const isCredit = order.customer?.status?.toLowerCase() === 'credit' || order.customer?.preferredPaymentMethod?.toLowerCase() === 'credit';
        
        let tier = "SLAB_ELIGIBLE";
        let rateApplied = calculatedIncentive.slabRate;
        let orderIncentive = (taxable * rateApplied) / 100;
        
        if (disc > highDiscThreshold || isCredit) {
          tier = "FLAT_RATE";
          rateApplied = highDiscRate * 100;
          orderIncentive = taxable * highDiscRate;
        } else if (disc === 0) {
          tier = "ZERO_DISCOUNT";
          rateApplied = calculatedIncentive.slabRate + (zeroDiscBonus * 100);
          orderIncentive = (taxable * (calculatedIncentive.slabRate / 100)) + (taxable * zeroDiscBonus);
        }

        return {
          ...order,
          taxableValue: taxable,
          discount: disc,
          isCreditCustomer: isCredit,
          incentiveTier: tier,
          incentiveRateApplied: rateApplied,
          orderIncentiveAmount: parseFloat(orderIncentive.toFixed(2))
        };
      });

      // Attendance summary
      const presentDays = empAttendances.filter((a: any) => a.status === 'Present').length;
      const halfDays = empAttendances.filter((a: any) => a.status === 'Half Day').length;
      const leaveDays = empAttendances.filter((a: any) => a.status === 'Leave').length;
      const absentDays = empAttendances.filter((a: any) => a.status === 'Absent').length;
      const totalWorkingHours = empAttendances.reduce((acc: number, a: any) => acc + (a.workingHours || 0), 0);

      return {
        ...emp,
        orders: allCombinedSales,
        dynamicIncentive: calculatedIncentive.totalIncentive,
        incentiveDetails: calculatedIncentive,
        enrichedOrders,
        attendanceSummary: {
          presentDays,
          halfDays,
          leaveDays,
          absentDays,
          totalWorkingHours
        }
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
