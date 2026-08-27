"use server";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";

const FALLBACK_SETTINGS = {
  id: "default",
  companyName: "Espon Clothing Private Limited",
  gstin: "06AAHCE7721Q1Z4",
  pan: "AAHCE7721Q",
  address: "Sco 71A , 2nd Floor , Ashoka PlazaDelhi Road",
  city: "Rohtak",
  state: "Haryana",
  pincode: "124001",
  country: "India",
  mobile: "7206066678",
  email: "clothingespon@gmail.com",
  website: "www.espon.in",
  logoUrl: null as string | null,
  signatoryUrl: null as string | null,
  signatoryName: "Authorized Signatory",
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

const fetchSettingsInternal = cache(async (orgId?: string) => {
  let settings = null;
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
            signatoryName: org.name,
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

  return settings;
});

let settingsCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 30000; // 30s in-memory cache

export async function invalidateCompanySettingsCache() {
  settingsCache = null;
}

export const getCompanySettings = cache(async function getCompanySettings() {
  const now = Date.now();
  if (settingsCache && (now - settingsCache.timestamp) < CACHE_TTL_MS) {
    return settingsCache.data;
  }

  try {
    const session = await getServerSession(authOptions);
    const orgId = (session?.user as any)?.organizationId || (await getTenantOrgId());
    const settings = await fetchSettingsInternal(orgId);
    const result = { success: true, settings: settings || FALLBACK_SETTINGS };
    settingsCache = { data: result, timestamp: now };
    return result;
  } catch (error) {
    console.error("Error getting company settings:", error);
    return { 
      success: true, 
      settings: FALLBACK_SETTINGS
    };
  }
});

export async function updateMonthlyTarget(target: number) {
  try {
    const orgId = await getTenantOrgId();
    const current = await getCompanySettings();
    const settingId = current.settings?.id || (orgId ? `settings-${orgId}` : "default");

    const updated = await prisma.companySettings.upsert({
      where: { id: settingId },
      update: { monthlyTarget: target, organizationId: orgId },
      create: { id: settingId, organizationId: orgId, companyName: current.settings?.companyName || "My Business", monthlyTarget: target }
    });
    settingsCache = null;
    revalidatePath("/");
    return { success: true, settings: updated };
  } catch (error) {
    console.error("Failed to update monthly target:", error);
    return { error: "Failed to update monthly target" };
  }
}

export async function updateCallOutcomes(outcomes: string[]) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return { error: "Unauthorized: Admin privileges required." };
    }

    const orgId = await getTenantOrgId();
    const current = await getCompanySettings();
    const settingId = current.settings?.id || (orgId ? `settings-${orgId}` : "default");

    const cleanOutcomes = outcomes.map(o => o.trim()).filter(Boolean);
    const updated = await prisma.companySettings.upsert({
      where: { id: settingId },
      update: { callOutcomes: cleanOutcomes, organizationId: orgId },
      create: { id: settingId, organizationId: orgId, companyName: current.settings?.companyName || "My Business", callOutcomes: cleanOutcomes }
    });
    settingsCache = null;
    revalidatePath("/calls");
    revalidatePath("/settings");
    revalidatePath("/settings/organization");
    return { success: true, callOutcomes: updated.callOutcomes };
  } catch (error) {
    console.error("Failed to update call outcomes:", error);
    return { error: "Failed to update call outcomes" };
  }
}

export async function updateCallTypes(callTypes: string[]) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return { error: "Unauthorized: Admin privileges required." };
    }

    const orgId = await getTenantOrgId();
    const current = await getCompanySettings();
    const settingId = current.settings?.id || (orgId ? `settings-${orgId}` : "default");

    const cleanTypes = callTypes.map(t => t.trim()).filter(Boolean);
    const updated = await prisma.companySettings.upsert({
      where: { id: settingId },
      update: { callTypes: cleanTypes, organizationId: orgId },
      create: { id: settingId, organizationId: orgId, companyName: current.settings?.companyName || "My Business", callTypes: cleanTypes }
    });
    settingsCache = null;
    revalidatePath("/calls");
    revalidatePath("/settings");
    revalidatePath("/settings/organization");
    return { success: true, callTypes: updated.callTypes };
  } catch (error) {
    console.error("Failed to update call types:", error);
    return { error: "Failed to update call types" };
  }
}

