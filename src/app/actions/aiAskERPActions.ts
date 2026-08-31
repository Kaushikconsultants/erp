"use server";

import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";
import { getTenantOrgId } from "@/lib/tenant";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });

export interface AskERPMetric {
  label: string;
  value: string;
  subtext?: string;
  positive?: boolean;
}

export interface AskERPActionLink {
  label: string;
  href: string;
}

export interface AskERPResponse {
  answer: string;
  keyMetrics: AskERPMetric[];
  suggestedActions: AskERPActionLink[];
  followUpQuestions: string[];
}

export async function askERPAssistant(query: string): Promise<{
  success: boolean;
  data?: AskERPResponse;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const organizationId = await getTenantOrgId();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Fetch snapshot of company business metrics
    const [
      companySettings,
      monthOrders,
      allCustomers,
      products,
      pendingQuotations,
      employees
    ] = await Promise.all([
      prisma.companySettings.findFirst({ where: { organizationId } }),
      prisma.order.findMany({
        where: {
          organizationId,
          orderDate: { gte: startOfMonth, lte: endOfMonth }
        },
        select: { totalValue: true, subtotal: true, paymentReceived: true, outstandingAmount: true, customerId: true, salespersonId: true }
      }),
      prisma.customer.findMany({
        where: { organizationId },
        select: { id: true, businessName: true, totalPurchaseValue: true, totalOrders: true, leadStage: true, temperature: true },
        orderBy: { totalPurchaseValue: "desc" },
        take: 10
      }),
      prisma.product.findMany({
        where: { organizationId },
        select: { id: true, name: true, stockQuantity: true, purchasePrice: true, sellingPrice: true, createdAt: true }
      }),
      prisma.quotation.findMany({
        where: {
          organizationId,
          status: { in: ["Sent", "Draft", "Viewed", "Pending Approval"] }
        },
        select: { quotationNumber: true, totalValue: true, status: true, customer: { select: { businessName: true } } }
      }),
      prisma.employee.findMany({
        where: { organizationId },
        include: { user: true }
      })
    ]);

    const companyName = companySettings?.companyName || "ESPON CLOTHING";
    const mtdRevenue = monthOrders.reduce((sum, o) => sum + (o.subtotal || o.totalValue || 0), 0);
    const mtdReceived = monthOrders.reduce((sum, o) => sum + (o.paymentReceived || 0), 0);
    const mtdOutstanding = monthOrders.reduce((sum, o) => sum + (o.outstandingAmount || 0), 0);

    const totalStockUnits = products.reduce((sum, p) => sum + (p.stockQuantity || 0), 0);
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.stockQuantity * (p.purchasePrice || (p.sellingPrice * 0.65))), 0);

    const pipelineQuotationsValue = pendingQuotations.reduce((sum, q) => sum + (q.totalValue || 0), 0);

    // Call Gemini AI
    if (process.env.GEMINI_API_KEY) {
      try {
        const businessContext = `
You are the Chief Financial Officer & Executive AI Business Copilot for "${companyName}".
Answer the owner's question concisely, accurately, and strategically based on the live ERP data below:

--- LIVE BUSINESS METRICS SNAPSHOT ---
- Current Month (MTD) Revenue: ₹${mtdRevenue.toLocaleString('en-IN')} across ${monthOrders.length} orders
- Cash Received MTD: ₹${mtdReceived.toLocaleString('en-IN')}
- Outstanding Receivables: ₹${mtdOutstanding.toLocaleString('en-IN')}
- Active Quotation Pipeline: ₹${pipelineQuotationsValue.toLocaleString('en-IN')} across ${pendingQuotations.length} pending quotes
- Total Inventory in Warehouses: ${totalStockUnits} units (Estimated Valuation: ₹${Math.round(totalInventoryValue).toLocaleString('en-IN')})
- Top 5 Customers by Lifetime Spend:
${allCustomers.slice(0, 5).map(c => `  • ${c.businessName}: ₹${c.totalPurchaseValue.toLocaleString('en-IN')} (${c.totalOrders} orders, Stage: ${c.leadStage})`).join('\n')}
- Open Quotations:
${pendingQuotations.slice(0, 5).map(q => `  • Doc #${q.quotationNumber}: ₹${q.totalValue} (${q.customer?.businessName || 'Client'}) [Status: ${q.status}]`).join('\n')}
- Active Sales Team Members: ${employees.map(e => e.user?.name).filter(Boolean).join(', ')}

User Query: "${query}"

Respond strictly in JSON format with the following fields:
{
  "answer": "2-4 concise, professional sentences directly answering the query with relevant numbers in ₹ INR format and strategic takeaway.",
  "keyMetrics": [
    { "label": "Short Metric Name", "value": "₹X,XX,XXX or Count", "subtext": "Brief context", "positive": true }
  ],
  "suggestedActions": [
    { "label": "Action Button Label", "href": "/relevant-route" }
  ],
  "followUpQuestions": [
    "Question 1?",
    "Question 2?",
    "Question 3?"
  ]
}
Available routes for suggestedActions: /orders, /customers, /quotations, /accounting, /accounting/ageing, /products, /reports, /payroll
`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: businessContext,
          config: {
            responseMimeType: "application/json",
          }
        });

        const text = response.text || "{}";
        const parsed = JSON.parse(text);

        if (parsed.answer && Array.isArray(parsed.keyMetrics)) {
          return {
            success: true,
            data: {
              answer: parsed.answer,
              keyMetrics: parsed.keyMetrics,
              suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions : [{ label: "View Reports", href: "/reports" }],
              followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions : [
                "What is our quotation conversion rate this month?",
                "Which customers are overdue for repeat orders?",
                "How much dead stock is tied up in our warehouse?"
              ]
            }
          };
        }
      } catch (geminiError) {
        console.error("Gemini AI error in askERPAssistant, using algorithmic fallback:", geminiError);
      }
    }

    // High-quality Algorithmic Fallback
    const qLower = query.toLowerCase();
    let fallbackAnswer = `For ${companyName}, MTD Revenue is currently ₹${mtdRevenue.toLocaleString('en-IN')} across ${monthOrders.length} orders. You have ₹${pipelineQuotationsValue.toLocaleString('en-IN')} in active quotations and ₹${mtdOutstanding.toLocaleString('en-IN')} in pending receivables.`;
    let metrics: AskERPMetric[] = [
      { label: "MTD Revenue", value: `₹${mtdRevenue.toLocaleString('en-IN')}`, subtext: `${monthOrders.length} orders`, positive: true },
      { label: "Active Pipeline", value: `₹${pipelineQuotationsValue.toLocaleString('en-IN')}`, subtext: `${pendingQuotations.length} open quotes`, positive: true },
      { label: "Godown Valuation", value: `₹${Math.round(totalInventoryValue).toLocaleString('en-IN')}`, subtext: `${totalStockUnits} units`, positive: true }
    ];
    let actions: AskERPActionLink[] = [
      { label: "View Full Reports", href: "/reports" },
      { label: "Check Quotations", href: "/quotations" }
    ];

    if (qLower.includes("profit") || qLower.includes("customer") || qLower.includes("buyer")) {
      const topCust = allCustomers[0];
      fallbackAnswer = `Your top account is **${topCust?.businessName || 'Key Client'}** with ₹${topCust?.totalPurchaseValue.toLocaleString('en-IN')} in lifetime purchases across ${topCust?.totalOrders} orders. Total top 5 customers represent ₹${allCustomers.slice(0, 5).reduce((s, c) => s + c.totalPurchaseValue, 0).toLocaleString('en-IN')} in cumulative revenue.`;
      metrics = allCustomers.slice(0, 3).map(c => ({
        label: c.businessName,
        value: `₹${c.totalPurchaseValue.toLocaleString('en-IN')}`,
        subtext: `${c.totalOrders} orders`,
        positive: true
      }));
      actions = [{ label: "Manage Customers", href: "/customers" }, { label: "Re-Order Predictor", href: "/customers" }];
    } else if (qLower.includes("stock") || qLower.includes("inventory") || qLower.includes("dead")) {
      fallbackAnswer = `Total warehouse inventory comprises **${totalStockUnits} units** with a capital valuation of **₹${Math.round(totalInventoryValue).toLocaleString('en-IN')}**. Regular monitoring of stock aging helps maintain healthy cash flow.`;
      metrics = [
        { label: "Total Units in Stock", value: `${totalStockUnits} pcs`, subtext: "Across all articles", positive: true },
        { label: "Inventory Valuation", value: `₹${Math.round(totalInventoryValue).toLocaleString('en-IN')}`, subtext: "At purchase cost", positive: true }
      ];
      actions = [{ label: "Stock & Products", href: "/products" }, { label: "Wholesale Catalog", href: "/catalog" }];
    } else if (qLower.includes("receivable") || qLower.includes("gst") || qLower.includes("payment") || qLower.includes("cash")) {
      fallbackAnswer = `Current month cash collection stands at **₹${mtdReceived.toLocaleString('en-IN')}** with **₹${mtdOutstanding.toLocaleString('en-IN')}** pending in customer receivables.`;
      metrics = [
        { label: "Cash Collected MTD", value: `₹${mtdReceived.toLocaleString('en-IN')}`, subtext: "Settled payments", positive: true },
        { label: "Pending Receivables", value: `₹${mtdOutstanding.toLocaleString('en-IN')}`, subtext: "Outstanding balance", positive: false }
      ];
      actions = [{ label: "Receivables Aging", href: "/accounting/ageing" }, { label: "Invoices List", href: "/invoices" }];
    }

    return {
      success: true,
      data: {
        answer: fallbackAnswer,
        keyMetrics: metrics,
        suggestedActions: actions,
        followUpQuestions: [
          "Who are our top 5 most profitable customers?",
          "How much inventory capital is currently locked up?",
          "What is our pending receivables and cash flow position?"
        ]
      }
    };
  } catch (error: any) {
    console.error("Error in askERPAssistant:", error);
    return { success: false, error: error.message || "Failed to process query" };
  }
}
