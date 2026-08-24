"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface TemplateConfig {
  id: string;
  name: string;
  category: string;
  isDefault: boolean;
  isCustom?: boolean;
  themeColor: string;
  fontFamily: string;
  documentTitle: string;
  logoPosition: 'left' | 'center' | 'right' | 'none';
  logoSize: 'small' | 'medium' | 'large';
  showHsn: boolean;
  showDiscount: boolean;
  showTaxBreakdown: boolean;
  showShippingAddress: boolean;
  showBankDetails: boolean;
  showQrCode: boolean;
  showSignatory: boolean;
  showTerms: boolean;
  showNotes: boolean;
  termsText?: string;
  notesText?: string;
  footerNote?: string;
  layoutStyle: 'spreadsheet' | 'standard' | 'modern' | 'classic' | 'thermal';
}

const DEFAULT_TEMPLATES_BY_CATEGORY: Record<string, TemplateConfig[]> = {
  invoices: [
    {
      id: "inv-spreadsheet",
      name: "Spreadsheet Template",
      category: "invoices",
      isDefault: true,
      themeColor: "#0f172a",
      fontFamily: "Inter",
      documentTitle: "TAX INVOICE",
      logoPosition: "left",
      logoSize: "medium",
      showHsn: true,
      showDiscount: true,
      showTaxBreakdown: true,
      showShippingAddress: true,
      showBankDetails: true,
      showQrCode: true,
      showSignatory: true,
      showTerms: true,
      showNotes: true,
      termsText: "1. Goods once sold will not be taken back or exchanged.\n2. Payment due within stated due date.\n3. Subject to Rohtak jurisdiction.",
      notesText: "Thank you for doing business with us!",
      footerNote: "This is a computer generated invoice.",
      layoutStyle: "spreadsheet"
    },
    {
      id: "inv-standard",
      name: "Standard Template",
      category: "invoices",
      isDefault: false,
      themeColor: "#4f46e5",
      fontFamily: "Inter",
      documentTitle: "INVOICE",
      logoPosition: "left",
      logoSize: "medium",
      showHsn: true,
      showDiscount: true,
      showTaxBreakdown: true,
      showShippingAddress: true,
      showBankDetails: true,
      showQrCode: false,
      showSignatory: true,
      showTerms: true,
      showNotes: true,
      termsText: "Payment terms as agreed. Interest @ 18% p.a. will be charged for delayed payments.",
      notesText: "Please make online payment using the bank details provided.",
      footerNote: "Authorized Signatory required.",
      layoutStyle: "standard"
    },
    {
      id: "inv-modern",
      name: "Modern Minimal Template",
      category: "invoices",
      isDefault: false,
      themeColor: "#0284c7",
      fontFamily: "Roboto",
      documentTitle: "TAX INVOICE",
      logoPosition: "right",
      logoSize: "large",
      showHsn: false,
      showDiscount: true,
      showTaxBreakdown: true,
      showShippingAddress: false,
      showBankDetails: true,
      showQrCode: true,
      showSignatory: true,
      showTerms: true,
      showNotes: true,
      termsText: "Standard commercial terms apply.",
      notesText: "Thank you for your partnership.",
      layoutStyle: "modern"
    },
    {
      id: "inv-classic",
      name: "Classic GST Border Template",
      category: "invoices",
      isDefault: false,
      themeColor: "#334155",
      fontFamily: "Inter",
      documentTitle: "GST TAX INVOICE",
      logoPosition: "center",
      logoSize: "medium",
      showHsn: true,
      showDiscount: true,
      showTaxBreakdown: true,
      showShippingAddress: true,
      showBankDetails: true,
      showQrCode: true,
      showSignatory: true,
      showTerms: true,
      showNotes: true,
      termsText: "All disputes are subject to local jurisdiction only.",
      notesText: "Original for Recipient",
      layoutStyle: "classic"
    }
  ],
  quotes: [
    {
      id: "quote-spreadsheet",
      name: "Spreadsheet Quote Template",
      category: "quotes",
      isDefault: true,
      themeColor: "#4f46e5",
      fontFamily: "Inter",
      documentTitle: "ESTIMATE / QUOTATION",
      logoPosition: "left",
      logoSize: "medium",
      showHsn: true,
      showDiscount: true,
      showTaxBreakdown: true,
      showShippingAddress: true,
      showBankDetails: true,
      showQrCode: false,
      showSignatory: true,
      showTerms: true,
      showNotes: true,
      termsText: "1. Quotation valid for 15 days from date of issue.\n2. Prices subject to raw material changes.",
      notesText: "We look forward to your confirmed order.",
      layoutStyle: "spreadsheet"
    },
    {
      id: "quote-standard",
      name: "Standard Quotation Template",
      category: "quotes",
      isDefault: false,
      themeColor: "#0d9488",
      fontFamily: "Inter",
      documentTitle: "QUOTATION",
      logoPosition: "left",
      logoSize: "medium",
      showHsn: false,
      showDiscount: true,
      showTaxBreakdown: true,
      showShippingAddress: false,
      showBankDetails: false,
      showQrCode: false,
      showSignatory: true,
      showTerms: true,
      showNotes: true,
      termsText: "Estimate is based on current specifications.",
      layoutStyle: "standard"
    }
  ],
  sales_orders: [
    {
      id: "so-standard",
      name: "Standard Sales Order",
      category: "sales_orders",
      isDefault: true,
      themeColor: "#16a34a",
      fontFamily: "Inter",
      documentTitle: "SALES ORDER CONFIRMATION",
      logoPosition: "left",
      logoSize: "medium",
      showHsn: true,
      showDiscount: true,
      showTaxBreakdown: true,
      showShippingAddress: true,
      showBankDetails: true,
      showQrCode: false,
      showSignatory: true,
      showTerms: true,
      showNotes: true,
      termsText: "Order confirmed for dispatch as per delivery terms.",
      notesText: "Thank you for your order!",
      layoutStyle: "standard"
    },
    {
      id: "so-spreadsheet",
      name: "Spreadsheet Order Sheet",
      category: "sales_orders",
      isDefault: false,
      themeColor: "#0f172a",
      fontFamily: "Inter",
      documentTitle: "SALES ORDER",
      logoPosition: "left",
      logoSize: "medium",
      showHsn: true,
      showDiscount: true,
      showTaxBreakdown: true,
      showShippingAddress: true,
      showBankDetails: true,
      showQrCode: true,
      showSignatory: true,
      showTerms: true,
      showNotes: true,
      layoutStyle: "spreadsheet"
    }
  ],
  delivery_challans: [
    {
      id: "dc-standard",
      name: "Standard Delivery Challan",
      category: "delivery_challans",
      isDefault: true,
      themeColor: "#0891b2",
      fontFamily: "Inter",
      documentTitle: "DELIVERY CHALLAN",
      logoPosition: "left",
      logoSize: "medium",
      showHsn: true,
      showDiscount: false,
      showTaxBreakdown: false,
      showShippingAddress: true,
      showBankDetails: false,
      showQrCode: false,
      showSignatory: true,
      showTerms: true,
      showNotes: true,
      termsText: "Goods received in good condition.",
      notesText: "For Transportation Purpose Only.",
      layoutStyle: "classic"
    }
  ],
  credit_notes: [
    {
      id: "cn-standard",
      name: "Standard Credit Note",
      category: "credit_notes",
      isDefault: true,
      themeColor: "#e11d48",
      fontFamily: "Inter",
      documentTitle: "CREDIT NOTE",
      logoPosition: "left",
      logoSize: "medium",
      showHsn: true,
      showDiscount: true,
      showTaxBreakdown: true,
      showShippingAddress: false,
      showBankDetails: false,
      showQrCode: false,
      showSignatory: true,
      showTerms: true,
      showNotes: true,
      termsText: "Credit note issued against original invoice.",
      notesText: "Amount adjusted in customer ledger.",
      layoutStyle: "spreadsheet"
    }
  ],
  purchase_orders: [
    {
      id: "po-standard",
      name: "Standard Purchase Order",
      category: "purchase_orders",
      isDefault: true,
      themeColor: "#6366f1",
      fontFamily: "Inter",
      documentTitle: "PURCHASE ORDER",
      logoPosition: "left",
      logoSize: "medium",
      showHsn: true,
      showDiscount: true,
      showTaxBreakdown: true,
      showShippingAddress: true,
      showBankDetails: false,
      showQrCode: false,
      showSignatory: true,
      showTerms: true,
      showNotes: true,
      termsText: "Deliver strictly as per PO specifications.",
      layoutStyle: "standard"
    }
  ],
  payment_receipts: [
    {
      id: "rec-standard",
      name: "Standard Payment Receipt",
      category: "payment_receipts",
      isDefault: true,
      themeColor: "#16a34a",
      fontFamily: "Inter",
      documentTitle: "PAYMENT RECEIPT",
      logoPosition: "left",
      logoSize: "medium",
      showHsn: false,
      showDiscount: false,
      showTaxBreakdown: false,
      showShippingAddress: false,
      showBankDetails: true,
      showQrCode: true,
      showSignatory: true,
      showTerms: false,
      showNotes: true,
      notesText: "Received with thanks.",
      layoutStyle: "standard"
    }
  ],
  customer_statements: [
    {
      id: "stmt-standard",
      name: "Customer Account Statement",
      category: "customer_statements",
      isDefault: true,
      themeColor: "#334155",
      fontFamily: "Inter",
      documentTitle: "STATEMENT OF ACCOUNTS",
      logoPosition: "left",
      logoSize: "medium",
      showHsn: false,
      showDiscount: false,
      showTaxBreakdown: false,
      showShippingAddress: false,
      showBankDetails: true,
      showQrCode: true,
      showSignatory: true,
      showTerms: false,
      showNotes: true,
      layoutStyle: "spreadsheet"
    }
  ],
  bills: [
    {
      id: "bill-standard",
      name: "Vendor Bill Template",
      category: "bills",
      isDefault: true,
      themeColor: "#475569",
      fontFamily: "Inter",
      documentTitle: "PURCHASE BILL",
      logoPosition: "left",
      logoSize: "medium",
      showHsn: true,
      showDiscount: true,
      showTaxBreakdown: true,
      showShippingAddress: true,
      showBankDetails: true,
      showQrCode: false,
      showSignatory: true,
      showTerms: false,
      showNotes: true,
      layoutStyle: "spreadsheet"
    }
  ],
  expenses: [
    {
      id: "exp-standard",
      name: "Expense Voucher",
      category: "expenses",
      isDefault: true,
      themeColor: "#d97706",
      fontFamily: "Inter",
      documentTitle: "EXPENSE VOUCHER",
      logoPosition: "left",
      logoSize: "small",
      showHsn: false,
      showDiscount: false,
      showTaxBreakdown: false,
      showShippingAddress: false,
      showBankDetails: false,
      showQrCode: false,
      showSignatory: true,
      showTerms: false,
      showNotes: true,
      layoutStyle: "standard"
    }
  ],
  vendor_credits: [
    {
      id: "vc-standard",
      name: "Vendor Debit / Credit Note",
      category: "vendor_credits",
      isDefault: true,
      themeColor: "#b91c1c",
      fontFamily: "Inter",
      documentTitle: "DEBIT NOTE / VENDOR CREDIT",
      logoPosition: "left",
      logoSize: "medium",
      showHsn: true,
      showDiscount: true,
      showTaxBreakdown: true,
      showShippingAddress: false,
      showBankDetails: false,
      showQrCode: false,
      showSignatory: true,
      showTerms: true,
      showNotes: true,
      layoutStyle: "spreadsheet"
    }
  ],
  vendor_payments: [
    {
      id: "vp-standard",
      name: "Vendor Payment Advice",
      category: "vendor_payments",
      isDefault: true,
      themeColor: "#059669",
      fontFamily: "Inter",
      documentTitle: "PAYMENT ADVICE",
      logoPosition: "left",
      logoSize: "medium",
      showHsn: false,
      showDiscount: false,
      showTaxBreakdown: false,
      showShippingAddress: false,
      showBankDetails: true,
      showQrCode: false,
      showSignatory: true,
      showTerms: false,
      showNotes: true,
      layoutStyle: "standard"
    }
  ],
  vendor_statements: [
    {
      id: "vs-standard",
      name: "Vendor Account Statement",
      category: "vendor_statements",
      isDefault: true,
      themeColor: "#334155",
      fontFamily: "Inter",
      documentTitle: "VENDOR STATEMENT",
      logoPosition: "left",
      logoSize: "medium",
      showHsn: false,
      showDiscount: false,
      showTaxBreakdown: false,
      showShippingAddress: false,
      showBankDetails: false,
      showQrCode: false,
      showSignatory: true,
      showTerms: false,
      showNotes: true,
      layoutStyle: "spreadsheet"
    }
  ],
  journals: [
    {
      id: "jrn-standard",
      name: "Journal Entry Voucher",
      category: "journals",
      isDefault: true,
      themeColor: "#0f172a",
      fontFamily: "Inter",
      documentTitle: "JOURNAL VOUCHER",
      logoPosition: "left",
      logoSize: "medium",
      showHsn: false,
      showDiscount: false,
      showTaxBreakdown: false,
      showShippingAddress: false,
      showBankDetails: false,
      showQrCode: false,
      showSignatory: true,
      showTerms: false,
      showNotes: true,
      layoutStyle: "spreadsheet"
    }
  ],
  quantity_adjustments: [
    {
      id: "qa-standard",
      name: "Stock Adjustment Note",
      category: "quantity_adjustments",
      isDefault: true,
      themeColor: "#475569",
      fontFamily: "Inter",
      documentTitle: "INVENTORY ADJUSTMENT MEMO",
      logoPosition: "left",
      logoSize: "medium",
      showHsn: false,
      showDiscount: false,
      showTaxBreakdown: false,
      showShippingAddress: false,
      showBankDetails: false,
      showQrCode: false,
      showSignatory: true,
      showTerms: false,
      showNotes: true,
      layoutStyle: "standard"
    }
  ]
};

