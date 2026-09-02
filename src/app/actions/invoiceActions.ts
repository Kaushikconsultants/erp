"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getTenantOrgId } from "@/lib/tenant";
import { getCompanySettings } from "./companyActions";

async function canManageInvoices() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { allowed: false, session: null };
  const role = (session.user as any).role;
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return { allowed: true, session };
  const roleDef = await prisma.role.findUnique({ where: { name: role } });
  try {
    const perms = JSON.parse(roleDef?.permissions || '[]') as string[];
    return { allowed: perms.includes("Manage Invoices"), session };
  } catch { return { allowed: false, session }; }
}

export async function getInvoices(filters?: { status?: string; customerId?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const rawRole = (session.user as any).role || 'SALES';
    const normRole = String(rawRole).trim().toUpperCase();
    const userId = (session.user as any).id;
    const isSuperOrAdmin = normRole === 'ADMIN' || normRole === 'SUPER_ADMIN' || normRole === 'ACCOUNTS' || normRole === 'MANAGER';

    const where: any = {
      organizationId
    };
    if (filters?.status && filters.status !== 'All') where.status = filters.status;
    if (filters?.customerId) where.customerId = filters.customerId;

    if (!isSuperOrAdmin) {
      let employee = await prisma.employee.findUnique({ where: { userId } });
      if (!employee && organizationId) {
        employee = await prisma.employee.findFirst({ where: { organizationId, userId } });
      }
      if (!employee && session.user.email) {
        employee = await prisma.employee.findFirst({
          where: {
            organizationId,
            user: { email: { equals: session.user.email.trim(), mode: 'insensitive' } }
          }
        });
      }
      if (employee) {
        where.customer = { assignedSalespersonId: employee.id };
      } else {
        return { success: true, invoices: [] };
      }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { businessName: true, mobile: true, state: true } },
        order: { select: { orderNumber: true } },
        payments: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    // Auto-update overdue status
    const today = new Date();
    const updated = invoices.map(inv => {
      if (inv.status === 'Unpaid' && inv.dueDate && new Date(inv.dueDate) < today) {
        return { ...inv, status: 'Overdue' };
      }
      return inv;
    });

    return { success: true, invoices: updated };
  } catch (error: any) {
    return { error: "Failed to fetch invoices: " + error.message };
  }
}

export async function createInvoiceFromOrder(orderId: string, dueDate?: string, paymentTerms?: string) {
  const { allowed } = await canManageInvoices();
  if (!allowed) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();

    // Check if invoice already exists for this order
    const existing = await prisma.invoice.findFirst({
      where: {
        orderId,
        OR: [{ organizationId }, { organizationId: null }]
      }
    });
    if (existing) return { error: "Invoice already exists for this order", invoiceId: existing.id };

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [{ organizationId }, { organizationId: null }]
      },
      include: { customer: true }
    });
    if (!order) return { error: "Order not found" };

    if (!order.organizationId && organizationId) {
      await prisma.order.update({ where: { id: order.id }, data: { organizationId } }).catch(() => {});
    }

    // Generate invoice number
    const count = await prisma.invoice.count({ where: { organizationId } });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const invoice = await prisma.invoice.create({
      data: {
        organizationId,
        invoiceNumber,
        customerId: order.customerId,
        orderId: order.id,
        invoiceDate: new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: order.subtotal,
        taxAmount: order.tax,
        discountAmount: order.discount,
        totalAmount: order.totalValue,
        amountPaid: order.paymentReceived,
        amountDue: order.totalValue - order.paymentReceived,
        status: order.paymentReceived >= order.totalValue ? 'Paid' : order.paymentReceived > 0 ? 'Partially Paid' : 'Unpaid',
        paymentTerms: paymentTerms || 'Net 30',
      }
    });

    revalidatePath("/invoices");
    revalidatePath(`/orders/${orderId}`);
    return { success: true, invoice };
  } catch (error: any) {
    return { error: "Failed to create invoice: " + error.message };
  }
}

export async function createManualInvoice(data: {
  customerId: string;
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  dueDate?: string;
  paymentTerms?: string;
  notes?: string;
}) {
  const { allowed } = await canManageInvoices();
  if (!allowed) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const count = await prisma.invoice.count({ where: { organizationId } });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const invoice = await prisma.invoice.create({
      data: {
        organizationId,
        invoiceNumber,
        customerId: data.customerId,
        invoiceDate: new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        discountAmount: data.discountAmount,
        totalAmount: data.totalAmount,
        amountPaid: 0,
        amountDue: data.totalAmount,
        status: 'Unpaid',
        paymentTerms: data.paymentTerms || 'Net 30',
        notes: data.notes || null,
      }
    });

    revalidatePath("/invoices");
    return { success: true, invoice };
  } catch (error: any) {
    return { error: "Failed to create invoice: " + error.message };
  }
}

