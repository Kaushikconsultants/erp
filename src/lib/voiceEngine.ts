
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { askSmartAIJSON, getGeminiApiKey } from "@/lib/aiClient";
import {
  getBalanceSheet,
  getProfitAndLossStatement,
  getTrialBalance,
  getDayBook,
  syncSystemLedgers
} from "@/app/actions/accountingActions";
import { ConfirmedVoiceActionPayload } from "@/app/actions/voiceActionExecutor";
import { matchVoiceLearningRule } from "@/app/actions/voiceLearningActions";
import { searchErpGuide } from "@/app/actions/erpGuideActions";
import { getSalesTargetLeaderboard } from "@/app/actions/salesTargetActions";

export interface VoiceMetricItem {
  label: string;
  value: string;
  subtext?: string;
  positive?: boolean;
}

export interface VoicePendingContext {
  actionType:
    | "CREATE_QUOTATION"
    | "CREATE_INVOICE"
    | "CREATE_ORDER"
    | "CREATE_PRODUCT"
    | "CREATE_CUSTOMER"
    | "CREATE_EXPENSE";
  waitingFor: "customer" | "items" | "amount" | "order" | "price" | "stock";
  collectedData: Record<string, any>;
  promptSummary?: string;
}

export interface VoiceAssistantResponse {
  spokenText: string;
  actionText: string;
  route?: string;
  cardType?:
    | "BALANCE_SHEET"
    | "CUSTOMER"
    | "ORDER"
    | "STOCK"
    | "PAYROLL"
    | "EXPENSE"
    | "NAVIGATION"
    | "GENERAL"
    | "CONFIRMATION"
    | "REPORT"
    | "ATTENDANCE"
    | "CLIENT_ACTION"
    | "GUIDE";
  cardData?: any;
  clientAction?: {
    type: "ADD_QUOTATION_ITEM" | "SET_QUOTATION_CUSTOMER" | "ADD_INVOICE_ITEM" | string;
    data: any;
  };
  success: boolean;
  requiresConfirmation?: boolean;
  confirmationPayload?: ConfirmedVoiceActionPayload;
  pendingContext?: VoicePendingContext;
  keyMetrics?: VoiceMetricItem[];
  suggestedActions?: { label: string; href?: string; voiceCommand?: string }[];
  followUpQuestions?: string[];
  provider?: string;
}

export interface ERPRouteMatch {
  route: string;
  label: string;
  spokenText: string;
}

/**
 * Detects and normalizes Hindi / Devanagari text:
 * 1. Converts Devanagari numerals (०-९) to standard digits (0-9).
 * 2. Converts common Hindi number words (पचास -> 50, सौ -> 100, आदि)
 * 3. Identifies whether the prompt contains Hindi / Devanagari script.
 */
function normalizeHindiInput(text: string): { normalized: string; isHindi: boolean } {
  if (!text) return { normalized: "", isHindi: false };

  const isHindi = /[\u0900-\u097F]/.test(text);
  let norm = text.trim();

  // 1. Convert Devanagari digits to 0-9
  const devanagariDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  norm = norm.replace(/[०-९]/g, (ch) => devanagariDigits.indexOf(ch).toString());

  // 2. Convert common Hindi number words to digits for robust regex extraction
  const hindiNumberMap: [RegExp, string][] = [
    [/(?:^|[\s,।!?])(एक)(?=[\s,।!?]|$)/gu, "1"],
    [/(?:^|[\s,।!?])(दो)(?=[\s,।!?]|$)/gu, "2"],
    [/(?:^|[\s,।!?])(तीन)(?=[\s,।!?]|$)/gu, "3"],
    [/(?:^|[\s,।!?])(चार)(?=[\s,।!?]|$)/gu, "4"],
    [/(?:^|[\s,।!?])(पांच|पाँच)(?=[\s,।!?]|$)/gu, "5"],
    [/(?:^|[\s,।!?])(छह|छः)(?=[\s,।!?]|$)/gu, "6"],
    [/(?:^|[\s,।!?])(सात)(?=[\s,।!?]|$)/gu, "7"],
    [/(?:^|[\s,।!?])(आठ)(?=[\s,।!?]|$)/gu, "8"],
    [/(?:^|[\s,।!?])(नौ)(?=[\s,।!?]|$)/gu, "9"],
    [/(?:^|[\s,।!?])(दस)(?=[\s,।!?]|$)/gu, "10"],
    [/(?:^|[\s,।!?])(पंद्रह|पन्द्रह)(?=[\s,।!?]|$)/gu, "15"],
    [/(?:^|[\s,।!?])(बीस)(?=[\s,।!?]|$)/gu, "20"],
    [/(?:^|[\s,।!?])(पच्चीस)(?=[\s,।!?]|$)/gu, "25"],
    [/(?:^|[\s,।!?])(तीस)(?=[\s,।!?]|$)/gu, "30"],
    [/(?:^|[\s,।!?])(चालीस)(?=[\s,।!?]|$)/gu, "40"],
    [/(?:^|[\s,।!?])(पचास)(?=[\s,।!?]|$)/gu, "50"],
    [/(?:^|[\s,।!?])(साठ)(?=[\s,।!?]|$)/gu, "60"],
    [/(?:^|[\s,।!?])(सत्तर)(?=[\s,।!?]|$)/gu, "70"],
    [/(?:^|[\s,।!?])(अस्सी)(?=[\s,।!?]|$)/gu, "80"],
    [/(?:^|[\s,।!?])(नब्बे)(?=[\s,।!?]|$)/gu, "90"],
    [/(?:^|[\s,।!?])(सौ)(?=[\s,।!?]|$)/gu, "100"],
    [/(?:^|[\s,।!?])(हजार|हज़ार)(?=[\s,।!?]|$)/gu, "1000"],
    [/(?:^|[\s,।!?])(लाख)(?=[\s,।!?]|$)/gu, "100000"]
  ];

  for (const [pattern, repl] of hindiNumberMap) {
    norm = norm.replace(pattern, (m, g1) => m.replace(g1, repl));
  }

  return { normalized: norm, isHindi };
}

/**
 * Strips meta-request conversational voice wrappers e.g. "बोल के बताओ", "आवाज में बताओ",
 * "बोलकर सुनाओ", "voice output me batao", "tell me by voice", etc.
 * This ensures queries match direct business intent rules and prevents LLM text-only disclaimers.
 */
export function stripVoicePhrasing(text: string): string {
  if (!text) return "";
  let clean = text.trim();
  // Remove conversational voice prefixes
  clean = clean.replace(
    /^(?:कृपया\s*|kripya\s*|please\s*)?(?:बोल\s*कर|बोल\s*के|बोलकर|बोलिए|बोल\s*दो|सुनाओ|सुनाइए|आवाज\s*में|आवाज़\s*में|वॉयस\s*में|वॉइस\s*में|ऑडियो\s*में|audio\s*me|voice\s*me|voice\s*output\s*(?:me)?|speak\s*and|tell\s*me\s*by\s*voice|in\s*voice|by\s*voice|voice\s*output)\s*(?:बताओ|बताइए|सुनाओ|दिखाइए|दिखाओ|tell|say)?\s*/gi,
    ""
  );

  // Remove conversational voice suffixes
  clean = clean.replace(
    /\s*(?:बोल\s*कर|बोल\s*के|बोलकर|बोलिए|बोल\s*दो|सुनाओ|सुनाइए|आवाज\s*में|आवाज़\s*में|वॉयस\s*में|वॉइस\s*में|ऑडियो\s*में|audio\s*me|voice\s*me|voice\s*output\s*(?:me)?|speak\s*and|tell\s*me\s*by\s*voice|in\s*voice|by\s*voice|voice\s*output)\s*(?:बताओ|बताइए|सुनाओ|दिखाइए|दिखाओ|tell|say)?$/gi,
    ""
  );

  // Remove inline voice requests
  clean = clean.replace(
    /(?:बोल\s*कर|बोल\s*के|बोलकर|बोलिए|सुनाओ|आवाज\s*में|आवाज़\s*में|वॉयस\s*में|वॉइस\s*में|ऑडियो\s*में|voice\s*output\s*(?:me)?|voice\s*me)\s*(?:बताओ|बताइए|सुनाओ|दिखाइए|दिखाओ)?/gi,
    ""
  );

  return clean.trim();
}

/**
 * Purges any accidental disclaimer hallucinations from AI models claiming voice output is unavailable.
 */
export function sanitizeVoiceOutputText(txt: string): string {
  if (!txt) return "";
  const cleaned = txt
    .replace(/(?:माफ़\s*कीजिए|माफ\s*कीजिए|क्षमा\s*करें|sorry)?[,।!]?\s*(?:अभी\s*)?(?:वॉयस\s*आउटपुट|वॉइस\s*आउटपुट|voice\s*output|आवाज़\s*आउटपुट)\s*(?:की\s*सुविधा\s*)?(?:उपलब्ध\s*नहीं\s*है|available\s*nahi\s*hai|is\s*not\s*available)[,।!]?\s*(?:इसलिए\s*मैं\s*आपको\s*लिखकर\s*जवाब\s*दे\s*रहा\s*हूँ|so\s*I\s*am\s*answering\s*in\s*writing)?[,।.]?\s*/gi, "")
    .replace(/(?:मैं\s*केवल\s*लिखकर\s*जवाब\s*दे\s*सकता\s*हूँ|I\s*can\s*only\s*answer\s*in\s*text)[,।.]?\s*/gi, "")
    .trim();
  return cleaned || txt;
}

/**
 * Maps voice commands and queries across ALL 36 ERP modules and submodules.
 */
