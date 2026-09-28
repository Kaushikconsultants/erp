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
  industry?: string;
  businessType?: string;
  gstin?: string;
  city: string;
  state: string;
  pincode?: string;

  // Optional plan fallback
  plan?: string;
  billingCycle?: string;
}

import { PLAN_PRICING, getAddonSeatPrice } from "@/lib/planConfig";
import { generateUniqueEmployeeId } from "@/lib/employeeHelper";

/**
 * Register a new Business Organization and provision its permanent workspace
 */
export async function registerNewBusiness(input: RegisterBusinessInput) {
  try {
    const adminEmail = input.adminEmail.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
      include: { employee: true, organization: true }
    });

    if (existingUser) {
      if (existingUser.employee) {
        return { success: false, error: "An account with this email address already exists. Please sign in instead." };
      }

      // Prior attempt failed mid-way before employee profile was created:
      // Clean up orphaned records so re-registration succeeds cleanly
      try {
        if (existingUser.organizationId) {
          const orgId = existingUser.organizationId;
          await prisma.companySettings.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
          await prisma.gstSetting.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
          await prisma.subscriptionHistory.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
          await prisma.user.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
          await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
        } else {
          await prisma.user.delete({ where: { id: existingUser.id } }).catch(() => {});
        }
      } catch (cleanupErr) {
        console.warn("Cleaned up orphaned prior registration:", cleanupErr);
      }
    }

    // Generate unique slug
    let baseSlug = input.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30);
    
    if (!baseSlug || baseSlug === '-') baseSlug = 'r3';

    const countSameSlug = await prisma.organization.count({
      where: { slug: { startsWith: baseSlug } }
    });

    const slug = countSameSlug > 0 ? `${baseSlug}-${countSameSlug + 1}` : baseSlug;

    // Hash admin password
    const hashedPassword = await bcrypt.hash(input.adminPassword, 10);

    // Execute all registration steps within a single transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Organization with lifetime unlimited full access
      const organization = await tx.organization.create({
        data: {
          name: input.companyName.trim(),
          slug,
          tradeName: input.tradeName || input.companyName,
          industry: input.industry || "Apparel & Garments",
          businessType: input.businessType || "Private Limited",
          gstin: input.gstin ? input.gstin.toUpperCase().trim() : null,
          phone: input.adminMobile.trim(),
          email: adminEmail,
          city: input.city || "Rohtak",
          state: input.state || "Haryana",
          pincode: input.pincode || "124001",
          country: "India",
          subscriptionPlan: "ENTERPRISE",
          billingCycle: "ANNUALLY",
          subscriptionStatus: "ACTIVE",
          trialEndsAt: null,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date("2099-12-31"),
          maxUsers: 999999,
          maxBranches: 999999,
          maxWarehouses: 999999,
          monthlyOrderLimit: 999999,
          whatsAppCreditBalance: 999999,
          isGstEnabled: true,
          isWhatsAppEnabled: true,
          isEWayBillEnabled: true,
          isHrmsEnabled: true,
          isProductionEnabled: true,
          isAiScannerEnabled: true,
          isTeleCrmEnabled: true,
          isInventoryEnabled: true,
          isAccountingEnabled: true,
          isQuotationsEnabled: true,
        }
      });

      // 2. Create Super Admin User
      const adminUser = await tx.user.create({
        data: {
          organizationId: organization.id,
          name: input.adminName.trim(),
          email: adminEmail,
          password: hashedPassword,
          plainPassword: input.adminPassword,
          role: "SUPER_ADMIN",
          canManageSettings: true,
          isActive: true,
        }
      });

      // 2b. Generate guaranteed unique employeeId for Super Admin
      const uniqueEmpId = await generateUniqueEmployeeId(tx, organization.slug || organization.name);

      await tx.employee.create({
        data: {
          userId: adminUser.id,
          employeeId: uniqueEmpId,
          department: "Executive",
          designation: "Managing Director",
          employmentStatus: "Active",
          joiningDate: new Date(),
          organizationId: organization.id,
        }
      });

      // 3. Create Default CompanySettings for this organization
      await tx.companySettings.create({
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
      await tx.gstSetting.create({
        data: {
          id: `gst-${organization.id}`,
          organizationId: organization.id,
          gstin: organization.gstin,
          legalName: organization.name,
          tradeName: organization.tradeName || organization.name,
          registeredState: organization.state || "Haryana",
        }
      });

      return {
        organization,
        adminUser,
      };
    });

    return {
      success: true,
      message: `Workspace created successfully! Full unrestricted enterprise access enabled for ${result.organization.name}.`,
      organizationSlug: result.organization.slug,
      adminEmail: result.adminUser.email,
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
        whatsAppCreditBalance: {
          increment: billingCycle === 'ANNUALLY'
            ? planConfig.whatsAppCredits * 12
            : billingCycle === 'QUARTERLY'
              ? planConfig.whatsAppCredits * 3
              : planConfig.whatsAppCredits
        },
        isGstEnabled: newPlan === 'GROWTH' || newPlan === 'ENTERPRISE',
        isEWayBillEnabled: newPlan === 'GROWTH' || newPlan === 'ENTERPRISE',
        isHrmsEnabled: newPlan === 'ENTERPRISE',
        isProductionEnabled: newPlan === 'ENTERPRISE',
        isAiScannerEnabled: newPlan === 'ENTERPRISE',
        isTeleCrmEnabled: true,
        isInventoryEnabled: newPlan === 'GROWTH' || newPlan === 'ENTERPRISE',
        isAccountingEnabled: newPlan === 'GROWTH' || newPlan === 'ENTERPRISE',
        isQuotationsEnabled: true,
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
        isProductionEnabled: org.isProductionEnabled ?? (org.subscriptionPlan === 'ENTERPRISE' || org.subscriptionPlan === 'CUSTOM'),
        isAiScannerEnabled: org.isAiScannerEnabled ?? (org.subscriptionPlan === 'ENTERPRISE' || org.subscriptionPlan === 'CUSTOM'),
        isTeleCrmEnabled: org.isTeleCrmEnabled ?? true,
        isInventoryEnabled: org.isInventoryEnabled ?? (org.subscriptionPlan === 'GROWTH' || org.subscriptionPlan === 'ENTERPRISE' || org.subscriptionPlan === 'CUSTOM'),
        isAccountingEnabled: org.isAccountingEnabled ?? (org.subscriptionPlan === 'GROWTH' || org.subscriptionPlan === 'ENTERPRISE' || org.subscriptionPlan === 'CUSTOM'),
        isQuotationsEnabled: org.isQuotationsEnabled ?? true,
        trialEndsAt: org.trialEndsAt,
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
          starterAnnualPrice: 9499,
          starterMaxUsers: 3,
          starterMaxOrders: 500,
          starterWhatsAppCredits: 500,
          starterFeatures: ["Up to 3 Users", "1 Branch", "500 Orders / mo", "Basic CRM & Invoicing", "500 WhatsApp Msgs", "GST Reports"],

          growthMonthlyPrice: 2499,
          growthQuarterlyPrice: 6749,
          growthAnnualPrice: 23988,
          growthMaxUsers: 10,
          growthMaxOrders: 2000,
          growthWhatsAppCredits: 2500,
          growthFeatures: ["Up to 10 Users", "3 Branches & 2 Warehouses", "2,000 Orders / mo", "Full CRM & Purchase Ledger", "Live GST Portal Filing (1/3B/2B)", "2,500 WhatsApp Msgs & AI"],

          enterpriseMonthlyPrice: 5999,
          enterpriseQuarterlyPrice: 16199,
          enterpriseAnnualPrice: 57499,
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
  trialEndsAt?: string | Date | null;
  maxUsers: number;
  maxBranches: number;
  maxWarehouses: number;
  monthlyOrderLimit: number;
  whatsAppCreditBalance: number;
  isGstEnabled: boolean;
  isWhatsAppEnabled: boolean;
  isEWayBillEnabled: boolean;
  isHrmsEnabled: boolean;
  isProductionEnabled?: boolean;
  isAiScannerEnabled?: boolean;
  isTeleCrmEnabled?: boolean;
  isInventoryEnabled?: boolean;
  isAccountingEnabled?: boolean;
  isQuotationsEnabled?: boolean;
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
      isProductionEnabled: Boolean(input.isProductionEnabled ?? true),
      isAiScannerEnabled: Boolean(input.isAiScannerEnabled ?? true),
      isTeleCrmEnabled: Boolean(input.isTeleCrmEnabled ?? true),
      isInventoryEnabled: Boolean(input.isInventoryEnabled ?? true),
      isAccountingEnabled: Boolean(input.isAccountingEnabled ?? true),
      isQuotationsEnabled: Boolean(input.isQuotationsEnabled ?? true),
    };

    if (input.name) updateData.name = input.name;
    if (input.tradeName) updateData.tradeName = input.tradeName;
    if (input.currentPeriodEnd) updateData.currentPeriodEnd = new Date(input.currentPeriodEnd);
    if (input.trialEndsAt !== undefined) {
      updateData.trialEndsAt = input.trialEndsAt ? new Date(input.trialEndsAt) : null;
    }

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

