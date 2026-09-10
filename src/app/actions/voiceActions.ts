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
 * Universal Voice AI Command & Navigation Engine
 * Handles every screen, action, search, creation, and financial query in the ERP.
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
    // 1. PRIMARY CREATION & ACTION INTENTS (Highest Priority)
    // ========================================================================

    // A. QUOTATION CREATION: "create quotation", "new quote", "make quotation for Sonu Garments"
    if (
      (lower.includes("quotation") || lower.includes("quote") || lower.includes("estimate")) &&
      (lower.includes("create") || lower.includes("new") || lower.includes("make") || lower.includes("issue") || lower.includes("banao") || lower.includes("naya") || lower.includes("generate") || lower.includes("add"))
    ) {
      // Check if customer name mentioned e.g. "for Sonu Garments" or "Sonu Garments ka quotation"
      let customerQuery = "";
      const forMatch = raw.match(/(?:for|to|ka|ki|ke|customer)\s+([A-Za-z0-9\s&]+)/i);
      if (forMatch && forMatch[1]) {
        customerQuery = forMatch[1].replace(/quotation|quote|estimate|new|create|banao/gi, '').trim();
      }

      if (customerQuery && organizationId) {
        const foundCust = await prisma.customer.findFirst({
          where: {
            organizationId,
            OR: [
              { businessName: { contains: customerQuery, mode: 'insensitive' } },
              { contactPerson: { contains: customerQuery, mode: 'insensitive' } }
            ]
          }
        });
        if (foundCust) {
          return {
            success: true,
            spokenText: `Opening new quotation creator for ${foundCust.businessName}...`,
            actionText: `New Quotation: ${foundCust.businessName}`,
            route: `/quotations/new?customer=${encodeURIComponent(foundCust.businessName)}`,
            cardType: "NAVIGATION",
            cardData: { customer: foundCust.businessName }
          };
        }
      }

      return {
        success: true,
        spokenText: "Opening New Quotation generator form...",
        actionText: "Create New Quotation",
        route: "/quotations/new",
        cardType: "NAVIGATION",
        cardData: { destination: "New Quotation" }
      };
    }

    // B. SALES ORDER CREATION: "create order", "new order", "book order", "order place karo"
    if (
      (lower.includes("order") || lower.includes("sales order")) &&
      (lower.includes("create") || lower.includes("new") || lower.includes("place") || lower.includes("book") || lower.includes("banao") || lower.includes("naya") || lower.includes("add"))
    ) {
      return {
        success: true,
        spokenText: "Opening Orders screen...",
        actionText: "Create Sales Order",
        route: "/orders?action=new",
        cardType: "NAVIGATION"
      };
    }

    // C. CUSTOMER CREATION: "add customer", "new customer", "register client", "naya customer"
    if (
      (lower.includes("customer") || lower.includes("client") || lower.includes("party")) &&
      (lower.includes("add") || lower.includes("new") || lower.includes("create") || lower.includes("register") || lower.includes("naya") || lower.includes("jodo"))
    ) {
      return {
        success: true,
        spokenText: "Opening Add Customer registration modal...",
        actionText: "Add New Customer",
        route: "/customers?action=new",
        cardType: "NAVIGATION"
      };
    }

    // D. PRODUCT CREATION: "add product", "new product", "add stock item", "naya product"
    if (
      (lower.includes("product") || lower.includes("item") || lower.includes("article")) &&
      (lower.includes("add") || lower.includes("new") || lower.includes("create") || lower.includes("naya") || lower.includes("jodo"))
    ) {
      return {
        success: true,
        spokenText: "Opening Add Product modal...",
        actionText: "Add New Product",
        route: "/products?action=new",
        cardType: "NAVIGATION"
      };
    }

    // E. PAYMENT RECORDING: "record payment", "receive payment", "collect payment", "paisa aaya"
    if (
      lower.includes("payment") || lower.includes("receipt") || lower.includes("paisa aaya") || lower.includes("collect money") || lower.includes("receive money")
    ) {
      if (lower.includes("record") || lower.includes("receive") || lower.includes("new") || lower.includes("add") || lower.includes("collect") || lower.includes("entry")) {
        return {
          success: true,
          spokenText: "Opening Record Customer Payment form...",
          actionText: "Record Payment Entry",
          route: "/payments?action=new",
          cardType: "NAVIGATION"
        };
      }
    }

    // F. WORK ORDER / PRODUCTION: "create work order", "start production", "job card", "bom manager"
    if (lower.includes("work order") || lower.includes("production") || lower.includes("manufacturing") || lower.includes("job card") || lower.includes("bom") || lower.includes("cutting") || lower.includes("stitching")) {
      if (lower.includes("bom") || lower.includes("recipe") || lower.includes("bill of material")) {
        return {
          success: true,
          spokenText: "Opening Bill of Materials (BOM) Manager...",
          actionText: "Bill of Materials",
          route: "/production?action=bom",
          cardType: "NAVIGATION"
        };
      }
      if (lower.includes("create") || lower.includes("new") || lower.includes("start") || lower.includes("banao")) {
        return {
          success: true,
          spokenText: "Opening Create Work Order form...",
          actionText: "Create Work Order",
          route: "/production?action=new",
          cardType: "NAVIGATION"
        };
      }
      return {
        success: true,
        spokenText: "Opening Manufacturing & Production Studio...",
        actionText: "Production & Work Orders",
        route: "/production",
        cardType: "NAVIGATION"
      };
    }

    // G. PURCHASE ORDER / PROCUREMENT / VENDORS
    if (lower.includes("purchase order") || lower.includes("po") || lower.includes("procurement") || lower.includes("raw material") || lower.includes("vendor") || lower.includes("supplier")) {
      if (lower.includes("vendor") && (lower.includes("add") || lower.includes("new") || lower.includes("create"))) {
        return {
          success: true,
          spokenText: "Opening Add Vendor modal...",
          actionText: "Add Vendor",
          route: "/vendors?action=new",
          cardType: "NAVIGATION"
        };
      }
      if (lower.includes("create") || lower.includes("new") || lower.includes("issue") || lower.includes("order")) {
        return {
          success: true,
          spokenText: "Opening Create Purchase Order...",
          actionText: "Create Purchase Order",
          route: "/purchases?action=new",
          cardType: "NAVIGATION"
        };
      }
      if (lower.includes("vendor") || lower.includes("supplier")) {
        return {
          success: true,
          spokenText: "Opening Vendors & Suppliers directory...",
          actionText: "Vendors Directory",
          route: "/vendors",
          cardType: "NAVIGATION"
        };
      }
      return {
        success: true,
        spokenText: "Opening Purchases & PO module...",
        actionText: "Purchases & Inward",
        route: "/purchases",
        cardType: "NAVIGATION"
      };
    }

    // H. BARCODE & STICKER GENERATOR: "barcode generator", "print barcode", "qr code", "print label"
    if (lower.includes("barcode") || lower.includes("qr label") || lower.includes("sticker") || lower.includes("print label")) {
      return {
        success: true,
        spokenText: "Opening Barcode & QR Label Generator Studio...",
        actionText: "Barcode & QR Studio",
        route: "/products?action=barcode",
        cardType: "NAVIGATION"
      };
    }

    // I. DEAD STOCK & LIQUIDATION: "dead stock", "slow moving stock", "liquidation"
    if (lower.includes("dead stock") || lower.includes("slow moving") || lower.includes("liquidation") || lower.includes("non moving")) {
      return {
        success: true,
        spokenText: "Opening Dead Stock & Liquidation Insights...",
        actionText: "Dead Stock Insights",
        route: "/products?action=deadstock",
        cardType: "NAVIGATION"
      };
    }

    // J. DISPATCHES, CHALLANS & SHIPPING
    if (lower.includes("dispatch") || lower.includes("challan") || lower.includes("shipping") || lower.includes("courier") || lower.includes("freight")) {
      return {
        success: true,
        spokenText: "Opening Delivery Challans & Shipping...",
        actionText: "Dispatches & Challans",
        route: "/delivery-challans",
        cardType: "NAVIGATION"
      };
    }

    // K. LOG CALLS, FOLLOW-UPS & TASKS
    if (lower.includes("call") || lower.includes("follow up") || lower.includes("task") || lower.includes("reminder")) {
      if (lower.includes("log") || lower.includes("add") || lower.includes("record") || lower.includes("new")) {
        return {
          success: true,
          spokenText: "Opening Log a Call modal...",
          actionText: "Log a Call",
          route: "/calls?action=new",
          cardType: "NAVIGATION"
        };
      }
      return {
        success: true,
        spokenText: "Opening Calls & Follow-ups tracker...",
        actionText: "Calls & Follow-ups",
        route: "/calls",
        cardType: "NAVIGATION"
      };
    }

    // L. SALES PIPELINE, LEADERBOARD, TARGETS & WIN RATE
    if (lower.includes("pipeline") || lower.includes("kanban") || lower.includes("target") || lower.includes("leaderboard") || lower.includes("win rate") || lower.includes("sales rep") || lower.includes("conversion")) {
      return {
        success: true,
        spokenText: "Opening Sales Pipeline & Target Leaderboard...",
        actionText: "Sales Pipeline & Kanban",
        route: "/leads",
        cardType: "NAVIGATION"
      };
    }

    // M. QUICK ACTIONS: CREATE EXPENSE
    if ((lower.includes("expense") || lower.includes("kharcha")) && (lower.includes("add") || lower.includes("log") || lower.includes("create") || /\d+/.test(lower))) {
      const matchAmount = raw.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
      const amount = matchAmount ? parseFloat(matchAmount[1].replace(/,/g, '')) : 0;

      if (amount > 0) {
        const expenseNumber = `EXP-${Date.now().toString().slice(-6)}`;
        let category = "General & Administrative";
        if (lower.includes("travel") || lower.includes("cab") || lower.includes("petrol")) category = "Travel & Conveyance";
        else if (lower.includes("food") || lower.includes("tea") || lower.includes("snack") || lower.includes("lunch")) category = "Meals & Refreshments";
        else if (lower.includes("courier") || lower.includes("shipping") || lower.includes("freight")) category = "Freight & Shipping";
        else if (lower.includes("stationery") || lower.includes("office")) category = "Office Supplies";

        return {
          success: true,
          spokenText: `Opening expense entry for ₹${amount.toLocaleString('en-IN')} under ${category}...`,
          actionText: `Log Expense: ₹${amount.toLocaleString('en-IN')}`,
          route: `/expenses?action=new&amount=${amount}&category=${encodeURIComponent(category)}`,
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

    // ========================================================================
    // 2. FINANCIAL STATEMENTS & ACCOUNTING REPORTS
    // ========================================================================

    // A. BALANCE SHEET
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
    if (lower.includes("profit") || lower.includes("revenue") || lower.includes("income statement") || lower.includes("turnover") || lower.includes("munafa") || lower.includes("kamai") || lower.includes("p&l")) {
      const plRes = await getProfitAndLossStatement();
      if (plRes.success) {
        const pl = plRes as any;
        const netProfit = pl.incomeStatement?.netProfit || 0;
        const grossSales = pl.tradingAccount?.salesRevenue || 0;
        const grossProfit = pl.tradingAccount?.grossProfit || 0;

        return {
          success: true,
          spokenText: `Your Net Profit is ₹${netProfit.toLocaleString('en-IN')} on Gross Revenue of ₹${grossSales.toLocaleString('en-IN')}, with Gross Profit of ₹${grossProfit.toLocaleString('en-IN')}.`,
          actionText: "Profit & Loss (P&L)",
          route: "/accounting/profit-loss",
          cardType: "GENERAL",
          cardData: {
            title: "Profit & Loss Statement",
            metrics: [
              { label: "Net Profit", value: `₹${netProfit.toLocaleString('en-IN')}`, highlight: true },
              { label: "Gross Sales Revenue", value: `₹${grossSales.toLocaleString('en-IN')}` },
              { label: "Gross Profit", value: `₹${grossProfit.toLocaleString('en-IN')}` }
            ]
          }
        };
      }
    }

    // C. TRIAL BALANCE
    if (lower.includes("trial balance") || lower.includes("ledger trial")) {
      return {
        success: true,
        spokenText: "Opening Trial Balance statement...",
        actionText: "Trial Balance",
        route: "/accounting/trial-balance",
        cardType: "NAVIGATION"
      };
    }

    // D. DAY BOOK & VOUCHERS
    if (lower.includes("day book") || lower.includes("daybook") || lower.includes("journal voucher") || lower.includes("voucher") || lower.includes("chart of account") || lower.includes("general ledger")) {
      return {
        success: true,
        spokenText: "Opening Accounting Day Book & Ledgers...",
        actionText: "Day Book & Ledger",
        route: "/accounting",
        cardType: "NAVIGATION"
      };
    }

    // E. RECEIVABLES / DEBTORS / AGEING
    if (lower.includes("debtor") || lower.includes("receivable") || lower.includes("who owes") || lower.includes("lena hai") || lower.includes("ageing") || lower.includes("outstanding")) {
      if (organizationId) {
        const invoices = await prisma.invoice.findMany({
          where: { organizationId, status: { notIn: ["Paid", "Cancelled"] }, amountDue: { gt: 0 } },
          include: { customer: true },
          take: 5
        });
        const totalDue = invoices.reduce((s, i) => s + (i.amountDue || (i.totalAmount - (i.amountPaid || 0))), 0);

        return {
          success: true,
          spokenText: `Total outstanding receivables are ₹${totalDue.toLocaleString('en-IN')}. ${invoices.length > 0 ? `Top pending is ${invoices[0].customer?.businessName} for ₹${invoices[0].amountDue}.` : 'All customer accounts are clear.'}`,
          actionText: "Receivables & Ageing",
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

    // F. GST FILING & TAXES
    if (lower.includes("gst") || lower.includes("gstr") || lower.includes("tax filing") || lower.includes("tax report")) {
      return {
        success: true,
        spokenText: "Opening GST Filing & Tax Returns dashboard...",
        actionText: "GST Filing & Returns",
        route: "/gst-filing",
        cardType: "NAVIGATION"
      };
    }

    // ========================================================================
    // 3. WHATSAPP MARKETING & CHATBOTS
    // ========================================================================
    if (lower.includes("whatsapp") || lower.includes("broadcast") || lower.includes("campaign") || lower.includes("chatbot")) {
      if (lower.includes("campaign") || lower.includes("broadcast") || lower.includes("bulk")) {
        return {
          success: true,
          spokenText: "Opening WhatsApp Broadcast Campaigns...",
          actionText: "WhatsApp Campaigns",
          route: "/whatsapp/campaigns",
          cardType: "NAVIGATION"
        };
      }
      if (lower.includes("bot") || lower.includes("chatbot") || lower.includes("flow") || lower.includes("builder")) {
        return {
          success: true,
          spokenText: "Opening WhatsApp Chatbot Flow Builder...",
          actionText: "Chatbot Builder",
          route: "/whatsapp/chatbot-builder",
          cardType: "NAVIGATION"
        };
      }
      return {
        success: true,
        spokenText: "Opening WhatsApp Conversations & Inbox...",
        actionText: "WhatsApp Inbox",
        route: "/whatsapp/inbox",
        cardType: "NAVIGATION"
      };
    }

    // ========================================================================
    // 4. HRMS, PAYROLL & HIRING
    // ========================================================================
    if (lower.includes("payroll") || lower.includes("salary") || lower.includes("salaries") || lower.includes("tankhwah")) {
      return {
        success: true,
        spokenText: "Opening Payroll & Payouts dashboard...",
        actionText: "Staff Payroll",
        route: "/payroll",
        cardType: "NAVIGATION"
      };
    }

    if (lower.includes("leave") || lower.includes("attendance") || lower.includes("hrms") || lower.includes("employee")) {
      return {
        success: true,
        spokenText: "Opening HRMS & Staff Attendance...",
        actionText: "HRMS & Attendance",
        route: "/hrms",
        cardType: "NAVIGATION"
      };
    }

    if (lower.includes("hiring") || lower.includes("candidate") || lower.includes("applicant") || lower.includes("interview") || lower.includes("recruitment")) {
      return {
        success: true,
        spokenText: "Opening Hiring & Candidate Pipeline...",
        actionText: "Hiring & Recruitment",
        route: "/hiring",
        cardType: "NAVIGATION"
      };
    }

    // ========================================================================
    // 5. SETTINGS, THEME & CUSTOMIZATION
    // ========================================================================
    if (lower.includes("theme") || lower.includes("appearance") || lower.includes("change color") || lower.includes("change font") || lower.includes("styling")) {
      return {
        success: true,
        spokenText: "Opening Appearance & Software Theme settings...",
        actionText: "Theme Settings",
        route: "/settings?action=theme",
        cardType: "NAVIGATION"
      };
    }

    if (lower.includes("tax setting") || lower.includes("gst setting") || lower.includes("tax rate")) {
      return {
        success: true,
        spokenText: "Opening Tax & GST Configuration...",
        actionText: "Tax Settings",
        route: "/settings/taxes",
        cardType: "NAVIGATION"
      };
    }

    if (lower.includes("template") || lower.includes("pdf layout") || lower.includes("quotation design")) {
      return {
        success: true,
        spokenText: "Opening Document Templates & Print Designer...",
        actionText: "Document Templates",
        route: "/settings/templates",
        cardType: "NAVIGATION"
      };
    }

    if (lower.includes("warehouse") || lower.includes("godown location") || lower.includes("stock location")) {
      return {
        success: true,
        spokenText: "Opening Warehouse & Godown locations...",
        actionText: "Warehouses",
        route: "/settings/warehouses",
        cardType: "NAVIGATION"
      };
    }

    if (lower.includes("role") || lower.includes("permission") || lower.includes("user management") || lower.includes("add user")) {
      return {
        success: true,
        spokenText: "Opening User Roles & Permissions...",
        actionText: "User Roles & Permissions",
        route: "/settings/roles",
        cardType: "NAVIGATION"
      };
    }

    // ========================================================================
    // 6. DIRECT DATABASE SEARCH (CUSTOMERS / PRODUCTS / QUOTATIONS / ORDERS)
    // ========================================================================
    if (organizationId) {
      // Check customer match
      const matchedCust = await prisma.customer.findFirst({
        where: {
          organizationId,
          OR: [
            { businessName: { contains: raw, mode: 'insensitive' } },
            { contactPerson: { contains: raw, mode: 'insensitive' } }
          ]
        }
      });

      if (matchedCust) {
        return {
          success: true,
          spokenText: `Opening profile for ${matchedCust.businessName}...`,
          actionText: `Customer: ${matchedCust.businessName}`,
          route: `/customers/${matchedCust.id}`,
          cardType: "CUSTOMER",
          cardData: {
            title: matchedCust.businessName,
            contactPerson: matchedCust.contactPerson,
            mobile: matchedCust.mobile
          }
        };
      }

      // Check product match
      const matchedProd = await prisma.product.findFirst({
        where: {
          organizationId,
          OR: [
            { name: { contains: raw, mode: 'insensitive' } },
            { articleNumber: { contains: raw, mode: 'insensitive' } },
            { sku: { contains: raw, mode: 'insensitive' } }
          ]
        }
      });

      if (matchedProd) {
        return {
          success: true,
          spokenText: `Found product ${matchedProd.name} with stock quantity of ${matchedProd.stockQuantity} units.`,
          actionText: `Product: ${matchedProd.name}`,
          route: `/products?search=${encodeURIComponent(matchedProd.name)}`,
          cardType: "STOCK",
          cardData: {
            name: matchedProd.name,
            sku: matchedProd.sku,
            stockQuantity: matchedProd.stockQuantity,
            sellingPrice: matchedProd.sellingPrice
          }
        };
      }

      // Check quotation number match (e.g. QT-1002)
      const matchedQuote = await prisma.quotation.findFirst({
        where: {
          organizationId,
          quotationNumber: { contains: raw, mode: 'insensitive' }
        }
      });
      if (matchedQuote) {
        return {
          success: true,
          spokenText: `Opening Quotation ${matchedQuote.quotationNumber}...`,
          actionText: `Quotation ${matchedQuote.quotationNumber}`,
          route: `/quotations/${matchedQuote.id}`,
          cardType: "NAVIGATION"
        };
      }

      // Check order number match (e.g. ORD-1002)
      const matchedOrder = await prisma.order.findFirst({
        where: {
          organizationId,
          orderNumber: { contains: raw, mode: 'insensitive' }
        }
      });
      if (matchedOrder) {
        return {
          success: true,
          spokenText: `Opening Sales Order ${matchedOrder.orderNumber}...`,
          actionText: `Order ${matchedOrder.orderNumber}`,
          route: `/orders/${matchedOrder.id}`,
          cardType: "NAVIGATION"
        };
      }
    }

    // ========================================================================
    // 7. GEMINI LLM NATURAL LANGUAGE REASONING (For complex Hinglish / natural queries)
    // ========================================================================
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "dummy") {
      const prompt = `
        You are Antigravity ERP & CRM Universal Voice Router for an Indian B2B enterprise.
        User Command: "${raw}"

        Determine user intent and route to the most accurate route in the application:
        Available Routes:
        - /quotations/new (Create new quotation / estimate)
        - /quotations (View all quotations)
        - /orders?action=new (Create new sales order)
        - /orders (View all orders & shipping status)
        - /invoices (Invoices & billing)
        - /payments?action=new (Record payment / receive customer money)
        - /payments (View payment receipts)
        - /customers?action=new (Add new customer / client)
        - /customers (Customers directory)
        - /products?action=new (Add new product)
        - /products?action=barcode (Barcode & QR label designer)
        - /products?action=deadstock (Dead stock & inventory liquidation)
        - /products (Products & stock inventory)
        - /production?action=new (Create work order / production)
        - /production?action=bom (Bill of Materials recipes)
        - /production (Manufacturing workshop status)
        - /purchases?action=new (Create purchase order / PO)
        - /purchases (View purchases & inward GRN)
        - /vendors?action=new (Add vendor / supplier)
        - /vendors (Vendors directory)
        - /delivery-challans (Dispatches & delivery challans)
        - /calls?action=new (Log a call)
        - /calls (Calls & follow-ups)
        - /leads (Sales pipeline & target leaderboard)
        - /accounting/balance-sheet (Balance sheet)
        - /accounting/profit-loss (Profit & loss P&L)
        - /accounting/trial-balance (Trial balance)
        - /accounting (Day book & general ledger)
        - /accounting/ageing (Receivables & debtors ageing)
        - /gst-filing (GST Filing & tax reports)
        - /payroll (Staff payroll & salaries)
        - /hrms (Staff leaves & attendance)
        - /hiring (Hiring & candidate recruitment)
        - /whatsapp/inbox (WhatsApp chat)
        - /whatsapp/campaigns (WhatsApp broadcast campaigns)
        - /whatsapp/chatbot-builder (WhatsApp chatbot builder)
        - /settings?action=theme (Appearance & software theme)
        - /settings/organization (Company profile)
        - /settings/taxes (Tax settings)
        - /settings/templates (Document templates)
        - /settings/warehouses (Warehouses)
        - /settings/roles (User roles & permissions)
        - / (Dashboard home)

        Provide JSON response:
        - "spokenText": Friendly concise confirmation in English or Hindi (under 20 words).
        - "actionText": Short title of the screen or action.
        - "route": Exact route chosen from above.
        - "cardType": "NAVIGATION"
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      let text = response.text || "{}";
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);

      if (parsed.route) {
        return {
          success: true,
          spokenText: parsed.spokenText || `Opening ${parsed.actionText || 'screen'}...`,
          actionText: parsed.actionText || "Voice Navigation",
          route: parsed.route,
          cardType: "NAVIGATION",
          cardData: parsed.cardData || {}
        };
      }
    }

    // Default Fallback
    return {
      success: true,
      spokenText: `Searching software for "${raw}"...`,
      actionText: `Search for "${raw}"`,
      route: `/customers?search=${encodeURIComponent(raw)}`,
      cardType: "NAVIGATION",
      cardData: { query: raw }
    };
  } catch (err: any) {
    console.error("Voice AI execution error:", err);
    return {
      success: false,
      spokenText: `Processing voice command: ${raw}`,
      actionText: `Search for "${raw}"`,
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
