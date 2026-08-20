"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'Customer' | 'Order' | 'Quotation' | 'Product' | 'Lead' | 'Action';
  url: string;
  badgeColor?: string;
}

export async function searchAllModules(query: string): Promise<SearchResultItem[]> {
  if (!query || query.trim().length < 1) return [];

  const cleanQuery = query.trim();
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role || 'SALES';
  const userId = (session?.user as any)?.id;
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  let customerWhere: any = {
    OR: [
      { businessName: { contains: cleanQuery, mode: 'insensitive' } },
      { contactPerson: { contains: cleanQuery, mode: 'insensitive' } },
      { mobile: { contains: cleanQuery, mode: 'insensitive' } },
    ]
  };

  let quotationWhere: any = {
    OR: [
      { quotationNumber: { contains: cleanQuery, mode: 'insensitive' } },
      { customer: { businessName: { contains: cleanQuery, mode: 'insensitive' } } },
    ]
  };

  let orderWhere: any = {
    OR: [
      { orderNumber: { contains: cleanQuery, mode: 'insensitive' } },
      { customer: { businessName: { contains: cleanQuery, mode: 'insensitive' } } },
    ]
  };

  if (!isAdmin && userId) {
    try {
      const employee = await prisma.employee.findUnique({ where: { userId } });
      if (employee) {
        customerWhere = {
          AND: [
            { assignedSalespersonId: employee.id },
            {
              OR: [
                { businessName: { contains: cleanQuery, mode: 'insensitive' } },
                { contactPerson: { contains: cleanQuery, mode: 'insensitive' } },
                { mobile: { contains: cleanQuery, mode: 'insensitive' } },
              ]
            }
          ]
        };
        quotationWhere = {
          AND: [
            { salespersonId: employee.id },
            {
              OR: [
                { quotationNumber: { contains: cleanQuery, mode: 'insensitive' } },
                { customer: { businessName: { contains: cleanQuery, mode: 'insensitive' } } },
              ]
            }
          ]
        };
        orderWhere = {
          AND: [
            { salespersonId: employee.id },
            {
              OR: [
                { orderNumber: { contains: cleanQuery, mode: 'insensitive' } },
                { customer: { businessName: { contains: cleanQuery, mode: 'insensitive' } } },
              ]
            }
          ]
        };
      } else {
        customerWhere = { id: '00000000-0000-0000-0000-000000000000' };
        quotationWhere = { id: '00000000-0000-0000-0000-000000000000' };
        orderWhere = { id: '00000000-0000-0000-0000-000000000000' };
      }
    } catch (e) {
      console.error("Employee lookup error in searchAllModules:", e);
    }
  }

  try {
    const [customers, quotations, orders, products, whatsappConvs] = await Promise.all([
      prisma.customer.findMany({
        where: customerWhere,
        take: 5,
        select: { id: true, businessName: true, contactPerson: true, mobile: true }
      }),
      prisma.quotation.findMany({
        where: quotationWhere,
        take: 4,
        select: { id: true, quotationNumber: true, totalValue: true, customer: { select: { businessName: true } } }
      }),
      prisma.order.findMany({
        where: orderWhere,
        take: 4,
        select: { id: true, orderNumber: true, totalValue: true, customer: { select: { businessName: true } } }
      }),
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: cleanQuery, mode: 'insensitive' } },
            { articleNumber: { contains: cleanQuery, mode: 'insensitive' } },
            { sku: { contains: cleanQuery, mode: 'insensitive' } },
          ]
        },
        take: 4,
        select: { id: true, name: true, articleNumber: true, sellingPrice: true }
      }),
      prisma.whatsAppConversation.findMany({
        where: {
          OR: [
            { customer: { businessName: { contains: cleanQuery, mode: 'insensitive' } } },
            { customer: { contactPerson: { contains: cleanQuery, mode: 'insensitive' } } },
            { lastMessageText: { contains: cleanQuery, mode: 'insensitive' } }
          ]
        },
        take: 4,
        select: { id: true, lastMessageText: true, customer: { select: { businessName: true, contactPerson: true } } }
      })
    ]);

    const results: SearchResultItem[] = [];

    whatsappConvs.forEach(wa => {
      results.push({
        id: wa.id,
        title: `WhatsApp Chat: ${wa.customer?.businessName || wa.customer?.contactPerson}`,
        subtitle: `Last msg: ${wa.lastMessageText?.slice(0, 50) || '-'}`,
        type: 'Lead',
        url: `/whatsapp/inbox`,
        badgeColor: '#10b981'
      });
    });

    customers.forEach(c => {
      results.push({
        id: c.id,
        title: c.businessName || c.contactPerson,
        subtitle: `Contact: ${c.contactPerson} (${c.mobile})`,
        type: 'Customer',
        url: `/customers?search=${encodeURIComponent(c.businessName || c.contactPerson)}`,
        badgeColor: '#3b82f6'
      });
    });

    quotations.forEach(q => {
      results.push({
        id: q.id,
        title: `Quote ${q.quotationNumber}`,
        subtitle: `Customer: ${q.customer?.businessName || 'N/A'} • ₹${(q.totalValue || 0).toLocaleString('en-IN')}`,
        type: 'Quotation',
        url: `/quotations/${q.id}`,
        badgeColor: '#8b5cf6'
      });
    });

    orders.forEach(o => {
      results.push({
        id: o.id,
        title: `Order ${o.orderNumber}`,
        subtitle: `Customer: ${o.customer?.businessName || 'N/A'} • ₹${(o.totalValue || 0).toLocaleString('en-IN')}`,
        type: 'Order',
        url: `/orders/${o.id}`,
        badgeColor: '#10b981'
      });
    });

    products.forEach(p => {
      results.push({
        id: p.id,
        title: p.name,
        subtitle: `Article: ${p.articleNumber || '-'} • Price: ₹${p.sellingPrice}`,
        type: 'Product',
        url: `/products?search=${encodeURIComponent(p.name)}`,
        badgeColor: '#f59e0b'
      });
    });

    return results;
  } catch (error) {
    console.error("Failed to perform global search:", error);
    return [];
  }
}
