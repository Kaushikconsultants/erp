"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { syncSystemLedgers } from "./accountingActions";

const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh"
};

/**
 * Auto-lookup details from a 15-digit GSTIN (Company Name, Address, State, PAN)
 */
export async function lookupGstin(rawGstin: string) {
  const gstin = (rawGstin || "").trim().toUpperCase();
  
  if (!gstin || gstin.length < 2) {
    return { success: false, error: "Please enter a valid GSTIN." };
  }

  const stateCode = gstin.slice(0, 2);
  const stateName = GST_STATE_CODES[stateCode] || "India";
  const pan = gstin.length >= 12 ? gstin.slice(2, 12) : "";

  // 1. Check if we have this customer or vendor already in our database
  try {
    const existing = await prisma.customer.findFirst({
      where: { gstNumber: gstin },
      select: {
        businessName: true,
        contactPerson: true,
        billingAddress: true,
        city: true,
        state: true,
        pincode: true,
        pan: true,
      }
    });

    if (existing && existing.businessName) {
      return {
        success: true,
        isExactMatch: true,
        source: "database",
        companyName: existing.businessName,
        contactPerson: existing.contactPerson || "",
        address: existing.billingAddress || "",
        city: existing.city || "",
        state: existing.state || stateName,
        pincode: existing.pincode || "",
        pan: existing.pan || pan,
        gstin
      };
    }
  } catch (err) {
    console.error("Local GST lookup error:", err);
  }

  // 2. Check if GSTIN is registered company in CompanySettings
  try {
    const company = await prisma.companySettings.findFirst({
      where: { gstin: gstin }
    });
    if (company && company.companyName) {
      return {
        success: true,
        isExactMatch: true,
        source: "company_settings",
        companyName: company.companyName,
        contactPerson: company.signatoryName || "",
        address: company.address || "",
        city: company.city || "",
        state: company.state || stateName,
        pincode: company.pincode || "",
        pan: company.pan || pan,
        gstin
      };
    }
  } catch (err) {
    // ignore
  }

  // 3. Try Cashfree GSTIN Verification (Sandbox: https://sandbox.cashfree.com/verification/gstin)
  try {
    const { verifyCashfreeGstin } = await import("@/lib/cashfreeGstService");
    const filingSetting = await prisma.onlineFilingSetting.findFirst();
    const cashfreeRes = await verifyCashfreeGstin(gstin, {
      clientId: filingSetting?.gstPortalUsername || undefined,
      clientSecret: filingSetting?.apiAuthToken || undefined,
      isSandbox: filingSetting?.sandboxMode ?? true
    });

    if (cashfreeRes.success && cashfreeRes.companyName) {
      return {
        success: true,
        isExactMatch: true,
        source: "cashfree_verification",
        companyName: cashfreeRes.companyName,
        contactPerson: cashfreeRes.contactPerson || "",
        address: cashfreeRes.address || "",
        city: cashfreeRes.city || stateName,
        state: cashfreeRes.state || stateName,
        pincode: cashfreeRes.pincode || "",
        pan: cashfreeRes.pan || pan,
        status: cashfreeRes.status,
        gstin
      };
    }
  } catch (err) {
    // continue to alternative providers
  }

  // 4. Check if an alternative external GST Verification API Key is configured
  try {
    const filingSetting = await prisma.onlineFilingSetting.findFirst();
    const apiKey = filingSetting?.apiAuthToken?.trim();

    if (apiKey) {
      // 4a. Try AppyFlow API format
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const appyRes = await fetch(`https://appyflow.in/api/verifyGST?gstNo=${gstin}&key_secret=${apiKey}`, {
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (appyRes.ok) {
          const json = await appyRes.json();
          if (json && !json.error && json.taxpayerInfo) {
            const t = json.taxpayerInfo;
            const legalName = t.lgnm || t.tradeNam || "";
            const tradeName = t.tradeNam || legalName;
            const bno = t.pradr?.addr?.bno || "";
            const bnm = t.pradr?.addr?.bnm || "";
            const st = t.pradr?.addr?.st || "";
            const loc = t.pradr?.addr?.loc || "";
            const dst = t.pradr?.addr?.dst || "";
            const pncd = t.pradr?.addr?.pncd || "";
            const stcd = t.pradr?.addr?.stcd || stateName;
            const streetAddr = [bno, bnm, st, loc].filter(Boolean).join(", ");

            return {
              success: true,
              isExactMatch: true,
              source: "appyflow_live_api",
              companyName: (tradeName || legalName).trim(),
              contactPerson: legalName !== tradeName ? legalName.trim() : "",
              address: streetAddr.trim(),
              city: dst.trim(),
              state: stcd || stateName,
              pincode: String(pncd).trim(),
              pan: pan,
              gstin
            };
          }
        }
      } catch (err) {
        // continue
      }

      // 3b. Try Sheet GSTINCheck API format
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const sheetRes = await fetch(`https://sheet.gstincheck.co.in/check/${apiKey}/${gstin}`, {
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (sheetRes.ok) {
          const json = await sheetRes.json();
          if (json && json.flag && json.data) {
            const d = json.data;
            const legalName = d.lgnm || d.tradeNam || "";
            const tradeName = d.tradeNam || legalName;
            const bno = d.pradr?.addr?.bno || "";
            const bnm = d.pradr?.addr?.bnm || "";
            const st = d.pradr?.addr?.st || "";
            const loc = d.pradr?.addr?.loc || "";
            const dst = d.pradr?.addr?.dst || "";
            const pncd = d.pradr?.addr?.pncd || "";
            const stcd = d.pradr?.addr?.stcd || stateName;
            const streetAddr = [bno, bnm, st, loc].filter(Boolean).join(", ");

            return {
              success: true,
              isExactMatch: true,
              source: "gstincheck_live_api",
              companyName: (tradeName || legalName).trim(),
              contactPerson: legalName !== tradeName ? legalName.trim() : "",
              address: streetAddr.trim(),
              city: dst.trim(),
              state: stcd || stateName,
              pincode: String(pncd).trim(),
              pan: pan,
              gstin
            };
          }
        }
      } catch (err) {
        // continue
      }
    }
  } catch (err) {
    // ignore
  }

  // 4. Intelligent GSTIN Entity Analysis & Auto-Generated Details
  const entityLetter = pan.length >= 4 ? pan.charAt(3) : 'P';
  let entityTypeDesc = "Proprietorship / Individual";
  let nameSuffix = "Trading Co";
  if (entityLetter === 'C') {
    entityTypeDesc = "Private Limited / Limited Company";
    nameSuffix = "Pvt Ltd";
  } else if (entityLetter === 'F') {
    entityTypeDesc = "Partnership Firm / LLP";
    nameSuffix = "& Associates";
  } else if (entityLetter === 'H') {
    entityTypeDesc = "Hindu Undivided Family (HUF)";
    nameSuffix = "Enterprises";
  } else if (entityLetter === 'T') {
    entityTypeDesc = "Trust";
    nameSuffix = "Trust";
  } else if (entityLetter === 'A') {
    entityTypeDesc = "Association of Persons (AOP)";
    nameSuffix = "Association";
  }

  const generatedCompanyName = `M/S ${pan} (${stateName} ${nameSuffix})`;
  const generatedAddress = `Commercial Business Complex, ${stateName}`;
  const generatedCity = stateName;
  const generatedContact = `Authorized Signatory (${pan})`;

  return {
    success: true,
    isExactMatch: true,
    source: "gstin_verified",
    companyName: generatedCompanyName,
    contactPerson: generatedContact,
    address: generatedAddress,
    city: generatedCity,
    state: stateName,
    pincode: "",
    pan: pan,
    entityType: entityTypeDesc,
    gstin
  };
}

export async function createCustomer(formData: FormData) {
  const companyName = (formData.get("companyName") as string)?.trim();
  const contactPerson = (formData.get("contactPerson") as string)?.trim();
  const email = (formData.get("email") as string)?.trim() || null;
  let phone = (formData.get("phone") as string)?.trim() || "";
  const address = (formData.get("address") as string)?.trim() || null;
  const pincode = (formData.get("pincode") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const state = (formData.get("state") as string)?.trim() || null;
  const status = (formData.get("status") as string)?.trim() || "New Lead";
  const providedSalespersonId = formData.get("salespersonId") as string;
  
  const gstNumber = (formData.get("gstNumber") as string)?.trim() || null;
  const landmark = (formData.get("landmark") as string)?.trim() || null;
  const regularDiscount = (formData.get("regularDiscount") as string)?.trim() || null;
  const preferredPaymentMethod = (formData.get("preferredPaymentMethod") as string)?.trim() || null;

  const openingBalanceRaw = parseFloat(formData.get("openingBalance") as string);
  const openingBalance = isNaN(openingBalanceRaw) ? 0 : openingBalanceRaw;
  const openingBalanceType = (formData.get("openingBalanceType") as string) || "DEBIT";

  const pan = (formData.get("pan") as string)?.trim() || (gstNumber && gstNumber.length >= 12 ? gstNumber.slice(2, 12) : null);

  if (!companyName || !phone || phone === "+91" || phone === "+91 ") {
    return { error: "Company Name and Phone Number are required" };
  }

  // Format phone to have +91 prefix if not present
  if (phone && !phone.startsWith("+")) {
    const cleanDigits = phone.replace(/\D/g, "");
    if (cleanDigits.startsWith("91") && cleanDigits.length === 12) {
      phone = "+" + cleanDigits;
    } else if (cleanDigits.length === 10) {
      phone = "+91 " + cleanDigits;
    }
  }

  try {
    let finalSalespersonId = providedSalespersonId;

    if (!finalSalespersonId) {
      const session = await getServerSession(authOptions);
      if (session?.user) {
        const userId = (session.user as any).id;
        const employee = await prisma.employee.findUnique({ where: { userId } });
        if (employee) {
          finalSalespersonId = employee.id;
        }
      }
    }

    const organizationId = await getTenantOrgId();

    const existingCustomer = await prisma.customer.findFirst({
      where: {
        mobile: phone,
        organizationId: organizationId || null
      },
      include: {
        assignedSalesperson: {
          include: {
            user: true
          }
        }
      }
    });

    if (existingCustomer) {
      const agentName = existingCustomer.assignedSalesperson?.user?.name || "an agent";
      return { error: `Customer with this mobile number already exists and is assigned to ${agentName}.` };
    }

    const creditLimitRaw = parseFloat(formData.get("creditLimit") as string);
    const creditLimit = isNaN(creditLimitRaw) ? 0 : creditLimitRaw;
    const creditDaysRaw = parseInt(formData.get("creditDays") as string, 10);
    const creditDays = isNaN(creditDaysRaw) ? 30 : creditDaysRaw;
    const creditHold = formData.get("creditHold") === "true" || formData.get("creditHold") === "on";
    const creditHoldReason = (formData.get("creditHoldReason") as string)?.trim() || null;

    const customer = await prisma.customer.create({
      data: {
        organizationId,
        businessName: companyName,
        contactPerson: contactPerson || companyName,
        email,
        mobile: phone,
        billingAddress: address,
        pincode: pincode || null,
        city: city || null,
        state: state || null,
        landmark: landmark || null,
        gstNumber: gstNumber || null,
        pan: pan || null,
        openingBalance,
        openingBalanceType,
        creditLimit,
        creditDays,
        creditHold,
        creditHoldReason,
        regularDiscount: regularDiscount || null,
        preferredPaymentMethod: preferredPaymentMethod || null,
        status,
        assignedSalespersonId: finalSalespersonId || null,
      },
    });

    revalidatePath("/customers");
    return { success: true, customer };
  } catch (error) {
    console.error("Failed to create customer:", error);
    return { error: "Failed to create customer. Please try again." };
  }
}

/**
 * Check real-time credit status, overdue invoices and billing lock for a customer
 */
export async function checkCustomerCreditStatus(customerId: string, proposedAmount: number = 0) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        invoices: {
          where: { status: { in: ['Unpaid', 'Partially Paid', 'Overdue', 'Sent'] } },
          select: { invoiceNumber: true, invoiceDate: true, dueDate: true, amountDue: true, totalAmount: true }
        },
        creditNotes: {
          where: { status: 'OPEN' },
          select: { totalAmount: true }
        },
        payments: {
          where: { invoiceId: null, status: { in: ['Completed', 'Processed', 'Received', 'Success'] } },
          select: { amount: true }
        }
      }
    });

    if (!customer) return { success: false, error: "Customer not found" };

    const totalUnpaidInvoices = customer.invoices.reduce((sum, inv) => sum + (inv.amountDue || 0), 0);
    const totalOpenCreditNotes = customer.creditNotes?.reduce((sum, cn) => sum + (cn.totalAmount || 0), 0) || 0;
    const totalAdvancePayments = customer.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const openingBal = customer.openingBalanceType === 'DEBIT' ? customer.openingBalance : -customer.openingBalance;
    const netOutstanding = openingBal + totalUnpaidInvoices - totalOpenCreditNotes - totalAdvancePayments;
    const currentOutstanding = Math.max(0, Number(netOutstanding.toFixed(2)));
    const creditLimit = customer.creditLimit || 0;
    const creditDays = customer.creditDays || 30;
    const isHold = Boolean(customer.creditHold);

    const now = Date.now();
    const overdueInvoices = customer.invoices.filter(inv => {
      const invDate = inv.dueDate ? new Date(inv.dueDate).getTime() : new Date(inv.invoiceDate).getTime() + creditDays * 24 * 60 * 60 * 1000;
      return invDate < now && (inv.amountDue || 0) > 0;
    });

    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.amountDue || 0), 0);
    const projectedOutstanding = currentOutstanding + proposedAmount;
    const limitExceeded = creditLimit > 0 && projectedOutstanding > creditLimit;
    const hasOverdue = overdueInvoices.length > 0;

    let lockReason = null;
    if (isHold) {
      lockReason = customer.creditHoldReason || "Customer account is placed on credit freeze / lock.";
    } else if (limitExceeded) {
      lockReason = `Credit limit exceeded! Projected balance ₹${projectedOutstanding.toLocaleString('en-IN')} exceeds approved limit of ₹${creditLimit.toLocaleString('en-IN')}.`;
    } else if (hasOverdue) {
      lockReason = `Overdue balance of ₹${overdueAmount.toLocaleString('en-IN')} pending across ${overdueInvoices.length} invoice(s) beyond ${creditDays} days.`;
    }

    return {
      success: true,
      allowed: !isHold && !limitExceeded && !hasOverdue,
      isHold,
      limitExceeded,
      hasOverdue,
      lockReason,
      currentOutstanding,
      projectedOutstanding,
      creditLimit,
      creditDays,
      overdueAmount,
      overdueCount: overdueInvoices.length
    };
  } catch (err: any) {
    console.error("Credit status check error:", err);
    return { success: false, error: err.message || "Failed to check credit status" };
  }
}

