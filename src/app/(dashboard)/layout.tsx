import React from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import PresenceHeartbeat from '@/components/presence/PresenceHeartbeat';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantContext } from '@/lib/tenant';

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const tenantCtx = await getTenantContext();
  
  const userRole = tenantCtx?.userRole || (session?.user as any)?.role || 'SALES';
  const canManageSettings = tenantCtx?.canManageSettings || (session?.user as any)?.canManageSettings || false;
  const allowedSectionsList = tenantCtx?.allowedSections || null;
  const isPlatformOwner = tenantCtx?.isPlatformOwner || false;

  const isSuperOrAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
  const showSettings = isSuperOrAdmin || canManageSettings;
  const showAnalytics = isSuperOrAdmin || (allowedSectionsList ? allowedSectionsList.includes('reports') : false);
  const showProcurement = isSuperOrAdmin || (
    allowedSectionsList
      ? (allowedSectionsList.includes('purchases') || allowedSectionsList.includes('procurement'))
      : (userRole === 'PURCHASE' || userRole === 'WAREHOUSE')
  );

  return (
    <DashboardShell 
      showSettings={showSettings} 
      showAnalytics={showAnalytics}
      showProcurement={showProcurement}
      userRole={userRole}
      isPlatformOwner={isPlatformOwner}
      allowedSections={allowedSectionsList}
    >
      <PresenceHeartbeat />
      {children}
    </DashboardShell>
  );
}
