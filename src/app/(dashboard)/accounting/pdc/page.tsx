import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getPdcRegister } from '@/app/actions/pdcActions';
import { prisma } from '@/lib/prisma';
import { getTenantOrgId } from '@/lib/tenant';
import PdcClient from '@/components/accounting/PdcClient';

export const dynamic = 'force-dynamic';

export default async function PdcRegisterPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const organizationId = await getTenantOrgId();

  const [pdcRes, customers, vendors] = await Promise.all([
    getPdcRegister(),
    prisma.customer.findMany({
      where: { organizationId },
      select: { id: true, businessName: true, mobile: true },
      orderBy: { businessName: 'asc' }
    }),
    prisma.vendor.findMany({
      where: { organizationId },
      select: { id: true, companyName: true, mobile: true },
      orderBy: { companyName: 'asc' }
    })
  ]);

  if (!pdcRes.success) {
    return (
      <div style={{ padding: '24px' }}>
        <h2>PDC Register</h2>
        <p style={{ color: '#ef4444' }}>{pdcRes.error || "Failed to load PDC register"}</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <PdcClient
        initialCheques={pdcRes.cheques || []}
        initialMetrics={pdcRes.metrics || {}}
        bankLedgers={pdcRes.bankLedgers || []}
        customers={customers || []}
        vendors={vendors || []}
      />
    </div>
  );
}
