"use server";

import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";
import { getTenantOrgId } from "@/lib/tenant";

const apiKey = process.env.GEMINI_API_KEY || "00000000000000000000000000000000000000000000000000000";
const ai = new GoogleGenAI({ apiKey });

export interface ExtractedBillItem {
  matchedProductId?: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  gstRate: number;
  taxAmount: number;
  total: number;
}

export interface ExtractedBillData {
  matchedVendorId?: string;
  vendorName: string;
  vendorGstNumber?: string;
  vendorPhone?: string;
  vendorAddress?: string;
  vendorCity?: string;
  vendorState?: string;
  vendorPincode?: string;
  vendorBillNumber: string;
  billDate: string;
  dueDate: string;
  paymentTerms: string;
  items: ExtractedBillItem[];
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
  notes?: string;
  confidenceScore: number;
  isHandwritten: boolean;
  isDuplicate?: boolean;
  existingBill?: {
    id: string;
    billNumber: string;
    billDate: string;
    totalAmount: number;
    status: string;
    vendorName: string;
  };
}

export async function scanPurchaseBillWithAI(
  base64Data: string,
  mimeType: string,
  fileName?: string
): Promise<{ success: boolean; data?: ExtractedBillData; error?: string; rawText?: string }> {
  try {
    const organizationId = await getTenantOrgId();

    // Fetch existing vendors and products to perform intelligent fuzzy matching
    const [existingVendors, existingProducts] = await Promise.all([
      prisma.vendor.findMany({
        where: { organizationId },
        select: { id: true, companyName: true, gstNumber: true, mobile: true, address: true, city: true, state: true, pincode: true, paymentTerms: true }
      }),
      prisma.product.findMany({
        where: { organizationId },
        select: { id: true, name: true, sku: true, purchasePrice: true }
      })
    ]);

    // Clean base64 data prefix if present (e.g. data:image/png;base64,...)
    let cleanBase64 = base64Data;
    if (cleanBase64.includes(",")) {
      cleanBase64 = cleanBase64.split(",")[1];
    }
    cleanBase64 = cleanBase64.replace(/\s+/g, "");

    const vendorContext = existingVendors.map(v => 
      `- ID: "${v.id}" | Name: "${v.companyName}" | GSTIN: "${v.gstNumber || 'N/A'}" | Phone: "${v.mobile || 'N/A'}" | Address: "${v.address || 'N/A'}" | City: "${v.city || 'N/A'}" | State: "${v.state || 'N/A'}"`
    ).join("\n");

    const productContext = existingProducts.slice(0, 100).map(p => 
      `- ID: "${p.id}" | Name: "${p.name}" | SKU: "${p.sku || 'N/A'}"`
    ).join("\n");

    const prompt = `
You are an expert Document Intelligence and OCR AI specializing in Indian Garment, Textile & Apparel B2B Supplier Invoices, Cash/Credit Memos, Hand-written Mandi Slips, and Printed GST Tax Invoices.

Analyze the uploaded document image/PDF very carefully. Extract the EXACT details from the paper/document without hallucinating.

### DATABASE VENDORS:
${vendorContext || "No existing vendors."}

### DATABASE PRODUCTS:
${productContext || "No existing products."}

### CRITICAL EXTRACTION GUIDELINES:
1. **SUPPLIER / VENDOR (The Seller) & COMPLETE ADDRESS**:
   - Identify the top header/letterhead/stamp of the SELLER (e.g. "APS SPORTS INDIA", "Shree Ganesh Textiles", etc.).
   - Extract vendorName (Exact full business name).
   - Extract vendorGstNumber (15-character GSTIN e.g. "06ABJHS2211P1ZV").
   - Extract vendorPhone (e.g. "9416657744", "01262-255000").
   - **VERY IMPORTANT - VENDOR ADDRESS**: Extract the complete physical address printed on the bill/memo header (e.g. "Laxmi Market, Nai Godam Road, Rohtak - 124001, Haryana").
     - vendorAddress: Street address, shop/plot number, market/road name.
     - vendorCity: City or town (e.g. "Rohtak", "Ludhiana", "Surat", "Delhi", "Tirupur", "Ahmedabad", "Jaipur").
     - vendorState: State name (e.g. "Haryana", "Punjab", "Gujarat", "Delhi", "Tamil Nadu", "Rajasthan").
     - vendorPincode: 6-digit postal code (e.g. "124001", "141008", "395002").
   - NOTE: The party listed under "To M/s", "Buyer", or "Billed To" (e.g. "Espon Clothing Pvt Ltd") is the BUYER, NOT the Vendor!
   - If this seller matches any of the DATABASE VENDORS above (by GSTIN or similar company name), populate 'matchedVendorId'. Otherwise set 'matchedVendorId' to null.

2. **BILL NUMBER & DATES**:
   - Extract the Bill No. / Invoice No. / Memo No. (e.g., "181", "APS-181", "INV-1024"). Look in the top right or memo header.
   - Extract the Bill Date. Convert Indian handwritten date formats (e.g. "30-5-26" or "30/05/2026") into valid ISO format "YYYY-MM-DD" (e.g. "2026-05-30").
   - Due Date: Set according to payment terms (e.g. 30 days after Bill Date).
   - Payment Terms: e.g. "Net 30 Days", "Due on Receipt", etc.

3. **LINE ITEMS**:
   - Read every item row from the goods description table:
     - description: Item name or fabric description (e.g. "Nikkar Jali wali", "Sports Shorts", "Trackpant Fabric", etc.).
     - hsnCode: 4 to 8 digit HSN/SAC code (e.g. "6107", "6109", "6203", "5407"). If missing, infer appropriate 4-digit apparel HSN.
     - quantity: Numeric quantity (e.g. 155, 240, 12).
     - unit: Unit of measurement ('pcs', 'mtr', 'kg', 'rolls', 'sets', etc.). Default to 'pcs' for garments.
     - rate: Price per unit in INR (e.g. 137).
     - gstRate: Tax rate percentage for this row (e.g. 5, 12, 18). If 2.5% CGST + 2.5% SGST is mentioned at the bottom, the gstRate is 5.
     - taxAmount: Calculated GST amount for this line (quantity * rate * (gstRate / 100)).
     - total: Total line amount including GST.
     - matchedProductId: If this product matches one in the DATABASE PRODUCTS list, include its ID.

4. **FINANCIAL TAX SUMMARY**:
   - subtotal: Total amount before tax (taxable value, e.g. 21235).
   - cgstAmount: CGST tax amount (e.g. 530.87).
   - sgstAmount: SGST tax amount (e.g. 530.87).
   - igstAmount: IGST tax amount (if interstate).
   - totalTax: Total tax sum (e.g. 1061.74).
   - totalAmount: Final gross invoice total (including round off, e.g. 22297).
   - isHandwritten: true if any handwritten text or signature is present, false if fully computer printed.
   - confidenceScore: 0 to 100 based on legibility.

Return ONLY valid JSON matching this schema:
{
  "matchedVendorId": string or null,
  "vendorName": string,
  "vendorGstNumber": string,
  "vendorPhone": string,
  "vendorAddress": string,
  "vendorCity": string,
  "vendorState": string,
  "vendorPincode": string,
  "vendorBillNumber": string,
  "billDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "paymentTerms": string,
  "items": [
    {
      "matchedProductId": string or null,
      "description": string,
      "hsnCode": string,
      "quantity": number,
      "unit": string,
      "rate": number,
      "gstRate": number,
      "taxAmount": number,
      "total": number
    }
  ],
  "subtotal": number,
  "cgstAmount": number,
  "sgstAmount": number,
  "igstAmount": number,
  "totalTax": number,
  "totalAmount": number,
  "notes": string,
  "confidenceScore": number,
  "isHandwritten": boolean
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType || "image/jpeg"
          }
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const parsed: ExtractedBillData = JSON.parse(text);

    // Secondary Fuzzy Match Verification for Vendor if not matched by LLM
    if (!parsed.matchedVendorId && parsed.vendorName) {
      const vName = parsed.vendorName.toLowerCase().trim();
      const matched = existingVendors.find(v => {
        const dbName = v.companyName.toLowerCase().trim();
        return (
          dbName === vName ||
          dbName.includes(vName) ||
          vName.includes(dbName) ||
          (parsed.vendorGstNumber && v.gstNumber && v.gstNumber.trim().toUpperCase() === parsed.vendorGstNumber.trim().toUpperCase())
        );
      });
      if (matched) {
        parsed.matchedVendorId = matched.id;
      }
    }

    // Default item fallback if empty
    if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      parsed.items = [
        {
          description: "Garment Purchase",
          hsnCode: "6109",
          quantity: 1,
          unit: "pcs",
          rate: parsed.totalAmount || 0,
          gstRate: 5,
          taxAmount: 0,
          total: parsed.totalAmount || 0
        }
      ];
    }

    // DUPLICATE BILL CHECK: Verify if this bill already exists in the database
    if (parsed.vendorBillNumber) {
      const cleanBillNo = parsed.vendorBillNumber.trim();
      const duplicate = await prisma.bill.findFirst({
        where: {
          organizationId,
          OR: [
            ...(parsed.matchedVendorId ? [{ vendorId: parsed.matchedVendorId, vendorBillNumber: { equals: cleanBillNo } }] : []),
            { 
              vendorBillNumber: { equals: cleanBillNo },
              vendor: { companyName: { contains: parsed.vendorName?.trim() || '___' } }
            }
          ]
        },
        include: {
          vendor: { select: { companyName: true } }
        }
      });

      if (duplicate) {
        parsed.isDuplicate = true;
        parsed.existingBill = {
          id: duplicate.id,
          billNumber: duplicate.billNumber,
          billDate: duplicate.billDate.toISOString().split("T")[0],
          totalAmount: duplicate.totalAmount,
          status: duplicate.status,
          vendorName: duplicate.vendor?.companyName || parsed.vendorName
        };
      }
    }

    return { success: true, data: parsed, rawText: text };
  } catch (error: any) {
    console.error("AI Bill Scanner Error:", error);
    return { success: false, error: error.message || "Failed to scan document with AI." };
  }
}
