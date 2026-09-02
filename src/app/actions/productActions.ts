"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";

export async function createProduct(formData: FormData) {
  const session = await getServerSession(authOptions);
  const roleName = (session?.user as any)?.role;
  let canManage = roleName === 'ADMIN' || roleName === 'SUPER_ADMIN';

  if (!canManage && roleName) {
    const roleDef = await prisma.role.findUnique({ where: { name: roleName } });
    if (roleDef) {
      try {
        const perms = JSON.parse(roleDef.permissions) as string[];
        if (perms.includes("Manage Inventory")) canManage = true;
      } catch(e) {}
    }
  }

  if (!canManage) {
    return { error: "Unauthorized. You do not have permission to manage inventory." };
  }

  const name = formData.get("name") as string;
  const sku = formData.get("sku") as string;
  const articleNumber = formData.get("articleNumber") as string || sku; // Fallback to SKU if empty
  const hsnCode = formData.get("hsnCode") as string;
  const category = formData.get("category") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const stock = parseInt(formData.get("stock") as string, 10);
  const weightInput = formData.get("weight");
  let weight = weightInput ? parseFloat(weightInput as string) : 0;

  // Handle Multiple Images
  let images: string[] = [];
  const imagesRaw = formData.get("images");
  if (typeof imagesRaw === "string" && imagesRaw.trim()) {
    try {
      const parsed = JSON.parse(imagesRaw);
      if (Array.isArray(parsed)) {
        images = parsed.filter((img: any) => typeof img === "string" && img.trim().length > 0);
      }
    } catch {
      images = imagesRaw.split(",").map(s => s.trim()).filter(Boolean);
    }
  }

  if (!name || !sku || isNaN(price)) {
    return { error: "Name, SKU, and a valid Price are required" };
  }

  try {
    const organizationId = await getTenantOrgId();

    if ((isNaN(weight) || weight <= 0) && category) {
      const catObj = await prisma.productCategory.findUnique({ where: { name: category.trim() } });
      if (catObj?.weight) {
        weight = catObj.weight;
      }
    }

    const existingProduct = await prisma.product.findFirst({
      where: { 
        organizationId,
        OR: [
          { sku: sku },
          { articleNumber: articleNumber }
        ]
      },
    });

    if (existingProduct) {
      return { error: "Product with this SKU or Article Number already exists" };
    }

    const product = await prisma.product.create({
      data: {
        organizationId,
        name,
        sku: sku,
        articleNumber: articleNumber,
        hsnCode: hsnCode || null,
        category: category || "General",
        description: description || null,
        weight: isNaN(weight) ? 0 : weight,
        images: images,
        sellingPrice: price,
        purchasePrice: price * 0.7, // MVP mock
        mrp: price * 1.2, // MVP mock
        stockQuantity: isNaN(stock) ? 0 : stock,
        inventoryTransactions: {
          create: {
            type: "IN",
            quantity: isNaN(stock) ? 0 : stock,
            reference: "Initial Stock",
            notes: "Added during product creation"
          }
        }
      }
    });

    revalidatePath("/", "layout");
    return { success: true, product };
  } catch (error: any) {
    console.error("Failed to create product:", error);
    return { error: error.message || "Failed to create product. Please try again." };
  }
}

