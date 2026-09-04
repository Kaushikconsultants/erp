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

export async function getVendorCredits() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const hasAccess = await canUserAccessSection(session.user, 'purchases');
  if (!hasAccess) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const credits = await prisma.vendorCredit.findMany({
      where: {
        vendor: { organizationId }
      },
      include: {
        vendor: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            mobile: true,
            gstNumber: true,
            city: true,
            state: true
          }
        },
        bill: {
          select: {
            id: true,
            billNumber: true,
            vendorBillNumber: true,
            totalAmount: true
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
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalCreditAmount = credits.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
    const availableBalance = credits.filter(c => c.status === 'OPEN').reduce((sum, c) => sum + (c.balanceAmount || 0), 0);
    const adjustedAmount = credits.reduce((sum, c) => sum + (c.allocatedAmount || 0), 0);

    return {
      success: true,
      credits: JSON.parse(JSON.stringify(credits)),
      summary: {
        totalCredits: credits.length,
        totalCreditAmount,
        availableBalance,
        adjustedAmount,
        openCreditsCount: credits.filter(c => c.status === 'OPEN').length
      }
    };
  } catch (error: any) {
    console.error("Failed to fetch vendor credits:", error);
    return { error: "Failed to fetch vendor credits: " + error.message };
  }
}

export async function createVendorCredit(data: {
  vendorId: string;
  billId?: string;
  creditDate?: string;
  reason: string;
  notes?: string;
  items: {
    productId?: string;
    description: string;
    hsnCode?: string;
    quantity: number;
    rate: number;
    gstRate?: number;
  }[];
  deductStock?: boolean;
}) {
  if (!await canManagePurchases()) return { error: "Unauthorized" };
  if (!data.vendorId || !data.items?.length) {
    return { error: "Vendor and at least one credit item are required" };
  }

  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const employee = await prisma.employee.findUnique({ where: { userId } });

    const organizationId = await getTenantOrgId();

    // Generate unique Debit Note / Vendor Credit number e.g. DN-0001
    const count = await prisma.vendorCredit.count({
      where: {
        vendor: { organizationId }
      }
    });
    let nextNum = count + 1;
    let creditNoteNumber = `DN-${String(nextNum).padStart(4, '0')}`;
    let exists = await prisma.vendorCredit.findUnique({ where: { creditNoteNumber } });
    while (exists) {
      nextNum++;
      creditNoteNumber = `DN-${String(nextNum).padStart(4, '0')}`;
      exists = await prisma.vendorCredit.findUnique({ where: { creditNoteNumber } });
    }

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
        rate: it.rate,
        gstRate: it.gstRate || 0,
        taxAmount: lineTax,
        total: lineTotal
      };
    });

    const totalAmount = subtotal + taxAmount;
    const balanceAmount = totalAmount;

    const credit = await prisma.$transaction(async (tx) => {
      const newCredit = await tx.vendorCredit.create({
        data: {
          creditNoteNumber,
          vendorId: data.vendorId,
          billId: data.billId || null,
          creditDate: data.creditDate ? new Date(data.creditDate) : new Date(),
          reason: data.reason || "Goods Return",
          status: 'OPEN',
          subtotal,
          taxAmount,
          totalAmount,
          allocatedAmount: 0,
          balanceAmount,
          notes: data.notes || null,
          items: {
            create: processedItems
          }
        },
        include: { items: true, vendor: true }
      });

      // If returning goods from warehouse, decrement stock
      if (data.deductStock) {
        for (const it of processedItems) {
          if (it.productId) {
            await tx.product.update({
              where: { id: it.productId },
              data: { stockQuantity: { decrement: it.quantity } }
            });

            await tx.inventoryTransaction.create({
              data: {
                productId: it.productId,
                type: 'OUT',
                quantity: it.quantity,
                reference: creditNoteNumber,
                employeeId: employee?.id || null,
                notes: `Returned to vendor via Debit Note ${creditNoteNumber}`
              }
            });
          }
        }
      }

      return newCredit;
    });

    // Reconcile and synchronize ledger balances
    await syncSystemLedgers();

    revalidatePath("/vendor-credits");
    revalidatePath("/bills");
    revalidatePath("/vendors");
    revalidatePath("/products");
    revalidatePath("/accounting");
    revalidatePath("/accounting/vouchers");
    revalidatePath("/accounting/financial-statements");
    return { success: true, credit };
  } catch (error: any) {
    console.error("Failed to create vendor credit:", error);
    return { error: "Failed to create vendor credit: " + error.message };
  }
}

