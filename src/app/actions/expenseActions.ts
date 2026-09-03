"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getTenantOrgId } from "@/lib/tenant";

export interface ExpenseDetails {
  account?: string;
  accountCategory?: "Cost Of Goods Sold" | "Expense" | "Operating Expense" | "Other";
  paidThrough?: string;
  expenseType?: "Goods" | "Services" | "Capital Expenditure";
  sacCode?: string;
  hsnCode?: string;
  vendorId?: string;
  vendorName?: string;
  gstTreatment?: string;
  sourceOfSupply?: string;
  destinationOfSupply?: string;
  reverseCharge?: boolean;
  taxRate?: number;
  taxAmount?: number;
  taxInclusive?: boolean;
  referenceNumber?: string;
  customerId?: string;
  customerName?: string;
  isBillable?: boolean;
  notes?: string;
  mileageData?: {
    vehicleType?: string;
    distance?: number;
    ratePerKm?: number;
    fromLocation?: string;
    toLocation?: string;
  };
}

export interface ParsedExpense {
  id: string;
  expenseNumber: string;
  date: Date | string;
  category: string;
  amount: number;
  description: string | null;
  status: string;
  receiptUrl: string | null;
  employeeId: string | null;
  employee?: {
    id: string;
    userId: string;
    user?: {
      name: string | null;
      email?: string | null;
    } | null;
  } | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  details: ExpenseDetails;
}

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

    const rawExpenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        employee: { include: { user: { select: { name: true, email: true } } } }
      },
      orderBy: { date: 'desc' }
    });

    const expenses: ParsedExpense[] = rawExpenses.map(exp => {
      let details: ExpenseDetails = {};
      if (exp.description) {
        try {
          if (exp.description.startsWith("{") && exp.description.endsWith("}")) {
            details = JSON.parse(exp.description);
          } else {
            details = { notes: exp.description };
          }
        } catch {
          details = { notes: exp.description };
        }
      }

      return {
        ...exp,
        details: {
          account: details.account || exp.category,
          accountCategory: details.accountCategory || "Expense",
          paidThrough: details.paidThrough || "Petty Cash",
          expenseType: details.expenseType || "Services",
          sacCode: details.sacCode || "",
          vendorId: details.vendorId || "",
          vendorName: details.vendorName || "",
          gstTreatment: details.gstTreatment || "Registered Business - Regular",
          sourceOfSupply: details.sourceOfSupply || "Haryana",
          destinationOfSupply: details.destinationOfSupply || "Haryana",
          reverseCharge: !!details.reverseCharge,
          taxRate: typeof details.taxRate === "number" ? details.taxRate : 0,
          taxAmount: typeof details.taxAmount === "number" ? details.taxAmount : 0,
          taxInclusive: details.taxInclusive !== undefined ? !!details.taxInclusive : false,
          referenceNumber: details.referenceNumber || "",
          customerId: details.customerId || "",
          customerName: details.customerName || "",
          isBillable: !!details.isBillable,
          notes: details.notes || exp.description || "",
          mileageData: details.mileageData
        }
      };
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
    
    // Core & Zoho Books Fields
    const account = (formData.get("account") as string || formData.get("category") as string || "Other").trim();
    const accountCategory = (formData.get("accountCategory") as string || "Expense").trim();
    const amountStr = formData.get("amount") as string;
    const dateStr = formData.get("date") as string;
    
    const paidThrough = (formData.get("paidThrough") as string || "Petty Cash").trim();
    const expenseType = (formData.get("expenseType") as string || "Services").trim() as any;
    const sacCode = (formData.get("sacCode") as string || "").trim();
    const vendorId = (formData.get("vendorId") as string || "").trim();
    const vendorName = (formData.get("vendorName") as string || "").trim();
    const gstTreatment = (formData.get("gstTreatment") as string || "Registered Business - Regular").trim();
    const sourceOfSupply = (formData.get("sourceOfSupply") as string || "Haryana").trim();
    const destinationOfSupply = (formData.get("destinationOfSupply") as string || "Haryana").trim();
    const reverseCharge = formData.get("reverseCharge") === "true" || formData.get("reverseCharge") === "on";
    const taxRate = parseFloat(formData.get("taxRate") as string || "0") || 0;
    const taxAmount = parseFloat(formData.get("taxAmount") as string || "0") || 0;
    const taxInclusive = formData.get("taxInclusive") === "true";
    const referenceNumber = (formData.get("referenceNumber") as string || "").trim();
    const customerId = (formData.get("customerId") as string || "").trim();
    const customerName = (formData.get("customerName") as string || "").trim();
    const isBillable = formData.get("isBillable") === "true" || formData.get("isBillable") === "on";
    const notes = (formData.get("notes") as string || formData.get("description") as string || "").trim();
    const receiptUrl = (formData.get("receiptUrl") as string || "").trim() || null;
    
    // Optional Mileage Data
    let mileageData: any = undefined;
    const mileageJson = formData.get("mileageData") as string;
    if (mileageJson) {
      try {
        mileageData = JSON.parse(mileageJson);
      } catch {}
    }

    if (!account || !amountStr) {
      return { error: "Expense Account and Amount are required fields." };
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return { error: "Please provide a valid amount greater than 0." };
    }

    const detailsPayload: ExpenseDetails = {
      account,
      accountCategory: accountCategory as any,
      paidThrough,
      expenseType,
      sacCode: sacCode || undefined,
      vendorId: vendorId || undefined,
      vendorName: vendorName || undefined,
      gstTreatment,
      sourceOfSupply,
      destinationOfSupply,
      reverseCharge,
      taxRate,
      taxAmount,
      taxInclusive,
      referenceNumber: referenceNumber || undefined,
      customerId: customerId || undefined,
      customerName: customerName || undefined,
      isBillable,
      notes,
      mileageData
    };

    await prisma.expense.create({
      data: {
        expenseNumber,
        category: account,
        amount,
        description: JSON.stringify(detailsPayload),
        receiptUrl: receiptUrl || null,
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

    const account = (formData.get("account") as string || formData.get("category") as string || "Other").trim();
    const accountCategory = (formData.get("accountCategory") as string || "Expense").trim();
    const amountStr = formData.get("amount") as string;
    const dateStr = formData.get("date") as string;
    
    const paidThrough = (formData.get("paidThrough") as string || "Petty Cash").trim();
    const expenseType = (formData.get("expenseType") as string || "Services").trim() as any;
    const sacCode = (formData.get("sacCode") as string || "").trim();
    const vendorId = (formData.get("vendorId") as string || "").trim();
    const vendorName = (formData.get("vendorName") as string || "").trim();
    const gstTreatment = (formData.get("gstTreatment") as string || "Registered Business - Regular").trim();
    const sourceOfSupply = (formData.get("sourceOfSupply") as string || "Haryana").trim();
    const destinationOfSupply = (formData.get("destinationOfSupply") as string || "Haryana").trim();
    const reverseCharge = formData.get("reverseCharge") === "true" || formData.get("reverseCharge") === "on";
    const taxRate = parseFloat(formData.get("taxRate") as string || "0") || 0;
    const taxAmount = parseFloat(formData.get("taxAmount") as string || "0") || 0;
    const taxInclusive = formData.get("taxInclusive") === "true";
    const referenceNumber = (formData.get("referenceNumber") as string || "").trim();
    const customerId = (formData.get("customerId") as string || "").trim();
    const customerName = (formData.get("customerName") as string || "").trim();
    const isBillable = formData.get("isBillable") === "true" || formData.get("isBillable") === "on";
    const notes = (formData.get("notes") as string || formData.get("description") as string || "").trim();
    const receiptUrl = (formData.get("receiptUrl") as string || "").trim() || existing.receiptUrl;

    let mileageData: any = undefined;
    const mileageJson = formData.get("mileageData") as string;
    if (mileageJson) {
      try {
        mileageData = JSON.parse(mileageJson);
      } catch {}
    }

    if (!account || !amountStr) {
      return { error: "Expense Account and Amount are required fields." };
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return { error: "Please provide a valid amount greater than 0." };
    }

    const detailsPayload: ExpenseDetails = {
      account,
      accountCategory: accountCategory as any,
      paidThrough,
      expenseType,
      sacCode: sacCode || undefined,
      vendorId: vendorId || undefined,
      vendorName: vendorName || undefined,
      gstTreatment,
      sourceOfSupply,
      destinationOfSupply,
      reverseCharge,
      taxRate,
      taxAmount,
      taxInclusive,
      referenceNumber: referenceNumber || undefined,
      customerId: customerId || undefined,
      customerName: customerName || undefined,
      isBillable,
      notes,
      mileageData
    };

    await prisma.expense.update({
      where: { id },
      data: {
        category: account,
        amount,
        description: JSON.stringify(detailsPayload),
        receiptUrl: receiptUrl || null,
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
