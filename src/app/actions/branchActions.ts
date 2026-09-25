"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId, getTenantContext } from "@/lib/tenant";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const ACTIVE_BRANCH_COOKIE = "erp_active_branch_id";

export interface BranchData {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  _count?: {
    customers: number;
    employees: number;
    warehouses: number;
  };
}

/**
 * Fetch all branches for the current organization
 */
export async function getBranches(): Promise<{
  success: boolean;
  branches: BranchData[];
  activeBranchId: string;
  companyName: string;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, branches: [], activeBranchId: 'ALL', companyName: '', error: "Unauthorized" };
    }

    const ctx = await getTenantContext();
    const organizationId = ctx?.organizationId;
    if (!organizationId) {
      return { success: false, branches: [], activeBranchId: 'ALL', companyName: '', error: "No organization found" };
    }

    let branches = await prisma.branch.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: {
            customers: true,
            employees: true,
            warehouses: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // If no branch exists, auto-seed a default Main Branch / Head Office for the org
    if (branches.length === 0) {
      try {
        const defaultBranch = await prisma.branch.create({
          data: {
            organizationId,
            name: `${ctx.organizationName || 'Main'} Head Office`,
            code: "HO",
            city: "Rohtak",
            state: "Haryana"
          },
          include: {
            _count: {
              select: {
                customers: true,
                employees: true,
                warehouses: true
              }
            }
          }
        });
        branches = [defaultBranch];
      } catch (seedErr) {
        console.error("Auto branch seed fallback:", seedErr);
      }
    }

    const cookieStore = await cookies();
    const activeBranchId = cookieStore.get(ACTIVE_BRANCH_COOKIE)?.value || 'ALL';

    return {
      success: true,
      branches,
      activeBranchId,
      companyName: ctx.organizationName || "Espon Clothing"
    };
  } catch (error: any) {
    console.error("Error fetching branches:", error);
    return { 
      success: false, 
      branches: [], 
      activeBranchId: 'ALL', 
      companyName: '', 
      error: error.message || "Failed to load branches" 
    };
  }
}

/**
 * Set the user's active branch filter in cookies
 */
export async function setActiveBranch(branchId: string): Promise<{ success: boolean }> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_BRANCH_COOKIE, branchId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax"
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    return { success: false };
  }
}

/**
 * Create a new branch
 */
export async function createBranch(formData: FormData): Promise<{
  success: boolean;
  branch?: any;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const organizationId = await getTenantOrgId();
    const name = (formData.get("name") as string)?.trim();
    const code = (formData.get("code") as string)?.trim().toUpperCase() || null;
    const phone = (formData.get("phone") as string)?.trim() || null;
    const address = (formData.get("address") as string)?.trim() || null;
    const city = (formData.get("city") as string)?.trim() || null;
    const state = (formData.get("state") as string)?.trim() || null;
    const pincode = (formData.get("pincode") as string)?.trim() || null;

    if (!name) {
      return { success: false, error: "Branch name is required" };
    }

    // Check unique name in organization
    const existing = await prisma.branch.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' as const } },
          ...(code ? [{ code: { equals: code, mode: 'insensitive' as const } }] : [])
        ]
      }
    });

    if (existing) {
      return { success: false, error: "A branch with this name or code already exists." };
    }

    const newBranch = await prisma.branch.create({
      data: {
        organizationId,
        name,
        code,
        phone,
        address,
        city,
        state,
        pincode
      }
    });

    revalidatePath("/settings/branches");
    revalidatePath("/", "layout");
    return { success: true, branch: newBranch };
  } catch (error: any) {
    console.error("Create branch error:", error);
    return { success: false, error: error.message || "Failed to create branch" };
  }
}

/**
 * Update an existing branch
 */
export async function updateBranch(id: string, formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const organizationId = await getTenantOrgId();
    const name = (formData.get("name") as string)?.trim();
    const code = (formData.get("code") as string)?.trim().toUpperCase() || null;
    const phone = (formData.get("phone") as string)?.trim() || null;
    const address = (formData.get("address") as string)?.trim() || null;
    const city = (formData.get("city") as string)?.trim() || null;
    const state = (formData.get("state") as string)?.trim() || null;
    const pincode = (formData.get("pincode") as string)?.trim() || null;

    if (!name) {
      return { success: false, error: "Branch name is required" };
    }

    await prisma.branch.update({
      where: { id },
      data: {
        name,
        code,
        phone,
        address,
        city,
        state,
        pincode
      }
    });

    revalidatePath("/settings/branches");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: any) {
    console.error("Update branch error:", error);
    return { success: false, error: error.message || "Failed to update branch" };
  }
}

/**
 * Delete branch safely
 */
export async function deleteBranch(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const organizationId = await getTenantOrgId();

    const branch = await prisma.branch.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: { customers: true, employees: true, warehouses: true }
        }
      }
    });

    if (!branch) {
      return { success: false, error: "Branch not found." };
    }

    if (branch._count.customers > 0 || branch._count.employees > 0) {
      return { 
        success: false, 
        error: `Cannot delete branch with ${branch._count.customers} customers and ${branch._count.employees} employees assigned. Reassign them first.` 
      };
    }

    await prisma.branch.delete({ where: { id } });

    revalidatePath("/settings/branches");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete branch" };
  }
}

/**
 * Fetch all companies / organizations available to the user for multi-company switching (Platform Admin only)
 */
export async function getUserOrganizations(): Promise<{
  success: boolean;
  organizations: { id: string; name: string; slug: string; isCurrent: boolean }[];
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, organizations: [], error: "Unauthorized" };

    const ctx = await getTenantContext();
    if (!ctx) return { success: false, organizations: [], error: "No tenant context" };

    // Only platform super admins can view all tenant organizations
    if (!ctx.isPlatformOwner) {
      return {
        success: true,
        organizations: [{
          id: ctx.organizationId,
          name: ctx.organizationName,
          slug: ctx.organizationSlug,
          isCurrent: true
        }]
      };
    }

    // Fetch all active organizations for platform super admin
    const orgs = await prisma.organization.findMany({
      where: { subscriptionStatus: { not: 'DELETED' } },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' }
    });

    return {
      success: true,
      organizations: orgs.map(o => ({
        ...o,
        isCurrent: o.id === ctx.organizationId
      }))
    };
  } catch (error: any) {
    return { success: false, organizations: [], error: error.message };
  }
}

/**
 * Switch the active company / organization for the current user (Platform Admin only)
 */
export async function switchUserOrganization(newOrgId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return { success: false, error: "Unauthorized" };

    const ctx = await getTenantContext();
    if (!ctx?.isPlatformOwner) {
      return { success: false, error: "Access denied. Only SaaS Platform Super Admin can switch tenant organizations." };
    }

    const targetOrg = await prisma.organization.findUnique({ where: { id: newOrgId } });
    if (!targetOrg) return { success: false, error: "Target company does not exist" };

    await prisma.user.update({
      where: { id: userId },
      data: { organizationId: newOrgId }
    });

    // Reset active branch cookie to ALL for the new organization
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_BRANCH_COOKIE, 'ALL', { path: "/" });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to switch organization" };
  }
}
