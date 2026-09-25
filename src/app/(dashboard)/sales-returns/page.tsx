import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSalesReturns } from '@/app/actions/salesReturnActions';
import SalesReturnsClient from '@/components/sales-returns/SalesReturnsClient';
import { canUserAccessSection } from '@/lib/authPermissions';
import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sales Returns & RMA | ERP Suite',
  description: 'Manage sales returns, quality check inspection, warehouse restocking, and auto Credit Notes.'
};

export default async function SalesReturnsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const hasAccess = await canUserAccessSection(session.user, 'invoices');
  if (!hasAccess) redirect('/');

  const orgId = await getTenantOrgId();

  const [returnsRes, customers, invoices, warehouses, products] = await Promise.all([
    getSalesReturns(),
    prisma.customer.findMany({
      where: orgId ? { organizationId: orgId } : {},
      select: {
        id: true,
        businessName: true,
        contactPerson: true,
        mobile: true,
        gstNumber: true,
        city: true,
        state: true
      },
      orderBy: { businessName: 'asc' }
    }),
    prisma.invoice.findMany({
      where: orgId ? { organizationId: orgId } : {},
      select: {
        id: true,
        invoiceNumber: true,
        customerId: true,
        totalAmount: true,
        order: {
          select: {
            items: {
              select: {
                id: true,
                productId: true,
                quantity: true,
                rate: true,
                product: {
                  select: {
                    name: true,
                    sku: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { invoiceDate: 'desc' },
      take: 100
    }),
    prisma.warehouse.findMany({
      where: orgId ? { OR: [{ organizationId: orgId }, { organizationId: null }] } : {},
      select: {
        id: true,
        name: true,
        code: true
      },
      orderBy: { name: 'asc' }
    }),
    prisma.product.findMany({
      where: orgId ? { organizationId: orgId, status: 'Active' } : { status: 'Active' },
      select: {
        id: true,
        name: true,
        sku: true,
        sellingPrice: true
      },
      orderBy: { name: 'asc' }
    })
  ]);

  const salesReturns = returnsRes.success ? (returnsRes.salesReturns || []) : [];

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <SalesReturnsClient
        initialSalesReturns={JSON.parse(JSON.stringify(salesReturns))}
        customers={JSON.parse(JSON.stringify(customers))}
        invoices={JSON.parse(JSON.stringify(invoices))}
        warehouses={JSON.parse(JSON.stringify(warehouses))}
        products={JSON.parse(JSON.stringify(products))}
      />
    </div>
  );
}
