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

export async function getTenantContext(): Promise<TenantContext | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null;
  }

  let orgId = (session.user as any).organizationId;
  const userEmail = session.user.email;
  const userId = (session.user as any).id;

  // 1. If orgId is not present in token, check the database user record
  if (!orgId && (userId || userEmail)) {
    const dbUser = await prisma.user.findFirst({
      where: userId ? { id: userId } : { email: userEmail! },
      include: { organization: true }
    });
    if (dbUser?.organizationId) {
      orgId = dbUser.organizationId;
    }
  }

  // 2. Ensure organization exists
  let org = orgId ? await prisma.organization.findUnique({ where: { id: orgId } }) : null;

  if (!org) {
    org = await ensureDefaultOrganization();
    orgId = org?.id;
  }

  if (!org) {
    org = await prisma.organization.findFirst();
    orgId = org?.id;
  }

  // 3. If database has no organization yet, create one
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Espon Global Industries Private Limited",
        slug: "espon-global",
        tradeName: "Espon Apparel",
        email: userEmail || "clothingespon@gmail.com",
        phone: "7206066678",
        city: "Rohtak",
        state: "Haryana",
        subscriptionPlan: "ENTERPRISE",
        billingCycle: "ANNUALLY",
        subscriptionStatus: "ACTIVE",
        maxUsers: 999,
        maxBranches: 99,
        maxWarehouses: 99,
        monthlyOrderLimit: 999999,
        whatsAppCreditBalance: 50000,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });
    orgId = org.id;
  }

  // 4. Link the user to the organization in DB if not linked
  if (orgId && (userId || userEmail)) {
    try {
      await prisma.user.updateMany({
        where: userId ? { id: userId, organizationId: null } : { email: userEmail!, organizationId: null },
        data: { organizationId: orgId }
      });
    } catch (e) {
      // ignore
    }
  }

  return {
    organizationId: orgId!,
    organizationName: org.name,
    organizationSlug: org.slug,
    subscriptionPlan: org.subscriptionPlan || "GROWTH",
    subscriptionStatus: org.subscriptionStatus || "ACTIVE",
    userId: userId || "user-id",
    userRole: (session.user as any).role || "SUPER_ADMIN",
  };
}

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
