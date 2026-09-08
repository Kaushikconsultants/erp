"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export interface ImportValidationResult {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  previewRows: Array<Record<string, any> & { _isValid: boolean; _errors: string[] }>;
}

export interface BulkImportPayload {
  entityType: 'CUSTOMERS' | 'LEADS' | 'VENDORS' | 'PRODUCTS' | 'LEDGERS';
  rows: Record<string, any>[];
  skipDuplicates?: boolean;
}

/**
 * Extract data from public Google Sheet URL via CSV export endpoint
 */
export async function fetchGoogleSheetData(sheetUrl: string): Promise<{
  success: boolean;
  headers?: string[];
  rows?: Record<string, any>[];
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!sheetUrl || !sheetUrl.includes("docs.google.com/spreadsheets")) {
      return { success: false, error: "Please provide a valid Google Sheets URL (e.g., https://docs.google.com/spreadsheets/d/...)" };
    }

    // Extract spreadsheet ID
    const matchId = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!matchId || !matchId[1]) {
      return { success: false, error: "Could not locate Google Spreadsheet ID in the link." };
    }
    const spreadsheetId = matchId[1];

    // Extract gid (sheet tab) if specified, default to 0
    let gid = "0";
    const matchGid = sheetUrl.match(/[#&?]gid=([0-9]+)/);
    if (matchGid && matchGid[1]) {
      gid = matchGid[1];
    }

    const csvExportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    
    const res = await fetch(csvExportUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      if (res.status === 404) {
        return { success: false, error: "Google Sheet not found. Ensure the Sheet ID is correct." };
      }
      return { 
        success: false, 
        error: "Cannot access Google Sheet. Please ensure General Access is set to 'Anyone with the link can view'." 
      };
    }

    const csvText = await res.text();
    if (!csvText || csvText.trim().length === 0) {
      return { success: false, error: "Google Sheet appears to be empty." };
    }

    // Parse CSV
    const Papa = (await import('papaparse')).default;
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
      return { success: false, error: "Failed to parse Google Sheet: " + parsed.errors[0].message };
    }

    const rows = (parsed.data as Record<string, any>[]).filter(r => Object.values(r).some(v => v !== null && v !== ''));
    if (rows.length === 0) {
      return { success: false, error: "Google Sheet contains no data rows." };
    }

    const headers = Object.keys(rows[0]);

    return {
      success: true,
      headers,
      rows
    };
  } catch (err: any) {
    console.error("Error fetching Google Sheet:", err);
    return { success: false, error: "Failed to sync Google Sheet: " + (err.message || "Network error") };
  }
}

/**
 * Validate imported data rows prior to database insertion
 */