export async function getInvoiceById(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        order: { include: { items: { include: { product: true } } } },
        payments: { orderBy: { paymentDate: 'desc' } },
      }
    });
    if (!invoice) return { error: "Invoice not found" };
    return { success: true, invoice };
  } catch (error: any) {
    return { error: "Failed to fetch invoice" };
  }
}

export async function cancelInvoice(id: string) {
  const { allowed } = await canManageInvoices();
  if (!allowed) return { error: "Unauthorized" };
  try {
    await prisma.invoice.update({ where: { id }, data: { status: 'Cancelled' } });
    revalidatePath("/invoices");
    return { success: true };
  } catch { return { error: "Failed to cancel invoice" }; }
}

export async function updateInvoice(id: string, data: {
  invoiceDate?: string;
  dueDate?: string;
  paymentTerms?: string;
  status?: string;
  notes?: string;
  totalAmount?: number;
  amountPaid?: number;
}) {
  const { allowed } = await canManageInvoices();
  if (!allowed) return { error: "Unauthorized" };

  try {
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) return { error: "Invoice not found" };

    const totalAmount = data.totalAmount !== undefined ? data.totalAmount : existing.totalAmount;
    const amountPaid = data.amountPaid !== undefined ? data.amountPaid : existing.amountPaid;
    const amountDue = Math.max(0, totalAmount - amountPaid);

    let status = data.status || existing.status;
    if (data.status === undefined) {
      if (amountDue <= 0) status = "Paid";
      else if (amountPaid > 0) status = "Partially Paid";
      else status = "Unpaid";
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        paymentTerms: data.paymentTerms !== undefined ? data.paymentTerms : undefined,
        status,
        notes: data.notes !== undefined ? data.notes : undefined,
        totalAmount,
        amountPaid,
        amountDue,
      }
    });

    revalidatePath("/invoices");
    return { success: true, invoice: updated };
  } catch (error: any) {
    return { error: "Failed to update invoice: " + error.message };
  }
}

export async function deleteInvoice(id: string) {
  const { allowed } = await canManageInvoices();
  if (!allowed) return { error: "Unauthorized" };

  try {
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) return { error: "Invoice not found" };

    // Unlink any credit notes
    await prisma.creditNote.updateMany({
      where: { invoiceId: id },
      data: { invoiceId: null }
    });

    // Unlink or delete associated payments
    await prisma.payment.updateMany({
      where: { invoiceId: id },
      data: { invoiceId: null }
    });

    await prisma.invoice.delete({
      where: { id }
    });

    if (existing.orderId) {
      await prisma.orderItem.deleteMany({ where: { orderId: existing.orderId } }).catch(() => {});
      await prisma.eWayBill.deleteMany({ where: { orderId: existing.orderId } }).catch(() => {});
      await prisma.payment.updateMany({ where: { orderId: existing.orderId }, data: { orderId: null } }).catch(() => {});
      await prisma.order.delete({ where: { id: existing.orderId } }).catch(e => console.warn("Failed to delete order with invoice", e));
    }

    revalidatePath("/invoices");
    revalidatePath("/orders");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to delete invoice: " + error.message };
  }
}

// Accounts receivable ageing
export async function getReceivablesAgeing() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();
    const invoices = await prisma.invoice.findMany({
      where: { 
        organizationId,
        status: { in: ['Unpaid', 'Partially Paid', 'Overdue'] } 
      },
      include: { customer: { select: { businessName: true, mobile: true } } },
      orderBy: { dueDate: 'asc' }
    });

    const today = new Date();
    const ageing = {
      current: [] as any[],
      days1_30: [] as any[],
      days31_60: [] as any[],
      days61_90: [] as any[],
      above90: [] as any[],
    };

    invoices.forEach(inv => {
      if (!inv.dueDate) { ageing.current.push(inv); return; }
      const daysPast = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysPast <= 0) ageing.current.push(inv);
      else if (daysPast <= 30) ageing.days1_30.push(inv);
      else if (daysPast <= 60) ageing.days31_60.push(inv);
      else if (daysPast <= 90) ageing.days61_90.push(inv);
      else ageing.above90.push(inv);
    });

    return { success: true, ageing };
  } catch (error: any) {
    return { error: "Failed to fetch ageing report" };
  }
}

