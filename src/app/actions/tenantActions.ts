"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getTenantContext } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export interface RegisterBusinessInput {
  // Admin User
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  adminMobile: string;

  // Business Profile
  companyName: string;
  tradeName?: string;
  industry: string;
  businessType: string;
  gstin?: string;
  city: string;
  state: string;
  pincode?: string;

  // Subscription
  plan: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
}

import { PLAN_PRICING } from "@/lib/planConfig";

/**
 * Register a new Business Organization and provision its SaaS workspace
 */
export async function registerNewBusiness(input: RegisterBusinessInput) {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.adminEmail.toLowerCase().trim() }
    });

    if (existingUser) {
      return { success: false, error: "An account with this email address already exists. Please sign in instead." };
    }

    // Generate unique slug
    let baseSlug = input.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30);
    
    if (!baseSlug || baseSlug === '-') baseSlug = 'tenant';

    const countSameSlug = await prisma.organization.count({
      where: { slug: { startsWith: baseSlug } }
    });

    const slug = countSameSlug > 0 ? `${baseSlug}-${countSameSlug + 1}` : baseSlug;

    // Hash admin password
    const hashedPassword = await bcrypt.hash(input.adminPassword, 10);

    const planConfig = PLAN_PRICING[input.plan] || PLAN_PRICING.GROWTH;
    const trialDays = 14;
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
    const periodEnd = trialEndsAt;

    // 1. Create Organization
    const organization = await prisma.organization.create({
      data: {
        name: input.companyName.trim(),
        slug,
        tradeName: input.tradeName || input.companyName,
        industry: input.industry || "Apparel & Garments",
        businessType: input.businessType || "Private Limited",
        gstin: input.gstin ? input.gstin.toUpperCase().trim() : null,
        phone: input.adminMobile.trim(),
        email: input.adminEmail.toLowerCase().trim(),
        city: input.city || "Rohtak",
        state: input.state || "Haryana",
        pincode: input.pincode || "124001",
        country: "India",
        subscriptionPlan: input.plan,
        billingCycle: input.billingCycle,
        subscriptionStatus: "TRIAL",
        trialEndsAt,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        maxUsers: planConfig.maxUsers,
        maxBranches: planConfig.maxBranches,
        maxWarehouses: planConfig.maxWarehouses,
        monthlyOrderLimit: planConfig.monthlyOrderLimit,
        whatsAppCreditBalance: planConfig.whatsAppCredits,
        isGstEnabled: true,
        isWhatsAppEnabled: true,
        isEWayBillEnabled: input.plan === 'ENTERPRISE',
        isHrmsEnabled: true,
      }
    });

    // 2. Create Super Admin User
    const adminUser = await prisma.user.create({
      data: {
        organizationId: organization.id,
        name: input.adminName.trim(),
        email: input.adminEmail.toLowerCase().trim(),
        password: hashedPassword,
        role: "SUPER_ADMIN",
        canManageSettings: true,
        isActive: true,
      }
    });

    // 2b. Create Employee profile for Super Admin User
    await prisma.employee.create({
      data: {
        userId: adminUser.id,
        employeeId: "EMP-001",
        department: "Executive",
        designation: "Managing Director",
        employmentStatus: "Active",
        joiningDate: new Date(),
        organizationId: organization.id,
      }
    });

    // 3. Create Default CompanySettings for this organization
    await prisma.companySettings.create({
      data: {
        id: `settings-${organization.id}`,
        organizationId: organization.id,
        companyName: organization.name,
        address: `${organization.city}, ${organization.state}`,
        city: organization.city || "Rohtak",
        state: organization.state || "Haryana",
        country: "India",
        gstin: organization.gstin,
        mobile: organization.phone,
        email: organization.email,
        themeColor: "#4f46e5",
      }
    });

    // 4. Create Default GST Settings
    await prisma.gstSetting.create({
      data: {
        id: `gst-${organization.id}`,
        organizationId: organization.id,
        gstin: organization.gstin,
        legalName: organization.name,
        tradeName: organization.tradeName || organization.name,
        registeredState: organization.state || "Haryana",
      }
    });

    // 5. Create initial Subscription History record
    let planAmount = planConfig.monthlyPrice;
    if (input.billingCycle === 'QUARTERLY') planAmount = planConfig.quarterlyPrice;
    if (input.billingCycle === 'ANNUALLY') planAmount = planConfig.annualPrice;

    await prisma.subscriptionHistory.create({
      data: {
        organizationId: organization.id,
        plan: input.plan,
        billingCycle: input.billingCycle,
        amount: planAmount,
        taxAmount: Math.round(planAmount * 0.18),
        totalAmount: Math.round(planAmount * 1.18),
        status: "TRIAL_ACTIVE",
        paymentMethod: "FREE_TRIAL_14_DAYS",
        startDate: new Date(),
        endDate: trialEndsAt,
      }
    });

    return {
      success: true,
      message: `Welcome to the platform! Your 14-day free trial for ${organization.name} is now active.`,
      organizationSlug: organization.slug,
      adminEmail: adminUser.email,
    };
  } catch (error: any) {
    console.error("Error registering business:", error);
    return { success: false, error: error.message || "Failed to register organization." };
  }
}

