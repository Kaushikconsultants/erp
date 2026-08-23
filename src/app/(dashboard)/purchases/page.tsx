import React from 'react';
import { getPurchaseOrders } from '@/app/actions/purchaseActions';
import { prisma } from '@/lib/prisma';
import PurchasesClient from '@/components/purchases/PurchasesClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

import { canUserAccessSection } from '@/lib/authPermissions';

export const dynamic = 'force-dynamic';

export default async function PurchasesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const hasAccess = await canUserAccessSection(session.user, 'purchases');
  if (!hasAccess) redirect('/');

  const res = await getPurchaseOrders();
  const orders = res.success ? res.orders : [];

  const vendors = await prisma.vendor.findMany({
    select: { id: true, companyName: true },
    where: { status: 'Active' },
    orderBy: { companyName: 'asc' }
  });

  const products = await prisma.product.findMany({
    select: { id: true, name: true, sku: true, sellingPrice: true },
    where: { status: 'Active' },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <PurchasesClient
        initialOrders={JSON.parse(JSON.stringify(orders))}
        vendors={vendors}
        products={products}
      />
    </div>
  );
}
