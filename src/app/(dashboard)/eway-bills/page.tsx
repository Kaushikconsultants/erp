import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getEWayBills } from '@/app/actions/ewayBillActions';
import { prisma } from '@/lib/prisma';
import { getCompanySettings } from '@/app/actions/companyActions';
import { canUserAccessSection } from '@/lib/authPermissions';
import EWayBillsClient from '@/components/eway-bills/EWayBillsClient';

import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function EWayBillsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const hasAccess = await canUserAccessSection(session.user, 'eway_bills');
  if (!hasAccess) redirect('/');

  const orgId = await getTenantOrgId();

  const [ewbRes, orders, customers, companyRes] = await Promise.all([
    getEWayBills(),
    prisma.order.findMany({
      where: {
        organizationId: orgId,
        orderStatus: { in: ['Processing', 'Packing', 'Packed', 'Dispatched'] }
      },
      include: {
        customer: true,
        invoices: true,
        items: { include: { product: true } }
      },
      orderBy: { orderDate: 'desc' },
      take: 100
    }),
    prisma.customer.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        businessName: true,
        contactPerson: true,
        gstNumber: true,
        mobile: true,
        shippingAddress: true,
        billingAddress: true,
        city: true,
        state: true,
        pincode: true
      },
      orderBy: { businessName: 'asc' }
    }),
    getCompanySettings()
  ]);

  const ewayBills = ewbRes.success ? ewbRes.ewayBills : [];

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <div className="dashboard-header mb-6">
        <div>
          <h1 className="page-title">E-Way Bills & Logistics</h1>
          <p className="page-subtitle">
            Generate official GST Electronic Way Bills, manage Part-A & Part-B transport details, and monitor shipment validity.
          </p>
        </div>
      </div>

      <EWayBillsClient
        initialEWayBills={JSON.parse(JSON.stringify(ewayBills))}
        orders={JSON.parse(JSON.stringify(orders))}
        customers={JSON.parse(JSON.stringify(customers))}
        companySettings={companyRes.settings || {}}
      />
    </div>
  );
}
