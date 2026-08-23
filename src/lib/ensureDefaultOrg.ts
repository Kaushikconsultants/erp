import { prisma } from "./prisma";

export async function ensureDefaultOrganization() {
  try {
    let defaultOrg = await prisma.organization.findFirst({
      where: { slug: "espon-global" }
    });

    if (!defaultOrg) {
      defaultOrg = await prisma.organization.create({
        data: {
          name: "Espon Global Industries Private Limited",
          slug: "espon-global",
          tradeName: "Espon Apparel",
          industry: "Apparel & Garments",
          businessType: "Private Limited",
          email: "clothingespon@gmail.com",
          phone: "7206066678",
          city: "Rohtak",
          state: "Haryana",
          country: "India",
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
      console.log("Created root organization:", defaultOrg.name);
    }

    const orgId = defaultOrg.id;

    // Link existing records without organizationId
    await prisma.user.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId }
    });

    await prisma.companySettings.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId }
    });

    await prisma.gstSetting.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId }
    });

    await prisma.customer.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId }
    });

    await prisma.product.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId }
    });

    await prisma.order.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId }
    });

    await prisma.invoice.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId }
    });

    await prisma.bill.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId }
    });

    await prisma.quotation.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId }
    });

    await prisma.vendor.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId }
    });

    await prisma.branch.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId }
    });

    await prisma.warehouse.updateMany({
      where: { organizationId: null },
      data: { organizationId: orgId }
    });

    return defaultOrg;
  } catch (error) {
    console.error("Error ensuring default organization:", error);
    return null;
  }
}
