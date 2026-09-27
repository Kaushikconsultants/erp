"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getNextOrderNumber } from "./quotationActions";
import { generateNextDocumentNumber } from "@/lib/documentNumbering";
import { calculateItemGst } from "@/lib/gstUtils";
import { DUMMY_GLASSWARE_PRODUCTS } from "@/lib/dummyProducts";

export interface CatalogOrderBuyerDetails {
  businessName: string;
  contactPerson: string;
  mobile: string;
  whatsappNumber?: string;
  email?: string;
  gstin?: string;
  shippingAddress: string;
  city: string;
  state: string;
  pincode: string;
  notes?: string;
  buyingStream?: "READY_STOCK" | "MADE_TO_ORDER";
  courierType?: "R3_COURIER" | "OWN_TRANSPORTER";
}

export interface CatalogOrderItemPayload {
  productId: string;
  quantity: number;
  boxPackOption?: number; // e.g. 2, 4, 6, 24
  notes?: string;
}

export async function getPublicCatalogData(productIds?: string[]) {
  try {
    let defaultOrg: any = null;
    try {
      defaultOrg = await prisma.organization.findFirst({
        where: {
          OR: [
            { slug: { in: ["r3-exports", "r3-enterprises", "tinkal-erp", "espon-global"] } },
            { name: { contains: "R3", mode: "insensitive" } }
          ]
        }
      }) || await prisma.organization.findFirst();
    } catch {
      defaultOrg = null;
    }

    const orgId = defaultOrg?.id;

    const whereClause: any = orgId ? { organizationId: orgId } : {};
    if (productIds && productIds.length > 0) {
      whereClause.id = { in: productIds };
    }

    let products: any[] = [];
    let companySettings: any = null;

    try {
      [products, companySettings] = await Promise.all([
        prisma.product.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" }
        }),
        orgId ? prisma.companySettings.findFirst({ where: { organizationId: orgId } }) : null
      ]);
    } catch {
      products = [];
    }

    // If database has 0 products, fall back to rich dummy products
    if (products.length === 0) {
      products = DUMMY_GLASSWARE_PRODUCTS;
      if (productIds && productIds.length > 0) {
        products = products.filter(p => productIds.includes(p.id));
      }
    }

    const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];

    return {
      success: true,
      products: JSON.parse(JSON.stringify(products)),
      categories,
      company: {
        organizationId: orgId,
        companyName: companySettings?.companyName || defaultOrg?.name || "R3 EXPORTS",
        tradeName: defaultOrg?.tradeName || "R3 EXPORTS",
        address: companySettings?.address || defaultOrg?.address || "F-12, Industrial Area, Phase 2, Mayapuri, New Delhi, Delhi 110064",
        city: companySettings?.city || defaultOrg?.city || "New Delhi",
        state: companySettings?.state || defaultOrg?.state || "Delhi",
        mobile: companySettings?.mobile || defaultOrg?.phone || "+91 9876543210",
        email: companySettings?.email || defaultOrg?.email || "sales@r3exports.com",
        gstin: companySettings?.gstin || defaultOrg?.gstin || "07AAACR3333E1Z9",
        minOrderValueReadyStock: 15000,
        minOrderValueMadeToOrder: 50000,
        leadTimeReadyStockDays: 2,
        leadTimeMadeToOrderDays: 30
      }
    };
  } catch (err: any) {
    console.error("Failed to load public catalog:", err);
    return {
      success: true,
      products: DUMMY_GLASSWARE_PRODUCTS,
      categories: Array.from(new Set(DUMMY_GLASSWARE_PRODUCTS.map(p => p.category))),
      company: {
        companyName: "R3 EXPORTS",
        tradeName: "R3 EXPORTS",
        address: "F-12, Industrial Area, Phase 2, Mayapuri, New Delhi, Delhi 110064",
        city: "New Delhi",
        state: "Delhi",
        mobile: "+91 9876543210",
        email: "sales@r3exports.com",
        gstin: "07AAACR3333E1Z9",
        minOrderValueReadyStock: 15000,
        minOrderValueMadeToOrder: 50000,
        leadTimeReadyStockDays: 2,
        leadTimeMadeToOrderDays: 30
      }
    };
  }
}

