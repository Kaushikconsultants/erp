export interface ItemGstBreakdown {
  taxableAmount: number;
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxTotal: number;
  totalAmount: number;
}

export function calculateItemGst(
  rate: number,
  quantity: number,
  gstRate: number = 12,
  isInterstate: boolean = false
): ItemGstBreakdown {
  const taxableAmount = rate * quantity;
  
  if (isInterstate) {
    const igstAmount = (taxableAmount * gstRate) / 100;
    return {
      taxableAmount,
      gstRate,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: gstRate,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount,
      taxTotal: igstAmount,
      totalAmount: taxableAmount + igstAmount
    };
  } else {
    const halfRate = gstRate / 2;
    const cgstAmount = (taxableAmount * halfRate) / 100;
    const sgstAmount = (taxableAmount * halfRate) / 100;
    return {
      taxableAmount,
      gstRate,
      cgstRate: halfRate,
      sgstRate: halfRate,
      igstRate: 0,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
      taxTotal: cgstAmount + sgstAmount,
      totalAmount: taxableAmount + cgstAmount + sgstAmount
    };
  }
}

export interface HsnSummaryRow {
  hsnCode: string;
  taxableValue: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
}

export function generateHsnSummary(
  items: Array<{
    hsnCode?: string | null;
    rate: number;
    quantity: number;
    gstRate?: number | null;
  }>,
  isInterstate: boolean = false
): HsnSummaryRow[] {
  const map = new Map<string, HsnSummaryRow>();

  items.forEach(item => {
    const hsn = item.hsnCode || "6109";
    const gstRate = item.gstRate || 12;
    const key = `${hsn}-${gstRate}`;

    const breakdown = calculateItemGst(item.rate, item.quantity, gstRate, isInterstate);

    if (map.has(key)) {
      const existing = map.get(key)!;
      existing.taxableValue += breakdown.taxableAmount;
      existing.cgstAmount += breakdown.cgstAmount;
      existing.sgstAmount += breakdown.sgstAmount;
      existing.igstAmount += breakdown.igstAmount;
      existing.totalTax += breakdown.taxTotal;
    } else {
      map.set(key, {
        hsnCode: hsn,
        taxableValue: breakdown.taxableAmount,
        gstRate,
        cgstAmount: breakdown.cgstAmount,
        sgstAmount: breakdown.sgstAmount,
        igstAmount: breakdown.igstAmount,
        totalTax: breakdown.taxTotal
      });
    }
  });

  return Array.from(map.values());
}

export function numberToWordsINR(amount: number): string {
  const safeAmount = Number(amount);
  if (isNaN(safeAmount) || safeAmount === 0) return "Indian Rupee Zero Only";

  const isNegative = safeAmount < 0;
  const num = Math.abs(Math.floor(safeAmount));
  if (num === 0) return "Indian Rupee Zero Only";

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + inWords(n % 10000000) : "");
  }

  return `${isNegative ? 'Minus ' : ''}Indian Rupee ${inWords(num)} Only`;
}
