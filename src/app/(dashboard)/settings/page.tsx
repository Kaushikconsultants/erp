import React from 'react';
import { prisma } from '@/lib/prisma';
import AddUserButton from '@/components/ui/AddUserButton';
import SettingsMenu from '@/components/ui/SettingsMenu';
import UserManagementTable from '@/components/ui/UserManagementTable';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import './settings.css';
import { Sliders, Users, ShieldCheck, KeyRound, Building2 } from 'lucide-react';
import { getTenantOrgId, getTenantContext } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

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

  const [users, org] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: orgId },
      include: { employee: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { maxUsers: true, subscriptionPlan: true, billingCycle: true }
    })
  ]);

  const maxUsers = org?.maxUsers || 10;
  const totalUsers = users.length;
  const isAtCapacity = totalUsers >= maxUsers;
  const activeUsers = users.filter((u) => u.isActive).length;
  const adminUsers = users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length;

  return (
    <div className="page-container" style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
      {/* ─── 1. COMMAND HEADER ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-lg, 12px)',
              background: 'var(--accent-gradient, linear-gradient(135deg, var(--accent-primary, #4f46e5) 0%, #3730a3 100%))',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px var(--accent-light, rgba(79, 70, 229, 0.25))',
              flexShrink: 0
            }}
          >
            <Sliders size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)', letterSpacing: '-0.015em' }}>
              Administration, HR & Company Settings
            </h1>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', fontWeight: 400, color: 'var(--text-secondary, #64748b)' }}>
              Configure company identity, GST tax rules, document templates, employee roles, workflows, and system access.
            </p>
          </div>
        </div>
      </div>

      {/* ─── 2. TOP KPI CARDS ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px'
        }}
      >
        {/* Card 1: Total Users */}
        <div
          className="glass-panel"
          style={{
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '10px',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb'
            }}
          >
            <Users size={20} />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Organization Users
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginTop: '1px' }}>
              {totalUsers} {totalUsers === 1 ? 'User' : 'Users'}
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 400, color: '#94a3b8', marginTop: '1px' }}>
              Registered on tenant workspace
            </div>
          </div>
        </div>

        {/* Card 2: Active Accounts */}
        <div
          className="glass-panel"
          style={{
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '10px',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669'
            }}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Login Accounts
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#059669', marginTop: '1px' }}>
              {activeUsers} Active
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 400, color: '#94a3b8', marginTop: '1px' }}>
              {totalUsers - activeUsers} inactive or suspended
            </div>
          </div>
        </div>

        {/* Card 3: Admin Roles */}
        <div
          className="glass-panel"
          style={{
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '10px',
              background: '#fffbeb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706'
            }}
          >
            <KeyRound size={20} />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Administrative Privileges
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#d97706', marginTop: '1px' }}>
              {adminUsers} {adminUsers === 1 ? 'Admin' : 'Admins'}
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 400, color: '#94a3b8', marginTop: '1px' }}>
              Full system configuration access
            </div>
          </div>
        </div>

        {/* Card 4: Security Status */}
        <div
          className="glass-panel"
          style={{
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '10px',
              background: '#f5f3ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7c3aed'
            }}
          >
            <Building2 size={20} />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Security & RBAC
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#7c3aed', marginTop: '1px' }}>
              RBAC Enforced
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 400, color: '#94a3b8', marginTop: '1px' }}>
              Multi-tenant isolated storage
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. SETTINGS HUBS (4-CARD 2x2 BALANCED GRID) ─── */}
      <SettingsMenu isPlatformOwner={isPlatformOwner} />

      {/* ─── 4. USER MANAGEMENT SECTION ─── */}
      <div
        className="glass-panel"
        style={{
          padding: '22px 24px',
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              User Directory & Access Control
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', fontWeight: 400, color: '#64748b' }}>
              Grant section access, assign roles (Super Admin, Sales, HR, Accounts, Dispatch, Warehouse), and reset security credentials.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ 
              fontSize: '0.78rem', 
              backgroundColor: isAtCapacity ? '#fff1f2' : '#eff6ff', 
              color: isAtCapacity ? '#e11d48' : '#1d4ed8', 
              padding: '5px 12px', 
              borderRadius: '20px', 
              fontWeight: 700, 
              border: isAtCapacity ? '1px solid #fecdd3' : '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>{totalUsers} / {maxUsers} Seats Used</span>
              {isAtCapacity && (
                <span style={{ fontSize: '0.65rem', backgroundColor: '#e11d48', color: '#ffffff', padding: '1px 5px', borderRadius: '4px' }}>
                  FULL
                </span>
              )}
            </div>
            {isAtCapacity && (
              <a
                href="/settings/billing"
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#4f46e5',
                  backgroundColor: '#eef2ff',
                  border: '1px solid #c7d2fe',
                  padding: '5px 12px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                + Buy Extra Seats
              </a>
            )}
            <AddUserButton />
          </div>
        </div>
        
        <UserManagementTable initialUsers={users} />
      </div>
    </div>
  );
}