/**
 * Tenant Self-Service: Purchase Additional User Seats
 */
export async function purchaseExtraUserSeats(input: {
  seatCount: number;
  paymentMethod?: string;
}) {
  try {
    const ctx = await getTenantContext();
    if (!ctx?.organizationId) {
      return { success: false, error: "Authentication required to purchase add-on seats." };
    }

    if (!ctx.canManageSettings && ctx.userRole !== 'ADMIN' && ctx.userRole !== 'SUPER_ADMIN') {
      return { success: false, error: "Only administrators can modify subscription seats." };
    }

    const seatCount = Math.floor(Number(input.seatCount));
    if (isNaN(seatCount) || seatCount < 1 || seatCount > 100) {
      return { success: false, error: "Please select between 1 and 100 seats." };
    }

    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId }
    });

    if (!org) {
      return { success: false, error: "Organization workspace not found." };
    }

    // Determine seat price based on plan and billing cycle
    const pricing = getAddonSeatPrice(org.subscriptionPlan, org.billingCycle);
    const unitPrice = pricing.unitPrice;
    const baseAmount = unitPrice * seatCount;
    const taxAmount = Math.round(baseAmount * 0.18 * 100) / 100;
    const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;

    // Execute atomic update
    const result = await prisma.$transaction(async (tx) => {
      // 1. Increment maxUsers on Organization
      const updatedOrg = await tx.organization.update({
        where: { id: org.id },
        data: {
          maxUsers: { increment: seatCount }
        }
      });

      // 2. Generate unique Tax Invoice number
      const invoiceCount = await tx.subscriptionInvoice.count();
      const invoiceNumber = `SEAT-${new Date().getFullYear()}-${String(invoiceCount + 1001).padStart(5, '0')}`;

      const invoice = await tx.subscriptionInvoice.create({
        data: {
          invoiceNumber,
          organizationId: org.id,
          amount: baseAmount,
          cgst: taxAmount / 2,
          sgst: taxAmount / 2,
          igst: 0,
          total: totalAmount,
          paidAt: new Date()
        }
      });

      // 3. Record in SubscriptionHistory
      await tx.subscriptionHistory.create({
        data: {
          organizationId: org.id,
          plan: `${org.subscriptionPlan} (+${seatCount} Add-on Seat${seatCount > 1 ? 's' : ''})`,
          billingCycle: org.billingCycle,
          amount: baseAmount,
          currency: "INR",
          taxAmount,
          totalAmount,
          status: "PAID",
          paymentMethod: input.paymentMethod || "UPI_AUTOPAY",
          startDate: new Date(),
          endDate: org.currentPeriodEnd
        }
      });

      return { updatedOrg, invoice };
    });

    revalidatePath('/settings/billing');
    revalidatePath('/settings');
    revalidatePath('/settings/roles');
    revalidatePath('/platform-admin');

    return {
      success: true,
      message: `Successfully added ${seatCount} user seat${seatCount > 1 ? 's' : ''}! New total capacity: ${result.updatedOrg.maxUsers} users.`,
      newMaxUsers: result.updatedOrg.maxUsers,
      seatsPurchased: seatCount,
      invoiceNumber: result.invoice.invoiceNumber,
      totalPaid: totalAmount
    };
  } catch (error: any) {
    console.error("Error purchasing extra user seats:", error);
    return { success: false, error: error.message || "Failed to purchase additional user seats." };
  }
}

