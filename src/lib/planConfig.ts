export interface PlanTier {
  name: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  annualPrice: number;
  maxUsers: number;
  maxBranches: number;
  maxWarehouses: number;
  monthlyOrderLimit: number;
  whatsAppCredits: number;
  features: string[];
}

export const PLAN_PRICING: Record<'STARTER' | 'GROWTH' | 'ENTERPRISE', PlanTier> = {
  STARTER: {
    name: "Starter Plan",
    monthlyPrice: 999,
    quarterlyPrice: 2699,
    annualPrice: 9599,
    maxUsers: 3,
    maxBranches: 1,
    maxWarehouses: 1,
    monthlyOrderLimit: 500,
    whatsAppCredits: 500,
    features: ["Up to 3 Users", "1 Branch", "500 Orders / mo", "Basic CRM & Invoicing", "500 WhatsApp Msgs", "GST Reports"]
  },
  GROWTH: {
    name: "Growth Plan",
    monthlyPrice: 2499,
    quarterlyPrice: 6749,
    annualPrice: 23999,
    maxUsers: 10,
    maxBranches: 3,
    maxWarehouses: 2,
    monthlyOrderLimit: 2000,
    whatsAppCredits: 2500,
    features: ["Up to 10 Users", "3 Branches & 2 Warehouses", "2,000 Orders / mo", "Full CRM & Purchase Ledger", "Live GST Portal Filing (1/3B/2B)", "2,500 WhatsApp Msgs & AI"]
  },
  ENTERPRISE: {
    name: "Enterprise Plan",
    monthlyPrice: 5999,
    quarterlyPrice: 16199,
    annualPrice: 57599,
    maxUsers: 999,
    maxBranches: 99,
    maxWarehouses: 99,
    monthlyOrderLimit: 999999,
    whatsAppCredits: 10000,
    features: ["Unlimited Users", "Unlimited Branches & Multi-Warehouse", "Unlimited Orders", "Automated E-Way Bill Generation", "Dedicated WhatsApp AI Bot", "Priority Support & API Access"]
  }
};
