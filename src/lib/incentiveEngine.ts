// ─────────────────────────────────────────────────────────────────────────────
// Universal Multi-Industry Incentive Policy Engine
//
// Supports 4 Distinct Compensation Models + Hybrid Combinations:
//   1. Revenue / Turnover Slabs (Standard & Custom Slabs with Zero-Discount Bonus)
//   2. New Customer Acquisition Bounties (Per-client bonus, % first order, tier bonus)
//   3. Volume / Quantity Tier Slabs (Per-unit / carton / case cash rewards)
//   4. Profit Margin / Gross Margin Split (Margin sharing based on profitability)
// ─────────────────────────────────────────────────────────────────────────────

export interface OrderData {
  id: string;
  taxableValue: number;
  discount: number;        // percentage, e.g., 10 for 10%
  isCreditCustomer?: boolean;
  isNewCustomerOrder?: boolean;
  quantity?: number;
  costPrice?: number;
}

export interface SlabTier {
  id?: string;
  from: number;
  to: number;
  rate: number;           // e.g. 0.0175 for 1.75% or flat unit amount
  label: string;
}

export interface NewCustomerRule {
  enabled: boolean;
  rewardType: "FLAT_PER_CLIENT" | "PERCENTAGE_FIRST_ORDER" | "TIERED_COUNT";
  flatAmountPerCustomer: number; // e.g. ₹500 - ₹2,000 per client
  firstOrderPercentBonus: number; // e.g. 3% - 5% on 1st order
  milestoneBonus: number; // e.g. ₹5,000 extra when reaching >= milestoneCount
  milestoneCount: number; // e.g. 10 new clients in a month
  tiers: { from: number; to: number; rewardPerClient: number; label: string }[];
}

export interface QuantityVolumeRule {
  enabled: boolean;
  unitLabel: string; // e.g. "Pieces", "Boxes", "Cases", "Metres", "Units", "KG", "Tonnes"
  rewardType: "PER_UNIT_CASH" | "PERCENTAGE_TURNOVER";
  tiers: { from: number; to: number; rewardPerUnit: number; label: string }[];
}

export interface ProfitMarginRule {
  enabled: boolean;
  tiers: { minMarginPercent: number; profitSharePercent: number; label: string }[];
}

export interface IncentivePolicyConfig {
  policyName: string;
  industry: string;
  activeModelType: "REVENUE_SLAB" | "NEW_CUSTOMER" | "QUANTITY_VOLUME" | "MARGIN_SPLIT" | "HYBRID_CUSTOM";
  
  // Model A: Revenue / Turnover Slabs (Existing standard + customizable)
  revenueSlabsEnabled: boolean;
  zeroDiscountBonusPercent: number; // default 2%
  highDiscountThresholdPercent: number; // default 15%
  highDiscountRatePercent: number; // default 1%
  slabs: SlabTier[];
  
  // Model B: New Customer Acquisition Bounties
  newCustomerRule: NewCustomerRule;
  
  // Model C: Volume / Quantity Based Slabs
  quantityRule: QuantityVolumeRule;
  
  // Model D: Profit Margin / Gross Profit Sharing
  marginRule: ProfitMarginRule;
}

