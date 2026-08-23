"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function canManagePurchases() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  const role = (session.user as any).role;
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return true;
  const roleDef = await prisma.role.findUnique({ where: { name: role } });
  if (!roleDef) return false;
  try {
    const perms = JSON.parse(roleDef.permissions) as string[];
    return perms.includes("Manage Purchases") || perms.includes("Manage Invoices") || perms.includes("Manage Vendors");
  } catch { return false; }
}

export async function getBills() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const bills = await prisma.bill.findMany({
      include: {
        vendor: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            mobile: true,
            gstNumber: true,
            city: true,
            state: true,
            paymentTerms: true
          }
        },
        purchaseOrder: {
          select: {
            id: true,
            poNumber: true,
            status: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true
              }
            }
          }
        },
        payments: true,
        vendorCredits: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Compute KPI metrics
    const totalBills = bills.length;
    const totalAmount = bills.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
    const totalPaid = bills.reduce((acc, b) => acc + (b.amountPaid || 0), 0);
    const totalDue = bills.reduce((acc, b) => acc + (b.amountDue || 0), 0);
    const unpaidCount = bills.filter(b => b.status === 'Open' || b.status === 'Partially Paid').length;
    const paidCount = bills.filter(b => b.status === 'Paid').length;
    const now = new Date();
    const overdueCount = bills.filter(b => b.dueDate && new Date(b.dueDate) < now && (b.status === 'Open' || b.status === 'Partially Paid')).length;

    return {
      success: true,
      bills: JSON.parse(JSON.stringify(bills)),
      summary: {
        totalBills,
        totalAmount,
        totalPaid,
        totalDue,
        unpaidCount,
        paidCount,
        overdueCount
      }
    };
  } catch (error: any) {
    console.error("Failed to fetch bills:", error);
    return { error: "Failed to fetch bills: " + error.message };
  }
}

export async function createBill(data: {
  vendorId: string;
  vendorBillNumber?: string;
  purchaseOrderId?: string;
  billDate?: string;
  dueDate?: string;
  paymentTerms?: string;
  notes?: string;
  discountAmount?: number;
  items: {
    productId?: string;
    description: string;
    hsnCode?: string;
    quantity: number;
    unit?: string;
    rate: number;
    gstRate: number;
  }[];
  autoRestock?: boolean;
}) {
  if (!await canManagePurchases()) return { error: "Unauthorized" };
  if (!data.vendorId || !data.items?.length) {
    return { error: "Vendor and at least one line item are required" };
  }

  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const employee = await prisma.employee.findUnique({ where: { userId } });

    // Generate unique Bill Number e.g. BILL-0001
    const count = await prisma.bill.count();
    const billNumber = `BILL-${String(count + 1).padStart(4, '0')}`;

    // Calculate item totals
    let subtotal = 0;
    let taxAmount = 0;

    const processedItems = data.items.map(it => {
      const lineSubtotal = it.quantity * it.rate;
      const lineTax = (lineSubtotal * (it.gstRate || 0)) / 100;
      const lineTotal = lineSubtotal + lineTax;
      subtotal += lineSubtotal;
      taxAmount += lineTax;
      return {
        productId: it.productId || null,
        description: it.description,
        hsnCode: it.hsnCode || "6109",
        quantity: it.quantity,
        unit: it.unit || "pcs",
        rate: it.rate,
        gstRate: it.gstRate || 0,
        taxAmount: lineTax,
        total: lineTotal
      };
    });

    const discountAmount = data.discountAmount || 0;
    const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);
    const amountDue = totalAmount;

    const bill = await prisma.$transaction(async (tx) => {
      const newBill = await tx.bill.create({
        data: {
          billNumber,
          vendorBillNumber: data.vendorBillNumber || null,
          vendorId: data.vendorId,
          purchaseOrderId: data.purchaseOrderId || null,
          billDate: data.billDate ? new Date(data.billDate) : new Date(),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          paymentTerms: data.paymentTerms || "Net 30",
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          amountPaid: 0,
          amountDue,
          status: 'Open',
          notes: data.notes || null,
          items: {
            create: processedItems
          }
        },
        include: { items: true, vendor: true }
      });

      // If auto-restock is enabled and products are linked, inward stock
      if (data.autoRestock) {
        for (const it of processedItems) {
          if (it.productId) {
            await tx.product.update({
              where: { id: it.productId },
              data: { stockQuantity: { increment: it.quantity } }
            });

            await tx.inventoryTransaction.create({
              data: {
                productId: it.productId,
                type: 'IN',
                quantity: it.quantity,
                reference: billNumber,
                employeeId: employee?.id || null,
                notes: `Purchased via Vendor Bill ${billNumber}`
              }
            });
          }
        }
      }

      return newBill;
    });

    revalidatePath("/bills");
    revalidatePath("/vendors");
    revalidatePath("/purchases");
    revalidatePath("/products");
    return { success: true, bill };
  } catch (error: any) {
    console.error("Failed to create bill:", error);
    return { error: "Failed to create bill: " + error.message };
  }
}

export async function updateBillStatus(id: string, status: string) {
  if (!await canManagePurchases()) return { error: "Unauthorized" };
  try {
    await prisma.bill.update({
      where: { id },
      data: { status }
    });
    revalidatePath("/bills");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to update bill status: " + error.message };
  }
}

export async function getVendorUnpaidBills(vendorId: string) {
  try {
    const bills = await prisma.bill.findMany({
      where: {
        vendorId,
        amountDue: { gt: 0 },
        status: { in: ['Open', 'Partially Paid', 'Overdue'] }
      },
      select: {
        id: true,
        billNumber: true,
        vendorBillNumber: true,
        billDate: true,
        dueDate: true,
        totalAmount: true,
        amountPaid: true,
        amountDue: true,
        status: true
      },
      orderBy: { billDate: 'asc' }
    });
    return { success: true, bills: JSON.parse(JSON.stringify(bills)) };
  } catch (error: any) {
    return { error: "Failed to fetch vendor unpaid bills: " + error.message };
  }
}