/**
 * Fetch Billing & Subscription Details for current Tenant
 */
export async function getTenantBillingOverview() {
  try {
    const ctx = await getTenantContext();
    if (!ctx || !ctx.organizationId) return { success: false, error: "Not authenticated" };

    let org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        invoicesIssued: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!org) {
      org = await prisma.organization.findFirst({
        include: {
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          invoicesIssued: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });
    }

    if (!org) return { success: false, error: "Organization not found" };

    // Real-time usage counts
    const userCount = await prisma.user.count({ where: { organizationId: org.id } });
    const orderCount = await prisma.order.count({ where: { organizationId: org.id } });
    const customerCount = await prisma.customer.count({ where: { organizationId: org.id } });
    const branchCount = await prisma.branch.count({ where: { organizationId: org.id } });

    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((new Date(org.currentPeriodEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      success: true,
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        email: org.email,
        phone: org.phone,
        gstin: org.gstin,
        subscriptionPlan: org.subscriptionPlan,
        billingCycle: org.billingCycle,
        subscriptionStatus: org.subscriptionStatus,
        trialEndsAt: org.trialEndsAt,
        currentPeriodStart: org.currentPeriodStart,
        currentPeriodEnd: org.currentPeriodEnd,
        daysRemaining,
        maxUsers: org.maxUsers,
        maxBranches: org.maxBranches,
        maxWarehouses: org.maxWarehouses,
        monthlyOrderLimit: org.monthlyOrderLimit,
        whatsAppCreditBalance: org.whatsAppCreditBalance,
      },
      usage: {
        userCount,
        orderCount,
        customerCount,
        branchCount,
      },
      subscriptions: org.subscriptions,
      invoices: org.invoicesIssued,
      planConfig: PLAN_PRICING[org.subscriptionPlan as keyof typeof PLAN_PRICING] || PLAN_PRICING.GROWTH,
      availablePlans: PLAN_PRICING
    };
  } catch (error: any) {
    console.error("Error fetching billing overview:", error);
    return { success: false, error: error.message || "Failed to load billing data." };
  }
}

/**
 * Update Subscription Plan or Billing Cycle
 */
export async function changeSubscriptionPlan(newPlan: 'STARTER' | 'GROWTH' | 'ENTERPRISE', billingCycle: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY') {
  try {
    const ctx = await getTenantContext();
    if (!ctx) return { success: false, error: "Not authenticated" };

    const planConfig = PLAN_PRICING[newPlan];
    if (!planConfig) return { success: false, error: "Invalid plan selected" };

    let durationDays = 30;
    let baseAmount = planConfig.monthlyPrice;
    if (billingCycle === 'QUARTERLY') {
      durationDays = 90;
      baseAmount = planConfig.quarterlyPrice;
    } else if (billingCycle === 'ANNUALLY') {
      durationDays = 365;
      baseAmount = planConfig.annualPrice;
    }

    const taxAmount = Math.round(baseAmount * 0.18);
    const totalAmount = baseAmount + taxAmount;
    const periodEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    // 1. Update Organization
    await prisma.organization.update({
      where: { id: ctx.organizationId },
      data: {
        subscriptionPlan: newPlan,
        billingCycle,
        subscriptionStatus: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        maxUsers: planConfig.maxUsers,
        maxBranches: planConfig.maxBranches,
        maxWarehouses: planConfig.maxWarehouses,
        monthlyOrderLimit: planConfig.monthlyOrderLimit,
        whatsAppCreditBalance: { increment: planConfig.whatsAppCredits },
      }
    });

    // 2. Log Subscription History
    await prisma.subscriptionHistory.create({
      data: {
        organizationId: ctx.organizationId,
        plan: newPlan,
        billingCycle,
        amount: baseAmount,
        taxAmount,
        totalAmount,
        status: "PAID",
        paymentMethod: "UPI_AUTOPAY",
        startDate: new Date(),
        endDate: periodEnd,
      }
    });

    // 3. Issue Tax Invoice for the SaaS charge
    const invoiceCount = await prisma.subscriptionInvoice.count();
    const invoiceNumber = `SAAS-${new Date().getFullYear()}-${String(invoiceCount + 1001).padStart(5, '0')}`;

    await prisma.subscriptionInvoice.create({
      data: {
        invoiceNumber,
        organizationId: ctx.organizationId,
        amount: baseAmount,
        cgst: taxAmount / 2,
        sgst: taxAmount / 2,
        total: totalAmount,
        paidAt: new Date(),
      }
    });

    revalidatePath('/settings/billing');
    return {
      success: true,
      message: `Successfully upgraded to ${planConfig.name} (${billingCycle})!`,
      invoiceNumber
    };
  } catch (error: any) {
    console.error("Error changing subscription plan:", error);
    return { success: false, error: error.message || "Failed to update subscription." };
  }
}

/**
 * Super Admin / Platform Overview (MRR, Total Tenants, Churn)
 */
export async function getPlatformAdminOverview() {
  try {
    const ctx = await getTenantContext();
    if (!ctx || !ctx.isPlatformOwner) {
      return { success: false, error: "Access denied. Platform Super Admin credentials required." };
    }

    const organizations = await prisma.organization.findMany({
      include: {
        users: { select: { id: true, name: true, email: true, role: true } },
        subscriptions: { take: 1, orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    let totalMRR = 0;
    let activeTenantsCount = 0;
    let trialTenantsCount = 0;

    organizations.forEach(org => {
      const config = PLAN_PRICING[org.subscriptionPlan as keyof typeof PLAN_PRICING] || PLAN_PRICING.GROWTH;
      if (org.subscriptionStatus === 'ACTIVE') {
        activeTenantsCount++;
        totalMRR += config.monthlyPrice;
      } else if (org.subscriptionStatus === 'TRIAL') {
        trialTenantsCount++;
      }
    });

    const totalARR = totalMRR * 12;

    return {
      success: true,
      metrics: {
        totalTenants: organizations.length,
        activeTenants: activeTenantsCount,
        trialTenants: trialTenantsCount,
        totalMRR,
        totalARR,
      },
      organizations: organizations.map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        email: org.email,
        phone: org.phone,
        city: org.city,
        state: org.state,
        tradeName: org.tradeName,
        plan: org.subscriptionPlan,
        billingCycle: org.billingCycle,
        status: org.subscriptionStatus,
        userCount: org.users.length,
        currentPeriodEnd: org.currentPeriodEnd,
        createdAt: org.createdAt,
        maxUsers: org.maxUsers,
        maxBranches: org.maxBranches,
        maxWarehouses: org.maxWarehouses,
        monthlyOrderLimit: org.monthlyOrderLimit,
        whatsAppCreditBalance: org.whatsAppCreditBalance,
        isGstEnabled: org.isGstEnabled,
        isWhatsAppEnabled: org.isWhatsAppEnabled,
        isEWayBillEnabled: org.isEWayBillEnabled,
        isHrmsEnabled: org.isHrmsEnabled,
      })),
      pricingSettings: await getLivePlanPricing()
    };
  } catch (error: any) {
    console.error("Error loading platform admin data:", error);
    return { success: false, error: error.message || "Failed to load platform data." };
  }
}

/**
 * Fetch dynamic live platform pricing (falling back to database setting if customized)
 */
export async function getLivePlanPricing() {
  try {
    let setting = await prisma.platformPricingSetting.findUnique({
      where: { id: "default" }
    });

    if (!setting) {
      setting = await prisma.platformPricingSetting.create({
        data: {
          id: "default",
          starterMonthlyPrice: 999,
          starterQuarterlyPrice: 2699,
          starterAnnualPrice: 9599,
          starterMaxUsers: 3,
          starterMaxOrders: 500,
          starterWhatsAppCredits: 500,
          starterFeatures: ["Up to 3 Users", "1 Branch", "500 Orders / mo", "Basic CRM & Invoicing", "500 WhatsApp Msgs", "GST Reports"],

          growthMonthlyPrice: 2499,
          growthQuarterlyPrice: 6749,
          growthAnnualPrice: 23999,
          growthMaxUsers: 10,
          growthMaxOrders: 2000,
          growthWhatsAppCredits: 2500,
          growthFeatures: ["Up to 10 Users", "3 Branches & 2 Warehouses", "2,000 Orders / mo", "Full CRM & Purchase Ledger", "Live GST Portal Filing (1/3B/2B)", "2,500 WhatsApp Msgs & AI"],

          enterpriseMonthlyPrice: 5999,
          enterpriseQuarterlyPrice: 16199,
          enterpriseAnnualPrice: 57599,
          enterpriseMaxUsers: 999,
          enterpriseMaxOrders: 999999,
          enterpriseWhatsAppCredits: 10000,
          enterpriseFeatures: ["Unlimited Users", "Unlimited Branches & Multi-Warehouse", "Unlimited Orders", "Automated E-Way Bill Generation", "Dedicated WhatsApp AI Bot", "Priority Support & API Access"]
        }
      });
    }

    return {
      STARTER: {
        name: "Starter Plan",
        monthlyPrice: setting.starterMonthlyPrice,
        quarterlyPrice: setting.starterQuarterlyPrice,
        annualPrice: setting.starterAnnualPrice,
        maxUsers: setting.starterMaxUsers,
        maxBranches: 1,
        maxWarehouses: 1,
        monthlyOrderLimit: setting.starterMaxOrders,
        whatsAppCredits: setting.starterWhatsAppCredits,
        features: setting.starterFeatures
      },
      GROWTH: {
        name: "Growth Plan",
        monthlyPrice: setting.growthMonthlyPrice,
        quarterlyPrice: setting.growthQuarterlyPrice,
        annualPrice: setting.growthAnnualPrice,
        maxUsers: setting.growthMaxUsers,
        maxBranches: 3,
        maxWarehouses: 2,
        monthlyOrderLimit: setting.growthMaxOrders,
        whatsAppCredits: setting.growthWhatsAppCredits,
        features: setting.growthFeatures
      },
      ENTERPRISE: {
        name: "Enterprise Plan",
        monthlyPrice: setting.enterpriseMonthlyPrice,
        quarterlyPrice: setting.enterpriseQuarterlyPrice,
        annualPrice: setting.enterpriseAnnualPrice,
        maxUsers: setting.enterpriseMaxUsers,
        maxBranches: 99,
        maxWarehouses: 99,
        monthlyOrderLimit: setting.enterpriseMaxOrders,
        whatsAppCredits: setting.enterpriseWhatsAppCredits,
        features: setting.enterpriseFeatures
      }
    };
  } catch (error) {
    console.error("Error fetching live plan pricing:", error);
    return PLAN_PRICING;
  }
}

/**
 * Super Admin: Update Public Plan Pricing & Quotas
 */
export async function updatePlatformPricingSettings(input: {
  starterMonthlyPrice: number;
  starterQuarterlyPrice: number;
  starterAnnualPrice: number;
  starterMaxUsers: number;
  starterMaxOrders: number;
  starterWhatsAppCredits: number;

  growthMonthlyPrice: number;
  growthQuarterlyPrice: number;
  growthAnnualPrice: number;
  growthMaxUsers: number;
  growthMaxOrders: number;
  growthWhatsAppCredits: number;

  enterpriseMonthlyPrice: number;
  enterpriseQuarterlyPrice: number;
  enterpriseAnnualPrice: number;
  enterpriseMaxUsers: number;
  enterpriseMaxOrders: number;
  enterpriseWhatsAppCredits: number;
}) {
  try {
    const ctx = await getTenantContext();
    if (!ctx || !ctx.isPlatformOwner) {
      return { success: false, error: "Access denied. Platform Super Admin credentials required." };
    }

    await prisma.platformPricingSetting.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        ...input
      },
      update: {
        ...input
      }
    });

    revalidatePath('/pricing');
    revalidatePath('/register');
    revalidatePath('/platform-admin');
    revalidatePath('/settings/billing');

    return {
      success: true,
      message: "Public pricing & tier configurations updated successfully!"
    };
  } catch (error: any) {
    console.error("Error updating platform pricing:", error);
    return { success: false, error: error.message || "Failed to update pricing." };
  }
}

