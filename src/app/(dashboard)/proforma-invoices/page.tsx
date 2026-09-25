import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getProformaInvoices } from '@/app/actions/proformaActions';
import { prisma } from '@/lib/prisma';
import ProformaInvoicesClient from '@/components/proforma-invoices/ProformaInvoicesClient';
import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Proforma Invoices | ERP Suite',
  description: 'Manage proforma invoices, quotation billing, and 1-click conversion to GST Tax Invoices.'
};

export default async function ProformaInvoicesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const orgId = await getTenantOrgId();
  const whereOrg = orgId ? { OR: [{ organizationId: orgId }, { organizationId: null }] } : {};

  const [piRes, customers, orders, products] = await Promise.all([
    getProformaInvoices(),
    prisma.customer.findMany({
      where: whereOrg,
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
    prisma.order.findMany({
      where: whereOrg,
      select: {
        id: true,
        orderNumber: true,
        customerId: true,
        totalValue: true
      },
      orderBy: { orderDate: 'desc' },
      take: 100
    }),
    prisma.product.findMany({
      where: whereOrg,
      select: {
        id: true,
        name: true,
        sku: true,
        sellingPrice: true,
        stockQuantity: true,
        hsnCode: true
      },
      orderBy: { name: 'asc' }
    })
  ]);

  const proformas = piRes.success ? piRes.proformas : [];

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <div className="dashboard-header mb-6">
        <div>
          <h1 className="page-title">Proforma Invoices</h1>
          <p className="page-subtitle">
            Issue pre-invoice quotations, track advance payments, and convert to official Tax Invoices with 1 click.
          </p>
        </div>
      </div>

      <ProformaInvoicesClient
        initialProformas={JSON.parse(JSON.stringify(proformas))}
        customers={JSON.parse(JSON.stringify(customers))}
        orders={JSON.parse(JSON.stringify(orders))}
        products={JSON.parse(JSON.stringify(products))}
      />
    </div>
  );
}
