import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LogCallButton from '@/components/ui/LogCallButton';
import CallsTableClient from '@/components/ui/CallsTableClient';
import { getCompanySettings } from '@/app/actions/companyActions';
import { getOrCreateEmployee } from '@/lib/employeeHelper';

import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function CallsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const orgId = await getTenantOrgId();
  const userRole = (session.user as any).role || 'SALES';
  const userId = (session.user as any).id;
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  let callWhereClause: any = {
    OR: [
      { customer: { organizationId: orgId } },
      { lead: { organizationId: orgId } }
    ]
  };
  let customerWhereClause: any = {
    organizationId: orgId
  };
  let leadWhereClause: any = {
    organizationId: orgId
  };

  if (!isAdmin) {
    const employee = await getOrCreateEmployee(userId, session.user);
    if (employee) {
      callWhereClause = { 
        employeeId: employee.id, 
        OR: [
          { customer: { organizationId: orgId } },
          { lead: { organizationId: orgId } }
        ]
      };
      customerWhereClause = { assignedSalespersonId: employee.id, organizationId: orgId };
      leadWhereClause = { assignedSalespersonId: employee.id, organizationId: orgId };
    }
  }

  const [calls, customers, leads, companyRes] = await Promise.all([
    prisma.call.findMany({
      where: callWhereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        lead: true,
        employee: {
          include: { user: true }
        }
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
    }),
    getCompanySettings()
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

  const callOutcomes = companyRes?.settings?.callOutcomes || ["Interested / Follow-up Needed", "Not Interested", "No Answer / Voicemail", "Order Placed", "Complaint / Support", "Call Back Later"];
  const callTypes = companyRes?.settings?.callTypes || ["Outbound Call (Made by us)", "Inbound Call (Received from customer)", "In-person Meeting", "WhatsApp Chat"];

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Calls & Follow-ups</h1>
          <p className="page-subtitle">Log calls, schedule follow-ups, and manage tasks.</p>
        </div>
        <LogCallButton customers={mappedCustomers} isAdmin={isAdmin} />
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <CallsTableClient calls={calls} availableOutcomes={callOutcomes} availableCallTypes={callTypes} />
      </div>
    </div>
  );
}