export async function updateCompanySettings(formData: FormData) {
  try {
    const orgId = await getTenantOrgId();
    const current = await getCompanySettings();
    const settingId = current.settings?.id || (orgId ? `settings-${orgId}` : "default");

    const companyName = formData.get("companyName") as string;
    const gstin = formData.get("gstin") as string;
    const pan = formData.get("pan") as string;
    const address = formData.get("address") as string;
    const city = formData.get("city") as string;
    const state = formData.get("state") as string;
    const pincode = formData.get("pincode") as string;
    const country = (formData.get("country") as string) || "India";
    const email = formData.get("email") as string;
    const mobile = formData.get("mobile") as string;
    const website = formData.get("website") as string;
    const logoUrl = formData.get("logoUrl") as string;
    const signatoryUrl = formData.get("signatoryUrl") as string;
    const signatoryName = formData.get("signatoryName") as string;
    const signatoryDesignation = formData.get("signatoryDesignation") as string;

    const bankAccountName = formData.get("bankAccountName") as string;
    const accountNumber = formData.get("accountNumber") as string;
    const ifscCode = formData.get("ifscCode") as string;
    const branch = formData.get("branch") as string;
    const upiId = formData.get("upiId") as string;

    const themeColor = formData.get("themeColor") as string;
    const fontFamily = formData.get("fontFamily") as string;
    const fontSize = formData.get("fontSize") as string;
    const buttonRadius = formData.get("buttonRadius") as string;
    const useBoldText = formData.get("useBoldText") === "true";

    const callOutcomesStr = formData.get("callOutcomes") as string;
    let callOutcomes: string[] | undefined = undefined;
    if (callOutcomesStr) {
      try {
        callOutcomes = JSON.parse(callOutcomesStr);
      } catch (e) {}
    }

    const callTypesStr = formData.get("callTypes") as string;
    let callTypes: string[] | undefined = undefined;
    if (callTypesStr) {
      try {
        callTypes = JSON.parse(callTypesStr);
      } catch (e) {}
    }

    const nextQuotationNumber = formData.get("nextQuotationNumber") as string;
    const nextInvoiceNumber = formData.get("nextInvoiceNumber") as string;

    const updated = await prisma.companySettings.upsert({
      where: { id: settingId },
      update: {
        organizationId: orgId,
        companyName, gstin, pan, address, city, state, pincode, country, email, mobile, website, logoUrl, 
        signatoryUrl: signatoryUrl || null,
        signatoryName: signatoryName || "Authorized Signatory",
        signatoryDesignation: signatoryDesignation || "Authorized Signatory",
        bankAccountName, accountNumber, ifscCode, branch, upiId,
        ...(nextQuotationNumber ? { nextQuotationNumber } : {}),
        ...(nextInvoiceNumber ? { nextInvoiceNumber } : {}),
        ...(themeColor ? { themeColor } : {}),
        ...(fontFamily ? { fontFamily } : {}),
        ...(fontSize ? { fontSize } : {}),
        ...(buttonRadius ? { buttonRadius } : {}),
        ...(callOutcomes ? { callOutcomes } : {}),
        ...(callTypes ? { callTypes } : {}),
        useBoldText
      },
      create: {
        id: settingId,
        organizationId: orgId,
        companyName: companyName || "My Business",
        gstin, pan, address, city, state, pincode, country, email, mobile, website, logoUrl,
        signatoryUrl: signatoryUrl || null,
        signatoryName: signatoryName || "Authorized Signatory",
        signatoryDesignation: signatoryDesignation || "Authorized Signatory",
        bankAccountName, accountNumber, ifscCode, branch, upiId,
        nextQuotationNumber: nextQuotationNumber || "QT-1001",
        nextInvoiceNumber: nextInvoiceNumber || "INV-1001",
        themeColor: themeColor || "#4f46e5",
        fontFamily: fontFamily || "Inter",
        fontSize: fontSize || "16px",
        buttonRadius: buttonRadius || "8px",
        useBoldText,
        ...(callOutcomes ? { callOutcomes } : {}),
        ...(callTypes ? { callTypes } : {})
      }
    });

    // Also sync the Organization record if orgId is set
    if (orgId) {
      await prisma.organization.update({
        where: { id: orgId },
        data: {
          name: companyName || undefined,
          gstin: gstin || undefined,
          pan: pan || undefined,
          phone: mobile || undefined,
          email: email || undefined,
          city: city || undefined,
          state: state || undefined,
          pincode: pincode || undefined,
          website: website || undefined,
          logoUrl: logoUrl || undefined,
          address: address || undefined,
        }
      }).catch(() => {});
    }

    settingsCache = null;
    revalidatePath("/settings");
    revalidatePath("/settings/organization");
    revalidatePath("/calls");
    revalidatePath("/quotations");
    revalidatePath("/orders");
    revalidatePath("/", "layout");
    return { success: true, settings: updated };
  } catch (error) {
    console.error("Failed to update company settings:", error);
    return { error: "Failed to update settings" };
  }
}
