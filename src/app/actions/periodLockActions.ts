"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getTenantOrgId } from "@/lib/tenant";

/**
 * Fetch current financial period lock settings for the tenant
 */
export async function getPeriodLockSettings() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const organizationId = await getTenantOrgId();

    const company = await prisma.companySettings.findFirst({
      where: organizationId ? { organizationId } : {}
    });

    const lockDate = company?.lockDate || null;

    return {
      success: true,
      lockDate,
      isLocked: Boolean(lockDate)
    };
  } catch (error: any) {
    console.error("getPeriodLockSettings error:", error);
    return { error: error?.message || "Failed to fetch period lock settings", lockDate: null, isLocked: false };
  }
}

/**
 * Set or clear the period lock date (Admin / Super Admin only)
 */
export async function setPeriodLockDate(lockDateStr: string | null) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const role = (session.user as any)?.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return { error: "Only Administrators can modify Financial Period Locking" };
    }

    const organizationId = await getTenantOrgId();
    const newLockDate = lockDateStr ? new Date(lockDateStr) : null;

    // Validate date format if provided
    if (lockDateStr && isNaN(newLockDate!.getTime())) {
      return { error: "Invalid lock date provided" };
    }

    const company = await prisma.companySettings.findFirst({
      where: organizationId ? { organizationId } : {}
    });

    if (company) {
      await prisma.companySettings.update({
        where: { id: company.id },
        data: { lockDate: newLockDate }
      });
    } else {
      await prisma.companySettings.create({
        data: {
          organizationId,
          lockDate: newLockDate
        }
      });
    }

    revalidatePath("/accounting/period-lock");
    revalidatePath("/accounting");
    revalidatePath("/invoices");
    revalidatePath("/bills");
    revalidatePath("/debit-notes");
    revalidatePath("/credit-notes");

    return { success: true, lockDate: newLockDate };
  } catch (error: any) {
    console.error("setPeriodLockDate error:", error);
    return { error: error?.message || "Failed to update period lock date" };
  }
}

/**
 * Core validation guard: check if a transaction date falls into a locked period
 */
export async function checkPeriodLock(transactionDate: Date | string | null | undefined): Promise<{ isLocked: boolean; error?: string }> {
  try {
    if (!transactionDate) return { isLocked: false };

    const txDate = new Date(transactionDate);
    if (isNaN(txDate.getTime())) return { isLocked: false };

    const organizationId = await getTenantOrgId();
    const company = await prisma.companySettings.findFirst({
      where: organizationId ? { organizationId } : {},
      select: { lockDate: true }
    });

    if (!company?.lockDate) {
      return { isLocked: false };
    }

    const lockDate = new Date(company.lockDate);
    // End of lock day (23:59:59.999)
    lockDate.setHours(23, 59, 59, 999);

    if (txDate <= lockDate) {
      const formattedLockDate = lockDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
      return {
        isLocked: true,
        error: `Transaction date (${txDate.toLocaleDateString("en-IN")}) falls in a locked financial period. Books are locked up to ${formattedLockDate}. Contact your administrator to modify locked periods.`
      };
    }

    return { isLocked: false };
  } catch (err: any) {
    console.error("checkPeriodLock error:", err);
    return { isLocked: false };
  }
}
