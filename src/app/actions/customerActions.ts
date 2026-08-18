"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function createCustomer(formData: FormData) {
  const companyName = formData.get("companyName") as string;
  const contactPerson = formData.get("contactPerson") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const address = formData.get("address") as string;
  const pincode = formData.get("pincode") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  const status = formData.get("status") as string || "New Lead";
  const providedSalespersonId = formData.get("salespersonId") as string;
  
  const gstNumber = formData.get("gstNumber") as string;
  const landmark = formData.get("landmark") as string;
  const regularDiscount = formData.get("regularDiscount") as string;
  const preferredPaymentMethod = formData.get("preferredPaymentMethod") as string;

  if (!companyName || !contactPerson) {
    return { error: "Company Name and Contact Person are required" };
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
        contactPerson,
        email,
        mobile: phone || "",
        billingAddress: address,
        pincode: pincode || null,
        city: city || null,
        state: state || null,
        landmark: landmark || null,
        gstNumber: gstNumber || null,
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
  const companyName = formData.get("companyName") as string;
  const contactPerson = formData.get("contactPerson") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const address = formData.get("address") as string;
  const pincode = formData.get("pincode") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  const status = formData.get("status") as string;
  const assignedSalespersonId = formData.get("assignedSalespersonId") as string;
  
  const gstNumber = formData.get("gstNumber") as string;
  const landmark = formData.get("landmark") as string;
  const regularDiscount = formData.get("regularDiscount") as string;
  const preferredPaymentMethod = formData.get("preferredPaymentMethod") as string;

  if (!companyName || !contactPerson) {
    return { error: "Company Name and Contact Person are required" };
  }

  try {
    await prisma.customer.update({
      where: { id },
      data: {
        businessName: companyName,
        contactPerson,
        email,
        mobile: phone || "",
        billingAddress: address,
        pincode: pincode || null,
        city: city || null,
        state: state || null,
        landmark: landmark || null,
        gstNumber: gstNumber || null,
        regularDiscount: regularDiscount || null,
        preferredPaymentMethod: preferredPaymentMethod || null,
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
