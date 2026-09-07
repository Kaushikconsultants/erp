"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

async function getAuthOrgId(): Promise<string | null> {
  try {
    const orgId = await getTenantOrgId();
    if (orgId) return orgId;
  } catch {}
  try {
    const defaultOrg = await prisma.organization.findFirst({
      where: { slug: "espon-global" }
    }) || await prisma.organization.findFirst();
    return defaultOrg?.id || null;
  } catch {
    return null;
  }
}

// ============================================================================
// 1. STANDARD INDIAN CHART OF ACCOUNTS (COA) DEFINITION
// ============================================================================

export interface StandardGroupDef {
  name: string;
  code: string;
  nature: "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE";
  parentCode?: string;
  sequence: number;
}

const STANDARD_ACCOUNT_GROUPS: StandardGroupDef[] = [
  // Primary Nature Groups
  { name: "Assets", code: "ASSET_ROOT", nature: "ASSET", sequence: 10 },
  { name: "Liabilities", code: "LIAB_ROOT", nature: "LIABILITY", sequence: 20 },
  { name: "Income", code: "INC_ROOT", nature: "INCOME", sequence: 30 },
  { name: "Expenses", code: "EXP_ROOT", nature: "EXPENSE", sequence: 40 },

  // Sub-groups under Assets
  { name: "Current Assets", code: "CURR_ASSET", nature: "ASSET", parentCode: "ASSET_ROOT", sequence: 11 },
  { name: "Bank Accounts", code: "BANK_ACCOUNTS", nature: "ASSET", parentCode: "CURR_ASSET", sequence: 12 },
  { name: "Cash-in-Hand", code: "CASH_IN_HAND", nature: "ASSET", parentCode: "CURR_ASSET", sequence: 13 },
  { name: "Sundry Debtors (Customers)", code: "SUNDRY_DEBTORS", nature: "ASSET", parentCode: "CURR_ASSET", sequence: 14 },
  { name: "Stock-in-Hand (Inventory)", code: "STOCK_IN_HAND", nature: "ASSET", parentCode: "CURR_ASSET", sequence: 15 },
  { name: "Fixed Assets", code: "FIXED_ASSETS", nature: "ASSET", parentCode: "ASSET_ROOT", sequence: 16 },
  { name: "Loans & Advances (Asset)", code: "LOANS_ADV_ASSET", nature: "ASSET", parentCode: "CURR_ASSET", sequence: 17 },

  // Sub-groups under Liabilities
  { name: "Capital Account", code: "CAPITAL_ACCT", nature: "LIABILITY", parentCode: "LIAB_ROOT", sequence: 21 },
  { name: "Reserves & Surplus", code: "RESERVES_SURPLUS", nature: "LIABILITY", parentCode: "CAPITAL_ACCT", sequence: 22 },
  { name: "Current Liabilities", code: "CURR_LIAB", nature: "LIABILITY", parentCode: "LIAB_ROOT", sequence: 23 },
  { name: "Sundry Creditors (Vendors)", code: "SUNDRY_CREDITORS", nature: "LIABILITY", parentCode: "CURR_LIAB", sequence: 24 },
  { name: "Duties & Taxes (GST/TDS)", code: "DUTIES_TAXES", nature: "LIABILITY", parentCode: "CURR_LIAB", sequence: 25 },
  { name: "Provisions", code: "PROVISIONS", nature: "LIABILITY", parentCode: "CURR_LIAB", sequence: 26 },
  { name: "Secured / Unsecured Loans", code: "LOANS_LIAB", nature: "LIABILITY", parentCode: "LIAB_ROOT", sequence: 27 },

  // Sub-groups under Income
  { name: "Direct Incomes (Sales / Revenue)", code: "DIRECT_INCOME", nature: "INCOME", parentCode: "INC_ROOT", sequence: 31 },
  { name: "Indirect Incomes (Discounts / Other)", code: "INDIRECT_INCOME", nature: "INCOME", parentCode: "INC_ROOT", sequence: 32 },

  // Sub-groups under Expenses
  { name: "Direct Expenses (Purchases & Freight)", code: "DIRECT_EXPENSE", nature: "EXPENSE", parentCode: "EXP_ROOT", sequence: 41 },
  { name: "Indirect Expenses (Admin & Operations)", code: "INDIRECT_EXPENSE", nature: "EXPENSE", parentCode: "EXP_ROOT", sequence: 42 },
  { name: "Employee Costs & Payroll", code: "PAYROLL_EXPENSE", nature: "EXPENSE", parentCode: "INDIRECT_EXPENSE", sequence: 43 },
  { name: "Finance & Bank Charges", code: "FINANCE_EXPENSE", nature: "EXPENSE", parentCode: "INDIRECT_EXPENSE", sequence: 44 },
];

/**
 * Ensures standard account groups exist for the organization.
 */
export async function ensureStandardAccountGroups(organizationId: string) {
  const existingGroups = await prisma.accountGroup.findMany({
    where: { OR: [{ organizationId }, { organizationId: null }] }
  });

  const existingMap = new Map(existingGroups.map(g => [g.code || g.name, g]));

  // First pass: Create primary/root groups
  for (const def of STANDARD_ACCOUNT_GROUPS) {
    if (!existingMap.has(def.code)) {
      const created = await prisma.accountGroup.create({
        data: {
          organizationId,
          name: def.name,
          code: def.code,
          nature: def.nature,
          isStandard: true,
          sequence: def.sequence
        }
      });
      existingMap.set(def.code, created);
    }
  }

  // Second pass: Link parentGroupIds
  for (const def of STANDARD_ACCOUNT_GROUPS) {
    if (def.parentCode && existingMap.has(def.parentCode)) {
      const current = existingMap.get(def.code);
      const parent = existingMap.get(def.parentCode);
      if (current && parent && current.parentGroupId !== parent.id) {
        await prisma.accountGroup.update({
          where: { id: current.id },
          data: { parentGroupId: parent.id }
        });
      }
    }
  }

  return existingMap;
}

/**
 * Synchronizes and backfills all business entities into double-entry Ledgers and Journal Entries.
 * Accurately updates current balance on all ledger accounts in real-time.
 */
