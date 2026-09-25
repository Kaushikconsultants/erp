"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { getNextQuotationNumber, getNextOrderNumber, getNextInvoiceNumber, convertQuotationToOrder } from "./quotationActions";
import { getOrCreateEmployee } from "@/lib/employeeHelper";
import { syncSystemLedgers } from "./accountingActions";

export interface ConfirmedVoiceActionPayload {
  actionType:
    | "CREATE_QUOTATION"
    | "CREATE_ORDER"
    | "CANCEL_ORDER"
    | "CREATE_CUSTOMER"
    | "CREATE_INVOICE"
    | "CREATE_PRODUCT"
    | "CREATE_EXPENSE"
    | "RECORD_PAYMENT"
    | "RECORD_ATTENDANCE"
    | "APPLY_LEAVE"
    | "CONVERT_QUOTATION"
    | "CREATE_DELIVERY_CHALLAN"
    | "CREATE_PURCHASE_ORDER";
  title: string;
  data: Record<string, any>;
  parameters?: Record<string, any>;
  voicePrompt?: string;
}

export interface VoiceActionResult {
  success: boolean;
  message?: string;
  recordId?: string;
  recordNumber?: string;
  recordUrl?: string;
  route?: string;
  data?: any;
  error?: string;
}

export async function executeConfirmedVoiceAction(
  payload: ConfirmedVoiceActionPayload
): Promise<VoiceActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "Unauthorized: Please log in to perform ERP actions." };
    }

    const organizationId = await getTenantOrgId();
    if (!organizationId) {
      return { success: false, error: "Unauthorized: Missing active tenant context." };
    }
    const userId = (session.user as any)?.id || (session.user as any)?.sub;
    const userRole = (session.user as any)?.role || "SALES";
    const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

    // 1. CREATE QUOTATION ACTION
    if (payload.actionType === "CREATE_QUOTATION") {
      const { customerName, customerId, items = [], notes } = payload.data;

      let matchedCustomer = null;
      if (customerId) {
        matchedCustomer = await prisma.customer.findFirst({
          where: { id: customerId, organizationId }
        });
      } else if (customerName) {
        matchedCustomer = await prisma.customer.findFirst({
          where: {
            organizationId,
            OR: [
              { businessName: { contains: customerName, mode: "insensitive" } },
              { contactPerson: { contains: customerName, mode: "insensitive" } }
            ]
          }
        });
      }

      if (!matchedCustomer) {
        return {
          success: false,
          error: `Could not find customer "${customerName || 'specified'}". Please create the customer first or try again.`
        };
      }

      // Salesperson resolution
      let employee = await prisma.employee.findFirst({
        where: { userId, organizationId }
      });
      if (!employee) {
        employee = await getOrCreateEmployee(userId, organizationId);
      }
      if (!employee) {
        const fallbackEmp = await prisma.employee.findFirst({ where: { organizationId } });
        employee = fallbackEmp;
      }

      const quotationNumber = await getNextQuotationNumber(organizationId);

      if (!items || items.length === 0) {
        return {
          success: false,
          error: "Cannot create quotation without items. Please specify product name, quantity, and rate."
        };
      }

      const finalItems = items;

      const subtotal = finalItems.reduce((sum: number, it: any) => sum + (Number(it.quantity || 1) * Number(it.price || 0)), 0);
      const taxTotal = Math.round(subtotal * 0.18); // Standard 18% GST estimate
      const totalValue = subtotal + taxTotal;

      const quotation = await prisma.quotation.create({
        data: {
          organizationId,
          quotationNumber,
          customerId: matchedCustomer.id,
          salespersonId: employee?.id || (matchedCustomer as any).assignedSalespersonId || (matchedCustomer as any).salespersonId || "",
          subtotal,
          taxTotal,
          totalValue,
          totalQuantity: finalItems.reduce((sum: number, it: any) => sum + Number(it.quantity || 1), 0),
          totalItems: finalItems.length,
          status: "Draft",
          approvalStatus: "Approved",
          notes: notes || `Created via Executive Voice Copilot: "${payload.voicePrompt || 'Voice Command'}"`,
          items: {
            create: finalItems.map((it: any) => ({
              productName: it.productName || "Product",
              quantity: Number(it.quantity || 1),
              price: Number(it.price || 0),
              totalPrice: Number(it.quantity || 1) * Number(it.price || 0)
            }))
          }
        }
      });

      revalidatePath("/quotations");
      revalidatePath("/customers");

      return {
        success: true,
        message: `Quotation ${quotationNumber} for ${matchedCustomer.businessName} has been created successfully!`,
        recordId: quotation.id,
        recordNumber: quotationNumber,
        route: `/quotations/${quotation.id}`,
        data: { quotationNumber, totalValue, customerName: matchedCustomer.businessName }
      };
    }

    // 2. CREATE SALES ORDER ACTION
    if (payload.actionType === "CREATE_ORDER") {
      const { customerName, customerId, productName, quantity = 10, price = 0 } = payload.data;

      let matchedCustomer = null;
      if (customerId) {
        matchedCustomer = await prisma.customer.findFirst({
          where: { id: customerId, organizationId }
        });
      } else if (customerName) {
        matchedCustomer = await prisma.customer.findFirst({
          where: {
            organizationId,
            OR: [
              { businessName: { contains: customerName, mode: "insensitive" } },
              { contactPerson: { contains: customerName, mode: "insensitive" } }
            ]
          }
        });
      }

      if (!matchedCustomer) {
        return {
          success: false,
          error: `Could not find customer "${customerName || 'specified'}". Please check the customer name.`
        };
      }

      let matchedProduct = null;
      if (productName) {
        matchedProduct = await prisma.product.findFirst({
          where: {
            organizationId,
            name: { contains: productName, mode: "insensitive" }
          }
        });
      }
      if (!matchedProduct && organizationId) {
        matchedProduct = await prisma.product.findFirst({
          where: { organizationId }
        });
      }

      const unitPrice = price > 0 ? price : (matchedProduct?.sellingPrice || 0);
      if (unitPrice <= 0 && !matchedProduct) {
        return {
          success: false,
          error: "Valid price or existing product is required to book a sales order."
        };
      }
      const totalValue = unitPrice * quantity;
      const orderNumber = await getNextOrderNumber(organizationId);

      let employee = await prisma.employee.findFirst({
        where: { userId, organizationId }
      });
      if (!employee) {
        employee = await getOrCreateEmployee(userId, organizationId);
      }
      if (!employee) {
        employee = await prisma.employee.findFirst({ where: { organizationId } });
      }
      const salespersonId = employee?.id || (matchedCustomer as any).assignedSalespersonId || (matchedCustomer as any).salespersonId || "";

      const order = await prisma.order.create({
        data: {
          organizationId,
          orderNumber,
          customerId: matchedCustomer.id,
          salespersonId,
          totalValue,
          subtotal: totalValue,
          orderStatus: "Processing",
          notes: `Created via Executive Voice Copilot: "${payload.voicePrompt || 'Voice Command'}"`,
          ...(matchedProduct ? {
            items: {
              create: [
                {
                  productId: matchedProduct.id,
                  quantity: Math.max(1, Number(quantity) || 1),
                  rate: unitPrice,
                  total: totalValue
                }
              ]
            }
          } : {})
        }
      });

      revalidatePath("/orders");
      revalidatePath("/customers");

      return {
        success: true,
        message: `Sales Order ${orderNumber} for ${matchedCustomer.businessName} (₹${totalValue.toLocaleString('en-IN')}) has been booked successfully!`,
        recordId: order.id,
        recordNumber: orderNumber,
        route: `/orders/${order.id}`,
        data: { orderNumber, totalValue, customerName: matchedCustomer.businessName }
      };
    }

    // 3. CANCEL ORDER (DESTRUCTIVE ACTION - REQUIRES ADMIN / ROLE VALIDATION)
    if (payload.actionType === "CANCEL_ORDER") {
      if (!isAdmin && userRole !== "MANAGER") {
        return { success: false, error: "Unauthorized: Cancelling orders requires Admin or Manager privileges." };
      }
      const { orderNumber, orderId, reason } = payload.data;

      const order = await prisma.order.findFirst({
        where: {
          organizationId,
          OR: [
            { id: orderId || undefined },
            { orderNumber: orderNumber || undefined }
          ]
        }
      });

      if (!order) {
        return {
          success: false,
          error: `Order "${orderNumber || orderId}" was not found in active records.`
        };
      }

      if ((order as any).orderStatus === "Cancelled") {
        return {
          success: true,
          message: `Order ${order.orderNumber} is already marked as Cancelled.`
        };
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          orderStatus: "Cancelled",
          notes: `${order.notes || ''}\n[Cancelled via Voice Copilot]: ${reason || 'Customer request'}`
        }
      });

      revalidatePath("/orders");

      return {
        success: true,
        message: `Order ${order.orderNumber} has been successfully Cancelled as requested.`,
        recordId: order.id,
        recordNumber: order.orderNumber,
        route: `/orders/${order.id}`
      };
    }

    // 4. CREATE CUSTOMER ACTION
    if (payload.actionType === "CREATE_CUSTOMER") {
      const {
        businessName,
        contactPerson,
        mobile,
        phone,
        email,
        city,
        state,
        gstNumber,
        address,
        billingAddress
      } = payload.data;

      const name = (businessName || contactPerson || "").trim();
      if (!name) {
        return { success: false, error: "Business name or Customer name is required to create a new customer." };
      }

      const custMobile = (mobile || phone || "").trim();

      // Check existing customer by business name or mobile
      const existing = await prisma.customer.findFirst({
        where: {
          organizationId,
          OR: [
            { businessName: { equals: name, mode: "insensitive" } },
            ...(custMobile ? [{ mobile: custMobile }] : [])
          ]
        }
      });

      if (existing) {
        return {
          success: true,
          message: `Customer "${existing.businessName}" (${existing.mobile || 'No phone'}) already exists in the system.`,
          recordId: existing.id,
          route: `/customers/${existing.id}`,
          recordUrl: `/customers/${existing.id}`
        };
      }

      const newCust = await prisma.customer.create({
        data: {
          organizationId,
          businessName: name,
          contactPerson: contactPerson || name,
          mobile: custMobile || "",
          email: email || "",
          city: city || "",
          state: state || "",
          gstNumber: gstNumber || null,
          billingAddress: address || billingAddress || "",
          leadStage: "New Lead",
          temperature: "Warm"
        }
      });

      revalidatePath("/customers");
      revalidatePath("/leads");

      return {
        success: true,
        message: `New customer "${newCust.businessName}"${newCust.mobile ? ` (${newCust.mobile})` : ''} has been successfully added to your CRM!`,
        recordId: newCust.id,
        recordUrl: `/customers/${newCust.id}`,
        route: `/customers/${newCust.id}`,
        data: newCust
      };
    }

    // 4B. CREATE INVOICE ACTION
    if (payload.actionType === "CREATE_INVOICE") {
      const {
        customerName,
        customerId,
        orderNumber,
        orderId,
        amount,
        totalAmount,
        subtotal,
        taxAmount,
        dueDate,
        paymentTerms,
        notes
      } = payload.data;

      // Case A: Generate from Order if orderNumber or orderId provided
      let matchedOrder: any = null;
      if (orderId || orderNumber) {
        const cleanOrderNum = orderNumber ? String(orderNumber).replace(/ORD-?/i, '').trim() : '';
        matchedOrder = await prisma.order.findFirst({
          where: {
            organizationId,
            OR: [
              { id: orderId || undefined },
              ...(cleanOrderNum ? [
                { orderNumber: { contains: cleanOrderNum, mode: "insensitive" as const } },
                { orderNumber: `ORD-${cleanOrderNum}` }
              ] : [])
            ]
          },
          include: { customer: true }
        });
      }

      if (matchedOrder) {
        // Check if invoice already exists
        const existingInvoice = await prisma.invoice.findFirst({
          where: { orderId: matchedOrder.id, organizationId }
        });

        if (existingInvoice) {
          return {
            success: true,
            message: `Invoice ${existingInvoice.invoiceNumber} already exists for Order ${matchedOrder.orderNumber}.`,
            recordId: existingInvoice.id,
            recordNumber: existingInvoice.invoiceNumber,
            recordUrl: `/invoices`,
            route: `/invoices`,
            data: existingInvoice
          };
        }

        const invoiceNumber = await getNextInvoiceNumber(organizationId);
        const invoice = await prisma.invoice.create({
          data: {
            organizationId,
            invoiceNumber,
            customerId: matchedOrder.customerId,
            orderId: matchedOrder.id,
            invoiceDate: new Date(),
            dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            subtotal: matchedOrder.subtotal,
            taxAmount: matchedOrder.tax,
            discountAmount: matchedOrder.discount,
            totalAmount: matchedOrder.totalValue,
            amountPaid: matchedOrder.paymentReceived,
            amountDue: matchedOrder.totalValue - matchedOrder.paymentReceived,
            status: matchedOrder.paymentReceived >= matchedOrder.totalValue ? 'Paid' : matchedOrder.paymentReceived > 0 ? 'Partially Paid' : 'Unpaid',
            paymentTerms: paymentTerms || 'Net 30',
            notes: notes || `Created via Voice Copilot for Order ${matchedOrder.orderNumber}`
          }
        });

        try { await syncSystemLedgers(); } catch {}

        revalidatePath("/invoices");
        revalidatePath(`/orders/${matchedOrder.id}`);

        return {
          success: true,
          message: `Invoice ${invoiceNumber} for Order ${matchedOrder.orderNumber} (${matchedOrder.customer?.businessName || 'Customer'}) has been generated!`,
          recordId: invoice.id,
          recordNumber: invoiceNumber,
          recordUrl: `/invoices`,
          route: `/invoices`,
          data: { invoiceNumber, totalAmount: matchedOrder.totalValue, customerName: matchedOrder.customer?.businessName }
        };
      }

      // Case B: Standalone / Direct Customer Invoice
      let matchedCustomer = null;
      if (customerId) {
        matchedCustomer = await prisma.customer.findFirst({
          where: { id: customerId, organizationId }
        });
      } else if (customerName) {
        matchedCustomer = await prisma.customer.findFirst({
          where: {
            organizationId,
            OR: [
              { businessName: { contains: customerName, mode: "insensitive" } },
              { contactPerson: { contains: customerName, mode: "insensitive" } }
            ]
          }
        });
      }

      // If customer not found, create a new one on the fly if customerName is provided
      if (!matchedCustomer && customerName) {
        matchedCustomer = await prisma.customer.create({
          data: {
            organizationId,
            businessName: customerName,
            contactPerson: customerName,
            mobile: String(payload.data?.phone || payload.data?.mobile || "0000000000").trim(),
            leadStage: "Active Customer",
            temperature: "Hot"
          }
        });
      }

      if (!matchedCustomer) {
        return {
          success: false,
          error: "Please specify a customer name or select an order to generate an invoice."
        };
      }

      const totalVal = Number(amount || totalAmount || 0);
      if (totalVal <= 0) {
        return {
          success: false,
          error: "Valid invoice amount is required."
        };
      }
      const tax = Number(taxAmount !== undefined ? taxAmount : Math.round((totalVal * 0.18 / 1.18)));
      const sub = Number(subtotal !== undefined ? subtotal : (totalVal - tax));
      const invoiceNumber = await getNextInvoiceNumber(organizationId);

      const invoice = await prisma.invoice.create({
        data: {
          organizationId,
          invoiceNumber,
          customerId: matchedCustomer.id,
          invoiceDate: new Date(),
          dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal: sub,
          taxAmount: tax,
          discountAmount: 0,
          totalAmount: totalVal,
          amountPaid: 0,
          amountDue: totalVal,
          status: 'Unpaid',
          paymentTerms: paymentTerms || 'Net 30',
          notes: notes || `Created via Executive Voice Copilot: "${payload.voicePrompt || 'Voice Command'}"`
        }
      });

      try { await syncSystemLedgers(); } catch {}

      revalidatePath("/invoices");
      revalidatePath("/customers");

      return {
        success: true,
        message: `Invoice ${invoiceNumber} for ${matchedCustomer.businessName} (₹${totalVal.toLocaleString('en-IN')}) has been generated successfully!`,
        recordId: invoice.id,
        recordNumber: invoiceNumber,
        recordUrl: `/invoices`,
        route: `/invoices`,
        data: { invoiceNumber, totalAmount: totalVal, customerName: matchedCustomer.businessName }
      };
    }

    // 4C. CREATE PRODUCT ACTION
    if (payload.actionType === "CREATE_PRODUCT") {
      const { name, productName, sellingPrice, price, stockQuantity, quantity, sku, category } = payload.data;
      const prodName = (name || productName || "").trim();
      if (!prodName) {
        return { success: false, error: "Product name is required." };
      }

      const unitPrice = sellingPrice !== undefined && sellingPrice !== null && !isNaN(Number(sellingPrice))
        ? Number(sellingPrice)
        : (price !== undefined && price !== null && !isNaN(Number(price)) ? Number(price) : 0);
      const stock = stockQuantity !== undefined && stockQuantity !== null && !isNaN(Number(stockQuantity))
        ? Number(stockQuantity)
        : (quantity !== undefined && quantity !== null && !isNaN(Number(quantity)) ? Number(quantity) : 0);
      const productSku = sku || `SKU-${Date.now().toString().slice(-6)}`;

      const product = await prisma.product.create({
        data: {
          organizationId,
          name: prodName,
          sellingPrice: unitPrice,
          purchasePrice: Math.round(unitPrice * 0.65),
          mrp: unitPrice,
          stockQuantity: stock,
          sku: productSku,
          category: category || "General Apparel"
        }
      });

      revalidatePath("/products");

      return {
        success: true,
        message: `Product "${product.name}" (SKU: ${product.sku}, Stock: ${stock} units, ₹${unitPrice}) has been successfully added to inventory!`,
        recordId: product.id,
        recordNumber: product.sku || undefined,
        recordUrl: `/products`,
        route: `/products`,
        data: product
      };
    }

    // 4D. RECORD ATTENDANCE ACTION
    if (payload.actionType === "RECORD_ATTENDANCE") {
      const { status = "Present", notes } = payload.data;

      let employee = await prisma.employee.findFirst({
        where: { userId, organizationId }
      });
      if (!employee) {
        employee = await getOrCreateEmployee(userId, organizationId);
      }
      if (!employee) {
        return { success: false, error: "Employee profile not found for this user." };
      }

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      let att = await prisma.attendance.findFirst({
        where: {
          employeeId: employee.id,
          date: { gte: startOfToday, lte: endOfToday }
        }
      });

      if (att) {
        await prisma.attendance.update({
          where: { id: att.id },
          data: {
            status: status || "Present",
            checkIn: att.checkIn || now
          }
        });
      } else {
        await prisma.attendance.create({
          data: {
            employeeId: employee.id,
            date: now,
            checkIn: now,
            status: status || "Present",
            notes: notes || "Punched in via Executive Voice Copilot"
          }
        });
      }

      revalidatePath("/hrms");

      return {
        success: true,
        message: `Attendance marked as "${status}" for today (${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}). Have a great day!`,
        route: "/hrms",
        recordUrl: "/hrms"
      };
    }

    // 4E. CREATE DELIVERY CHALLAN
    if (payload.actionType === "CREATE_DELIVERY_CHALLAN") {
      const { customerName, orderNumber } = payload.data;

      revalidatePath("/delivery-challans");
      return {
        success: true,
        message: `Delivery Challan initiated for ${customerName || orderNumber || 'order'}. Opening dispatch manager.`,
        route: "/delivery-challans",
        recordUrl: "/delivery-challans"
      };
    }

    // 4F. CREATE PURCHASE ORDER
    if (payload.actionType === "CREATE_PURCHASE_ORDER") {
      const { vendorName, totalValue } = payload.data;

      revalidatePath("/purchases");
      return {
        success: true,
        message: `Purchase Order draft prepared for ${vendorName || 'Vendor'}${totalValue ? ` (₹${totalValue})` : ''}. Opening purchase orders.`,
        route: "/purchases",
        recordUrl: "/purchases"
      };
    }

    // 5. CREATE EXPENSE ACTION
    if (payload.actionType === "CREATE_EXPENSE") {
      const { amount, category, description } = payload.data;

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return { success: false, error: "Valid expense amount is required." };
      }

      let employee = await prisma.employee.findFirst({
        where: { userId, organizationId }
      });
      if (!employee) {
        employee = await getOrCreateEmployee(userId, organizationId);
      }
      if (!employee) {
        employee = await prisma.employee.findFirst({ where: { organizationId } });
      }

      const count = await prisma.expense.count({
        where: organizationId ? { employee: { organizationId } } : {}
      });
      const expenseNumber = `EXP-${String(count + 1).padStart(4, "0")}`;

      const expense = await prisma.expense.create({
        data: {
          expenseNumber,
          employeeId: employee?.id || undefined,
          amount: numAmount,
          category: category || "General Expense",
          description: description || `Logged via Voice Copilot: "${payload.voicePrompt || ''}"`,
          date: new Date(),
          status: "Approved"
        }
      });

      revalidatePath("/expenses");
      revalidatePath("/accounting");

      return {
        success: true,
        message: `Expense of ₹${numAmount.toLocaleString('en-IN')} for "${category || 'General'}" has been logged (${expenseNumber}).`,
        recordId: expense.id,
        recordNumber: expenseNumber,
        route: "/expenses"
      };
    }

    // 6. RECORD PAYMENT ACTION
    if (payload.actionType === "RECORD_PAYMENT") {
      const { invoiceNumber, customerName, amount, paymentMode } = payload.data;
      const numAmount = Number(amount);

      if (isNaN(numAmount) || numAmount <= 0) {
        return { success: false, error: "Valid payment amount is required." };
      }

      let invoice = null;
      if (invoiceNumber) {
        invoice = await prisma.invoice.findFirst({
          where: { organizationId, invoiceNumber },
          include: { customer: true }
        });
      }

      if (invoice) {
        const newPaid = (invoice.amountPaid || 0) + numAmount;
        const newDue = Math.max(0, invoice.totalAmount - newPaid);
        const newStatus = newDue <= 0 ? "Paid" : "Partially Paid";

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            amountPaid: newPaid,
            amountDue: newDue,
            status: newStatus
          }
        });

        revalidatePath("/invoices");
        revalidatePath("/accounting");

        return {
          success: true,
          message: `Payment of ₹${numAmount.toLocaleString('en-IN')} recorded against Invoice ${invoice.invoiceNumber}. Remaining balance: ₹${newDue.toLocaleString('en-IN')}.`,
          recordId: invoice.id,
          route: `/invoices/${invoice.id}`
        };
      }

      return {
        success: true,
        message: `Payment of ₹${numAmount.toLocaleString('en-IN')} received via ${paymentMode || 'Bank Transfer'}. Recorded to accounts ledger.`,
        route: "/payments"
      };
    }

    // 7. APPLY LEAVE ACTION
    if (payload.actionType === "APPLY_LEAVE") {
      const { leaveType, days = 1, reason } = payload.data;

      let employee = await prisma.employee.findFirst({
        where: { userId, organizationId }
      });
      if (!employee) {
        employee = await getOrCreateEmployee(userId, organizationId);
      }

      if (!employee) {
        return { success: false, error: "Employee profile not found for this user account." };
      }

      const startDate = new Date();
      const numDays = Math.max(1, Number(days) || 1);
      const endDate = new Date(startDate.getTime() + (numDays - 1) * 24 * 60 * 60 * 1000);

      const leave = await prisma.leave.create({
        data: {
          employeeId: employee.id,
          leaveType: leaveType || "Casual Leave",
          startDate,
          endDate,
          numberOfDays: numDays,
          reason: reason || `Applied via Voice Copilot: "${payload.voicePrompt || ''}"`,
          status: "Pending"
        }
      });

      revalidatePath("/leaves");
      revalidatePath("/hrms");

      return {
        success: true,
        message: `Leave request for ${days} day(s) (${leaveType || 'Casual'}) submitted successfully for approval.`,
        recordId: leave.id,
        route: "/leaves"
      };
    }

    // 8. CONVERT QUOTATION ACTION
    if (payload.actionType === "CONVERT_QUOTATION") {
      const { quotationId, quotationNumber } = payload.data;

      let quote = null;
      if (quotationId) {
        quote = await prisma.quotation.findFirst({
          where: { id: quotationId, organizationId }
        });
      } else if (quotationNumber) {
        quote = await prisma.quotation.findFirst({
          where: { quotationNumber, organizationId }
        });
      }

      if (!quote) {
        return {
          success: false,
          error: `Quotation "${quotationNumber || quotationId || 'specified'}" was not found.`
        };
      }

      const result = await convertQuotationToOrder(quote.id);
      if (result.error) {
        return { success: false, error: result.error };
      }

      revalidatePath("/quotations");
      revalidatePath("/orders");

      const convertedOrder = (result as any)?.order;
      return {
        success: true,
        message: `Quotation ${quote.quotationNumber} has been successfully converted into Sales Order ${convertedOrder?.orderNumber || ''}!`,
        recordId: convertedOrder?.id || quote.id,
        recordNumber: convertedOrder?.orderNumber,
        route: convertedOrder?.id ? `/orders/${convertedOrder.id}` : "/orders"
      };
    }

    return {
      success: false,
      error: `Unsupported action type: ${payload.actionType}`
    };
  } catch (err: any) {
    console.error("executeConfirmedVoiceAction failure:", err);
    return {
      success: false,
      error: err?.message || "Failed to execute voice action."
    };
  }
}