export async function validateImportData(
  entityType: 'CUSTOMERS' | 'LEADS' | 'VENDORS' | 'PRODUCTS' | 'LEDGERS',
  rawRows: Record<string, any>[]
): Promise<{ success: boolean; data?: ImportValidationResult; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized access" };
    const orgId = await getTenantOrgId();

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return { success: false, error: "No data rows provided for validation" };
    }

    const previewRows: Array<Record<string, any> & { _isValid: boolean; _errors: string[] }> = [];
    let validCount = 0;
    let invalidCount = 0;

    // Fetch existing identifiers for duplicate detection
    let existingSkus = new Set<string>();
    let existingMobiles = new Set<string>();
    let existingLeadMobiles = new Set<string>();

    if (entityType === 'PRODUCTS') {
      const prods = await prisma.product.findMany({
        where: { organizationId: orgId },
        select: { sku: true }
      });
      existingSkus = new Set(prods.map(p => p.sku?.toLowerCase().trim() || '').filter(Boolean));
    } else if (entityType === 'CUSTOMERS' || entityType === 'LEADS') {
      const [custs, leads] = await Promise.all([
        prisma.customer.findMany({
          where: { organizationId: orgId },
          select: { mobile: true }
        }),
        prisma.lead.findMany({
          where: { organizationId: orgId },
          select: { whatsappNumber: true }
        })
      ]);
      existingMobiles = new Set(custs.map(c => c.mobile.replace(/[^0-9]/g, '').slice(-10)).filter(Boolean));
      existingLeadMobiles = new Set(leads.map(l => l.whatsappNumber.replace(/[^0-9]/g, '').slice(-10)).filter(Boolean));
    }

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const errors: string[] = [];

      if (entityType === 'CUSTOMERS') {
        const name = String(row.businessName || row.name || row.customerName || '').trim();
        const rawMobile = String(row.mobile || row.phone || row.whatsapp || '').replace(/[^0-9]/g, '');
        const mobileLast10 = rawMobile.slice(-10);

        if (!name) errors.push("Customer or Business name is required");
        if (!rawMobile || rawMobile.length < 10) errors.push("Valid 10-digit mobile number is required");
        else if (existingMobiles.has(mobileLast10)) errors.push(`Mobile ${mobileLast10} already exists in Customers`);
        else if (existingLeadMobiles.has(mobileLast10)) errors.push(`Mobile ${mobileLast10} already exists as a Lead (will be converted)`);

        const gstin = String(row.gstNumber || row.gstin || '').trim();
        if (gstin && gstin.length !== 15) errors.push("GSTIN must be 15 alphanumeric characters");

      } else if (entityType === 'LEADS') {
        const name = String(row.name || row.leadName || row.contactPerson || '').trim();
        const rawMobile = String(row.whatsappNumber || row.mobile || row.phone || '').replace(/[^0-9]/g, '');
        const mobileLast10 = rawMobile.slice(-10);

        if (!name) errors.push("Lead contact name is required");
        if (!rawMobile || rawMobile.length < 10) errors.push("Valid 10-digit phone / WhatsApp number is required");
        else if (existingMobiles.has(mobileLast10)) errors.push(`Phone ${mobileLast10} already exists as an active Customer`);
        else if (existingLeadMobiles.has(mobileLast10)) errors.push(`Lead with phone ${mobileLast10} already exists`);

      } else if (entityType === 'VENDORS') {
        const companyName = String(row.companyName || row.name || row.vendorName || '').trim();
        if (!companyName) errors.push("Vendor company name is required");

        const gstin = String(row.gstNumber || row.gstin || '').trim();
        if (gstin && gstin.length !== 15) errors.push("GSTIN must be 15 alphanumeric characters");

      } else if (entityType === 'PRODUCTS') {
        const name = String(row.name || row.productName || row.item || '').trim();
        const sku = String(row.sku || row.code || '').trim();
        const sellingPrice = Number(row.sellingPrice || row.price || row.rate || 0);

        if (!name) errors.push("Product name is required");
        if (sellingPrice < 0 || isNaN(sellingPrice)) errors.push("Valid selling price is required");
        if (sku && existingSkus.has(sku.toLowerCase())) errors.push(`SKU ${sku} already exists in database`);

      } else if (entityType === 'LEDGERS') {
        const name = String(row.name || row.ledgerName || '').trim();
        const group = String(row.groupName || row.group || row.accountGroup || '').trim();
        if (!name) errors.push("Ledger name is required");
        if (!group) errors.push("Account group is required (e.g., Sundry Debtors, Direct Expenses)");
      }

      const isValid = errors.length === 0;
      if (isValid) validCount++;
      else invalidCount++;

      previewRows.push({
        ...row,
        _isValid: isValid,
        _errors: errors
      });
    }

    return {
      success: true,
      data: {
        totalRows: rawRows.length,
        validCount,
        invalidCount,
        previewRows
      }
    };
  } catch (err: any) {
    console.error("Error validating import rows:", err);
    return { success: false, error: err.message || "Failed to validate import dataset" };
  }
}

/**
 * Bulk import validated rows into the database
 */