export async function syncSystemLedgers() {
  const organizationId = await getAuthOrgId();
  if (!organizationId) return { success: false, error: "Unauthorized" };

  try {
    const groupMap = await ensureStandardAccountGroups(organizationId);

    const debtorsGroup = groupMap.get("SUNDRY_DEBTORS") || await prisma.accountGroup.findFirst({ where: { code: "SUNDRY_DEBTORS" } });
    const creditorsGroup = groupMap.get("SUNDRY_CREDITORS") || await prisma.accountGroup.findFirst({ where: { code: "SUNDRY_CREDITORS" } });
    const bankGroup = groupMap.get("BANK_ACCOUNTS") || await prisma.accountGroup.findFirst({ where: { code: "BANK_ACCOUNTS" } });
    const cashGroup = groupMap.get("CASH_IN_HAND") || await prisma.accountGroup.findFirst({ where: { code: "CASH_IN_HAND" } });
    const salesGroup = groupMap.get("DIRECT_INCOME") || await prisma.accountGroup.findFirst({ where: { code: "DIRECT_INCOME" } });
    const purchaseGroup = groupMap.get("DIRECT_EXPENSE") || await prisma.accountGroup.findFirst({ where: { code: "DIRECT_EXPENSE" } });
    const taxGroup = groupMap.get("DUTIES_TAXES") || await prisma.accountGroup.findFirst({ where: { code: "DUTIES_TAXES" } });
    const indirectExpGroup = groupMap.get("INDIRECT_EXPENSE") || await prisma.accountGroup.findFirst({ where: { code: "INDIRECT_EXPENSE" } });
    const indirectIncGroup = groupMap.get("INDIRECT_INCOME") || await prisma.accountGroup.findFirst({ where: { code: "INDIRECT_INCOME" } });
    const payrollGroup = groupMap.get("PAYROLL_EXPENSE") || indirectExpGroup;
    const capitalGroup = groupMap.get("CAPITAL_ACCT") || await prisma.accountGroup.findFirst({ where: { code: "CAPITAL_ACCT" } });
    const fixedAssetGroup = groupMap.get("FIXED_ASSETS") || await prisma.accountGroup.findFirst({ where: { code: "FIXED_ASSETS" } });

    // Initial fetch of all ledgers (including existing system ledgers)
    let allOrgLedgersInitial = await prisma.ledgerAccount.findMany({
      where: {
        OR: [
          { organizationId },
          { organizationId: null },
          { isSystem: true }
        ]
      }
    });

    let codeLedgerMap = new Map(allOrgLedgersInitial.filter(l => l.code).map(l => [l.code!, l]));
    let custLedgerMap = new Map(allOrgLedgersInitial.filter(l => l.partyType === "CUSTOMER" && l.partyId).map(l => [l.partyId!, l]));
    let vendLedgerMap = new Map(allOrgLedgersInitial.filter(l => l.partyType === "VENDOR" && l.partyId).map(l => [l.partyId!, l]));

    // 1. Standard Core Ledgers
    const standardLedgers = [
      { name: "Sales Account", code: "SYS_SALES", groupId: salesGroup?.id, partyType: "INCOME", isSystem: true },
      { name: "Purchase Account", code: "SYS_PURCHASE", groupId: purchaseGroup?.id, partyType: "EXPENSE", isSystem: true },
      { name: "Output CGST", code: "SYS_OUT_CGST", groupId: taxGroup?.id, partyType: "TAX", isSystem: true },
      { name: "Output SGST", code: "SYS_OUT_SGST", groupId: taxGroup?.id, partyType: "TAX", isSystem: true },
      { name: "Output IGST", code: "SYS_OUT_IGST", groupId: taxGroup?.id, partyType: "TAX", isSystem: true },
      { name: "Input Tax Credit (ITC) CGST", code: "SYS_IN_CGST", groupId: taxGroup?.id, partyType: "TAX", isSystem: true },
      { name: "Input Tax Credit (ITC) SGST", code: "SYS_IN_SGST", groupId: taxGroup?.id, partyType: "TAX", isSystem: true },
      { name: "Input Tax Credit (ITC) IGST", code: "SYS_IN_IGST", groupId: taxGroup?.id, partyType: "TAX", isSystem: true },
      { name: "TDS Payable (Section 194C/J/Q)", code: "SYS_TDS_PAYABLE", groupId: taxGroup?.id, partyType: "TAX", isSystem: true },
      { name: "TCS Receivable (Section 206C)", code: "SYS_TCS_RECEIVABLE", groupId: taxGroup?.id, partyType: "TAX", isSystem: true },
      { name: "Cash in Hand", code: "SYS_CASH", groupId: cashGroup?.id, partyType: "CASH", isSystem: true },
      { name: "General & Administrative Expenses", code: "SYS_GEN_EXP", groupId: indirectExpGroup?.id, partyType: "EXPENSE", isSystem: true },
      { name: "Discount Allowed", code: "SYS_DISCOUNT_ALLOWED", groupId: indirectExpGroup?.id, partyType: "EXPENSE", isSystem: true },
      { name: "Discount Received", code: "SYS_DISCOUNT_RECEIVED", groupId: indirectIncGroup?.id || capitalGroup?.id, partyType: "INCOME", isSystem: true },
      { name: "Salaries & Employee Costs", code: "SYS_SALARY_EXP", groupId: payrollGroup?.id, partyType: "EXPENSE", isSystem: true },
      { name: "Round Off Account", code: "SYS_ROUNDOFF", groupId: indirectExpGroup?.id, partyType: "GENERAL", isSystem: true },
      { name: "Sales Returns & Allowances", code: "SYS_SALES_RETURN", groupId: salesGroup?.id, partyType: "INCOME", isSystem: true },
      { name: "Purchase Returns & Allowances", code: "SYS_PURCHASE_RETURN", groupId: purchaseGroup?.id, partyType: "EXPENSE", isSystem: true },
      { name: "Proprietor / Shareholder Capital", code: "SYS_CAPITAL", groupId: capitalGroup?.id, partyType: "GENERAL", isSystem: true },
      { name: "Opening Balance Equity", code: "SYS_OPENING_EQUITY", groupId: capitalGroup?.id, partyType: "GENERAL", isSystem: true },
      { name: "Office Equipment & Computers", code: "SYS_FIXED_ASSETS", groupId: fixedAssetGroup?.id, partyType: "GENERAL", isSystem: true },
    ];

    for (const l of standardLedgers) {
      if (!l.groupId || codeLedgerMap.has(l.code)) continue;
      try {
        const created = await prisma.ledgerAccount.create({
          data: {
            organizationId,
            name: l.name,
            code: l.code,
            accountGroupId: l.groupId,
            partyType: l.partyType,
            isSystem: l.isSystem,
            openingBalance: 0,
            currentBalance: 0
          }
        });
        codeLedgerMap.set(l.code, created);
      } catch (createErr) {
        const existing = await prisma.ledgerAccount.findFirst({
          where: { code: l.code }
        });
        if (existing) {
          codeLedgerMap.set(l.code, existing);
        }
      }
    }

    // 2. Sync Company Bank Accounts
    const companySettings = await prisma.companySettings.findFirst({ where: { organizationId } });
    let defaultBankLedger = Array.from(codeLedgerMap.values()).find(l => l.partyType === "BANK");

    if (companySettings?.bankAccountName && bankGroup) {
      const bankCode = `BANK_${companySettings.ifscCode || 'PRIMARY'}_${organizationId ? organizationId.slice(0, 6) : '00'}`;
      if (!codeLedgerMap.has(bankCode)) {
        const bankLedgerName = `${companySettings.bankAccountName} (${companySettings.accountNumber ? '...' + companySettings.accountNumber.slice(-4) : 'Bank'})`;
        try {
          defaultBankLedger = await prisma.ledgerAccount.create({
            data: {
              organizationId,
              name: bankLedgerName,
              code: bankCode,
              accountGroupId: bankGroup.id,
              partyType: "BANK",
              bankAccountNumber: companySettings.accountNumber || undefined,
              ifscCode: companySettings.ifscCode || undefined,
              isSystem: false,
              openingBalance: 0,
              currentBalance: 0
            }
          });
          codeLedgerMap.set(bankCode, defaultBankLedger);
        } catch (err) {
          const existing = await prisma.ledgerAccount.findFirst({ where: { code: bankCode } });
          if (existing) {
            defaultBankLedger = existing;
            codeLedgerMap.set(bankCode, existing);
          }
        }
      } else {
        defaultBankLedger = codeLedgerMap.get(bankCode);
      }
    }

    if (!defaultBankLedger) {
      defaultBankLedger = codeLedgerMap.get("SYS_CASH");
    }

    const cashLedger = codeLedgerMap.get("SYS_CASH");

    // 3. Sync Customers -> Sundry Debtors
    if (debtorsGroup) {
      const customers = await prisma.customer.findMany({ where: { organizationId } });
      for (const c of customers) {
        if (!custLedgerMap.has(c.id)) {
          const partyLedgerName = c.businessName || c.contactPerson || "Customer";
          const custCode = `CUST_${c.id.slice(0, 8)}`;
          try {
            const created = await prisma.ledgerAccount.create({
              data: {
                organizationId,
                name: partyLedgerName,
                code: custCode,
                accountGroupId: debtorsGroup.id,
                partyType: "CUSTOMER",
                partyId: c.id,
                gstin: c.gstNumber || undefined,
                pan: c.pan || undefined,
                openingBalance: c.openingBalance || 0,
                openingType: c.openingBalanceType === "CREDIT" ? "CREDIT" : "DEBIT",
                currentBalance: c.openingBalance || 0
              }
            });
            custLedgerMap.set(c.id, created);
          } catch (err) {
            const existing = await prisma.ledgerAccount.findFirst({ where: { partyId: c.id } }) ||
                             await prisma.ledgerAccount.findFirst({ where: { code: custCode } });
            if (existing) custLedgerMap.set(c.id, existing);
          }
        }
      }
    }

    // 4. Sync Vendors -> Sundry Creditors
    if (creditorsGroup) {
      const vendors = await prisma.vendor.findMany({ where: { organizationId } });
      for (const v of vendors) {
        if (!vendLedgerMap.has(v.id)) {
          const vendCode = `VEND_${v.id.slice(0, 8)}`;
          try {
            const created = await prisma.ledgerAccount.create({
              data: {
                organizationId,
                name: v.companyName,
                code: vendCode,
                accountGroupId: creditorsGroup.id,
                partyType: "VENDOR",
                partyId: v.id,
                gstin: v.gstNumber || undefined,
                pan: v.pan || undefined,
                openingBalance: 0,
                openingType: "CREDIT",
                currentBalance: 0
              }
            });
            vendLedgerMap.set(v.id, created);
          } catch (err) {
            const existing = await prisma.ledgerAccount.findFirst({ where: { partyId: v.id } }) ||
                             await prisma.ledgerAccount.findFirst({ where: { code: vendCode } });
            if (existing) vendLedgerMap.set(v.id, existing);
          }
        }
      }
    }

    const salesLedger = codeLedgerMap.get("SYS_SALES");
    const purchaseLedger = codeLedgerMap.get("SYS_PURCHASE");
    const outCgstLedger = codeLedgerMap.get("SYS_OUT_CGST");
    const outSgstLedger = codeLedgerMap.get("SYS_OUT_SGST");
    const outIgstLedger = codeLedgerMap.get("SYS_OUT_IGST");
    const inCgstLedger = codeLedgerMap.get("SYS_IN_CGST");
    const inSgstLedger = codeLedgerMap.get("SYS_IN_SGST");
    const inIgstLedger = codeLedgerMap.get("SYS_IN_IGST");
    const roundoffLedger = codeLedgerMap.get("SYS_ROUNDOFF");
    const generalExpLedger = codeLedgerMap.get("SYS_GEN_EXP");
    const salaryExpLedger = codeLedgerMap.get("SYS_SALARY_EXP");
    const salesReturnLedger = codeLedgerMap.get("SYS_SALES_RETURN") || salesLedger;
    const purchaseReturnLedger = codeLedgerMap.get("SYS_PURCHASE_RETURN") || purchaseLedger;
    const discountAllowedLedger = codeLedgerMap.get("SYS_DISCOUNT_ALLOWED") || generalExpLedger;
    const discountReceivedLedger = codeLedgerMap.get("SYS_DISCOUNT_RECEIVED");
    const openingEquityLedger = codeLedgerMap.get("SYS_OPENING_EQUITY");

    // 4.5. PRUNE ORPHANED & CANCELLED JOURNAL ENTRIES
    const allSystemJVs = await prisma.journalEntry.findMany({
      where: {
        OR: [{ organizationId }, { organizationId: null }],
        isSystemGenerated: true
      },
      select: {
        id: true,
        sourceDocType: true,
        sourceDocId: true,
        voucherNumber: true
      }
    });

    for (const jv of allSystemJVs) {
      let isOrphan = false;

      if (jv.sourceDocType === "EXPENSE" || jv.voucherNumber?.startsWith("EXP-")) {
        if (!jv.sourceDocId) {
          isOrphan = true;
        } else {
          const exp = await prisma.expense.findUnique({ where: { id: jv.sourceDocId }, select: { id: true, status: true } });
          if (!exp || exp.status === "Rejected") isOrphan = true;
        }
      } else if (jv.sourceDocType === "INVOICE" || jv.voucherNumber?.startsWith("SLS-")) {
        if (!jv.sourceDocId) {
          isOrphan = true;
        } else {
          const inv = await prisma.invoice.findUnique({ where: { id: jv.sourceDocId }, select: { id: true, status: true } });
          if (!inv || inv.status === "Cancelled") isOrphan = true;
        }
      } else if (jv.sourceDocType === "BILL" || jv.voucherNumber?.startsWith("PUR-")) {
        if (!jv.sourceDocId) {
          isOrphan = true;
        } else {
          const bill = await prisma.bill.findUnique({ where: { id: jv.sourceDocId }, select: { id: true, status: true } });
          if (!bill || bill.status === "Void") isOrphan = true;
        }
      } else if (jv.sourceDocType === "PAYMENT" || jv.voucherNumber?.startsWith("RCPT-")) {
        if (!jv.sourceDocId) {
          isOrphan = true;
        } else {
          const pmt = await prisma.payment.findUnique({ where: { id: jv.sourceDocId }, select: { id: true } });
          if (!pmt) isOrphan = true;
        }
      } else if (jv.sourceDocType === "VENDOR_PAYMENT" || jv.voucherNumber?.startsWith("PMT-")) {
        if (!jv.sourceDocId) {
          isOrphan = true;
        } else {
          const vp = await prisma.vendorPayment.findUnique({ where: { id: jv.sourceDocId }, select: { id: true, status: true } });
          if (!vp || vp.status === "Failed" || vp.status === "Cancelled") isOrphan = true;
        }
      } else if (jv.sourceDocType === "SALARY" || jv.voucherNumber?.startsWith("SAL-")) {
        if (!jv.sourceDocId) {
          isOrphan = true;
        } else {
          const sal = await prisma.salary.findUnique({ where: { id: jv.sourceDocId }, select: { id: true } });
          if (!sal) isOrphan = true;
        }
      } else if (jv.sourceDocType === "CREDIT_NOTE" || jv.voucherNumber?.startsWith("CN-")) {
        if (!jv.sourceDocId) {
          isOrphan = true;
        } else {
          const cn = await prisma.creditNote.findUnique({ where: { id: jv.sourceDocId }, select: { id: true, status: true } });
          if (!cn || cn.status === "CANCELLED") isOrphan = true;
        }
      } else if (jv.sourceDocType === "VENDOR_CREDIT" || jv.voucherNumber?.startsWith("DN-")) {
        if (!jv.sourceDocId) {
          isOrphan = true;
        } else {
          const vc = await prisma.vendorCredit.findUnique({ where: { id: jv.sourceDocId }, select: { id: true, status: true } });
          if (!vc || vc.status === "Void" || vc.status === "Cancelled") isOrphan = true;
        }
      }

      if (isOrphan) {
        await prisma.journalLineItem.deleteMany({ where: { journalEntryId: jv.id } });
        await prisma.journalEntry.delete({ where: { id: jv.id } });
      }
    }

    const existingJVs = await prisma.journalEntry.findMany({
      where: { organizationId, sourceDocId: { not: null } },
      select: { sourceDocType: true, sourceDocId: true }
    });
    const jvSet = new Set(existingJVs.map(j => `${j.sourceDocType}_${j.sourceDocId}`));

    // A. Auto-Post Double-Entry Vouchers for Historical Invoices
    const invoices = await prisma.invoice.findMany({
      where: { organizationId, status: { not: "Cancelled" } },
      include: { customer: true }
    });

    for (const inv of invoices) {
      if (jvSet.has(`INVOICE_${inv.id}`)) continue;

      if (salesLedger) {
        const customerLedger = custLedgerMap.get(inv.customerId);

        if (customerLedger) {
          const taxable = inv.subtotal || (inv.totalAmount - (inv.taxAmount || 0));
          const tax = inv.taxAmount || 0;
          const discount = inv.discountAmount || 0;
          const isInter = Boolean(inv.customer?.state && companySettings?.state && inv.customer.state.toLowerCase() !== companySettings.state.toLowerCase());

          const lines: { ledgerAccountId: string; debit: number; credit: number; particulars: string }[] = [];

          // Dr Customer (Total Amount)
          lines.push({
            ledgerAccountId: customerLedger.id,
            debit: inv.totalAmount,
            credit: 0,
            particulars: `To Sales A/c against Inv #${inv.invoiceNumber}`
          });

          // Dr Discount Allowed if discount given
          if (discount > 0 && discountAllowedLedger) {
            lines.push({
              ledgerAccountId: discountAllowedLedger.id,
              debit: discount,
              credit: 0,
              particulars: `Discount Allowed on Inv #${inv.invoiceNumber}`
            });
          }

          // Cr Sales A/c (Gross Taxable Amount)
          const grossSales = Number((taxable + discount).toFixed(2));
          lines.push({
            ledgerAccountId: salesLedger.id,
            debit: 0,
            credit: grossSales,
            particulars: `By ${customerLedger.name}`
          });

          // Cr Taxes
          if (tax > 0) {
            if (isInter && outIgstLedger) {
              lines.push({
                ledgerAccountId: outIgstLedger.id,
                debit: 0,
                credit: tax,
                particulars: `IGST Output on Inv #${inv.invoiceNumber}`
              });
            } else if (outCgstLedger && outSgstLedger) {
              const halfTax = Number((tax / 2).toFixed(2));
              lines.push({
                ledgerAccountId: outCgstLedger.id,
                debit: 0,
                credit: halfTax,
                particulars: `CGST Output on Inv #${inv.invoiceNumber}`
              });
              lines.push({
                ledgerAccountId: outSgstLedger.id,
                debit: 0,
                credit: Number((tax - halfTax).toFixed(2)),
                particulars: `SGST Output on Inv #${inv.invoiceNumber}`
              });
            }
          }

          // Round Off adjustment if discrepancy exists
          const sumDr = Number(lines.reduce((acc, l) => acc + l.debit, 0).toFixed(2));
          const sumCr = Number(lines.reduce((acc, l) => acc + l.credit, 0).toFixed(2));
          const diff = Number((sumDr - sumCr).toFixed(2));

          if (Math.abs(diff) > 0.001 && roundoffLedger) {
            if (diff > 0) {
              lines.push({ ledgerAccountId: roundoffLedger.id, debit: 0, credit: diff, particulars: "Round Off adjustment" });
            } else {
              lines.push({ ledgerAccountId: roundoffLedger.id, debit: -diff, credit: 0, particulars: "Round Off adjustment" });
            }
          }

          await prisma.journalEntry.create({
            data: {
              organizationId,
              voucherNumber: `SLS-${inv.invoiceNumber}`,
              voucherType: "SALES",
              date: inv.invoiceDate || inv.createdAt,
              narration: `Sales Invoice #${inv.invoiceNumber} to ${inv.customer?.businessName || 'Customer'}`,
              referenceNumber: inv.invoiceNumber,
              totalAmount: inv.totalAmount,
              sourceDocType: "INVOICE",
              sourceDocId: inv.id,
              isSystemGenerated: true,
              status: "POSTED",
              lines: {
                create: lines
              }
            }
          });
          jvSet.add(`INVOICE_${inv.id}`);
        }
      }
    }

    // B. Auto-Post Double-Entry Vouchers for Customer Payments (Receipts: Dr Bank/Cash, Cr Customer)
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          { customer: { organizationId } },
          { invoice: { organizationId } }
        ],
        status: { in: ["Completed", "Processed", "Success", "Received"] }
      },
      include: { customer: true, invoice: true }
    });

    for (const p of payments) {
      if (jvSet.has(`PAYMENT_${p.id}`)) continue;

      const custId = p.customerId || p.invoice?.customerId;
      const customerLedger = custId ? custLedgerMap.get(custId) : null;

      const isCash = p.paymentMode?.toLowerCase() === "cash";
      const receivingLedger = isCash ? (cashLedger || defaultBankLedger) : (defaultBankLedger || cashLedger);

      if (customerLedger && receivingLedger && p.amount > 0) {
        const lines = [
          {
            ledgerAccountId: receivingLedger.id,
            debit: p.amount,
            credit: 0,
            particulars: `Received from ${customerLedger.name} via ${p.paymentMode}`
          },
          {
            ledgerAccountId: customerLedger.id,
            debit: 0,
            credit: p.amount,
            particulars: `Payment #${p.paymentNumber} ref #${p.referenceNumber || ''}`
          }
        ];

        await prisma.journalEntry.create({
          data: {
            organizationId,
            voucherNumber: `RCPT-${p.paymentNumber}`,
            voucherType: "RECEIPT",
            date: p.paymentDate || p.createdAt,
            narration: `Payment received: ${p.paymentNumber} from ${customerLedger.name}`,
            referenceNumber: p.referenceNumber || p.paymentNumber,
            totalAmount: p.amount,
            sourceDocType: "PAYMENT",
            sourceDocId: p.id,
            isSystemGenerated: true,
            status: "POSTED",
            lines: {
              create: lines
            }
          }
        });
        jvSet.add(`PAYMENT_${p.id}`);
      }
    }

    // C. Auto-Post Double-Entry Vouchers for Purchase Bills (Dr Purchase + ITC, Cr Vendor)
    const bills = await prisma.bill.findMany({
      where: { organizationId, status: { not: "Void" } },
      include: { vendor: true }
    });

    for (const b of bills) {
      if (jvSet.has(`BILL_${b.id}`)) continue;

      if (purchaseLedger) {
        const vendorLedger = b.vendorId ? vendLedgerMap.get(b.vendorId) : null;

        if (vendorLedger) {
          const taxable = b.subtotal || (b.totalAmount - (b.taxAmount || 0));
          const tax = b.taxAmount || 0;
          const discount = b.discountAmount || 0;
          const isInter = Boolean(b.vendor?.state && companySettings?.state && b.vendor.state.toLowerCase() !== companySettings.state.toLowerCase());

          const lines: { ledgerAccountId: string; debit: number; credit: number; particulars: string }[] = [];

          // Dr Purchase Account (Gross purchases)
          const grossPurchases = Number((taxable + discount).toFixed(2));
          lines.push({
            ledgerAccountId: purchaseLedger.id,
            debit: grossPurchases,
            credit: 0,
            particulars: `Purchase Bill #${b.billNumber} from ${vendorLedger.name}`
          });

          // Dr Input Tax Credit (ITC)
          if (tax > 0) {
            if (isInter && inIgstLedger) {
              lines.push({
                ledgerAccountId: inIgstLedger.id,
                debit: tax,
                credit: 0,
                particulars: `ITC IGST on Bill #${b.billNumber}`
              });
            } else if (inCgstLedger && inSgstLedger) {
              const halfTax = Number((tax / 2).toFixed(2));
              lines.push({
                ledgerAccountId: inCgstLedger.id,
                debit: halfTax,
                credit: 0,
                particulars: `ITC CGST on Bill #${b.billNumber}`
              });
              lines.push({
                ledgerAccountId: inSgstLedger.id,
                debit: Number((tax - halfTax).toFixed(2)),
                credit: 0,
                particulars: `ITC SGST on Bill #${b.billNumber}`
              });
            }
          }

          // Cr Vendor (Total Amount)
          lines.push({
            ledgerAccountId: vendorLedger.id,
            debit: 0,
            credit: b.totalAmount,
            particulars: `By Purchase Bill #${b.billNumber}`
          });

          // Cr Discount Received if discount exists
          if (discount > 0 && discountReceivedLedger) {
            lines.push({
              ledgerAccountId: discountReceivedLedger.id,
              debit: 0,
              credit: discount,
              particulars: `Discount Received on Bill #${b.billNumber}`
            });
          }

          // Round Off adjustment if discrepancy exists
          const sumDr = Number(lines.reduce((acc, l) => acc + l.debit, 0).toFixed(2));
          const sumCr = Number(lines.reduce((acc, l) => acc + l.credit, 0).toFixed(2));
          const diff = Number((sumDr - sumCr).toFixed(2));

          if (Math.abs(diff) > 0.001 && roundoffLedger) {
            if (diff > 0) {
              lines.push({ ledgerAccountId: roundoffLedger.id, debit: 0, credit: diff, particulars: "Round Off adjustment" });
            } else {
              lines.push({ ledgerAccountId: roundoffLedger.id, debit: -diff, credit: 0, particulars: "Round Off adjustment" });
            }
          }

          await prisma.journalEntry.create({
            data: {
              organizationId,
              voucherNumber: `PUR-${b.billNumber}`,
              voucherType: "PURCHASE",
              date: b.billDate || b.createdAt,
              narration: `Purchase Bill #${b.billNumber} from ${b.vendor?.companyName || 'Vendor'}`,
              referenceNumber: b.vendorBillNumber || b.billNumber,
              totalAmount: b.totalAmount,
              sourceDocType: "BILL",
              sourceDocId: b.id,
              isSystemGenerated: true,
              status: "POSTED",
              lines: {
                create: lines
              }
            }
          });
          jvSet.add(`BILL_${b.id}`);
        }
      }
    }

    // D. Auto-Post Double-Entry Vouchers for Vendor Payments (Dr Vendor, Cr Bank/Cash)
    const vendorPayments = await prisma.vendorPayment.findMany({
      where: {
        vendor: { organizationId },
        status: { in: ["Completed", "Processed", "Paid", "Success"] }
      },
      include: { vendor: true }
    });

    for (const vp of vendorPayments) {
      if (jvSet.has(`VENDOR_PAYMENT_${vp.id}`)) continue;

      const vendorLedger = vp.vendorId ? vendLedgerMap.get(vp.vendorId) : null;
      const isCash = vp.paymentMode?.toLowerCase() === "cash";
      const payingLedger = isCash ? (cashLedger || defaultBankLedger) : (defaultBankLedger || cashLedger);

      if (vendorLedger && payingLedger && vp.amount > 0) {
        const lines = [
          {
            ledgerAccountId: vendorLedger.id,
            debit: vp.amount,
            credit: 0,
            particulars: `Payment to ${vendorLedger.name}`
          },
          {
            ledgerAccountId: payingLedger.id,
            debit: 0,
            credit: vp.amount,
            particulars: `Paid via ${vp.paymentMode}`
          }
        ];

        await prisma.journalEntry.create({
          data: {
            organizationId,
            voucherNumber: `PMT-${vp.paymentNumber}`,
            voucherType: "PAYMENT",
            date: vp.paymentDate || vp.createdAt,
            narration: `Payment made to ${vendorLedger.name} #${vp.paymentNumber}`,
            referenceNumber: vp.referenceNumber || vp.paymentNumber,
            totalAmount: vp.amount,
            sourceDocType: "VENDOR_PAYMENT",
            sourceDocId: vp.id,
            isSystemGenerated: true,
            status: "POSTED",
            lines: {
              create: lines
            }
          }
        });
        jvSet.add(`VENDOR_PAYMENT_${vp.id}`);
      }
    }

    // E. Auto-Post Double-Entry Vouchers for Expenses (Dr Expense, Cr Bank/Cash)
    const expenses = await prisma.expense.findMany({
      where: {
        OR: [
          { employee: { organizationId } },
          { employeeId: null }
        ],
        status: { not: "Rejected" }
      }
    });

    for (const exp of expenses) {
      if (jvSet.has(`EXPENSE_${exp.id}`)) continue;

      if (generalExpLedger && exp.amount > 0) {
        const payingLedger = defaultBankLedger || cashLedger;
        if (payingLedger) {
          const lines = [
            {
              ledgerAccountId: generalExpLedger.id,
              debit: exp.amount,
              credit: 0,
              particulars: `Expense: ${exp.category} - ${exp.description || ''}`
            },
            {
              ledgerAccountId: payingLedger.id,
              debit: 0,
              credit: exp.amount,
              particulars: `Paid for ${exp.category}`
            }
          ];

          await prisma.journalEntry.create({
            data: {
              organizationId,
              voucherNumber: `EXP-${exp.expenseNumber}`,
              voucherType: "PAYMENT",
              date: exp.date || exp.createdAt,
              narration: `Expense recorded: ${exp.category} (${exp.status})`,
              referenceNumber: exp.expenseNumber,
              totalAmount: exp.amount,
              sourceDocType: "EXPENSE",
              sourceDocId: exp.id,
              isSystemGenerated: true,
              status: "POSTED",
              lines: {
                create: lines
              }
            }
          });
          jvSet.add(`EXPENSE_${exp.id}`);
        }
      }
    }

    // F. Auto-Post Double-Entry Vouchers for Employee Salaries (Dr Salary Exp, Cr Bank/Cash)
    const salaries = await prisma.salary.findMany({
      where: {
        employee: { organizationId },
        status: { in: ["Processed", "Paid"] }
      },
      include: { employee: { include: { user: true } } }
    });

    for (const sal of salaries) {
      if (jvSet.has(`SALARY_${sal.id}`)) continue;

      if (salaryExpLedger && sal.netSalary > 0) {
        const payingLedger = defaultBankLedger || cashLedger;
        if (payingLedger) {
          const empName = sal.employee?.user?.name || "Staff";
          const lines = [
            {
              ledgerAccountId: salaryExpLedger.id,
              debit: sal.netSalary,
              credit: 0,
              particulars: `Salary for ${sal.month} - ${empName}`
            },
            {
              ledgerAccountId: payingLedger.id,
              debit: 0,
              credit: sal.netSalary,
              particulars: `Disbursed for ${sal.month}`
            }
          ];

          await prisma.journalEntry.create({
            data: {
              organizationId,
              voucherNumber: `SAL-${sal.month}-${sal.id.slice(0, 6)}`,
              voucherType: "PAYMENT",
              date: sal.paymentDate || sal.createdAt,
              narration: `Salary payout for ${sal.month} to ${empName}`,
              referenceNumber: `SAL-${sal.month}`,
              totalAmount: sal.netSalary,
              sourceDocType: "SALARY",
              sourceDocId: sal.id,
              isSystemGenerated: true,
              status: "POSTED",
              lines: {
                create: lines
              }
            }
          });
          jvSet.add(`SALARY_${sal.id}`);
        }
      }
    }

    // G. Auto-Post Double-Entry Vouchers for Credit Notes (Dr Sales Return + Tax, Cr Customer)
    const creditNotes = await prisma.creditNote.findMany({
      where: { organizationId, status: { not: "CANCELLED" } },
      include: { customer: true }
    });

    for (const cn of creditNotes) {
      if (jvSet.has(`CREDIT_NOTE_${cn.id}`)) continue;

      if (salesReturnLedger) {
        const customerLedger = cn.customerId ? custLedgerMap.get(cn.customerId) : null;

        if (customerLedger && cn.totalAmount > 0) {
          const subtotal = cn.subtotal || (cn.totalAmount - (cn.taxAmount || 0));
          const tax = cn.taxAmount || 0;
          const isInter = Boolean(cn.customer?.state && companySettings?.state && cn.customer.state.toLowerCase() !== companySettings.state.toLowerCase());

          const lines: { ledgerAccountId: string; debit: number; credit: number; particulars: string }[] = [];

          // Dr Sales Return
          lines.push({
            ledgerAccountId: salesReturnLedger.id,
            debit: subtotal,
            credit: 0,
            particulars: `Credit Note #${cn.creditNoteNumber} against ${customerLedger.name}`
          });

          // Dr Output Tax Reversed
          if (tax > 0) {
            if (isInter && outIgstLedger) {
              lines.push({ ledgerAccountId: outIgstLedger.id, debit: tax, credit: 0, particulars: `IGST Output reversal on CN #${cn.creditNoteNumber}` });
            } else if (outCgstLedger && outSgstLedger) {
              const half = Number((tax / 2).toFixed(2));
              lines.push({ ledgerAccountId: outCgstLedger.id, debit: half, credit: 0, particulars: `CGST Output reversal on CN #${cn.creditNoteNumber}` });
              lines.push({ ledgerAccountId: outSgstLedger.id, debit: Number((tax - half).toFixed(2)), credit: 0, particulars: `SGST Output reversal on CN #${cn.creditNoteNumber}` });
            }
          }

          // Cr Customer
          lines.push({
            ledgerAccountId: customerLedger.id,
            debit: 0,
            credit: cn.totalAmount,
            particulars: `Credit Note #${cn.creditNoteNumber} issued`
          });

          await prisma.journalEntry.create({
            data: {
              organizationId,
              voucherNumber: `CN-${cn.creditNoteNumber}`,
              voucherType: "CREDIT_NOTE",
              date: cn.creditNoteDate || cn.createdAt,
              narration: `Credit Note #${cn.creditNoteNumber} issued to ${customerLedger.name}`,
              referenceNumber: cn.creditNoteNumber,
              totalAmount: cn.totalAmount,
              sourceDocType: "CREDIT_NOTE",
              sourceDocId: cn.id,
              isSystemGenerated: true,
              status: "POSTED",
              lines: {
                create: lines
              }
            }
          });
          jvSet.add(`CREDIT_NOTE_${cn.id}`);
        }
      }
    }

    // H. Auto-Post Double-Entry Vouchers for Vendor Credits / Debit Notes (Dr Vendor, Cr Purchase Return + ITC)
    const vendorCredits = await prisma.vendorCredit.findMany({
      where: {
        vendor: { organizationId },
        status: { in: ["Open", "Applied", "Closed"] }
      },
      include: { vendor: true }
    });

    for (const vc of vendorCredits) {
      if (jvSet.has(`VENDOR_CREDIT_${vc.id}`)) continue;

      if (purchaseReturnLedger) {
        const vendorLedger = vc.vendorId ? vendLedgerMap.get(vc.vendorId) : null;

        if (vendorLedger && vc.totalAmount > 0) {
          const subtotal = vc.subtotal || (vc.totalAmount - (vc.taxAmount || 0));
          const tax = vc.taxAmount || 0;
          const isInter = Boolean(vc.vendor?.state && companySettings?.state && vc.vendor.state.toLowerCase() !== companySettings.state.toLowerCase());

          const lines: { ledgerAccountId: string; debit: number; credit: number; particulars: string }[] = [];

          // Dr Vendor (reduces liability)
          lines.push({
            ledgerAccountId: vendorLedger.id,
            debit: vc.totalAmount,
            credit: 0,
            particulars: `Debit Note #${vc.creditNoteNumber} against ${vendorLedger.name}`
          });

          // Cr Purchase Return
          lines.push({
            ledgerAccountId: purchaseReturnLedger.id,
            debit: 0,
            credit: subtotal,
            particulars: `Purchase Return #${vc.creditNoteNumber}`
          });

          // Cr ITC Reversed
          if (tax > 0) {
            if (isInter && inIgstLedger) {
              lines.push({ ledgerAccountId: inIgstLedger.id, debit: 0, credit: tax, particulars: `ITC IGST reversal on DN #${vc.creditNoteNumber}` });
            } else if (inCgstLedger && inSgstLedger) {
              const half = Number((tax / 2).toFixed(2));
              lines.push({ ledgerAccountId: inCgstLedger.id, debit: 0, credit: half, particulars: `ITC CGST reversal on DN #${vc.creditNoteNumber}` });
              lines.push({ ledgerAccountId: inSgstLedger.id, debit: 0, credit: Number((tax - half).toFixed(2)), particulars: `ITC SGST reversal on DN #${vc.creditNoteNumber}` });
            }
          }

          await prisma.journalEntry.create({
            data: {
              organizationId,
              voucherNumber: `DN-${vc.creditNoteNumber}`,
              voucherType: "DEBIT_NOTE",
              date: vc.creditDate || vc.createdAt,
              narration: `Vendor Credit / Debit Note #${vc.creditNoteNumber} to ${vendorLedger.name}`,
              referenceNumber: vc.creditNoteNumber,
              totalAmount: vc.totalAmount,
              sourceDocType: "VENDOR_CREDIT",
              sourceDocId: vc.id,
              isSystemGenerated: true,
              status: "POSTED",
              lines: {
                create: lines
              }
            }
          });
          jvSet.add(`VENDOR_CREDIT_${vc.id}`);
        }
      }
    }

    // 6. Recalculate & Update currentBalance on ALL LedgerAccount records
    const allOrgLedgers = await prisma.ledgerAccount.findMany({
      where: { OR: [{ organizationId }, { organizationId: null }] },
      include: {
        accountGroup: true,
        journalLineItems: {
          where: {
            journalEntry: {
              status: "POSTED"
            }
          }
        }
      }
    });

    for (const l of allOrgLedgers) {
      const openDr = l.openingType !== "CREDIT" ? (l.openingBalance || 0) : 0;
      const openCr = l.openingType === "CREDIT" ? (l.openingBalance || 0) : 0;
      const txDr = l.journalLineItems.reduce((acc, item) => acc + (item.debit || 0), 0);
      const txCr = l.journalLineItems.reduce((acc, item) => acc + (item.credit || 0), 0);

      const netDebit = (openDr + txDr) - (openCr + txCr);
      const computedBalance = Number(Math.abs(netDebit).toFixed(2));

      if (Math.abs(l.currentBalance - computedBalance) > 0.001) {
        await prisma.ledgerAccount.update({
          where: { id: l.id },
          data: { currentBalance: computedBalance }
        });
      }
    }

    return { success: true, message: "System Chart of Accounts and Ledgers synchronized successfully!" };
  } catch (error: any) {
    console.error("Error syncing system ledgers:", error);
    return { success: false, error: error.message || "Failed to sync system ledgers" };
  }
}