/**
 * Super Admin: Edit Services, Quotas, and Feature Access for an Existing Customer/Tenant
 */
export async function updateTenantSubscriptionAndServices(input: {
  organizationId: string;
  name?: string;
  tradeName?: string;
  subscriptionPlan: string;
  billingCycle: string;
  subscriptionStatus: string;
  currentPeriodEnd?: string | Date;
  maxUsers: number;
  maxBranches: number;
  maxWarehouses: number;
  monthlyOrderLimit: number;
  whatsAppCreditBalance: number;
  isGstEnabled: boolean;
  isWhatsAppEnabled: boolean;
  isEWayBillEnabled: boolean;
  isHrmsEnabled: boolean;
}) {
  try {
    const ctx = await getTenantContext();
    if (!ctx || !ctx.isPlatformOwner) {
      return { success: false, error: "Access denied. Platform Super Admin credentials required." };
    }

    const org = await prisma.organization.findUnique({
      where: { id: input.organizationId }
    });

    if (!org) return { success: false, error: "Organization not found." };

    const updateData: any = {
      subscriptionPlan: input.subscriptionPlan,
      billingCycle: input.billingCycle,
      subscriptionStatus: input.subscriptionStatus,
      maxUsers: Number(input.maxUsers),
      maxBranches: Number(input.maxBranches),
      maxWarehouses: Number(input.maxWarehouses),
      monthlyOrderLimit: Number(input.monthlyOrderLimit),
      whatsAppCreditBalance: Number(input.whatsAppCreditBalance),
      isGstEnabled: Boolean(input.isGstEnabled),
      isWhatsAppEnabled: Boolean(input.isWhatsAppEnabled),
      isEWayBillEnabled: Boolean(input.isEWayBillEnabled),
      isHrmsEnabled: Boolean(input.isHrmsEnabled),
    };

    if (input.name) updateData.name = input.name;
    if (input.tradeName) updateData.tradeName = input.tradeName;
    if (input.currentPeriodEnd) updateData.currentPeriodEnd = new Date(input.currentPeriodEnd);

    await prisma.organization.update({
      where: { id: input.organizationId },
      data: updateData
    });

    revalidatePath('/platform-admin');
    revalidatePath('/settings/billing');

    return {
      success: true,
      message: `Services and subscription for "${org.name}" updated successfully!`
    };
  } catch (error: any) {
    console.error("Error updating tenant services:", error);
    return { success: false, error: error.message || "Failed to update tenant services." };
  }
}