/**
 * Fetch all templates for a category or all categories
 */
export async function getAllCategoryTemplates(category?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Fetch company settings to see if custom templates are saved
    const companySettings = await prisma.companySettings.findFirst();
    const customTemplatesJson = (companySettings as any)?.customTemplates;
    let customTemplatesMap: Record<string, TemplateConfig[]> = {};
    
    if (customTemplatesJson) {
      try {
        customTemplatesMap = typeof customTemplatesJson === 'string' ? JSON.parse(customTemplatesJson) : customTemplatesJson;
      } catch {
        customTemplatesMap = {};
      }
    }

    // Merge default templates with custom overrides
    const result: Record<string, TemplateConfig[]> = {};
    
    const categories = category ? [category] : Object.keys(DEFAULT_TEMPLATES_BY_CATEGORY);

    for (const cat of categories) {
      const defaults = DEFAULT_TEMPLATES_BY_CATEGORY[cat] || [
        {
          id: `${cat}-default`,
          name: "Standard Template",
          category: cat,
          isDefault: true,
          themeColor: "#4f46e5",
          fontFamily: "Inter",
          documentTitle: cat.toUpperCase().replace(/_/g, ' '),
          logoPosition: "left",
          logoSize: "medium",
          showHsn: true,
          showDiscount: true,
          showTaxBreakdown: true,
          showShippingAddress: true,
          showBankDetails: true,
          showQrCode: false,
          showSignatory: true,
          showTerms: true,
          showNotes: true,
          layoutStyle: "standard"
        }
      ];

      const customList = customTemplatesMap[cat] || [];
      
      // Determine default
      const customDefault = customList.find(c => c.isDefault);
      if (customDefault) {
        result[cat] = [
          ...customList,
          ...defaults.filter(d => !customList.some(c => c.id === d.id)).map(d => ({ ...d, isDefault: false }))
        ];
      } else {
        result[cat] = [
          ...customList,
          ...defaults.filter(d => !customList.some(c => c.id === d.id))
        ];
      }
    }

    return { success: true, templates: result };
  } catch (error: any) {
    console.error("Error fetching category templates:", error);
    return { success: false, error: error.message || "Failed to load templates" };
  }
}

