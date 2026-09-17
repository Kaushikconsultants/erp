"use server";

import { prisma } from "@/lib/prisma";
import { getTenantOrgId } from "@/lib/tenant";

export interface DebtorRecoveryItem {
  customerId: string;
  customerName: string;
  contactPerson?: string;
  mobile: string;
  city?: string;
  state?: string;
  totalPending: number;
  oldestInvoiceDate: string;
  daysOverdue: number;
  unpaidInvoiceCount: number;
  invoices: Array<{
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
    amountPaid: number;
    amountDue: number;
    daysOld: number;
  }>;
  healthScore: number;
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  suggestedAction: string;
  whatsappDrafts: {
    gentle: { en: string; hi: string; hinglish: string };
    friendly: { en: string; hi: string; hinglish: string };
    firm: { en: string; hi: string; hinglish: string };
    strict: { en: string; hi: string; hinglish: string };
  };
}

export interface DormantReorderItem {
  customerId: string;
  customerName: string;
  mobile: string;
  city?: string;
  lastOrderDate: string;
  daysSinceLastOrder: number;
  avgOrderIntervalDays: number;
  totalPastOrders: number;
  totalLifetimeValue: number;
  favouriteCategories: string[];
  reorderDraft: {
    en: string;
    hi: string;
    hinglish: string;
  };
}

