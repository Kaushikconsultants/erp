"use server";

export interface TdsSection {
  code: string;
  section: string;
  description: string;
  defaultRate: number;
  thresholdLimit: number;
  isTcs?: boolean;
}

export const INDIAN_TDS_TCS_SECTIONS: TdsSection[] = [
  {
    code: "194C_INDV",
    section: "Section 194C",
    description: "Payment to Contractors / Sub-contractors (Individual / HUF)",
    defaultRate: 1.0,
    thresholdLimit: 100000
  },
  {
    code: "194C_CORP",
    section: "Section 194C",
    description: "Payment to Contractors / Sub-contractors (Company / Firm)",
    defaultRate: 2.0,
    thresholdLimit: 100000
  },
  {
    code: "194J_TECH",
    section: "Section 194J",
    description: "Fees for Technical Services (FTS) / Royalty",
    defaultRate: 2.0,
    thresholdLimit: 30000
  },
  {
    code: "194J_PROF",
    section: "Section 194J",
    description: "Fees for Professional Services (CA, Legal, Medical, Architecture)",
    defaultRate: 10.0,
    thresholdLimit: 30000
  },
  {
    code: "194I_RENT_PLANT",
    section: "Section 194I",
    description: "Rent on Plant & Machinery / Equipment",
    defaultRate: 2.0,
    thresholdLimit: 240000
  },
  {
    code: "194I_RENT_BLDG",
    section: "Section 194I",
    description: "Rent on Land, Building or Furniture",
    defaultRate: 10.0,
    thresholdLimit: 240000
  },
  {
    code: "194Q_PURCHASE",
    section: "Section 194Q",
    description: "TDS on Purchase of Goods exceeding ₹50 Lakhs in a Financial Year",
    defaultRate: 0.1,
    thresholdLimit: 5000000
  },
  {
    code: "206C_TCS_SALES",
    section: "Section 206C(1H)",
    description: "TCS on Sale of Goods exceeding ₹50 Lakhs in a Financial Year",
    defaultRate: 0.1,
    thresholdLimit: 5000000,
    isTcs: true
  }
];

export async function calculateTdsAmount(data: {
  sectionCode: string;
  taxableAmount: number;
  cumulativePartyTotal?: number;
  customRate?: number;
}) {
  const section = INDIAN_TDS_TCS_SECTIONS.find(s => s.code === data.sectionCode);
  if (!section) return { success: false, error: "Invalid TDS section code" };

  const rate = data.customRate !== undefined ? data.customRate : section.defaultRate;
  const cumulative = (data.cumulativePartyTotal || 0) + data.taxableAmount;

  let isThresholdExceeded = cumulative >= section.thresholdLimit;
  let eligibleAmount = data.taxableAmount;

  // For Section 194Q and 206C(1H), tax is only on the amount exceeding 50 Lakhs
  if (section.thresholdLimit >= 5000000) {
    if (cumulative > section.thresholdLimit) {
      eligibleAmount = Math.min(data.taxableAmount, cumulative - section.thresholdLimit);
    } else {
      eligibleAmount = 0;
    }
  }

  const taxAmount = Number(((eligibleAmount * rate) / 100).toFixed(2));

  return {
    success: true,
    section: section.section,
    description: section.description,
    rate,
    taxableAmount: data.taxableAmount,
    eligibleAmount,
    taxAmount,
    isTcs: section.isTcs || false,
    netPayableOrReceivable: section.isTcs ? data.taxableAmount + taxAmount : data.taxableAmount - taxAmount
  };
}

export async function getTdsSections() {
  return { success: true, sections: INDIAN_TDS_TCS_SECTIONS };
}
