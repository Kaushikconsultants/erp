"use server";

import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import {
  getBalanceSheet,
  getProfitAndLossStatement,
  getTrialBalance,
  getDayBook,
  syncSystemLedgers,
  createLedgerAccount
} from "./accountingActions";

export interface VoiceAssistantResponse {
  spokenText: string;
  actionText: string;
  route?: string;
  cardType?: 'BALANCE_SHEET' | 'CUSTOMER' | 'ORDER' | 'STOCK' | 'PAYROLL' | 'EXPENSE' | 'NAVIGATION' | 'GENERAL';
  cardData?: any;
  success: boolean;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });

/**
 * Main Universal Voice AI Command Processor
 */
export async function executeVoiceCommand(spokenText: string): Promise<VoiceAssistantResponse> {
  if (!spokenText || !spokenText.trim()) {
    return {
      spokenText: "I didn't catch that. Please speak your command or question.",
      actionText: "No speech detected",
      success: false
    };
  }

  const raw = spokenText.trim();
  const lower = raw.toLowerCase();

  try {
    let organizationId: string | null = null;
    try {
      organizationId = await getTenantOrgId();
    } catch {
      const defaultOrg = await prisma.organization.findFirst();
      organizationId = defaultOrg?.id || null;
    }
    if (!organizationId) {
      const defaultOrg = await prisma.organization.findFirst();
      organizationId = defaultOrg?.id || null;
    }

    // ========================================================================
    // 1. FAST-PATH DETERMINISTIC ENGINE (Instant response <50ms)
    // ========================================================================

    // A. BALANCE SHEET & FINANCIAL POSITION
    if (lower.includes("balance sheet") || lower.includes("total assets") || lower.includes("total liabilities") || lower.includes("balance match")) {
      const bsRes = await getBalanceSheet();
      if (bsRes.success) {
        const bs = bsRes as any;
        const totalAssets = bs.assets?.totalAssets || 0;
        const totalLiabEquity = bs.liabilities?.totalLiabilitiesAndEquity || 0;
        const isBalanced = bs.isBalanced;
        const debtors = bs.assets?.currentAssets?.find((a: any) => a.name.includes("Debtors"))?.amount || 0;
        const bankCash = bs.assets?.currentAssets?.find((a: any) => a.name.includes("Bank"))?.amount || 0;
        const stock = bs.assets?.currentAssets?.find((a: any) => a.name.includes("Stock"))?.amount || 0;

        return {
          success: true,
          spokenText: `Your Balance Sheet is ${isBalanced ? 'balanced perfectly' : 'calculated'}. Total Assets are ₹${totalAssets.toLocaleString('en-IN')}, including ₹${debtors.toLocaleString('en-IN')} in debtors, ₹${stock.toLocaleString('en-IN')} in stock, and ₹${bankCash.toLocaleString('en-IN')} in bank balances.`,
          actionText: "Balance Sheet Summary (Schedule III)",
          route: "/accounting/balance-sheet",
          cardType: "BALANCE_SHEET",
          cardData: {
            asOfDate: bs.asOfDate,
            totalAssets,
            totalLiabilitiesAndEquity: totalLiabEquity,
            debtors,
            bankCash,
            stock,
            isBalanced
          }
        };
      }
    }

    // B. PROFIT & LOSS / NET PROFIT / REVENUE
    if (lower.includes("profit") || lower.includes("revenue") || lower.includes("income") || lower.includes("turnover") || lower.includes("munafa") || lower.includes("kamai")) {
      const plRes = await getProfitAndLossStatement();
      if (plRes.success) {
        const pl = plRes as any;
        const netProfit = pl.incomeStatement?.netProfit || 0;
        const grossSales = pl.tradingAccount?.salesRevenue || 0;
        const grossProfit = pl.tradingAccount?.grossProfit || 0;
        const expenses = pl.incomeStatement?.totalIndirectExpenses || 0;

        return {
          success: true,
          spokenText: `Your Net Profit is ₹${netProfit.toLocaleString('en-IN')}. Gross sales revenue is ₹${grossSales.toLocaleString('en-IN')} with gross profit of ₹${grossProfit.toLocaleString('en-IN')} and expenses of ₹${expenses.toLocaleString('en-IN')}.`,
          actionText: "Profit & Loss Statement",
          route: "/accounting/profit-loss",
          cardType: "GENERAL",
          cardData: {
            title: "Profit & Loss Summary",
            metrics: [
              { label: "Gross Sales", value: `₹${grossSales.toLocaleString('en-IN')}` },
              { label: "Gross Profit", value: `₹${grossProfit.toLocaleString('en-IN')}` },
              { label: "Total Overheads", value: `₹${expenses.toLocaleString('en-IN')}` },
              { label: "Net Profit", value: `₹${netProfit.toLocaleString('en-IN')}`, highlight: true }
            ]
          }
        };
      }
    }

    // C. BANK & CASH BALANCES
    if (lower.includes("bank") || lower.includes("cash") || lower.includes("paisa") || lower.includes("khata")) {
      await syncSystemLedgers();
      const bankLedgers = organizationId ? await prisma.ledgerAccount.findMany({
        where: {
          organizationId,
          OR: [{ partyType: "BANK" }, { partyType: "CASH" }, { code: "SYS_CASH" }]
        }
      }) : [];

      const totalCashBank = bankLedgers.reduce((s, l) => s + (l.currentBalance || 0), 0);
      const accountsSummary = bankLedgers.map(l => `${l.name}: ₹${(l.currentBalance || 0).toLocaleString('en-IN')}`).join(", ");

      return {
        success: true,
        spokenText: `You have a total of ₹${totalCashBank.toLocaleString('en-IN')} in liquid funds across your bank and cash accounts. ${accountsSummary}.`,
        actionText: "Bank & Cash Accounts",
        route: "/accounting/chart-of-accounts",
        cardType: "GENERAL",
        cardData: {
          title: "Bank & Cash Ledgers",
          metrics: bankLedgers.map(l => ({ label: l.name, value: `₹${(l.currentBalance || 0).toLocaleString('en-IN')}` }))
        }
      };
    }

    // D. SUNDRY DEBTORS (CUSTOMERS WHO OWE MONEY)
    if (lower.includes("debtor") || lower.includes("receivable") || lower.includes("who owes") || lower.includes("lena hai") || lower.includes("customer balance")) {
      if (organizationId) {
        const invoices = await prisma.invoice.findMany({
          where: { organizationId, status: { notIn: ["Paid", "Cancelled"] }, amountDue: { gt: 0 } },
          include: { customer: true },
          take: 5
        });
        const totalDue = invoices.reduce((s, i) => s + (i.amountDue || (i.totalAmount - (i.amountPaid || 0))), 0);

        return {
          success: true,
          spokenText: `Total outstanding receivables from Sundry Debtors are ₹${totalDue.toLocaleString('en-IN')}. ${invoices.length > 0 ? `Top pending invoice is from ${invoices[0].customer?.businessName} for ₹${invoices[0].amountDue}.` : 'All customer accounts are clear.'}`,
          actionText: "Receivables & Debtors Ageing",
          route: "/accounting/ageing",
          cardType: "CUSTOMER",
          cardData: {
            title: "Outstanding Receivables",
            totalDue,
            items: invoices.map(i => ({
              party: i.customer?.businessName || "Customer",
              amount: i.amountDue,
              invNumber: i.invoiceNumber
            }))
          }
        };
      }
    }

    // E. SUNDRY CREDITORS (VENDORS TO PAY)
    if (lower.includes("creditor") || lower.includes("payable") || lower.includes("who do we owe") || lower.includes("dena hai") || lower.includes("vendor balance")) {
      if (organizationId) {
        const bills = await prisma.bill.findMany({
          where: { organizationId, status: { notIn: ["Paid", "Void"] }, amountDue: { gt: 0 } },
          include: { vendor: true },
          take: 5
        });
        const totalPayable = bills.reduce((s, b) => s + (b.amountDue || (b.totalAmount - (b.amountPaid || 0))), 0);

        return {
          success: true,
          spokenText: `Total outstanding payables to Sundry Creditors are ₹${totalPayable.toLocaleString('en-IN')}.`,
          actionText: "Payables & Creditors Ageing",
          route: "/accounting/ageing",
          cardType: "GENERAL",
          cardData: {
            title: "Outstanding Vendor Payables",
            metrics: [
              { label: "Total Payable", value: `₹${totalPayable.toLocaleString('en-IN')}` },
              ...bills.map(b => ({ label: b.vendor?.companyName || "Vendor", value: `₹${b.amountDue.toLocaleString('en-IN')}` }))
            ]
          }
        };
      }
    }

    // F. INVENTORY & STOCK LEVELS
    if (lower.includes("stock") || lower.includes("inventory") || lower.includes("mal") || lower.includes("quantity") || lower.includes("godown")) {
      if (organizationId) {
        const products = await prisma.product.findMany({ where: { organizationId } });
        const lowStock = products.filter(p => (p.stockQuantity || 0) <= (p.minimumStock || 10));
        const totalQty = products.reduce((s, p) => s + (p.stockQuantity || 0), 0);

        // Check if specific product mentioned
        const specificProd = products.find(p => lower.includes(p.name.toLowerCase()) || (p.sku && lower.includes(p.sku.toLowerCase())));

        if (specificProd) {
          return {
            success: true,
            spokenText: `We have ${specificProd.stockQuantity} units of ${specificProd.name} in stock at ₹${specificProd.sellingPrice} selling price.`,
            actionText: `Stock Details: ${specificProd.name}`,
            route: `/products?search=${encodeURIComponent(specificProd.name)}`,
            cardType: "STOCK",
            cardData: {
              productName: specificProd.name,
              sku: specificProd.sku || "N/A",
              stockQuantity: specificProd.stockQuantity,
              sellingPrice: specificProd.sellingPrice,
              purchasePrice: specificProd.purchasePrice
            }
          };
        }

        return {
          success: true,
          spokenText: `You have ${totalQty} total units in stock across ${products.length} products. ${lowStock.length > 0 ? `Warning: ${lowStock.length} items are at or below minimum reorder level.` : 'All stock levels are healthy.'}`,
          actionText: "Inventory & Stock Levels",
          route: "/products",
          cardType: "STOCK",
          cardData: {
            totalProducts: products.length,
            totalUnits: totalQty,
            lowStockCount: lowStock.length,
            lowStockItems: lowStock.slice(0, 5).map(p => ({ name: p.name, stock: p.stockQuantity, min: p.minimumStock }))
          }
        };
      }
    }

    // G. PAYROLL & SALARIES
    if (lower.includes("payroll") || lower.includes("salary") || lower.includes("salaries") || lower.includes("incentive") || lower.includes("tankhwah")) {
      if (organizationId) {
        const employees = await prisma.employee.findMany({
          where: { organizationId },
          include: { user: true, salaries: { take: 1, orderBy: { createdAt: "desc" } } }
        });
        const totalBase = employees.reduce((s, e) => s + (e.salary || 0), 0);

        return {
          success: true,
          spokenText: `You have ${employees.length} active employees with an estimated base payroll of ₹${totalBase.toLocaleString('en-IN')}.`,
          actionText: "Staff Payroll & Incentives",
          route: "/payroll",
          cardType: "PAYROLL",
          cardData: {
            employeeCount: employees.length,
            totalBase,
            employees: employees.map(e => ({ name: e.user?.name || "Staff", salary: e.salary || 0, designation: e.designation || "Staff" }))
          }
        };
      }
    }

    // H. WAREHOUSES
    if (lower.includes("warehouse") || lower.includes("godown location") || lower.includes("stock location")) {
      if (organizationId) {
        const warehouses = await prisma.warehouse.findMany({
          where: { organizationId },
          include: { branch: true }
        });

        return {
          success: true,
          spokenText: `You have ${warehouses.length} active warehouses and stock locations. ${warehouses.map(w => w.name).join(", ")}.`,
          actionText: "Warehouse & Stock Locations",
          route: "/settings/warehouses",
          cardType: "GENERAL",
          cardData: {
            title: "Warehouse Locations",
            metrics: warehouses.map(w => ({
              label: w.name,
              value: w.branch?.city ? `${w.branch.city}, ${w.branch.state || ''}` : (w.address || "Active")
            }))
          }
        };
      }
    }

    // I. QUICK ACTIONS: CREATE EXPENSE
    if ((lower.includes("expense") || lower.includes("kharcha")) && (lower.includes("add") || lower.includes("log") || lower.includes("create") || /\d+/.test(lower))) {
      const matchAmount = raw.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
      const amount = matchAmount ? parseFloat(matchAmount[1].replace(/,/g, '')) : 0;

      if (amount > 0 && organizationId) {
        const expenseNumber = `EXP-${Date.now().toString().slice(-6)}`;
        let category = "General & Administrative";
        if (lower.includes("travel") || lower.includes("cab") || lower.includes("petrol")) category = "Travel & Conveyance";
        else if (lower.includes("food") || lower.includes("tea") || lower.includes("snack") || lower.includes("lunch")) category = "Meals & Refreshments";
        else if (lower.includes("courier") || lower.includes("shipping") || lower.includes("freight")) category = "Freight & Shipping";
        else if (lower.includes("stationery") || lower.includes("office")) category = "Office Supplies";

        const created = await prisma.expense.create({
          data: {
            expenseNumber,
            category,
            amount,
            description: `Voice logged: ${raw}`,
            status: "Approved"
          }
        });

        // Sync with double entry
        await syncSystemLedgers();

        return {
          success: true,
          spokenText: `Logged expense of ₹${amount.toLocaleString('en-IN')} for ${category} successfully under voucher #${expenseNumber}.`,
          actionText: `Expense Logged: ₹${amount.toLocaleString('en-IN')}`,
          route: "/accounting",
          cardType: "EXPENSE",
          cardData: {
            expenseNumber,
            category,
            amount,
            description: raw
          }
        };
      }
    }

    // J. DIRECT NAVIGATION COMMANDS
    const navMap: Record<string, { route: string; label: string; text: string }> = {
      "dashboard": { route: "/", label: "Dashboard", text: "Opening Dashboard..." },
      "customer": { route: "/customers", label: "Customers Directory", text: "Opening Customers..." },
      "lead": { route: "/leads", label: "Sales Leads", text: "Opening Leads..." },
      "order": { route: "/orders", label: "Orders Registry", text: "Opening Orders..." },
      "invoice": { route: "/invoices", label: "Tax Invoices", text: "Opening Invoices..." },
      "quote": { route: "/quotations", label: "Quotations", text: "Opening Quotations..." },
      "quotation": { route: "/quotations", label: "Quotations", text: "Opening Quotations..." },
      "daybook": { route: "/accounting", label: "Day Book & Ledger", text: "Opening Day Book..." },
      "day book": { route: "/accounting", label: "Day Book", text: "Opening Day Book..." },
      "trial balance": { route: "/accounting/trial-balance", label: "Trial Balance", text: "Opening Trial Balance..." },
      "chart of account": { route: "/accounting/chart-of-accounts", label: "Chart of Accounts", text: "Opening Chart of Accounts..." },
      "general ledger": { route: "/accounting/chart-of-accounts", label: "General Ledgers", text: "Opening General Ledgers..." },
      "voucher": { route: "/accounting/vouchers", label: "Journal Vouchers", text: "Opening Journal Vouchers..." },
      "ageing": { route: "/accounting/ageing", label: "Ageing Analysis", text: "Opening Ageing Analysis..." },
      "product": { route: "/products", label: "Products Catalog", text: "Opening Products..." },
      "call": { route: "/calls", label: "Call Logs", text: "Opening Calls..." },
      "follow up": { route: "/follow-ups", label: "Follow-ups", text: "Opening Follow-ups..." },
      "dispatch": { route: "/dispatches", label: "Dispatches & Challans", text: "Opening Dispatches..." },
      "delivery challan": { route: "/delivery-challans", label: "Delivery Challans", text: "Opening Delivery Challans..." },
      "vendor": { route: "/vendors", label: "Vendors & Suppliers", text: "Opening Vendors..." },
      "purchase": { route: "/purchases", label: "Purchases", text: "Opening Purchases..." },
      "bill": { route: "/purchases", label: "Purchase Bills", text: "Opening Bills..." },
      "setting": { route: "/settings/organization", label: "Settings", text: "Opening Settings..." },
      "tax setting": { route: "/settings/tax", label: "GST & Tax Settings", text: "Opening Tax Settings..." }
    };

    for (const [key, dest] of Object.entries(navMap)) {
      if (lower.includes(key)) {
        return {
          success: true,
          spokenText: dest.text,
          actionText: dest.label,
          route: dest.route,
          cardType: "NAVIGATION",
          cardData: { destination: dest.label, route: dest.route }
        };
      }
    }

    // ========================================================================
    // 2. GEMINI LLM NATURAL LANGUAGE REASONING (For complex/Hinglish queries)
    // ========================================================================
    if (process.env.GEMINI_API_KEY) {
      const prompt = `
        You are Antigravity ERP & CRM Voice Assistant for an enterprise B2B company in India.
        User Command: "${raw}"

        Understand their intent across ERP modules (Accounting, Sales, Customers, Invoices, Inventory, Warehouses, HRMS, Payroll).
        Provide a clean JSON response with:
        - "spokenText": Concise, friendly, natural answer to speak aloud (under 40 words, use ₹ / rupees).
        - "actionText": Short UI label of the action performed.
        - "route": Appropriate URL route in the application (e.g. /customers, /orders, /invoices, /accounting/balance-sheet, /accounting/profit-loss, /products, /payroll, /settings/warehouses).
        - "cardType": One of ["BALANCE_SHEET", "CUSTOMER", "ORDER", "STOCK", "PAYROLL", "EXPENSE", "NAVIGATION", "GENERAL"].
        - "cardData": Structured data object to display in the UI.

        Handle Hindi and Hinglish phrases (e.g., "batao", "dikhao", "naya banao", "balance kitna hai").
        Return strictly valid JSON.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      let text = response.text || "{}";
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);

      return {
        success: true,
        spokenText: parsed.spokenText || "Here is what I found for your request.",
        actionText: parsed.actionText || "Voice Action Executed",
        route: parsed.route || "/customers",
        cardType: parsed.cardType || "GENERAL",
        cardData: parsed.cardData || {}
      };
    }

    // Default Fallback
    return {
      success: true,
      spokenText: `Searching the system for "${raw}"...`,
      actionText: `Search for "${raw}"`,
      route: `/customers?search=${encodeURIComponent(raw)}`,
      cardType: "NAVIGATION",
      cardData: { query: raw }
    };
  } catch (err: any) {
    console.error("Voice AI execution error:", err);
    return {
      success: false,
      spokenText: `I encountered an issue processing that: ${err.message || 'Please try again.'}`,
      actionText: "Processing Error",
      route: `/customers?search=${encodeURIComponent(raw)}`
    };
  }
}

/**
 * Backward-compatible helper for simple voice search / routing.
 */
export async function parseVoiceIntent(spokenText: string) {
  const result = await executeVoiceCommand(spokenText);
  return {
    route: result.route || "/customers",
    searchTerm: spokenText,
    actionText: result.actionText,
    aiExplanation: result.spokenText
  };
}
