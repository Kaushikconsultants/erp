"use server";

import { prisma } from "@/lib/prisma";
import { getTenantOrgId } from "@/lib/tenant";
import { getTenantAIClient } from "@/lib/gemini";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCanonicalSalesMetrics, sanitizeVoiceOutputText } from "@/lib/voiceEngine";
import { getSalesTargetLeaderboard } from "@/app/actions/salesTargetActions";

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
  provider?: string;
}

export async function askERPAssistant(
  query: string,
  preferredProvider?: "gemini" | "openai"
): Promise<{
  success: boolean;
  data?: AskERPResponse;
  provider?: string;
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
      employees,
      canonicalSales,
      leaderboardRes
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
      }),
      organizationId ? getCanonicalSalesMetrics(organizationId).catch(() => null) : null,
      organizationId ? getSalesTargetLeaderboard(organizationId).catch(() => null) : null
    ]);

    const companyName = companySettings?.companyName || "ESPON CLOTHING";
    const mtdRevenue = canonicalSales?.mtdRevenue ?? monthOrders.reduce((sum, o) => sum + (o.subtotal || o.totalValue || 0), 0);
    const totalRevenue = canonicalSales?.totalRevenue ?? mtdRevenue;
    const todayRevenue = canonicalSales?.todayRevenue ?? 0;
    const mtdReceived = monthOrders.reduce((sum, o) => sum + (o.paymentReceived || 0), 0);
    const mtdOutstanding = monthOrders.reduce((sum, o) => sum + (o.outstandingAmount || 0), 0);

    const totalStockUnits = products.reduce((sum, p) => sum + (p.stockQuantity || 0), 0);
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.stockQuantity * (p.purchasePrice || (p.sellingPrice * 0.65))), 0);

    const pipelineQuotationsValue = pendingQuotations.reduce((sum, q) => sum + (q.totalValue || 0), 0);

    const topPerformer = leaderboardRes?.leaderboard?.[0];
    const topPerformerText = topPerformer
      ? `${topPerformer.name} (₹${topPerformer.achievedSales.toLocaleString('en-IN')}, ${topPerformer.percentAchieved}% of ₹${topPerformer.monthlyTarget.toLocaleString('en-IN')} target, ${topPerformer.dealsWonCount} deals won, status: ${topPerformer.status})`
      : "No sales rep targets recorded for this month";

    // Call Gemini AI using tenant-configured client
    const { ai, isConfigured, model } = await getTenantAIClient(organizationId);
    if (isConfigured) {
      try {
        const businessContext = `
You are the Chief Financial Officer & Executive AI Business Copilot for "${companyName}".
Answer the owner's question concisely, accurately, and strategically based on the live ERP data below:

--- LIVE BUSINESS METRICS SNAPSHOT ---
- Total Sales (All-Time Revenue): ₹${totalRevenue.toLocaleString('en-IN')} across ${canonicalSales?.totalOrdersCount ?? monthOrders.length} orders/confirmed deals (matches Admin Dashboard)
- Current Month (MTD) Revenue: ₹${mtdRevenue.toLocaleString('en-IN')} across ${canonicalSales?.mtdOrdersCount ?? monthOrders.length} orders
- Today's Sales: ₹${todayRevenue.toLocaleString('en-IN')}
- Top Performer Till Month: ${topPerformerText}
- Team Sales Targets Progress: ₹${(leaderboardRes?.totalAchieved || 0).toLocaleString('en-IN')} / ₹${(leaderboardRes?.totalTarget || 0).toLocaleString('en-IN')} (${leaderboardRes?.teamPercent || 0}% achieved)
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

Respond strictly in JSON format without markdown fences:
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
Available routes for suggestedActions: /orders, /customers, /quotations, /accounting, /accounting/ageing, /products, /reports, /payroll, /sales-targets, /analytics
`;

        const response = await ai.models.generateContent({
          model: model || "gemini-2.5-flash",
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
            provider: "gemini",
            data: {
              answer: sanitizeVoiceOutputText ? sanitizeVoiceOutputText(parsed.answer) : parsed.answer,
              provider: "gemini",
              keyMetrics: parsed.keyMetrics,
              suggestedActions: Array.isArray(parsed.suggestedActions) && parsed.suggestedActions.length > 0
                ? parsed.suggestedActions
                : [{ label: "View Reports", href: "/reports" }],
              followUpQuestions: Array.isArray(parsed.followUpQuestions) && parsed.followUpQuestions.length > 0
                ? parsed.followUpQuestions
                : [
                  "Who is our top performer till month?",
                  "What is our total sale?",
                  "What is our pending receivables position?"
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
    let fallbackAnswer = `For ${companyName}, all-time total sales stand at ₹${totalRevenue.toLocaleString('en-IN')}, and MTD Revenue is currently ₹${mtdRevenue.toLocaleString('en-IN')} across ${canonicalSales?.mtdOrdersCount ?? monthOrders.length} orders. You have ₹${pipelineQuotationsValue.toLocaleString('en-IN')} in active quotations and ₹${mtdOutstanding.toLocaleString('en-IN')} in pending receivables.`;
    let metrics: AskERPMetric[] = [
      { label: "Total Sales", value: `₹${totalRevenue.toLocaleString('en-IN')}`, subtext: "All-time revenue", positive: true },
      { label: "MTD Revenue", value: `₹${mtdRevenue.toLocaleString('en-IN')}`, subtext: `${canonicalSales?.mtdOrdersCount ?? monthOrders.length} orders`, positive: true },
      { label: "Today's Sales", value: `₹${todayRevenue.toLocaleString('en-IN')}`, subtext: "Today's bookings", positive: todayRevenue > 0 }
    ];
    let actions: AskERPActionLink[] = [
      { label: "View Sales Orders", href: "/orders" },
      { label: "Sales Analytics", href: "/analytics" }
    ];

    if (
      qLower.includes("top performer") ||
      qLower.includes("performer") ||
      qLower.includes("leaderboard") ||
      qLower.includes("target") ||
      (qLower.includes("agent") && (qLower.includes("detail") || qLower.includes("sale") || qLower.includes("month") || qLower.includes("best")))
    ) {
      if (topPerformer) {
        fallbackAnswer = `Our #1 sales performer for this month is **${topPerformer.name}** with **₹${topPerformer.achievedSales.toLocaleString('en-IN')}** in sales (${topPerformer.percentAchieved}% of ₹${topPerformer.monthlyTarget.toLocaleString('en-IN')} target) across ${topPerformer.dealsWonCount} won deals. Overall team target achievement is ${leaderboardRes?.teamPercent || 0}%.`;
        metrics = [
          { label: "Top Performer", value: topPerformer.name, subtext: `${topPerformer.designation || "Sales Rep"}`, positive: true },
          { label: "Achieved Sales", value: `₹${topPerformer.achievedSales.toLocaleString('en-IN')}`, subtext: `${topPerformer.percentAchieved}% of target`, positive: true },
          { label: "Deals Won", value: `${topPerformer.dealsWonCount} deals`, subtext: `Team achieved: ${leaderboardRes?.teamPercent || 0}%`, positive: true }
        ];
        actions = [
          { label: "🏆 View Sales Leaderboard", href: "/sales-targets" },
          { label: "Sales Team Orders", href: "/orders" }
        ];
      } else {
        fallbackAnswer = `Sales performance tracking is active, but no individual sales targets or agent deals have been logged for this month yet.`;
        metrics = [
          { label: "Team Achieved", value: `₹0`, subtext: "0% of target" },
          { label: "Active Reps", value: `${employees.length} reps`, subtext: "Team registered", positive: true }
        ];
        actions = [{ label: "Set Sales Targets", href: "/sales-targets" }];
      }
    } else if (
      qLower.includes("total sale") ||
      qLower.includes("total sales") ||
      qLower.includes("all sale") ||
      qLower.includes("gross sale") ||
      (qLower.includes("sale") && (qLower.includes("figure") || qLower.includes("fegure") || qLower.includes("number")))
    ) {
      fallbackAnswer = `Our all-time total sales stand at **₹${totalRevenue.toLocaleString('en-IN')}** across ${canonicalSales?.totalOrdersCount ?? monthOrders.length} orders and confirmed deals. Month-to-date (MTD) revenue is **₹${mtdRevenue.toLocaleString('en-IN')}**, and today's sales are **₹${todayRevenue.toLocaleString('en-IN')}**.`;
      metrics = [
        { label: "Total Sales (All Time)", value: `₹${totalRevenue.toLocaleString('en-IN')}`, subtext: `${canonicalSales?.totalOrdersCount ?? monthOrders.length} orders & quotes`, positive: true },
        { label: "This Month (MTD)", value: `₹${mtdRevenue.toLocaleString('en-IN')}`, subtext: `${canonicalSales?.mtdOrdersCount ?? monthOrders.length} orders`, positive: true },
        { label: "Today's Sales", value: `₹${todayRevenue.toLocaleString('en-IN')}`, subtext: "Today's bookings", positive: todayRevenue > 0 }
      ];
      actions = [
        { label: "Sales Orders", href: "/orders" },
        { label: "Sales Analytics", href: "/analytics" },
        { label: "Sales Targets", href: "/sales-targets" }
      ];
    } else if (qLower.includes("profit") || qLower.includes("customer") || qLower.includes("buyer")) {
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
          "Who is our top performer till month?",
          "What is our total sale?",
          "How much inventory capital is currently locked up?"
        ]
      }
    };
  } catch (error: any) {
    console.error("Error in askERPAssistant:", error);
    return { success: false, error: error.message || "Failed to process query" };
  }
}
