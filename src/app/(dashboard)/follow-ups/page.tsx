import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrCreateEmployee } from '@/lib/employeeHelper';
import { getTenantOrgId } from '@/lib/tenant';
import FollowUpDashboardClient from '@/components/follow-ups/FollowUpDashboardClient';

export const dynamic = 'force-dynamic';

export default async function FollowUpsDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const orgId = await getTenantOrgId();
  const userRole = (session.user as any).role || 'SALES';
  const userId = (session.user as any).id;
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  let whereClause: any = {
    followUpDate: { not: null },
    OR: [
      { customer: { organizationId: orgId } },
      { lead: { organizationId: orgId } }
    ]
  };

  let customerWhereClause: any = { organizationId: orgId };
  let leadWhereClause: any = { organizationId: orgId };

  if (!isAdmin) {
    const employee = await getOrCreateEmployee(userId, session.user);
    if (employee) {
      whereClause.employeeId = employee.id;
      customerWhereClause = { assignedSalespersonId: employee.id, organizationId: orgId };
      leadWhereClause = { assignedSalespersonId: employee.id, organizationId: orgId };
    }
  }

  const [calls, customers, leads] = await Promise.all([
    prisma.call.findMany({
      where: whereClause,
      orderBy: { followUpDate: 'asc' },
      include: {
        customer: true,
        lead: true,
        employee: { include: { user: true } }
      }
    }),
    prisma.customer.findMany({
      where: customerWhereClause,
      select: { id: true, businessName: true, contactPerson: true },
      orderBy: { businessName: 'asc' }
    }),
    prisma.lead.findMany({
      where: leadWhereClause,
      select: { id: true, name: true, shopName: true },
      orderBy: { name: 'asc' }
    })
  ]);

  const mappedCustomers = [
    ...customers.map(c => ({
      id: c.id,
      companyName: c.businessName,
      contactPerson: c.contactPerson,
      type: 'Customer'
    })),
    ...leads.map(l => ({
      id: l.id,
      companyName: l.shopName || l.name,
      contactPerson: l.name,
      type: 'Lead'
    }))
  ];

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <div className="dashboard-header mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Follow-up Dashboard</h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>Centralized view of all sales follow-ups.</p>
        </div>
        <Link href="/calls" className="primary-btn" style={{ textDecoration: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, backgroundColor: 'var(--accent-primary, #4f46e5)', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          Open Calls & Tasks →
        </Link>
      </div>

      <FollowUpDashboardClient 
        initialCalls={calls} 
        mappedCustomers={mappedCustomers} 
        isAdmin={isAdmin} 
      />
    </div>
  );
}