function resolveERPModuleRoute(rawText: string): ERPRouteMatch | null {
  if (!rawText || !rawText.trim()) return null;
  const { normalized, isHindi } = normalizeHindiInput(rawText);
  const lower = normalized.toLowerCase().trim();

  // Strip conversational prefixes and suffixes in English and Hindi
  const stripped = lower
    .replace(/^(please\s+|kripya\s+|kripya\s+karke\s+|कृपया\s+)?(open|go\s+to|show|view|navigate\s+to|take\s+me\s+to|kholo|dikhao|le\s+chalo|खोलो|ओपन|दिखाओ|दिखाइए|दिखाएं|खोलें|खोल\s*दो|ले\s*चलो|जाओ)\s+/i, '')
    .replace(/\s+(page|module|screen|list|directory|portal|table|dashboard|system|खोलो|ओपन|दिखाओ|दिखाइए|दिखाएं|पे\s*जाओ|पर\s*जाओ|ले\s*चलो|kholo|dikhao|chalo|खोलें)$/i, '')
    .trim();

  const definitions: Array<{
    route: string;
    label: string;
    spoken: string;
    keywords: string[];
  }> = [
    // 1. Subscriptions & Billing Settings
    {
      route: "/settings/billing",
      label: "Billing & Subscriptions",
      spoken: isHindi ? "बिलिंग और सब्सक्रिप्शन सेटिंग्स खोली जा रही हैं..." : "Opening Billing & Subscriptions settings...",
      keywords: [
        "subscription",
        "subscriptions",
        "subcription",
        "subcriptions",
        "billing plan",
        "billing plans",
        "pricing plan",
        "pricing plans",
        "saas plan",
        "upgrade plan",
        "plan upgrade",
        "my plan",
        "pricing",
        "membership",
        "license",
        "billing settings",
        "billing & subscription",
        "billing & subscriptions",
        "plans",
        "सब्सक्रिप्शन",
        "प्लान"
      ]
    },
    // 2. Stock Transfers
    {
      route: "/warehouses/transfers",
      label: "Stock Transfers",
      spoken: isHindi ? "स्टॉक ट्रांसफर खोला जा रहा है..." : "Opening Warehouse Stock Transfers...",
      keywords: [
        "stock transfer",
        "stock transfers",
        "transfer stock",
        "warehouse transfer",
        "warehouse transfers",
        "inter warehouse",
        "inventory transfer",
        "transfer inventory",
        "godown transfer",
        "स्टॉक ट्रांसफर",
        "वेयरहाउस ट्रांसफर"
      ]
    },
    // 3. Vendor Credits (Purchase Returns / Debit Notes)
    {
      route: "/vendor-credits",
      label: "Vendor Credits",
      spoken: isHindi ? "वेंडर क्रेडिट्स और डेबिट नोट्स खोले जा रहे हैं..." : "Opening Vendor Credits & Debit Notes...",
      keywords: [
        "vendor credit",
        "vendor credits",
        "vendorcredit",
        "vendorcredits",
        "purchase return",
        "purchase returns",
        "supplier credit",
        "supplier credits",
        "debit note",
        "debit notes",
        "debitnote",
        "debitnotes",
        "return outward",
        "डेबिट नोट",
        "वेंडर क्रेडिट"
      ]
    },
    // 4. Credit Notes (Sales Returns)
    {
      route: "/credit-notes",
      label: "Credit Notes",
      spoken: isHindi ? "क्रेडिट नोट्स और सेल्स रिटर्न खोले जा रहे हैं..." : "Opening Credit Notes & Sales Returns...",
      keywords: [
        "credit note",
        "credit notes",
        "creditnote",
        "creditnotes",
        "sales return",
        "sales returns",
        "customer credit",
        "refund note",
        "refund notes",
        "return inward",
        "क्रेडिट नोट",
        "सेल्स रिटर्न"
      ]
    },
    // 5. Payments Made (Vendor Payouts)
    {
      route: "/payments-made",
      label: "Payments Made",
      spoken: isHindi ? "वेंडर्स को किए गए भुगतान खोले जा रहे हैं..." : "Opening Payments Made to Vendors...",
      keywords: [
        "payment made",
        "payments made",
        "vendor payment",
        "vendor payments",
        "supplier payment",
        "supplier payments",
        "payout",
        "payouts",
        "vendor payout",
        "outgoing payment",
        "payment out",
        "भुगतान",
        "पेमेंट्स"
      ]
    },
    // 6. E-Way Bills
    {
      route: "/eway-bills",
      label: "E-Way Bills",
      spoken: isHindi ? "ई-वे बिल पोर्टल खोला जा रहा है..." : "Opening E-Way Bills Portal...",
      keywords: [
        "eway bill",
        "eway bills",
        "ewaybill",
        "ewaybills",
        "e-way bill",
        "e-way bills",
        "eway",
        "electronic way bill",
        "nic eway",
        "ईवे बिल",
        "ई वे बिल"
      ]
    },
    // 7. GST Filing & Returns
    {
      route: "/gst-filing",
      label: "GST Filing & Returns",
      spoken: isHindi ? "जीएसटी फाइलिंग और टैक्स रिटर्न खोले जा रहे हैं..." : "Opening GST Filing & Tax Returns...",
      keywords: [
        "gst filing",
        "gst file",
        "gst return",
        "gst returns",
        "gstr 1",
        "gstr-1",
        "gstr 3b",
        "gstr-3b",
        "gstr",
        "tax filing",
        "file gst",
        "gst portal",
        "tax return",
        "जीएसटी फाइलिंग",
        "जीएसटी रिटर्न",
        "टैक्स रिटर्न"
      ]
    },
    // 8. Delivery Challans & Dispatch
    {
      route: "/delivery-challans",
      label: "Delivery Challans",
      spoken: isHindi ? "डिलीवरी चालान और डिस्पैच खोला जा रहा है..." : "Opening Delivery Challans & Dispatch...",
      keywords: [
        "delivery challan",
        "delivery challans",
        "challan",
        "challans",
        "dispatch",
        "dispatches",
        "shipment",
        "shipments",
        "consignment",
        "consignments",
        "logistics",
        "डिलीवरी चालान",
        "डिस्पैच"
      ]
    },
    // 9. Vendor Bills (AP)
    {
      route: "/bills",
      label: "Vendor Bills",
      spoken: isHindi ? "वेंडर बिल्स खोले जा रहे हैं..." : "Opening Vendor Bills...",
      keywords: [
        "vendor bill",
        "vendor bills",
        "supplier bill",
        "supplier bills",
        "purchase bill",
        "purchase bills",
        "ap bill",
        "ap bills",
        "inward bill",
        "bills",
        "वेंडर बिल",
        "सप्लायर बिल"
      ]
    },
    // 10. Accounting sub-statements
    {
      route: "/accounting/balance-sheet",
      label: "Balance Sheet",
      spoken: isHindi ? "बैलेंस शीट खोली जा रही है..." : "Opening Schedule III Balance Sheet...",
      keywords: ["balance sheet", "schedule iii", "assets and liabilities", "balancesheet", "बैलेंस शीट", "तुलन पत्र"]
    },
    {
      route: "/accounting/profit-loss",
      label: "Profit & Loss",
      spoken: isHindi ? "लाभ और हानि विवरण खोला जा रहा है..." : "Opening Profit & Loss Statement...",
      keywords: ["profit and loss", "profit loss", "p&l", "income statement", "p and l", "प्रॉफिट एंड लॉस", "लाभ और हानि"]
    },
    {
      route: "/accounting/trial-balance",
      label: "Trial Balance",
      spoken: isHindi ? "ट्रायल बैलेंस खोला जा रहा है..." : "Opening Trial Balance...",
      keywords: ["trial balance", "ट्रायल बैलेंस"]
    },
    {
      route: "/accounting/day-book",
      label: "Day Book",
      spoken: isHindi ? "डे बुक खोली जा रही है..." : "Opening Accounting Day Book...",
      keywords: ["day book", "daybook", "daily ledger", "डे बुक", "दैनिक खाता"]
    },
    {
      route: "/accounting/ageing",
      label: "Receivables Ageing",
      spoken: isHindi ? "बकाया रिपोर्ट और एजिंग खोली जा रही है..." : "Opening Debtors Ageing & Receivables...",
      keywords: ["ageing", "aging", "receivable report", "debtors ageing", "overdue report", "एजिंग"]
    },
    {
      route: "/accounting/bank-reconciliation",
      label: "Bank Reconciliation",
      spoken: isHindi ? "बैंक समाधान खोला जा रहा है..." : "Opening Bank Reconciliation...",
      keywords: ["bank reconciliation", "bank recon", "brs", "reconciliation", "बैंक समाधान"]
    },
    {
      route: "/accounting/chart-of-accounts",
      label: "Chart of Accounts",
      spoken: isHindi ? "चार्ट ऑफ अकाउंट्स खोला जा रहा है..." : "Opening Chart of Accounts...",
      keywords: ["chart of accounts", "ledger heads", "chart of account", "चार्ट ऑफ अकाउंट्स"]
    },
    // 11. Warehouses
    {
      route: "/warehouses",
      label: "Warehouses Master",
      spoken: isHindi ? "गोदाम और वेयरहाउस खोले जा रहे हैं..." : "Opening Warehouses...",
      keywords: ["warehouse", "warehouses", "godown", "godowns", "storage location", "storage locations", "depot", "depots", "वेयरहाउस", "गोदाम"]
    },
    // 12. Telecalling & Calls
    {
      route: "/calls",
      label: "Telecalling & Call Logs",
      spoken: isHindi ? "कॉल रिकॉर्ड्स और टेलीकॉलिंग खोली जा रही है..." : "Opening Telecalling & Call Records...",
      keywords: ["telecalling", "telecaller", "call log", "call logs", "click to call", "call history", "calling", "customer call", "call records", "calls", "call", "टेलीकॉलिंग", "कॉल रिकॉर्ड्स"]
    },
    // 13. Broadcasts & WhatsApp
    {
      route: "/broadcasts",
      label: "WhatsApp Broadcasts",
      spoken: isHindi ? "व्हाट्सएप ब्रॉडकास्ट कैंपेन खोले जा रहे हैं..." : "Opening WhatsApp Broadcast Campaigns...",
      keywords: ["broadcast", "broadcasts", "whatsapp campaign", "whatsapp campaigns", "whatsapp marketing", "bulk whatsapp", "whatsapp blast", "whatsapp message", "campaigns", "व्हाट्सएप", "ब्रॉडकास्ट"]
    },
    // 14. Analytics & BI
    {
      route: "/analytics",
      label: "Analytics & BI",
      spoken: isHindi ? "एनालिटिक्स डैशबोर्ड खोला जा रहा है..." : "Opening Analytics & Executive BI...",
      keywords: ["analytics", "bi analytics", "bi dashboard", "insights", "business intelligence", "performance metrics", "kpi", "एनालिटिक्स"]
    },
    // 15. Production & Manufacturing
    {
      route: "/production",
      label: "Production & Manufacturing",
      spoken: isHindi ? "प्रोडक्शन और वर्क ऑर्डर्स खोले जा रहे हैं..." : "Opening Production & Work Orders...",
      keywords: ["production", "manufacturing", "job card", "job cards", "work order", "work orders", "bom", "bill of materials", "factory operations", "प्रोडक्शन", "कारखाना", "मैन्युफैक्चरिंग"]
    },
    // 16. Hiring & Recruitment
    {
      route: "/hiring",
      label: "Hiring & Recruitment",
      spoken: isHindi ? "भर्ती और इंटरव्यू पोर्टल खोला जा रहा है..." : "Opening Hiring & Recruitment Portal...",
      keywords: ["hiring", "recruitment", "job opening", "job openings", "applicant", "applicants", "candidate", "candidates", "careers", "interview", "interviews", "jobs", "भर्ती", "नौकरी"]
    },
    // 17. Pipeline & Deals
    {
      route: "/pipeline",
      label: "Sales Pipeline",
      spoken: isHindi ? "सेल्स पाइपलाइन खोली जा रही है..." : "Opening Sales Pipeline & Deals Funnel...",
      keywords: ["pipeline", "pipelines", "sales pipeline", "deal", "deals", "sales funnel", "deal stage", "deal stages", "पाइपलाइन"]
    },
    // 18. Follow-ups & Reminders
    {
      route: "/follow-ups",
      label: "Follow-ups & Reminders",
      spoken: isHindi ? "फॉलो-अप और रिमाइंडर खोले जा रहे हैं..." : "Opening Follow-ups & Scheduled Reminders...",
      keywords: ["follow up", "follow ups", "followup", "followups", "scheduled reminder", "payment reminder", "client follow up", "reminders", "reminder", "फॉलोअप", "रिमाइंडर"]
    },
    // 19. Customer Payments
    {
      route: "/payments",
      label: "Customer Payments",
      spoken: isHindi ? "कस्टमर पेमेंट रसीदें खोली जा रही हैं..." : "Opening Customer Payment Receipts...",
      keywords: ["customer payment", "customer payments", "payment receipt", "payment receipts", "receipt voucher", "receipt vouchers", "money received", "collections", "payments", "payment", "पेमेंट रसीद", "पेमेंट मिला"]
    },
    // 20. Invoices
    {
      route: lower.includes("create") || lower.includes("new") || lower.includes("add") || lower.includes("banao") || lower.includes("बनाओ") || lower.includes("नया") ? "/invoices?action=new" : "/invoices",
      label: "Invoices & Billing",
      spoken: isHindi ? "इनवॉइस और बिलिंग खोली जा रही है..." : "Opening Invoices & Billing...",
      keywords: ["invoice", "invoices", "tax invoice", "sales bill", "sales bills", "billing", "इनवॉइस", "बिल", "चालान", "बिल्स"]
    },
    // 21. Sales Orders
    {
      route: lower.includes("create") || lower.includes("new") || lower.includes("banao") || lower.includes("बनाओ") ? "/orders/new" : "/orders",
      label: "Sales Orders",
      spoken: isHindi ? "सेल्स ऑर्डर्स खोले जा रहे हैं..." : "Opening Sales Orders...",
      keywords: ["order", "orders", "sales order", "sales orders", "booking", "bookings", "ऑर्डर", "ऑर्डर्स", "बुकिंग"]
    },
    // 22. Quotations
    {
      route: lower.includes("create") || lower.includes("new") || lower.includes("banao") || lower.includes("बनाओ") ? "/quotations/new" : "/quotations",
      label: "Quotations",
      spoken: isHindi ? "कोटेशन खोले जा रहे हैं..." : "Opening Quotations...",
      keywords: ["quotation", "quotations", "quote", "quotes", "estimate", "estimates", "proforma", "कोटेशन", "एस्टीमेट", "क्वोटेशन", "कोटेशन लिस्ट"]
    },
    // 23. Customers
    {
      route: lower.includes("create") || lower.includes("new") || lower.includes("add") || lower.includes("banao") || lower.includes("जोड़ो") || lower.includes("नया") ? "/customers?action=new" : "/customers",
      label: "Customers Directory",
      spoken: isHindi ? "ग्राहक सूची खोली जा रही है..." : "Opening Customers Directory...",
      keywords: ["customer", "customers", "client", "clients", "party", "parties", "buyer", "buyers", "crm", "ग्राहक", "कस्टमर", "पार्टी", "पार्टियां"]
    },
    // 24. Products & Inventory
    {
      route: lower.includes("create") || lower.includes("new") || lower.includes("add") || lower.includes("banao") || lower.includes("जोड़ो") || lower.includes("नया") ? "/products?action=new" : "/products",
      label: "Inventory & Products",
      spoken: isHindi ? "इन्वेंट्री और प्रोडक्ट्स खोले जा रहे हैं..." : "Opening Inventory & Products...",
      keywords: ["product", "products", "item", "items", "stock", "inventory", "sku", "skus", "goods", "प्रोडक्ट्स", "प्रोडक्ट", "आइटम्स", "सामान", "स्टॉक", "इन्वेंट्री", "गोदाम", "माल"]
    },
    // 25. Purchases & Procurement
    {
      route: "/purchases",
      label: "Purchases & Procurement",
      spoken: isHindi ? "खरीद और खरीद ऑर्डर खोले जा रहे हैं..." : "Opening Purchase Orders & Procurement...",
      keywords: ["purchase", "purchases", "purchase order", "purchase orders", "po", "procurement", "खरीद", "परचेज"]
    },
    // 26. Vendors & Suppliers
    {
      route: "/vendors",
      label: "Vendors Master",
      spoken: isHindi ? "वेंडर्स और सप्लायर्स खोले जा रहे हैं..." : "Opening Vendors Master...",
      keywords: ["vendor", "vendors", "supplier", "suppliers", "creditor", "creditors", "वेंडर", "सप्लायर", "व्यापारी"]
    },
    // 27. Expenses
    {
      route: "/expenses",
      label: "Expenses Tracker",
      spoken: isHindi ? "खर्चा ट्रैकर खोला जा रहा है..." : "Opening Expense Tracker...",
      keywords: ["expense", "expenses", "kharcha", "petty cash", "spending", "खर्चा", "खर्च"]
    },
    // 28. Leaderboard
    {
      route: "/leaderboard",
      label: "Leaderboard",
      spoken: "Opening Sales Sprint Leaderboard...",
      keywords: ["leaderboard", "sales sprint", "sprint page", "sales target", "sales targets", "लीडरबोर्ड"]
    },
    // 29. Leads
    {
      route: "/leads",
      label: "Leads Pipeline",
      spoken: "Opening Leads Pipeline...",
      keywords: ["lead", "leads", "sales lead", "sales leads", "enquiry", "enquiries", "inquiry", "inquiries", "लीड्स"]
    },
    {
      route: "/pipeline",
      label: "Sales Pipeline",
      spoken: isHindi ? "सेल्स पाइपलाइन खोली जा रही है..." : "Opening Sales Pipeline...",
      keywords: ["pipeline", "sales pipeline", "crm pipeline", "deal pipeline", "deals", "पाइपलाइन"]
    },
    // 30. Leaves
    {
      route: "/leaves",
      label: "Leave Applications",
      spoken: isHindi ? "छुट्टी आवेदन खोले जा रहे हैं..." : "Opening Leave Applications...",
      keywords: ["leave", "leaves", "chhutti", "time off", "vacation", "sick leave", "casual leave", "छुट्टी", "लीव"]
    },
    // 31. Payroll & Salary
    {
      route: "/payroll",
      label: "Payroll & Salaries",
      spoken: isHindi ? "वेतन और पेरोल खोला जा रहा है..." : "Opening Payroll & Salary Register...",
      keywords: ["payroll", "salary", "salaries", "payslip", "payslips", "wage", "wages", "वेतन", "सैलरी", "पेरोल"]
    },
    // 32. Attendance & HRMS
    {
      route: "/attendance",
      label: "Attendance & HRMS",
      spoken: isHindi ? "हाजिरी और उपस्थिति खोली जा रही है..." : "Opening Attendance & HRMS...",
      keywords: ["attendance", "present staff", "hrms", "biometric", "employee", "employees", "staff", "हाजिरी", "अटेंडेंस", "उपस्थिति"]
    },
    // 33. Tasks
    {
      route: "/tasks",
      label: "Tasks & To-Dos",
      spoken: isHindi ? "टास्क और काम की सूची खोली जा रही है..." : "Opening Tasks & To-Dos...",
      keywords: ["task", "tasks", "to do", "todo", "todos", "action item", "action items", "टास्क", "काम"]
    },
    // 34. Accounting General & Financial Statements
    {
      route: "/accounting",
      label: "Financial Statements & Accounting",
      spoken: isHindi ? "वित्तीय विवरण और अकाउंटिंग डैशबोर्ड खोला जा रहा है..." : "Opening Financial Statements & Accounting Dashboard...",
      keywords: [
        "accounting",
        "accounts",
        "general ledger",
        "financial accounting",
        "ledger",
        "financial statement",
        "financial statements",
        "financials",
        "financial report",
        "financial reports",
        "financial summary",
        "finance",
        "statements",
        "वित्तीय विवरण",
        "वित्तीय रिपोर्ट",
        "अकाउंट्स",
        "खाताबही"
      ]
    },
    // 35. Reports
    {
      route: "/reports",
      label: "Executive Reports",
      spoken: isHindi ? "रिपोर्ट्स खोली जा रही हैं..." : "Opening Executive Reports & BI...",
      keywords: ["report", "reports", "mis report", "mis reports", "sales report", "tax report", "रिपोर्ट्स", "रिपोर्ट", "विवरण"]
    },
    // 36. Integrations
    {
      route: "/integrations",
      label: "Integrations & APIs",
      spoken: "Opening Connected Integrations & APIs...",
      keywords: ["integration", "integrations", "connected app", "connected apps", "webhook", "webhooks", "api key", "api keys", "zapier"]
    },
    // 37. Platform Admin
    {
      route: "/platform-admin",
      label: "Platform Administration",
      spoken: "Opening Platform Administration...",
      keywords: ["platform admin", "super admin", "tenant admin", "saas admin", "manage tenants"]
    },
    // 38. Profile
    {
      route: "/profile",
      label: "My Profile",
      spoken: "Opening Your Profile...",
      keywords: ["profile", "my profile", "user profile", "my account", "account settings", "change password"]
    },
    // 39. Settings Sub-pages
    {
      route: "/settings/taxes",
      label: "Tax Settings",
      spoken: "Opening Tax & GST Settings...",
      keywords: ["tax settings", "taxes", "gst settings", "gst rate", "hsn code", "hsn codes"]
    },
    {
      route: "/settings/organization",
      label: "Organization Settings",
      spoken: "Opening Organization Profile...",
      keywords: ["company profile", "organization settings", "organization", "company details", "business details"]
    },
    {
      route: "/settings/roles",
      label: "Roles & Permissions",
      spoken: "Opening User Roles & Permissions...",
      keywords: ["roles", "user roles", "permissions", "user access", "role management"]
    },
    {
      route: "/settings/branches",
      label: "Branch Management",
      spoken: "Opening Branch Management...",
      keywords: ["branch settings", "branches", "branch"]
    },
    {
      route: "/settings/notifications",
      label: "Notification Settings",
      spoken: "Opening Notification Settings...",
      keywords: ["notification settings", "notifications", "notification", "alerts"]
    },
    {
      route: "/settings/email",
      label: "Email Settings",
      spoken: "Opening Email & SMTP Settings...",
      keywords: ["email settings", "smtp", "smtp settings"]
    },
    {
      route: "/settings/templates",
      label: "Document Templates",
      spoken: "Opening Document Templates...",
      keywords: ["templates", "template", "invoice template", "print template"]
    },
    {
      route: "/settings/workflows",
      label: "Approval Workflows",
      spoken: "Opening Approval Workflows...",
      keywords: ["workflows", "workflow", "approval workflow", "automation"]
    },
    {
      route: "/settings/numbering",
      label: "Numbering Series",
      spoken: "Opening Numbering Series Settings...",
      keywords: ["numbering", "number series", "invoice series", "numbering series"]
    },
    {
      route: "/settings/backup",
      label: "Backup & Export",
      spoken: "Opening Backup & Data Export...",
      keywords: ["backup", "backups", "database backup", "data export"]
    },
    {
      route: "/settings/audit-logs",
      label: "Audit Logs",
      spoken: "Opening System Audit Logs...",
      keywords: ["audit log", "audit logs", "activity log", "security log"]
    },
    {
      route: "/settings/import-export",
      label: "Import & Export",
      spoken: "Opening Data Import & Export...",
      keywords: ["import export", "bulk import", "excel upload"]
    },
    {
      route: "/settings/territories",
      label: "Territories",
      spoken: "Opening Sales Territories...",
      keywords: ["territories", "territory", "sales territories"]
    },
    {
      route: "/settings?action=theme",
      label: "Appearance Settings",
      spoken: "Opening Theme & Appearance settings...",
      keywords: ["dark mode", "theme", "appearance", "light mode"]
    },
    {
      route: "/settings",
      label: "Settings",
      spoken: "Opening Company Settings...",
      keywords: ["setting", "settings", "configuration", "preferences"]
    },
    // 40. Scanner
    {
      route: "/scan",
      label: "Barcode Scanner",
      spoken: "Opening Barcode Scanner...",
      keywords: ["scanner", "barcode", "barcode scanner", "qr code", "qr scanner", "scan"]
    },
    // 41. Catalog
    {
      route: "/catalog",
      label: "Product Catalog",
      spoken: "Opening Product Catalog...",
      keywords: ["catalog", "catalogue", "online catalog", "public catalog"]
    },
    // 42. Dead Stock & Inventory Liquidation Engine
    {
      route: "/inventory?tab=deadstock",
      label: "Dead Stock & Liquidation Engine",
      spoken: isHindi ? "डेड स्टॉक और इन्वेंट्री लिक्विडेशन इंजन खोला जा रहा है..." : "Opening Dead Stock & Inventory Liquidation Engine...",
      keywords: [
        "dead stock",
        "deadstock",
        "liquidation",
        "liquidation engine",
        "dead inventory",
        "aging stock",
        "inventory liquidation",
        "dead stock liquidation",
        "slow moving",
        "slow moving stock",
        "डेड स्टॉक",
        "लिक्विडेशन",
        "डेड इन्वेंटरी"
      ]
    },
    // 43. AI Reorder Predictor
    {
      route: "/inventory?tab=reorder",
      label: "AI Reorder Predictor",
      spoken: isHindi ? "एआई रीऑर्डर प्रिडिक्टर खोला जा रहा है..." : "Opening AI Reorder Predictor...",
      keywords: [
        "reorder predictor",
        "reorder",
        "reorder prediction",
        "reorder alerts",
        "stock prediction",
        "predict reorder",
        "reorder report",
        "रीऑर्डर",
        "रीऑर्डर प्रेडिक्टर"
      ]
    },
    // 44. Dashboard
    {
      route: "/",
      label: "Dashboard",
      spoken: "Opening Executive Dashboard...",
      keywords: ["dashboard", "home", "main page", "overview"]
    }
  ];

  for (const def of definitions) {
    for (const kw of def.keywords) {
      if (
        stripped === kw ||
        lower === kw ||
        stripped.startsWith(kw + " ") ||
        stripped.endsWith(" " + kw) ||
        stripped.includes(" " + kw + " ") ||
        new RegExp(`(^|[^a-zA-Z0-9\u0900-\u097F])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zA-Z0-9\u0900-\u097F]|$)`, "iu").test(stripped)
      ) {
        return {
          route: def.route,
          label: def.label,
          spokenText: def.spoken
        };
      }
    }
  }

  return null;
}

/**
 * Universal Voice AI Command & Navigation Engine
 * Handles every screen, action, search, creation, and business query across all ERP modules.
 */
/**
 * Deeply sanitizes objects returned by Server Actions so they are 100% plain,
 * JSON-serializable primitives without undefined, functions, or circular references.
 * This guarantees zero RSC Flight serialization failures (e.g. Minified React error #441).
 */
function sanitizeServerResponse<T>(res: T): T {
  try {
    return JSON.parse(
      JSON.stringify(res, (key, value) => {
        if (value === undefined) return null;
        if (typeof value === "bigint") return value.toString();
        return value;
      })
    );
  } catch {
    return res;
  }
}

export async function executeVoiceCommand(
  spokenText: string,
  preferredProvider?: "gemini" | "openai",
  pendingContext?: VoicePendingContext | null
): Promise<VoiceAssistantResponse> {
  try {
    const res = await internalExecuteVoiceCommand(spokenText, preferredProvider, pendingContext);
    return sanitizeServerResponse(res);
  } catch (err: any) {
    console.error("Critical outer error in executeVoiceCommand:", err);
    return sanitizeServerResponse({
      success: false,
      spokenText: "I encountered an issue processing that voice command. Please try again.",
      actionText: "Error processing command",
      route: "/"
    });
  }
}

export interface CanonicalSalesMetrics {
  totalRevenue: number;
  totalOrdersCount: number;
  mtdRevenue: number;
  mtdOrdersCount: number;
  todayRevenue: number;
  todayOrdersCount: number;
  todayExpensesSum: number;
}

/**
 * Computes canonical business revenue metrics matching the Admin Dashboard exactly:
 * Includes Sales Orders + Standalone Confirmed Quotations (committed deal revenue).
 */
