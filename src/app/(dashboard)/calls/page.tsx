import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LogCallButton from '@/components/ui/LogCallButton';
import CallsTableClient from '@/components/ui/CallsTableClient';
import { getCompanySettings } from '@/app/actions/companyActions';

export default async function CallsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as any).role || 'SALES';
  const userId = (session.user as any).id;
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  let callWhereClause = {};
  let customerWhereClause = {};

  if (!isAdmin) {
    const employee = await prisma.employee.findUnique({
      where: { userId: userId }
    });

    if (employee) {
      callWhereClause = { employeeId: employee.id };
      customerWhereClause = { assignedSalespersonId: employee.id };
    } else {
      callWhereClause = { id: '00000000-0000-0000-0000-000000000000' };
      customerWhereClause = { id: '00000000-0000-0000-0000-000000000000' };
    }
  }

  const [calls, customers, companyRes] = await Promise.all([
    prisma.call.findMany({
      where: callWhereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
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
    getCompanySettings()
  ]);

  const mappedCustomers = customers.map(c => ({
    id: c.id,
    companyName: c.businessName,
    contactPerson: c.contactPerson
  }));

  const callOutcomes = companyRes?.settings?.callOutcomes || ["INTERESTED", "NOT_INTERESTED", "NO_ANSWER", "ORDER_PLACED", "COMPLAINT", "FOLLOW_UP_NEEDED"];

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Calls & Follow-ups</h1>
          <p className="page-subtitle">Log calls, schedule follow-ups, and manage tasks.</p>
        </div>
        <LogCallButton customers={mappedCustomers} />
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <CallsTableClient calls={calls} availableOutcomes={callOutcomes} />
      </div>
    </div>
  );
}