export async function executeBulkImport(payload: BulkImportPayload) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized access" };
    const orgId = await getTenantOrgId();

    const { entityType, rows, skipDuplicates = true } = payload;
    if (!rows || rows.length === 0) {
      return { success: false, error: "No rows provided for import" };
    }

    let insertedCount = 0;
    let skippedCount = 0;
    const errorsList: string[] = [];

    if (entityType === 'CUSTOMERS') {
      for (const row of rows) {
        try {
          const businessName = String(row.businessName || row.name || row.customerName || '').trim();
          const contactPerson = String(row.contactPerson || businessName).trim();
          const mobile = String(row.mobile || row.phone || '').replace(/[^0-9]/g, '');

          if (!businessName || !mobile) {
            skippedCount++;
            continue;
          }

          const existing = await prisma.customer.findFirst({
            where: { organizationId: orgId, mobile }
          });

          if (existing) {
            if (skipDuplicates) {
              skippedCount++;
              continue;
            }
          }

          await prisma.customer.create({
            data: {
              organizationId: orgId,
              businessName,
              contactPerson,
              mobile,
              whatsappNumber: String(row.whatsappNumber || mobile).trim(),
              email: row.email ? String(row.email).trim().toLowerCase() : null,
              gstNumber: row.gstNumber || row.gstin ? String(row.gstNumber || row.gstin).toUpperCase().trim() : null,
              pan: row.pan ? String(row.pan).toUpperCase().trim() : null,
              billingAddress: row.billingAddress || row.address ? String(row.billingAddress || row.address).trim() : null,
              shippingAddress: row.shippingAddress ? String(row.shippingAddress).trim() : null,
              city: row.city ? String(row.city).trim() : null,
              state: row.state ? String(row.state).trim() : "Haryana",
              pincode: row.pincode ? String(row.pincode).trim() : null,
              openingBalance: Number(row.openingBalance || 0),
              openingBalanceType: String(row.openingBalanceType || 'DEBIT').toUpperCase(),
              creditLimit: Number(row.creditLimit || 0),
              creditDays: Number(row.creditDays || 30),
              creditHold: Boolean(row.creditHold === true || String(row.creditHold).toLowerCase() === 'true'),
              customerType: row.customerType || "Wholesaler",
              status: "Active"
            }
          });
          insertedCount++;
        } catch (e: any) {
          errorsList.push(`Row ${row.businessName || 'item'}: ${e.message}`);
          skippedCount++;
        }
      }
      revalidatePath("/customers");
    } else if (entityType === 'LEADS') {
      let defaultSalespersonId: string | null = null;
      const user = session?.user as any;
      if (user?.id) {
        const emp = await prisma.employee.findUnique({ where: { userId: user.id } });
        if (emp) defaultSalespersonId = emp.id;
      }

      for (const row of rows) {
        try {
          const name = String(row.name || row.leadName || row.contactPerson || '').trim();
          const rawMobile = String(row.whatsappNumber || row.mobile || row.phone || '').replace(/[^0-9]/g, '');
          const whatsappNumber = rawMobile ? (rawMobile.startsWith('91') && rawMobile.length === 12 ? '+' + rawMobile : rawMobile.length === 10 ? '+91' + rawMobile : '+' + rawMobile) : '';

          if (!name || !whatsappNumber) {
            skippedCount++;
            continue;
          }

          if (skipDuplicates) {
            const existing = await prisma.lead.findFirst({
              where: { organizationId: orgId, whatsappNumber }
            });
            if (existing) {
              skippedCount++;
              continue;
            }
          }

          await prisma.lead.create({
            data: {
              organizationId: orgId,
              name,
              whatsappNumber,
              shopName: row.shopName ? String(row.shopName).trim() : null,
              status: row.status || "New",
              assignedSalespersonId: row.assignedSalespersonId || defaultSalespersonId
            }
          });
          insertedCount++;
        } catch (e: any) {
          errorsList.push(`Lead ${row.name || 'row'}: ${e.message}`);
          skippedCount++;
        }
      }
      revalidatePath("/leads");
      revalidatePath("/pipeline");
    } else if (entityType === 'VENDORS') {
      for (const row of rows) {
        try {
          const companyName = String(row.companyName || row.name || '').trim();
          if (!companyName) {
            skippedCount++;
            continue;
          }

          const email = row.email ? String(row.email).trim().toLowerCase() : null;
          if (email) {
            const existing = await prisma.vendor.findFirst({
              where: { organizationId: orgId, email }
            });
            if (existing && skipDuplicates) {
              skippedCount++;
              continue;
            }
          }

          await prisma.vendor.create({
            data: {
              organizationId: orgId,
              companyName,
              contactPerson: row.contactPerson ? String(row.contactPerson).trim() : null,
              email: email || undefined,
              mobile: row.mobile ? String(row.mobile).replace(/[^0-9]/g, '') : null,
              gstNumber: row.gstNumber || row.gstin ? String(row.gstNumber || row.gstin).toUpperCase().trim() : null,
              pan: row.pan ? String(row.pan).toUpperCase().trim() : null,
              address: row.address ? String(row.address).trim() : null,
              city: row.city ? String(row.city).trim() : null,
              state: row.state ? String(row.state).trim() : null,
              pincode: row.pincode ? String(row.pincode).trim() : null,
              paymentTerms: row.paymentTerms ? String(row.paymentTerms).trim() : "Net 30",
              status: "Active"
            }
          });
          insertedCount++;
        } catch (e: any) {
          errorsList.push(`Row ${row.companyName || 'vendor'}: ${e.message}`);
          skippedCount++;
        }
      }
      revalidatePath("/vendors");
    } else if (entityType === 'PRODUCTS') {
      for (const row of rows) {
        try {
          const name = String(row.name || row.productName || '').trim();
          if (!name) {
            skippedCount++;
            continue;
          }

          const sku = row.sku ? String(row.sku).trim() : null;
          if (sku) {
            const existing = await prisma.product.findFirst({
              where: { organizationId: orgId, sku }
            });
            if (existing && skipDuplicates) {
              skippedCount++;
              continue;
            }
          }

          const category = String(row.category || 'General').trim();
          const purchasePrice = Number(row.purchasePrice || row.costPrice || 0);
          const sellingPrice = Number(row.sellingPrice || row.price || purchasePrice * 1.2 || 0);
          const mrp = Number(row.mrp || sellingPrice * 1.2 || 0);
          const stockQuantity = parseInt(String(row.stockQuantity || row.openingStock || 0), 10);
          const minimumStock = parseInt(String(row.minimumStock || 10), 10);

          await prisma.product.create({
            data: {
              organizationId: orgId,
              name,
              sku: sku || undefined,
              articleNumber: row.articleNumber ? String(row.articleNumber).trim() : undefined,
              hsnCode: row.hsnCode ? String(row.hsnCode).trim() : "6109",
              category,
              subCategory: row.subCategory ? String(row.subCategory).trim() : null,
              fabric: row.fabric ? String(row.fabric).trim() : null,
              color: row.color ? String(row.color).trim() : null,
              size: row.size ? String(row.size).trim() : null,
              purchasePrice,
              sellingPrice,
              mrp,
              stockQuantity,
              minimumStock,
              status: "Active",
              description: row.description ? String(row.description).trim() : null
            }
          });
          insertedCount++;
        } catch (e: any) {
          errorsList.push(`Product ${row.name || 'item'}: ${e.message}`);
          skippedCount++;
        }
      }
      revalidatePath("/products");
    } else if (entityType === 'LEDGERS') {
      for (const row of rows) {
        try {
          const name = String(row.name || row.ledgerName || '').trim();
          const groupName = String(row.groupName || row.group || '').trim();
          if (!name || !groupName) {
            skippedCount++;
            continue;
          }

          let accountGroup = await prisma.accountGroup.findFirst({
            where: { organizationId: orgId, name: { equals: groupName, mode: 'insensitive' } }
          });

          if (!accountGroup) {
            accountGroup = await prisma.accountGroup.findFirst({
              where: { name: { equals: groupName, mode: 'insensitive' } }
            });
          }

          if (!accountGroup) {
            accountGroup = await prisma.accountGroup.create({
              data: {
                organizationId: orgId,
                name: groupName,
                nature: (row.nature || 'ASSET').toUpperCase()
              }
            });
          }

          const existingLedger = await prisma.ledgerAccount.findFirst({
            where: { organizationId: orgId, name }
          });

          if (existingLedger && skipDuplicates) {
            skippedCount++;
            continue;
          }

          const openingBalance = Number(row.openingBalance || 0);
          const openingType = String(row.openingType || 'DEBIT').toUpperCase();

          await prisma.ledgerAccount.create({
            data: {
              organizationId: orgId,
              name,
              code: row.code ? String(row.code).trim() : undefined,
              accountGroupId: accountGroup.id,
              partyType: row.partyType ? String(row.partyType).toUpperCase() : "GENERAL",
              openingBalance,
              openingType,
              currentBalance: openingType === 'DEBIT' ? openingBalance : -openingBalance,
              bankAccountNumber: row.bankAccountNumber ? String(row.bankAccountNumber).trim() : null,
              ifscCode: row.ifscCode ? String(row.ifscCode).trim() : null,
              gstin: row.gstin ? String(row.gstin).toUpperCase().trim() : null,
              pan: row.pan ? String(row.pan).toUpperCase().trim() : null,
              status: "Active"
            }
          });
          insertedCount++;
        } catch (e: any) {
          errorsList.push(`Ledger ${row.name || 'item'}: ${e.message}`);
          skippedCount++;
        }
      }
      revalidatePath("/accounting");
    }

    return {
      success: true,
      message: `Successfully imported ${insertedCount} ${entityType.toLowerCase()} (${skippedCount} skipped/duplicates).`,
      insertedCount,
      skippedCount,
      errors: errorsList
    };
  } catch (err: any) {
    console.error("Error executing bulk import:", err);
    return { success: false, error: err.message || "Failed to execute bulk import" };
  }
}
