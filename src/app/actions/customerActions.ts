"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
  const stateName = GST_STATE_CODES[stateCode] || "";
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

  // 2. Try public GST API lookup (with timeout fallback)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const apiRes = await fetch(`https://sheet.gstincheck.co.in/check/${gstin}`, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    clearTimeout(timeoutId);

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data && data.flag && data.data) {
        const d = data.data;
        const legalName = d.lgnm || d.tradeNam || "";
        const tradeName = d.tradeNam || d.lgnm || "";
        const companyName = tradeName || legalName;
        const bno = d.pradr?.addr?.bno || "";
        const bnm = d.pradr?.addr?.bnm || "";
        const st = d.pradr?.addr?.st || "";
        const loc = d.pradr?.addr?.loc || "";
        const district = d.pradr?.addr?.dst || "";
        const pin = d.pradr?.addr?.pncd || "";
        const stcd = d.pradr?.addr?.stcd || stateName;

        const streetAddress = [bno, bnm, st, loc].filter(Boolean).join(", ");

        return {
          success: true,
          source: "gstin_api",
          companyName: companyName.trim(),
          contactPerson: legalName !== tradeName ? legalName.trim() : "",
          address: streetAddress.trim(),
          city: district.trim(),
          state: stcd || stateName,
          pincode: String(pin).trim(),
          pan: pan,
          gstin
        };
      }
    }
  } catch (err) {
    // Graceful fallback to parsed GSTIN structure
  }

  // 3. Fallback: return structure derived from GSTIN
  return {
    success: true,
    source: "gstin_parser",
    companyName: "",
    state: stateName,
    pan: pan,
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

    const customer = await prisma.customer.create({
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
        pan: pan || null,
        openingBalance,
        openingBalanceType,
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
      ...customer.calls.map(c => ({ type: "CALL", date: c.createdAt, data: c })),
      ...customer.followUps.map(f => ({ type: "FOLLOW_UP", date: f.date, data: f })),
      ...customer.orders.map(o => ({ type: "ORDER", date: o.orderDate, data: o })),
      ...customer.tasks.map(t => ({ type: "TASK", date: t.createdAt, data: t })),
      ...customer.quotations.map(q => ({ type: "QUOTATION", date: q.createdAt, data: q })),
      ...customer.invoices.map(i => ({ type: "INVOICE", date: i.invoiceDate, data: i })),
      ...payments.map(p => ({ type: "PAYMENT", date: p.paymentDate, data: p })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

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
    // 1. Overdue FollowUps
    const overdue = await prisma.followUp.findMany({
      where: { status: "Pending", date: { lt: new Date() } },
      include: { customer: true, employee: true }
    });

    // 2. Customers due for reorder (simplified logic, last order > 35 days)
    const thirtyFiveDaysAgo = new Date();
    thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);
    
    const reorderDue = await prisma.customer.findMany({
      where: { 
        orders: { some: {} },
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
    let defaultSalespersonId = null;

    if (session?.user) {
      const userId = (session.user as any).id;
      const employee = await prisma.employee.findUnique({ where: { userId } });
      if (employee) defaultSalespersonId = employee.id;
    }

    const dataToInsert = customers.map(c => ({
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
  const landmark = (formData.get("landmark") as string)?.trim() || null;
  const regularDiscount = (formData.get("regularDiscount") as string)?.trim() || null;
  const preferredPaymentMethod = (formData.get("preferredPaymentMethod") as string)?.trim() || null;

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
        regularDiscount: regularDiscount || null,
        preferredPaymentMethod: preferredPaymentMethod || null,
        ...(openingBalanceRaw !== undefined && !isNaN(openingBalanceRaw) ? { openingBalance: openingBalanceRaw } : {}),
        ...(openingBalanceType ? { openingBalanceType } : {}),
        ...(status ? { status } : {}),
        ...(assignedSalespersonId !== undefined ? { assignedSalespersonId: assignedSalespersonId || null } : {}),
      },
    });

    revalidatePath("/customers");
    return { success: true };
  } catch (error) {
    console.error("Failed to update customer:", error);
    return { error: "Failed to update customer." };
  }
}

export async function reassignCustomer(id: string, salespersonId: string) {
  try {
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
  try {
    await prisma.customer.delete({ where: { id } });
    revalidatePath("/customers");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete customer:", error);
    return { error: "Failed to delete customer. Ensure no related records exist." };
  }
}
