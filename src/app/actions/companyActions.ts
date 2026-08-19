"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, unstable_cache } from "next/cache";

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
  signatoryName: "Ashish Aggarwal",
  signatoryDesignation: "Authorized Signatory",
  bankAccountName: "ESPON CLOTHING PRIVATE LIMITED.",
  accountNumber: "016805006415",
  ifscCode: "ICIC0000168",
  branch: "Rohtak",
  upiId: "7206066678@OKBIZAXIS",
  themeColor: "#4f46e5",
  fontFamily: "Inter",
  buttonRadius: "8px",
  useBoldText: false,
  monthlyTarget: 2000000,
  nextQuotationNumber: "QT-1001",
  nextInvoiceNumber: "INV-1001",
  callOutcomes: ["INTERESTED", "NOT_INTERESTED", "NO_ANSWER", "ORDER_PLACED", "COMPLAINT"],
  updatedAt: new Date()
};

const getCachedSettings = unstable_cache(
  async () => {
    try {
      let settings = await prisma.companySettings.findUnique({
        where: { id: "default" }
      });

      if (!settings) {
        settings = await prisma.companySettings.create({
          data: {
            id: "default",
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
            signatoryName: "Ashish Aggarwal",
            signatoryDesignation: "Authorized Signatory"
          }
        });
      }
      return settings;
    } catch (e) {
      console.error("getCachedSettings DB error:", e);
      return null;
    }
  },
  ['company-settings-cache'],
  { tags: ['company-settings'] }
);

export async function getCompanySettings() {
  try {
    const settings = await getCachedSettings();
    return { success: true, settings: settings || FALLBACK_SETTINGS };
  } catch (error) {
    console.error("Error getting company settings:", error);
    return { 
      success: true, 
      settings: FALLBACK_SETTINGS
    };
  }
}

export async function updateMonthlyTarget(target: number) {
  try {
    const updated = await prisma.companySettings.upsert({
      where: { id: "default" },
      update: { monthlyTarget: target },
      create: { id: "default", companyName: "Espon Clothing Private Limited", monthlyTarget: target }
    });
    revalidatePath("/");
    return { success: true, settings: updated };
  } catch (error) {
    console.error("Failed to update monthly target:", error);
    return { error: "Failed to update monthly target" };
  }
}

export async function updateCompanySettings(formData: FormData) {
  try {
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
    const buttonRadius = formData.get("buttonRadius") as string;
    const useBoldText = formData.get("useBoldText") === "true";

    const callOutcomesStr = formData.get("callOutcomes") as string;
    let callOutcomes: string[] | undefined = undefined;
    if (callOutcomesStr) {
      try {
        callOutcomes = JSON.parse(callOutcomesStr);
      } catch (e) {}
    }

    const nextQuotationNumber = formData.get("nextQuotationNumber") as string;
    const nextInvoiceNumber = formData.get("nextInvoiceNumber") as string;

    const updated = await prisma.companySettings.upsert({
      where: { id: "default" },
      update: {
        companyName, gstin, pan, address, city, state, pincode, country, email, mobile, website, logoUrl, 
        signatoryUrl: signatoryUrl || null,
        signatoryName: signatoryName || "Ashish Aggarwal",
        signatoryDesignation: signatoryDesignation || "Authorized Signatory",
        bankAccountName, accountNumber, ifscCode, branch, upiId,
        ...(nextQuotationNumber ? { nextQuotationNumber } : {}),
        ...(nextInvoiceNumber ? { nextInvoiceNumber } : {}),
        ...(themeColor ? { themeColor } : {}),
        ...(fontFamily ? { fontFamily } : {}),
        ...(buttonRadius ? { buttonRadius } : {}),
        ...(callOutcomes ? { callOutcomes } : {}),
        useBoldText
      },
      create: {
        id: "default",
        companyName, gstin, pan, address, city, state, pincode, country, email, mobile, website, logoUrl,
        signatoryUrl: signatoryUrl || null,
        signatoryName: signatoryName || "Ashish Aggarwal",
        signatoryDesignation: signatoryDesignation || "Authorized Signatory",
        bankAccountName, accountNumber, ifscCode, branch, upiId,
        nextQuotationNumber: nextQuotationNumber || "QT-1001",
        nextInvoiceNumber: nextInvoiceNumber || "INV-1001",
        themeColor: themeColor || "#4f46e5",
        fontFamily: fontFamily || "Inter",
        buttonRadius: buttonRadius || "8px",
        useBoldText,
        ...(callOutcomes ? { callOutcomes } : {})
      }
    });

    revalidatePath("/settings");
    revalidatePath("/settings/organization");
    revalidatePath("/quotations");
    revalidatePath("/orders");
    revalidatePath("/", "layout");
    return { success: true, settings: updated };
  } catch (error) {
    console.error("Failed to update company settings:", error);
    return { error: "Failed to update settings" };
  }
}
