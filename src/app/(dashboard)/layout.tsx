import React from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  const canManageSettings = (session?.user as any)?.canManageSettings;
  const showSettings = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || canManageSettings;

  let showAnalytics = false;
  let showProcurement = false;

  if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
    showAnalytics = true;
    showProcurement = true;
  } else if (session?.user) {
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      include: { roleDef: true }
    });
    if (user?.roleDef?.permissions) {
      try {
        const perms = JSON.parse(user.roleDef.permissions);
        if (perms.includes("View Analytics")) showAnalytics = true;
        if (
          perms.includes("Manage Procurement") ||
          perms.includes("Manage Vendors") ||
          perms.includes("Manage Purchases") ||
          perms.includes("Manage Warehouses")
        ) {
          showProcurement = true;
        }
      } catch (e) {}
    }
  }

  return (
    <DashboardShell 
      showSettings={showSettings} 
      showAnalytics={showAnalytics}
      showProcurement={showProcurement}
      userRole={userRole}
    >
      {children}
    </DashboardShell>
  );
}