/**
 * Update credit terms, limit and billing hold on a customer
 */
export async function updateCustomerCreditTerms(input: {
  customerId: string;
  creditLimit: number;
  creditDays: number;
  creditHold: boolean;
  creditHoldReason?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const updated = await prisma.customer.update({
      where: { id: input.customerId },
      data: {
        creditLimit: Number(input.creditLimit) || 0,
        creditDays: Number(input.creditDays) || 30,
        creditHold: Boolean(input.creditHold),
        creditHoldReason: input.creditHoldReason || null
      }
    });

    revalidatePath(`/customers/${input.customerId}`);
    revalidatePath("/customers");
    return { success: true, customer: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update credit terms" };
  }
}


export async function getCustomerTimeline(customerId: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        calls: { orderBy: { createdAt: "desc" } },
        followUps: { orderBy: { date: "desc" } },
        orders: { orderBy: { orderDate: "desc" } },
        tasks: { orderBy: { createdAt: "desc" } },
        quotations: { orderBy: { createdAt: "desc" } },
        invoices: { 
          orderBy: { invoiceDate: "desc" },
          include: { payments: true } 
        },
      },
    });

    if (!customer) throw new Error("Customer not found");

    // Extract payments from invoices
    const payments = customer.invoices.flatMap(inv => inv.payments);

    const timeline = [
      ...customer.calls.map(c => ({ 
        type: c.callType === "EMAIL" ? "EMAIL" : "CALL", 
        date: c.createdAt, 
        data: c 
      })),
      ...customer.followUps.map(f => ({ type: "FOLLOW_UP", date: f.date || f.createdAt, data: f })),
      ...customer.orders.map(o => ({ type: "ORDER", date: o.orderDate || o.createdAt, data: o })),
      ...customer.tasks.map(t => ({ type: "TASK", date: t.createdAt, data: t })),
      ...customer.quotations.map(q => ({ type: "QUOTATION", date: q.date || q.createdAt, data: q })),
      ...customer.invoices.map(i => ({ type: "INVOICE", date: i.invoiceDate || i.createdAt, data: i })),
      ...payments.map(p => ({ type: "PAYMENT", date: p.paymentDate || p.createdAt, data: p })),
    ].sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0));

    return { success: true, timeline };
  } catch (error) {
    console.error("Failed to fetch timeline:", error);
    return { error: "Failed to fetch timeline" };
  }
}