/**
 * Owner Only: Create a new tenant/organization account from the platform admin panel.
 * Only the platform Owner account (owner@tinkal.in) can call this.
 */
export async function createTenantByAdmin(input: RegisterBusinessInput) {
  try {
    const ctx = await getTenantContext();
    if (!ctx || !ctx.isOwner) {
      return { success: false, error: "Access denied. Only the platform Owner account can create new tenants." };
    }

    // Reuse the registerNewBusiness logic
    const result = await registerNewBusiness(input);

    if (result.success) {
      revalidatePath('/platform-admin');
    }

    return result;
  } catch (error: any) {
    console.error("Error creating tenant by admin:", error);
    return { success: false, error: error.message || "Failed to create tenant." };
  }
}

/**
/**
 * Permanently delete a sister organization / tenant and clean up all its data.
 * Super Admins / Admins can delete sister organizations.
 */
export async function deleteSisterOrganization(organizationId: string) {
  try {
    const ctx = await getTenantContext();
    if (!ctx || !ctx.isOwner) {
      return { success: false, error: "Access denied. Only Admins can delete organizations." };
    }

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return { success: false, error: "Organization not found." };

    // Find fallback organization to switch to if deleting active org
    const fallbackOrg = await prisma.organization.findFirst({
      where: { id: { not: organizationId } },
      orderBy: { createdAt: 'asc' }
    });

    if (!fallbackOrg) {
      return { success: false, error: "Cannot delete the only remaining organization in the system." };
    }

    // If current user is on this organization, switch them first
    if (ctx.userId) {
      await prisma.user.updateMany({
        where: { organizationId },
        data: { organizationId: fallbackOrg.id }
      }).catch(() => {});

      await prisma.employee.updateMany({
        where: { organizationId },
        data: { organizationId: fallbackOrg.id }
      }).catch(() => {});
    }

    // Delete in proper dependency order
    await prisma.$transaction(async (tx) => {
      await tx.subscriptionInvoice.deleteMany({ where: { organizationId } }).catch(() => {});
      await tx.subscriptionHistory.deleteMany({ where: { organizationId } }).catch(() => {});
      await tx.attendance.deleteMany({ where: { employee: { organizationId } } }).catch(() => {});
      await tx.task.deleteMany({ where: { creator: { organizationId } } }).catch(() => {});
      await tx.call.deleteMany({ where: { employee: { organizationId } } }).catch(() => {});
      await tx.followUp.deleteMany({ where: { employee: { organizationId } } }).catch(() => {});
      await tx.quotationItem.deleteMany({ where: { quotation: { organizationId } } }).catch(() => {});
      await tx.quotation.deleteMany({ where: { organizationId } }).catch(() => {});
      await tx.proformaInvoiceItem.deleteMany({ where: { proformaInvoice: { organizationId } } }).catch(() => {});
      await tx.proformaInvoice.deleteMany({ where: { organizationId } }).catch(() => {});
      await tx.invoice.deleteMany({ where: { organizationId } }).catch(() => {});
      await tx.orderItem.deleteMany({ where: { order: { organizationId } } }).catch(() => {});
      await tx.order.deleteMany({ where: { organizationId } }).catch(() => {});
      await tx.customer.deleteMany({ where: { organizationId } }).catch(() => {});
      await tx.product.deleteMany({ where: { organizationId } }).catch(() => {});
      await tx.branch.deleteMany({ where: { organizationId } }).catch(() => {});
      await tx.warehouse.deleteMany({ where: { organizationId } }).catch(() => {});
      await tx.companySettings.deleteMany({ where: { organizationId } }).catch(() => {});
      await tx.gstSetting.deleteMany({ where: { organizationId } }).catch(() => {});
      await tx.employee.deleteMany({ where: { organizationId } }).catch(() => {});
      await tx.user.deleteMany({ where: { organizationId } }).catch(() => {});
      await tx.organization.delete({ where: { id: organizationId } });
    });

    revalidatePath('/', 'layout');
    return { success: true, message: `Organization "${org.name}" deleted successfully. Switched to ${fallbackOrg.name}.`, fallbackOrgId: fallbackOrg.id };
  } catch (error: any) {
    console.error("Error deleting organization:", error);
    return { success: false, error: error.message || "Failed to delete organization." };
  }
}