export async function reconcileAccountingData() {
  const organizationId = await getAuthOrgId();
  if (!organizationId) return { success: false, error: "Unauthorized" };
  return await syncSystemLedgers();
}

// ============================================================================
// 2. CHART OF ACCOUNTS & LEDGER CRUD
// ============================================================================

export async function getChartOfAccounts() {
  const organizationId = await getAuthOrgId();
  if (!organizationId) return { success: false, error: "Unauthorized" };

  try {
    await syncSystemLedgers();

    const groups = await prisma.accountGroup.findMany({
      where: { OR: [{ organizationId }, { organizationId: null }] },
      include: {
        ledgers: {
          orderBy: { name: "asc" }
        },
        subGroups: true
      },
      orderBy: { sequence: "asc" }
    });

    return { success: true, groups: JSON.parse(JSON.stringify(groups)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to load Chart of Accounts" };
  }
}

export async function getLedgers(groupId?: string) {
  const organizationId = await getAuthOrgId();
  if (!organizationId) return { success: false, error: "Unauthorized" };

  try {
    const where: any = { OR: [{ organizationId }, { organizationId: null }] };
    if (groupId) where.accountGroupId = groupId;

    const ledgers = await prisma.ledgerAccount.findMany({
      where,
      include: { accountGroup: true },
      orderBy: { name: "asc" }
    });

    return { success: true, ledgers: JSON.parse(JSON.stringify(ledgers)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getLedgerStatement(
  ledgerId: string,
  startDateStr?: string,
  endDateStr?: string
) {
  const organizationId = await getAuthOrgId();
  if (!organizationId) return { success: false, error: "Unauthorized" };

  try {
    await syncSystemLedgers();

    const ledger = await prisma.ledgerAccount.findUnique({
      where: { id: ledgerId },
      include: { accountGroup: true }
    });

    if (!ledger) return { success: false, error: "Ledger account not found" };

    const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().getFullYear(), 3, 1);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    endDate.setHours(23, 59, 59, 999);

    // Opening balance calculation up to startDate
    const priorLines = await prisma.journalLineItem.findMany({
      where: {
        ledgerAccountId: ledgerId,
        journalEntry: {
          organizationId,
          date: { lt: startDate },
          status: "POSTED"
        }
      }
    });

    const isDebitNature = ledger.accountGroup.nature === "ASSET" || ledger.accountGroup.nature === "EXPENSE";
    const initialOpeningDebit = ledger.openingType !== "CREDIT" ? (ledger.openingBalance || 0) : 0;
    const initialOpeningCredit = ledger.openingType === "CREDIT" ? (ledger.openingBalance || 0) : 0;

    const priorDebit = priorLines.reduce((s, l) => s + (l.debit || 0), 0);
    const priorCredit = priorLines.reduce((s, l) => s + (l.credit || 0), 0);

    const netPrior = (initialOpeningDebit + priorDebit) - (initialOpeningCredit + priorCredit);
    const effectiveOpeningBalance = Number(Math.abs(netPrior).toFixed(2));
    const effectiveOpeningType = netPrior >= 0 ? "DEBIT" : "CREDIT";

    // Period lines
    const periodLines = await prisma.journalLineItem.findMany({
      where: {
        ledgerAccountId: ledgerId,
        journalEntry: {
          organizationId,
          date: { gte: startDate, lte: endDate },
          status: "POSTED"
        }
      },
      include: {
        journalEntry: true
      },
      orderBy: { journalEntry: { date: "asc" } }
    });

    let runningNet = netPrior;
    let totalDebit = 0;
    let totalCredit = 0;

    const transactions = periodLines.map((line) => {
      const debit = Number(line.debit || 0);
      const credit = Number(line.credit || 0);
      totalDebit += debit;
      totalCredit += credit;

      runningNet += (debit - credit);

      return {
        id: line.id,
        date: line.journalEntry.date,
        voucherNumber: line.journalEntry.voucherNumber,
        voucherType: line.journalEntry.voucherType,
        particulars: line.particulars || line.journalEntry.narration || "Transaction",
        debit,
        credit,
        runningBalance: Number(Math.abs(runningNet).toFixed(2)),
        balanceType: runningNet >= 0 ? "Dr" : "Cr"
      };
    });

    const closingBalance = Number(Math.abs(runningNet).toFixed(2));
    const closingType = runningNet >= 0 ? "Dr" : "Cr";

    return {
      success: true,
      ledger: JSON.parse(JSON.stringify(ledger)),
      openingBalance: effectiveOpeningBalance,
      openingType: effectiveOpeningType,
      closingBalance,
      closingType,
      totalDebit: Number(totalDebit.toFixed(2)),
      totalCredit: Number(totalCredit.toFixed(2)),
      transactions
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch ledger statement" };
  }
}

export async function createLedgerAccount(data: {
  name: string;
  code?: string;
  accountGroupId: string;
  openingBalance?: number;
  openingType?: "DEBIT" | "CREDIT";
  partyType?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  gstin?: string;
  pan?: string;
}) {
  const organizationId = await getAuthOrgId();
  if (!organizationId) return { success: false, error: "Unauthorized" };

  try {
    const existing = await prisma.ledgerAccount.findFirst({
      where: { name: data.name.trim(), organizationId }
    });
    if (existing) {
      return { success: false, error: "A ledger with this name already exists." };
    }

    let resolvedCode = data.code?.trim();
    if (resolvedCode) {
      const codeExists = await prisma.ledgerAccount.findFirst({ where: { code: resolvedCode } });
      if (codeExists) {
        resolvedCode = `${resolvedCode}_${Date.now().toString().slice(-4)}`;
      }
    } else {
      resolvedCode = `LEDGER_${Date.now().toString().slice(-6)}_${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    }

    const openBal = Number(data.openingBalance || 0);
    const ledger = await prisma.ledgerAccount.create({
      data: {
        organizationId,
        name: data.name.trim(),
        code: resolvedCode,
        accountGroupId: data.accountGroupId,
        partyType: data.partyType || "GENERAL",
        openingBalance: openBal,
        openingType: data.openingType || "DEBIT",
        currentBalance: openBal,
        bankAccountNumber: data.bankAccountNumber || null,
        ifscCode: data.ifscCode || null,
        gstin: data.gstin || null,
        pan: data.pan || null,
        isSystem: false
      }
    });

    revalidatePath("/accounting", "layout");
    return { success: true, ledger: JSON.parse(JSON.stringify(ledger)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create ledger" };
  }
}

// ============================================================================
// 3. DOUBLE-ENTRY JOURNAL VOUCHERS ENGINE (Debit = Credit)
// ============================================================================

export async function createJournalEntry(data: {
  voucherType: "JOURNAL" | "CONTRA" | "PAYMENT" | "RECEIPT" | "SALES" | "PURCHASE" | "CREDIT_NOTE" | "DEBIT_NOTE";
  date?: string;
  narration: string;
  referenceNumber?: string;
  lines: {
    ledgerAccountId: string;
    debit: number;
    credit: number;
    particulars?: string;
  }[];
}) {
  const organizationId = await getAuthOrgId();
  if (!organizationId) return { success: false, error: "Unauthorized" };

  if (!data.lines || data.lines.length < 2) {
    return { success: false, error: "A double-entry voucher must contain at least 2 line items." };
  }

  const totalDebit = Number(data.lines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0).toFixed(2));
  const totalCredit = Number(data.lines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0).toFixed(2));

  if (totalDebit <= 0 || totalCredit <= 0) {
    return { success: false, error: "Voucher amounts must be greater than zero." };
  }

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    return {
      success: false,
      error: `Accounting Equation Mismatch: Total Debit (₹${totalDebit}) must equal Total Credit (₹${totalCredit}). Difference: ₹${(totalDebit - totalCredit).toFixed(2)}`
    };
  }

  try {
    const count = await prisma.journalEntry.count({ where: { organizationId, voucherType: data.voucherType } });
    const prefix = data.voucherType === "CONTRA" ? "CNT" : data.voucherType === "PAYMENT" ? "PMT" : data.voucherType === "RECEIPT" ? "RCP" : "JV";
    const voucherNumber = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    const journal = await prisma.journalEntry.create({
      data: {
        organizationId,
        voucherNumber,
        voucherType: data.voucherType,
        date: data.date ? new Date(data.date) : new Date(),
        narration: data.narration.trim(),
        referenceNumber: data.referenceNumber?.trim() || null,
        totalAmount: totalDebit,
        status: "POSTED",
        isSystemGenerated: false,
        createdBy: "Admin",
        lines: {
          create: data.lines.map(l => ({
            ledgerAccountId: l.ledgerAccountId,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            particulars: l.particulars?.trim() || null
          }))
        }
      },
      include: {
        lines: { include: { ledgerAccount: true } }
      }
    });

    // Recalculate and synchronize all ledger balances accurately
    await syncSystemLedgers();

    revalidatePath("/accounting", "layout");
    return { success: true, journal: JSON.parse(JSON.stringify(journal)) };
  } catch (error: any) {
    console.error("Error creating journal voucher:", error);
    return { success: false, error: error.message || "Failed to create journal voucher" };
  }
}

export async function getJournalEntries(filters?: {
  voucherType?: string;
  startDate?: string;
  endDate?: string;
  ledgerAccountId?: string;
  search?: string;
}) {
  const organizationId = await getAuthOrgId();
  if (!organizationId) return { success: false, error: "Unauthorized" };

  try {
    await syncSystemLedgers();

    const where: any = { organizationId };

    if (filters?.voucherType && filters.voucherType !== "ALL") {
      where.voucherType = filters.voucherType;
    }

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    if (filters?.ledgerAccountId) {
      where.lines = {
        some: { ledgerAccountId: filters.ledgerAccountId }
      };
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { voucherNumber: { contains: q, mode: "insensitive" } },
        { narration: { contains: q, mode: "insensitive" } },
        { referenceNumber: { contains: q, mode: "insensitive" } }
      ];
    }

    const vouchers = await prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: { ledgerAccount: { include: { accountGroup: true } } }
        }
      },
      orderBy: { date: "desc" },
      take: 200
    });

    return { success: true, vouchers: JSON.parse(JSON.stringify(vouchers)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 4. FINANCIAL STATEMENTS: TRIAL BALANCE, P&L, BALANCE SHEET, DAY BOOK
// ============================================================================

export async function getTrialBalance(asOfDateStr?: string) {
  const organizationId = await getAuthOrgId();
  if (!organizationId) return { success: false, error: "Unauthorized" };

  try {
    const asOfDate = asOfDateStr ? new Date(asOfDateStr) : new Date();
    asOfDate.setHours(23, 59, 59, 999);

    // Sync ledgers first to ensure all transactions are represented
    await syncSystemLedgers();

    const ledgers = await prisma.ledgerAccount.findMany({
      where: { OR: [{ organizationId }, { organizationId: null }] },
      include: {
        accountGroup: true,
        journalLineItems: {
          where: {
            journalEntry: {
              date: { lte: asOfDate },
              status: "POSTED"
            }
          }
        }
      },
      orderBy: [{ accountGroup: { sequence: "asc" } }, { name: "asc" }]
    });

    let totalDebit = 0;
    let totalCredit = 0;

    const rows = ledgers.map(l => {
      const openBal = l.openingBalance || 0;
      const isOpeningDebit = l.openingType !== "CREDIT";
      const openDr = isOpeningDebit ? openBal : 0;
      const openCr = isOpeningDebit ? 0 : openBal;

      const txDr = l.journalLineItems.reduce((acc, item) => acc + (item.debit || 0), 0);
      const txCr = l.journalLineItems.reduce((acc, item) => acc + (item.credit || 0), 0);

      const netBalance = (openDr + txDr) - (openCr + txCr);
      const closingDebit = netBalance > 0 ? Number(netBalance.toFixed(2)) : 0;
      const closingCredit = netBalance < 0 ? Number(Math.abs(netBalance).toFixed(2)) : 0;

      totalDebit += closingDebit;
      totalCredit += closingCredit;

      return {
        id: l.id,
        code: l.code,
        name: l.name,
        groupName: l.accountGroup?.name || "General",
        nature: l.accountGroup?.nature || "ASSET",
        openingDebit: openDr,
        openingCredit: openCr,
        transactionDebit: Number(txDr.toFixed(2)),
        transactionCredit: Number(txCr.toFixed(2)),
        closingDebit,
        closingCredit
      };
    }).filter(r => r.closingDebit > 0 || r.closingCredit > 0 || r.transactionDebit > 0 || r.transactionCredit > 0);

    // Dynamic Opening Balance Equity balancing row if net opening balance exists across subledgers
    const diff = Number((totalDebit - totalCredit).toFixed(2));
    if (Math.abs(diff) > 0.001) {
      if (diff > 0) {
        // Debits exceed credits: Add Opening Balance Equity on Credit side
        rows.push({
          id: "SYS_OPENING_EQUITY_DIFF",
          code: "SYS_OPENING_EQUITY",
          name: "Opening Balance Equity (Offset)",
          groupName: "Capital Account",
          nature: "LIABILITY",
          openingDebit: 0,
          openingCredit: diff,
          transactionDebit: 0,
          transactionCredit: 0,
          closingDebit: 0,
          closingCredit: diff
        });
        totalCredit += diff;
      } else {
        // Credits exceed debits: Add Opening Balance Equity on Debit side
        const absDiff = Math.abs(diff);
        rows.push({
          id: "SYS_OPENING_EQUITY_DIFF",
          code: "SYS_OPENING_EQUITY",
          name: "Opening Balance Equity (Offset)",
          groupName: "Capital Account",
          nature: "ASSET",
          openingDebit: absDiff,
          openingCredit: 0,
          transactionDebit: 0,
          transactionCredit: 0,
          closingDebit: absDiff,
          closingCredit: 0
        });
        totalDebit += absDiff;
      }
    }

    return {
      success: true,
      asOfDate: asOfDate.toISOString().split("T")[0],
      totalDebit: Number(totalDebit.toFixed(2)),
      totalCredit: Number(totalCredit.toFixed(2)),
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      rows
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to calculate Trial Balance" };
  }
}

export async function getProfitAndLossStatement(startDateStr?: string, endDateStr?: string) {
  const organizationId = await getAuthOrgId();
  if (!organizationId) return { success: false, error: "Unauthorized" };

  try {
    const now = new Date();
    const currentFYStart = now.getMonth() >= 3 ? new Date(now.getFullYear(), 3, 1) : new Date(now.getFullYear() - 1, 3, 1);
    
    const startDate = startDateStr ? new Date(startDateStr) : currentFYStart;
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    endDate.setHours(23, 59, 59, 999);

    // 1. Direct Income / Sales Revenue (Gross Sales minus Sales Returns / Credit Notes)
    const [salesInvoices, creditNotes] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          organizationId,
          invoiceDate: { gte: startDate, lte: endDate },
          status: { not: "Cancelled" }
        }
      }),
      prisma.creditNote.findMany({
        where: {
          organizationId,
          creditNoteDate: { gte: startDate, lte: endDate },
          status: { not: "CANCELLED" }
        }
      })
    ]);

    const totalSalesGross = salesInvoices.reduce((acc, i) => acc + (i.subtotal || (i.totalAmount - (i.taxAmount || 0))), 0);
    const totalSalesReturns = creditNotes.reduce((acc, c) => acc + (c.subtotal || (c.totalAmount - (c.taxAmount || 0))), 0);
    
    // Roundoff/TCS adjustments on sales
    const totalSalesRoundoff = salesInvoices.reduce((acc, i) => {
      const tax = i.taxAmount || 0;
      const sub = i.subtotal || (i.totalAmount - tax);
      const diff = i.totalAmount - (sub + tax);
      return acc + (diff > 0 ? diff : 0);
    }, 0);

    const totalRevenue = Math.max(0, Number((totalSalesGross + totalSalesRoundoff - totalSalesReturns).toFixed(2)));

    // 2. Direct Purchases & Procurement (Gross Purchases minus Purchase Returns / Vendor Credits)
    const [purchaseBills, vendorCredits] = await Promise.all([
      prisma.bill.findMany({
        where: {
          organizationId,
          billDate: { gte: startDate, lte: endDate },
          status: { not: "Void" }
        }
      }),
      prisma.vendorCredit.findMany({
        where: {
          vendor: { organizationId },
          creditDate: { gte: startDate, lte: endDate },
          status: { in: ["Open", "Applied", "Closed"] }
        }
      })
    ]);

    const totalPurchasesGross = purchaseBills.reduce((acc, b) => acc + (b.subtotal || (b.totalAmount - (b.taxAmount || 0))), 0);
    const totalPurchaseReturns = vendorCredits.reduce((acc, vc) => acc + (vc.subtotal || (vc.totalAmount - (vc.taxAmount || 0))), 0);
    const totalPurchases = Math.max(0, Number((totalPurchasesGross - totalPurchaseReturns).toFixed(2)));

    // 3. Physical Inventory Stock & COGS
    const products = await prisma.product.findMany({ where: { organizationId } });
    const closingStockValue = Number(products.reduce((acc, p) => {
      const cost = (p.purchasePrice && p.purchasePrice > 0)
        ? p.purchasePrice
        : (p.sellingPrice ? p.sellingPrice * 0.7 : 0);
      return acc + ((p.stockQuantity || 0) * cost);
    }, 0).toFixed(2));

    // Calculate COGS from sold order items
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          invoices: {
            some: {
              organizationId,
              invoiceDate: { gte: startDate, lte: endDate },
              status: { not: "Cancelled" }
            }
          }
        }
      },
      include: { product: true }
    });

    let calculatedCogs = 0;
    for (const item of orderItems) {
      const cost = item.product?.purchasePrice || (item.product?.sellingPrice ? item.product.sellingPrice * 0.7 : item.rate * 0.7);
      calculatedCogs += (item.quantity || 1) * cost;
    }

    const cogs = Number(calculatedCogs.toFixed(2));
    const openingStock = Math.max(0, Number((closingStockValue + cogs - totalPurchases).toFixed(2)));
    const grossProfit = Number((totalRevenue - cogs).toFixed(2));

    // 4. Indirect Expenses (Operating Overheads, Payroll, Admin)
    const [expenses, salaries] = await Promise.all([
      prisma.expense.findMany({
        where: {
          OR: [
            { employee: { organizationId } },
            { employeeId: null }
          ],
          date: { gte: startDate, lte: endDate },
          status: { not: "Rejected" }
        }
      }),
      prisma.salary.findMany({
        where: {
          employee: { organizationId },
          status: { in: ["Processed", "Paid"] },
          createdAt: { gte: startDate, lte: endDate }
        }
      })
    ]);

    const totalPayroll = salaries.reduce((acc, s) => acc + s.netSalary, 0);

    // Categorized expense breakdown
    const groupedExpenses: Record<string, number> = {};
    if (totalPayroll > 0) {
      groupedExpenses["Employee Salaries & Payroll"] = totalPayroll;
    }

    expenses.forEach(e => {
      const cat = e.category || "General & Administrative";
      groupedExpenses[cat] = (groupedExpenses[cat] || 0) + e.amount;
    });

    const totalIndirectExpenses = Object.values(groupedExpenses).reduce((a, b) => a + b, 0);
    const netProfit = Number((grossProfit - totalIndirectExpenses).toFixed(2));

    return {
      success: true,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      tradingAccount: {
        salesRevenue: Number(totalRevenue.toFixed(2)),
        grossSales: Number((totalSalesGross + totalSalesRoundoff).toFixed(2)),
        salesReturns: Number(totalSalesReturns.toFixed(2)),
        openingStock: Number(openingStock.toFixed(2)),
        purchases: Number(totalPurchases.toFixed(2)),
        grossPurchases: Number(totalPurchasesGross.toFixed(2)),
        purchaseReturns: Number(totalPurchaseReturns.toFixed(2)),
        closingStock: Number(closingStockValue.toFixed(2)),
        costOfGoodsSold: Number(cogs.toFixed(2)),
        grossProfit: Number(grossProfit.toFixed(2))
      },
      incomeStatement: {
        grossProfit: Number(grossProfit.toFixed(2)),
        indirectExpenses: Object.entries(groupedExpenses).map(([category, amount]) => ({ category, amount: Number(amount.toFixed(2)) })),
        totalIndirectExpenses: Number(totalIndirectExpenses.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
        isProfitable: netProfit >= 0
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate P&L statement" };
  }
}

export async function getBalanceSheet(asOfDateStr?: string) {
  const organizationId = await getAuthOrgId();
  if (!organizationId) return { success: false, error: "Unauthorized" };

  try {
    const asOfDate = asOfDateStr ? new Date(asOfDateStr) : new Date();
    asOfDate.setHours(23, 59, 59, 999);

    // Synchronize all double-entry ledgers first
    await syncSystemLedgers();

    // 1. Fetch Profit & Loss to get accurate Net Profit / (Loss) for Reserves & Surplus
    const plRes = await getProfitAndLossStatement(undefined, asOfDate.toISOString());
    const netProfit = (plRes.success && (plRes as any).incomeStatement)
      ? (plRes as any).incomeStatement.netProfit
      : 0;

    // 2. Fetch all Ledgers with their posted line items up to asOfDate
    const ledgers = await prisma.ledgerAccount.findMany({
      where: { OR: [{ organizationId }, { organizationId: null }] },
      include: {
        accountGroup: true,
        journalLineItems: {
          where: {
            journalEntry: {
              date: { lte: asOfDate },
              status: "POSTED"
            }
          }
        }
      }
    });

    // Helper to calculate ledger net balance at asOfDate
    const getLedgerNet = (l: typeof ledgers[0]) => {
      const openDr = l.openingType !== "CREDIT" ? (l.openingBalance || 0) : 0;
      const openCr = l.openingType === "CREDIT" ? (l.openingBalance || 0) : 0;
      const txDr = l.journalLineItems.reduce((acc, item) => acc + (item.debit || 0), 0);
      const txCr = l.journalLineItems.reduce((acc, item) => acc + (item.credit || 0), 0);
      return (openDr + txDr) - (openCr + txCr); // Positive = Net Debit (Asset/Expense), Negative = Net Credit (Liability/Income)
    };

    // Helper: calculate physical inventory / stock in hand
    const products = await prisma.product.findMany({ where: { organizationId } });
    const stockInHand = Number(products.reduce((acc, p) => {
      const cost = p.purchasePrice && p.purchasePrice > 0
        ? p.purchasePrice
        : (p.sellingPrice ? p.sellingPrice * 0.7 : 0);
      return acc + ((p.stockQuantity || 0) * cost);
    }, 0).toFixed(2));

    // A. NON-CURRENT / FIXED ASSETS
    const fixedAssetLedgers = ledgers.filter(l => l.accountGroup?.code === "FIXED_ASSETS" || l.accountGroup?.parentGroupId === "FIXED_ASSETS");
    const fixedAssetsList = fixedAssetLedgers.map(l => {
      const net = getLedgerNet(l);
      return { name: l.name, amount: Number(Math.max(0, net).toFixed(2)) };
    }).filter(a => a.amount > 0);

    const totalFixedAssets = Number(fixedAssetsList.reduce((s, a) => s + a.amount, 0).toFixed(2));

    // B. CURRENT ASSETS
    // 1. Sundry Debtors (Customers with Net Debit balance)
    const customerLedgers = ledgers.filter(l => l.partyType === "CUSTOMER" || l.accountGroup?.code === "SUNDRY_DEBTORS");
    const totalDebtors = Number(customerLedgers.reduce((acc, l) => {
      const net = getLedgerNet(l);
      return acc + (net > 0 ? net : 0);
    }, 0).toFixed(2));

    // 2. Bank & Cash Balances
    const bankAndCashLedgers = ledgers.filter(l => 
      l.partyType === "BANK" || 
      l.partyType === "CASH" || 
      l.accountGroup?.code === "BANK_ACCOUNTS" || 
      l.accountGroup?.code === "CASH_IN_HAND"
    );
    const totalBankCash = Number(bankAndCashLedgers.reduce((acc, l) => {
      const net = getLedgerNet(l);
      return acc + (net > 0 ? net : 0);
    }, 0).toFixed(2));

    // 3. Tax / Duties Balances
    const taxLedgers = ledgers.filter(l => l.partyType === "TAX" || l.accountGroup?.code === "DUTIES_TAXES");
    const outTax = taxLedgers.filter(l => l.code?.startsWith("SYS_OUT_")).reduce((s, l) => s + Math.max(0, -getLedgerNet(l)), 0);
    const inTax = taxLedgers.filter(l => l.code?.startsWith("SYS_IN_")).reduce((s, l) => s + Math.max(0, getLedgerNet(l)), 0);
    const tdsPayable = taxLedgers.filter(l => l.code === "SYS_TDS_PAYABLE").reduce((s, l) => s + Math.max(0, -getLedgerNet(l)), 0);

    const netTaxDifference = outTax - inTax; // Positive => Net GST Payable (Liability), Negative => Net GST Credit (Asset)
    const gstInputCreditAsset = netTaxDifference < 0 ? Number(Math.abs(netTaxDifference).toFixed(2)) : 0;
    const netGstPayableLiability = netTaxDifference > 0 ? Number(netTaxDifference.toFixed(2)) : 0;

    // 4. Other Current Assets / Advances
    const otherAssetLedgers = ledgers.filter(l => 
      (l.accountGroup?.code === "LOANS_ADV_ASSET" || l.accountGroup?.code === "CURR_ASSET") &&
      !bankAndCashLedgers.includes(l) &&
      !customerLedgers.includes(l) &&
      !taxLedgers.includes(l)
    );
    const otherAssetsTotal = Number(otherAssetLedgers.reduce((acc, l) => {
      const net = getLedgerNet(l);
      return acc + (net > 0 ? net : 0);
    }, 0).toFixed(2));

    const currentAssetsList = [
      { name: "Sundry Debtors (Accounts Receivable)", amount: totalDebtors },
      { name: "Stock-in-Hand (Finished Goods & Inventory)", amount: stockInHand },
      { name: "Bank & Cash Balances", amount: totalBankCash },
      ...(gstInputCreditAsset > 0 ? [{ name: "GST Input Tax Credit (ITC Receivable)", amount: gstInputCreditAsset }] : []),
      ...(otherAssetsTotal > 0 ? [{ name: "Loans, Advances & Other Current Assets", amount: otherAssetsTotal }] : [])
    ];

    const totalCurrentAssets = Number(currentAssetsList.reduce((s, a) => s + a.amount, 0).toFixed(2));
    const totalAssets = Number((totalFixedAssets + totalCurrentAssets).toFixed(2));

    // C. CURRENT LIABILITIES
    // 1. Sundry Creditors (Vendors with Net Credit balance)
    const vendorLedgers = ledgers.filter(l => l.partyType === "VENDOR" || l.accountGroup?.code === "SUNDRY_CREDITORS");
    const totalCreditors = Number(vendorLedgers.reduce((acc, l) => {
      const net = getLedgerNet(l);
      return acc + (net < 0 ? Math.abs(net) : 0);
    }, 0).toFixed(2));

    // 2. Customer Advances (Customers with Net Credit balance)
    const customerAdvances = Number(customerLedgers.reduce((acc, l) => {
      const net = getLedgerNet(l);
      return acc + (net < 0 ? Math.abs(net) : 0);
    }, 0).toFixed(2));

    // 3. Duties & Taxes Payable
    const totalDutiesTaxesPayable = Number((netGstPayableLiability + tdsPayable).toFixed(2));

    // 4. Provisions & Loans
    const loanLedgers = ledgers.filter(l => l.accountGroup?.code === "LOANS_LIAB" || l.accountGroup?.code === "PROVISIONS");
    const totalLoansAndProvisions = Number(loanLedgers.reduce((acc, l) => {
      const net = getLedgerNet(l);
      return acc + (net < 0 ? Math.abs(net) : 0);
    }, 0).toFixed(2));

    const currentLiabilitiesList = [
      { name: "Sundry Creditors (Accounts Payable)", amount: totalCreditors },
      { name: "Duties & Taxes (Net GST & TDS Payable)", amount: totalDutiesTaxesPayable },
      ...(customerAdvances > 0 ? [{ name: "Customer Advance Balances", amount: customerAdvances }] : []),
      ...(totalLoansAndProvisions > 0 ? [{ name: "Loans, Borrowings & Provisions", amount: totalLoansAndProvisions }] : [])
    ];

    const totalCurrentLiabilities = Number(currentLiabilitiesList.reduce((s, l) => s + l.amount, 0).toFixed(2));

    // D. SHAREHOLDERS' / OWNER'S FUNDS
    // Real Capital Account
    const capitalLedgers = ledgers.filter(l => l.accountGroup?.code === "CAPITAL_ACCT");
    const recordedCapital = capitalLedgers.reduce((acc, l) => {
      const net = getLedgerNet(l);
      return acc + (net < 0 ? Math.abs(net) : -net);
    }, 0);

    // Starting Proprietor Equity = Total Assets - Total Liabilities - Current Net Profit
    const baseProprietorCapital = Number((totalAssets - totalCurrentLiabilities - netProfit).toFixed(2));
    const finalCapital = recordedCapital > 0 ? Number(recordedCapital.toFixed(2)) : Math.max(0, baseProprietorCapital);

    const reservesAndSurplus = Number(netProfit.toFixed(2));
    const totalEquity = Number((finalCapital + reservesAndSurplus).toFixed(2));
    const totalLiabilitiesAndEquity = Number((totalCurrentLiabilities + totalEquity).toFixed(2));

    return {
      success: true,
      asOfDate: asOfDate.toISOString().split("T")[0],
      assets: {
        fixedAssets: fixedAssetsList.length > 0 ? fixedAssetsList : [{ name: "Plant, Equipment & Computers", amount: 0 }],
        totalFixedAssets,
        currentAssets: currentAssetsList,
        totalCurrentAssets,
        totalAssets
      },
      liabilities: {
        currentLiabilities: currentLiabilitiesList,
        totalCurrentLiabilities,
        capitalAndEquity: [
          { name: "Proprietor / Shareholder Capital", amount: finalCapital },
          { name: "Profit & Loss (Reserves & Surplus / Net Profit)", amount: reservesAndSurplus }
        ],
        totalEquity,
        totalLiabilitiesAndEquity
      },
      isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1.0
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate Balance Sheet" };
  }
}

export async function getDayBook(dateStr?: string) {
  const organizationId = await getAuthOrgId();
  if (!organizationId) return { success: false, error: "Unauthorized" };

  try {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [vouchers, invoices, bills, payments, vendorPayments, expenses, creditNotes] = await Promise.all([
      prisma.journalEntry.findMany({
        where: { organizationId, date: { gte: startOfDay, lte: endOfDay } },
        include: { lines: { include: { ledgerAccount: true } } }
      }),
      prisma.invoice.findMany({
        where: { organizationId, invoiceDate: { gte: startOfDay, lte: endOfDay }, status: { not: "Cancelled" } },
        include: { customer: true }
      }),
      prisma.bill.findMany({
        where: { organizationId, billDate: { gte: startOfDay, lte: endOfDay }, status: { not: "Void" } },
        include: { vendor: true }
      }),
      prisma.payment.findMany({
        where: {
          OR: [
            { customer: { organizationId } },
            { invoice: { organizationId } }
          ],
          paymentDate: { gte: startOfDay, lte: endOfDay },
          status: { in: ["Completed", "Processed"] }
        },
        include: { customer: true, invoice: true }
      }),
      prisma.vendorPayment.findMany({
        where: {
          vendor: { organizationId },
          paymentDate: { gte: startOfDay, lte: endOfDay },
          status: { in: ["Completed", "Processed"] }
        },
        include: { vendor: true, bill: true }
      }),
      prisma.expense.findMany({
        where: {
          OR: [
            { employee: { organizationId } },
            { employeeId: null }
          ],
          date: { gte: startOfDay, lte: endOfDay },
          status: { not: "Rejected" }
        }
      }),
      prisma.creditNote.findMany({
        where: {
          organizationId,
          creditNoteDate: { gte: startOfDay, lte: endOfDay },
          status: { not: "CANCELLED" }
        },
        include: { customer: true }
      })
    ]);

    const allEvents: any[] = [];

    // Add Sales Invoices
    invoices.forEach(inv => {
      allEvents.push({
        id: `inv-${inv.id}`,
        time: inv.createdAt,
        type: "SALES",
        voucherNumber: inv.invoiceNumber,
        particulars: inv.customer?.businessName || "Customer",
        amount: inv.totalAmount,
        notes: `Sales Invoice generated (${inv.status})`
      });
    });

    // Add Purchase Bills
    bills.forEach(b => {
      allEvents.push({
        id: `bill-${b.id}`,
        time: b.createdAt,
        type: "PURCHASE",
        voucherNumber: b.billNumber,
        particulars: b.vendor?.companyName || "Vendor",
        amount: b.totalAmount,
        notes: `Purchase Bill received (${b.status})`
      });
    });

    // Add Receipts
    payments.forEach(p => {
      allEvents.push({
        id: `pay-${p.id}`,
        time: p.paymentDate,
        type: "RECEIPT",
        voucherNumber: p.paymentNumber,
        particulars: p.customer?.businessName || p.payerName || "Customer",
        amount: p.amount,
        notes: `Payment Received via ${p.paymentMode}`
      });
    });

    // Add Vendor Payments
    vendorPayments.forEach(vp => {
      allEvents.push({
        id: `vpay-${vp.id}`,
        time: vp.paymentDate,
        type: "PAYMENT",
        voucherNumber: vp.paymentNumber,
        particulars: vp.vendor?.companyName || "Vendor",
        amount: vp.amount,
        notes: `Payment Paid to Vendor via ${vp.paymentMode}`
      });
    });

    // Add General & Operational Expenses
    expenses.forEach(exp => {
      allEvents.push({
        id: `exp-${exp.id}`,
        time: exp.date,
        type: "EXPENSE",
        voucherNumber: exp.expenseNumber,
        particulars: `Expense: ${exp.category}`,
        amount: exp.amount,
        notes: exp.description ? (typeof exp.description === "string" ? exp.description.slice(0, 50) : "") : "Operational Expense"
      });
    });

    // Add Credit Notes (Sales Returns)
    creditNotes.forEach(cn => {
      allEvents.push({
        id: `cn-${cn.id}`,
        time: cn.creditNoteDate,
        type: "CREDIT_NOTE",
        voucherNumber: cn.creditNoteNumber,
        particulars: cn.customer?.businessName || "Customer",
        amount: cn.totalAmount,
        notes: `Credit Note issued (${cn.reason})`
      });
    });

    // Add Manual Journal Vouchers
    vouchers.forEach(v => {
      if (!v.isSystemGenerated) {
        allEvents.push({
          id: `jv-${v.id}`,
          time: v.date,
          type: v.voucherType,
          voucherNumber: v.voucherNumber,
          particulars: v.narration || "Journal Voucher",
          amount: v.totalAmount,
          notes: `Journal Entry with ${v.lines.length} splits`
        });
      }
    });

    allEvents.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const totalInflow = Number(payments.reduce((a, b) => a + b.amount, 0).toFixed(2));
    const totalOutflow = Number((vendorPayments.reduce((a, b) => a + b.amount, 0) + expenses.reduce((a, b) => a + b.amount, 0)).toFixed(2));

    return {
      success: true,
      date: targetDate.toISOString().split("T")[0],
      events: allEvents,
      summary: {
        totalVouchers: allEvents.length,
        totalSales: Number(invoices.reduce((a, b) => a + b.totalAmount, 0).toFixed(2)),
        totalPurchases: Number(bills.reduce((a, b) => a + b.totalAmount, 0).toFixed(2)),
        totalInflow,
        totalOutflow,
        netCashFlow: Number((totalInflow - totalOutflow).toFixed(2))
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