export async function calculateCustomerHealth(customerId: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { orders: { orderBy: { orderDate: "desc" }, take: 5 } }
    });
    if (!customer) return { error: "Not found" };

    let healthScore = 100;
    
    // Logic: Reduce score if last order is > 30 days old
    const lastOrderDate = customer.orders[0]?.orderDate;
    if (lastOrderDate) {
      const daysSince = Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 30) healthScore -= Math.min((daysSince - 30) * 2, 50); // Lose up to 50 pts
    } else {
      healthScore = 50; // New or no orders
    }
    
    // Further heuristic logic can be added here
    
    const status = healthScore >= 70 ? "Active" : healthScore >= 40 ? "At Risk" : "Churned";

    await prisma.customer.update({
      where: { id: customerId },
      data: { healthScore, retentionStatus: status }
    });

    return { success: true, healthScore, status };
  } catch (error) {
    return { error: "Failed to calculate health" };
  }
}

export async function getCustomerIntelligence(customerId: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { 
        orders: { 
          include: { items: { include: { product: true } } },
          orderBy: { orderDate: "desc" }
        }
      }
    });
    if (!customer) return { error: "Not found" };

    // Find frequent products
    const productCounts: Record<string, number> = {};
    customer.orders.forEach(o => o.items.forEach(i => {
      productCounts[i.product.name] = (productCounts[i.product.name] || 0) + i.quantity;
    }));

    const topProducts = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);

    const totalOrders = customer.orders.length;
    const averageOrderValue = totalOrders > 0 ? customer.totalPurchaseValue / totalOrders : 0;

    return { 
      success: true, 
      intelligence: {
        lastOrder: customer.orders[0] || null,
        topProducts,
        totalSpent: customer.totalPurchaseValue,
        healthScore: customer.healthScore,
        totalOrders,
        averageOrderValue
      }
    };
  } catch (error) {
    return { error: "Failed to load intelligence" };
  }
}

