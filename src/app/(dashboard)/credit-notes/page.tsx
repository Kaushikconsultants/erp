import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getCreditNotes } from '@/app/actions/creditNoteActions';
import { prisma } from '@/lib/prisma';
import CreditNotesClient from '@/components/credit-notes/CreditNotesClient';

export const dynamic = 'force-dynamic';

export default async function CreditNotesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const [cnRes, customers, products, invoices] = await Promise.all([
    getCreditNotes(),
    prisma.customer.findMany({
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
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        articleNumber: true,
        sellingPrice: true,
        stockQuantity: true,
        hsnCode: true
      },
      orderBy: { name: 'asc' }
    }),
    prisma.invoice.findMany({
      select: {
        id: true,
        invoiceNumber: true,
        customerId: true,
        totalAmount: true,
        status: true
      },
      orderBy: { invoiceDate: 'desc' },
      take: 100
    })
  ]);

  const creditNotes = cnRes.success ? cnRes.creditNotes : [];

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <div className="dashboard-header mb-6">
        <div>
          <h1 className="page-title">Credit Notes & Sales Returns</h1>
          <p className="page-subtitle">
            Issue credit notes, record sales returns with automatic stock replenishment, and track adjustments.
          </p>
        </div>
      </div>

      <CreditNotesClient
        initialCreditNotes={JSON.parse(JSON.stringify(creditNotes))}
        customers={JSON.parse(JSON.stringify(customers))}
        products={JSON.parse(JSON.stringify(products))}
        invoices={JSON.parse(JSON.stringify(invoices))}
      />
    </div>
  );
}
