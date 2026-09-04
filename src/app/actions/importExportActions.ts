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
  entityType: 'CUSTOMERS' | 'VENDORS' | 'PRODUCTS' | 'LEDGERS';
  rows: Record<string, any>[];
  skipDuplicates?: boolean;
}

/**
 * Validate imported data rows prior to database insertion
 */
export async function validateImportData(
  entityType: 'CUSTOMERS' | 'VENDORS' | 'PRODUCTS' | 'LEDGERS',
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

    if (entityType === 'PRODUCTS') {
      const prods = await prisma.product.findMany({
        where: { organizationId: orgId },
        select: { sku: true }
      });
      existingSkus = new Set(prods.map(p => p.sku?.toLowerCase().trim() || '').filter(Boolean));
    } else if (entityType === 'CUSTOMERS') {
      const custs = await prisma.customer.findMany({
        where: { organizationId: orgId },
        select: { mobile: true }
      });
      existingMobiles = new Set(custs.map(c => c.mobile.trim()).filter(Boolean));
    }

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const errors: string[] = [];

      if (entityType === 'CUSTOMERS') {
        const name = String(row.businessName || row.name || row.customerName || '').trim();
        const mobile = String(row.mobile || row.phone || row.whatsapp || '').replace(/[^0-9]/g, '');

        if (!name) errors.push("Customer or Business name is required");
        if (!mobile || mobile.length < 10) errors.push("Valid 10-digit mobile number is required");
        else if (existingMobiles.has(mobile)) errors.push(`Mobile ${mobile} already exists`);

        const gstin = String(row.gstNumber || row.gstin || '').trim();
        if (gstin && gstin.length !== 15) errors.push("GSTIN must be 15 alphanumeric characters");

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
