import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateEmployee } from "./employeeHelper";

export const PLATFORM_ROOT_ORG_SLUG = "r3-exports";
export const PLATFORM_ROOT_ORG_SLUGS = ["r3-exports", "tinkal-erp", "espon-global"];
export const PLATFORM_ROOT_OWNER_EMAIL = "admin@r3.com";

export function isPlatformRootOwner(
  userEmail?: string | null, 
  orgSlug?: string | null, 
  userRole?: string | null
): boolean {
  if (!userEmail) return false;
  const role = (userRole || "").toUpperCase();
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

import { resolveTenantEntitlements, AppModule } from "./entitlements";

/** Master admin check: All Super Admins & Admins can manage, add, and switch organizations */
export function isPlatformSuperOwner(
  userEmail?: string | null,
  orgSlug?: string | null,
  userRole?: string | null
): boolean {
  if (!userEmail) return false;
  const role = (userRole || "").toUpperCase();
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export interface TenantContext {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  trialEndsAt: Date | null;
  isHardLocked: boolean;
  isSoftLocked: boolean;
  trialDaysRemaining: number | null;
  enabledModules: Record<AppModule, boolean>;
  userId: string;
  userRole: string;
  canManageSettings: boolean;
  allowedSections: string[] | null;
  isPlatformOwner: boolean;
  /** True only for the designated platform super-owner (owner@tinkal.in) */
  isOwner: boolean;
}

export const getTenantContext = cache(async function getTenantContext(): Promise<TenantContext | null> {
  let session: any = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }
  
  if (!session?.user) {
    return null;
  }

  const userEmail = session.user.email ? session.user.email.trim().toLowerCase() : null;
  const userId = (session.user as any)?.id || (session.user as any)?.sub;

  // 1. Always verify the current user in the database to get their actual organizationId
  let dbUser = null;
  if (userId || userEmail) {
    try {
      dbUser = await prisma.user.findFirst({
        where: userId 
          ? { id: userId } 
          : { email: { equals: userEmail!, mode: 'insensitive' } },
        include: { organization: true }
      });
    } catch (e) {
      console.error("Tenant dbUser lookup error:", e);
    }
  }

  const orgId = dbUser?.organizationId;
  const org = dbUser?.organization;

  if (!dbUser?.isActive || !orgId || !org) {
    return null;
  }

  const effectiveRole = dbUser.role;
  const canManageSettings = dbUser.canManageSettings;
  
  let allowedSectionsList: string[] | null = null;
  if (dbUser?.allowedSections) {
    try {
      if (dbUser.allowedSections.startsWith('[')) {
        allowedSectionsList = JSON.parse(dbUser.allowedSections);
      } else {
        allowedSectionsList = dbUser.allowedSections.split(',').map((s: string) => s.trim());
      }
    } catch {}
  }

  const isPlatformOwner = isPlatformRootOwner(userEmail, org.slug, effectiveRole);
  const entitlements = resolveTenantEntitlements(org);
  const isOwner = isPlatformSuperOwner(userEmail, org.slug, effectiveRole);

  return {
    organizationId: org.id,
    organizationName: org.name,
    organizationSlug: org.slug,
    subscriptionPlan: entitlements.plan,
    subscriptionStatus: entitlements.status,
    trialEndsAt: org.trialEndsAt,
    isHardLocked: isPlatformOwner ? false : entitlements.isHardLocked,
    isSoftLocked: isPlatformOwner ? false : entitlements.isSoftLocked,
    trialDaysRemaining: entitlements.trialDaysRemaining,
    enabledModules: entitlements.modules,
    userId: dbUser.id,
    userRole: effectiveRole,
    canManageSettings,
    allowedSections: allowedSectionsList,
    isPlatformOwner,
    isOwner,
  };
});

export const getTenantOrgId = cache(async function getTenantOrgId(): Promise<string> {
  const ctx = await getTenantContext();
  if (!ctx?.organizationId) {
    throw new Error("Not authenticated");
  }
  return ctx.organizationId;
});

/**
 * Returns tenant-scoped filter for Prisma queries:
 * - Admin/SuperAdmin: { organizationId: orgId }
 * - Non-Admin (Sales/Employee): { organizationId: orgId, assignedSalespersonId: employee.id }
 */
export const getTenantScope = cache(async function getTenantScope() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      organizationId: "UNAUTHENTICATED",
      isAdmin: false,
      employeeId: null,
      userId: null,
      role: "ANONYMOUS",
      userName: "Anonymous"
    };
  }

  const orgId = await getTenantOrgId();
  const rawRole = (session.user as any)?.role || "SALES";
  const userRole = String(rawRole).trim().toUpperCase();
  let userId = (session.user as any)?.id || (session.user as any)?.sub;
  const userEmail = session.user.email ? session.user.email.trim().toLowerCase() : null;
  const userName = session.user.name || "Team Member";
  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";

  if (!userId && userEmail) {
    try {
      const u = await prisma.user.findFirst({ where: { email: { equals: userEmail, mode: 'insensitive' } } });
      if (u) userId = u.id;
    } catch {}
  }

  let employeeId: string | null = null;
  if (!isAdmin && (userId || userEmail)) {
    let employee = null;
    if (userId) {
      try {
        employee = await prisma.employee.findUnique({
          where: { userId }
        });
      } catch {}
    }
    if (!employee && orgId && userId) {
      try {
        employee = await prisma.employee.findFirst({
          where: { organizationId: orgId, userId }
        });
      } catch {}
    }
    if (!employee && userEmail) {
      try {
        employee = await prisma.employee.findFirst({
          where: {
            organizationId: orgId || undefined,
            user: { email: { equals: userEmail, mode: 'insensitive' } }
          }
        });
      } catch {}
    }
    if (!employee && userId) {
      try {
        employee = await getOrCreateEmployee(userId, session.user);
      } catch {}
    }
    employeeId = employee?.id || null;
  }

  return {
    organizationId: orgId,
    isAdmin,
    employeeId,
    userId,
    userName,
    role: userRole
  };
});

export async function checkTenantQuota(orgId: string, quotaType?: 'USERS' | 'ORDERS' | 'WHATSAPP') {
  if (!orgId) return { allowed: true };

  const org = await prisma.organization.findUnique({
    where: { id: orgId }
  });

  return { allowed: true, org };
}
