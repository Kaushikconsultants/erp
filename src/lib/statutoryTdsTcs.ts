/**
 * Statutory TDS (Tax Deducted at Source) and TCS (Tax Collected at Source)
 * Reference: Indian Income Tax Act, 1961
 */

export interface TdsSectionConfig {
  code: string;
  name: string;
  section: string;
  standardRate: number; // percentage
  noPanRate: number;    // percentage if PAN not available
  thresholdLimit?: number; // e.g., 50,00,000 for 194Q
  description: string;
}

export interface TcsSectionConfig {
  code: string;
  name: string;
  section: string;
  standardRate: number;
  noPanRate: number;
  thresholdLimit?: number;
  description: string;
}

export const STATUTORY_TDS_SECTIONS: Record<string, TdsSectionConfig> = {
  "194Q": {
    code: "194Q",
    name: "TDS on Purchase of Goods (> ₹50L)",
    section: "194Q",
    standardRate: 0.1,
    noPanRate: 5.0,
    thresholdLimit: 5000000,
    description: "Buyer turnover > ₹10 Cr purchasing goods exceeding ₹50 Lakhs in FY"
  },
  "194C_IND": {
    code: "194C_IND",
    name: "194C - Contractor / Job Work (Individual / HUF)",
    section: "194C",
    standardRate: 1.0,
    noPanRate: 20.0,
    description: "Payments to individual or HUF contractors / job workers"
  },
  "194C_OTH": {
    code: "194C_OTH",
    name: "194C - Contractor / Job Work (Company / Firm)",
    section: "194C",
    standardRate: 2.0,
    noPanRate: 20.0,
    description: "Payments to companies, LLPs, or partnership firms for contract work"
  },
  "194J_TECH": {
    code: "194J_TECH",
    name: "194J - Technical Services / Software",
    section: "194J",
    standardRate: 2.0,
    noPanRate: 20.0,
    description: "Fees for technical services or software development"
  },
  "194J_PROF": {
    code: "194J_PROF",
    name: "194J - Professional Fees",
    section: "194J",
    standardRate: 10.0,
    noPanRate: 20.0,
    description: "Legal, CA, medical, or architectural professional services"
  },
  "194H": {
    code: "194H",
    name: "194H - Commission or Brokerage",
    section: "194H",
    standardRate: 5.0,
    noPanRate: 20.0,
    description: "Commission or brokerage exceeding ₹15,000 in FY"
  },
  "194I_PLANT": {
    code: "194I_PLANT",
    name: "194I - Rent of Plant, Machinery or Equipment",
    section: "194I",
    standardRate: 2.0,
    noPanRate: 20.0,
    description: "Rental charges for plant, equipment or machinery"
  },
  "194I_BLDG": {
    code: "194I_BLDG",
    name: "194I - Rent of Land or Building",
    section: "194I",
    standardRate: 10.0,
    noPanRate: 20.0,
    description: "Rental charges for office, factory, or warehouse premises"
  }
};

export const STATUTORY_TCS_SECTIONS: Record<string, TcsSectionConfig> = {
  "206C_1H": {
    code: "206C_1H",
    name: "206C(1H) - Sale of Goods (> ₹50L)",
    section: "206C(1H)",
    standardRate: 0.1,
    noPanRate: 1.0,
    thresholdLimit: 5000000,
    description: "Seller turnover > ₹10 Cr collecting on receipts exceeding ₹50 Lakhs in FY"
  },
  "206C_1F": {
    code: "206C_1F",
    name: "206C(1F) - Sale of Motor Vehicle (> ₹10L)",
    section: "206C(1F)",
    standardRate: 1.0,
    noPanRate: 1.0,
    description: "Sale of any motor vehicle of value exceeding ₹10 Lakhs"
  }
};

/**
 * Calculate TDS amount and net payable for a purchase bill
 */
export function calculateTds(
  taxableAmount: number,
  sectionCode: string,
  hasPan: boolean = true
): {
  section: string;
  rate: number;
  tdsAmount: number;
  netPayable: number;
} {
  const config = STATUTORY_TDS_SECTIONS[sectionCode];
  if (!config) {
    return {
      section: "",
      rate: 0,
      tdsAmount: 0,
      netPayable: taxableAmount
    };
  }

  const rate = hasPan ? config.standardRate : config.noPanRate;
  const tdsAmount = Math.round(((taxableAmount * rate) / 100) * 100) / 100;
  const netPayable = Math.max(0, taxableAmount - tdsAmount);

  return {
    section: config.section,
    rate,
    tdsAmount,
    netPayable
  };
}

/**
 * Calculate TCS amount and gross receivable for a sales invoice
 */
export function calculateTcs(
  grossInvoiceAmount: number,
  sectionCode: string,
  hasPan: boolean = true
): {
  section: string;
  rate: number;
  tcsAmount: number;
  grossReceivable: number;
} {
  const config = STATUTORY_TCS_SECTIONS[sectionCode];
  if (!config) {
    return {
      section: "",
      rate: 0,
      tcsAmount: 0,
      grossReceivable: grossInvoiceAmount
    };
  }

  const rate = hasPan ? config.standardRate : config.noPanRate;
  const tcsAmount = Math.round(((grossInvoiceAmount * rate) / 100) * 100) / 100;
  const grossReceivable = grossInvoiceAmount + tcsAmount;

  return {
    section: config.section,
    rate,
    tcsAmount,
    grossReceivable
  };
}