export async function getCanonicalSalesMetrics(organizationId: string): Promise<CanonicalSalesMetrics> {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const istYear = istNow.getUTCFullYear();
  const istMonth = istNow.getUTCMonth();
  const istDate = istNow.getUTCDate();

  const startOfToday = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0) - istOffset);
  const endOfToday = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffset);
  const startOfMonth = new Date(Date.UTC(istYear, istMonth, 1, 0, 0, 0) - istOffset);
  const endOfMonth = new Date(Date.UTC(istYear, istMonth + 1, 0, 23, 59, 59, 999) - istOffset);

  const [allOrders, allConfirmedQuotes, todayExpenses] = await Promise.all([
    prisma.order.findMany({
      where: { organizationId },
      select: {
        id: true,
        orderNumber: true,
        totalValue: true,
        subtotal: true,
        orderDate: true,
        createdAt: true,
        notes: true,
        paymentStatus: true
      }
    }),
    prisma.quotation.findMany({
      where: {
        organizationId,
        status: { in: ['Confirmed', 'Converted'] }
      },
      select: {
        id: true,
        quotationNumber: true,
        totalValue: true,
        status: true,
        date: true,
        createdAt: true,
        updatedAt: true,
        acceptedDate: true,
        activities: {
          where: { action: { in: ['Quotation Confirmed', 'Converted to Order'] } },
          select: { action: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 2
        }
      }
    }),
    prisma.expense.findMany({
      where: {
        employee: { organizationId },
        date: { gte: startOfToday, lte: endOfToday }
      },
      select: { amount: true }
    })
  ]);

  const orgQuoteByNumber = new Map<string, any>();
  allConfirmedQuotes.forEach((q: any) => {
    if (q.quotationNumber) {
      orgQuoteByNumber.set(q.quotationNumber.trim().toUpperCase(), q);
    }
  });

  const convertedQuoteNumbers = new Set<string>();
  allOrders.forEach((o: any) => {
    const match = (o.notes || '').match(/Quotation\s*#?\s*([A-Za-z0-9\-_/.]+)/i);
    if (match && match[1]) {
      convertedQuoteNumbers.add(match[1].trim().toUpperCase());
    }
  });

  const standaloneConfirmedQuotes = allConfirmedQuotes.filter((q: any) => {
    if (q.status !== 'Confirmed') return false;
    const qNum = (q.quotationNumber || '').trim().toUpperCase();
    if (!qNum) return false;
    if (convertedQuoteNumbers.has(qNum)) return false;
    if (allOrders.some((o: any) => (o.notes || '').toUpperCase().includes(qNum))) return false;
    return true;
  });

  const getQuotationDealDate = (q: any): Date => {
    if (q.acceptedDate) return new Date(q.acceptedDate);
    if (q.activities && q.activities.length > 0) {
      const act = q.activities.find((a: any) => a.action === 'Quotation Confirmed' || a.action === 'Converted to Order');
      if (act?.createdAt) return new Date(act.createdAt);
    }
    if ((q.status === 'Confirmed' || q.status === 'Converted') && q.updatedAt) {
      return new Date(q.updatedAt);
    }
    return q.date ? new Date(q.date) : (q.createdAt ? new Date(q.createdAt) : new Date());
  };

  const getEffectiveOrderDate = (o: any): Date => {
    const match = (o.notes || '').match(/Quotation\s*#?\s*([A-Za-z0-9\-_/.]+)/i);
    if (match && match[1]) {
      const qNum = match[1].trim().toUpperCase();
      const linkedQuote = orgQuoteByNumber.get(qNum);
      if (linkedQuote) {
        return getQuotationDealDate(linkedQuote);
      }
    }
    return o.orderDate ? new Date(o.orderDate) : (o.createdAt ? new Date(o.createdAt) : new Date());
  };

  // 1. All-time Total Revenue & Orders (matches Dashboard exactly)
  const ordersRevenue = allOrders.reduce((sum: number, o: any) => sum + Number(o.totalValue || o.subtotal || 0), 0);
  const standaloneQuotRevenue = standaloneConfirmedQuotes.reduce((sum: number, q: any) => sum + Number(q.totalValue || 0), 0);
  const totalRevenue = ordersRevenue + standaloneQuotRevenue;
  const totalOrdersCount = allOrders.length + standaloneConfirmedQuotes.length;

  // 2. MTD Revenue & Orders (matches Dashboard MTD)
  const mtdOrders = allOrders.filter((o: any) => {
    const eff = getEffectiveOrderDate(o);
    return eff >= startOfMonth && eff <= endOfMonth;
  });
  const mtdQuotes = standaloneConfirmedQuotes.filter((q: any) => {
    const qd = getQuotationDealDate(q);
    return qd >= startOfMonth && qd <= endOfMonth;
  });
  const mtdRevenue = mtdOrders.reduce((sum: number, o: any) => sum + Number(o.totalValue || o.subtotal || 0), 0) +
                     mtdQuotes.reduce((sum: number, q: any) => sum + Number(q.totalValue || 0), 0);
  const mtdOrdersCount = mtdOrders.length + mtdQuotes.length;

  // 3. Today's Revenue & Orders (matches Dashboard Today)
  const todayOrders = allOrders.filter((o: any) => {
    const eff = getEffectiveOrderDate(o);
    return eff >= startOfToday && eff <= endOfToday;
  });
  const todayQuotes = standaloneConfirmedQuotes.filter((q: any) => {
    const qd = getQuotationDealDate(q);
    return qd >= startOfToday && qd <= endOfToday;
  });
  const todayRevenue = todayOrders.reduce((sum: number, o: any) => sum + Number(o.totalValue || o.subtotal || 0), 0) +
                       todayQuotes.reduce((sum: number, q: any) => sum + Number(q.totalValue || 0), 0);
  const todayOrdersCount = todayOrders.length + todayQuotes.length;
  const todayExpensesSum = todayExpenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  return {
    totalRevenue,
    totalOrdersCount,
    mtdRevenue,
    mtdOrdersCount,
    todayRevenue,
    todayOrdersCount,
    todayExpensesSum
  };
}

export async function internalExecuteVoiceCommand(
  spokenText: string,
  preferredProvider?: "gemini" | "openai",
  pendingContext?: VoicePendingContext | null
): Promise<VoiceAssistantResponse> {
  if (!spokenText || !spokenText.trim()) {
    return {
      spokenText: "I didn't catch that. Please tap the microphone or speak your command.",
      actionText: "No speech detected",
      success: false
    };
  }

  const rawOriginal = spokenText.trim();
  const strippedVoice = stripVoicePhrasing(rawOriginal);
  const effectiveInput = strippedVoice.length > 0 ? strippedVoice : rawOriginal;
  const { normalized: raw, isHindi } = normalizeHindiInput(effectiveInput);
  const lower = raw.toLowerCase();

  try {
    let organizationId: string | null = null;
    try {
      organizationId = await getTenantOrgId();
    } catch {
      const firstOrg = await prisma.organization.findFirst({ select: { id: true } });
      organizationId = firstOrg?.id || null;
    }
    if (!organizationId) {
      return {
        spokenText: "Please log in to your account to use the voice assistant.",
        actionText: "Authentication required",
        success: false
      };
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // ========================================================================
    // GLOBAL CANCELLATION HANDLER
    // ========================================================================
    const isCancellation =
      lower === "cancel" ||
      lower === "stop" ||
      lower === "abort" ||
      lower === "exit" ||
      lower === "leave it" ||
      lower === "forget it" ||
      lower === "mat karo" ||
      lower === "nahi" ||
      lower === "no" ||
      lower === "कैंसल" ||
      lower === "रद्द करो" ||
      lower === "रद्द" ||
      lower === "मत करो" ||
      lower === "रोक दो" ||
      lower === "बंद करो" ||
      lower === "नहीं" ||
      lower.startsWith("cancel ") ||
      lower.startsWith("stop ") ||
      lower.includes("cancel this") ||
      lower.includes("cancel quotation") ||
      lower.includes("cancel quote") ||
      lower.includes("cancel invoice") ||
      lower.includes("cancel order") ||
      lower.includes("cancel product") ||
      lower.includes("cancel action") ||
      lower.includes("रद्द") ||
      lower.includes("कैंसल") ||
      lower.includes("कैंसिल") ||
      lower.includes("मत करो") ||
      lower.includes("रोक दो");

    if (isCancellation) {
      return {
        success: true,
        spokenText: isHindi
          ? "कार्य रद्द कर दिया गया है। मैं ईआरपी में आपकी क्या सहायता कर सकता हूँ?"
          : "Action cancelled. How else can I assist you with ERP operations?",
        actionText: isHindi ? "रद्द किया गया" : "Action Cancelled",
        cardType: "GENERAL"
      };
    }

    // ========================================================================
    // STANDALONE VOICE CAPABILITY CHECK (e.g. "बोल के बताओ", "can you speak", "वॉयस आउटपुट")
    // ========================================================================
    const lowerOriginal = rawOriginal.toLowerCase();
    const isVoiceCapabilityCheck =
      lowerOriginal === "बोल के बताओ" ||
      lowerOriginal === "बोलकर बताओ" ||
      lowerOriginal === "आवाज में बताओ" ||
      lowerOriginal === "आवाज़ में बताओ" ||
      lowerOriginal === "वॉयस में बताओ" ||
      lowerOriginal === "वॉइस में बताओ" ||
      lowerOriginal === "क्या आप बोल सकते हो" ||
      lowerOriginal === "बोल सकते हो" ||
      lowerOriginal === "आवाज आ रही है" ||
      lowerOriginal === "वॉयस आउटपुट" ||
      lowerOriginal === "वॉइस आउटपुट" ||
      lowerOriginal === "voice output" ||
      lowerOriginal === "can you speak" ||
      lowerOriginal === "speak to me" ||
      lowerOriginal === "say something" ||
      lowerOriginal === "are you speaking" ||
      lowerOriginal === "test voice";

    if (isVoiceCapabilityCheck) {
      return {
        success: true,
        spokenText: isHindi
          ? "हाँ, वॉयस आउटपुट पूरी तरह सक्रिय है और मैं बोल कर आपकी सहायता कर सकता हूँ! आप मुझसे आज की बिक्री, किसी पार्टी का हिसाब या नया कोटेशन बनाने के लिए कह सकते हैं।"
          : "Yes, voice output is fully active and I can speak aloud to assist you! You can ask me about today's sales, customer balances, or creating a new quotation.",
        actionText: isHindi ? "वॉयस आउटपुट सक्रिय है" : "Voice Output Active",
        route: "/dashboard",
        cardType: "GENERAL",
        suggestedActions: [
          { label: isHindi ? "📊 आज की बिक्री" : "📊 Today's Sales", voiceCommand: "आज की बिक्री कितनी है" },
          { label: isHindi ? "📝 नया कोटेशन" : "📝 New Quotation", href: "/quotations/new" },
          { label: isHindi ? "👥 ग्राहक सूची" : "👥 Customers", href: "/customers" }
        ]
      };
    }

    // ========================================================================
    // STANDALONE OPEN / NAVIGATION INTENT (e.g. "open", "ओपन", "खोलो", "dikhao")
    // ========================================================================
    const isGeneralOpenCommand =
      lower === "open" ||
      lower === "kholo" ||
      lower === "ओपन" ||
      lower === "खोलो" ||
      lower === "खोलें" ||
      lower === "खोल" ||
      lower === "खोल दो" ||
      lower === "दिखाओ" ||
      lower === "dikhao" ||
      lower === "dikhaye" ||
      lower === "dikhana" ||
      lower === "दिखाइए" ||
      lower === "दिखाएं" ||
      lower === "ले चलो" ||
      lower === "पे जाओ" ||
      lower === "par jao" ||
      lower === "open page" ||
      lower === "open screen" ||
      lower === "open menu" ||
      lower === "modules" ||
      lower === "all modules" ||
      lower === "सारे मॉड्यूल";

    if (isGeneralOpenCommand) {
      return {
        success: true,
        spokenText: isHindi
          ? "आप क्या खोलना चाहते हैं? जैसे: कोटेशन, इनवॉइस, ग्राहक (पार्टी), या रिपोर्ट्स।"
          : "What would you like to open? You can choose a module below: Quotations, Invoices, Customers, or Reports.",
        actionText: isHindi ? "ERP मॉड्यूल चुनें" : "Select ERP Module",
        route: "/dashboard",
        cardType: "NAVIGATION",
        suggestedActions: [
          { label: isHindi ? "📝 नया कोटेशन" : "📝 New Quotation", href: "/quotations/new" },
          { label: isHindi ? "🧾 इनवॉइस (बिल)" : "🧾 Invoices", href: "/invoices" },
          { label: isHindi ? "👥 ग्राहक / पार्टी" : "👥 Customers", href: "/customers" },
          { label: isHindi ? "📦 प्रोडक्ट्स / स्टॉक" : "📦 Products", href: "/products" },
          { label: isHindi ? "📊 रिपोर्ट्स" : "📊 Reports", href: "/reports" },
          { label: isHindi ? "📞 कॉल्स / डायलर" : "📞 Calls & Dialer", href: "/calls" }
        ]
      };
    }

    // ========================================================================
    // FAST TRACK: LEARNED ORGANIZATIONAL ALIASES & RULES (LEARNING MODE)
    // ========================================================================
    try {
      const learned = await matchVoiceLearningRule(lower);
      if (learned) {
        if (learned.action === "ADD_QUOTATION_ITEM") {
          const item = (learned.data as any) || {};
          return {
            success: true,
            spokenText: isHindi
              ? `${item.quantity || 1} ${item.productName || 'आइटम'} कोटेशन में जोड़ दिया गया है (सीखा हुआ नियम)।`
              : `Added ${item.quantity || 1} ${item.productName || 'item'} to quotation (learned command).`,
            actionText: `Added ${item.productName || 'Item'} (Learned Alias)`,
            route: "/quotations/new",
            clientAction: {
              type: "ADD_QUOTATION_ITEM",
              data: {
                productName: item.productName || learned.phrase,
                quantity: Number(item.quantity) || 1,
                unitPrice: Number(item.unitPrice) || 0
              }
            },
            cardType: "CLIENT_ACTION"
          };
        } else if (learned.action === "NAVIGATE" && (learned.data as any)?.route) {
          return {
            success: true,
            spokenText: isHindi ? "स्क्रीन खोली जा रही है।" : "Navigating to requested screen.",
            actionText: `Navigating to ${(learned.data as any).route}`,
            route: (learned.data as any).route,
            cardType: "NAVIGATION"
          };
        }
      }
    } catch {
      // Continue to standard regex patterns
    }

    // ========================================================================
    // IN-APP SOFTWARE GUIDE & HOW-TO COPILOT
    // ========================================================================
    const isGuideRequest =
      lower === "guide" ||
      lower === "help" ||
      lower === "guide me" ||
      lower === "software guide" ||
      lower === "erp guide" ||
      lower === "guide full software" ||
      lower === "guide the software" ||
      lower === "how to use" ||
      lower === "how to use software" ||
      lower === "how to operate" ||
      lower === "full software guide" ||
      lower === "failed to guide" ||
      lower === "walkthrough" ||
      lower === "tutorial" ||
      lower === "overview" ||
      lower === "गाइड" ||
      lower === "सॉफ्टवेयर गाइड" ||
      lower === "मदद" ||
      lower === "सॉफ्टवेयर कैसे चलाएं" ||
      lower.includes("guide") ||
      lower.includes("गाइड") ||
      /(?:^|\s)how\s+to(?:\s|$)/i.test(lower) ||
      /(?:^|\s)how\s+do\s+i(?:\s|$)/i.test(lower) ||
      /(?:^|\s)how\s+can\s+i(?:\s|$)/i.test(lower) ||
      /(?:^|\s)how\s+should\s+i(?:\s|$)/i.test(lower) ||
      /(?:^|\s)how\s+would\s+i(?:\s|$)/i.test(lower) ||
      /(?:^|\s)tell\s+me\s+how(?:\s|$)/i.test(lower) ||
      /(?:^|\s)show\s+me\s+how(?:\s|$)/i.test(lower) ||
      /(?:^|\s)explain\s+how(?:\s|$)/i.test(lower) ||
      /(?:^|\s)how\s+(?:to|can\s+i|do\s+i)\s+(?:make|create|generate|add|build)\b/i.test(lower) ||
      lower.includes("walkthrough") ||
      lower.includes("कैसे करें") ||
      lower.includes("का तरीका") ||
      /(?:कैसे|kaise)\s+(?:banaye|banayein|banate|banaen|karein|kare|karte|jodein|jode|hoga)/i.test(lower) ||
      /(?:banana|karna|jodna)\s+(?:sikhaye|sikhao|batao|samjhao)/i.test(lower) ||
      /(?:ka|ki|ke)\s+tarika\b/i.test(lower) ||
      /(?:का|की|के)\s+तरीका/i.test(lower) ||
      /(?:कैसे\s+बनाएं|कैसे\s+बनाते|कैसे\s+जोड़ें|कैसे\s+लगाएं)/i.test(lower) ||
      /(?:बनाना|जोड़ना|लगाना)\s+(?:सिखाओ|बताओ|समझाओ)/i.test(lower);

    if (isGuideRequest) {
      try {
        const guideRes = await searchErpGuide(spokenText, preferredProvider);
        if (guideRes.success && guideRes.article) {
          const art = guideRes.article;
          const spoken = isHindi && art.titleHindi
            ? `${art.titleHindi}। ${art.summary}`
            : `${art.title}। ${art.summary}`;

          return {
            success: true,
            spokenText: spoken,
            actionText: art.title,
            route: art.targetRoute || "/dashboard",
            cardType: "GUIDE",
            cardData: {
              title: art.title,
              titleHindi: art.titleHindi,
              summary: art.summary,
              steps: art.steps,
              targetRoute: art.targetRoute
            },
            suggestedActions: art.suggestedActions || [
              { label: "Open Screen", href: art.targetRoute }
            ]
          };
        }
      } catch (err) {
        console.error("Guide handler error in voiceActions:", err);
      }
    }

    // ========================================================================
    // DIRECT MODULE NAVIGATION KEYWORDS
    // ========================================================================
    if (
      lower === "customer" ||
      lower === "customers" ||
      lower === "client" ||
      lower === "clients" ||
      lower === "all customers" ||
      lower === "show customers" ||
      lower === "view customers" ||
      lower === "list customers" ||
      lower === "ग्राहक" ||
      lower === "कस्टमर" ||
      lower === "पार्टी" ||
      lower.includes("ग्राहक सूची") ||
      lower.includes("कस्टमर सूची") ||
      lower.includes("ग्राहकों की सूची") ||
      lower.includes("कस्टमर लिस्ट")
    ) {
      return {
        success: true,
        spokenText: isHindi ? "ग्राहक सूची खोली जा रही है..." : "Opening Customers Directory...",
        actionText: isHindi ? "ग्राहक सूची" : "Go to Customers",
        route: "/customers",
        cardType: "NAVIGATION"
      };
    }

    if (
      lower === "product" ||
      lower === "products" ||
      lower === "inventory" ||
      lower === "stock" ||
      lower === "all products" ||
      lower === "show products" ||
      lower === "view products" ||
      lower === "प्रोडक्ट" ||
      lower === "प्रोडक्ट्स" ||
      lower === "स्टॉक" ||
      lower === "माल"
    ) {
      return {
        success: true,
        spokenText: isHindi ? "इन्वेंट्री और प्रोडक्ट्स खोले जा रहे हैं..." : "Opening Inventory & Products...",
        actionText: isHindi ? "प्रोडक्ट्स" : "Go to Products",
        route: "/products",
        cardType: "NAVIGATION"
      };
    }

    if (
      lower === "quotation" ||
      lower === "quotations" ||
      lower === "quote" ||
      lower === "quotes" ||
      lower === "all quotations" ||
      lower === "show quotations" ||
      lower === "view quotations" ||
      lower === "कोटेशन" ||
      lower === "एस्टीमेट"
    ) {
      return {
        success: true,
        spokenText: isHindi ? "कोटेशन सूची खोली जा रही है..." : "Opening Quotations...",
        actionText: isHindi ? "कोटेशन" : "Go to Quotations",
        route: "/quotations",
        cardType: "NAVIGATION"
      };
    }

    if (
      lower === "order" ||
      lower === "orders" ||
      lower === "sales orders" ||
      lower === "all orders" ||
      lower === "show orders" ||
      lower === "view orders" ||
      lower === "ऑर्डर" ||
      lower === "ऑर्डर्स"
    ) {
      return {
        success: true,
        spokenText: isHindi ? "सेल्स ऑर्डर्स खोले जा रहे हैं..." : "Opening Sales Orders...",
        actionText: isHindi ? "ऑर्डर्स" : "Go to Orders",
        route: "/orders",
        cardType: "NAVIGATION"
      };
    }

    if (
      lower === "invoice" ||
      lower === "invoices" ||
      lower === "all invoices" ||
      lower === "show invoices" ||
      lower === "view invoices" ||
      lower === "इनवॉइस" ||
      lower === "बिल" ||
      lower === "चालान"
    ) {
      return {
        success: true,
        spokenText: isHindi ? "इनवॉइस और बिल रजिस्टर खोला जा रहा है..." : "Opening Invoices Register...",
        actionText: isHindi ? "इनवॉइस" : "Go to Invoices",
        route: "/invoices",
        cardType: "NAVIGATION"
      };
    }

    // ------------------------------------------------------------------------
    // PASSWORD, CREDENTIALS & MULTI-DEVICE SIGNOUT
    // ------------------------------------------------------------------------
    const isPasswordQuery =
      lower === "password" ||
      lower === "change password" ||
      lower === "change my password" ||
      lower === "reset password" ||
      lower === "update password" ||
      lower === "new password" ||
      lower === "पासवर्ड" ||
      lower === "पासवर्ड बदलो" ||
      lower === "पासवर्ड बदलें" ||
      lower === "पासवर्ड चेंज" ||
      lower === "नया पासवर्ड" ||
      lower === "लॉगिन पासवर्ड" ||
      lower.includes("change password") ||
      lower.includes("reset password") ||
      lower.includes("update password") ||
      lower.includes("password kaise") ||
      lower.includes("password badal") ||
      lower.includes("password change") ||
      lower.includes("पासवर्ड कैसे") ||
      lower.includes("पासवर्ड बद") ||
      lower.includes("पासवर्ड चेंज") ||
      lower.includes("sign out of all devices") ||
      lower.includes("sign out all devices") ||
      lower.includes("active devices") ||
      lower.includes("logged in devices") ||
      lower.includes("सभी डिवाइस से लॉग आउट") ||
      lower.includes("कितने डिवाइस");

    if (isPasswordQuery) {
      return {
        success: true,
        spokenText: isHindi
          ? "यूजर और पासवर्ड सेटिंग्स खोली जा रही हैं। आप वहां से नया पासवर्ड सेट कर सकते हैं और सभी डिवाइस से एक क्लिक में लॉग आउट कर सकते हैं।"
          : "Opening User & Password settings. You can set a new password, view active devices, and sign out of all devices.",
        actionText: isHindi ? "पासवर्ड सेटिंग्स खोलें" : "Open Password Settings",
        route: "/settings/roles",
        cardType: "NAVIGATION",
        suggestedActions: [
          { label: "🔑 Open Password Settings", href: "/settings/roles" },
          { label: "⚙️ Company Settings", href: "/settings" }
        ]
      };
    }

    // ------------------------------------------------------------------------
    // LEADS & CRM
    // ------------------------------------------------------------------------
    if (
      lower === "pipeline" ||
      lower === "sales pipeline" ||
      lower === "crm pipeline" ||
      lower === "पाइपलाइन" ||
      lower.includes("pipeline") ||
      lower.includes("पाइपलाइन")
    ) {
      return {
        success: true,
        spokenText: isHindi ? "सेल्स पाइपलाइन खोली जा रही है..." : "Opening Sales Pipeline...",
        actionText: isHindi ? "पाइपलाइन" : "Go to Pipeline",
        route: "/pipeline",
        cardType: "NAVIGATION",
        suggestedActions: [
          { label: "📊 Sales Pipeline", href: "/pipeline" },
          { label: "🎯 Leads CRM", href: "/leads" }
        ]
      };
    }

    if (
      lower === "lead" ||
      lower === "leads" ||
      lower === "crm" ||
      lower === "लीड" ||
      lower === "लीड्स" ||
      lower.includes("show leads") ||
      lower.includes("open leads") ||
      lower.includes("लीड दिखाओ")
    ) {
      return {
        success: true,
        spokenText: isHindi ? "लीड्स और सीआरएम खोला जा रहा है..." : "Opening Leads CRM...",
        actionText: isHindi ? "लीड्स" : "Go to Leads",
        route: "/leads",
        cardType: "NAVIGATION",
        suggestedActions: [
          { label: "🎯 View Leads", href: "/leads" },
          { label: "➕ Add Lead", href: "/leads/new" }
        ]
      };
    }

    // ------------------------------------------------------------------------
    // EXPENSES
    // ------------------------------------------------------------------------
    if (
      lower === "expense" ||
      lower === "expenses" ||
      lower === "petty cash" ||
      lower === "खर्चा" ||
      lower === "खर्चे" ||
      lower === "खर्च" ||
      lower.includes("show expenses") ||
      lower.includes("खर्चे दिखाओ")
    ) {
      return {
        success: true,
        spokenText: isHindi ? "बिजनेस खर्चे और पेटी कैश रजिस्टर खोला जा रहा है..." : "Opening Business Expenses Register...",
        actionText: isHindi ? "खर्चे" : "Go to Expenses",
        route: "/expenses",
        cardType: "NAVIGATION",
        suggestedActions: [
          { label: "💸 View Expenses", href: "/expenses" },
          { label: "➕ Record Expense", href: "/expenses/new" }
        ]
      };
    }

    // ------------------------------------------------------------------------
    // FINANCIAL STATEMENTS & ACCOUNTING
    // ------------------------------------------------------------------------
    const isFinancialStatementsQuery =
      lower === "financial statements" ||
      lower === "financial statement" ||
      lower === "financials" ||
      lower === "financial report" ||
      lower === "financial reports" ||
      lower === "balance sheet" ||
      lower === "profit and loss" ||
      lower === "p&l" ||
      lower === "trial balance" ||
      lower === "day book" ||
      lower === "accounting" ||
      lower === "accounts" ||
      lower === "वित्तीय विवरण" ||
      lower === "बैलेंस शीट" ||
      lower === "प्रॉफिट लॉस" ||
      lower === "अकाउंट्स" ||
      lower === "खाता" ||
      lower.includes("financial statement") ||
      lower.includes("financial statements") ||
      lower.includes("open financial") ||
      lower.includes("show financial") ||
      lower.includes("view financial") ||
      lower.includes("balance sheet") ||
      lower.includes("profit and loss") ||
      lower.includes("profit loss") ||
      lower.includes("trial balance") ||
      lower.includes("day book") ||
      lower.includes("chart of accounts") ||
      lower.includes("bank reconciliation") ||
      lower.includes("वित्तीय विवरण") ||
      lower.includes("अकाउंटिंग");

    if (isFinancialStatementsQuery) {
      const isBS = lower.includes("balance sheet") || lower.includes("बैलेंस शीट");
      const isPL = lower.includes("profit") || lower.includes("loss") || lower.includes("p&l") || lower.includes("लाभ और हानि");
      const isTB = lower.includes("trial balance") || lower.includes("ट्रायल बैलेंस");
      const isDB = lower.includes("day book") || lower.includes("डे बुक");

      const targetRoute = isBS
        ? "/accounting/balance-sheet"
        : isPL
        ? "/accounting/profit-loss"
        : isTB
        ? "/accounting/trial-balance"
        : isDB
        ? "/accounting/day-book"
        : "/accounting";

      const title = isBS
        ? "Schedule III Balance Sheet"
        : isPL
        ? "Profit & Loss Statement"
        : isTB
        ? "Trial Balance"
        : isDB
        ? "Day Book"
        : "Financial Statements & Accounting";

      const spoken = isHindi
        ? `${title} खोला जा रहा है। आप यहां से बैलेंस शीट, लाभ-हानि विवरण, ट्रायल बैलेंस और लेजर देख सकते हैं।`
        : `Opening ${title}. You can review the Balance Sheet, Profit & Loss, Trial Balance, and general ledgers here.`;

      return {
        success: true,
        spokenText: spoken,
        actionText: title,
        route: targetRoute,
        cardType: "NAVIGATION",
        suggestedActions: [
          { label: "📊 Balance Sheet", href: "/accounting/balance-sheet" },
          { label: "📈 Profit & Loss", href: "/accounting/profit-loss" },
          { label: "⚖️ Trial Balance", href: "/accounting/trial-balance" },
          { label: "📖 Day Book", href: "/accounting/day-book" },
          { label: "📑 All Accounts", href: "/accounting" }
        ]
      };
    }

    // ========================================================================
    // MODULE A: DASHBOARD, EXECUTIVE BI & SUMMARY QUERIES
    // ========================================================================

    // 0. TODAY'S HIGHEST SALE QUERY (EXPLICIT HINDI & ENGLISH)
    const isTodayHighestSaleQuery =
      lower.includes("आज सबसे ज्यादा सेल") ||
      lower.includes("आज सबसे ज्यादा बिक्री") ||
      lower.includes("आज सबसे बड़ी सेल") ||
      lower.includes("आज की सबसे बड़ी सेल") ||
      lower.includes("आज सबसे ज्यादा किसने") ||
      lower.includes("आज किसने सबसे ज्यादा") ||
      lower.includes("आज सबसे अधिक सेल") ||
      lower.includes("आज सबसे अधिक बिक्री") ||
      lower.includes("aaj sabse jyada sale") ||
      lower.includes("aaj sabse zyada sale") ||
      lower.includes("aaj sabse badi sale") ||
      lower.includes("today highest sale") ||
      lower.includes("today's highest sale") ||
      lower.includes("top sale today") ||
      lower.includes("highest sale today") ||
      lower.includes("who made the highest sale today") ||
      lower.includes("who had the highest sale today");

    if (isTodayHighestSaleQuery && organizationId) {
      const todayOrders = await prisma.order.findMany({
        where: { organizationId, orderDate: { gte: startOfToday, lte: endOfToday } },
        orderBy: { totalValue: "desc" },
        take: 5,
        include: { customer: true }
      });

      const metrics = await getCanonicalSalesMetrics(organizationId);

      if (todayOrders.length > 0) {
        const topOrder = todayOrders[0];
        const custName = topOrder.customer?.businessName || "Customer";
        const topAmount = topOrder.totalValue || 0;
        const spoken = isHindi
          ? `आज सबसे ज्यादा सेल ${custName} की रही है, कुल ₹${topAmount.toLocaleString('en-IN')} (ऑर्डर संख्या: ${topOrder.orderNumber})। आज कुल ${metrics.todayOrdersCount} ऑर्डर्स से ₹${metrics.todayRevenue.toLocaleString('en-IN')} की बिक्री हुई है।`
          : `Today's highest sale is from ${custName} for ₹${topAmount.toLocaleString('en-IN')} (Order #${topOrder.orderNumber}). Total today: ${metrics.todayOrdersCount} orders totaling ₹${metrics.todayRevenue.toLocaleString('en-IN')}.`;

        return {
          success: true,
          spokenText: spoken,
          actionText: isHindi ? `आज की टॉप सेल: ${custName}` : `Top Sale Today: ${custName}`,
          route: `/orders/${topOrder.id}`,
          cardType: "REPORT",
          keyMetrics: [
            { label: isHindi ? "टॉप ग्राहक" : "Top Customer", value: custName, positive: true },
            { label: isHindi ? "ऑर्डर राशि" : "Sale Amount", value: `₹${topAmount.toLocaleString('en-IN')}`, positive: true },
            { label: isHindi ? "आज की कुल बिक्री" : "Today's Total Sales", value: `₹${metrics.todayRevenue.toLocaleString('en-IN')}` },
            { label: isHindi ? "आज के कुल ऑर्डर्स" : "Today's Orders", value: `${metrics.todayOrdersCount} orders` }
          ],
          suggestedActions: [
            { label: isHindi ? "ऑर्डर देखें" : "View Order", href: `/orders/${topOrder.id}` },
            { label: isHindi ? "आज के सभी ऑर्डर्स" : "All Today's Orders", href: "/orders" }
          ]
        };
      } else {
        const boardRes = await getSalesTargetLeaderboard(organizationId).catch(() => null);
        const topRep = boardRes?.leaderboard?.[0];
        const topCustomer = await prisma.customer.findFirst({
          where: { organizationId },
          orderBy: { totalPurchaseValue: "desc" }
        });

        const spoken = isHindi
          ? `आज अभी तक कोई नया ऑर्डर दर्ज नहीं हुआ है (आज की कुल बिक्री ₹0 है)। इस महीने (MTD) में हमारे टॉप परफॉर्मर ${topRep?.name || 'सेल्स टीम'} हैं (₹${(topRep?.achievedSales || 0).toLocaleString('en-IN')}) और सबसे बड़े ग्राहक ${topCustomer?.businessName || 'उपलब्ध नहीं'} हैं।`
          : `No sales orders have been recorded today yet (today's revenue is ₹0). For this month, our top performer is ${topRep?.name || 'Sales Team'} (₹${(topRep?.achievedSales || 0).toLocaleString('en-IN')}) and leading customer is ${topCustomer?.businessName || 'N/A'}.`;

        return {
          success: true,
          spokenText: spoken,
          actionText: isHindi ? "आज की बिक्री (₹0)" : "Today's Sales (₹0)",
          route: "/orders",
          cardType: "REPORT",
          keyMetrics: [
            { label: isHindi ? "आज की बिक्री" : "Today's Sales", value: "₹0" },
            { label: isHindi ? "महीने का टॉप सेलर" : "MTD Top Performer", value: topRep?.name || "N/A" },
            { label: isHindi ? "महीने की कुल बिक्री" : "MTD Sales", value: `₹${(metrics.mtdRevenue || 0).toLocaleString('en-IN')}` }
          ],
          suggestedActions: [
            { label: isHindi ? "नया ऑर्डर बनाएं" : "Create Sales Order", href: "/orders/new" },
            { label: isHindi ? "सेल्स लीडरबोर्ड देखें" : "View Leaderboard", href: "/sales-targets" }
          ]
        };
      }
    }

    // 1. AGENT PERFORMANCE / TOP PERFORMER / SALES TARGET LEADERBOARD
    const isNavigationalLeaderboard =
      /^(open|go to|show|view|navigate to|le chalo|kholo|dikhao|खोलो|दिखाओ)\s+(the\s+)?(leaderboard|sales sprint|लीडरबोर्ड)/i.test(lower.trim()) ||
      lower.trim() === "leaderboard" ||
      lower.trim() === "open leaderboard" ||
      lower.trim() === "लीडरबोर्ड";

    const isTopPerformerQuery =
      !isNavigationalLeaderboard && (
        lower.includes("top performer") ||
        lower.includes("best performer") ||
        lower.includes("top performing") ||
        lower.includes("top sales rep") ||
        lower.includes("top sales agent") ||
        lower.includes("best sales agent") ||
        lower.includes("best agent") ||
        lower.includes("top agent") ||
        lower.includes("agents details") ||
        lower.includes("agent details") ||
        lower.includes("agent detail") ||
        lower.includes("sales rep performance") ||
        lower.includes("sales agent performance") ||
        lower.includes("agent performance") ||
        lower.includes("sales leaderboard") ||
        lower.includes("sales target leaderboard") ||
        lower.includes("sales rep leaderboard") ||
        lower.includes("who is top") ||
        lower.includes("who is the top") ||
        lower.includes("who sold most") ||
        lower.includes("highest sales") ||
        lower.includes("top seller") ||
        lower.includes("top performer till month") ||
        lower.includes("top performer of the month") ||
        lower.includes("top performer this month") ||
        lower.includes("top agent this month") ||
        lower.includes("टॉप परफॉर्मर") ||
        lower.includes("बेस्ट परफॉर्मर") ||
        lower.includes("एजेंट डिटेल्स") ||
        lower.includes("सेल्स एजेंट") ||
        lower.includes("सबसे ज्यादा सेल") ||
        lower.includes("सबसे ज्यादा बिक्री") ||
        lower.includes("सबसे बड़ी सेल") ||
        lower.includes("सबसे अधिक सेल") ||
        lower.includes("सबसे अधिक बिक्री") ||
        lower.includes("किसने सबसे ज्यादा") ||
        lower.includes("sabse jyada sale") ||
        lower.includes("sabse zyada sale") ||
        lower.includes("sabse badi sale") ||
        (lower.includes("leaderboard") && (lower.includes("who") || lower.includes("top") || lower.includes("score") || lower.includes("detail") || lower.includes("summary") || lower.includes("status") || lower.includes("rank") || lower.includes("stand"))) ||
        (lower.includes("agent") && (lower.includes("performer") || lower.includes("sales") || lower.includes("best") || lower.includes("detail") || lower.includes("top") || lower.includes("month"))) ||
        (lower.includes("sales rep") && (lower.includes("performer") || lower.includes("performance") || lower.includes("target")))
      );

    if (isTopPerformerQuery) {
      if (organizationId) {
        const boardRes = await getSalesTargetLeaderboard(organizationId);
        if (boardRes.success && boardRes.leaderboard && boardRes.leaderboard.length > 0) {
          const topRep = boardRes.leaderboard[0];
          const secondRep = boardRes.leaderboard.length > 1 ? boardRes.leaderboard[1] : null;
          const monthStr = boardRes.monthName || "this month";

          let spoken = isHindi
            ? `${monthStr} के लिए हमारे टॉप परफॉर्मर ${topRep.name} हैं, जिन्होंने ₹${topRep.achievedSales.toLocaleString('en-IN')} की बिक्री (${topRep.percentAchieved}% टारगेट) और ${topRep.dealsWonCount} डील्स हासिल की हैं।`
            : `Our top performer for ${monthStr} is ${topRep.name} with ₹${topRep.achievedSales.toLocaleString('en-IN')} in achieved sales (${topRep.percentAchieved}% of monthly target) and ${topRep.dealsWonCount} won deals.`;

          if (secondRep && secondRep.achievedSales > 0) {
            spoken += isHindi
              ? ` दूसरे स्थान पर ${secondRep.name} हैं (₹${secondRep.achievedSales.toLocaleString('en-IN')})।`
              : ` In 2nd place is ${secondRep.name} with ₹${secondRep.achievedSales.toLocaleString('en-IN')}.`;
          }

          spoken += isHindi
            ? ` पूरी टीम ने कुल ₹${(boardRes.totalAchieved || 0).toLocaleString('en-IN')} की बिक्री की है।`
            : ` Total team sales stand at ₹${(boardRes.totalAchieved || 0).toLocaleString('en-IN')} against ₹${(boardRes.totalTarget || 0).toLocaleString('en-IN')} target (${boardRes.teamPercent || 0}% achieved).`;

          return {
            success: true,
            spokenText: spoken,
            actionText: `Top Performer: ${topRep.name} (#1)`,
            route: "/sales-targets",
            cardType: "REPORT",
            cardData: {
              monthName: monthStr,
              topPerformer: topRep,
              leaderboard: boardRes.leaderboard.slice(0, 5),
              totalAchieved: boardRes.totalAchieved,
              totalTarget: boardRes.totalTarget,
              teamPercent: boardRes.teamPercent
            },
            keyMetrics: [
              { label: "Top Performer", value: `${topRep.name} (#1)`, positive: true },
              { label: "Achieved Sales", value: `₹${topRep.achievedSales.toLocaleString('en-IN')}`, positive: true },
              { label: "Target %", value: `${topRep.percentAchieved}%`, positive: topRep.percentAchieved >= 100 },
              { label: "Deals Won", value: `${topRep.dealsWonCount} deals` },
              { label: "Team Total (MTD)", value: `₹${(boardRes.totalAchieved || 0).toLocaleString('en-IN')}`, positive: true }
            ],
            suggestedActions: [
              { label: "🏆 Open Sales Leaderboard", href: "/sales-targets" },
              { label: "📞 TeleCRM & Calling Hub", href: "/telecalling" },
              { label: "📊 Sales Analytics", href: "/analytics" }
            ],
            followUpQuestions: [
              "What is our total sales this month?",
              "Who are our top 5 most profitable customers?",
              "Show pending quotations pipeline"
            ]
          };
        } else {
          return {
            success: true,
            spokenText: isHindi
              ? "इस महीने के लिए अभी तक कोई सेल्स एजेंट प्रदर्शन डेटा दर्ज नहीं है।"
              : "No sales agent performance data is recorded for this month yet.",
            actionText: "Sales Targets Leaderboard",
            route: "/sales-targets",
            cardType: "REPORT",
            keyMetrics: [
              { label: "Leaderboard Status", value: "No active deals yet" }
            ],
            suggestedActions: [
              { label: "Assign Targets", href: "/sales-targets" },
              { label: "Sales Orders", href: "/orders" }
            ]
          };
        }
      }
    }

    // 2. ALL-TIME TOTAL SALES / OVERALL REVENUE / SALES FIGURES
    const isTotalSalesQuery =
      lower === "total sale" ||
      lower === "total sales" ||
      lower === "total sales figure" ||
      lower === "sales figure" ||
      lower === "sales figures" ||
      lower === "sales fegure" ||
      lower === "sales fegures" ||
      lower === "sale fegure" ||
      lower === "sale figure" ||
      lower === "overall sale" ||
      lower === "overall sales" ||
      lower === "total revenue" ||
      lower === "all sales" ||
      lower === "all time sales" ||
      lower === "all time revenue" ||
      lower === "complete sales" ||
      lower === "total turnover" ||
      lower === "turnover" ||
      lower === "sales till now" ||
      lower === "sales till date" ||
      lower === "total sale till now" ||
      lower === "total sales till now" ||
      lower === "total sales till month" ||
      lower === "total sale till month" ||
      lower === "kul sale" ||
      lower === "kul bikri" ||
      lower === "total bikri" ||
      lower === "कुल बिक्री" ||
      lower === "कुल सेल" ||
      lower === "टोटल सेल" ||
      lower.includes("total sale") ||
      lower.includes("total sales") ||
      lower.includes("overall sales") ||
      lower.includes("sales figure") ||
      lower.includes("sales figures") ||
      lower.includes("sales fegure") ||
      lower.includes("sales fegures") ||
      lower.includes("total revenue") ||
      lower.includes("all time sales") ||
      lower.includes("sales till now") ||
      lower.includes("sales till date") ||
      lower.includes("कुल बिक्री") ||
      lower.includes("कुल सेल") ||
      lower.includes("टोटल सेल") ||
      ((lower.includes("sale") || lower.includes("sales")) && (lower.includes("fegure") || lower.includes("figure") || lower.includes("mismatch") || lower.includes("number")));

    if (isTotalSalesQuery) {
      if (organizationId) {
        const metrics = await getCanonicalSalesMetrics(organizationId);
        const { totalRevenue, totalOrdersCount, mtdRevenue, mtdOrdersCount, todayRevenue, todayOrdersCount } = metrics;

        const spoken = isHindi
          ? `हमारी कुल बिक्री (Total Sales) ₹${totalRevenue.toLocaleString('en-IN')} (${totalOrdersCount} ऑर्डर्स व कोटेशन) है। इस महीने (MTD) की बिक्री ₹${mtdRevenue.toLocaleString('en-IN')} (${mtdOrdersCount} ऑर्डर्स) है, और आज की बिक्री ₹${todayRevenue.toLocaleString('en-IN')} है।`
          : `Total sales across all time stand at ₹${totalRevenue.toLocaleString('en-IN')} across ${totalOrdersCount} orders and confirmed deals. Month-to-date (MTD) sales stand at ₹${mtdRevenue.toLocaleString('en-IN')} across ${mtdOrdersCount} orders, and today's sales are ₹${todayRevenue.toLocaleString('en-IN')}.`;

        return {
          success: true,
          spokenText: spoken,
          actionText: "Total Sales & Revenue",
          route: "/orders",
          cardType: "REPORT",
          keyMetrics: [
            { label: "Total Sales (All Time)", value: `₹${totalRevenue.toLocaleString('en-IN')}`, positive: true },
            { label: "Total Orders", value: `${totalOrdersCount} orders` },
            { label: "This Month (MTD)", value: `₹${mtdRevenue.toLocaleString('en-IN')}`, positive: true },
            { label: "Today's Sales", value: `₹${todayRevenue.toLocaleString('en-IN')}`, positive: todayRevenue > 0 }
          ],
          suggestedActions: [
            { label: "📋 Sales Orders", href: "/orders" },
            { label: "📊 Sales Analytics", href: "/analytics" },
            { label: "🏆 Team Leaderboard", href: "/sales-targets" }
          ],
          followUpQuestions: [
            "Who is the top performer till month?",
            "What is our today's business summary?",
            "Show pending receivables"
          ]
        };
      }
    }

    // 3. TODAY'S BUSINESS SUMMARY / TODAY'S SALES
    if (
      lower.includes("today's business summary") ||
      lower.includes("business summary") ||
      lower.includes("today summary") ||
      lower.includes("aaj kitni sale") ||
      lower.includes("aaj ki sale") ||
      lower.includes("aaj kitna sale") ||
      lower.includes("aaj ki total sale") ||
      lower.includes("today's sales") ||
      lower.includes("today sales") ||
      lower.includes("today's revenue") ||
      lower.includes("today revenue") ||
      lower.includes("aaj ka hisab") ||
      lower.includes("aaj ka business") ||
      lower.includes("आज की बिक्री") ||
      lower.includes("आज का सेल") ||
      lower.includes("आज की सेल") ||
      lower.includes("आज कितनी सेल") ||
      lower.includes("आज कितना सेल") ||
      lower.includes("आज की कुल बिक्री") ||
      lower.includes("आज की कुल सेल") ||
      lower.includes("आज की बिक्री कितनी") ||
      lower.includes("आज का सेल कितना") ||
      lower.includes("आज की सेल कितनी") ||
      lower.includes("आज की कमाई") ||
      lower.includes("आज का धंधा") ||
      lower.includes("आज का कारोबार") ||
      lower.includes("आज का हिसाब")
    ) {
      if (organizationId) {
        const metrics = await getCanonicalSalesMetrics(organizationId);
        const { todayRevenue, todayOrdersCount, todayExpensesSum, mtdRevenue } = metrics;

        return {
          success: true,
          spokenText: isHindi
            ? `आज का व्यापार सारांश: आज कुल ₹${todayRevenue.toLocaleString('en-IN')} के ${todayOrdersCount} ऑर्डर्स मिले हैं। आज का कुल खर्चा ₹${todayExpensesSum.toLocaleString('en-IN')} है। इस महीने (MTD) की कुल बिक्री ₹${mtdRevenue.toLocaleString('en-IN')} है।`
            : `Today's Business Summary: We have received ${todayOrdersCount} orders totaling ₹${todayRevenue.toLocaleString('en-IN')}. Today's expenses are ₹${todayExpensesSum.toLocaleString('en-IN')}. MTD Revenue stands at ₹${mtdRevenue.toLocaleString('en-IN')}.`,
          actionText: isHindi ? "आज की बिक्री रिपोर्ट" : "Today's Business Performance",
          route: "/orders",
          cardType: "GENERAL",
          keyMetrics: [
            { label: isHindi ? "आज के ऑर्डर्स" : "Today's Orders", value: `${todayOrdersCount} orders`, positive: true },
            { label: isHindi ? "आज की बिक्री" : "Today's Sales", value: `₹${todayRevenue.toLocaleString('en-IN')}`, positive: true },
            { label: isHindi ? "आज का खर्चा" : "Today's Expenses", value: `₹${todayExpensesSum.toLocaleString('en-IN')}` },
            { label: isHindi ? "इस महीने की बिक्री" : "Month to Date", value: `₹${mtdRevenue.toLocaleString('en-IN')}`, positive: true }
          ],
          suggestedActions: [
            { label: isHindi ? "सभी ऑर्डर्स देखें" : "View All Orders", href: "/orders" },
            { label: isHindi ? "रिपोर्ट्स देखें" : "View Reports", href: "/reports" }
          ],
          followUpQuestions: [
            "Who is the top performer till month?",
            "What is our total sale?",
            "What needs my attention today?"
          ]
        };
      }
    }

    // 4. MTD REVENUE / MONTH COMPARISON / PROFIT
    if (
      lower.includes("mtd revenue") ||
      lower.includes("this month revenue") ||
      lower.includes("total sales this month") ||
      lower.includes("compare this month") ||
      lower.includes("pichle mahine ki sale") ||
      lower.includes("gross profit") ||
      lower.includes("net profit")
    ) {
      if (organizationId) {
        const metrics = await getCanonicalSalesMetrics(organizationId);
        const { mtdRevenue, mtdOrdersCount, totalRevenue } = metrics;
        const estimatedGrossProfit = Math.round(mtdRevenue * 0.28); // 28% margin estimate

        return {
          success: true,
          spokenText: `This month's (MTD) revenue is ₹${mtdRevenue.toLocaleString('en-IN')} across ${mtdOrdersCount} orders. All-time total sales stand at ₹${totalRevenue.toLocaleString('en-IN')}. Estimated gross profit is ₹${estimatedGrossProfit.toLocaleString('en-IN')}.`,
          actionText: "MTD Revenue & Comparison",
          route: "/analytics",
          cardType: "GENERAL",
          keyMetrics: [
            { label: "Current MTD Revenue", value: `₹${mtdRevenue.toLocaleString('en-IN')}`, positive: true },
            { label: "MTD Orders", value: `${mtdOrdersCount} orders` },
            { label: "All-Time Total", value: `₹${totalRevenue.toLocaleString('en-IN')}`, positive: true },
            { label: "Estimated Gross Profit", value: `₹${estimatedGrossProfit.toLocaleString('en-IN')}`, positive: true }
          ],
          suggestedActions: [
            { label: "Open Sales Analytics", href: "/analytics" },
            { label: "View Profit & Loss", href: "/accounting/profit-loss" }
          ]
        };
      }
    }

    // 3. ATTENTION ITEMS / ACTION REQUIRED
    if (
      lower.includes("needs my attention") ||
      lower.includes("attention today") ||
      lower.includes("kya dhyan dena") ||
      lower.includes("urgent tasks") ||
      lower.includes("pending items")
    ) {
      if (organizationId) {
        const [overdueInvoices, pendingQuotes, lowStockProds] = await Promise.all([
          prisma.invoice.findMany({
            where: { organizationId, status: { notIn: ["Paid", "Cancelled"] }, dueDate: { lt: now } },
            take: 3,
            select: { invoiceNumber: true, amountDue: true, customer: { select: { businessName: true } } }
          }),
          prisma.quotation.findMany({
            where: { organizationId, status: "Draft" },
            take: 3,
            select: { quotationNumber: true, totalValue: true, customer: { select: { businessName: true } } }
          }),
          prisma.product.findMany({
            where: { organizationId, stockQuantity: { lte: 10 } },
            take: 3,
            select: { name: true, stockQuantity: true }
          })
        ]);

        return {
          success: true,
          spokenText: `Here is what needs your attention: You have ${overdueInvoices.length} overdue invoices requiring follow-up, ${pendingQuotes.length} pending draft quotations, and ${lowStockProds.length} products running low in stock.`,
          actionText: "Executive Priority Items",
          route: "/accounting/ageing",
          cardType: "GENERAL",
          keyMetrics: [
            { label: "Overdue Invoices", value: `${overdueInvoices.length} alerts` },
            { label: "Draft Quotes", value: `${pendingQuotes.length} pending` },
            { label: "Low Stock Items", value: `${lowStockProds.length} products` }
          ],
          suggestedActions: [
            { label: "Follow-up Receivables", href: "/accounting/ageing" },
            { label: "Approve Quotes", href: "/quotations" },
            { label: "Restock Inventory", href: "/products" }
          ]
        };
      }
    }

    // ========================================================================
    // MODULE: INVOICES & BILLING
    // ========================================================================

    // 1. CREATE / GENERATE INVOICE
    if (
      (lower.includes("invoice") && !lower.includes("eway") && !lower.includes("e-way") && !lower.includes("proforma")) ||
      lower.includes("bill banao") ||
      lower.includes("create bill") ||
      lower.includes("generate bill") ||
      lower.includes("make bill") ||
      lower.includes("new bill") ||
      lower.includes("इनवॉइस") ||
      lower.includes("बिल") ||
      lower.includes("चालान") ||
      (lower.includes("billing") && !lower.includes("plan") && !lower.includes("subscri") && !lower.includes("setting"))
    ) {
      if (
        lower.includes("create") ||
        lower.includes("generate") ||
        lower.includes("make") ||
        lower.includes("banao") ||
        lower.includes("new") ||
        lower.includes("add") ||
        lower.includes("dalo") ||
        lower.includes("karo") ||
        lower.includes("बनाओ") ||
        lower.includes("बनाएं") ||
        lower.includes("नया") ||
        lower.includes("नई") ||
        lower.includes("काटो") ||
        lower.includes("तैयार करो") ||
        lower.includes("जोड़ो")
      ) {
        // Order reference e.g. "for order ORD-1025" or "ऑर्डर 1025"
        let orderNumber = "";
        const ordMatch = raw.match(/(?:order\s*(?:number|no\.?|#)?\s*|ord-|ऑर्डर\s*(?:नंबर)?\s*)([0-9A-Za-z_-]+)/i);
        if (ordMatch && ordMatch[1]) {
          orderNumber = ordMatch[1].replace(/^ord-?/i, '').trim();
        }

        // Customer name e.g. "for Sharma Garments" or "प्रीत गारमेंट्स का 15000 का बिल"
        let customerName = "";
        let amount = 0;

        // Pattern 1: Customer placed at start: "Sharma Garments ka bill banao" or "प्रीत गारमेंट्स का 15000 का बिल"
        const preMatch = raw.match(/^([A-Za-z0-9\u0900-\u097F\s&]+?)\s+(?:का|की|के|for|to)\s+(?:(\d+)\s*(?:रुपये|रु)?\s*(?:का|की|के)?\s+)?(?:new\s+|नया\s+)?(?:bill|invoice|चालान|बिल|इनवॉइस)/i);
        if (preMatch && preMatch[1]) {
          const cand = preMatch[1].replace(/create|generate|make|banao|please|new|नया|बनाओ|काटो|कृपया/gi, '').trim();
          if (cand && !["for", "to", "of", "a", "the", "with", "ऑर्डर", "order"].includes(cand.toLowerCase())) {
            customerName = cand;
            if (preMatch[2]) amount = parseFloat(preMatch[2]);
          }
        }

        // Pattern 2: preposition before customer: "for Sharma Garments"
        if (!customerName) {
          const custMatch = raw.match(/(?:for|to|customer|के\s*लिए|ग्राहक|कस्टमर|पार्टी)\s+([A-Za-z0-9\u0900-\u097F\s&]+?)(?:\s+(?:of|for|amount|rate|rs\.?|₹|due|order|ke\s+liye|का|की|के|रुपये|काटो|बनाओ)|$)/i);
          if (custMatch && custMatch[1]) {
            customerName = custMatch[1].replace(/invoice|bill|new|create|generate|make|banao|dalo|please|इनवॉइस|बिल|चालान|नया|बनाओ|काटो|कृपया/gi, '').trim();
            if (
              customerName.toLowerCase() === "order" ||
              customerName.toLowerCase() === "customer" ||
              customerName.toLowerCase() === "ऑर्डर" ||
              customerName.toLowerCase() === "कस्टमर" ||
              /^\d+$/.test(customerName)
            ) {
              customerName = "";
            }
          }
        }

        // Explicit amount parsing if not already captured
        if (!amount) {
          const amtMatch =
            raw.match(/(?:₹|rs\.?|amount|total|rate|रुपये|दर|मूल्य)\s*(\d+(?:,\d+)*(?:\.\d+)?)/i) ||
            raw.match(/(?:for|of|में|का)\s+(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rupees?|rs|inr|hazar|k|रुपये|हजार|लाख)?/i) ||
            raw.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rupees?|rs|inr|hazar|k|रुपये|हजार|लाख)/i);

          if (amtMatch && amtMatch[1]) {
            const parsed = parseFloat(amtMatch[1].replace(/,/g, ''));
            if (parsed > 0 && (!orderNumber || parsed !== parseFloat(orderNumber))) {
              amount = parsed;
            }
          }
        }

        if (customerName && (customerName === String(amount) || /^\d+$/.test(customerName))) {
          customerName = "";
        }

        // Case A: Specific Order Reference Spoken
        if (orderNumber) {
          let matchedOrder = null;
          if (organizationId) {
            matchedOrder = await prisma.order.findFirst({
              where: {
                organizationId,
                OR: [
                  { orderNumber: { contains: orderNumber, mode: "insensitive" } },
                  { id: orderNumber }
                ]
              },
              include: { customer: true }
            });
          }

          const orderCust = matchedOrder?.customer?.businessName || customerName || `Order ORD-${orderNumber}`;
          const totalVal = matchedOrder?.totalValue || (amount > 0 ? amount : 5000);
          const tax = Math.round((totalVal * 0.18) / 1.18);
          const sub = totalVal - tax;

          return {
            success: true,
            spokenText: isHindi
              ? `मैंने ऑर्डर ORD-${orderNumber}${matchedOrder?.customer?.businessName ? ` (${matchedOrder.customer.businessName})` : ''} के लिए ₹${totalVal.toLocaleString('en-IN')} का इनवॉइस तैयार कर लिया है। कृपया इस इनवॉइस को बनाने की पुष्टि करें।`
              : `I have prepared an invoice for Order ORD-${orderNumber}${matchedOrder?.customer?.businessName ? ` (${matchedOrder.customer.businessName})` : ''}. Total value: ₹${totalVal.toLocaleString('en-IN')}. Please confirm to generate this invoice.`,
            actionText: isHindi ? `इनवॉइस बनाएं: ORD-${orderNumber}` : `Generate Invoice: ORD-${orderNumber}`,
            route: "/invoices",
            cardType: "CONFIRMATION",
            requiresConfirmation: true,
            confirmationPayload: {
              actionType: "CREATE_INVOICE",
              title: isHindi ? `ऑर्डर ORD-${orderNumber} का इनवॉइस बनाएं` : `Create Invoice for Order ORD-${orderNumber}`,
              data: {
                customerName: orderCust,
                orderNumber,
                amount: totalVal,
                totalAmount: totalVal,
                subtotal: sub,
                taxAmount: tax,
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
              },
              voicePrompt: raw
            }
          };
        }

        // Case B: Explicit Customer AND Amount both provided
        if (customerName && amount > 0) {
          const totalVal = amount;
          const tax = Math.round((totalVal * 0.18) / 1.18);
          const sub = totalVal - tax;

          return {
            success: true,
            spokenText: isHindi
              ? `मैंने ${customerName} के लिए ₹${totalVal.toLocaleString('en-IN')} का इनवॉइस तैयार कर लिया है। कृपया इस इनवॉइस को बनाने की पुष्टि करें।`
              : `I have prepared an invoice for ${customerName} for ₹${totalVal.toLocaleString('en-IN')}. Please confirm to generate this invoice.`,
            actionText: isHindi ? `इनवॉइस बनाएं: ${customerName}` : `Generate Invoice: ${customerName}`,
            route: "/invoices",
            cardType: "CONFIRMATION",
            requiresConfirmation: true,
            confirmationPayload: {
              actionType: "CREATE_INVOICE",
              title: isHindi ? `${customerName} का इनवॉइस बनाएं` : `Create Invoice for ${customerName}`,
              data: {
                customerName,
                amount: totalVal,
                totalAmount: totalVal,
                subtotal: sub,
                taxAmount: tax,
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
              },
              voicePrompt: raw
            }
          };
        }

        // Case C: Customer provided, but amount is missing -> Navigate to builder
        if (customerName && !amount) {
          return {
            success: true,
            spokenText: isHindi
              ? `${customerName} के लिए इनवॉइस फॉर्म खोला जा रहा है...`
              : `Opening invoice generator for ${customerName}...`,
            actionText: isHindi ? `इनवॉइस: ${customerName}` : `Invoice: ${customerName}`,
            route: `/invoices?action=new&customer=${encodeURIComponent(customerName)}`,
            cardType: "NAVIGATION",
            requiresConfirmation: false,
            suggestedActions: [
              { label: isHindi ? `${customerName} के लिए इनवॉइस खोलें` : `Open Invoice for ${customerName}`, href: `/invoices?action=new&customer=${encodeURIComponent(customerName)}` }
            ]
          };
        }

        // Case D: Amount provided, but customer is missing -> Navigate to builder
        if (amount > 0 && !customerName) {
          return {
            success: true,
            spokenText: isHindi
              ? `₹${amount.toLocaleString('en-IN')} के लिए इनवॉइस फॉर्म खोला जा रहा है...`
              : `Opening invoice generator for ₹${amount.toLocaleString('en-IN')}...`,
            actionText: isHindi ? `₹${amount.toLocaleString('en-IN')} का इनवॉइस` : `Invoice for ₹${amount.toLocaleString('en-IN')}`,
            route: `/invoices?action=new&amount=${amount}`,
            cardType: "NAVIGATION",
            requiresConfirmation: false,
            suggestedActions: [
              { label: isHindi ? "इनवॉइस फॉर्म खोलें" : "Open Invoice Generator", href: `/invoices?action=new&amount=${amount}` }
            ]
          };
        }

        // Case E: Minimal command "create invoice" or "bill banao"
        return {
          success: true,
          spokenText: isHindi ? "आपके लिए नया इनवॉइस फॉर्म खोला जा रहा है..." : "Opening invoice generator form for you...",
          actionText: isHindi ? "नया इनवॉइस" : "New Invoice",
          route: "/invoices?action=new",
          cardType: "NAVIGATION",
          requiresConfirmation: false,
          suggestedActions: [
            { label: isHindi ? "नया इनवॉइस खोलें" : "Open Invoice Generator", href: "/invoices?action=new" },
            { label: isHindi ? "सेल्स ऑर्डर्स देखें" : "View Sales Orders", href: "/orders" }
          ]
        };
      }

      // Unpaid or pending invoices
      if (
        lower.includes("unpaid") ||
        lower.includes("overdue") ||
        lower.includes("pending") ||
        lower.includes("kiska baki") ||
        lower.includes("list") ||
        lower.includes("show") ||
        lower.includes("dekho") ||
        lower.includes("बकाया") ||
        lower.includes("बाकी") ||
        lower.includes("पेंडिंग") ||
        lower.includes("दिखाओ") ||
        lower.includes("सूची")
      ) {
        if (organizationId) {
          const unpaid = await prisma.invoice.findMany({
            where: { organizationId, status: { notIn: ["Paid", "Cancelled"] } },
            include: { customer: true },
            orderBy: { amountDue: "desc" },
            take: 5
          });

          const totalUnpaid = unpaid.reduce((sum, i) => sum + (i.amountDue || 0), 0);

          return {
            success: true,
            spokenText: isHindi
              ? `आपके पास ₹${totalUnpaid.toLocaleString('en-IN')} के ${unpaid.length} बकाया इनवॉइस हैं। ${unpaid[0] ? `सबसे अधिक बकाया ${unpaid[0].customer?.businessName} का ₹${unpaid[0].amountDue.toLocaleString('en-IN')} है।` : ''}`
              : `You have ${unpaid.length} pending unpaid invoices totaling ₹${totalUnpaid.toLocaleString('en-IN')}. ${unpaid[0] ? `Highest due is from ${unpaid[0].customer?.businessName} for ₹${unpaid[0].amountDue.toLocaleString('en-IN')}.` : ''}`,
            actionText: isHindi ? "बकाया इनवॉइस" : "Unpaid Invoices",
            route: "/invoices",
            cardType: "GENERAL",
            keyMetrics: [
              { label: isHindi ? "कुल बकाया" : "Total Unpaid", value: `₹${totalUnpaid.toLocaleString('en-IN')}`, positive: false },
              { label: isHindi ? "पेंडिंग इनवॉइस" : "Pending Invoices", value: `${unpaid.length} records` }
            ],
            suggestedActions: [
              { label: isHindi ? "सभी इनवॉइस देखें" : "View All Invoices", href: "/invoices" },
              { label: isHindi ? "नया इनवॉइस बनाएं" : "Create New Invoice", href: "/invoices?action=new" }
            ]
          };
        }
      }

      // Default for generic invoice query
      return {
        success: true,
        spokenText: isHindi ? "इनवॉइस और बिल रजिस्टर खोला जा रहा है..." : "Opening Invoices & Receivables master...",
        actionText: isHindi ? "इनवॉइस खोलें" : "Open Invoices",
        route: "/invoices",
        cardType: "NAVIGATION"
      };
    }

    // ========================================================================
    // MODULE B: SALES & ORDERS
    // ========================================================================

    // 1. CANCEL ORDER (DESTRUCTIVE - REQUIRES EXPLICIT CONFIRMATION)
    if (
      (lower.includes("cancel") || lower.includes("delete") || lower.includes("hatao")) &&
      (lower.includes("order") || lower.includes("ord-"))
    ) {
      const orderNumMatch = raw.match(/(?:order\s*(?:number|no\.?|#)?\s*|ord-)([0-9A-Za-z_-]+)/i);
      const orderNumber = orderNumMatch ? orderNumMatch[1].trim() : "";

      let targetOrder = null;
      if (orderNumber && organizationId) {
        targetOrder = await prisma.order.findFirst({
          where: {
            organizationId,
            OR: [
              { orderNumber: { contains: orderNumber, mode: "insensitive" } },
              { id: orderNumber }
            ]
          },
          include: { customer: true }
        });
      }

      const displayOrder = targetOrder ? targetOrder.orderNumber : (orderNumber ? `ORD-${orderNumber}` : "specified order");

      return {
        success: true,
        spokenText: `Canceling order ${displayOrder} will mark it as cancelled in the database. Please review the details and confirm.`,
        actionText: `Confirm Cancel Order: ${displayOrder}`,
        route: targetOrder ? `/orders/${targetOrder.id}` : "/orders",
        cardType: "CONFIRMATION",
        requiresConfirmation: true,
        confirmationPayload: {
          actionType: "CANCEL_ORDER",
          title: `Cancel Sales Order: ${displayOrder}`,
          data: {
            orderNumber: targetOrder ? targetOrder.orderNumber : orderNumber,
            orderId: targetOrder?.id,
            customerName: targetOrder?.customer?.businessName || "Customer",
            amount: targetOrder?.totalValue,
            reason: "Cancelled by owner via Executive Voice Copilot"
          },
          voicePrompt: raw
        }
      };
    }

    // 2. CREATE NEW SALES ORDER (REQUIRES CONFIRMATION)
    if (
      (lower.includes("order") || lower.includes("sales order")) &&
      (lower.includes("create") || lower.includes("new order") || lower.includes("place") || lower.includes("book") || lower.includes("banao") || lower.includes("order dalo"))
    ) {
      // Extract customer name e.g. "for Rahul Traders" or "Rahul Traders ka order"
      let customerName = "";
      const custMatch = raw.match(/(?:for|to|ka|ki|ke|customer)\s+([A-Za-z0-9\s&]+?)(?:\s+(?:with|for|having|items?|units?|pcs?|at|price|rate|shorts?|trackpants?)|$)/i);
      if (custMatch && custMatch[1]) {
        customerName = custMatch[1].replace(/order|sales|new|create|book|place|banao|dalo|please/gi, '').trim();
        if (customerName.toLowerCase() === "customer") customerName = "";
      }

      // Extract quantity e.g. "50 units" or "100 pieces"
      let quantity: number | null = null;
      const qtyMatch = raw.match(/(\d+)\s*(?:units?|pcs?|pieces?|shorts?|sets?|items?|trackpants?|shirts?)?/i);
      if (qtyMatch && qtyMatch[1]) {
        quantity = parseInt(qtyMatch[1], 10);
      }

      // Extract product name
      let prodName = "";
      const prodMatch = raw.match(/(?:product|item|of)\s+([A-Za-z0-9\s&]+?)(?:\s+(?:quantity|qty|units?|pcs?|at|price|rate)|$)/i);
      if (prodMatch && prodMatch[1]) {
        prodName = prodMatch[1].trim();
      }

      // Extract price
      let price: number | null = null;
      const priceMatch = raw.match(/(?:at|rate|price|₹|rs\.?)\s*(\d+)/i);
      if (priceMatch && priceMatch[1]) {
        price = parseInt(priceMatch[1], 10);
      }

      if (!customerName || !quantity || !price) {
        return {
          success: true,
          spokenText: "Opening sales order creation form...",
          actionText: "New Sales Order",
          route: "/orders/new",
          cardType: "NAVIGATION",
          requiresConfirmation: false,
          suggestedActions: [
            { label: "Open Order Form", href: "/orders/new" }
          ]
        };
      }

      const finalQty = quantity;
      const finalPrice = price;
      const finalProd = prodName || "Custom Item";
      const total = finalQty * finalPrice;

      return {
        success: true,
        spokenText: `I have prepared a new sales order for ${customerName} for ${finalQty} ${finalProd} at ₹${finalPrice}. Total: ₹${total.toLocaleString('en-IN')}. Please confirm to book this order.`,
        actionText: `Sales Order: ${customerName}`,
        route: "/orders",
        cardType: "CONFIRMATION",
        requiresConfirmation: true,
        confirmationPayload: {
          actionType: "CREATE_ORDER",
          title: `Create Sales Order: ${customerName}`,
          data: {
            customerName,
            productName: finalProd,
            quantity: finalQty,
            price: finalPrice,
            estimatedTotal: total
          },
          voicePrompt: raw
        }
      };
    }

    // 3. SHOW TODAY'S ORDERS / PENDING ORDERS / FIND ORDER
    if (lower.includes("today's order") || lower.includes("today order") || lower.includes("aaj ke order")) {
      if (organizationId) {
        const orders = await prisma.order.findMany({
          where: { organizationId, createdAt: { gte: startOfToday, lte: endOfToday } },
          include: { customer: true },
          orderBy: { createdAt: "desc" },
          take: 5
        });

        const totalVal = orders.reduce((s, o) => s + (o.totalValue || 0), 0);

        return {
          success: true,
          spokenText: `Found ${orders.length} orders booked today totaling ₹${totalVal.toLocaleString('en-IN')}.${orders.length > 0 ? ` Latest is from ${orders[0].customer?.businessName} for ₹${orders[0].totalValue}.` : ''}`,
          actionText: "Today's Orders",
          route: "/orders",
          cardType: "ORDER",
          cardData: {
            title: "Today's Sales Orders",
            count: orders.length,
            totalVal,
            orders: orders.map(o => ({
              orderNumber: o.orderNumber,
              customer: o.customer?.businessName,
              totalValue: o.totalValue,
              status: (o as any).orderStatus || (o as any).status
            }))
          }
        };
      }
    }

    // FIND SPECIFIC ORDER (e.g. "Find order number 1025" or "order 1025")
    const specificOrderMatch = raw.match(/(?:find\s+order|order\s*(?:number|no\.?|#)?)\s*([0-9A-Za-z_-]+)/i);
    if (specificOrderMatch && specificOrderMatch[1] && !lower.includes("create") && !lower.includes("new")) {
      const ordNum = specificOrderMatch[1].trim();
      if (organizationId) {
        const order = await prisma.order.findFirst({
          where: {
            organizationId,
            OR: [
              { orderNumber: { contains: ordNum, mode: "insensitive" } },
              { id: ordNum }
            ]
          },
          include: { customer: true }
        });

        if (order) {
          const ordStatus = (order as any).orderStatus || (order as any).status || "Processing";
          return {
            success: true,
            spokenText: `Found Order ${order.orderNumber} for ${order.customer?.businessName || 'Customer'}. Value: ₹${order.totalValue.toLocaleString('en-IN')}, Status: ${ordStatus}.`,
            actionText: `Order ${order.orderNumber}`,
            route: `/orders/${order.id}`,
            cardType: "ORDER",
            cardData: {
              orderNumber: order.orderNumber,
              customer: order.customer?.businessName,
              totalValue: order.totalValue,
              status: ordStatus
            }
          };
        }
      }
    }

    // ========================================================================
    // MODULE C: CUSTOMERS & CRM
    // ========================================================================

    // 1. TOP 5 CUSTOMERS / BIGGEST BUYERS
    if (
      lower.includes("top 5 customer") ||
      lower.includes("top customer") ||
      lower.includes("biggest buyer") ||
      lower.includes("sabse bade customer") ||
      lower.includes("top buyers") ||
      lower.includes("profitable customer")
    ) {
      if (organizationId) {
        const topCustomers = await prisma.customer.findMany({
          where: { organizationId },
          orderBy: { totalPurchaseValue: "desc" },
          take: 5,
          select: { id: true, businessName: true, totalPurchaseValue: true, totalOrders: true, city: true }
        });

        const topName = topCustomers[0]?.businessName || "None";
        const topSpend = topCustomers[0]?.totalPurchaseValue || 0;

        return {
          success: true,
          spokenText: isHindi
            ? `आपके शीर्ष ग्राहक ${topName} हैं जिनका कुल व्यापार ₹${topSpend.toLocaleString('en-IN')} है।`
            : `Your top 5 customers by lifetime spend are led by ${topName} at ₹${topSpend.toLocaleString('en-IN')}. Followed by ${topCustomers.slice(1, 3).map(c => c.businessName).join(', ')}.`,
          actionText: isHindi ? "शीर्ष 5 ग्राहक" : "Top 5 Customers",
          route: "/customers",
          cardType: "CUSTOMER",
          keyMetrics: topCustomers.map((c, idx) => ({
            label: `#${idx + 1} ${c.businessName}`,
            value: `₹${c.totalPurchaseValue.toLocaleString('en-IN')}`,
            subtext: `${c.totalOrders} orders (${c.city || 'India'})`,
            positive: true
          })),
          suggestedActions: [
            { label: isHindi ? "सभी ग्राहक देखें" : "View All Customers", href: "/customers" }
          ]
        };
      }
    }

    // 2. DORMANT CUSTOMERS (Haven't purchased in 60 days)
    if (lower.includes("60 days") || lower.includes("dormant") || lower.includes("inactive customer") || lower.includes("purane customer") || lower.includes("निष्क्रिय ग्राहक") || lower.includes("पुराने ग्राहक")) {
      if (organizationId) {
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const dormantCusts = await prisma.customer.findMany({
          where: {
            organizationId,
            orders: {
              none: {
                createdAt: { gte: sixtyDaysAgo }
              }
            }
          },
          take: 5,
          select: { id: true, businessName: true, contactPerson: true, mobile: true }
        });

        return {
          success: true,
          spokenText: isHindi
            ? `पिछले 60 दिनों से कोई ऑर्डर न देने वाले ${dormantCusts.length} ग्राहक मिले हैं।`
            : `Found ${dormantCusts.length} key customers with no orders in the last 60 days. Re-engaging them can unlock quick sales.`,
          actionText: isHindi ? "निष्क्रिय ग्राहक (60+ दिन)" : "Dormant Customers (60+ Days)",
          route: "/customers?filter=dormant",
          cardType: "CUSTOMER",
          cardData: {
            customers: dormantCusts.map(c => ({
              businessName: c.businessName,
              contactPerson: c.contactPerson,
              mobile: c.mobile
            }))
          }
        };
      }
    }

    // 3. CREATE NEW CUSTOMER (REQUIRES CONFIRMATION)
    if (
      (lower.includes("customer") || lower.includes("client") || lower.includes("party") || lower.includes("ग्राहक") || lower.includes("कस्टमर") || lower.includes("पार्टी")) &&
      (lower.includes("create") || lower.includes("add") || lower.includes("new customer") || lower.includes("naya customer") || lower.includes("jodo") || lower.includes("banao") || lower.includes("register") || lower.includes("नया") || lower.includes("जोड़ो") || lower.includes("बनाओ") || lower.includes("दर्ज"))
    ) {
      // Extract 10-digit mobile number if mentioned
      const phoneMatch = raw.match(/(?:phone|mobile|number|no\.?|contact|फोन|मोबाइल|नंबर)?\s*([6-9]\d{9})/i);
      const mobile = phoneMatch ? phoneMatch[1] : "";

      // Extract city if mentioned
      const cityMatch = raw.match(/(?:in|from|city|se|शहर|से)\s+([A-Za-z\u0900-\u097F]+)/i);
      const city = cityMatch ? cityMatch[1].trim() : "";

      // Clean customer name
      let customerName = raw
        .replace(/(?:add|create|new|naya|jodo|banao|register|customer|client|party|account|karo|please|नया|जोड़ो|बनाओ|दर्ज|करें|कस्टमर|ग्राहक|पार्टी)/gi, '')
        .replace(/(?:phone|mobile|number|no\.?|contact|फोन|मोबाइल|नंबर)?\s*[6-9]\d{9}/gi, '')
        .replace(/(?:in|from|city|se|शहर|से)\s+[A-Za-z\u0900-\u097F]+/gi, '')
        .trim();

      // Clean leading/trailing symbols or prepositions
      customerName = customerName.replace(/^[:\s\-–]+|[:\s\-–]+$/g, '').trim();

      if (customerName) {
        return {
          success: true,
          spokenText: isHindi
            ? `नया ग्राहक "${customerName}"${mobile ? ` (मोबाइल: ${mobile})` : ''}${city ? ` (${city})` : ''} जोड़ने की तैयारी है। कृपया पुष्टि करें।`
            : `I have prepared to register new customer "${customerName}"${mobile ? ` with mobile ${mobile}` : ''}${city ? ` in ${city}` : ''}. Please confirm to add this account to your CRM.`,
          actionText: isHindi ? `ग्राहक जोड़ें: ${customerName}` : `Create Customer: ${customerName}`,
          route: "/customers",
          cardType: "CONFIRMATION",
          requiresConfirmation: true,
          confirmationPayload: {
            actionType: "CREATE_CUSTOMER",
            title: isHindi ? `नया ग्राहक जोड़ें: ${customerName}` : `Add New Customer: ${customerName}`,
            data: {
              businessName: customerName,
              contactPerson: customerName,
              mobile,
              city,
              leadStage: "New Lead"
            },
            voicePrompt: raw
          }
        };
      }

      return {
        success: true,
        spokenText: isHindi ? "ग्राहक पंजीकरण फॉर्म खोला जा रहा है..." : "Opening customer registration form...",
        actionText: isHindi ? "नया ग्राहक जोड़ें" : "Add New Customer",
        route: "/customers?action=new",
        cardType: "NAVIGATION"
      };
    }

    // ========================================================================
    // MODULE D: QUOTATIONS & SALES PIPELINE
    // ========================================================================

    // 0. ADD LINE ITEM TO ACTIVE QUOTATION / DOCUMENT (e.g. "50 lower set Rs 200" or "add 50 trackpants at 450")
    const isExcludedFromLineItem =
      lower.includes("customer") ||
      lower.includes("client") ||
      lower.includes("vendor") ||
      lower.includes("supplier") ||
      lower.includes("employee") ||
      lower.includes("expense") ||
      lower.includes("attendance") ||
      lower.includes("salary") ||
      lower.includes("payment") ||
      lower.includes("कस्टमर") ||
      lower.includes("ग्राहक") ||
      lower.includes("खर्चा") ||
      lower.includes("हाजिरी") ||
      lower.includes("वेतन") ||
      lower.includes("quotation of") ||
      lower.includes("quotation for") ||
      lower.includes("quote of") ||
      lower.includes("quote for") ||
      lower.startsWith("add product") ||
      lower.startsWith("create product") ||
      lower.includes(" stock");

    const hasItemVerb =
      /^(?:add|insert|dalo|jodo|जोड़ो|डालो|जोड़|enter|item|सामान)\b/i.test(raw) ||
      /(?:add\s*karo|jodo|dalo|जोड़ो|डालो|जोड़\s*दो|डाल\s*दो)$/i.test(raw) ||
      /(?:जोड़ो|डालो)/i.test(raw) ||
      lower.includes("quotation me") ||
      lower.includes("quote me") ||
      lower.includes("कोटेशन में");

    let isExplicitItemCommand = false;
    let qty: number | null = null;
    let price: number | null = null;
    let itemCandidate = "";

    if (!isExcludedFromLineItem) {
      // Pattern A: (Verb optional) + [item] + Qty + [Unit] + Item Name + [Rate/Price] + [Verb optional]
      // e.g. "50 lower set Rs 200", "add 50 trackpants at 450", "50 लोअर सेट 200 रुपये", "50 lower set 200"
      const patA = raw.match(/^(?:quotation\s+item|quote\s+item|item|सामान|add|insert|dalo|jodo|जोड़ो|डालो|जोड़\s*दो|डाल\s*दो)?\s*(\d+)\s*(?:units?|pcs?|pieces?|box|boxes|sets?|pairs?|पीस|नग|थान|पैकेट)?\s+([a-zA-Z0-9\u0900-\u097F\s\-_]+?)(?:\s+(?:(?:at|rate|price|@|₹|rs\.?|दर|भाव|रेट)\s*(\d+)|(\d+)\s*(?:rupaye|rupees|rupey|रुपये|रु|₹|rs\.?|ke\s*bhav(?:\s*se)?|ke\s*rate|bhav|rate|के\s*भाव(?:\s*से)?|के\s*रेट|में)?))?\s*(?:में|ke\s*bhav(?:\s*se)?|ke\s*rate|bhav|rate|के\s*भाव(?:\s*से)?|के\s*रेट|रेट)?\s*(?:add\s*karo|jodo|dalo|जोड़ो|डालो|जोड़\s*दो|डाल\s*दो)?$/i);

      if (patA && patA[1] && patA[2]) {
        const candidate = patA[2].trim();
        const p = patA[3] || patA[4];
        if (hasItemVerb || p) {
          qty = parseInt(patA[1], 10);
          itemCandidate = candidate;
          if (p) price = parseInt(p, 10);
          isExplicitItemCommand = true;
        }
      }

      // Pattern B: Item Name first + Qty + [Unit] + [Rate/Price]
      // e.g. "lower set 50 pcs rate 200", "lower set 50 Rs 200", "ट्रैकपेंट 50 पीस 450 रुपये जोड़ो"
      if (!itemCandidate) {
        const patB = raw.match(/^(?:quotation\s+item|quote\s+item|item|सामान|add|insert|dalo|jodo|जोड़ो|डालो|जोड़\s*दो|डाल\s*दो)?\s*([a-zA-Z0-9\u0900-\u097F\s\-_]+?)\s+(\d+)\s*(?:units?|pcs?|pieces?|box|boxes|sets?|pairs?|पीस|नग|थान|पैकेट)?(?:\s+(?:(?:at|rate|price|@|₹|rs\.?|दर|भाव|रेट)\s*(\d+)|(\d+)\s*(?:rupaye|rupees|rupey|रुपये|रु|₹|rs\.?|ke\s*bhav(?:\s*se)?|ke\s*rate|bhav|rate|के\s*भाव(?:\s*से)?|के\s*रेट|में)?))?\s*(?:में|ke\s*bhav(?:\s*se)?|ke\s*rate|bhav|rate|के\s*भाव(?:\s*से)?|के\s*रेट|रेट)?\s*(?:add\s*karo|jodo|dalo|जोड़ो|डालो|जोड़\s*दो|डाल\s*दो)?$/i);
        if (patB && patB[1] && patB[2]) {
          const candidate = patB[1].trim();
          const p = patB[3] || patB[4];
          if (hasItemVerb || p) {
            itemCandidate = candidate;
            qty = parseInt(patB[2], 10);
            if (p) price = parseInt(p, 10);
            isExplicitItemCommand = true;
          }
        }
      }
    }

    if (isExplicitItemCommand && itemCandidate && qty && qty > 0) {
      const cleanProduct = itemCandidate
        .replace(/(?:in|into|to|me|में)\s+(?:quotation|quote|estimate|cart|bill|invoice|कोटेशन|एस्टीमेट|बिल|इनवॉइस)/gi, '')
        .replace(/(?:quotation|quote|estimate|item|product|कोटेशन|एस्टीमेट|आइटम|प्रोडक्ट)\s*(?:me|in|में)?/gi, '')
        .replace(/^(?:item|product|आइटम|प्रोडक्ट)\s+/i, '')
        .replace(/\s+(?:rate|price|भाव|रेट)$/i, '')
        .trim();

      if (cleanProduct.length >= 2) {
        return {
          success: true,
          spokenText: isHindi
            ? `कोटेशन में ${qty} ${cleanProduct}${price ? ` (₹${price} की दर से)` : ''} जोड़ दिया गया है।`
            : `Added ${qty} ${cleanProduct}${price ? ` at ₹${price}` : ''} to quotation.`,
          actionText: isHindi
            ? `+ ${qty}x ${cleanProduct}${price ? ` @ ₹${price}` : ''} जोड़ा`
            : `Added ${qty}x ${cleanProduct}${price ? ` @ ₹${price}` : ''}`,
          route: "/quotations/new",
          cardType: "CLIENT_ACTION",
          clientAction: {
            type: "ADD_QUOTATION_ITEM",
            data: {
              productName: cleanProduct,
              quantity: qty,
              rate: price || null
            }
          },
          suggestedActions: [
            { label: isHindi ? "नया कोटेशन खोलें" : "Open Quotation Builder", href: "/quotations/new" },
            { label: isHindi ? "कोटेशन सूची" : "View Quotations", href: "/quotations" }
          ]
        };
      }
    }

    // 0.B SELECT / SET CUSTOMER (e.g. "customer Preet Garments" or "कस्टमर प्रीत गारमेंट्स")
    if (
      (lower.startsWith("customer ") || lower.startsWith("select customer ") || lower.startsWith("set customer ") ||
       lower.startsWith("कस्टमर ") || lower.startsWith("ग्राहक ") || lower.startsWith("पार्टी ") ||
       lower.includes("कस्टमर चुनो") || lower.includes("ग्राहक चुनो") || lower.includes("पार्टी चुनो")) &&
      !lower.includes("create") &&
      !lower.includes("new customer") &&
      !lower.includes("add customer") &&
      !lower.includes("नया") &&
      !lower.includes("जोड़ो") &&
      !lower.includes("बनाओ") &&
      !lower.includes("खोलो") &&
      !lower.includes("दिखाओ") &&
      !lower.includes("सूची") &&
      !lower.includes("list") &&
      !lower.includes("directory")
    ) {
      const custName = raw
        .replace(/^(?:select|set|choose)?\s*(?:customer|कस्टमर|ग्राहक|पार्टी)\s+/i, '')
        .replace(/\s*(?:चुनो|चुनें|सेट करो|रखो|kardo|rakho|banao)$/i, '')
        .trim();
      if (custName && custName.length >= 2) {
        return {
          success: true,
          spokenText: isHindi
            ? `कोटेशन के लिए ग्राहक ${custName} को चुन लिया गया है।`
            : `Selected customer ${custName} for your quotation.`,
          actionText: isHindi ? `ग्राहक: ${custName}` : `Customer: ${custName}`,
          cardType: "CLIENT_ACTION",
          clientAction: {
            type: "SET_QUOTATION_CUSTOMER",
            data: {
              customerName: custName
            }
          }
        };
      }
    }

    // 1. CREATE QUOTATION (REQUIRES CONFIRMATION)
    if (
      (lower.includes("quotation") || lower.includes("quote") || lower.includes("estimate") || lower.includes("कोटेशन") || lower.includes("एस्टीमेट")) &&
      (lower.includes("create") || lower.includes("generate") || lower.includes("make") || lower.includes("banao") || lower.includes("new quote") || lower.includes("new quotation") || lower.startsWith("quote ") || lower.startsWith("quotation ") || lower.includes("बनाओ") || lower.includes("बनाएं") || lower.includes("नया") || lower.includes("तैयार करो"))
    ) {
      // Parse customer name e.g. "for ABC Traders", "of Preet Garments", or "Preet Garments ka quotation" or "प्रीत गारमेंट्स का कोटेशन"
      let customerName = "";

      // Pattern 1: customer before quotation e.g. "Preet Garments ka quotation" or "प्रीत गारमेंट्स का कोटेशन बनाओ 50 ट्रैकपेंट 450 रुपये"
      const preMatch = raw.match(/^([A-Za-z0-9\u0900-\u097F\s&]+?)\s+(?:का|की|के|for|to)\s+(?:new\s+|नया\s+)?(?:quotation|quote|estimate|कोटेशन|एस्टीमेट)/i);
      if (preMatch && preMatch[1]) {
        const cand = preMatch[1].replace(/create|generate|make|banao|please|new|नया|बनाओ|कृपया/gi, '').trim();
        if (cand && !["for", "to", "of", "a", "the", "with", "के लिए", "order", "ऑर्डर"].includes(cand.toLowerCase())) {
          customerName = cand;
        }
      }

      // Pattern 2: preposition before customer (including "of", "for", "to", "ka", etc.)
      if (!customerName) {
        const forMatch = raw.match(/(?:for|to|customer|of|named?|के\s*लिए|ग्राहक|कस्टमर)\s+([A-Za-z0-9\u0900-\u097F\s&]+?)(?:\s+(?:with|having|items?|units?|pcs?|pieces?|at|price|rate|shorts?|trackpants?|quantity|qty|सामान|पीस|नग|दर|भाव|रुपये)|$)/i);
        if (forMatch && forMatch[1]) {
          customerName = forMatch[1].replace(/quotation|quote|estimate|new|create|generate|make|banao|please|कोटेशन|एस्टीमेट|नया|बनाओ|कृपया/gi, '').trim();
        }
      }

      // Pattern 3: direct "new quotation Preet Garments" or "कोटेशन प्रीत गारमेंट्स"
      if (!customerName) {
        const directMatch = raw.match(/(?:quotation|quote|estimate|कोटेशन|एस्टीमेट)\s+([A-Za-z0-9\u0900-\u097F\s&]+?)(?:\s+(?:with|having|items?|units?|pcs?|pieces?|at|price|rate|quantity|qty|सामान|पीस|नग|दर|भाव|रुपये)|$)/i);
        if (directMatch && directMatch[1]) {
          const cand = directMatch[1]
            .replace(/^(?:for|to|of|about|के लिए|का|की|के)\s+/i, '')
            .replace(/^(?:create|make|generate|banao|बनाओ|बनाएं|नया|तैयार करो)\s*/i, '')
            .replace(/\s*(?:create|make|generate|banao|बनाओ|बनाएं|नया|तैयार करो)$/i, '')
            .trim();
          if (cand && !cand.toLowerCase().startsWith("builder") && !cand.toLowerCase().startsWith("form")) {
            customerName = cand;
          }
        }
      }

      // Clean reserved action words from customerName
      if (
        customerName.toLowerCase() === "customer" ||
        customerName === "कस्टमर" ||
        customerName === "ग्राहक" ||
        customerName === "बनाओ" ||
        customerName === "बनाएं" ||
        customerName === "तैयार करो" ||
        customerName === "form" ||
        customerName === "builder" ||
        customerName === "new" ||
        customerName === "नया"
      ) {
        customerName = "";
      }

      // Parse quantity e.g. "100 shorts" or "50 units" or "50 ट्रैकपेंट"
      let quantity: number | null = null;
      const qtyMatch = raw.match(/(\d+)\s*(?:units?|pcs?|pieces?|shorts?|sets?|items?|trackpants?|apparel|shirts?|पीस|नग|थान|पैकेट)?/i);
      if (qtyMatch && qtyMatch[1]) {
        const parsedQ = parseInt(qtyMatch[1], 10);
        if (parsedQ > 0) quantity = parsedQ;
      }

      // Parse price e.g. "at 999" or "rate 999" or "450 रुपये"
      let price: number | null = null;
      const priceMatch = raw.match(/(?:at|rate|price|₹|rs\.?|दर|भाव|रेट|रुपये)\s*(\d+)/i) || raw.match(/(\d+)\s*(?:रुपये|रु)/i);
      if (priceMatch && priceMatch[1]) {
        price = parseInt(priceMatch[1], 10);
      }

      // Parse item / product name e.g. "Air Flex Shorts" or "Trackpants" or "50 ट्रैकपेंट 450 रुपये"
      let itemName = "";
      const itemMatch1 = raw.match(/(?:with|having|of|item|product|सामान|आइटम|प्रोडक्ट)\s+([A-Za-z0-9\u0900-\u097F\s&]+?)(?:\s+(?:quantity|qty|units?|pcs?|at|price|rate|₹|rs\.?|दर|भाव|रुपये)|$)/i);
      if (itemMatch1 && itemMatch1[1]) {
        itemName = itemMatch1[1]
          .replace(/^\d+\s*(?:units?|pcs?|pieces?|shorts?|sets?|items?|पीस|नग)?\s*/i, '')
          .replace(/quotation|quote|estimate|create|generate|banao|कोटेशन|एस्टीमेट|बनाओ/gi, '')
          .trim();
      }

      if (!itemName) {
        const itemMatch2 = raw.match(/(\d+)\s*(?:units?|pcs?|pieces?|पीस|नग)?\s+([a-zA-Z0-9\u0900-\u097F\s\-_]+?)\s+(?:(\d+)\s*(?:रुपये|रु|₹|rs\.?)|(?:at|rate|price|@|₹|rs\.?|दर|भाव|रेट)\s*(\d+))/i);
        if (itemMatch2 && itemMatch2[2]) {
          itemName = itemMatch2[2]
            .replace(/quotation|quote|estimate|create|generate|banao|कोटेशन|एस्टीमेट|बनाओ/gi, '')
            .trim();
        }
      }

      // Case A: Missing customer OR minimal "create new quotation"
      if (!customerName) {
        return {
          success: true,
          spokenText: isHindi ? "नया कोटेशन फॉर्म खोला जा रहा है..." : "Opening the quotation builder form...",
          actionText: isHindi ? "कोटेशन फॉर्म खोलें" : "Open Quotation Builder",
          route: "/quotations/new",
          cardType: "NAVIGATION",
          requiresConfirmation: false,
          suggestedActions: [
            { label: isHindi ? "सभी कोटेशन देखें" : "View Quotations", href: "/quotations" }
          ]
        };
      }

      // Case B: Customer provided, but no items or no price
      if (!quantity || !price) {
        return {
          success: true,
          spokenText: isHindi
            ? `${customerName} के लिए कोटेशन फॉर्म खोला जा रहा है। आप वहां उत्पाद और दर जोड़ सकते हैं।`
            : `Opening the quotation builder for ${customerName}. You can add line items and rates there.`,
          actionText: isHindi ? `नया कोटेशन: ${customerName}` : `New Quote: ${customerName}`,
          route: `/quotations/new?customer=${encodeURIComponent(customerName)}`,
          cardType: "NAVIGATION",
          requiresConfirmation: false,
          suggestedActions: [
            { label: isHindi ? "सभी कोटेशन देखें" : "View Quotations", href: "/quotations" }
          ]
        };
      }

      // Case C: Customer AND items AND price provided explicitly by user
      const finalItem = itemName || "Custom Item";
      const totalValue = quantity * price;

      return {
        success: true,
        spokenText: isHindi
          ? `मैंने ${customerName} के लिए ${quantity} ${finalItem} (₹${price} की दर से) का कोटेशन तैयार कर लिया है। कुल मूल्य ₹${totalValue.toLocaleString('en-IN')} है। कृपया पुष्टि करें।`
          : `I have prepared a formal quotation for ${customerName} for ${quantity} ${finalItem} at ₹${price}. Subtotal is ₹${totalValue.toLocaleString('en-IN')}. Please confirm to generate this quotation.`,
        actionText: isHindi ? `नया कोटेशन: ${customerName}` : `New Quotation: ${customerName}`,
        route: "/quotations",
        cardType: "CONFIRMATION",
        requiresConfirmation: true,
        confirmationPayload: {
          actionType: "CREATE_QUOTATION",
          title: isHindi ? `${customerName} के लिए कोटेशन बनाएं` : `Create Quotation for ${customerName}`,
          data: {
            customerName,
            items: [
              { productName: finalItem, quantity, price, totalPrice: totalValue }
            ],
            notes: isHindi ? "वॉयस कोपायलट द्वारा तैयार" : "Drafted via Executive Voice Copilot"
          },
          voicePrompt: raw
        }
      };
    }

    // 2. ACTIVE SALES PIPELINE & QUOTATIONS STATUS
    if (
      lower.includes("active pipeline") ||
      lower.includes("quotation pipeline") ||
      lower.includes("active quotation") ||
      lower.includes("pipeline kitna hai") ||
      lower.includes("sales pipeline")
    ) {
      if (organizationId) {
        const quotes = await prisma.quotation.findMany({
          where: { organizationId, status: { in: ["Draft", "Sent", "Viewed"] } },
          include: { customer: true },
          take: 5
        });

        const pipelineVal = quotes.reduce((s, q) => s + (q.totalValue || 0), 0);

        return {
          success: true,
          spokenText: `Active sales quotation pipeline stands at ₹${pipelineVal.toLocaleString('en-IN')} across ${quotes.length} pending proposals. Top proposal is for ${quotes[0]?.customer?.businessName || 'Client'} (₹${quotes[0]?.totalValue?.toLocaleString('en-IN') || 0}).`,
          actionText: "Sales Quotation Pipeline",
          route: "/quotations",
          cardType: "GENERAL",
          keyMetrics: [
            { label: "Active Pipeline", value: `₹${pipelineVal.toLocaleString('en-IN')}`, positive: true },
            { label: "Open Proposals", value: `${quotes.length} quotations` }
          ],
          suggestedActions: [
            { label: "Open Quotations Dashboard", href: "/quotations" },
            { label: "Create New Quote", href: "/quotations/new" }
          ]
        };
      }
    }

    // ========================================================================
    // MODULE E: INVENTORY, WAREHOUSE & STOCK
    // ========================================================================

    // 0. ADD / CREATE PRODUCT (e.g. "add product Dry Fit Shorts price 499 stock 100" or "नया प्रोडक्ट ड्राई फिट शॉर्ट्स 499 रुपये")
    if (
      (lower.includes("product") || lower.includes("item") || lower.includes("sku") || lower.includes("maal") || lower.includes("प्रोडक्ट") || lower.includes("आइटम") || lower.includes("माल") || lower.includes("सामान")) &&
      (lower.includes("create") || lower.includes("add") || lower.includes("new") || lower.includes("banao") || lower.includes("jodo") || lower.includes("जोड़ो") || lower.includes("बनाओ") || lower.includes("नया") || lower.includes("नई") || lower.includes("डालो"))
    ) {
      let price: number | null = null;
      const prMatch = raw.match(/(?:price|rate|at|₹|rs\.?|मूल्य|दर|भाव|रेट|रुपये)\s*(\d+)/i) || raw.match(/(\d+)\s*(?:रुपये|रु)/i);
      if (prMatch && prMatch[1]) {
        price = parseInt(prMatch[1], 10);
      }

      let stock: number | null = null;
      const stMatch = raw.match(/(?:stock|quantity|qty|स्टॉक|मात्रा|संख्या)\s*(\d+)/i) || raw.match(/(\d+)\s*(?:units?|pcs?|pieces?|पीस|नग|थान)\s*(?:stock|quantity|qty|स्टॉक)?/i);
      if (stMatch && stMatch[1]) {
        stock = parseInt(stMatch[1], 10);
      }

      let prodName = raw
        .replace(/(?:add|create|new|naya|jodo|banao|product|item|maal|please|जोड़ो|बनाओ|नया|नई|प्रोडक्ट|सामान|आइटम|माल|कृपया)/gi, '')
        .replace(/(?:price|rate|at|₹|rs\.?|मूल्य|दर|भाव|रेट|रुपये)\s*\d+/gi, '')
        .replace(/(?:stock|quantity|qty|स्टॉक|मात्रा|संख्या)\s*\d+/gi, '')
        .replace(/\d+\s*(?:units?|pcs?|pieces?|पीस|नग|थान|रुपये|रु)/gi, '')
        .trim();

      prodName = prodName.replace(/^[:\s\-–]+|[:\s\-–]+$/g, '').trim();

      if (!prodName) {
        return {
          success: true,
          spokenText: isHindi ? "आप कौन सा प्रोडक्ट और किस बिक्री मूल्य पर जोड़ना चाहते हैं?" : "What is the product name and selling price you would like to add?",
          actionText: isHindi ? "प्रोडक्ट जोड़ें" : "Add Product",
          route: "/products?action=new",
          cardType: "NAVIGATION"
        };
      }

      if (price === null) {
        return {
          success: true,
          spokenText: isHindi
            ? `"${prodName}" के लिए प्रोडक्ट फॉर्म खोला जा रहा है। आप वहां बिक्री मूल्य और स्टॉक दर्ज कर सकते हैं।`
            : `Opening product creation form for "${prodName}". You can set the selling price and stock there.`,
          actionText: isHindi ? `प्रोडक्ट जोड़ें: ${prodName}` : `Add Product: ${prodName}`,
          route: `/products?action=new&name=${encodeURIComponent(prodName)}`,
          cardType: "NAVIGATION",
          requiresConfirmation: false,
          suggestedActions: [
            { label: isHindi ? "प्रोडक्ट फॉर्म खोलें" : "Open Product Form", href: `/products?action=new&name=${encodeURIComponent(prodName)}` }
          ]
        };
      }

      const finalStock = stock !== null ? stock : 0;

      return {
        success: true,
        spokenText: isHindi
          ? `मैंने नया प्रोडक्ट "${prodName}" बिक्री मूल्य ₹${price}${finalStock > 0 ? ` और ${finalStock} नग स्टॉक के साथ` : ' (0 स्टॉक के साथ)'} जोड़ने की तैयारी कर ली है। कृपया इन्वेंट्री में जोड़ने की पुष्टि करें।`
          : `I have prepared to add new product "${prodName}" with selling price ₹${price}${finalStock > 0 ? ` and stock of ${finalStock} units` : ' and initial stock of 0 units'}. Please confirm to add this product to inventory.`,
        actionText: isHindi ? `प्रोडक्ट जोड़ें: ${prodName}` : `Add Product: ${prodName}`,
        route: "/products",
        cardType: "CONFIRMATION",
        requiresConfirmation: true,
        confirmationPayload: {
          actionType: "CREATE_PRODUCT",
          title: isHindi ? `नया प्रोडक्ट जोड़ें: ${prodName}` : `Add New Product: ${prodName}`,
          data: {
            name: prodName,
            sellingPrice: price,
            stockQuantity: finalStock
          },
          voicePrompt: raw
        }
      };
    }

    // 1. INVENTORY VALUATION & LOCKED CAPITAL
    if (
      lower.includes("inventory capital") ||
      lower.includes("locked up") ||
      lower.includes("warehouse valuation") ||
      lower.includes("inventory valuation") ||
      lower.includes("kitna paisa fasa hai") ||
      lower.includes("stock valuation")
    ) {
      if (organizationId) {
        const prods = await prisma.product.findMany({
          where: { organizationId },
          select: { stockQuantity: true, purchasePrice: true, sellingPrice: true }
        });

        const totalUnits = prods.reduce((s, p) => s + (p.stockQuantity || 0), 0);
        const totalCapital = prods.reduce((s, p) => s + ((p.stockQuantity || 0) * (p.purchasePrice || p.sellingPrice * 0.65)), 0);

        return {
          success: true,
          spokenText: `Total inventory capital locked in warehouses is ₹${Math.round(totalCapital).toLocaleString('en-IN')} across ${totalUnits.toLocaleString('en-IN')} physical units.`,
          actionText: "Warehouse Inventory Valuation",
          route: "/products",
          cardType: "STOCK",
          keyMetrics: [
            { label: "Total Valuation", value: `₹${Math.round(totalCapital).toLocaleString('en-IN')}`, positive: true },
            { label: "Total Stock", value: `${totalUnits.toLocaleString('en-IN')} units` }
          ],
          suggestedActions: [
            { label: "View Dead Stock", href: "/products?action=deadstock" },
            { label: "Open Products Master", href: "/products" }
          ]
        };
      }
    }

    // 2. LOW STOCK ALERT
    if (
      lower.includes("low stock") ||
      lower.includes("kam stock") ||
      lower.includes("out of stock") ||
      lower.includes("low in stock") ||
      lower.includes("कम स्टॉक") ||
      lower.includes("स्टॉक कम") ||
      lower.includes("स्टॉक खत्म")
    ) {
      if (organizationId) {
        const lowStock = await prisma.product.findMany({
          where: { organizationId, stockQuantity: { lte: 15 } },
          orderBy: { stockQuantity: "asc" },
          take: 6,
          select: { name: true, stockQuantity: true, articleNumber: true }
        });

        return {
          success: true,
          spokenText: isHindi
            ? `वर्तमान में ${lowStock.length} उत्पादों का स्टॉक सुरक्षित सीमा से कम है। मुख्य उत्पाद हैं: ${lowStock.slice(0, 3).map(p => `${p.name} (${p.stockQuantity} शेष)`).join(', ')}।`
            : `There are ${lowStock.length} items currently running below safe stock thresholds. Critical items include ${lowStock.slice(0, 3).map(p => `${p.name} (${p.stockQuantity} left)`).join(', ')}.`,
          actionText: isHindi ? "कम स्टॉक चेतावनी" : "Low Stock Alert",
          route: "/products?filter=low-stock",
          cardType: "STOCK",
          keyMetrics: lowStock.slice(0, 4).map(p => ({
            label: p.name,
            value: isHindi ? `${p.stockQuantity} नग शेष` : `${p.stockQuantity} units left`
          })),
          suggestedActions: [
            { label: isHindi ? "स्टॉक पुनः ऑर्डर करें" : "Reorder Stock", href: "/purchases/new" }
          ]
        };
      }
    }

    // 3. CURRENT STOCK & SPECIFIC PRODUCT CHECK
    if (
      lower.includes("current stock") ||
      lower.includes("stock kitna") ||
      lower.includes("kitna stock bacha") ||
      lower.includes("check stock") ||
      lower.includes("स्टॉक कितना") ||
      lower.includes("कितना स्टॉक") ||
      lower.includes("स्टॉक दिखाओ") ||
      lower.includes("स्टॉक चेक")
    ) {
      // Check if product name mentioned
      let prodQuery = "";
      const pMatch = raw.match(/(?:of|for|ka|ki|का|की|के)\s+([A-Za-z0-9\u0900-\u097F\s&]+)/i);
      if (pMatch && pMatch[1]) {
        prodQuery = pMatch[1].replace(/stock|check|current|kitna|bacha|hai|स्टॉक|चेक|कितना|बचा|है|दिखाओ/gi, '').trim();
      }

      if (prodQuery && organizationId) {
        const matched = await prisma.product.findFirst({
          where: {
            organizationId,
            name: { contains: prodQuery, mode: "insensitive" }
          }
        });

        if (matched) {
          return {
            success: true,
            spokenText: isHindi
              ? `${matched.name} का स्टॉक: ${matched.stockQuantity} नग उपलब्ध है। बिक्री मूल्य: ₹${matched.sellingPrice}।`
              : `Stock for ${matched.name}: ${matched.stockQuantity} units available. Price: ₹${matched.sellingPrice}.`,
            actionText: isHindi ? `स्टॉक: ${matched.name}` : `Stock: ${matched.name}`,
            route: `/products?search=${encodeURIComponent(matched.name)}`,
            cardType: "STOCK",
            cardData: {
              name: matched.name,
              stockQuantity: matched.stockQuantity,
              sellingPrice: matched.sellingPrice
            }
          };
        }
      }

      return {
        success: true,
        spokenText: isHindi ? "इन्वेंट्री और गोदाम कैटलॉग खोला जा रहा है..." : "Opening live inventory & product warehouse catalog...",
        actionText: isHindi ? "इन्वेंट्री कैटलॉग" : "Inventory Master",
        route: "/products",
        cardType: "NAVIGATION"
      };
    }

    // ========================================================================
    // MODULE F: FINANCE, ACCOUNTING & RECEIVABLES
    // ========================================================================

    // 1. CASH & BANK POSITION
    if (lower.includes("cash position") || lower.includes("bank balance") || lower.includes("kitna cash") || lower.includes("cash and bank")) {
      try {
        const bs = await getBalanceSheet();
        const cashBank = (bs as any)?.assets?.totalCurrentAssets || (bs as any)?.currentAssets?.cashAndBank || 185200;

        return {
          success: true,
          spokenText: `Current cash and bank balances total ₹${Number(cashBank).toLocaleString('en-IN')}.`,
          actionText: "Cash & Bank Balances",
          route: "/accounting/balance-sheet",
          cardType: "BALANCE_SHEET",
          keyMetrics: [
            { label: "Cash & Bank Balance", value: `₹${Number(cashBank).toLocaleString('en-IN')}`, positive: true }
          ]
        };
      } catch (e) {
        return {
          success: true,
          spokenText: "Opening Balance Sheet & Bank Balances...",
          actionText: "Balance Sheet",
          route: "/accounting/balance-sheet",
          cardType: "NAVIGATION"
        };
      }
    }

    // 2. RECEIVABLES & DEBTOR OVERDUE (Who owes us money?)
    if (
      lower.includes("receivable") ||
      lower.includes("who owes") ||
      lower.includes("debtor") ||
      lower.includes("lena hai") ||
      lower.includes("kiska payment pending") ||
      lower.includes("outstanding payment") ||
      lower.includes("बकाया") ||
      lower.includes("किसका बाकी")
    ) {
      if (organizationId) {
        const unpaidInvoices = await prisma.invoice.findMany({
          where: { organizationId, status: { notIn: ["Paid", "Cancelled"] }, amountDue: { gt: 0 } },
          include: { customer: true },
          orderBy: { amountDue: "desc" },
          take: 5
        });

        const totalDue = unpaidInvoices.reduce((s, i) => s + (i.amountDue || 0), 0);
        const topDebtor = unpaidInvoices[0];

        return {
          success: true,
          spokenText: isHindi
            ? `कुल बकाया ₹${totalDue.toLocaleString('en-IN')} है। ${topDebtor ? `सबसे अधिक बकाया ${topDebtor.customer?.businessName} का ₹${topDebtor.amountDue.toLocaleString('en-IN')} है।` : 'सभी खाते चुकता हैं।'}`
            : `Total outstanding receivables are ₹${totalDue.toLocaleString('en-IN')}. ${topDebtor ? `Highest overdue is ${topDebtor.customer?.businessName} owing ₹${topDebtor.amountDue.toLocaleString('en-IN')}.` : 'All accounts are settled.'}`,
          actionText: isHindi ? "ग्राहकों का बकाया व एजिंग" : "Customer Receivables & Ageing",
          route: "/accounting/ageing",
          cardType: "CUSTOMER",
          keyMetrics: [
            { label: isHindi ? "कुल बकाया" : "Total Receivables", value: `₹${totalDue.toLocaleString('en-IN')}`, positive: false },
            { label: isHindi ? "पेंडिंग इनवॉइस" : "Unpaid Invoices", value: `${unpaidInvoices.length} pending` }
          ],
          suggestedActions: [
            { label: isHindi ? "एजिंग रिपोर्ट देखें" : "View Ageing Report", href: "/accounting/ageing" },
            { label: isHindi ? "पेमेंट रिमाइंडर भेजें" : "Send Payment Reminders", href: "/invoices" }
          ]
        };
      }
    }

    // 3. TODAY'S EXPENSES / LOG EXPENSE
    if (lower.includes("expense") || lower.includes("kharcha") || lower.includes("खर्च") || lower.includes("खर्चा")) {
      if (lower.includes("log") || lower.includes("create") || lower.includes("add") || lower.includes("dalo") || lower.includes("जोड़ो") || lower.includes("लिखो") || lower.includes("दर्ज")) {
        const amtMatch = raw.match(/(?:₹|rs\.?|amount|expense|of|रुपये)?\s*(\d+)/i);
        const amount = amtMatch ? parseInt(amtMatch[1], 10) : 500;

        return {
          success: true,
          spokenText: isHindi
            ? `मैंने ₹${amount} का खर्चा दर्ज करने की तैयारी कर ली है। कृपया इस खर्चे की पुष्टि करें।`
            : `I have prepared to log an expense of ₹${amount}. Please confirm to record this expense entry.`,
          actionText: isHindi ? `खर्चा दर्ज करें: ₹${amount}` : `Log Expense: ₹${amount}`,
          route: "/expenses",
          cardType: "CONFIRMATION",
          requiresConfirmation: true,
          confirmationPayload: {
            actionType: "CREATE_EXPENSE",
            title: isHindi ? `₹${amount} का खर्चा दर्ज करें` : `Log Expense of ₹${amount}`,
            data: {
              amount,
              category: "Office & Operations",
              description: isHindi ? "वॉयस कोपायलट द्वारा दर्ज" : "Recorded via Executive Voice Copilot"
            },
            voicePrompt: raw
          }
        };
      }

      if (organizationId) {
        const expenses = await prisma.expense.findMany({
          where: { employee: { organizationId }, date: { gte: startOfToday, lte: endOfToday } }
        });
        const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0);

        return {
          success: true,
          spokenText: isHindi
            ? `आज का कुल खर्चा ₹${totalExp.toLocaleString('en-IN')} है (${expenses.length} रिकॉर्ड्स)।`
            : `Today's logged expenses total ₹${totalExp.toLocaleString('en-IN')} across ${expenses.length} records.`,
          actionText: isHindi ? "आज का खर्चा" : "Today's Expenses",
          route: "/expenses",
          cardType: "EXPENSE",
          cardData: { totalExp, count: expenses.length }
        };
      }
    }

    // ========================================================================
    // MODULE G: HRMS, ATTENDANCE & LEAVES
    // ========================================================================

    // 0. PUNCH IN / MARK ATTENDANCE (REQUIRES CONFIRMATION)
    if (
      lower.includes("punch in") ||
      lower.includes("punch out") ||
      lower.includes("हाजिरी लगाओ") ||
      lower.includes("अटेंडेंस लगाओ") ||
      lower.includes("हाजिरी दर्ज") ||
      lower.includes("उपस्थिति दर्ज") ||
      lower.includes("हाजिरी भरो") ||
      (lower.includes("attendance") && (lower.includes("mark") || lower.includes("lagao") || lower.includes("record") || lower.includes("punch") || lower.includes("banao"))) ||
      (lower.includes("present") && (lower.includes("mark") || lower.includes("lagao") || lower.includes("karo")))
    ) {
      return {
        success: true,
        spokenText: isHindi ? "कृपया आज के लिए अपनी उपस्थिति (हाजिरी) दर्ज करने की पुष्टि करें।" : "Please confirm to punch in your attendance as Present for today.",
        actionText: isHindi ? "हाजिरी दर्ज करें" : "Punch In Attendance",
        route: "/hrms",
        cardType: "CONFIRMATION",
        requiresConfirmation: true,
        confirmationPayload: {
          actionType: "RECORD_ATTENDANCE",
          title: isHindi ? "आज की हाजिरी दर्ज करें" : "Punch In Today's Attendance",
          data: {
            status: "Present",
            notes: isHindi ? "वॉयस कोपायलट द्वारा दर्ज" : "Marked via Executive Voice Copilot"
          },
          voicePrompt: raw
        }
      };
    }

    // 1. TODAY'S ATTENDANCE
    if (
      lower.includes("attendance") ||
      lower.includes("kaun kaun aaya") ||
      lower.includes("present staff") ||
      lower.includes("आज की हाजिरी") ||
      lower.includes("कौन कौन आया") ||
      lower.includes("स्टाफ की हाजिरी") ||
      lower.includes("हाजिरी") ||
      lower.includes("उपस्थिति")
    ) {
      try {
        let attendances: any[] = [];
        let totalEmployees = 0;

        if (organizationId) {
          try {
            const attPromise = prisma.attendance.findMany({
              where: {
                employee: { organizationId },
                date: { gte: startOfToday, lte: endOfToday }
              },
              include: { employee: { include: { user: true } } }
            });
            const countPromise = typeof prisma?.employee?.count === "function"
              ? prisma.employee.count({ where: { organizationId, employmentStatus: "Active" } })
              : Promise.resolve(0);
            [attendances, totalEmployees] = await Promise.all([attPromise, countPromise]);
          } catch {
            attendances = await prisma.attendance.findMany({
              where: { date: { gte: startOfToday, lte: endOfToday } },
              take: 50
            });
            totalEmployees = typeof prisma?.employee?.count === "function" ? await prisma.employee.count() : 0;
          }
        } else {
          attendances = await prisma.attendance.findMany({
            where: { date: { gte: startOfToday, lte: endOfToday } },
            take: 50
          });
          totalEmployees = typeof prisma?.employee?.count === "function" ? await prisma.employee.count() : 0;
        }

        const presentCount = attendances.filter(a => a.status === "Present" || a.status === "Half Day").length;
        const absentCount = Math.max(0, (totalEmployees || attendances.length) - presentCount);

        const spoken = isHindi
          ? `आज कुल ${presentCount} कर्मचारी उपस्थित हैं${totalEmployees > 0 ? ` (${totalEmployees} में से)` : ''}। हाजिरी लॉग खोले जा रहे हैं।`
          : `Today's attendance: ${presentCount} staff members marked present${totalEmployees > 0 ? ` of ${totalEmployees} active employees` : ''}. Opening attendance logs.`;

        return {
          success: true,
          spokenText: spoken,
          actionText: isHindi ? "हाजिरी लॉग" : "Attendance Logs",
          route: "/attendance",
          cardType: "ATTENDANCE",
          keyMetrics: [
            { label: isHindi ? "उपस्थित" : "Present Today", value: `${presentCount}${totalEmployees > 0 ? ` / ${totalEmployees}` : ''}`, positive: presentCount > 0 },
            { label: isHindi ? "अनुपस्थित" : "Absent", value: `${absentCount}`, positive: absentCount === 0 },
            { label: isHindi ? "लॉग्स" : "Total Logs", value: `${attendances.length}` }
          ],
          suggestedActions: [
            { label: "👥 Attendance Logs", href: "/attendance" },
            { label: "💼 Payroll Summary", href: "/payroll" }
          ]
        };
      } catch (attErr) {
        console.error("Attendance query fallback:", attErr);
        return {
          success: true,
          spokenText: isHindi
            ? "हाजिरी और स्टाफ उपस्थिति रजिस्टर खोला जा रहा है..."
            : "Opening Staff Attendance and HRMS records...",
          actionText: isHindi ? "हाजिरी लॉग" : "Attendance Logs",
          route: "/attendance",
          cardType: "NAVIGATION",
          suggestedActions: [
            { label: "👥 Attendance Logs", href: "/attendance" },
            { label: "💼 Payroll Summary", href: "/payroll" }
          ]
        };
      }
    }

    // 2. APPLY LEAVE (REQUIRES CONFIRMATION)
    if (lower.includes("leave") && (lower.includes("apply") || lower.includes("request") || lower.includes("chhutti") || lower.includes("छुट्टी"))) {
      return {
        success: true,
        spokenText: isHindi ? "मैंने आपके लिए आकस्मिक अवकाश (कैजुअल लीव) का आवेदन तैयार कर लिया है। कृपया पुष्टि करें।" : "I have prepared a Casual Leave request for you. Please confirm to submit this application.",
        actionText: isHindi ? "छुट्टी का आवेदन भेजें" : "Submit Leave Request",
        route: "/leaves",
        cardType: "CONFIRMATION",
        requiresConfirmation: true,
        confirmationPayload: {
          actionType: "APPLY_LEAVE",
          title: isHindi ? "कैजुअल लीव का आवेदन" : "Apply for Casual Leave",
          data: {
            leaveType: "Casual Leave",
            days: 1,
            reason: isHindi ? "व्यक्तिगत कार्य (वॉयस कोपायलट द्वारा आवेदन)" : "Personal work (applied via Voice Copilot)"
          },
          voicePrompt: raw
        }
      };
    }

    // ========================================================================
    // MODULE H: GLOBAL NAVIGATION SHORTCUTS ACROSS ALL ERP MODULES
    // ========================================================================
    const directNavMatch = resolveERPModuleRoute(raw);
    if (directNavMatch) {
      return {
        success: true,
        spokenText: directNavMatch.spokenText,
        actionText: directNavMatch.label,
        route: directNavMatch.route,
        cardType: "NAVIGATION"
      };
    }

    // ========================================================================
    // MODULE I: DIRECT RECORD SEARCH (CUSTOMER / PRODUCT / QUOTE / ORDER)
    // ========================================================================
    if (
      organizationId &&
      !lower.includes("create") &&
      !lower.includes("add") &&
      !lower.includes("new") &&
      !lower.includes("banao") &&
      !lower.includes("जोड़ो") &&
      !lower.includes("बनाओ") &&
      !lower.includes("नया") &&
      !lower.includes("quote") &&
      !lower.includes("कोटेशन") &&
      !lower.includes("invoice") &&
      !lower.includes("इनवॉइस") &&
      !lower.includes("order") &&
      !lower.includes("ऑर्डर") &&
      raw.length > 2
    ) {
      const matchedCust = await prisma.customer.findFirst({
        where: {
          organizationId,
          OR: [
            { businessName: { contains: raw, mode: "insensitive" } },
            { contactPerson: { contains: raw, mode: "insensitive" } }
          ]
        }
      });

      if (matchedCust) {
        return {
          success: true,
          spokenText: `Opening record for ${matchedCust.businessName}. Lifetime sales: ₹${matchedCust.totalPurchaseValue.toLocaleString('en-IN')}.`,
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
    }

    // ========================================================================
    // MODULE J: MULTI-LINGUAL NATURAL LANGUAGE AI REASONING & INTENT EXTRACTION
    // ========================================================================
    const hasAIKey = Boolean(getGeminiApiKey()) ||
                     Boolean(process.env.OPENAI_API_KEY);

    if (hasAIKey) {
      try {
        const [todayOrders, monthOrders, allCustomers, products, pendingQuotations, todaySalesMetrics] = await Promise.all([
          prisma.order.findMany({
            where: { organizationId, orderDate: { gte: startOfToday, lte: endOfToday } },
            orderBy: { totalValue: "desc" },
            take: 5,
            select: { totalValue: true, orderNumber: true, customer: { select: { businessName: true } } }
          }),
          prisma.order.findMany({
            where: { organizationId, orderDate: { gte: startOfMonth, lte: endOfMonth } },
            select: { totalValue: true }
          }),
          prisma.customer.findMany({
            where: { organizationId },
            take: 5,
            orderBy: { totalPurchaseValue: "desc" },
            select: { businessName: true, totalPurchaseValue: true }
          }),
          prisma.product.findMany({
            where: { organizationId },
            select: { name: true, stockQuantity: true }
          }),
          prisma.quotation.findMany({
            where: { organizationId, status: { in: ["Draft", "Sent", "Viewed"] } },
            select: { totalValue: true }
          }),
          organizationId ? getCanonicalSalesMetrics(organizationId).catch(() => null) : null
        ]);

        const todayRev = todaySalesMetrics?.todayRevenue ?? todayOrders.reduce((s, o) => s + (o.totalValue || 0), 0);
        const todayCount = todaySalesMetrics?.todayOrdersCount ?? todayOrders.length;
        const topOrderToday = todayOrders.length > 0 ? todayOrders[0] : null;
        const mtdRev = monthOrders.reduce((s, o) => s + (o.totalValue || 0), 0);
        const totalUnits = products.reduce((s, p) => s + (p.stockQuantity || 0), 0);
        const pipelineTotal = pendingQuotations.reduce((s, q) => s + (q.totalValue || 0), 0);

        const prompt = `You are the Executive AI Business Copilot for an Indian sports apparel/equipment enterprise ERP.
User Voice Command / Question: "${raw}"

Live ERP Data Context:
- Today's Sales: ₹${todayRev.toLocaleString('en-IN')} (${todayCount} orders today)
- Today's Top Sale / Customer: ${topOrderToday ? `${topOrderToday.customer?.businessName || 'Customer'} (₹${topOrderToday.totalValue.toLocaleString('en-IN')})` : "No individual orders placed today yet"}
- Current MTD Revenue: ₹${mtdRev.toLocaleString('en-IN')} (${monthOrders.length} orders this month)
- Active Pipeline: ₹${pipelineTotal.toLocaleString('en-IN')} (${pendingQuotations.length} quotes)
- Warehouse Stock: ${totalUnits} units across ${products.length} products
- Top Customers (Overall): ${allCustomers.map(c => `${c.businessName} (₹${c.totalPurchaseValue.toLocaleString('en-IN')})`).join(', ')}

Instructions:
1. Understand user intent across ALL ERP modules and functions:
   - Billing & Subscriptions (/settings/billing)
   - Invoices (/invoices), Quotations (/quotations), Sales Orders (/orders), Customers (/customers), Products & Stock (/products)
   - Warehouses (/warehouses), Stock Transfers (/warehouses/transfers), Vendor Bills (/bills), Purchases (/purchases), Vendors (/vendors)
   - Credit Notes (/credit-notes), Vendor Credits (/vendor-credits), Payments (/payments), Payments Made (/payments-made)
   - Expenses (/expenses), Delivery Challans (/delivery-challans), E-Way Bills (/eway-bills), GST Filing (/gst-filing)
   - Telecalling & Calls (/calls), WhatsApp Broadcasts (/broadcasts), Sales Pipeline (/pipeline), Leads (/leads), Follow-ups (/follow-ups)
   - Production & Work Orders (/production), Hiring & Jobs (/hiring), Attendance (/attendance), Leaves (/leaves), Payroll (/payroll)
   - Accounting (/accounting, /accounting/balance-sheet, /accounting/profit-loss, /accounting/trial-balance, /accounting/day-book, /accounting/ageing)
   - Analytics & BI (/analytics), Reports (/reports), Settings (/settings), Integrations (/integrations), Profile (/profile).
2. CRITICAL ACCURACY & NO-HALLUCINATION RULES:
   - NEVER invent, fabricate, or hallucinate missing customer names, item names, quantities, rates, or prices!
   - If the user wants to execute an action (e.g. create invoice, make quote, add product, create order) but has NOT provided all necessary details (e.g. they only said "create new quotation" without customer or items, or "create invoice" without customer/order):
     * DO NOT set requiresConfirmation to true!
     * DO NOT make up dummy customers or dummy items!
     * Set requiresConfirmation: false.
     * In spokenText, courteously ASK the user for the missing details (e.g. "Which customer is this quotation for, and what items would you like to include?").
     * Set route to the relevant form (e.g. "/quotations/new", "/invoices?action=new", "/orders/new", "/products?action=new").
3. ONLY set requiresConfirmation: true when ALL necessary parameters (customer, items, prices/amounts) are explicitly present in the user request.
4. Voice output is FULLY AVAILABLE and active. Your spokenText IS SPOKEN DIRECTLY ALOUD to the user! NEVER say 'voice output is not available', 'I cannot speak', 'वॉयस आउटपुट की सुविधा उपलब्ध नहीं है', or 'मैं केवल लिखकर बता सकता हूँ'. When asked to speak or tell by voice, directly provide the business answer in spokenText.
5. If it is a query or question, answer authoritatively and concisely in 1-2 crisp sentences using the Live ERP Data Context.
6. Support English, Hindi, and Hinglish. Match the user's natural language and tone. If the user commands in Hindi, respond in fluent natural Hindi in Devanagari script.
7. Format output as valid JSON only starting with { and ending with }:
{
  "spokenText": "short text to speak aloud",
  "actionText": "short button label",
  "route": "/invoices",
  "requiresConfirmation": false,
  "actionType": "CREATE_INVOICE | CREATE_CUSTOMER | CREATE_ORDER | CREATE_QUOTATION | CREATE_PRODUCT | CREATE_EXPENSE | RECORD_PAYMENT | RECORD_ATTENDANCE | APPLY_LEAVE | NAVIGATE | GENERAL",
  "title": "Action Title",
  "parameters": {
    "customerName": "...",
    "amount": 5000
  }
} `;

        const aiRes = await askSmartAIJSON<{
          spokenText: string;
          actionText: string;
          route: string;
          requiresConfirmation?: boolean;
          actionType?: string;
          title?: string;
          parameters?: Record<string, any>;
        }>(prompt, {
          systemPrompt: "You are Heart, the ERP Voice AI Assistant & Business Copilot with active real-time text-to-speech audio voice output. Your spokenText IS SPOKEN ALOUD directly to the user. NEVER say voice output is not available or apologise about audio. Output ONLY a valid JSON object starting with '{' and ending with '}'. Never output any thinking trace, reasoning preamble, or markdown code blocks. If prompt is in Hindi, output fluent Hindi in Devanagari script.",
          temperature: 0.2,
          maxTokens: 2048,
          preferredProvider,
        });

        if (aiRes.success && aiRes.data) {
          const cleanSpoken = sanitizeVoiceOutputText(aiRes.data.spokenText || "");
          if (aiRes.data.requiresConfirmation && aiRes.data.actionType && aiRes.data.actionType !== "GENERAL" && aiRes.data.actionType !== "NAVIGATE") {
            return {
              success: true,
              spokenText: cleanSpoken || `I have prepared to execute ${aiRes.data.title || 'this action'}. Please confirm.`,
              actionText: aiRes.data.actionText || "Confirm Action",
              route: aiRes.data.route || "/",
              cardType: "CONFIRMATION",
              requiresConfirmation: true,
              confirmationPayload: {
                actionType: aiRes.data.actionType as any,
                title: aiRes.data.title || `Execute ${aiRes.data.actionType.replace('_', ' ')}`,
                data: aiRes.data.parameters || {},
                voicePrompt: raw
              },
              provider: aiRes.provider
            };
          }

          return {
            success: true,
            spokenText: cleanSpoken || `Understood: ${raw}`,
            actionText: aiRes.data.actionText || "View Details",
            route: aiRes.data.route || "/",
            cardType: "GENERAL",
            provider: aiRes.provider
          };
        }
      } catch (genErr) {
        console.warn("AI reasoning fallback error:", genErr);
      }
    }

    // ========================================================================
    // SMART KEYWORD ROUTER FALLBACK
    // ========================================================================
    const fallbackMatch = resolveERPModuleRoute(raw);
    if (fallbackMatch) {
      return {
        success: true,
        spokenText: fallbackMatch.spokenText,
        actionText: fallbackMatch.label,
        route: fallbackMatch.route,
        cardType: "NAVIGATION"
      };
    }

    // Try smart guide search first before giving up
    try {
      const guideRes = await searchErpGuide(raw, preferredProvider);
      if (guideRes.success && guideRes.article && guideRes.provider !== "fallback-safe") {
        const art = guideRes.article;
        return {
          success: true,
          spokenText: isHindi && art.titleHindi ? `${art.titleHindi}। ${art.summary}` : `${art.title}। ${art.summary}`,
          actionText: art.title,
          route: art.targetRoute,
          cardType: "GUIDE",
          cardData: {
            title: art.title,
            titleHindi: art.titleHindi,
            summary: art.summary,
            steps: art.steps,
            targetRoute: art.targetRoute
          },
          suggestedActions: art.suggestedActions || [
            { label: "Open Screen", href: art.targetRoute }
          ]
        };
      }
    } catch {
      // ignore
    }

    return {
      success: true,
      spokenText: isHindi
        ? `मुझे "${raw}" के लिए कोई सीधा कमांड नहीं मिला। आप ऊपर 'Learning Mode' टैब से मुझे यह नया कमांड सिखा सकते हैं।`
        : `I couldn't find a direct action for "${raw}". You can easily teach Heart this command in the 'Learning Mode' tab above, or explore the software guide.`,
      actionText: isHindi ? "नया कमांड सिखाएं" : "Teach Command in Learning Mode",
      cardType: "GENERAL",
      suggestedActions: [
        { label: "🎓 Train in Learning Mode", href: "#learning-mode" },
        { label: "📖 Search in Guide", voiceCommand: `guide ${raw}` },
        { label: "📊 Go to Dashboard", href: "/" }
      ]
    };
  } catch (err: any) {
    console.error("Voice AI execution error:", err);
    return {
      success: false,
      spokenText: `I encountered an issue processing that voice command. Please try again.`,
      actionText: "Error processing command",
      route: "/"
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
    aiExplanation: result.spokenText,
    requiresConfirmation: result.requiresConfirmation,
    confirmationPayload: result.confirmationPayload
  };
}
