import React from 'react';
import { getPayments, getPaymentSummary } from '@/app/actions/paymentActions';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PaymentsClient from '@/components/payments/PaymentsClient';

import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const orgId = await getTenantOrgId();

  const [paymentsRes, summaryRes, customers] = await Promise.all([
    getPayments(),
    getPaymentSummary(),
    prisma.customer.findMany({
      where: { organizationId: orgId },
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
    })
  ]);

  const payments = paymentsRes.success ? (paymentsRes.payments as any) : [];
  const summary = summaryRes.success ? (summaryRes as any) : null;

  return (
    <PaymentsClient
      initialPayments={payments}
      summary={summary}
      customers={customers}
    />
  );
}