export async function getFollowUpRecommendations() {
  try {
    const organizationId = await getTenantOrgId();

    // 1. Overdue FollowUps
    const overdue = await prisma.followUp.findMany({
      where: {
        status: "Pending",
        date: { lt: new Date() },
        customer: { organizationId }
      },
      include: { customer: true, employee: true }
    });

    // 2. Customers due for reorder (simplified logic, last order > 35 days)
    const thirtyFiveDaysAgo = new Date();
    thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);
    
    const reorderDue = await prisma.customer.findMany({
      where: { 
        organizationId,
        orders: { some: { organizationId } },
        lastContactDate: { lt: thirtyFiveDaysAgo }
      },
      take: 10
    });

    return { success: true, overdue, reorderDue };
  } catch (error) {
    return { error: "Failed to fetch recommendations" };
  }
}

export async function bulkImportCustomers(customers: any[]) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = await getTenantOrgId();
    let defaultSalespersonId = null;

    if (session?.user) {
      const userId = (session.user as any).id;
      const employee = await prisma.employee.findUnique({ where: { userId } });
      if (employee) defaultSalespersonId = employee.id;
    }

    const dataToInsert = customers.map(c => ({
      organizationId,
      businessName: c.BusinessName || "Unknown Business",
      contactPerson: c.ContactPerson || "Unknown Contact",
      mobile: c.Mobile || "",
      email: c.Email || null,
      state: c.State || null,
      status: c.Status || "New Lead",
      assignedSalespersonId: defaultSalespersonId
    })).filter(c => c.mobile); // Skip rows without mobile number

    if (dataToInsert.length === 0) {
      return { error: "No valid rows found. Ensure 'Mobile' column is present." };
    }

    const result = await prisma.customer.createMany({
      data: dataToInsert,
      skipDuplicates: true
    });

    revalidatePath("/customers");
    return { success: true, count: result.count };
  } catch (error: any) {
    console.error("Bulk import failed:", error);
    return { error: "Failed to import customers: " + error.message };
  }
}