export async function updateProduct(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  const roleName = (session?.user as any)?.role;
  let canManage = roleName === 'ADMIN' || roleName === 'SUPER_ADMIN';

  if (!canManage && roleName) {
    const roleDef = await prisma.role.findUnique({ where: { name: roleName } });
    if (roleDef) {
      try {
        const perms = JSON.parse(roleDef.permissions) as string[];
        if (perms.includes("Manage Inventory")) canManage = true;
      } catch(e) {}
    }
  }

  if (!canManage) {
    return { error: "Unauthorized. You do not have permission to manage inventory." };
  }

  const name = formData.get("name") as string;
  const sku = formData.get("sku") as string;
  const articleNumber = formData.get("articleNumber") as string;
  const hsnCode = formData.get("hsnCode") as string;
  const category = formData.get("category") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const stock = parseInt(formData.get("stock") as string, 10);
  const weightInput = formData.get("weight");
  let weight = weightInput ? parseFloat(weightInput as string) : 0;

  // Handle Multiple Images
  let images: string[] = [];
  const imagesRaw = formData.get("images");
  if (typeof imagesRaw === "string" && imagesRaw.trim()) {
    try {
      const parsed = JSON.parse(imagesRaw);
      if (Array.isArray(parsed)) {
        images = parsed.filter((img: any) => typeof img === "string" && img.trim().length > 0);
      }
    } catch {
      images = imagesRaw.split(",").map(s => s.trim()).filter(Boolean);
    }
  }

  if (!name || isNaN(price)) {
    return { error: "Product Name and a valid Price are required" };
  }

  try {
    if ((isNaN(weight) || weight <= 0) && category) {
      const catObj = await prisma.productCategory.findUnique({ where: { name: category.trim() } });
      if (catObj?.weight) weight = catObj.weight;
    }

    const updateData: any = {
      name,
      sku: sku || null,
      articleNumber: articleNumber || null,
      hsnCode: hsnCode || null,
      category: category || "General",
      description: description || null,
      weight: isNaN(weight) ? 0 : weight,
      sellingPrice: price,
      purchasePrice: price * 0.7,
      mrp: price * 1.2,
      stockQuantity: isNaN(stock) ? 0 : stock
    };

    if (formData.has("images")) {
      updateData.images = images;
    }

    const organizationId = await getTenantOrgId();
    const existingProd = await prisma.product.findUnique({ where: { id }, select: { organizationId: true } });
    if (!existingProd) return { error: "Product not found" };
    if (existingProd.organizationId && organizationId && existingProd.organizationId !== organizationId) {
      return { error: "Unauthorized access to product" };
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData
    });

    revalidatePath("/products");
    revalidatePath("/", "layout");
    return { success: true, product: updatedProduct };
  } catch (error: any) {
    console.error("Failed to update product:", error);
    return { error: error.message || "Failed to update product." };
  }
}

export async function deleteProduct(id: string) {
  const session = await getServerSession(authOptions);
  const roleName = (session?.user as any)?.role;
  let canManage = roleName === 'ADMIN' || roleName === 'SUPER_ADMIN';

  if (!canManage && roleName) {
    const roleDef = await prisma.role.findUnique({ where: { name: roleName } });
    if (roleDef) {
      try {
        const perms = JSON.parse(roleDef.permissions) as string[];
        if (perms.includes("Manage Inventory")) canManage = true;
      } catch(e) {}
    }
  }

  if (!canManage) {
    return { error: "Unauthorized. You do not have permission to delete products." };
  }

  try {
    const organizationId = await getTenantOrgId();
    const existingProd = await prisma.product.findUnique({ where: { id }, select: { organizationId: true } });
    if (!existingProd) return { error: "Product not found" };
    if (existingProd.organizationId && organizationId && existingProd.organizationId !== organizationId) {
      return { error: "Unauthorized access to product" };
    }

    await prisma.inventoryTransaction.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });

    revalidatePath("/products");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete product:", error);
    return { error: error.message || "Failed to delete product. It may be linked to existing orders." };
  }
}

/**
 * Fetch list of all articles / products for quick switcher dropdown
 */
export async function getAllArticlesForSelector() {
  try {
    const organizationId = await getTenantOrgId();
    const products = await prisma.product.findMany({
      where: organizationId ? { organizationId } : undefined,
      select: {
        id: true,
        name: true,
        sku: true,
        articleNumber: true,
        category: true,
        sellingPrice: true,
        stockQuantity: true,
        images: true,
      },
      orderBy: { name: 'asc' }
    });
    return { success: true, products };
  } catch (error: any) {
    return { error: "Failed to fetch articles list: " + error.message };
  }
}

/**
 * Fetch detailed transaction history, quotations, invoices/orders, stock adjustments, and POs for a selected article
 */
