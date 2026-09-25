import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDebitNotes } from '@/app/actions/debitNoteActions';
import { prisma } from '@/lib/prisma';
import DebitNotesClient from '@/components/debit-notes/DebitNotesClient';
import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Debit Notes | ERP Suite',
  description: 'Manage customer supplementary debit notes and vendor purchase returns under GST Sec 34.'
};

export default async function DebitNotesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const orgId = await getTenantOrgId();
  const whereOrg = orgId ? { OR: [{ organizationId: orgId }, { organizationId: null }] } : {};

  const [dnRes, customers, vendors, products, invoices, bills] = await Promise.all([
    getDebitNotes(),
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
    prisma.vendor.findMany({
      where: whereOrg,
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
    }),
    prisma.invoice.findMany({
      where: whereOrg,
      select: {
        id: true,
        invoiceNumber: true,
        customerId: true,
        totalAmount: true,
        status: true
      },
      orderBy: { invoiceDate: 'desc' },
      take: 100
    }),
    prisma.bill.findMany({
      where: whereOrg,
      select: {
        id: true,
        billNumber: true,
        vendorId: true,
        totalAmount: true,
        status: true
      },
      orderBy: { billDate: 'desc' },
      take: 100
    })
  ]);

  const debitNotes = dnRes.success ? dnRes.debitNotes : [];

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <div className="dashboard-header mb-6">
        <div>
          <h1 className="page-title">Debit Notes (Customer & Vendor)</h1>
          <p className="page-subtitle">
            Issue supplementary debit notes to customers and record purchase returns to vendors under GST Sec 34.
          </p>
        </div>
      </div>

      <DebitNotesClient
        initialDebitNotes={JSON.parse(JSON.stringify(debitNotes))}
        customers={JSON.parse(JSON.stringify(customers))}
        vendors={JSON.parse(JSON.stringify(vendors))}
        products={JSON.parse(JSON.stringify(products))}
        invoices={JSON.parse(JSON.stringify(invoices))}
        bills={JSON.parse(JSON.stringify(bills))}
      />
    </div>
  );
}
