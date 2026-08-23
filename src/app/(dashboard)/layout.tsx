import React from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import PresenceHeartbeat from '@/components/presence/PresenceHeartbeat';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  
  let userRole = (session?.user as any)?.role || 'SALES';
  let canManageSettings = (session?.user as any)?.canManageSettings || false;
  let allowedSectionsList: string[] | null = null;

  if (session?.user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { role: true, canManageSettings: true, allowedSections: true }
    });

    if (dbUser) {
      userRole = dbUser.role;
      canManageSettings = dbUser.canManageSettings;
      if (dbUser.allowedSections) {
        try {
          if (dbUser.allowedSections.startsWith('[')) {
            allowedSectionsList = JSON.parse(dbUser.allowedSections);
          } else {
            allowedSectionsList = dbUser.allowedSections.split(',').map(s => s.trim());
          }
        } catch {}
      }
    }
  }

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
      allowedSections={allowedSectionsList}
    >
      <PresenceHeartbeat />
      {children}
    </DashboardShell>
  );
}
