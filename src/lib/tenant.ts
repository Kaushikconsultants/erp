import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultOrganization } from "./ensureDefaultOrg";

export interface TenantContext {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  userId: string;
  userRole: string;
}

export const getTenantContext = cache(async function getTenantContext(): Promise<TenantContext | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null;
  }

  const userEmail = session.user.email;
  const userId = (session.user as any).id;

  // 1. Always verify the current user in the database to get their actual organizationId
  let dbUser = null;
  if (userId || userEmail) {
    dbUser = await prisma.user.findFirst({
      where: userId ? { id: userId } : { email: userEmail! },
      include: { organization: true }
    });
  }

  let orgId = dbUser?.organizationId || (session.user as any).organizationId;
  let org = dbUser?.organization || (orgId ? await prisma.organization.findUnique({ where: { id: orgId } }) : null);

  // 2. Only if the database has zero organizations at all, create root org
  if (!org) {
    const totalOrgs = await prisma.organization.count();
    if (totalOrgs === 0) {
      org = await ensureDefaultOrganization();
      orgId = org?.id;
    }
  }

  if (!org) {
    // If user is truly unlinked to any org, find root org
    org = await prisma.organization.findFirst({
      where: { slug: "espon-global" }
    }) || await prisma.organization.findFirst();
    orgId = org?.id;
  }

  if (!org) {
    return null;
  }

  return {
    organizationId: org.id,
    organizationName: org.name,
    organizationSlug: org.slug,
    subscriptionPlan: org.subscriptionPlan || "GROWTH",
    subscriptionStatus: org.subscriptionStatus || "ACTIVE",
    userId: userId || dbUser?.id || "user-id",
    userRole: dbUser?.role || (session.user as any).role || "SALES",
  };
});

export const getTenantOrgId = cache(async function getTenantOrgId(): Promise<string> {
  const ctx = await getTenantContext();
  if (ctx?.organizationId) return ctx.organizationId;
  
  const defaultOrg = await prisma.organization.findFirst({
    where: { slug: "espon-global" }
  }) || await prisma.organization.findFirst();

  return defaultOrg?.id || "default-org";
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
      role: "ANONYMOUS"
    };
  }

  const orgId = await getTenantOrgId();
  const userRole = (session.user as any).role || "SALES";
  const userId = (session.user as any).id;
  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";

  let employeeId: string | null = null;
  if (!isAdmin && userId) {
    const employee = await prisma.employee.findUnique({
      where: { userId }
    });
    employeeId = employee?.id || null;
  }

  return {
    organizationId: orgId,
    isAdmin,
    employeeId,
    userId,
    role: userRole
  };
});

export async function checkTenantQuota(orgId: string, quotaType: 'USERS' | 'ORDERS' | 'WHATSAPP') {
  if (!orgId) return { allowed: true };

  const org = await prisma.organization.findUnique({
    where: { id: orgId }
  });

  if (!org) return { allowed: false, error: "Organization not found" };

  if (org.subscriptionStatus === 'EXPIRED') {
    return { allowed: false, error: "Subscription has expired. Please renew your plan." };
  }

  if (quotaType === 'USERS') {
    const userCount = await prisma.user.count({ where: { organizationId: orgId } });
    if (userCount >= org.maxUsers) {
      return { allowed: false, error: `User limit (${org.maxUsers}) reached for ${org.subscriptionPlan} plan.` };
    }
  }

  if (quotaType === 'WHATSAPP') {
    if (org.whatsAppCreditBalance <= 0) {
      return { allowed: false, error: "WhatsApp messaging credits exhausted. Please top up credits." };
    }
  }

  return { allowed: true, org };
}