export async function getArticleTransactionHistory(articleOrSkuOrId: string, filters?: { startDate?: string; endDate?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  if (!articleOrSkuOrId || !articleOrSkuOrId.trim()) {
    return { error: "Article number, SKU, or Product ID is required" };
  }

  try {
    const organizationId = await getTenantOrgId();
    const query = articleOrSkuOrId.trim();

    // 1. Locate Product within tenant
    const product = await prisma.product.findFirst({
      where: {
        ...(organizationId ? { organizationId } : {}),
        OR: [
          { id: query },
          { sku: { equals: query, mode: 'insensitive' } },
          { articleNumber: { equals: query, mode: 'insensitive' } }
        ]
      }
    });

    if (!product) {
      return { error: `Product not found for article/SKU: "${query}"` };
    }

    const dateFilter: any = {};
    if (filters?.startDate) dateFilter.gte = new Date(filters.startDate);
    if (filters?.endDate) dateFilter.lte = new Date(filters.endDate);
    const hasDateFilter = Boolean(filters?.startDate || filters?.endDate);

    // 2. Fetch Inventory Transactions (Adjustments & Scans)
    const inventoryTransactions = await prisma.inventoryTransaction.findMany({
      where: {
        productId: product.id,
        ...(hasDateFilter ? { date: dateFilter } : {})
      },
      include: {
        employee: {
          select: { user: { select: { name: true, email: true } } }
        },
        warehouse: {
          select: { name: true, code: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    // 3. Fetch Quotation Items
    const quotationItems = await prisma.quotationItem.findMany({
      where: {
        productId: product.id,
        ...(hasDateFilter ? { quotation: { date: dateFilter } } : {})
      },
      include: {
        quotation: {
          include: {
            customer: {
              select: { id: true, businessName: true, contactPerson: true, mobile: true, state: true }
            },
            salesperson: {
              select: { user: { select: { name: true } } }
            }
          }
        }
      },
      orderBy: { quotation: { date: 'desc' } }
    });

    // 4. Fetch Order Items & Connected Invoices
    const orderItems = await prisma.orderItem.findMany({
      where: {
        productId: product.id,
        ...(hasDateFilter ? { order: { orderDate: dateFilter } } : {})
      },
      include: {
        order: {
          include: {
            customer: {
              select: { id: true, businessName: true, contactPerson: true, mobile: true, state: true }
            },
            salesperson: {
              select: { user: { select: { name: true } } }
            },
            invoices: {
              select: { id: true, invoiceNumber: true, status: true, invoiceDate: true, totalAmount: true }
            }
          }
        }
      },
      orderBy: { order: { orderDate: 'desc' } }
    });

    // 5. Fetch Purchase Order Items (Vendor Restocks)
    const purchaseOrderItems = await prisma.purchaseOrderItem.findMany({
      where: {
        productId: product.id,
        ...(hasDateFilter ? { purchaseOrder: { orderDate: dateFilter } } : {})
      },
      include: {
        purchaseOrder: {
          include: {
            vendor: {
              select: { id: true, companyName: true, contactPerson: true, mobile: true }
            }
          }
        }
      },
      orderBy: { purchaseOrder: { orderDate: 'desc' } }
    });

    // 6. Aggregate KPIs with Precise Mathematics
    // Check initial stock transaction
    const initialTx = inventoryTransactions.find(t => t.reference === "Initial Stock");
    const initialStock = initialTx ? initialTx.quantity : (inventoryTransactions.length === 0 ? product.stockQuantity : 0);
    
    const manualInQty = inventoryTransactions
      .filter(t => t.type === 'IN' && t.reference !== "Initial Stock")
      .reduce((sum, t) => sum + t.quantity, 0);

    const totalPOReceivedQty = purchaseOrderItems.reduce((sum, poi) => sum + (poi.receivedQty || 0), 0);
    const totalPOQty = purchaseOrderItems.reduce((sum, poi) => sum + (poi.quantity || 0), 0);

    // Total Stock In (Inflow)
    const totalStockIn = (initialTx ? 0 : 0) + inventoryTransactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.quantity, 0) + totalPOReceivedQty;
    const effectiveTotalStockIn = totalStockIn > 0 ? totalStockIn : Math.max(initialStock, product.stockQuantity);

    // Total Invoiced & Sold in Orders
    const totalInvoicedQty = orderItems.reduce((sum, oi) => sum + (oi.quantity || 0), 0);
    const totalRevenue = orderItems.reduce((sum, oi) => sum + (oi.total || (oi.quantity * oi.rate) || 0), 0);

    // Manual Stock Out (Excluding order references if any)
    const manualOutQty = inventoryTransactions
      .filter(t => t.type === 'OUT' && !orderItems.some(oi => oi.order?.orderNumber && t.reference === oi.order.orderNumber))
      .reduce((sum, t) => sum + t.quantity, 0);

    // Total Stock Out (Outflow = Sold in Orders + Manual Write-offs/Damaged)
    const totalStockOut = totalInvoicedQty + manualOutQty;

    // Real Physical / Available Stock
    const computedStock = Math.max(0, effectiveTotalStockIn - totalStockOut);

    // Sync database stockQuantity if it differs
    if (product.stockQuantity !== computedStock) {
      await prisma.product.update({
        where: { id: product.id },
        data: { stockQuantity: computedStock }
      });
      product.stockQuantity = computedStock;
    }

    // Quotations Breakdown
    const totalQuotedQty = quotationItems.reduce((sum, qi) => sum + (qi.quantity || 0), 0);
    const activeQuotedQty = quotationItems
      .filter(qi => ['Draft', 'Sent', 'Viewed'].includes(qi.quotation?.status))
      .reduce((sum, qi) => sum + (qi.quantity || 0), 0);
    const convertedQuotedQty = quotationItems
      .filter(qi => ['Accepted', 'Converted'].includes(qi.quotation?.status))
      .reduce((sum, qi) => sum + (qi.quantity || 0), 0);
    const uncommittedStock = Math.max(0, computedStock - activeQuotedQty);

    // 7. Assemble Unified Chronological Timeline
    const rawEvents: any[] = [];

    // Add Inventory Transactions
    inventoryTransactions.forEach(t => {
      // Avoid duplicate display if it's already an order out transaction
      const isLinkedToOrder = t.type === 'OUT' && orderItems.some(oi => oi.order?.orderNumber && t.reference === oi.order.orderNumber);
      if (isLinkedToOrder) return;

      rawEvents.push({
        id: `tx_${t.id}`,
        date: new Date(t.date),
        source: "STOCK_ADJUSTMENT",
        type: t.type, // "IN" or "OUT"
        quantity: t.quantity,
        delta: t.type === 'IN' ? t.quantity : -t.quantity,
        isStockImpact: true,
        title: t.reference === 'Initial Stock' 
          ? '📦 Initial Baseline Stock' 
          : (t.type === 'IN' ? '📥 Stock Added / Restocked (IN)' : '📤 Stock Deducted / Written-off (OUT)'),
        docNumber: t.reference || (t.type === 'IN' ? 'Stock In Scan' : 'Stock Out Scan'),
        party: t.employee?.user?.name || 'Inventory Manager',
        warehouse: t.warehouse?.name || 'Main Warehouse',
        notes: t.notes || (t.reference ? `Reference: ${t.reference}` : 'Manual Adjustment'),
        status: t.type === 'IN' ? 'In Stock' : 'Deducted',
        badgeColor: t.type === 'IN' ? 'emerald' : 'rose'
      });
    });

    // Add Quotation Items
    quotationItems.forEach(qi => {
      rawEvents.push({
        id: `quote_${qi.id}`,
        date: new Date(qi.quotation.date),
        source: "QUOTATION",
        type: "QUOTATION",
        quantity: qi.quantity,
        delta: 0,
        isStockImpact: false,
        rate: qi.rate,
        total: qi.total,
        title: `📑 Quotation (${qi.quotation.quotationNumber})`,
        docNumber: qi.quotation.quotationNumber,
        quotationId: qi.quotation.id,
        party: qi.quotation.customer?.businessName || qi.quotation.customer?.contactPerson || 'Customer',
        salesperson: qi.quotation.salesperson?.user?.name || null,
        status: qi.quotation.status,
        notes: qi.quotation.subject || qi.description || (qi.quotation.status === 'Converted' ? 'Converted to confirmed sales order' : 'Active Quotation in pipeline'),
        badgeColor: qi.quotation.status === 'Converted' || qi.quotation.status === 'Accepted' ? 'indigo' : 'amber'
      });
    });

    // Add Order / Invoice Items
    orderItems.forEach(oi => {
      const invoice = oi.order.invoices?.[0];
      const docDisplay = invoice ? `${invoice.invoiceNumber}` : `${oi.order.orderNumber}`;
      rawEvents.push({
        id: `order_${oi.id}`,
        date: new Date(oi.order.orderDate),
        source: "INVOICE_ORDER",
        type: "INVOICE_ORDER",
        quantity: oi.quantity,
        delta: -oi.quantity, // Deducts stock
        isStockImpact: true,
        rate: oi.rate,
        total: oi.total || (oi.quantity * oi.rate),
        title: invoice ? `🛒 Invoiced Order (${docDisplay})` : `🛒 Sales Order (${oi.order.orderNumber})`,
        docNumber: docDisplay,
        orderId: oi.order.id,
        orderNumber: oi.order.orderNumber,
        invoiceNumber: invoice?.invoiceNumber || null,
        party: oi.order.customer?.businessName || oi.order.customer?.contactPerson || 'Customer',
        salesperson: oi.order.salesperson?.user?.name || null,
        status: invoice ? `Invoice: ${invoice.status}` : `Order: ${oi.order.orderStatus}`,
        notes: oi.order.notes || `Dispatched/Sold • Total ₹${(oi.total || (oi.quantity * oi.rate)).toLocaleString()}`,
        badgeColor: 'blue'
      });
    });

    // Add Purchase Orders
    purchaseOrderItems.forEach(poi => {
      const received = poi.receivedQty || 0;
      rawEvents.push({
        id: `po_${poi.id}`,
        date: new Date(poi.purchaseOrder.orderDate),
        source: "PURCHASE_ORDER",
        type: "PURCHASE_ORDER",
        quantity: poi.quantity,
        receivedQty: received,
        delta: received, // Adds received stock
        isStockImpact: received > 0,
        rate: poi.rate,
        total: poi.total,
        title: `🚚 Vendor PO (${poi.purchaseOrder.poNumber})`,
        docNumber: poi.purchaseOrder.poNumber,
        party: poi.purchaseOrder.vendor?.companyName || 'Vendor',
        status: poi.purchaseOrder.status,
        notes: `Vendor Inflow: ${received} / ${poi.quantity} units received`,
        badgeColor: 'purple'
      });
    });

    // 8. Sort Chronologically (Oldest to Newest) to Compute Running Balances
    rawEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

    let currentRunningBalance = 0;
    const timelineWithBalance = rawEvents.map(event => {
      if (event.isStockImpact) {
        currentRunningBalance = Math.max(0, currentRunningBalance + event.delta);
      }
      return {
        ...event,
        date: event.date.toISOString(),
        runningBalance: currentRunningBalance
      };
    });

    // Sort final timeline Newest First for display
    const timeline = timelineWithBalance.slice().reverse();

    return {
      success: true,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        articleNumber: product.articleNumber,
        category: product.category,
        hsnCode: product.hsnCode,
        sellingPrice: product.sellingPrice,
        purchasePrice: product.purchasePrice,
        stockQuantity: computedStock,
        minimumStock: product.minimumStock,
        status: product.status,
        description: product.description,
        weight: product.weight,
        images: product.images || [],
        createdAt: product.createdAt
      },
      kpis: {
        currentStock: computedStock,
        totalStockIn: effectiveTotalStockIn,
        totalStockOut,
        totalInvoicedQty,
        totalRevenue,
        totalQuotedQty,
        activeQuotedQty,
        convertedQuotedQty,
        uncommittedStock,
        stockInTransactionsQty: effectiveTotalStockIn,
        stockOutTransactionsQty: totalStockOut,
        manualInQty,
        manualOutQty,
        totalPOQty,
        totalPOReceivedQty,
        totalQuotationsCount: quotationItems.length,
        totalOrdersCount: orderItems.length,
        totalTransactionsCount: inventoryTransactions.length,
        totalPOsCount: purchaseOrderItems.length,
        totalTimelineEventsCount: timeline.length
      },
      timeline,
      quotationItems,
      orderItems,
      inventoryTransactions,
      purchaseOrderItems
    };

  } catch (error: any) {
    console.error("Failed to fetch article transaction history:", error);
    return { error: "Failed to fetch article transaction history: " + error.message };
  }
}
