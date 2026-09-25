import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTenantScope } from '@/lib/tenant';
import FollowUpDashboardClient from '@/components/follow-ups/FollowUpDashboardClient';

export const dynamic = 'force-dynamic';

export default async function FollowUpsDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const { organizationId, isAdmin, employeeId } = await getTenantScope();
  const orgId = (organizationId && organizationId !== "default-org" && organizationId !== "UNAUTHENTICATED") ? organizationId : undefined;
  const empId = employeeId || "no-match";

  let whereClause: any = {
    followUpDate: { not: null },
    AND: [
      ...(orgId ? [{
        OR: [
          { customer: { organizationId: orgId } },
          { lead: { organizationId: orgId } },
          { employee: { organizationId: orgId } }
        ]
      }] : []),
      ...(!isAdmin ? [{
        OR: [
          { employeeId: empId },
          { customer: { assignedSalespersonId: empId } },
          { lead: { assignedSalespersonId: empId } }
        ]
      }] : [])
    ]
  };

  let customerWhereClause: any = {
    ...(orgId ? { organizationId: orgId } : {}),
    ...(!isAdmin ? { assignedSalespersonId: empId } : {})
  };

  let leadWhereClause: any = {
    ...(orgId ? { organizationId: orgId } : {}),
    ...(!isAdmin ? { assignedSalespersonId: empId } : {})
  };

  const [calls, customers, leads] = await Promise.all([
    prisma.call.findMany({
      where: whereClause,
      take: 100,
      orderBy: { followUpDate: 'asc' },
      include: {
        customer: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            mobile: true,
            whatsappNumber: true,
            city: true,
            state: true
          }
        },
        lead: {
          select: {
            id: true,
            name: true,
            shopName: true,
            whatsappNumber: true
          }
        },
        employee: {
          select: {
            id: true,
            user: { select: { id: true, name: true } }
          }
        }
      }
    }).catch(err => {
      console.warn("FollowUpsPage call.findMany error:", err);
      return [];
    }),
    prisma.customer.findMany({
      where: customerWhereClause,
      select: { id: true, businessName: true, contactPerson: true, mobile: true, whatsappNumber: true, city: true },
      take: 100,
      orderBy: { businessName: 'asc' }
    }).catch(err => {
      console.warn("FollowUpsPage customer.findMany error:", err);
      return [];
    }),
    prisma.lead.findMany({
      where: leadWhereClause,
      select: { id: true, name: true, shopName: true, whatsappNumber: true },
      take: 100,
      orderBy: { name: 'asc' }
    }).catch(err => {
      console.warn("FollowUpsPage lead.findMany error:", err);
      return [];
    })
  ]);

  const mappedCustomers = [
    ...customers.map(c => ({
      id: c.id,
      companyName: c.businessName,
      contactPerson: c.contactPerson,
      phone: c.mobile || c.whatsappNumber || '',
      city: c.city || '',
      type: 'Customer'
    })),
    ...leads.map(l => ({
      id: l.id,
      companyName: l.shopName || l.name,
      contactPerson: l.name,
      phone: l.whatsappNumber || '',
      city: '',
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
