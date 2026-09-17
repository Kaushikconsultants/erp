"use server";

import { prisma } from "@/lib/prisma";

export async function getPublicCatalogData(productIds?: string[]) {
  try {
    const defaultOrg = await prisma.organization.findFirst({
      where: { slug: { in: ["tinkal-erp", "espon-global"] } }
    }) || await prisma.organization.findFirst();

    const orgId = defaultOrg?.id;

    const whereClause: any = orgId ? { organizationId: orgId } : {};
    if (productIds && productIds.length > 0) {
      whereClause.id = { in: productIds };
    }

    const [products, companySettings] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" }
      }),
      orgId ? prisma.companySettings.findFirst({ where: { organizationId: orgId } }) : null
    ]);

    const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];

    return {
      success: true,
      products: JSON.parse(JSON.stringify(products)),
      categories,
      company: {
        companyName: companySettings?.companyName || defaultOrg?.name || "ESPON CLOTHING PRIVATE LIMITED",
        address: companySettings?.address || "Sco 71A, 2nd Floor, Ashoka Plaza, Delhi Road, Rohtak, Haryana",
        city: companySettings?.city || "Rohtak",
        state: companySettings?.state || "Haryana",
        mobile: companySettings?.mobile || "+91 7206066678",
        email: companySettings?.email || "clothingespon@gmail.com",
        gstin: companySettings?.gstin || "06AAHCE7721Q1Z4"
      }
    };
  } catch (err: any) {
    console.error("Failed to load public catalog:", err);
    return { success: false, error: err.message, products: [], categories: [], company: null };
  }
}
