import React from 'react';
import { getExpenses } from '@/app/actions/expenseActions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getTenantOrgId } from '@/lib/tenant';
import ExpensesClient from '@/components/expenses/ExpensesClient';

export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const organizationId = await getTenantOrgId();

  const [res, vendors, customers, companySettings, employees] = await Promise.all([
    getExpenses(),
    prisma.vendor.findMany({
      where: organizationId ? { organizationId } : {},
      select: {
        id: true,
        companyName: true,
        contactPerson: true,
        gstNumber: true,
        state: true,
        city: true
      },
      orderBy: { companyName: 'asc' }
    }),
    prisma.customer.findMany({
      where: organizationId ? { organizationId } : {},
      select: {
        id: true,
        businessName: true,
        contactPerson: true,
        state: true,
        city: true
      },
      orderBy: { businessName: 'asc' }
    }),
    prisma.companySettings.findFirst({
      where: organizationId ? { organizationId } : {}
    }),
    prisma.employee.findMany({
      where: organizationId ? { organizationId } : {},
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  if (res.error) redirect('/');

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <ExpensesClient
        initialExpenses={JSON.parse(JSON.stringify(res.expenses || []))}
        isAdmin={res.isAdmin || false}
        currentUserId={(session.user as any)?.id}
        vendors={JSON.parse(JSON.stringify(vendors || []))}
        customers={JSON.parse(JSON.stringify(customers || []))}
        companyState={companySettings?.state || 'Haryana'}
        employees={JSON.parse(JSON.stringify(employees || []))}
      />
    </div>
  );
}