/**
 * Fetch all comprehensive data required to edit an invoice:
 * - Invoice details
 * - Customer & Shipping / Billing address
 * - Order & Order items with product details
 * - Products catalog (for autocomplete / adding items)
 * - Customers list (for switching / selecting customer)
 * - Company state settings (for auto tax calculation)
 */
export async function getInvoiceForFullEdit(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        order: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    articleNumber: true,
                    sellingPrice: true,
                    hsnCode: true,
                    stockQuantity: true,
                  }
                }
              }
            }
          }
        },
        payments: { orderBy: { paymentDate: 'desc' } }
      }
    });

    if (!invoice) return { error: "Invoice not found" };

    // Fetch active products in this organization
    const products = await prisma.product.findMany({
      where: organizationId ? { organizationId, status: "Active" } : { status: "Active" },
      select: {
        id: true,
        name: true,
        sku: true,
        articleNumber: true,
        sellingPrice: true,
        hsnCode: true,
        stockQuantity: true,
      },
      orderBy: { name: "asc" },
      take: 200,
    });

    // Fetch customers
    const customers = await prisma.customer.findMany({
      where: organizationId ? { organizationId } : undefined,
      select: {
        id: true,
        businessName: true,
        contactPerson: true,
        mobile: true,
        email: true,
        billingAddress: true,
        shippingAddress: true,
        state: true,
        gstNumber: true,
        pan: true,
      },
      orderBy: { businessName: "asc" },
      take: 200,
    });

    const companyRes = await getCompanySettings();
    const companyState = companyRes.settings?.state || "Haryana";

    return {
      success: true,
      invoice,
      products,
      customers,
      companyState,
    };
  } catch (error: any) {
    return { error: "Failed to load invoice editor data: " + error.message };
  }
}

/**
 * Save complete invoice changes atomically:
 * - Updates Invoice (dates, number, terms, status, totals, notes)
 * - Updates Customer details (business name, phone, email, addresses, state, GSTIN)
 * - Synchronizes Order & OrderItems (line items, pricing, discounts, GST rates)
 */