export async function getDebtorRecoveryInsights(): Promise<{
  success: boolean;
  debtors: DebtorRecoveryItem[];
  summary: {
    totalDebtors: number;
    totalOverdueAmount: number;
    criticalCount: number;
    highCount: number;
    avgDaysOverdue: number;
  };
  error?: string;
}> {
  try {
    const organizationId = await getTenantOrgId();

    const [companySettings, customers] = await Promise.all([
      prisma.companySettings.findFirst({ where: { organizationId } }),
      prisma.customer.findMany({
        where: { organizationId },
        include: {
          invoices: {
            where: { status: { notIn: ["Paid", "Cancelled"] } },
            orderBy: { invoiceDate: "asc" }
          },
          payments: {
            orderBy: { paymentDate: "desc" },
            take: 3
          }
        }
      })
    ]);

    const companyName = companySettings?.companyName || "ESPON CLOTHING PRIVATE LIMITED";
    const companyPhone = companySettings?.mobile || "+91 7206066678";
    const bankAccount = companySettings?.bankAccountName 
      ? `${companySettings.bankAccountName} (A/c: ${companySettings.accountNumber || 'Primary'}, IFSC: ${companySettings.ifscCode || 'ICIC0000168'})`
      : "ICICI Bank Current A/c - 016805006415 (IFSC: ICIC0000168)";

    const now = new Date();
    const debtorItems: DebtorRecoveryItem[] = [];

    for (const c of customers) {
      if (!c.invoices || c.invoices.length === 0) continue;

      const totalPending = c.invoices.reduce((sum, inv) => sum + (inv.amountDue || (inv.totalAmount - inv.amountPaid)), 0);
      if (totalPending <= 0) continue;

      const oldestInv = c.invoices[0];
      const oldestDate = oldestInv.invoiceDate || oldestInv.createdAt;
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - new Date(oldestDate).getTime()) / (1000 * 60 * 60 * 24)));

      let riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
      let healthScore = 95;

      if (daysOverdue > 90) {
        riskLevel = "CRITICAL";
        healthScore = Math.max(15, 40 - Math.floor((daysOverdue - 90) / 5));
      } else if (daysOverdue > 60) {
        riskLevel = "HIGH";
        healthScore = 55;
      } else if (daysOverdue > 30) {
        riskLevel = "MODERATE";
        healthScore = 75;
      }

      const invListStr = c.invoices.map(i => `Inv #${i.invoiceNumber} (₹${(i.amountDue || i.totalAmount).toLocaleString('en-IN')})`).join(", ");

      const gentleEn = `Dear ${c.businessName},\nHope you are doing well. This is a gentle courtesy reminder regarding pending invoice (${invListStr}) totaling *₹${totalPending.toLocaleString('en-IN')}* from ${companyName}.\n\nKindly verify and let us know when this can be scheduled.\nBank: ${bankAccount}\nThank you!`;
      const gentleHi = `नमस्ते ${c.businessName},\nआशा है आप सकुशल हैं। ${companyName} की तरफ से बकाया बिल (${invListStr}) कुल राशि *₹${totalPending.toLocaleString('en-IN')}* का एक विनम्र स्मरण पत्र है।\nकृपया भुगतान विवरण चेक करें।\nबैंक: ${bankAccount}\nधन्यवाद!`;
      const gentleHinglish = `Namaste ${c.businessName},\nUmeed hai aapka business accha chal raha hai. Aapka ${companyName} ka total pending balance *₹${totalPending.toLocaleString('en-IN')}* (${invListStr}) pending chal raha hai.\nKindly payment schedule confirm karein.\nBank: ${bankAccount}\nThank you!`;

      const friendlyEn = `Hello ${c.businessName},\nQuick follow-up on your outstanding balance of *₹${totalPending.toLocaleString('en-IN')}* against ${c.invoices.length} invoices with ${companyName}.\n\nPlease process the payment via NEFT/RTGS or UPI to keep your credit limit active for upcoming festive dispatches.\nBank: ${bankAccount}`;
      const friendlyHi = `नमस्कार ${c.businessName},\nआपके खाते में ${companyName} का कुल बकाया *₹${totalPending.toLocaleString('en-IN')}* है।\nआने वाले नए माल के आर्डर और डिस्पैच चालू रखने के लिए कृपया आज ही भुगतान करें।\nबैंक विवरण: ${bankAccount}`;
      const friendlyHinglish = `Hello ${c.businessName},\nAapka total overdue balance *₹${totalPending.toLocaleString('en-IN')}* ${daysOverdue} dino se due hai. Agle fresh stock dispatch me koi delay na ho, isliye please aaj hi RTGS/NEFT clear karwayein.\nBank: ${bankAccount}`;

      const firmEn = `Urgent Payment Notice: ${c.businessName}\nYour account shows overdue balance of *₹${totalPending.toLocaleString('en-IN')}* pending for *${daysOverdue} days* with ${companyName}.\n\nKindly clear this immediately today to avoid hold on further order bookings and deliveries.\nAccount: ${bankAccount}\nHelpline: ${companyPhone}`;
      const firmHi = `अति आवश्यक भुगतान सूचना: ${c.businessName}\nआपके खाते में ${companyName} का *₹${totalPending.toLocaleString('en-IN')}* का भुगतान पिछले *${daysOverdue} दिनों* से बकाया है।\nकृपया आज ही भुगतान क्लियर करें ताकि आगे की डिलीवरी में रुकावट न आए।\nबैंक: ${bankAccount}`;
      const firmHinglish = `Urgent Notice: ${c.businessName},\nAapka *₹${totalPending.toLocaleString('en-IN')}* ka balance *${daysOverdue} days* se overdue hai. Accounting team ko audit report deni hai, please aaj payment clear karein warna next dispatch hold ho jayega.\nBank: ${bankAccount}`;

      const strictEn = `Final Settlement Demand: ${c.businessName}\nOutstanding dues of *₹${totalPending.toLocaleString('en-IN')}* are critically overdue (> ${daysOverdue} days) against invoices: ${invListStr}.\n\nPlease arrange immediate RTGS settlement within 24 hours to prevent account suspension and formal recovery proceedings.\nAccounts Desk: ${companyPhone}`;
      const strictHi = `अंतिम भुगतान नोटिस: ${c.businessName}\n${companyName} के कुल *₹${totalPending.toLocaleString('en-IN')}* अत्यधिक समय (${daysOverdue} दिन) से बकाया हैं। कृपया 24 घंटे में भुगतान करें अन्यथा खाते पर रोक लगाई जाएगी।`;
      const strictHinglish = `FINAL PAYMENT NOTICE: ${c.businessName}\nAapka *₹${totalPending.toLocaleString('en-IN')}* ka overdue ${daysOverdue} days cross kar chuka hai. Please within 24 hours payment confirm karein taaki ledger account suspend na ho.\nAccounts: ${companyPhone}`;

      debtorItems.push({
        customerId: c.id,
        customerName: c.businessName,
        contactPerson: c.contactPerson || undefined,
        mobile: c.mobile,
        city: c.city || undefined,
        state: c.state || undefined,
        totalPending: Number(totalPending.toFixed(2)),
        oldestInvoiceDate: new Date(oldestDate).toISOString().split("T")[0],
        daysOverdue,
        unpaidInvoiceCount: c.invoices.length,
        invoices: c.invoices.map(inv => ({
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: new Date(inv.invoiceDate || inv.createdAt).toISOString().split("T")[0],
          totalAmount: inv.totalAmount,
          amountPaid: inv.amountPaid,
          amountDue: inv.amountDue || (inv.totalAmount - inv.amountPaid),
          daysOld: Math.floor((now.getTime() - new Date(inv.invoiceDate || inv.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        })),
        healthScore,
        riskLevel,
        suggestedAction: daysOverdue > 60 ? "Send Firm WhatsApp & Call" : daysOverdue > 30 ? "Send Friendly Reminder" : "Courtesy Message",
        whatsappDrafts: {
          gentle: { en: gentleEn, hi: gentleHi, hinglish: gentleHinglish },
          friendly: { en: friendlyEn, hi: friendlyHi, hinglish: friendlyHinglish },
          firm: { en: firmEn, hi: firmHi, hinglish: firmHinglish },
          strict: { en: strictEn, hi: strictHi, hinglish: strictHinglish }
        }
      });
    }

    // Sort by highest pending amount and highest days overdue
    debtorItems.sort((a, b) => b.daysOverdue - a.daysOverdue || b.totalPending - a.totalPending);

    const totalOverdueAmount = debtorItems.reduce((acc, d) => acc + d.totalPending, 0);
    const criticalCount = debtorItems.filter(d => d.riskLevel === "CRITICAL").length;
    const highCount = debtorItems.filter(d => d.riskLevel === "HIGH").length;
    const avgDaysOverdue = debtorItems.length > 0 
      ? Math.round(debtorItems.reduce((acc, d) => acc + d.daysOverdue, 0) / debtorItems.length) 
      : 0;

    return {
      success: true,
      debtors: debtorItems,
      summary: {
        totalDebtors: debtorItems.length,
        totalOverdueAmount: Number(totalOverdueAmount.toFixed(2)),
        criticalCount,
        highCount,
        avgDaysOverdue
      }
    };
  } catch (error: any) {
    console.error("AI Debtor Recovery Engine Error:", error);
    return {
      success: false,
      debtors: [],
      summary: { totalDebtors: 0, totalOverdueAmount: 0, criticalCount: 0, highCount: 0, avgDaysOverdue: 0 },
      error: error.message
    };
  }
}

