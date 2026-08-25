import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrCreateEmployee } from '@/lib/employeeHelper';

import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function FollowUpsDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const orgId = await getTenantOrgId();
  const userRole = (session.user as any).role || 'SALES';
  const userId = (session.user as any).id;

  let whereClause: any = {
    followUpDate: { not: null },
    customer: { organizationId: orgId }
  };

  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    const employee = await getOrCreateEmployee(userId, session.user);
    if (employee) {
      whereClause.employeeId = employee.id;
    }
  }

  const calls = await prisma.call.findMany({
    where: whereClause,
    orderBy: { followUpDate: 'asc' },
    include: {
      customer: true,
      employee: { include: { user: true } }
    }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const overdue = calls.filter(c => c.followUpDate && new Date(c.followUpDate) < today);
  const dueToday = calls.filter(c => c.followUpDate && new Date(c.followUpDate) >= today && new Date(c.followUpDate) < tomorrow);
  const upcoming = calls.filter(c => c.followUpDate && new Date(c.followUpDate) >= tomorrow);

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <div className="dashboard-header mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Follow-up Dashboard</h1>
          <p className="page-subtitle">Centralized view of all sales follow-ups.</p>
        </div>
        <Link href="/calls" className="primary-btn" style={{ textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem' }}>
          Open Calls & Tasks →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Overdue */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #fecaca', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ backgroundColor: '#fef2f2', padding: '12px 16px', borderBottom: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontWeight: 700, color: '#991b1b', fontSize: '0.95rem' }}>Overdue</h3>
            <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>{overdue.length}</span>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {overdue.map(c => (
              <div key={c.id} style={{ border: '1px solid #f1f5f9', padding: '12px', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <Link href={`/customers/${c.customerId}`} style={{ fontWeight: 600, color: '#1e293b', textDecoration: 'none' }}>
                    {c.customer?.businessName}
                  </Link>
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>
                    {c.followUpDate ? new Date(c.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>{c.callType || 'Call'} - {c.notes || 'Follow-up'}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Rep: {c.employee?.user?.name}</span>
                  <Link href={`/calls?customerId=${c.customerId}`} style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
                    Log Call →
                  </Link>
                </div>
              </div>
            ))}
            {overdue.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '16px' }}>No overdue follow-ups!</p>}
          </div>
        </div>

        {/* Due Today */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #fed7aa', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ backgroundColor: '#fff7ed', padding: '12px 16px', borderBottom: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontWeight: 700, color: '#9a3412', fontSize: '0.95rem' }}>Due Today</h3>
            <span style={{ backgroundColor: '#ffedd5', color: '#9a3412', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>{dueToday.length}</span>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dueToday.map(c => (
              <div key={c.id} style={{ border: '1px solid #f1f5f9', padding: '12px', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <Link href={`/customers/${c.customerId}`} style={{ fontWeight: 600, color: '#1e293b', textDecoration: 'none' }}>
                    {c.customer?.businessName}
                  </Link>
                  <span style={{ fontSize: '0.75rem', color: '#ea580c', fontWeight: 600 }}>
                    Today
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>{c.callType || 'Call'} - {c.notes || 'Follow-up'}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Rep: {c.employee?.user?.name}</span>
                  <Link href={`/calls?customerId=${c.customerId}`} style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
                    Log Call →
                  </Link>
                </div>
              </div>
            ))}
            {dueToday.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '16px' }}>No follow-ups due today.</p>}
          </div>
        </div>

        {/* Upcoming */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #bfdbfe', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ backgroundColor: '#eff6ff', padding: '12px 16px', borderBottom: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontWeight: 700, color: '#1e40af', fontSize: '0.95rem' }}>Upcoming</h3>
            <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>{upcoming.length}</span>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcoming.map(c => (
              <div key={c.id} style={{ border: '1px solid #f1f5f9', padding: '12px', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <Link href={`/customers/${c.customerId}`} style={{ fontWeight: 600, color: '#1e293b', textDecoration: 'none' }}>
                    {c.customer?.businessName}
                  </Link>
                  <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                    {c.followUpDate ? new Date(c.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>{c.callType || 'Call'} - {c.notes || 'Follow-up'}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Rep: {c.employee?.user?.name}</span>
                  <Link href={`/calls?customerId=${c.customerId}`} style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
                    Log Call →
                  </Link>
                </div>
              </div>
            ))}
            {upcoming.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '16px' }}>No upcoming follow-ups.</p>}
          </div>
        </div>

      </div>
    </div>
  );
}
