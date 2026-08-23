import React from 'react';
import BillingClient from '@/components/settings/BillingClient';
import { getTenantBillingOverview } from '@/app/actions/tenantActions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const result = await getTenantBillingOverview();

  if (!result.success || !result.org) {
    return (
      <div style={{ padding: '24px' }}>
        <h2>Billing Settings</h2>
        <p style={{ color: '#ef4444' }}>{result.error || "Unable to load billing data."}</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <BillingClient initialData={result} />
    </div>
  );
}
