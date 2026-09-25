"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getTenantOrgId } from "@/lib/tenant";
import { generateNextDocumentNumber } from "@/lib/documentNumbering";
import { syncSystemLedgers } from "./accountingActions";

export interface CreateSalesReturnItemInput {
  productId: string;
  quantity: number;
  condition: "RESTOCKABLE" | "DAMAGED" | "SCRAP";
  reason?: string;
  unitPrice: number;
  totalAmount?: number;
}

export interface CreateSalesReturnInput {
  customerId: string;
  invoiceId?: string;
  orderId?: string;
  warehouseId?: string;
  reason: string;
  condition?: "RESTOCKABLE" | "DAMAGED" | "SCRAP";
  notes?: string;
  inspectedBy?: string;
  autoGenerateCreditNote?: boolean;
  items: CreateSalesReturnItemInput[];
}

export async function createSalesReturn(data: CreateSalesReturnInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    if (!data.customerId) return { error: "Customer is required" };
    if (!data.items || data.items.length === 0) return { error: "At least one item is required" };

    const organizationId = await getTenantOrgId();

    // Generate Return Number
    let returnNumber: string;
    try {
      returnNumber = await generateNextDocumentNumber(organizationId || "", "SALES_RETURN");
    } catch {
      const count = await prisma.salesReturn.count({ where: { organizationId } });
      const year = new Date().getFullYear();
      returnNumber = `RMA-${year}-${String(count + 1).padStart(4, "0")}`;
    }

    const result = await prisma.$transaction(async (tx) => {
      let linkedCreditNoteId: string | null = null;

      // 1. If autoGenerateCreditNote, calculate amounts and create CreditNote
      if (data.autoGenerateCreditNote) {
        let nextCnNumber: string;
        try {
          nextCnNumber = await generateNextDocumentNumber(organizationId || "", "CREDIT_NOTE");
        } catch {
          const cnCount = await tx.creditNote.count({ where: { organizationId } });
          const year = new Date().getFullYear();
          nextCnNumber = `CN-${year}-${String(cnCount + 1).padStart(4, "0")}`;
        }

        // Fetch customer and company to determine GST state
        const customer = await tx.customer.findFirst({
          where: { id: data.customerId, ...(organizationId ? { organizationId } : {}) }
        });
        const company = await tx.companySettings.findFirst({
          where: organizationId ? { organizationId } : {}
        });

        const companyState = (company?.state || "Delhi").trim().toLowerCase();
        const customerState = (customer?.state || companyState).trim().toLowerCase();
        const isInterstate = companyState !== customerState;

        // Fetch products for line item descriptions
        const productIds = data.items.map((it) => it.productId);
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, sku: true }
        });
        const productMap = new Map(products.map((p) => [p.id, p]));

        let totalSubtotal = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;
        let grandTotal = 0;

        const cnItems = data.items.map((it) => {
          const p = productMap.get(it.productId);
          const qty = Number(it.quantity) || 1;
          const price = Number(it.unitPrice) || 0;
          const taxable = qty * price;
          const gstRate = 12; // Standard 12% apparel/goods default
          const taxAmt = (taxable * gstRate) / 100;

          let cgst = 0;
          let sgst = 0;
          let igst = 0;

          if (isInterstate) {
            igst = taxAmt;
          } else {
            cgst = taxAmt / 2;
            sgst = taxAmt / 2;
          }

          const itemTotal = taxable + taxAmt;
          totalSubtotal += taxable;
          totalCgst += cgst;
          totalSgst += sgst;
          totalIgst += igst;
          grandTotal += itemTotal;

          return {
            productId: it.productId,
            description: p?.name ? `Returned: ${p.name}` : "Returned Item",
            sku: p?.sku || null,
            hsnCode: "6109",
            quantity: qty,
            unit: "pcs",
            rate: price,
            taxableAmount: taxable,
            gstRate,
            cgst,
            sgst,
            igst,
            total: itemTotal
          };
        });

        const creditNote = await tx.creditNote.create({
          data: {
            organizationId,
            creditNoteNumber: nextCnNumber,
            customerId: data.customerId,
            invoiceId: data.invoiceId || null,
            orderId: data.orderId || null,
            reason: data.reason || "Sales Return",
            status: "OPEN",
            subtotal: totalSubtotal,
            taxAmount: totalCgst + totalSgst + totalIgst,
            cgst: totalCgst,
            sgst: totalSgst,
            igst: totalIgst,
            totalAmount: grandTotal,
            allocatedAmount: 0,
            balanceAmount: grandTotal,
            notes: `Auto-generated from RMA Return #${returnNumber}. Reason: ${data.reason}`,
            items: {
              create: cnItems
            }
          }
        });

        linkedCreditNoteId = creditNote.id;
      }

      // 2. Create Sales Return record
      const salesReturn = await tx.salesReturn.create({
        data: {
          organizationId,
          returnNumber,
          customerId: data.customerId,
          invoiceId: data.invoiceId || null,
          orderId: data.orderId || null,
          creditNoteId: linkedCreditNoteId,
          returnDate: new Date(),
          reason: data.reason,
          status: "RECEIVED",
          condition: data.condition || "RESTOCKABLE",
          warehouseId: data.warehouseId || null,
          notes: data.notes || null,
          inspectedBy: data.inspectedBy || session.user?.name || "QC Inspector",
          items: {
            create: data.items.map((it) => ({
              productId: it.productId,
              quantity: Number(it.quantity) || 1,
              condition: it.condition || "RESTOCKABLE",
              reason: it.reason || null,
              unitPrice: Number(it.unitPrice) || 0,
              totalAmount: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0)
            }))
          }
        },
        include: {
          customer: true,
          warehouse: true,
          creditNote: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });

      // 3. If any items are RESTOCKABLE and warehouse is designated, restock inventory
      for (const item of data.items) {
        if (item.condition === "RESTOCKABLE" && Number(item.quantity) > 0) {
          // Increment Product overall stock
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: { increment: Number(item.quantity) }
            }
          });

          // Increment Warehouse Stock if warehouse specified
          if (data.warehouseId) {
            await tx.warehouseStock.upsert({
              where: {
                warehouseId_productId: {
                  warehouseId: data.warehouseId,
                  productId: item.productId
                }
              },
              create: {
                organizationId,
                warehouseId: data.warehouseId,
                productId: item.productId,
                quantityOnHand: Number(item.quantity)
              },
              update: {
                quantityOnHand: { increment: Number(item.quantity) }
              }
            });
          }
        }
      }

      return salesReturn;
    });

    // If a credit note was linked, sync accounting ledgers in the background
    if (result.creditNoteId) {
      try {
        await syncSystemLedgers();
      } catch (err) {
        console.error("Ledger sync error on sales return credit note:", err);
      }
    }

    revalidatePath("/sales-returns");
    revalidatePath("/credit-notes");
    revalidatePath("/products");
    revalidatePath("/customers");

    return { success: true, salesReturn: result };
  } catch (error: any) {
    console.error("createSalesReturn error:", error);
    return { error: error?.message || "Failed to create sales return" };
  }
}

