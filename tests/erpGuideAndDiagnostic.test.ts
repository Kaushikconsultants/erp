import { describe, it, expect, vi } from "vitest";
import { searchErpGuide } from "@/app/actions/erpGuideActions";
import { SYSTEM_GUIDE_ARTICLES } from "@/lib/erpGuideData";
import { diagnoseErpIssue } from "@/app/actions/erpDiagnosticActions";
import { executeVoiceCommand } from "@/app/actions/voiceActions";

vi.mock("@/lib/aiClient", () => ({
  askSmartAIJSON: vi.fn().mockResolvedValue({
    success: true,
    provider: "mock-ai",
    data: {
      diagnosis: "GST rates are determined by the HSN code mapped to each item.",
      diagnosisHindi: "जीएसटी दर हर आइटम के HSN कोड के अनुसार लागू होती है।",
      rootCause: "Tax slab configuration under Settings > GST.",
      solutionSteps: [
        "1. Open Settings > GST to view active tax rates.",
        "2. Ensure products have valid 4 to 8 digit HSN codes."
      ],
      suggestedRoute: "/settings/gst"
    }
  })
}));

vi.mock("@/lib/tenant", () => ({
  getTenantOrgId: vi.fn().mockResolvedValue("test-org-1"),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findFirst: vi.fn().mockResolvedValue({ id: "test-org-1" }),
    },
    order: {
      findFirst: vi.fn().mockResolvedValue({
        id: "ord-1",
        orderNumber: "INV-2024-001",
        paymentReceived: 5000,
        status: "Completed",
        deliveryChallans: [{ id: "dc-1", challanNumber: "DC-101" }],
        customer: { businessName: "Apex Garments" }
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    customer: {
      findFirst: vi.fn().mockResolvedValue({
        id: "cust-1",
        businessName: "Preet Garments",
        _count: { orders: 3, quotations: 2 }
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    product: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    deliveryChallan: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    erpKnowledgeArticle: {
      findMany: vi.fn().mockResolvedValue([]),
    }
  }
}));

describe("ERP Guide & Software Walkthrough Engine", () => {
  it("has built-in system guide articles for key ERP modules", () => {
    expect(SYSTEM_GUIDE_ARTICLES.length).toBeGreaterThanOrEqual(8);
    const quotationGuide = SYSTEM_GUIDE_ARTICLES.find(a => a.moduleKey === "quotations");
    expect(quotationGuide).toBeDefined();
    expect(quotationGuide?.targetRoute).toBe("/quotations/new");
    expect(quotationGuide?.steps.length).toBeGreaterThanOrEqual(3);
  });

  it("finds complete master software guide for 'guide full software'", async () => {
    const res = await searchErpGuide("guide full software");
    expect(res.success).toBe(true);
    expect(res.article?.moduleKey).toBe("overview");
    expect(res.article?.title).toContain("Complete ERP Software Guide");
    expect(res.article?.steps.length).toBeGreaterThanOrEqual(5);
  });

  it("finds master guide safely for 'failed to guide'", async () => {
    const res = await searchErpGuide("failed to guide");
    expect(res.success).toBe(true);
    expect(res.article).toBeDefined();
    expect(res.article?.moduleKey).toBe("overview");
  });

  it("finds customer creation guide for 'how to add customer'", async () => {
    const res = await searchErpGuide("how to add customer");
    expect(res.success).toBe(true);
    expect(res.article?.moduleKey).toBe("customers");
    expect(res.article?.targetRoute).toBe("/customers/new");
  });

  it("finds product creation guide for 'how to add product'", async () => {
    const res = await searchErpGuide("how to add product");
    expect(res.success).toBe(true);
    expect(res.article?.moduleKey).toBe("products");
    expect(res.article?.targetRoute).toBe("/products/new");
  });

  it("finds guide article by keyword 'quotation'", async () => {
    const res = await searchErpGuide("quotation");
    expect(res.success).toBe(true);
    expect(res.article?.moduleKey).toBe("quotations");
    expect(res.article?.targetRoute).toBe("/quotations/new");
  });

  it("finds guide article for 'how to make quotation'", async () => {
    const res = await searchErpGuide("how to make quotation");
    expect(res.success).toBe(true);
    expect(res.article?.moduleKey).toBe("quotations");
    expect(res.article?.id).toBe("guide-quotation-create");
  });

  it("finds guide article in Hindi ('कोटेशन कैसे बनाएं')", async () => {
    const res = await searchErpGuide("कोटेशन कैसे बनाएं");
    expect(res.success).toBe(true);
    expect(res.article?.moduleKey).toBe("quotations");
    expect(res.article?.id).toBe("guide-quotation-create");
  });

  it("finds stock transfer guide by keyword 'transfer'", async () => {
    const res = await searchErpGuide("transfer stock");
    expect(res.success).toBe(true);
    expect(res.article?.moduleKey).toBe("transfers");
    expect(res.article?.targetRoute).toBe("/transfers/new");
  });

  it("finds bank reconciliation guide by keyword 'bank'", async () => {
    const res = await searchErpGuide("bank statement reconcile");
    expect(res.success).toBe(true);
    expect(res.article?.moduleKey).toBe("accounting");
    expect(res.article?.targetRoute).toBe("/accounting/bank-reconciliation");
  });

  it("finds numbering format settings guide by keyword 'numbering'", async () => {
    const res = await searchErpGuide("bill numbering sequence");
    expect(res.success).toBe(true);
    expect(res.article?.moduleKey).toBe("settings");
    expect(res.article?.targetRoute).toBe("/settings/numbering");
  });

  it("handles voice guide commands via executeVoiceCommand('guide full software')", async () => {
    const res = await executeVoiceCommand("guide full software");
    expect(res.success).toBe(true);
    expect(res.cardType).toBe("GUIDE");
    expect(res.cardData?.steps).toBeDefined();
    expect(res.cardData.steps.length).toBeGreaterThanOrEqual(4);
    expect(res.spokenText).toContain("ERP");
  });

  it("tests executeVoiceCommand for quotation inquiries across variations", async () => {
    const queries = [
      "how to make quotation",
      "how to make a quotation",
      "how to make quotations",
      "how do I make quotation",
      "how to create quotation",
      "quotation kaise banaye",
      "how to make quote",
      "tell me how to make quotation",
      "how can I make quotation"
    ];

    for (const q of queries) {
      const res = await executeVoiceCommand(q);
      expect(res.cardType).toBe("GUIDE");
      expect(res.cardData?.title).toBe("How to Create a New Quotation / Estimate");
      expect(res.cardData?.steps?.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("handles voice guide commands in Hindi ('सॉफ्टवेयर गाइड')", async () => {
    const res = await executeVoiceCommand("सॉफ्टवेयर गाइड");
    expect(res.success).toBe(true);
    expect(res.cardType).toBe("GUIDE");
    expect(res.spokenText).toBeDefined();
  });
});

describe("ERP Diagnostic & Self-Service Support Engine", () => {
  it("diagnoses locked invoice when user asks why it cannot be deleted", async () => {
    const res = await diagnoseErpIssue({
      issueQuery: "Why cannot I delete invoice INV-2024-001?",
      documentType: "INVOICE",
      documentNumberOrId: "INV-2024-001"
    });

    expect(res.success).toBe(true);
    expect(res.issueCategory).toBe("DOCUMENT_LOCK");
    expect(res.status).toBe("IDENTIFIED");
    expect(res.diagnosis).toContain("cannot be directly deleted");
    expect(res.canEscalateToTicket).toBe(true);
  });

  it("diagnoses customer deletion block when transactions exist", async () => {
    const res = await diagnoseErpIssue({
      issueQuery: "Why cannot I delete customer Preet Garments?",
      documentType: "CUSTOMER",
      documentNumberOrId: "Preet Garments"
    });

    expect(res.success).toBe(true);
    expect(res.issueCategory).toBe("DOCUMENT_LOCK");
    expect(res.status).toBe("IDENTIFIED");
    expect(res.diagnosis).toContain("cannot be deleted");
    expect(res.solutionSteps.some(s => s.includes("Inactive"))).toBe(true);
  });

  it("handles general support inquiries with calm AI diagnosis and structured steps", async () => {
    const res = await diagnoseErpIssue({
      issueQuery: "How do I ensure GST rates are correct?"
    });

    expect(res.success).toBe(true);
    expect(res.solutionSteps.length).toBeGreaterThanOrEqual(1);
    expect(res.canEscalateToTicket).toBe(true);
  });
});
