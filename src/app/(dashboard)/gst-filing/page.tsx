import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getGstFilingOverview } from '@/app/actions/gstFilingActions';
import { canUserAccessSection } from '@/lib/authPermissions';
import GstFilingClient from '@/components/gst-filing/GstFilingClient';

export const dynamic = 'force-dynamic';

export default async function GstFilingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const hasAccess = await canUserAccessSection(session.user, 'gst_filing');
  if (!hasAccess) {
    redirect('/');
  }

  const initialData = await getGstFilingOverview();

  if (!initialData.success) {
    return (
      <div className="page-container" style={{ padding: '24px' }}>
        <div style={{ color: '#dc2626' }}>
          Failed to load GST Filing data: {initialData.error}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '16px 20px', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <GstFilingClient initialData={initialData} />
    </div>
  );
}
