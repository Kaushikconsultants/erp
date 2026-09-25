import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getGoodsReceiptNotes } from '@/app/actions/grnActions';
import GoodsReceiptNotesClient from '@/components/grn/GoodsReceiptNotesClient';
import { canUserAccessSection } from '@/lib/authPermissions';
import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Goods Receipt Notes (GRN) | ERP Suite',
  description: 'Manage GRN, quality check inspections (QC), and warehouse stock receipts.'
};

export default async function GoodsReceiptNotesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const hasAccess = await canUserAccessSection(session.user, 'purchases');
  if (!hasAccess) redirect('/');

  const orgId = await getTenantOrgId();

  const [grnRes, vendors, purchaseOrders, warehouses, products] = await Promise.all([
    getGoodsReceiptNotes(),
    prisma.vendor.findMany({
      where: orgId ? { organizationId: orgId, status: 'Active' } : { status: 'Active' },
      select: {
        id: true,
        companyName: true,
        contactPerson: true,
        mobile: true,
        gstNumber: true,
        city: true,
        state: true
      },
      orderBy: { companyName: 'asc' }
    }),
    prisma.purchaseOrder.findMany({
      where: orgId ? { vendor: { organizationId: orgId } } : {},
      select: {
        id: true,
        poNumber: true,
        vendorId: true,
        status: true,
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
      },
      orderBy: { createdAt: 'desc' },
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
        purchasePrice: true
      },
      orderBy: { name: 'asc' }
    })
  ]);

  const grns = grnRes.success ? (grnRes.grns || []) : [];

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <GoodsReceiptNotesClient
        initialGrns={JSON.parse(JSON.stringify(grns))}
        vendors={JSON.parse(JSON.stringify(vendors))}
        purchaseOrders={JSON.parse(JSON.stringify(purchaseOrders))}
        warehouses={JSON.parse(JSON.stringify(warehouses))}
        products={JSON.parse(JSON.stringify(products))}
      />
    </div>
  );
}