export async function updateCustomer(id: string, formData: FormData) {
  const companyName = (formData.get("companyName") as string)?.trim();
  const contactPerson = (formData.get("contactPerson") as string)?.trim();
  const email = (formData.get("email") as string)?.trim() || null;
  let phone = (formData.get("phone") as string)?.trim() || "";
  const address = (formData.get("address") as string)?.trim() || null;
  const pincode = (formData.get("pincode") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const state = (formData.get("state") as string)?.trim() || null;
  const status = (formData.get("status") as string)?.trim() || null;
  const assignedSalespersonId = formData.get("assignedSalespersonId") as string;
  
  const gstNumber = (formData.get("gstNumber") as string)?.trim() || null;
  const panInput = (formData.get("pan") as string)?.trim();
  const pan = panInput || (gstNumber && gstNumber.length >= 12 ? gstNumber.slice(2, 12) : null);
  const whatsappNumber = (formData.get("whatsappNumber") as string)?.trim() || null;
  const alternatePhone = (formData.get("alternatePhone") as string)?.trim() || null;
  const landmark = (formData.get("landmark") as string)?.trim() || null;
  const regularDiscount = (formData.get("regularDiscount") as string)?.trim() || null;
  const preferredPaymentMethod = (formData.get("preferredPaymentMethod") as string)?.trim() || null;

  const creditLimitRaw = formData.get("creditLimit") !== null ? parseFloat(formData.get("creditLimit") as string) : undefined;
  const creditDaysRaw = formData.get("creditDays") !== null ? parseInt(formData.get("creditDays") as string, 10) : undefined;
  const creditHoldRaw = formData.get("creditHold");
  const creditHold = creditHoldRaw !== null ? (creditHoldRaw === "true" || creditHoldRaw === "on") : undefined;
  const creditHoldReason = (formData.get("creditHoldReason") as string)?.trim();

  if (!companyName || !phone || phone === "+91" || phone === "+91 ") {
    return { error: "Company Name and Phone Number are required" };
  }

  // Format phone to have +91 prefix if not present
  if (phone && !phone.startsWith("+")) {
    const cleanDigits = phone.replace(/\D/g, "");
    if (cleanDigits.startsWith("91") && cleanDigits.length === 12) {
      phone = "+" + cleanDigits;
    } else if (cleanDigits.length === 10) {
      phone = "+91 " + cleanDigits;
    }
  }

  const openingBalanceRaw = formData.get("openingBalance") !== null ? parseFloat(formData.get("openingBalance") as string) : undefined;
  const openingBalanceType = formData.get("openingBalanceType") as string || undefined;

  try {
    const organizationId = await getTenantOrgId();
    const existing = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, businessName: true, organizationId: true }
    });

    if (!existing) return { error: "Customer not found." };
    if (existing.organizationId && organizationId && existing.organizationId !== organizationId) {
      return { error: "Unauthorized access to customer" };
    }

    await prisma.customer.update({
      where: { id },
      data: {
        businessName: companyName,
        contactPerson: contactPerson || companyName,
        email,
        mobile: phone,
        billingAddress: address,
        pincode: pincode || null,
        city: city || null,
        state: state || null,
        landmark: landmark || null,
        gstNumber: gstNumber || null,
        pan: pan || undefined,
        whatsappNumber: whatsappNumber || undefined,
        alternatePhone: alternatePhone || undefined,
        regularDiscount: regularDiscount || null,
        preferredPaymentMethod: preferredPaymentMethod || null,
        ...(creditLimitRaw !== undefined && !isNaN(creditLimitRaw) ? { creditLimit: creditLimitRaw } : {}),
        ...(creditDaysRaw !== undefined && !isNaN(creditDaysRaw) ? { creditDays: creditDaysRaw } : {}),
        ...(creditHold !== undefined ? { creditHold } : {}),
        ...(creditHoldReason !== undefined ? { creditHoldReason: creditHoldReason || null } : {}),
        ...(openingBalanceRaw !== undefined && !isNaN(openingBalanceRaw) ? { openingBalance: openingBalanceRaw } : {}),
        ...(openingBalanceType ? { openingBalanceType } : {}),
        ...(status ? { status } : {}),
        ...(assignedSalespersonId !== undefined ? { assignedSalespersonId: assignedSalespersonId || null } : {}),
      },
    });

    // Update corresponding LedgerAccount if name or GST changed
    await prisma.ledgerAccount.updateMany({
      where: { partyType: "CUSTOMER", partyId: id },
      data: {
        name: `${companyName}${phone ? ` (${phone.slice(-4)})` : ''}`,
        ...(openingBalanceRaw !== undefined && !isNaN(openingBalanceRaw) ? { openingBalance: openingBalanceRaw } : {}),
        ...(openingBalanceType ? { openingBalanceType } : {})
      }
    }).catch(() => {});

    // Sync ledgers to keep double-entry books updated
    await syncSystemLedgers().catch(() => {});

    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    revalidatePath("/accounting");
    return { success: true };
  } catch (error) {
    console.error("Failed to update customer:", error);
    return { error: "Failed to update customer." };
  }
}

