import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getVendorCredits } from '@/app/actions/vendorCreditActions';
import { prisma } from '@/lib/prisma';
import VendorCreditsClient from '@/components/vendor-credits/VendorCreditsClient';

import { canUserAccessSection } from '@/lib/authPermissions';

import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function VendorCreditsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const hasAccess = await canUserAccessSection(session.user, 'purchases');
  if (!hasAccess) redirect('/');

  const orgId = await getTenantOrgId();

  const res = await getVendorCredits();
  const credits = res.success ? res.credits : [];
  const summary = res.success ? res.summary : {
    totalCredits: 0,
    totalCreditAmount: 0,
    availableBalance: 0,
    adjustedAmount: 0,
    openCreditsCount: 0
  };

  const vendors = await prisma.vendor.findMany({
    where: { organizationId: orgId, status: 'Active' },
    select: {
      id: true,
      companyName: true,
      contactPerson: true,
      mobile: true,
      city: true,
      state: true,
      gstNumber: true
    },
    orderBy: { companyName: 'asc' }
  });

  const products = await prisma.product.findMany({
    where: { organizationId: orgId, status: 'Active' },
    select: {
      id: true,
      name: true,
      sku: true,
      purchasePrice: true
    },
    orderBy: { name: 'asc' }
  });

  const bills = await prisma.bill.findMany({
    where: {
      organizationId: orgId,
      amountDue: { gt: 0 },
      status: { in: ['Open', 'Partially Paid', 'Overdue'] }
    },
    select: {
      id: true,
      billNumber: true,
      vendorBillNumber: true,
      vendorId: true,
      totalAmount: true,
      amountPaid: true,
      amountDue: true
    },
    orderBy: { billDate: 'asc' }
  });

  return (
    <VendorCreditsClient
      initialCredits={JSON.parse(JSON.stringify(credits))}
      initialSummary={summary}
      vendors={vendors}
      products={products}
      bills={JSON.parse(JSON.stringify(bills))}
    />
  );
}
