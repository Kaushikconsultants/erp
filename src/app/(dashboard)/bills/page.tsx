import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getBills } from '@/app/actions/billActions';
import { prisma } from '@/lib/prisma';
import BillsClient from '@/components/bills/BillsClient';

export const dynamic = 'force-dynamic';

export default async function BillsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const res = await getBills();
  const bills = res.success ? res.bills : [];
  const summary = res.success ? res.summary : {
    totalBills: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalDue: 0,
    unpaidCount: 0,
    paidCount: 0,
    overdueCount: 0
  };

  const vendors = await prisma.vendor.findMany({
    select: {
      id: true,
      companyName: true,
      contactPerson: true,
      mobile: true,
      gstNumber: true,
      city: true,
      state: true,
      paymentTerms: true
    },
    where: { status: 'Active' },
    orderBy: { companyName: 'asc' }
  });

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      purchasePrice: true,
      sellingPrice: true
    },
    where: { status: 'Active' },
    orderBy: { name: 'asc' }
  });

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: {
      status: { in: ['Issued', 'Partially Received', 'Received'] }
    },
    select: {
      id: true,
      poNumber: true,
      vendorId: true,
      totalValue: true,
      status: true,
      items: {
        select: {
          productId: true,
          quantity: true,
          rate: true,
          taxAmount: true,
          total: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <BillsClient
      initialBills={JSON.parse(JSON.stringify(bills))}
      initialSummary={summary}
      vendors={vendors}
      products={products}
      purchaseOrders={JSON.parse(JSON.stringify(purchaseOrders))}
    />
  );
}
