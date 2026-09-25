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
    annualPrice: 9499,
    maxUsers: 3,
    maxBranches: 1,
    maxWarehouses: 1,
    monthlyOrderLimit: 500,
    whatsAppCredits: 500,
    features: ["Up to 3 Users", "1 Branch", "500 Orders / mo", "Basic CRM & Invoicing", "Smart Notifications", "GST Reports"]
  },
  GROWTH: {
    name: "Growth Plan",
    monthlyPrice: 2499,
    quarterlyPrice: 6749,
    annualPrice: 23988,
    maxUsers: 10,
    maxBranches: 3,
    maxWarehouses: 2,
    monthlyOrderLimit: 2000,
    whatsAppCredits: 2500,
    features: ["Up to 10 Users", "3 Branches & 2 Warehouses", "2,000 Orders / mo", "Full CRM & Purchase Ledger", "Live GST Portal Filing (1/3B/2B)", "AI Copilot & Smart Insights"]
  },
  ENTERPRISE: {
    name: "Enterprise Plan",
    monthlyPrice: 5999,
    quarterlyPrice: 16199,
    annualPrice: 57499,
    maxUsers: 999,
    maxBranches: 99,
    maxWarehouses: 99,
    monthlyOrderLimit: 999999,
    whatsAppCredits: 10000,
    features: ["Unlimited Users", "Unlimited Branches & Multi-Warehouse", "Unlimited Orders", "Automated E-Way Bill Generation", "Dedicated AI Business Assistant", "Priority Support & API Access"]
  }
};

export interface AddonSeatPricing {
  monthlyPrice: number;
  annualPrice: number;
}

export const ADDON_SEAT_PRICING: Record<'STARTER' | 'GROWTH' | 'ENTERPRISE', AddonSeatPricing> = {
  STARTER: {
    monthlyPrice: 299,
    annualPrice: 2990, // ~17% off (2 months free)
  },
  GROWTH: {
    monthlyPrice: 249,
    annualPrice: 2490, // ~17% off (2 months free)
  },
  ENTERPRISE: {
    monthlyPrice: 199,
    annualPrice: 1990,
  }
};

export function getAddonSeatPrice(planKey?: string | null, billingCycle: string = 'MONTHLY') {
  const validPlan = (planKey && planKey in ADDON_SEAT_PRICING ? planKey : 'GROWTH') as keyof typeof ADDON_SEAT_PRICING;
  const tier = ADDON_SEAT_PRICING[validPlan];
  const isAnnual = billingCycle?.toUpperCase() === 'ANNUALLY';
  const isQuarterly = billingCycle?.toUpperCase() === 'QUARTERLY';

  if (isAnnual) {
    return {
      plan: validPlan,
      unitPrice: tier.annualPrice,
      period: '/ seat / year',
      cycle: 'ANNUALLY' as const,
      monthlyEquivalent: Math.round(tier.annualPrice / 12),
      discountBadge: 'Save 17% (2 Months Free)'
    };
  }

  if (isQuarterly) {
    const quarterlyPrice = Math.round(tier.monthlyPrice * 3 * 0.9); // 10% off quarterly
    return {
      plan: validPlan,
      unitPrice: quarterlyPrice,
      period: '/ seat / quarter',
      cycle: 'QUARTERLY' as const,
      monthlyEquivalent: Math.round(quarterlyPrice / 3),
      discountBadge: 'Save 10%'
    };
  }

  return {
    plan: validPlan,
    unitPrice: tier.monthlyPrice,
    period: '/ seat / month',
    cycle: 'MONTHLY' as const,
    monthlyEquivalent: tier.monthlyPrice,
    discountBadge: null
  };
}
