import React from 'react';
import PlatformAdminClient from '@/components/platform-admin/PlatformAdminClient';
import { getPlatformAdminOverview } from '@/app/actions/tenantActions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PlatformAdminPage() {
  const result = await getPlatformAdminOverview();

  if (!result.success) {
    redirect('/');
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <PlatformAdminClient initialData={result} />
    </div>
  );
}
