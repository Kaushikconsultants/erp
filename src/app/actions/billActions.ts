"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

import { canUserAccessSection } from "@/lib/authPermissions";
import { getTenantOrgId } from "@/lib/tenant";
import { syncSystemLedgers } from "@/app/actions/accountingActions";

async function canManagePurchases() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  return await canUserAccessSection(session.user, 'purchases');
}

export async function getBills() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const hasAccess = await canUserAccessSection(session.user, 'purchases');
  if (!hasAccess) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const bills = await prisma.bill.findMany({
      where: { organizationId },
      include: {
        vendor: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            mobile: true,
            gstNumber: true,
            address: true,
            city: true,
            state: true,
            pincode: true,
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
  allowDuplicate?: boolean;
  items: {
    productId?: string;
    description: string;
    hsnCode?: string;
    quantity: number;
    unit?: string;
    rate: number;
    gstRate: number;
    taxAmount?: number;
    total?: number;
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

    const organizationId = await getTenantOrgId();

    // Check for duplicate bill number from the same vendor
    if (data.vendorBillNumber && !data.allowDuplicate) {
      const existing = await prisma.bill.findFirst({
        where: {
          organizationId,
          vendorId: data.vendorId,
          vendorBillNumber: { equals: data.vendorBillNumber.trim() }
        },
        include: {
          vendor: { select: { companyName: true } }
        }
      });

      if (existing) {
        return {
          error: `Duplicate Bill: Bill #${existing.billNumber} already exists for ${existing.vendor?.companyName || 'this vendor'} with Vendor Invoice #${data.vendorBillNumber}.`
        };
      }
    }

    // Generate unique Bill Number e.g. BILL-0001
    const count = await prisma.bill.count({ where: { organizationId } });
    let nextNum = count + 1;
    let billNumber = `BILL-${String(nextNum).padStart(4, '0')}`;
    let exists = await prisma.bill.findUnique({ where: { billNumber } });
    while (exists) {
      nextNum++;
      billNumber = `BILL-${String(nextNum).padStart(4, '0')}`;
      exists = await prisma.bill.findUnique({ where: { billNumber } });
    }

    // Calculate item totals
    let subtotal = 0;
    let taxAmount = 0;

    const processedItems = data.items.map(it => {
      const lineSubtotal = it.quantity * it.rate;
      const lineTax = it.taxAmount !== undefined ? it.taxAmount : (lineSubtotal * (it.gstRate || 0)) / 100;
      const lineTotal = it.total !== undefined ? it.total : lineSubtotal + lineTax;
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
          organizationId,
          billNumber,
          vendorBillNumber: data.vendorBillNumber?.trim() || null,
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

    // Reconcile and synchronize ledger balances
    await syncSystemLedgers();

    revalidatePath("/bills");
    revalidatePath("/vendors");
    revalidatePath("/purchases");
    revalidatePath("/products");
    revalidatePath("/accounting");
    revalidatePath("/accounting/vouchers");
    revalidatePath("/accounting/financial-statements");
    return { success: true, bill: JSON.parse(JSON.stringify(bill)) };
  } catch (error: any) {
    console.error("Failed to create bill:", error);
    return { error: "Failed to create bill: " + error.message };
  }
}

export async function updateBill(id: string, data: {
  vendorId: string;
  vendorBillNumber?: string;
  purchaseOrderId?: string;
  billDate?: string;
  dueDate?: string;
  paymentTerms?: string;
  notes?: string;
  discountAmount?: number;
  allowDuplicate?: boolean;
  items: {
    productId?: string;
    description: string;
    hsnCode?: string;
    quantity: number;
    unit?: string;
    rate: number;
    gstRate: number;
    taxAmount?: number;
    total?: number;
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

    const organizationId = await getTenantOrgId();

    const existingBill = await prisma.bill.findFirst({
      where: { id, organizationId },
      include: {
        items: true,
        payments: true,
        vendorCredits: true
      }
    });

    if (!existingBill) return { error: "Bill not found" };

    // Check duplicate bill number from the same vendor if changed
    if (data.vendorBillNumber && data.vendorBillNumber.trim() !== existingBill.vendorBillNumber && !data.allowDuplicate) {
      const dup = await prisma.bill.findFirst({
        where: {
          organizationId,
          vendorId: data.vendorId,
          vendorBillNumber: { equals: data.vendorBillNumber.trim() },
          id: { not: id }
        },
        include: { vendor: { select: { companyName: true } } }
      });

      if (dup) {
        return {
          error: `Duplicate Bill: Bill #${dup.billNumber} already exists for ${dup.vendor?.companyName || 'this vendor'} with Vendor Invoice #${data.vendorBillNumber}.`
        };
      }
    }

    // Calculate item totals
    let subtotal = 0;
    let taxAmount = 0;

    const processedItems = data.items.map(it => {
      const lineSubtotal = it.quantity * it.rate;
      const lineTax = it.taxAmount !== undefined ? it.taxAmount : (lineSubtotal * (it.gstRate || 0)) / 100;
      const lineTotal = it.total !== undefined ? it.total : lineSubtotal + lineTax;
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
    const amountPaid = existingBill.amountPaid || 0;
    const amountDue = Math.max(0, totalAmount - amountPaid);
    
    // Status calculation
    let status = existingBill.status;
    if (status !== 'Void') {
      if (amountDue === 0 && amountPaid > 0) {
        status = 'Paid';
      } else if (amountPaid > 0 && amountDue > 0) {
        status = 'Partially Paid';
      } else {
        status = 'Open';
      }
    }

    const updatedBill = await prisma.$transaction(async (tx) => {
      // 1. Delete old line items
      await tx.billItem.deleteMany({ where: { billId: id } });

      // 2. Update Bill record and recreate line items
      const bill = await tx.bill.update({
        where: { id },
        data: {
          vendorId: data.vendorId,
          vendorBillNumber: data.vendorBillNumber?.trim() || null,
          purchaseOrderId: data.purchaseOrderId || null,
          billDate: data.billDate ? new Date(data.billDate) : existingBill.billDate,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          paymentTerms: data.paymentTerms || existingBill.paymentTerms || "Net 30",
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          amountDue,
          status,
          notes: data.notes || null,
          items: {
            create: processedItems
          }
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true }
              }
            }
          },
          vendor: true,
          purchaseOrder: true,
          payments: true
        }
      });

      return bill;
    });

    // Reconcile and synchronize ledger balances
    await syncSystemLedgers();

    revalidatePath("/bills");
    revalidatePath("/vendors");
    revalidatePath("/purchases");
    revalidatePath("/products");
    revalidatePath("/accounting");
    revalidatePath("/accounting/vouchers");
    revalidatePath("/accounting/financial-statements");
    return { success: true, bill: JSON.parse(JSON.stringify(updatedBill)) };
  } catch (error: any) {
    console.error("Failed to update bill:", error);
    return { error: "Failed to update bill: " + error.message };
  }
}

export async function deleteBill(id: string) {
  if (!await canManagePurchases()) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const bill = await prisma.bill.findFirst({
      where: { id, organizationId },
      include: {
        items: true,
        payments: true,
        vendorCredits: true,
        billAllocations: true
      }
    });

    if (!bill) return { error: "Bill not found." };

    await prisma.$transaction(async (tx) => {
      // 1. Reverse stock quantities if products were linked
      for (const item of bill.items) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { decrement: item.quantity } }
          });

          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              type: 'OUT',
              quantity: item.quantity,
              reference: `REV-${bill.billNumber}`,
              notes: `Stock reversed due to deletion of Bill ${bill.billNumber}`
            }
          });
        }
      }

      // 2. Delete bill allocations if any
      if (bill.billAllocations && bill.billAllocations.length > 0) {
        await tx.billAllocation.deleteMany({
          where: { billId: id }
        });
      }

      // 3. Delete payments associated with this bill and their journal vouchers
      if (bill.payments && bill.payments.length > 0) {
        for (const payment of bill.payments) {
          const pmtJvs = await tx.journalEntry.findMany({
            where: {
              OR: [
                { sourceDocId: payment.id, sourceDocType: "VENDOR_PAYMENT" },
                { voucherNumber: `PMT-${payment.paymentNumber}` }
              ]
            }
          });
          for (const jv of pmtJvs) {
            await tx.journalLineItem.deleteMany({ where: { journalEntryId: jv.id } });
            await tx.journalEntry.delete({ where: { id: jv.id } });
          }
        }
        await tx.vendorPayment.deleteMany({
          where: { billId: id }
        });
      }

      // 4. Delete vendor credits linked to this bill and their journal vouchers
      if (bill.vendorCredits && bill.vendorCredits.length > 0) {
        for (const vc of bill.vendorCredits) {
          const vcJvs = await tx.journalEntry.findMany({
            where: {
              OR: [
                { sourceDocId: vc.id, sourceDocType: "VENDOR_CREDIT" },
                { voucherNumber: `DN-${vc.creditNoteNumber}` }
              ]
            }
          });
          for (const jv of vcJvs) {
            await tx.journalLineItem.deleteMany({ where: { journalEntryId: jv.id } });
            await tx.journalEntry.delete({ where: { id: jv.id } });
          }
        }
        await tx.vendorCredit.deleteMany({
          where: { billId: id }
        });
      }

      // 5. Delete bill items
      await tx.billItem.deleteMany({
        where: { billId: id }
      });

      // 5.5 Delete associated JournalEntry & line items
      const jvs = await tx.journalEntry.findMany({
        where: {
          OR: [
            { sourceDocId: id, sourceDocType: "BILL" },
            { voucherNumber: `PUR-${bill.billNumber}` }
          ]
        }
      });
      for (const jv of jvs) {
        await tx.journalLineItem.deleteMany({ where: { journalEntryId: jv.id } });
        await tx.journalEntry.delete({ where: { id: jv.id } });
      }

      // 6. Delete the bill itself
      await tx.bill.delete({
        where: { id }
      });
    });

    // Reconcile and synchronize ledger balances
    await syncSystemLedgers();

    revalidatePath("/bills");
    revalidatePath("/vendors");
    revalidatePath("/purchases");
    revalidatePath("/accounting");
    revalidatePath("/accounting/vouchers");
    revalidatePath("/accounting/financial-statements");
    revalidatePath("/products");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete bill:", error);
    return { error: "Failed to delete bill: " + error.message };
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
