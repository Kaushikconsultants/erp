import React from 'react';
import { getCustomerLedgerStatement } from '@/app/actions/customerLedgerActions';
import CustomerLedgerClient from '@/components/customers/CustomerLedgerClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CustomerLedgerPage({ params }: { params: { id: string } }) {
  const resolvedParams = await params;
  const customerId = resolvedParams.id;

  const result = await getCustomerLedgerStatement(customerId);

  if (!result.success) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Unable to load ledger statement</h2>
        <p style={{ color: '#ef4444' }}>{result.error || "Customer record not found"}</p>
        <Link href={`/customers/${customerId}`} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#0f172a', color: '#fff', textDecoration: 'none' }}>
          Back to Customer
        </Link>
      </div>
    );
  }

  return <CustomerLedgerClient initialData={result} customerId={customerId} />;
}
