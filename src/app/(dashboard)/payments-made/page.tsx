import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getVendorPayments } from '@/app/actions/vendorPaymentActions';
import { prisma } from '@/lib/prisma';
import PaymentsMadeClient from '@/components/payments-made/PaymentsMadeClient';

import { canUserAccessSection } from '@/lib/authPermissions';

import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function PaymentsMadePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const hasAccess = await canUserAccessSection(session.user, 'purchases');
  if (!hasAccess) redirect('/');

  const orgId = await getTenantOrgId();

  const res = await getVendorPayments();
  const payments = res.success ? res.payments : [];
  const summary = res.success ? res.summary : {
    totalPaidOut: 0,
    totalTransactions: 0,
    billPaymentsCount: 0,
    advancePaymentsCount: 0
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

  const unpaidBills = await prisma.bill.findMany({
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
    <PaymentsMadeClient
      initialPayments={JSON.parse(JSON.stringify(payments))}
      initialSummary={summary}
      vendors={vendors}
      unpaidBills={JSON.parse(JSON.stringify(unpaidBills))}
    />
  );
}
