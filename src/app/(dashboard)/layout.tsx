import React, { Suspense } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import PresenceHeartbeat from '@/components/presence/PresenceHeartbeat';
import NativeSessionSync from '@/components/notifications/NativeSessionSync';
import NavigationProgressBar from '@/components/ui/NavigationProgressBar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantContext } from '@/lib/tenant';
import './dashboard.css';

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const tenantCtx = await getTenantContext();
  
  const currentUserId = (session?.user as any)?.id || tenantCtx?.userId || null;
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
      subscriptionPlan={tenantCtx?.subscriptionPlan || "GROWTH"}
      subscriptionStatus={tenantCtx?.subscriptionStatus || "ACTIVE"}
      isHardLocked={tenantCtx?.isHardLocked || false}
      isSoftLocked={tenantCtx?.isSoftLocked || false}
      trialDaysRemaining={tenantCtx?.trialDaysRemaining ?? null}
      enabledModules={tenantCtx?.enabledModules || null}
    >
      <Suspense fallback={null}>
        <NavigationProgressBar />
      </Suspense>
      <NativeSessionSync userId={currentUserId} />
      <PresenceHeartbeat />
      {children}
    </DashboardShell>
  );
}
