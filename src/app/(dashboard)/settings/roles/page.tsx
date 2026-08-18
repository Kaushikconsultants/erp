import React from 'react';
import { prisma } from '@/lib/prisma';
import { Shield } from 'lucide-react';
import RoleManager from '@/components/settings/RoleManager';

export default async function RolesSettingsPage() {
  const roles = await prisma.role.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title"><Shield className="inline-block mr-2" /> Role-Based Access Control</h1>
          <p className="page-subtitle">Manage custom roles and permissions</p>
        </div>
      </div>

      <RoleManager roles={roles} />
    </div>
  );
}
