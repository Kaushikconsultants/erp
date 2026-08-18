// ─────────────────────────────────────────────────────────────────────────────
// Incentive Engine
//
// HOW THE SLAB WORKS (per the company incentive rules):
//   1. Sum ALL eligible orders (discount 0–15%, non-credit) for the month → eligibleSales
//   2. Determine which slab band eligibleSales falls into → apply that SINGLE % to the entire eligibleSales
//   3. For every order placed at 0% discount, give an additional 2% bonus on that order's taxable value
//   4. For orders with discount > 15% OR credit customers → flat 1% on taxable value
//
// Standard Slab Rates (apply to TOTAL monthly eligible sales):
//   ≤ ₹2,49,999          → 1%
//   ₹2,50,000 – 4,99,999 → 1.75%
//   ₹5,00,000 – 6,99,999 → 2.5%
//   ₹7,00,000 – 8,99,999 → 3.5%
//   ≥ ₹9,00,000          → 5%
// ─────────────────────────────────────────────────────────────────────────────

export interface OrderData {
  id: string;
  taxableValue: number;
  discount: number;        // percentage, e.g., 10 for 10%
  isCreditCustomer?: boolean;
}

export interface IncentiveResult {
  totalIncentive: number;
  slabIncentive: number;          // incentive from the slab rate on eligible sales
  bonusIncentive: number;         // additional 2% for 0-discount orders
  flatIncentive: number;          // flat 1% for >15% discount / credit
  eligibleSales: number;          // total monthly sales used for slab lookup
  flatSales: number;              // sales excluded from slab (credit / >15% disc)
  zeroDiscountSales: number;      // eligible sales where discount was exactly 0%
  slabRate: number;               // the slab % that applied (e.g. 1.75)
  currentSlab: string;            // human label e.g. "1.75%"
  nextSlabAt: number | null;      // amount still needed to reach next slab
  nextSlabPercent: number | null;
  targetAchievementPercentage: number;
}

// Slab table — threshold is the MINIMUM eligible monthly sales to enter this band
const SLABS: { from: number; to: number; rate: number; label: string }[] = [
  { from: 0,      to: 250000,   rate: 0.01,   label: "1%"    },
  { from: 250000, to: 500000,   rate: 0.0175, label: "1.75%" },
  { from: 500000, to: 700000,   rate: 0.025,  label: "2.5%"  },
  { from: 700000, to: 900000,   rate: 0.035,  label: "3.5%"  },
  { from: 900000, to: Infinity, rate: 0.05,   label: "5%"    },
];

function getSlabForAmount(amount: number) {
  // Find the highest slab whose "from" is <= amount
  for (let i = SLABS.length - 1; i >= 0; i--) {
    if (amount >= SLABS[i].from) return SLABS[i];
  }
  return SLABS[0];
}

export function calculateIncentives(
  orders: OrderData[],
  targetGoal: number = 500000
): IncentiveResult {

  // ── Step 1: Segregate orders ─────────────────────────────────────────────
  let eligibleSales = 0;
  let flatSales = 0;
  let zeroDiscountSales = 0;
  let flatIncentive = 0;

  for (const order of orders) {
    if (order.discount > 15 || order.isCreditCustomer) {
      // Credit customers / high-discount orders → flat 1%
      flatSales += order.taxableValue;
      flatIncentive += order.taxableValue * 0.01;
    } else {
      // Standard eligible order → accumulate into monthly total for slab lookup
      eligibleSales += order.taxableValue;
      if (order.discount === 0) {
        zeroDiscountSales += order.taxableValue;
      }
    }
  }

  // ── Step 2: Apply a SINGLE slab rate to the TOTAL monthly eligible sales ──
  // (Not marginal — the entire eligible amount is multiplied by the slab rate)
  const slab = getSlabForAmount(eligibleSales);
  const slabIncentive = eligibleSales * slab.rate;

  // ── Step 3: Additional 2% bonus on zero-discount order values ─────────────
  const bonusIncentive = zeroDiscountSales * 0.02;

  // ── Step 4: Next-slab guidance ───────────────────────────────────────────
  const currentSlabIndex = SLABS.findIndex(s => s === slab);
  const nextSlab = currentSlabIndex < SLABS.length - 1 ? SLABS[currentSlabIndex + 1] : null;
  const nextSlabAt = nextSlab ? Math.max(0, nextSlab.from - eligibleSales) : null;
  const nextSlabPercent = nextSlab ? nextSlab.rate * 100 : null;

  const targetAchievementPercentage = Math.min(
    100,
    Math.round((eligibleSales / (targetGoal || 1)) * 100)
  );

  return {
    totalIncentive: slabIncentive + bonusIncentive + flatIncentive,
    slabIncentive,
    bonusIncentive,
    flatIncentive,
    eligibleSales,
    flatSales,
    zeroDiscountSales,
    slabRate: parseFloat((slab.rate * 100).toFixed(2)),
    currentSlab: slab.label,
    nextSlabAt,
    nextSlabPercent,
    targetAchievementPercentage,
  };
}
