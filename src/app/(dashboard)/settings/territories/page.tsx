import React from 'react';
import { getTerritories } from '@/app/actions/territoryActions';
import TerritoryManagerClient from '@/components/settings/TerritoryManagerClient';
import { Map, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function TerritoriesSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const userRole = (session.user as any).role;
  const canManageSettings = (session.user as any).canManageSettings;

  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && !canManageSettings) {
    redirect('/settings');
  }

  const res = await getTerritories();
  const territories = res.success ? (res.territories as any[]) : [];

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="dashboard-header mb-6">
        <div>
          <Link href="/settings" className="text-sm text-indigo-600 hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft size={16} /> Back to Settings
          </Link>
          <h1 className="page-title flex items-center gap-3">
            <Map className="text-indigo-600" /> Territory Management
          </h1>
          <p className="page-subtitle">Configure sales territories, regional zones, and mapped pincodes.</p>
        </div>
      </div>

      <TerritoryManagerClient initialTerritories={territories} />
    </div>
  );
}
