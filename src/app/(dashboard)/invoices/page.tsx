import React from 'react';
import { getInvoices } from '@/app/actions/invoiceActions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import InvoicesClient from '@/components/invoices/InvoicesClient';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const res = await getInvoices();
  const invoices = res.success ? res.invoices : [];

  return (
    <div className="page-container">
      <div className="dashboard-header mb-4">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Track all invoices, payments, and outstanding receivables.</p>
        </div>
      </div>
      <InvoicesClient initialInvoices={JSON.parse(JSON.stringify(invoices))} />
    </div>
  );
}
