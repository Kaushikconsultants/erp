import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";

export const FALLBACK_SETTINGS = {
  id: "default",
  companyName: "R3 EXPORTS",
  gstin: "06AAHCE7721Q1Z4",
  pan: "AAHCE7721Q",
  address: "Sco 71A , 2nd Floor , Ashoka PlazaDelhi Road",
  city: "Rohtak",
  state: "Haryana",
  pincode: "124001",
  country: "India",
  mobile: "7206066678",
  email: "clothingespon@gmail.com",
  website: "www.tinkal.in",
  logoUrl: null as string | null,
  signatoryUrl: null as string | null,
  signatoryName: null as string | null,
  signatoryDesignation: "Authorized Signatory",
  bankAccountName: "ESPON CLOTHING PRIVATE LIMITED.",
  accountNumber: "016805006415",
  ifscCode: "ICIC0000168",
  branch: "Rohtak",
  upiId: "7206066678@OKBIZAXIS",
  themeColor: "#4f46e5",
  fontFamily: "Inter",
  fontSize: "16px",
  buttonRadius: "8px",
  useBoldText: false,
  monthlyTarget: 2000000,
  nextQuotationNumber: "QT-1001",
  nextInvoiceNumber: "INV-1001",
  callOutcomes: ["Interested / Follow-up Needed", "Not Interested", "No Answer / Voicemail", "Order Placed", "Complaint / Support", "Call Back Later"],
  callTypes: ["Outbound Call (Made by us)", "Inbound Call (Received from customer)", "In-person Meeting", "WhatsApp Chat"],
  updatedAt: new Date()
};

const settingsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 30000; // 30s per-tenant in-memory cache

export function invalidateCompanySettingsCache(orgId?: string) {
  if (orgId) {
    settingsCache.delete(orgId);
    settingsCache.delete("default");
  } else {
    settingsCache.clear();
  }
}

const fetchSettingsInternal = cache(async (orgId?: string) => {
  if (!process.env.DATABASE_URL) {
    return FALLBACK_SETTINGS;
  }
  let settings = null;
  try {
    if (orgId) {
      settings = await prisma.companySettings.findFirst({
        where: {
          OR: [
            { organizationId: orgId },
            { id: `settings-${orgId}` }
          ]
        }
      });

      if (!settings) {
        const org = await prisma.organization.findUnique({ where: { id: orgId } });
        if (org) {
          settings = await prisma.companySettings.create({
            data: {
              id: `settings-${org.id}`,
              organizationId: org.id,
              companyName: org.name,
              gstin: org.gstin || null,
              pan: org.pan || null,
              address: org.address || `${org.city || 'Rohtak'}, ${org.state || 'Haryana'}`,
              city: org.city || "Rohtak",
              state: org.state || "Haryana",
              pincode: org.pincode || "124001",
              country: org.country || "India",
              mobile: org.phone || "",
              email: org.email || "",
              website: org.website || "",
              themeColor: "#4f46e5",
              signatoryName: null,
              signatoryDesignation: "Authorized Signatory"
            }
          }).catch(async () => {
            return await prisma.companySettings.findFirst({ where: { organizationId: orgId } });
          });
        }
      }
    }

    if (!settings) {
      settings = await prisma.companySettings.findUnique({ where: { id: "default" } });
    }

    if (!settings) {
      settings = await prisma.companySettings.findFirst();
    }
  } catch (err) {
    return FALLBACK_SETTINGS;
  }

  return settings || FALLBACK_SETTINGS;
});

const cachedGetCompanySettings = cache(async function getCompanySettingsInternal() {
  if (!process.env.DATABASE_URL) {
    return { success: true, settings: FALLBACK_SETTINGS };
  }
  const now = Date.now();
  let orgId = "default";
  try {
    const session = await getServerSession(authOptions);
    orgId = (session?.user as any)?.organizationId || (await getTenantOrgId()) || "default";
  } catch (e) {}

  const cached = settingsCache.get(orgId);
  if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const settings = await fetchSettingsInternal(orgId);
    const result = { success: true, settings: settings || FALLBACK_SETTINGS };
    settingsCache.set(orgId, { data: result, timestamp: now });
    return result;
  } catch (error) {
    return { 
      success: true, 
      settings: FALLBACK_SETTINGS
    };
  }
});

export async function getCompanySettings() {
  return cachedGetCompanySettings();
}
