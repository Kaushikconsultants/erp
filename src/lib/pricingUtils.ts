/**
 * Tiered Pricing Utility for Wholesale & Garment CRM
 * Calculates customer-specific unit prices, tiered discount percentages, and labels.
 */

export interface CustomerPricingProfile {
  customerType?: string | null;
  regularDiscount?: string | null;
  businessCategory?: string | null;
}

export interface ProductPriceTier {
  sellingPrice: number;
  purchasePrice?: number;
  mrp?: number;
}

export function getCustomerTierDiscount(customer?: CustomerPricingProfile | null): {
  discountPercent: number;
  tierName: string;
  badgeColor: string;
  badgeBg: string;
} {
  if (!customer) {
    return { discountPercent: 0, tierName: 'Standard', badgeColor: '#64748b', badgeBg: '#f1f5f9' };
  }

  // 1. If explicit regular discount is configured for this customer (e.g. "12%", "10")
  if (customer.regularDiscount) {
    const parsed = parseFloat(customer.regularDiscount.replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed) && parsed > 0) {
      return {
        discountPercent: parsed,
        tierName: `Special Account (${parsed}%)`,
        badgeColor: '#7c3aed',
        badgeBg: '#f5f3ff'
      };
    }
  }

  // 2. Derive from Customer Type / Business Tier
  const type = (customer.customerType || '').toLowerCase().trim();

  if (type.includes('distributor') || type.includes('super stockist') || type.includes('stockist')) {
    return {
      discountPercent: 15,
      tierName: 'Distributor Tier (15% Off)',
      badgeColor: '#2563eb',
      badgeBg: '#eff6ff'
    };
  }

  if (type.includes('wholesal') || type.includes('wholesale')) {
    return {
      discountPercent: 10,
      tierName: 'Wholesale Tier (10% Off)',
      badgeColor: '#059669',
      badgeBg: '#ecfdf5'
    };
  }

  if (type.includes('semi') || type.includes('dealer') || type.includes('sub-wholesaler')) {
    return {
      discountPercent: 5,
      tierName: 'Dealer / Semi-Wholesale (5% Off)',
      badgeColor: '#d97706',
      badgeBg: '#fffbeb'
    };
  }

  if (type.includes('retail') || type.includes('shop') || type.includes('buyer')) {
    return {
      discountPercent: 0,
      tierName: 'Retailer (Standard Rate)',
      badgeColor: '#475569',
      badgeBg: '#f8fafc'
    };
  }

  // Default Standard
  return {
    discountPercent: 0,
    tierName: customer.customerType || 'Standard Rate',
    badgeColor: '#64748b',
    badgeBg: '#f1f5f9'
  };
}

/**
 * Calculates effective unit rate after customer tier discount
 */
export function calculateTieredRate(basePrice: number, discountPercent: number): number {
  if (!discountPercent || discountPercent <= 0) return basePrice;
  const discounted = basePrice * (1 - discountPercent / 100);
  return Math.round(discounted * 100) / 100;
}