export async function getSalesReturns(filters?: {
  search?: string;
  status?: string;
  condition?: string;
  customerId?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized", salesReturns: [] };

    const organizationId = await getTenantOrgId();
    const where: any = {
      ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {})
    };

    if (filters?.status && filters.status !== "All") {
      where.status = filters.status;
    }

    if (filters?.condition && filters.condition !== "All") {
      where.condition = filters.condition;
    }

    if (filters?.customerId && filters.customerId !== "All") {
      where.customerId = filters.customerId;
    }

    if (filters?.search) {
      const q = filters.search.trim();
      where.OR = [
        { returnNumber: { contains: q, mode: "insensitive" } },
        { reason: { contains: q, mode: "insensitive" } },
        { customer: { businessName: { contains: q, mode: "insensitive" } } },
        { customer: { contactPerson: { contains: q, mode: "insensitive" } } },
        { invoice: { invoiceNumber: { contains: q, mode: "insensitive" } } }
      ];
    }

    const salesReturns = await prisma.salesReturn.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            mobile: true,
            gstNumber: true,
            city: true,
            state: true
          }
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true
          }
        },
        creditNote: {
          select: {
            id: true,
            creditNoteNumber: true,
            totalAmount: true,
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
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, salesReturns };
  } catch (error: any) {
    console.error("getSalesReturns error:", error);
    return { error: error?.message || "Failed to fetch sales returns", salesReturns: [] };
  }
}

export async function getSalesReturnById(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const organizationId = await getTenantOrgId();

    const salesReturn = await prisma.salesReturn.findFirst({
      where: {
        id,
        ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {})
      },
      include: {
        customer: true,
        warehouse: true,
        invoice: true,
        order: true,
        creditNote: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!salesReturn) return { error: "Sales return not found" };

    return { success: true, salesReturn };
  } catch (error: any) {
    console.error("getSalesReturnById error:", error);
    return { error: error?.message || "Failed to fetch sales return" };
  }
}

export async function updateSalesReturnStatus(id: string, status: string, notes?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const organizationId = await getTenantOrgId();

    const salesReturn = await prisma.salesReturn.updateMany({
      where: {
        id,
        ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {})
      },
      data: {
        status,
        ...(notes ? { notes } : {})
      }
    });

    revalidatePath("/sales-returns");
    return { success: true, count: salesReturn.count };
  } catch (error: any) {
    console.error("updateSalesReturnStatus error:", error);
    return { error: error?.message || "Failed to update return status" };
  }
}

export async function deleteSalesReturn(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const organizationId = await getTenantOrgId();

    await prisma.salesReturn.deleteMany({
      where: {
        id,
        ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {})
      }
    });

    revalidatePath("/sales-returns");
    return { success: true };
  } catch (error: any) {
    console.error("deleteSalesReturn error:", error);
    return { error: error?.message || "Failed to delete sales return" };
  }
}

export async function deleteMultipleSalesReturns(ids: string[]) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    if (!ids || ids.length === 0) return { error: "No items selected" };

    const organizationId = await getTenantOrgId();

    const result = await prisma.salesReturn.deleteMany({
      where: {
        id: { in: ids },
        ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {})
      }
    });

    revalidatePath("/sales-returns");
    return { success: true, count: result.count };
  } catch (error: any) {
    console.error("deleteMultipleSalesReturns error:", error);
    return { error: error?.message || "Failed to bulk delete sales returns" };
  }
}