/**
 * Place a direct B2B wholesale order / Proforma request from public storefront into the ERP
 */
export async function placeCatalogOrder(params: {
  buyer: CatalogOrderBuyerDetails;
  items: CatalogOrderItemPayload[];
}) {
  const { buyer, items } = params;

  if (!buyer.businessName?.trim() || !buyer.contactPerson?.trim() || !buyer.mobile?.trim()) {
    return { error: "Business name, contact person name, and mobile number are required." };
  }

  if (!items || items.length === 0) {
    return { error: "Your order cart is empty. Please add items before checkout." };
  }

  try {
    // 1. Resolve Organization
    let defaultOrg: any = null;
    try {
      defaultOrg = await prisma.organization.findFirst({
        where: {
          OR: [
            { slug: { in: ["r3-exports", "r3-enterprises", "tinkal-erp", "espon-global"] } },
            { name: { contains: "R3", mode: "insensitive" } }
          ]
        }
      }) || await prisma.organization.findFirst();
    } catch {
      defaultOrg = null;
    }

    const organizationId = defaultOrg?.id;
    const companySettings = organizationId ? await prisma.companySettings.findFirst({ where: { organizationId } }) : null;
    const companyState = companySettings?.state || defaultOrg?.state || "Delhi";

    // 2. Fetch products and calculate 4-tier wholesale pricing
    const productIds = items.map(i => i.productId);
    let dbProducts: any[] = [];
    if (organizationId) {
      try {
        dbProducts = await prisma.product.findMany({
          where: { id: { in: productIds }, organizationId }
        });
      } catch {
        dbProducts = [];
      }
    }

    // Merge with dummy products map if DB has missing products
    const dummyMap = new Map(DUMMY_GLASSWARE_PRODUCTS.map(p => [p.id, p]));
    const productMap = new Map(dbProducts.map(p => [p.id, p]));

    let orderSubtotal = 0;
    let totalQuantity = 0;
    const computedItems: Array<{
      product: any;
      quantity: number;
      basePrice: number;
      discountPercent: number;
      effectiveRate: number;
      hsnCode: string;
      taxableAmount: number;
      gstRate: number;
      cgst: number;
      sgst: number;
      igst: number;
      total: number;
    }> = [];

    const isInterstate = companyState.trim().toLowerCase() !== (buyer.state || companyState).trim().toLowerCase();

    for (const item of items) {
      const prod = productMap.get(item.productId) || dummyMap.get(item.productId);
      if (!prod) continue;

      let qty = Math.max(1, item.quantity);
      // Auto-round to box packaging if specified
      const packBox = item.boxPackOption || 1;
      if (packBox > 1 && qty % packBox !== 0) {
        qty = Math.ceil(qty / packBox) * packBox;
      }

      const basePrice = prod.sellingPrice;

      // 4-Slab wholesale pricing: 1-99 (0%), 100-299 (5%), 300-499 (10%), 500+ (20%)
      let discountPercent = 0;
      if (qty >= 500) {
        discountPercent = 20;
      } else if (qty >= 300) {
        discountPercent = 10;
      } else if (qty >= 100) {
        discountPercent = 5;
      }

      const effectiveRate = Math.round((basePrice * (1 - discountPercent / 100)) * 100) / 100;
      const gstRate = 18; // 18% Glassware GST
      const gstBreakdown = calculateItemGst(effectiveRate, qty, gstRate, isInterstate);

      computedItems.push({
        product: prod,
        quantity: qty,
        basePrice,
        discountPercent,
        effectiveRate,
        hsnCode: prod.hsnCode || "7013",
        taxableAmount: gstBreakdown.taxableAmount,
        gstRate,
        cgst: gstBreakdown.cgstAmount,
        sgst: gstBreakdown.sgstAmount,
        igst: gstBreakdown.igstAmount,
        total: gstBreakdown.totalAmount
      });

      orderSubtotal += gstBreakdown.taxableAmount;
      totalQuantity += qty;
    }

    if (computedItems.length === 0) {
      return { error: "None of the selected products could be found in the catalog." };
    }

    // Check MOV (Minimum Order Value)
    const isReadyStock = buyer.buyingStream === "READY_STOCK" || !buyer.buyingStream;
    const minRequiredValue = isReadyStock ? 15000 : 50000;
    if (orderSubtotal < minRequiredValue) {
      return {
        error: `Minimum Order Value (MOV) not met. Required: ₹${minRequiredValue.toLocaleString("en-IN")}, Current Subtotal: ₹${orderSubtotal.toLocaleString("en-IN")}. Please increase quantities or add more items.`
      };
    }

    const totalCgst = computedItems.reduce((acc, i) => acc + i.cgst, 0);
    const totalSgst = computedItems.reduce((acc, i) => acc + i.sgst, 0);
    const totalIgst = computedItems.reduce((acc, i) => acc + i.igst, 0);
    const totalTax = totalCgst + totalSgst + totalIgst;
    const totalOrderValue = orderSubtotal + totalTax;

    const cleanMobile = buyer.mobile.replace(/[^0-9]/g, "");

    // 3. Find or Create Customer in CRM (if DB available)
    let customer: any = null;
    if (organizationId) {
      try {
        customer = await prisma.customer.findFirst({
          where: {
            organizationId,
            OR: [
              { mobile: cleanMobile },
              { whatsappNumber: cleanMobile },
              ...(buyer.email ? [{ email: { equals: buyer.email.trim(), mode: "insensitive" as const } }] : []),
              ...(buyer.gstin ? [{ gstNumber: buyer.gstin.trim().toUpperCase() }] : [])
            ]
          }
        });

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              organizationId,
              businessName: buyer.businessName.trim(),
              contactPerson: buyer.contactPerson.trim(),
              mobile: cleanMobile,
              whatsappNumber: buyer.whatsappNumber ? buyer.whatsappNumber.replace(/[^0-9]/g, "") : cleanMobile,
              email: buyer.email?.trim() || null,
              gstNumber: buyer.gstin?.trim().toUpperCase() || null,
              billingAddress: buyer.shippingAddress.trim(),
              shippingAddress: buyer.shippingAddress.trim(),
              city: buyer.city.trim(),
              state: buyer.state.trim(),
              pincode: buyer.pincode.trim(),
              customerType: "Wholesaler",
              source: "Storefront Wholesale Portal",
              status: "Active Customer",
              leadStage: "Order Placed"
            }
          });
        }
      } catch (custErr) {
        console.warn("Customer CRM sync skipped/fallback:", custErr);
      }
    }

    // 4. Generate Order & PI Number
    let orderNumber = `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    let piNumber: string | null = null;
    if (organizationId) {
      try {
        orderNumber = await getNextOrderNumber(organizationId);
        piNumber = await generateNextDocumentNumber(organizationId, 'proformaInvoice');
      } catch {
        piNumber = `PI-${orderNumber.replace("ORD-", "")}`;
      }
    }

    // 5. Create Order in Prisma DB if connected
    let createdOrderId = `order_${Date.now()}`;
    if (organizationId && customer) {
      try {
        let salesperson = await prisma.employee.findFirst({ where: { organizationId } });
        if (!salesperson) {
          const firstUser = await prisma.user.findFirst({ where: { organizationId } }) || await prisma.user.findFirst();
          if (firstUser) {
            salesperson = await prisma.employee.create({
              data: {
                organizationId,
                userId: firstUser.id,
                employeeId: `EMP-${Date.now().toString().slice(-4)}`,
                designation: "Sales Executive"
              }
            });
          }
        }

        if (salesperson) {
          const order = await prisma.order.create({
            data: {
              organizationId,
              orderNumber,
              customerId: customer.id,
              salespersonId: salesperson.id,
              placeOfSupply: buyer.state.trim(),
              isInterstate,
              subtotal: orderSubtotal,
              discount: 0,
              tax: totalTax,
              cgst: totalCgst,
              sgst: totalSgst,
              igst: totalIgst,
              totalValue: totalOrderValue,
              outstandingAmount: totalOrderValue,
              paymentStatus: "Unpaid",
              orderStatus: "Processing",
              notes: `Storefront Web Order (${buyer.buyingStream || 'READY_STOCK'}) • Transporter: ${buyer.courierType || 'R3_COURIER'} • ${buyer.notes || ''}`,
              items: {
                create: computedItems
                  .filter(it => it.product.id && !it.product.id.startsWith("r3-prod-"))
                  .map(item => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                    rate: item.effectiveRate,
                    hsnCode: item.hsnCode,
                    gstRate: item.gstRate,
                    cgst: item.cgst,
                    sgst: item.sgst,
                    igst: item.igst,
                    total: item.total
                  }))
              }
            }
          });
          createdOrderId = order.id;

          // Deduct live stock
          for (const item of computedItems) {
            if (item.product.id && !item.product.id.startsWith("r3-prod-") && item.product.stockQuantity > 0) {
              const deductQty = Math.min(item.quantity, item.product.stockQuantity);
              await prisma.product.update({
                where: { id: item.product.id },
                data: { stockQuantity: { decrement: deductQty } }
              });

              await prisma.inventoryTransaction.create({
                data: {
                  productId: item.product.id,
                  type: "OUT",
                  quantity: deductQty,
                  reference: orderNumber,
                  employeeId: salesperson.id,
                  notes: `Auto-allocated for Storefront Order #${orderNumber} (${buyer.businessName})`
                }
              });
            }
          }
        }
      } catch (dbErr) {
        console.warn("DB Order persistence warning:", dbErr);
      }
    }

    try {
      revalidatePath("/catalog");
      revalidatePath("/orders");
      revalidatePath("/proforma-invoices");
      revalidatePath("/products");
    } catch {}

    // 6. Generate WhatsApp Order Booking Message
    const companyPhone = (companySettings?.mobile || defaultOrg?.phone || "+91 9876543210").replace(/[^0-9]/g, "");
    let waMsg = `*🚨 NEW WHOLESALE ORDER BOOKED (#${orderNumber})*\n\n`;
    waMsg += `*Buyer:* ${buyer.businessName} (${buyer.contactPerson})\n`;
    waMsg += `*Mobile:* ${buyer.mobile}\n`;
    if (buyer.gstin) waMsg += `*GSTIN:* ${buyer.gstin}\n`;
    waMsg += `*Delivery To:* ${buyer.city}, ${buyer.state} - ${buyer.pincode}\n`;
    waMsg += `*Fulfillment:* ${buyer.buyingStream === 'MADE_TO_ORDER' ? '🏭 Made to Order (20-30 Days)' : '⚡ Ready Stock (Ship in 48h)'}\n`;
    waMsg += `*Logistics:* ${buyer.courierType === 'OWN_TRANSPORTER' ? 'Own Transporter (₹0 Freight)' : 'R3 Courier (Breakage Covered)'}\n\n`;
    waMsg += `*ITEMS ORDERED:*\n`;

    computedItems.forEach((it, idx) => {
      waMsg += `${idx + 1}. ${it.product.name} (SKU: ${it.product.sku || 'N/A'})\n`;
      waMsg += `   Qty: *${it.quantity} pcs* @ ₹${it.effectiveRate}/pc = ₹${it.total.toLocaleString("en-IN")}\n`;
    });

    waMsg += `\n*Subtotal:* ₹${orderSubtotal.toLocaleString("en-IN")}\n`;
    waMsg += `*GST (18%):* ₹${totalTax.toLocaleString("en-IN")}\n`;
    waMsg += `*Grand Total:* ₹${totalOrderValue.toLocaleString("en-IN")}\n\n`;
    waMsg += `Please verify this Proforma Order and share payment details for processing. Thank you!`;

    const whatsAppUrl = `https://wa.me/${companyPhone}?text=${encodeURIComponent(waMsg)}`;

    return {
      success: true,
      orderId: createdOrderId,
      orderNumber,
      piNumber: piNumber || `PI-${orderNumber}`,
      subtotal: orderSubtotal,
      tax: totalTax,
      totalValue: totalOrderValue,
      totalQuantity,
      whatsAppUrl,
      orderSummary: {
        orderNumber,
        buyerName: buyer.businessName,
        itemCount: computedItems.length,
        totalQuantity,
        totalValue: totalOrderValue
      }
    };
  } catch (err: any) {
    console.error("Failed to place storefront catalog order:", err);
    return { error: err.message || "Failed to process order. Please try again." };
  }
}
