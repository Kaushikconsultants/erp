"use server";

import { prisma } from "@/lib/prisma";
import { getTenantOrgId } from "@/lib/tenant";
import { askSmartAIJSON } from "@/lib/aiClient";
import { SYSTEM_GUIDE_ARTICLES, type GuideArticle, type GuideStep, type GuideSearchResult } from "@/lib/erpGuideData";

export type { GuideArticle, GuideStep, GuideSearchResult } from "@/lib/erpGuideData";

export async function getSystemGuideArticles(): Promise<GuideArticle[]> {
  return SYSTEM_GUIDE_ARTICLES;
}


/**
 * Searches the ERP Knowledge Base and features, with Smart AI fallback for complex inquiries
 */
export async function searchErpGuide(
  query: string,
  preferredProvider?: "gemini" | "openai"
): Promise<GuideSearchResult> {
  try {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        success: true,
        matches: SYSTEM_GUIDE_ARTICLES.map(a => ({ title: a.title, targetRoute: a.targetRoute, summary: a.summary })),
      };
    }

    // Check if query targets a specific ERP functional module
    const hasSpecificModuleTerm =
      q.includes("quotation") ||
      q.includes("quote") ||
      q.includes("estimate") ||
      q.includes("कोटेशन") ||
      q.includes("invoice") ||
      q.includes("bill") ||
      q.includes("billing") ||
      q.includes("बिल") ||
      q.includes("customer") ||
      q.includes("party") ||
      q.includes("buyer") ||
      q.includes("client") ||
      q.includes("ग्राहक") ||
      q.includes("product") ||
      q.includes("article") ||
      q.includes("item") ||
      q.includes("सामान") ||
      q.includes("आइटम") ||
      q.includes("transfer") ||
      q.includes("godown") ||
      q.includes("warehouse") ||
      q.includes("गोदाम") ||
      q.includes("bank") ||
      q.includes("reconcil") ||
      q.includes("statement") ||
      q.includes("बैंक") ||
      q.includes("attendance") ||
      q.includes("punch") ||
      q.includes("payroll") ||
      q.includes("salary") ||
      q.includes("हाजिरी") ||
      q.includes("numbering") ||
      q.includes("prefix") ||
      q.includes("sequence") ||
      q.includes("password") ||
      q.includes("pass") ||
      q.includes("पासवर्ड") ||
      q.includes("lead") ||
      q.includes("लीड") ||
      q.includes("expense") ||
      q.includes("खर्चा") ||
      q.includes("खर्च");

    // Immediate Priority: General software guide / overview queries (only when not targeting a specific module)
    const isOverviewQuery =
      q === "guide" ||
      q === "help" ||
      q === "guide me" ||
      q === "software guide" ||
      q === "erp guide" ||
      q === "guide full software" ||
      q === "guide the software" ||
      q === "how to use" ||
      q === "how to use software" ||
      q === "how to operate" ||
      q === "full software guide" ||
      q === "failed to guide" ||
      q === "walkthrough" ||
      q === "tutorial" ||
      q === "गाइड" ||
      q === "सॉफ्टवेयर गाइड" ||
      q === "सॉफ्टवेयर कैसे चलाएं" ||
      q === "open" ||
      q === "kholo" ||
      q === "ओपन" ||
      q === "खोलो" ||
      q === "modules" ||
      q === "navigation" ||
      (q.includes("guide") && (q.includes("full") || q.includes("software") || q.includes("me") || q.includes("erp") || q.includes("all"))) ||
      (q.includes("गाइड") && (q.includes("पूरा") || q.includes("सॉफ्टवेयर")));

    if (isOverviewQuery && !hasSpecificModuleTerm) {
      const overview = SYSTEM_GUIDE_ARTICLES.find(a => a.id === "guide-full-software-overview") || SYSTEM_GUIDE_ARTICLES[0];
      return {
        success: true,
        article: overview,
        matches: SYSTEM_GUIDE_ARTICLES.slice(0, 4).map(s => ({ title: s.title, targetRoute: s.targetRoute, summary: s.summary })),
        provider: "system-knowledge-base"
      };
    }

    // 1. Fast Keyword Search against Built-in Knowledge Base with Relevance Scoring & Module Boosts
    const scoredArticles = SYSTEM_GUIDE_ARTICLES.map(article => {
      let score = 0;
      const titleLower = article.title.toLowerCase();
      const hindiTitle = (article.titleHindi || "").toLowerCase();

      // Exact title match or full query substring match
      if (titleLower.includes(q) || (hindiTitle && hindiTitle.includes(q))) score += 35;
      if (q.includes(titleLower)) score += 35;

      // Module-specific targeting boosts
      if (article.id === "guide-change-password" && (q.includes("password") || q.includes("pass") || q.includes("पासवर्ड") || q.includes("credential") || q.includes("sign out") || q.includes("device"))) {
        score += 80;
      } else if (article.id === "guide-leads-pipeline" && (q.includes("lead") || q.includes("pipeline") || q.includes("telecaller") || q.includes("लीड"))) {
        score += 70;
      } else if (article.id === "guide-expense-management" && (q.includes("expense") || q.includes("petty cash") || q.includes("खर्चा") || q.includes("खर्च"))) {
        score += 70;
      } else if (article.id === "guide-quotation-create" && (q.includes("quotation") || q.includes("quote") || q.includes("estimate") || q.includes("कोटेशन"))) {
        score += 60;
      } else if (article.id === "guide-invoice-create" && (q.includes("invoice") || q.includes("bill") || q.includes("बिल") || q.includes("gst bill"))) {
        score += 60;
      } else if (article.id === "guide-customer-create" && (q.includes("customer") || q.includes("party") || q.includes("buyer") || q.includes("client") || q.includes("ग्राहक"))) {
        score += 60;
      } else if (article.id === "guide-product-create" && (q.includes("product") || q.includes("article") || q.includes("item") || q.includes("सामान") || q.includes("आइटम"))) {
        score += 60;
      } else if (article.id === "guide-stock-transfer" && (q.includes("transfer") || q.includes("godown") || q.includes("warehouse") || q.includes("गोदाम"))) {
        score += 60;
      } else if (article.id === "guide-bank-reconciliation" && (q.includes("bank") || q.includes("reconcil") || q.includes("statement") || q.includes("बैंक"))) {
        score += 60;
      } else if (article.id === "guide-attendance-hrms" && (q.includes("attendance") || q.includes("punch") || q.includes("payroll") || q.includes("salary") || q.includes("हाजिरी"))) {
        score += 60;
      } else if (article.id === "guide-document-numbering" && (q.includes("numbering") || q.includes("prefix") || q.includes("sequence") || q.includes("format"))) {
        score += 60;
      }

      // If user specifically asked about a distinct module, demote the full software overview
      if (hasSpecificModuleTerm && article.id === "guide-full-software-overview") {
        score -= 50;
      }

      // Token matching with basic singular/plural stemming
      const tokens = q.split(/\s+/).filter(t => t.length > 2);
      for (const token of tokens) {
        const singularToken = token.endsWith("ies")
          ? token.slice(0, -3) + "y"
          : token.endsWith("es")
          ? token.slice(0, -2)
          : token.endsWith("s")
          ? token.slice(0, -1)
          : token;

        if (titleLower.includes(token) || titleLower.includes(singularToken)) score += 8;
        if (hindiTitle && (hindiTitle.includes(token) || hindiTitle.includes(singularToken))) score += 8;

        for (const kw of article.keywords) {
          const kwLower = kw.toLowerCase();
          if (kwLower === token || kwLower === singularToken) {
            score += 20;
          } else if (kwLower.includes(token) || token.includes(kwLower) || kwLower.includes(singularToken) || singularToken.includes(kwLower)) {
            score += 8;
          }
        }
        if (article.summary.toLowerCase().includes(token) || article.summary.toLowerCase().includes(singularToken)) {
          score += 2;
        }
      }

      return { article, score };
    }).filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scoredArticles.length > 0) {
      const best = scoredArticles[0].article;
      return {
        success: true,
        article: best,
        matches: scoredArticles.map(s => ({ title: s.article.title, targetRoute: s.article.targetRoute, summary: s.article.summary })),
        provider: "system-knowledge-base"
      };
    }

    // 2. Also search custom tenant-specific SOPs from database if organization exists
    try {
      const orgId = await getTenantOrgId();
      if (orgId) {
        const dbArticles = await prisma.erpKnowledgeArticle.findMany({
          where: {
            OR: [
              { organizationId: orgId },
              { organizationId: null }
            ],
            isPublished: true
          },
          take: 5
        });

        const dbMatch = dbArticles.find(a => 
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.keywords.some(k => q.includes(k.toLowerCase()))
        );

        if (dbMatch) {
          return {
            success: true,
            article: {
              id: dbMatch.id,
              moduleKey: dbMatch.moduleKey,
              title: dbMatch.title,
              titleHindi: dbMatch.titleHindi || undefined,
              summary: dbMatch.summary,
              steps: (dbMatch.steps as any[]) || [],
              targetRoute: dbMatch.targetRoute,
              keywords: dbMatch.keywords
            },
            matches: [{ title: dbMatch.title, targetRoute: dbMatch.targetRoute, summary: dbMatch.summary }],
            provider: "tenant-sop-database"
          };
        }
      }
    } catch {
      // Continue to AI inference if DB query fails or unauthenticated
    }

    // 3. Fallback to Smart AI Copilot Guide (Gemini / OpenAI)
    const prompt = `
You are an expert ERP Implementation Specialist & In-App Guide for a manufacturing/wholesale apparel ERP.
A user asked: "${query}"

Provide clear, friendly, step-by-step guidance in simple terms (mentioning both English and Hindi cues where helpful).
Available modules in this ERP:
- /quotations, /quotations/new (Quotations & Estimates)
- /orders, /orders/new (Invoices, Sales Orders, E-Way bills)
- /customers, /customers/new (Customer Directory, CRM, Telecalling)
- /products, /products/new (Products, Articles, Bill of Materials, Barcodes)
- /transfers, /transfers/new (Stock Transfers between warehouses)
- /accounting, /accounting/vouchers, /accounting/bank-reconciliation (Ledgers, Cash/Bank, Journal)
- /attendance, /payroll (Staff attendance, Biometric punch, Salary slips)
- /settings, /settings/numbering (Company settings, Document sequences)

Output strictly in valid JSON:
{
  "title": "Short title of the workflow",
  "summary": "1-2 sentence overview answering how to achieve this",
  "targetRoute": "/best-route",
  "steps": [
    { "stepNumber": 1, "instruction": "Clear English instruction", "instructionHindi": "आसान हिंदी निर्देश" },
    { "stepNumber": 2, "instruction": "Next step", "instructionHindi": "अगला कदम" },
    { "stepNumber": 3, "instruction": "Final action", "instructionHindi": "आखिरी कदम" }
  ],
  "suggestedActions": [
    { "label": "Button Label", "href": "/best-route" }
  ]
}
`;

    const aiRes = await askSmartAIJSON<any>(prompt, {
      systemPrompt: "You are an intelligent ERP Guide Assistant. Return valid JSON only.",
      temperature: 0.2,
      maxTokens: 1024,
      preferredProvider
    });

    if (aiRes.success && aiRes.data?.title && aiRes.data?.steps) {
      return {
        success: true,
        article: {
          id: `ai-guide-${Date.now()}`,
          moduleKey: "general",
          title: aiRes.data.title,
          summary: aiRes.data.summary || "Here is how to complete this workflow in your ERP.",
          targetRoute: aiRes.data.targetRoute || "/dashboard",
          keywords: [q],
          steps: Array.isArray(aiRes.data.steps) ? aiRes.data.steps : [],
          suggestedActions: Array.isArray(aiRes.data.suggestedActions) ? aiRes.data.suggestedActions : [{ label: "Open Screen", href: aiRes.data.targetRoute || "/dashboard" }]
        },
        matches: [{ title: aiRes.data.title, targetRoute: aiRes.data.targetRoute || "/dashboard", summary: aiRes.data.summary || "" }],
        provider: aiRes.provider
      };
    }

    // Default Fallback: Prompt user to use Learning Mode rather than returning an unrelated module
    return {
      success: true,
      article: {
        id: `unmatched-${Date.now()}`,
        moduleKey: "help",
        title: `Guidance for "${query}"`,
        titleHindi: `"${query}" के लिए निर्देश`,
        summary: `I couldn't find an exact pre-recorded guide for "${query}". You can easily train Heart on this command using Learning Mode, or explore the modules below.`,
        targetRoute: "/dashboard",
        keywords: [q],
        steps: [
          {
            stepNumber: 1,
            instruction: `To teach Heart what "${query}" means, open the '🎓 Learning Mode' tab above and add a custom shortcut.`,
            instructionHindi: `हार्ट (Heart) को "${query}" सिखाने के लिए ऊपर दिए गए '🎓 Learning Mode' टैब से नया नियम बनाएं।`
          },
          {
            stepNumber: 2,
            instruction: "You can also navigate directly to the relevant screen from the sidebar navigation.",
            instructionHindi: "आप बाईं ओर दिए गए साइडबार से भी सीधे किसी भी स्क्रीन पर जा सकते हैं।"
          }
        ],
        suggestedActions: [
          { label: "🎓 Open Learning Mode", href: "#learning-mode" },
          { label: "📊 Go to Dashboard", href: "/dashboard" },
          { label: "🔑 Password Settings", href: "/settings/roles" }
        ]
      },
      matches: SYSTEM_GUIDE_ARTICLES.slice(0, 4).map(a => ({ title: a.title, targetRoute: a.targetRoute, summary: a.summary })),
      provider: "unmatched-learning-prompt"
    };

  } catch (err: any) {
    console.error("searchErpGuide error:", err);
    return {
      success: true,
      article: SYSTEM_GUIDE_ARTICLES[0],
      matches: SYSTEM_GUIDE_ARTICLES.slice(0, 4).map(a => ({ title: a.title, targetRoute: a.targetRoute, summary: a.summary })),
      provider: "fallback-safe"
    };
  }
}