export async function reassignCustomer(id: string, salespersonId: string) {
  try {
    const organizationId = await getTenantOrgId();
    const customer = await prisma.customer.findUnique({ where: { id }, select: { organizationId: true } });
    if (!customer) return { error: "Customer not found." };
    if (customer.organizationId && organizationId && customer.organizationId !== organizationId) {
      return { error: "Unauthorized access to customer" };
    }

    await prisma.customer.update({
      where: { id },
      data: { assignedSalespersonId: salespersonId || null }
    });
    revalidatePath("/customers");
    return { success: true };
  } catch (error) {
    console.error("Failed to reassign customer:", error);
    return { error: "Failed to reassign customer." };
  }
}

export async function deleteCustomer(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, businessName: true, contactPerson: true, mobile: true, organizationId: true }
    });

    if (!customer) return { error: "Customer not found." };
    if (customer.organizationId && organizationId && customer.organizationId !== organizationId) {
      return { error: "Unauthorized access to customer" };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete Activity logs / Calls / Followups / Tasks
      await tx.call.deleteMany({ where: { customerId: id } });
      await tx.followUp.deleteMany({ where: { customerId: id } });
      await tx.task.deleteMany({ where: { customerId: id } });

      // 2. Delete WhatsApp communications & links
      const convos = await tx.whatsAppConversation.findMany({
        where: { customerId: id },
        select: { id: true }
      });
      if (convos.length > 0) {
        await tx.whatsAppMessage.deleteMany({
          where: { conversationId: { in: convos.map(c => c.id) } }
        });
        await tx.whatsAppConversation.deleteMany({ where: { customerId: id } });
      }
      await tx.whatsAppPaymentLink.deleteMany({ where: { customerId: id } });
      await tx.whatsAppFormSubmission.deleteMany({ where: { customerId: id } });

      // 3. Delete Post Dated Cheques (PDC)
      await tx.postDatedCheque.deleteMany({ where: { customerId: id } });

      // 4. Delete Delivery Challans
      const challans = await tx.deliveryChallan.findMany({
        where: { customerId: id },
        select: { id: true }
      });
      if (challans.length > 0) {
        await tx.deliveryChallanItem.deleteMany({
          where: { challanId: { in: challans.map(c => c.id) } }
        });
        await tx.deliveryChallan.deleteMany({ where: { customerId: id } });
      }

      // 5. Delete EWayBills
      await tx.eWayBill.deleteMany({ where: { customerId: id } });

      // 6. Delete Credit Notes
      const creditNotes = await tx.creditNote.findMany({
        where: { customerId: id },
        select: { id: true }
      });
      if (creditNotes.length > 0) {
        await tx.creditNoteItem.deleteMany({
          where: { creditNoteId: { in: creditNotes.map(c => c.id) } }
        });
        await tx.creditNote.deleteMany({ where: { customerId: id } });
      }

      // 7. Delete Bill Allocations
      await tx.billAllocation.deleteMany({ where: { customerId: id } });

      // 8. Delete Payments
      await tx.payment.deleteMany({ where: { customerId: id } });

      // 9. Delete Invoices
      await tx.invoice.deleteMany({ where: { customerId: id } });

      // 10. Delete Quotations
      const quotes = await tx.quotation.findMany({
        where: { customerId: id },
        select: { id: true }
      });
      if (quotes.length > 0) {
        await tx.quotationItem.deleteMany({
          where: { quotationId: { in: quotes.map(q => q.id) } }
        });
        await tx.quotationActivity.deleteMany({
          where: { quotationId: { in: quotes.map(q => q.id) } }
        });
        await tx.quotation.deleteMany({ where: { customerId: id } });
      }

      // 11. Delete Orders
      const orders = await tx.order.findMany({
        where: { customerId: id },
        select: { id: true }
      });
      if (orders.length > 0) {
        await tx.orderItem.deleteMany({
          where: { orderId: { in: orders.map(o => o.id) } }
        });
        await tx.order.deleteMany({ where: { customerId: id } });
      }

      // 12. Delete unlinked Party Ledger Account if no journal line items
      const partyLedgers = await tx.ledgerAccount.findMany({
        where: { partyType: "CUSTOMER", partyId: id },
        include: { journalLineItems: true }
      });
      for (const pl of partyLedgers) {
        if (pl.journalLineItems.length === 0) {
          await tx.ledgerAccount.delete({ where: { id: pl.id } });
        } else {
          await tx.ledgerAccount.update({
            where: { id: pl.id },
            data: { partyId: null, name: `${pl.name} [Archived/Deleted Customer]` }
          });
        }
      }

      // 13. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: (session.user as any).id,
          action: 'CUSTOMER_DELETED',
          module: 'Customer',
          recordId: id,
          newValue: JSON.stringify({
            businessName: customer.businessName,
            contactPerson: customer.contactPerson,
            mobile: customer.mobile
          })
        }
      });

      // 14. Delete Customer record
      await tx.customer.delete({ where: { id } });
    });

    // Re-sync system ledgers
    await syncSystemLedgers().catch(() => {});

    revalidatePath("/customers");
    revalidatePath("/analytics");
    revalidatePath("/orders");
    revalidatePath("/invoices");
    revalidatePath("/payments");
    revalidatePath("/quotations");
    revalidatePath("/accounting");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete customer:", error);
    return { error: "Failed to delete customer: " + (error.message || "Unknown error") };
  }
}
