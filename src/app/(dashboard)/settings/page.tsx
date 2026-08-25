import React from 'react';
import { prisma } from '@/lib/prisma';
import AddUserButton from '@/components/ui/AddUserButton';
import SettingsMenu from '@/components/ui/SettingsMenu';
import UserManagementTable from '@/components/ui/UserManagementTable';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import './settings.css';

import { getTenantOrgId, getTenantContext } from '@/lib/tenant';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const tenantCtx = await getTenantContext();
  
  if (!session?.user) {
    redirect('/login');
  }

  const orgId = await getTenantOrgId();
  const userRole = (session.user as any).role;
  const canManageSettings = (session.user as any).canManageSettings;
  const isPlatformOwner = tenantCtx?.isPlatformOwner || false;

  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && !canManageSettings) {
    redirect('/');
  }

  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, email: true, role: true, isActive: true, canManageSettings: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Administration & HR</h1>
          <p className="page-subtitle">Manage system users, employee roles, and company settings.</p>
        </div>
        <AddUserButton />
      </div>

      <div className="settings-grid">
        <SettingsMenu isPlatformOwner={isPlatformOwner} />

        <div className="glass-panel settings-card full-width">
          <h3>User Management</h3>
          <p className="section-desc">Create and manage access for employees across the application.</p>
          
          <UserManagementTable initialUsers={users} />
        </div>
      </div>
    </div>
  );
}