export async function getPredictiveReorderInsights(): Promise<{
  success: boolean;
  dormantBuyers: DormantReorderItem[];
  error?: string;
}> {
  try {
    const organizationId = await getTenantOrgId();

    const [companySettings, customers] = await Promise.all([
      prisma.companySettings.findFirst({ where: { organizationId } }),
      prisma.customer.findMany({
        where: { organizationId },
        include: {
          orders: {
            orderBy: { createdAt: "desc" }
          }
        }
      })
    ]);

    const companyName = companySettings?.companyName || "ESPON CLOTHING PRIVATE LIMITED";
    const now = new Date();
    const dormantList: DormantReorderItem[] = [];

    for (const c of customers) {
      if (!c.orders || c.orders.length < 2) continue;

      const lastOrder = c.orders[0];
      const daysSinceLastOrder = Math.floor((now.getTime() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24));

      // Calculate historical cadence
      const firstOrder = c.orders[c.orders.length - 1];
      const totalSpanDays = Math.max(1, Math.floor((new Date(lastOrder.createdAt).getTime() - new Date(firstOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
      const avgInterval = Math.max(15, Math.round(totalSpanDays / (c.orders.length - 1)));

      // If overdue for replenishment (e.g. daysSinceLastOrder > avgInterval * 1.2)
      if (daysSinceLastOrder > avgInterval) {
        const totalLtv = c.orders.reduce((s, o) => s + (o.totalValue || 0), 0);

        const enMsg = `Hello ${c.businessName},\nWe noticed it's been ${daysSinceLastOrder} days since your last wholesale order with ${companyName}.\nOur fresh Autumn/Winter collection is now in stock with high-demand articles.\n\nCheck out our live online lookbook here: https://crm.esponclothing.com/catalog\nLet us know which sets you'd like to book!`;
        const hiMsg = `नमस्कार ${c.businessName},\n${companyName} से आपका पिछला आर्डर आए ${daysSinceLastOrder} दिन हो चुके हैं। हमारे पास फ्रेश स्टॉक और नए आर्टिकल्स तैयार हैं।\nकृपया हमारा नया कैटलॉग देखें और बुकिंग कन्फर्म करें!`;
        const hinglishMsg = `Hello ${c.businessName},\nAapka last order ${daysSinceLastOrder} din pehle deliver hua tha. Market me demand badh rahi hai aur hamara new collection stock me live ho gaya hai.\n\nOnline Lookbook: https://crm.esponclothing.com/catalog\nWhatsApp par quantities send karein!`;

        dormantList.push({
          customerId: c.id,
          customerName: c.businessName,
          mobile: c.mobile,
          city: c.city || undefined,
          lastOrderDate: new Date(lastOrder.createdAt).toISOString().split("T")[0],
          daysSinceLastOrder,
          avgOrderIntervalDays: avgInterval,
          totalPastOrders: c.orders.length,
          totalLifetimeValue: totalLtv,
          favouriteCategories: ["Trackpants", "Shorts", "Sportswear"],
          reorderDraft: {
            en: enMsg,
            hi: hiMsg,
            hinglish: hinglishMsg
          }
        });
      }
    }

    dormantList.sort((a, b) => b.daysSinceLastOrder - a.daysSinceLastOrder);

    return { success: true, dormantBuyers: dormantList };
  } catch (error: any) {
    console.error("AI Reorder Engine Error:", error);
    return { success: false, dormantBuyers: [], error: error.message };
  }
}