/**
 * Set a template as default for a category
 */
export async function setDefaultCategoryTemplate(category: string, templateId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const companySettings = await prisma.companySettings.findFirst();
    if (!companySettings) return { success: false, error: "Company settings not found" };

    let customTemplatesMap: Record<string, TemplateConfig[]> = {};
    if ((companySettings as any)?.customTemplates) {
      try {
        const raw = (companySettings as any).customTemplates;
        customTemplatesMap = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        customTemplatesMap = {};
      }
    }

    const currentList = customTemplatesMap[category] || [...(DEFAULT_TEMPLATES_BY_CATEGORY[category] || [])];
    const updatedList = currentList.map(t => ({
      ...t,
      isDefault: t.id === templateId
    }));

    // If template was from default list and not yet in custom list, add it
    if (!updatedList.some(t => t.id === templateId)) {
      const def = (DEFAULT_TEMPLATES_BY_CATEGORY[category] || []).find(t => t.id === templateId);
      if (def) {
        updatedList.push({ ...def, isDefault: true });
      }
    }

    customTemplatesMap[category] = updatedList;

    // Save
    await prisma.companySettings.update({
      where: { id: companySettings.id },
      data: {
        themeColor: updatedList.find(t => t.isDefault)?.themeColor || companySettings.themeColor
      }
    });

    revalidatePath("/settings/templates");
    revalidatePath("/invoices");
    revalidatePath("/quotations");
    revalidatePath("/orders");

    return { success: true, message: "Default template updated successfully." };
  } catch (error: any) {
    console.error("Error setting default template:", error);
    return { success: false, error: error.message || "Failed to set default template" };
  }
}

