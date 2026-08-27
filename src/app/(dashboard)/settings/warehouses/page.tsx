import React from 'react';
import { getWarehouses, getBranchesForSelect } from '@/app/actions/warehouseActions';
import WarehouseManagerClient from '@/components/warehouses/WarehouseManagerClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SettingsWarehousesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const userRole = (session.user as any).role;
  const canManageSettings = (session.user as any).canManageSettings;

  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && !canManageSettings) {
    redirect('/settings');
  }

  const [whRes, branchRes] = await Promise.all([
    getWarehouses(),
    getBranchesForSelect()
  ]);

  const warehouses = whRes?.success ? (whRes.warehouses as any[]) : [];
  const branches = branchRes?.success ? (branchRes.branches as any[]) : [];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      <WarehouseManagerClient
        initialWarehouses={warehouses}
        branches={branches}
        isSettingsContext={true}
      />
    </div>
  );
}
