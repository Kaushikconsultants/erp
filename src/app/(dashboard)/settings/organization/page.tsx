import React from 'react';
import { getCompanySettings } from '@/app/actions/companyActions';
import OrganizationForm from '@/components/settings/OrganizationForm';
import { Building, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OrganizationSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const userRole = (session.user as any).role;
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    redirect('/settings');
  }

  const res = await getCompanySettings();
  const company = res.settings;

  return (
    <div className="page-container max-w-4xl mx-auto">
      <div className="dashboard-header mb-6">
        <div>
          <Link href="/settings" className="text-sm text-indigo-600 hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft size={16} /> Back to Settings
          </Link>
          <h1 className="page-title flex items-center gap-3">
            <Building className="text-indigo-600" /> Organization Profile & Logo
          </h1>
          <p className="page-subtitle">Configure company details, GSTIN, bank accounts, and quotation logo.</p>
        </div>
      </div>

      <div className="glass-panel p-6">
        <OrganizationForm initialData={company} />
      </div>
    </div>
  );
}