export async function saveFullInvoiceDetails(payload: {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  paymentTerms?: string;
  status: string;
  notes?: string;

  // Customer Details
  customerId: string;
  customerName?: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  billingAddress?: string;
  shippingAddress?: string;
  state?: string;
  gstin?: string;
  placeOfSupply?: string;
  isInterstate?: boolean;

  // Line Items
  items: Array<{
    id?: string;
    productId?: string;
    productName?: string;
    hsnCode?: string;
    quantity: number;
    rate: number;
    discount?: number;
    gstRate: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    total: number;
  }>;

  // Totals
  subtotal: number;
  discountAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxAmount: number;
  shippingCharges?: number;
  roundOff?: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
}) {
  const { allowed } = await canManageInvoices();
  if (!allowed) return { error: "Unauthorized" };

  try {
    const existing = await prisma.invoice.findUnique({
      where: { id: payload.invoiceId },
      include: { order: true, customer: true }
    });
    if (!existing) return { error: "Invoice not found" };

    const organizationId = existing.organizationId || (await getTenantOrgId());

    // 1. Check for duplicate invoiceNumber if changed
    if (payload.invoiceNumber.trim() !== existing.invoiceNumber) {
      const duplicate = await prisma.invoice.findFirst({
        where: {
          invoiceNumber: payload.invoiceNumber.trim(),
          id: { not: payload.invoiceId },
          ...(organizationId ? { organizationId } : {})
        }
      });
      if (duplicate) {
        return { error: `Invoice number "${payload.invoiceNumber}" is already in use by another invoice.` };
      }
    }

    // 2. Update Customer Details if provided
    if (payload.customerId) {
      await prisma.customer.update({
        where: { id: payload.customerId },
        data: {
          businessName: payload.customerName || undefined,
          contactPerson: payload.contactPerson || undefined,
          mobile: payload.mobile || undefined,
          email: payload.email || undefined,
          billingAddress: payload.billingAddress || undefined,
          shippingAddress: payload.shippingAddress || undefined,
          state: payload.state || undefined,
          gstNumber: payload.gstin || undefined,
        }
      }).catch((err) => console.warn("Could not update customer record:", err));
    }

    // 3. Find or manage products for line items
    const defaultProduct = await prisma.product.findFirst({
      where: organizationId ? { organizationId } : undefined
    });

    let orderId = existing.orderId;

    if (!orderId) {
      // Create an underlying order for manual invoice if needed
      const defaultEmp = await prisma.employee.findFirst({
        where: organizationId ? { organizationId } : undefined
      });
      const newOrder = await prisma.order.create({
        data: {
          organizationId,
          orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
          customerId: payload.customerId,
          salespersonId: defaultEmp?.id || "",
          orderDate: new Date(payload.invoiceDate),
          subtotal: payload.subtotal,
          discount: payload.discountAmount,
          tax: payload.taxAmount,
          cgst: payload.cgst,
          sgst: payload.sgst,
          igst: payload.igst,
          isInterstate: payload.isInterstate || false,
          placeOfSupply: payload.placeOfSupply || payload.state,
          totalValue: payload.totalAmount,
          paymentReceived: payload.amountPaid,
          outstandingAmount: payload.amountDue,
          paymentStatus: payload.amountDue <= 0 ? 'Paid' : payload.amountPaid > 0 ? 'Partially Paid' : 'Unpaid',
          orderStatus: 'Processing',
          notes: payload.notes || `Invoice ${payload.invoiceNumber}`,
        }
      });
      orderId = newOrder.id;
    } else {
      // Update existing order
      await prisma.order.update({
        where: { id: orderId },
        data: {
          customerId: payload.customerId,
          subtotal: payload.subtotal,
          discount: payload.discountAmount,
          tax: payload.taxAmount,
          cgst: payload.cgst,
          sgst: payload.sgst,
          igst: payload.igst,
          isInterstate: payload.isInterstate || false,
          placeOfSupply: payload.placeOfSupply || payload.state,
          totalValue: payload.totalAmount,
          paymentReceived: payload.amountPaid,
          outstandingAmount: payload.amountDue,
          paymentStatus: payload.amountDue <= 0 ? 'Paid' : payload.amountPaid > 0 ? 'Partially Paid' : 'Unpaid',
          notes: payload.notes || undefined,
        }
      });
    }

    // 4. Synchronize OrderItems
    if (orderId && Array.isArray(payload.items) && payload.items.length > 0) {
      await prisma.orderItem.deleteMany({ where: { orderId } });

      for (const item of payload.items) {
        let pId = item.productId;
        if (!pId) {
          if (defaultProduct) {
            pId = defaultProduct.id;
          } else {
            const createdProd = await prisma.product.create({
              data: {
                organizationId,
                name: item.productName || "General Item",
                category: "General",
                sku: `SKU-${Date.now().toString().slice(-6)}`,
                sellingPrice: item.rate,
                purchasePrice: item.rate * 0.7,
                mrp: item.rate,
                hsnCode: item.hsnCode || "6109"
              }
            });
            pId = createdProd.id;
          }
        }

        await prisma.orderItem.create({
          data: {
            orderId,
            productId: pId,
            quantity: Math.max(1, Math.round(item.quantity)),
            rate: item.rate,
            hsnCode: item.hsnCode || "6109",
            gstRate: item.gstRate,
            cgst: item.cgst || 0,
            sgst: item.sgst || 0,
            igst: item.igst || 0,
            total: item.total
          }
        });
      }
    }

    // 5. Update Invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id: payload.invoiceId },
      data: {
        invoiceNumber: payload.invoiceNumber.trim(),
        orderId,
        customerId: payload.customerId,
        invoiceDate: new Date(payload.invoiceDate),
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        paymentTerms: payload.paymentTerms || 'Net 30',
        status: payload.status,
        notes: payload.notes || null,
        subtotal: payload.subtotal,
        discountAmount: payload.discountAmount,
        taxAmount: payload.taxAmount,
        totalAmount: payload.totalAmount,
        amountPaid: payload.amountPaid,
        amountDue: payload.amountDue,
      },
      include: {
        customer: { select: { businessName: true, mobile: true, state: true } },
        order: { select: { orderNumber: true } },
        payments: true
      }
    });

    revalidatePath("/invoices");
    if (orderId) {
      revalidatePath(`/orders/${orderId}`);
      revalidatePath(`/orders/${orderId}/invoice`);
    }
    revalidatePath("/orders");
    revalidatePath("/customers");

    return { success: true, invoice: updatedInvoice };
  } catch (error: any) {
    return { error: "Failed to save invoice: " + error.message };
  }
}