export async function applyVendorCreditToBill(vendorCreditId: string, billId: string, amount: number) {
  if (!await canManagePurchases()) return { error: "Unauthorized" };
  if (!amount || amount <= 0) return { error: "Invalid adjustment amount" };

  try {
    await prisma.$transaction(async (tx) => {
      const credit = await tx.vendorCredit.findUnique({ where: { id: vendorCreditId } });
      if (!credit) throw new Error("Vendor Credit not found");
      if (credit.balanceAmount < amount) throw new Error("Insufficient credit balance");

      const bill = await tx.bill.findUnique({ where: { id: billId } });
      if (!bill) throw new Error("Bill not found");
      if (bill.amountDue < amount) throw new Error("Adjustment amount exceeds bill amount due");

      // Update credit balance
      const newCreditAllocated = credit.allocatedAmount + amount;
      const newCreditBalance = credit.balanceAmount - amount;
      const newCreditStatus = newCreditBalance <= 0 ? 'ADJUSTED' : 'OPEN';

      await tx.vendorCredit.update({
        where: { id: vendorCreditId },
        data: {
          allocatedAmount: newCreditAllocated,
          balanceAmount: newCreditBalance,
          status: newCreditStatus
        }
      });

      // Update bill
      const newBillPaid = bill.amountPaid + amount;
      const newBillDue = bill.amountDue - amount;
      const newBillStatus = newBillDue <= 0 ? 'Paid' : 'Partially Paid';

      await tx.bill.update({
        where: { id: billId },
        data: {
          amountPaid: newBillPaid,
          amountDue: newBillDue,
          status: newBillStatus
        }
      });
    });

    // Reconcile and synchronize ledger balances
    await syncSystemLedgers();

    revalidatePath("/vendor-credits");
    revalidatePath("/bills");
    revalidatePath("/vendors");
    revalidatePath("/accounting");
    revalidatePath("/accounting/vouchers");
    revalidatePath("/accounting/financial-statements");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to apply vendor credit: " + error.message };
  }
}

export async function deleteVendorCredit(creditId: string) {
  if (!await canManagePurchases()) return { error: "Unauthorized" };

  try {
    const credit = await prisma.vendorCredit.findUnique({
      where: { id: creditId },
      include: {
        items: true,
        bill: true
      }
    });

    if (!credit) return { error: "Vendor Credit not found" };

    await prisma.$transaction(async (tx) => {
      // 1. If credit was applied to a Bill, reverse bill paid/due amounts
      if (credit.allocatedAmount > 0 && credit.billId) {
        const bill = await tx.bill.findUnique({ where: { id: credit.billId } });
        if (bill) {
          const newPaid = Math.max(0, bill.amountPaid - credit.allocatedAmount);
          const newDue = Math.min(bill.totalAmount, bill.amountDue + credit.allocatedAmount);
          await tx.bill.update({
            where: { id: credit.billId },
            data: {
              amountPaid: newPaid,
              amountDue: newDue,
              status: newPaid <= 0 ? 'Open' : 'Partially Paid'
            }
          });
        }
      }

      // 2. Replenish product inventory for items
      for (const it of credit.items) {
        if (it.productId && it.quantity > 0) {
          await tx.product.update({
            where: { id: it.productId },
            data: { stockQuantity: { increment: it.quantity } }
          }).catch(() => {});

          await tx.inventoryTransaction.create({
            data: {
              productId: it.productId,
              type: 'IN',
              quantity: it.quantity,
              reference: `CANCEL-${credit.creditNoteNumber}`,
              notes: `Stock restocked due to deletion of Debit Note ${credit.creditNoteNumber}`
            }
          }).catch(() => {});
        }
      }

      // 3. Delete items & credit
      await tx.vendorCreditItem.deleteMany({ where: { vendorCreditId: creditId } });
      await tx.vendorCredit.delete({ where: { id: creditId } });
    });

    // Reconcile and synchronize ledger balances
    await syncSystemLedgers();

    revalidatePath("/vendor-credits");
    revalidatePath("/bills");
    revalidatePath("/vendors");
    revalidatePath("/products");
    revalidatePath("/accounting");
    revalidatePath("/accounting/vouchers");
    revalidatePath("/accounting/financial-statements");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete vendor credit:", error);
    return { error: error.message || "Failed to delete vendor credit" };
  }
}