export async function deleteTenantByAdmin(organizationId: string) {
  return deleteSisterOrganization(organizationId);
}

/**
 * Fetch all organizations in the group for switcher and multi-entity administration
 */
export async function getAllOrganizations() {
  try {
    const ctx = await getTenantContext();
    if (!ctx) return { success: false, error: "Not authenticated" };

    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        tradeName: true,
        city: true,
        state: true,
        gstin: true,
        email: true,
        phone: true,
        _count: {
          select: {
            users: true,
            branches: true,
            orders: true,
            employees: true,
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return {
      success: true,
      activeOrgId: ctx.organizationId,
      organizations
    };
  } catch (error: any) {
    console.error("Error loading organizations:", error);
    return { success: false, error: error.message || "Failed to load organizations" };
  }
}

/**
 * Switch active organization for the currently logged-in user
 */
export async function switchUserOrganization(organizationId: string) {
  try {
    const ctx = await getTenantContext();
    if (!ctx || !ctx.userId) return { success: false, error: "Not authenticated" };

    const targetOrg = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!targetOrg) {
      return { success: false, error: "Target organization not found." };
    }

    await prisma.user.update({
      where: { id: ctx.userId },
      data: { organizationId: targetOrg.id }
    });

    // If user has an employee profile, update its organizationId as well
    await prisma.employee.updateMany({
      where: { userId: ctx.userId },
      data: { organizationId: targetOrg.id }
    }).catch(() => {});

    revalidatePath('/', 'layout');
    return { success: true, organizationName: targetOrg.name };
  } catch (error: any) {
    console.error("Error switching organization:", error);
    return { success: false, error: error.message || "Failed to switch organization" };
  }
}

/**
 * Create a new sister organization / company entity under R3
 */
export async function createSisterOrganization(input: {
  companyName: string;
  tradeName?: string;
  industry?: string;
  businessType?: string;
  gstin?: string;
  city: string;
  state: string;
  pincode?: string;
  phone?: string;
  email?: string;
}) {
  try {
    const ctx = await getTenantContext();
    if (!ctx || !ctx.userId) return { success: false, error: "Not authenticated" };

    let baseSlug = input.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30);
    
    if (!baseSlug || baseSlug === '-') baseSlug = 'r3';

    const countSameSlug = await prisma.organization.count({
      where: { slug: { startsWith: baseSlug } }
    });
    const slug = countSameSlug > 0 ? `${baseSlug}-${countSameSlug + 1}` : baseSlug;

    const org = await prisma.organization.create({
      data: {
        name: input.companyName.trim(),
        slug,
        tradeName: input.tradeName || input.companyName,
        industry: input.industry || "Apparel & Garments",
        businessType: input.businessType || "Private Limited",
        gstin: input.gstin ? input.gstin.toUpperCase().trim() : null,
        phone: input.phone || null,
        email: input.email || ctx.userId,
        city: input.city || "Rohtak",
        state: input.state || "Haryana",
        pincode: input.pincode || "124001",
        country: "India",
        subscriptionPlan: "ENTERPRISE",
        billingCycle: "ANNUALLY",
        subscriptionStatus: "ACTIVE",
        trialEndsAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date("2099-12-31"),
        maxUsers: 999999,
        maxBranches: 999999,
        maxWarehouses: 999999,
        monthlyOrderLimit: 999999,
        whatsAppCreditBalance: 999999,
        isGstEnabled: true,
        isWhatsAppEnabled: true,
        isEWayBillEnabled: true,
        isHrmsEnabled: true,
        isProductionEnabled: true,
        isAiScannerEnabled: true,
        isTeleCrmEnabled: true,
        isInventoryEnabled: true,
        isAccountingEnabled: true,
        isQuotationsEnabled: true,
      }
    });

    // Create default company settings and gst setting
    await prisma.companySettings.create({
      data: {
        id: `settings-${org.id}`,
        organizationId: org.id,
        companyName: org.name,
        address: `${org.city}, ${org.state}`,
        city: org.city || "Rohtak",
        state: org.state || "Haryana",
        country: "India",
        gstin: org.gstin,
        mobile: org.phone,
        email: org.email,
        themeColor: "#4f46e5",
      }
    }).catch(() => {});

    await prisma.gstSetting.create({
      data: {
        id: `gst-${org.id}`,
        organizationId: org.id,
        gstin: org.gstin,
        legalName: org.name,
        tradeName: org.tradeName || org.name,
        registeredState: org.state || "Haryana",
      }
    }).catch(() => {});

    revalidatePath('/', 'layout');
    return { success: true, organization: org };
  } catch (error: any) {
    console.error("Error creating sister organization:", error);
    return { success: false, error: error.message || "Failed to create organization" };
  }
}