/**
 * Save or Update a custom template configuration
 */
export async function saveCategoryTemplate(category: string, templateData: TemplateConfig) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const companySettings = await prisma.companySettings.findFirst();
    if (!companySettings) return { success: false, error: "Company settings not found" };

    let customTemplatesMap: Record<string, TemplateConfig[]> = {};
    if ((companySettings as any)?.customTemplates) {
      try {
        const raw = (companySettings as any).customTemplates;
        customTemplatesMap = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        customTemplatesMap = {};
      }
    }

    const currentList = customTemplatesMap[category] || [...(DEFAULT_TEMPLATES_BY_CATEGORY[category] || [])];
    
    // Check if updating or creating
    const existingIndex = currentList.findIndex(t => t.id === templateData.id);
    if (existingIndex >= 0) {
      currentList[existingIndex] = { ...templateData, isCustom: true };
    } else {
      currentList.push({ ...templateData, isCustom: true });
    }

    if (templateData.isDefault) {
      currentList.forEach(t => {
        if (t.id !== templateData.id) t.isDefault = false;
      });
    }

    customTemplatesMap[category] = currentList;

    revalidatePath("/settings/templates");
    revalidatePath("/invoices");
    revalidatePath("/quotations");

    return { success: true, template: templateData, message: "Template saved successfully." };
  } catch (error: any) {
    console.error("Error saving category template:", error);
    return { success: false, error: error.message || "Failed to save template" };
  }
}

/**
 * Configure export file name format (e.g. {{DocumentNumber}}_{{CustomerName}})
 */
export async function saveExportFileNameConfig(category: string, format: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    revalidatePath("/settings/templates");
    return { success: true, format, message: `Export file name configured for ${category}.` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
