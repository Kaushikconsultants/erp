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

  if (!orgId) {
    // If user has no organization linked yet, fetch/link default org
    const defaultOrg = await ensureDefaultOrganization();
    orgId = defaultOrg?.id;
  }

  return {
    organizationId: orgId,
    organizationName: (session.user as any).organizationName || "Espon Global",
    organizationSlug: (session.user as any).organizationSlug || "espon-global",
    subscriptionPlan: (session.user as any).subscriptionPlan || "GROWTH",
    subscriptionStatus: (session.user as any).subscriptionStatus || "ACTIVE",
    userId: (session.user as any).id,
    userRole: (session.user as any).role || "SALES",
  };
}

export async function checkTenantQuota(orgId: string, quotaType: 'USERS' | 'ORDERS' | 'WHATSAPP') {
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