export interface IncentiveResult {
  totalIncentive: number;
  slabIncentive: number;          // incentive from the slab rate on eligible sales
  bonusIncentive: number;         // additional 2% for 0-discount orders
  flatIncentive: number;          // flat 1% for >15% discount / credit
  newCustomerIncentive: number;   // incentive earned from new customer acquisition
  quantityIncentive: number;      // incentive earned from volume / quantity tiers
  marginIncentive: number;        // incentive earned from profit margin share
  eligibleSales: number;          // total monthly sales used for slab lookup
  flatSales: number;              // sales excluded from slab (credit / >15% disc)
  zeroDiscountSales: number;      // eligible sales where discount was exactly 0%
  totalQuantity: number;
  newCustomersAcquired: number;
  slabRate: number;               // the slab % that applied (e.g. 1.75)
  currentSlab: string;            // human label e.g. "1.75%"
  nextSlabAt: number | null;      // amount still needed to reach next slab
  nextSlabPercent: number | null;
  targetAchievementPercentage: number;
  appliedModelSummary: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Standard Default Slabs (The Original 5-Tier Apparel Wholesale Structure)
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_STANDARD_SLABS: SlabTier[] = [
  { from: 0,      to: 250000,   rate: 0.01,   label: "Up to ₹2.49 Lakh (1%)" },
  { from: 250000, to: 500000,   rate: 0.0175, label: "₹2.5 - 4.99 Lakh (1.75%)" },
  { from: 500000, to: 700000,   rate: 0.025,  label: "₹5 - 6.99 Lakh (2.5%)" },
  { from: 700000, to: 900000,   rate: 0.035,  label: "₹7 - 8.99 Lakh (3.5%)" },
  { from: 900000, to: Infinity, rate: 0.05,   label: "Above ₹9 Lakh (5%)" },
];

export const DEFAULT_INCENTIVE_POLICY: IncentivePolicyConfig = {
  policyName: "Standard Wholesale Sales Incentive",
  industry: "APPAREL_TEXTILE",
  activeModelType: "REVENUE_SLAB",
  revenueSlabsEnabled: true,
  zeroDiscountBonusPercent: 2.0,
  highDiscountThresholdPercent: 15.0,
  highDiscountRatePercent: 1.0,
  slabs: DEFAULT_STANDARD_SLABS,
  newCustomerRule: {
    enabled: false,
    rewardType: "FLAT_PER_CLIENT",
    flatAmountPerCustomer: 500,
    firstOrderPercentBonus: 2.0,
    milestoneBonus: 5000,
    milestoneCount: 10,
    tiers: [
      { from: 1, to: 5, rewardPerClient: 500, label: "1 - 5 New Clients: ₹500 / client" },
      { from: 6, to: 12, rewardPerClient: 1000, label: "6 - 12 New Clients: ₹1,000 / client" },
      { from: 13, to: Infinity, rewardPerClient: 2000, label: "13+ New Clients: ₹2,000 / client" }
    ]
  },
  quantityRule: {
    enabled: false,
    unitLabel: "Pieces",
    rewardType: "PER_UNIT_CASH",
    tiers: [
      { from: 0, to: 500, rewardPerUnit: 5, label: "0 - 500 Pieces: ₹5 / pc" },
      { from: 501, to: 1500, rewardPerUnit: 10, label: "501 - 1,500 Pieces: ₹10 / pc" },
      { from: 1501, to: 5000, rewardPerUnit: 18, label: "1,501 - 5,000 Pieces: ₹18 / pc" },
      { from: 5001, to: Infinity, rewardPerUnit: 25, label: "5,000+ Pieces: ₹25 / pc" }
    ]
  },
  marginRule: {
    enabled: false,
    tiers: [
      { minMarginPercent: 15, profitSharePercent: 3, label: ">15% Margin: 3% of profit" },
      { minMarginPercent: 25, profitSharePercent: 6, label: ">25% Margin: 6% of profit" },
      { minMarginPercent: 35, profitSharePercent: 10, label: ">35% Margin: 10% of profit" }
    ]
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Industry Presets (One-Click Industry Templates)
// ─────────────────────────────────────────────────────────────────────────────
export interface IndustryPreset {
  id: string;
  name: string;
  industry: string;
  categoryTag: string;
  iconName: string;
  description: string;
  highlightBenefit: string;
  policy: IncentivePolicyConfig;
}

export const INDUSTRY_INCENTIVE_PRESETS: IndustryPreset[] = [
  {
    id: "apparel_textile_standard",
    name: "Apparel & Textile Wholesale (Espon Standard)",
    industry: "APPAREL_TEXTILE",
    categoryTag: "Turnover Slabs + Margin Protection",
    iconName: "ShoppingBag",
    description: "Original proven 5-tier turnover ladder with 2% zero-discount order bonus and 1% credit/high-discount penalty.",
    highlightBenefit: "Protects gross margins while driving volume above ₹9 Lakh monthly.",
    policy: {
      ...DEFAULT_INCENTIVE_POLICY,
      policyName: "Apparel & Textile Wholesale Standard",
      industry: "APPAREL_TEXTILE",
      activeModelType: "REVENUE_SLAB"
    }
  },
  {
    id: "b2b_saas_agency",
    name: "B2B SaaS, Agency & Tech Services",
    industry: "SAAS_TECH",
    categoryTag: "Client Acquisition + MRR Quota",
    iconName: "Laptop",
    description: "Aggressive new customer onboarding bounties (₹1,500/client + 5% on first contract) paired with deal value slabs.",
    highlightBenefit: "Maximizes new client acquisition rate and high-ticket retainer closures.",
    policy: {
      policyName: "B2B SaaS & Tech Agency Accelerator",
      industry: "SAAS_TECH",
      activeModelType: "HYBRID_CUSTOM",
      revenueSlabsEnabled: true,
      zeroDiscountBonusPercent: 3.0,
      highDiscountThresholdPercent: 10.0,
      highDiscountRatePercent: 1.5,
      slabs: [
        { from: 0, to: 300000, rate: 0.02, label: "Up to ₹3 Lakh (2%)" },
        { from: 300000, to: 700000, rate: 0.04, label: "₹3 - 7 Lakh (4%)" },
        { from: 700000, to: 1500000, rate: 0.06, label: "₹7 - 15 Lakh (6%)" },
        { from: 1500000, to: Infinity, rate: 0.08, label: "Above ₹15 Lakh (8%)" }
      ],
      newCustomerRule: {
        enabled: true,
        rewardType: "TIERED_COUNT",
        flatAmountPerCustomer: 1500,
        firstOrderPercentBonus: 5.0,
        milestoneBonus: 10000,
        milestoneCount: 8,
        tiers: [
          { from: 1, to: 3, rewardPerClient: 1500, label: "1 - 3 New Accounts: ₹1,500 / client" },
          { from: 4, to: 7, rewardPerClient: 2500, label: "4 - 7 New Accounts: ₹2,500 / client" },
          { from: 8, to: Infinity, rewardPerClient: 4000, label: "8+ New Accounts: ₹4,000 / client + ₹10,000 Bonus" }
        ]
      },
      quantityRule: {
        enabled: false,
        unitLabel: "Accounts",
        rewardType: "PER_UNIT_CASH",
        tiers: []
      },
      marginRule: {
        enabled: false,
        tiers: []
      }
    }
  },
  {
    id: "fmcg_manufacturing",
    name: "Manufacturing, FMCG & Industrial Distribution",
    industry: "FMCG_MANUFACTURING",
    categoryTag: "Volume / Unit Tiers + Dispatch Push",
    iconName: "Boxes",
    description: "Per-carton/box volume tiers rewarding large shipment dispatch volumes, plus baseline turnover incentive.",
    highlightBenefit: "Clears factory production inventory with tiered piece/carton payouts.",
    policy: {
      policyName: "FMCG & Manufacturing Volume Engine",
      industry: "FMCG_MANUFACTURING",
      activeModelType: "QUANTITY_VOLUME",
      revenueSlabsEnabled: true,
      zeroDiscountBonusPercent: 1.0,
      highDiscountThresholdPercent: 15.0,
      highDiscountRatePercent: 0.5,
      slabs: [
        { from: 0, to: 500000, rate: 0.0075, label: "Up to ₹5 Lakh (0.75%)" },
        { from: 500000, to: 1200000, rate: 0.0125, label: "₹5 - 12 Lakh (1.25%)" },
        { from: 1200000, to: Infinity, rate: 0.02, label: "Above ₹12 Lakh (2%)" }
      ],
      newCustomerRule: {
        enabled: true,
        rewardType: "FLAT_PER_CLIENT",
        flatAmountPerCustomer: 750,
        firstOrderPercentBonus: 1.0,
        milestoneBonus: 3000,
        milestoneCount: 10,
        tiers: [
          { from: 1, to: 5, rewardPerClient: 750, label: "1 - 5 Distributors: ₹750 / distributor" },
          { from: 6, to: Infinity, rewardPerClient: 1500, label: "6+ Distributors: ₹1,500 / distributor" }
        ]
      },
      quantityRule: {
        enabled: true,
        unitLabel: "Boxes / Cartons",
        rewardType: "PER_UNIT_CASH",
        tiers: [
          { from: 0, to: 300, rewardPerUnit: 10, label: "0 - 300 Cartons: ₹10 / carton" },
          { from: 301, to: 800, rewardPerUnit: 18, label: "301 - 800 Cartons: ₹18 / carton" },
          { from: 801, to: 2000, rewardPerUnit: 28, label: "801 - 2,000 Cartons: ₹28 / carton" },
          { from: 2001, to: Infinity, rewardPerUnit: 40, label: "2,000+ Cartons: ₹40 / carton" }
        ]
      },
      marginRule: {
        enabled: false,
        tiers: []
      }
    }
  },
  {
    id: "pharma_healthcare",
    name: "Pharma, Chemist & Healthcare Distribution",
    industry: "PHARMA_HEALTHCARE",
    categoryTag: "Chemist Onboarding + Target Slabs",
    iconName: "Stethoscope",
    description: "Turnover slabs combined with dedicated Chemist/Hospital onboarding bounties and zero-return order bonuses.",
    highlightBenefit: "Expands chemist network coverage while maintaining prompt payment discipline.",
    policy: {
      policyName: "Pharma Network Expansion Policy",
      industry: "PHARMA_HEALTHCARE",
      activeModelType: "HYBRID_CUSTOM",
      revenueSlabsEnabled: true,
      zeroDiscountBonusPercent: 2.0,
      highDiscountThresholdPercent: 12.0,
      highDiscountRatePercent: 1.0,
      slabs: [
        { from: 0, to: 300000, rate: 0.015, label: "Up to ₹3 Lakh (1.5%)" },
        { from: 300000, to: 800000, rate: 0.025, label: "₹3 - 8 Lakh (2.5%)" },
        { from: 800000, to: Infinity, rate: 0.04, label: "Above ₹8 Lakh (4%)" }
      ],
      newCustomerRule: {
        enabled: true,
        rewardType: "FLAT_PER_CLIENT",
        flatAmountPerCustomer: 1000,
        firstOrderPercentBonus: 3.0,
        milestoneBonus: 5000,
        milestoneCount: 15,
        tiers: [
          { from: 1, to: 10, rewardPerClient: 1000, label: "1 - 10 Chemists: ₹1,000 / chemist" },
          { from: 11, to: Infinity, rewardPerClient: 2000, label: "11+ Chemists: ₹2,000 / chemist" }
        ]
      },
      quantityRule: {
        enabled: false,
        unitLabel: "Packs",
        rewardType: "PER_UNIT_CASH",
        tiers: []
      },
      marginRule: {
        enabled: false,
        tiers: []
      }
    }
  },
  {
    id: "electronics_trading",
    name: "Electronics, Hardware & Commodity Trading",
    industry: "TRADING_COMMODITIES",
    categoryTag: "Gross Profit Margin Sharing",
    iconName: "TrendingUp",
    description: "Incentive tied directly to gross profit margin percentages, preventing sales reps from offering deep discount leaks.",
    highlightBenefit: "Maximizes bottom-line profit by rewarding high-margin deals.",
    policy: {
      policyName: "Gross Profit Margin Split Policy",
      industry: "TRADING_COMMODITIES",
      activeModelType: "MARGIN_SPLIT",
      revenueSlabsEnabled: true,
      zeroDiscountBonusPercent: 2.0,
      highDiscountThresholdPercent: 15.0,
      highDiscountRatePercent: 0.5,
      slabs: [
        { from: 0, to: 500000, rate: 0.01, label: "Base: Up to ₹5 Lakh (1%)" },
        { from: 500000, to: Infinity, rate: 0.02, label: "Base: Above ₹5 Lakh (2%)" }
      ],
      newCustomerRule: {
        enabled: true,
        rewardType: "FLAT_PER_CLIENT",
        flatAmountPerCustomer: 1000,
        firstOrderPercentBonus: 2.0,
        milestoneBonus: 4000,
        milestoneCount: 5,
        tiers: []
      },
      quantityRule: {
        enabled: false,
        unitLabel: "Units",
        rewardType: "PER_UNIT_CASH",
        tiers: []
      },
      marginRule: {
        enabled: true,
        tiers: [
          { minMarginPercent: 12, profitSharePercent: 3, label: ">12% Margin: 3% of Gross Profit" },
          { minMarginPercent: 20, profitSharePercent: 6, label: ">20% Margin: 6% of Gross Profit" },
          { minMarginPercent: 30, profitSharePercent: 10, label: ">30% Margin: 10% of Gross Profit" }
        ]
      }
    }
  }
];

// Helper to find highest applicable revenue slab
function getSlabForAmount(amount: number, slabs: SlabTier[]) {
  const sorted = [...slabs].sort((a, b) => a.from - b.from);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (amount >= sorted[i].from) return sorted[i];
  }
  return sorted[0] || { from: 0, to: Infinity, rate: 0.01, label: "1%" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Universal Calculation Function (Supports Existing Calls & Multi-Model Policies)
// ─────────────────────────────────────────────────────────────────────────────
export function calculateIncentives(
  orders: OrderData[],
  targetGoal: number = 500000,
  customPolicy?: Partial<IncentivePolicyConfig>,
  contextData?: {
    newCustomerCount?: number;
    totalUnitsSold?: number;
    estimatedGrossProfit?: number;
  }
): IncentiveResult {
  const policy: IncentivePolicyConfig = {
    ...DEFAULT_INCENTIVE_POLICY,
    ...(customPolicy || {})
  };

  const appliedModelSummary: string[] = [];

  // ── Step 1: Segregate orders ─────────────────────────────────────────────
  let eligibleSales = 0;
  let flatSales = 0;
  let zeroDiscountSales = 0;
  let flatIncentive = 0;
  let calculatedUnits = 0;
  let calculatedNewCustomers = 0;
  let firstOrderSalesTotal = 0;
  let totalGrossProfit = 0;

  const highDiscThreshold = policy.highDiscountThresholdPercent ?? 15;
  const highDiscRate = (policy.highDiscountRatePercent ?? 1) / 100;
  const zeroDiscBonusRate = (policy.zeroDiscountBonusPercent ?? 2) / 100;

  for (const order of orders) {
    calculatedUnits += order.quantity || 1;

    if (order.isNewCustomerOrder) {
      calculatedNewCustomers++;
      firstOrderSalesTotal += order.taxableValue;
    }

    if (order.costPrice && order.taxableValue > order.costPrice) {
      totalGrossProfit += (order.taxableValue - order.costPrice);
    }

    if (order.discount > highDiscThreshold || order.isCreditCustomer) {
      flatSales += order.taxableValue;
      flatIncentive += order.taxableValue * highDiscRate;
    } else {
      eligibleSales += order.taxableValue;
      if (order.discount === 0) {
        zeroDiscountSales += order.taxableValue;
      }
    }
  }

  // Allow contextData overrides for monthly summary metrics
  const finalNewCustomers = contextData?.newCustomerCount !== undefined
    ? contextData.newCustomerCount
    : calculatedNewCustomers;

  const finalUnits = contextData?.totalUnitsSold !== undefined
    ? contextData.totalUnitsSold
    : calculatedUnits;

  const finalGrossProfit = contextData?.estimatedGrossProfit !== undefined
    ? contextData.estimatedGrossProfit
    : totalGrossProfit;

  // ── Step 2: Revenue / Turnover Slab Calculations ─────────────────────────
  let slabIncentive = 0;
  let slab = getSlabForAmount(eligibleSales, policy.slabs || DEFAULT_STANDARD_SLABS);

  if (policy.revenueSlabsEnabled) {
    slabIncentive = eligibleSales * slab.rate;
    appliedModelSummary.push(`Turnover Slab (${slab.label}): ₹${Math.round(slabIncentive).toLocaleString("en-IN")}`);
  }

  // ── Step 3: Zero-Discount Bonus ──────────────────────────────────────────
  let bonusIncentive = 0;
  if (zeroDiscountSales > 0 && zeroDiscBonusRate > 0) {
    bonusIncentive = zeroDiscountSales * zeroDiscBonusRate;
    appliedModelSummary.push(`0% Discount Bonus (${(zeroDiscBonusRate * 100).toFixed(1)}%): ₹${Math.round(bonusIncentive).toLocaleString("en-IN")}`);
  }

  if (flatIncentive > 0) {
    appliedModelSummary.push(`Credit / Discount > ${highDiscThreshold}% Flat (${(highDiscRate * 100).toFixed(1)}%): ₹${Math.round(flatIncentive).toLocaleString("en-IN")}`);
  }

  // ── Step 4: Model B - New Customer Acquisition Bounty ────────────────────
  let newCustomerIncentive = 0;
  const ncRule = policy.newCustomerRule;

  if (ncRule?.enabled && finalNewCustomers > 0) {
    if (ncRule.rewardType === "FLAT_PER_CLIENT") {
      newCustomerIncentive = finalNewCustomers * (ncRule.flatAmountPerCustomer || 0);
    } else if (ncRule.rewardType === "PERCENTAGE_FIRST_ORDER") {
      newCustomerIncentive = (firstOrderSalesTotal * (ncRule.firstOrderPercentBonus || 0)) / 100;
    } else if (ncRule.rewardType === "TIERED_COUNT" && ncRule.tiers?.length) {
      // Find matching tier
      const matchTier = ncRule.tiers.find(t => finalNewCustomers >= t.from && finalNewCustomers <= t.to);
      const perClientRate = matchTier ? matchTier.rewardPerClient : (ncRule.flatAmountPerCustomer || 500);
      newCustomerIncentive = finalNewCustomers * perClientRate;
    }

    // Milestone bonus
    if (ncRule.milestoneBonus > 0 && finalNewCustomers >= (ncRule.milestoneCount || 10)) {
      newCustomerIncentive += ncRule.milestoneBonus;
    }

    appliedModelSummary.push(`New Client Acquisition (${finalNewCustomers} clients): ₹${Math.round(newCustomerIncentive).toLocaleString("en-IN")}`);
  }

  // ── Step 5: Model C - Quantity / Volume Based Slabs ──────────────────────
  let quantityIncentive = 0;
  const qRule = policy.quantityRule;

  if (qRule?.enabled && finalUnits > 0 && qRule.tiers?.length) {
    const sortedTiers = [...qRule.tiers].sort((a, b) => a.from - b.from);
    let matchedTier = sortedTiers[0];

    for (let i = sortedTiers.length - 1; i >= 0; i--) {
      if (finalUnits >= sortedTiers[i].from) {
        matchedTier = sortedTiers[i];
        break;
      }
    }

    if (matchedTier) {
      if (qRule.rewardType === "PER_UNIT_CASH") {
        quantityIncentive = finalUnits * matchedTier.rewardPerUnit;
      } else {
        quantityIncentive = (eligibleSales * matchedTier.rewardPerUnit) / 100;
      }
      appliedModelSummary.push(`Volume Slabs (${finalUnits.toLocaleString("en-IN")} ${qRule.unitLabel || "Units"}): ₹${Math.round(quantityIncentive).toLocaleString("en-IN")}`);
    }
  }

  // ── Step 6: Model D - Profit Margin Sharing ──────────────────────────────
  let marginIncentive = 0;
  const mRule = policy.marginRule;

  if (mRule?.enabled && finalGrossProfit > 0 && eligibleSales > 0 && mRule.tiers?.length) {
    const overallMarginPct = (finalGrossProfit / eligibleSales) * 100;
    const sortedMarginTiers = [...mRule.tiers].sort((a, b) => b.minMarginPercent - a.minMarginPercent);
    const matchedMarginTier = sortedMarginTiers.find(t => overallMarginPct >= t.minMarginPercent);

    if (matchedMarginTier) {
      marginIncentive = (finalGrossProfit * matchedMarginTier.profitSharePercent) / 100;
      appliedModelSummary.push(`Profit Margin Share (${overallMarginPct.toFixed(1)}% Margin @ ${matchedMarginTier.profitSharePercent}% Share): ₹${Math.round(marginIncentive).toLocaleString("en-IN")}`);
    }
  }

  // ── Step 7: Totals & Next-Slab Guidance ───────────────────────────────────
  const sortedSlabs = [...(policy.slabs || DEFAULT_STANDARD_SLABS)].sort((a, b) => a.from - b.from);
  const currentSlabIndex = sortedSlabs.findIndex(s => s.from === slab.from && s.rate === slab.rate);
  const nextSlab = currentSlabIndex >= 0 && currentSlabIndex < sortedSlabs.length - 1
    ? sortedSlabs[currentSlabIndex + 1]
    : null;
  const nextSlabAt = nextSlab ? Math.max(0, nextSlab.from - eligibleSales) : null;
  const nextSlabPercent = nextSlab ? nextSlab.rate * 100 : null;

  const targetAchievementPercentage = Math.min(
    100,
    Math.round((eligibleSales / (targetGoal || 1)) * 100)
  );

  const totalIncentive = slabIncentive + bonusIncentive + flatIncentive + newCustomerIncentive + quantityIncentive + marginIncentive;

  return {
    totalIncentive,
    slabIncentive,
    bonusIncentive,
    flatIncentive,
    newCustomerIncentive,
    quantityIncentive,
    marginIncentive,
    eligibleSales,
    flatSales,
    zeroDiscountSales,
    totalQuantity: finalUnits,
    newCustomersAcquired: finalNewCustomers,
    slabRate: parseFloat((slab.rate * 100).toFixed(2)),
    currentSlab: slab.label,
    nextSlabAt,
    nextSlabPercent,
    targetAchievementPercentage,
    appliedModelSummary
  };
}
