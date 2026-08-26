import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

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

    // Ensure default company settings
    const existingSettings = await prisma.companySettings.findFirst({
      where: { organizationId: orgId }
    });
    if (!existingSettings) {
      await prisma.companySettings.create({
        data: {
          id: `settings-${orgId}`,
          organizationId: orgId,
          companyName: "Espon Clothing Private Limited",
          address: "Sco 71A , 2nd Floor , Ashoka PlazaDelhi Road",
          city: "Rohtak",
          state: "Haryana",
          pincode: "124001",
          country: "India",
          gstin: "06AAHCE7721Q1Z4",
          pan: "AAHCE7721Q",
          mobile: "7206066678",
          email: "clothingespon@gmail.com",
          website: "www.espon.in",
          bankAccountName: "ESPON CLOTHING PRIVATE LIMITED.",
          accountNumber: "016805006415",
          ifscCode: "ICIC0000168",
          branch: "Rohtak",
          upiId: "7206066678@OKBIZAXIS",
          themeColor: "#4f46e5",
          fontFamily: "Inter"
        }
      }).catch(() => {});
    }

    // Ensure default admin users exist
    const adminEmails = [
      { email: "admin@company.com", name: "Admin User" },
      { email: "clothingespon@gmail.com", name: "Ashish Aggarwal" }
    ];

    for (const item of adminEmails) {
      const existingUser = await prisma.user.findUnique({ where: { email: item.email } });
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash("admin123", 10);
        const newUser = await prisma.user.create({
          data: {
            email: item.email,
            password: hashedPassword,
            name: item.name,
            role: "SUPER_ADMIN",
            canManageSettings: true,
            organizationId: orgId
          }
        });
        await prisma.employee.create({
          data: {
            userId: newUser.id,
            organizationId: orgId,
            designation: "Managing Director",
            department: "Management",
            joiningDate: new Date(),
            salary: 150000,
            target: 2000000
          }
        }).catch(() => {});
      }
    }

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
