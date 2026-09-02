import React from 'react';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTenantScope } from '@/lib/tenant';
import LeadDetailClient from '@/components/ui/LeadDetailClient';

export const dynamic = 'force-dynamic';

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const { organizationId, isAdmin } = await getTenantScope();

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, organizationId },
    include: {
      assignedSalesperson: {
        include: { user: true }
      },
      calls: {
        include: { employee: { include: { user: true } } },
        orderBy: { createdAt: 'desc' }
      },
      followUps: {
        include: { employee: { include: { user: true } } },
        orderBy: { date: 'asc' }
      },
      tasks: {
        include: { 
          assignee: { include: { user: true } },
          creator: { include: { user: true } }
        },
        orderBy: { dueDate: 'asc' }
      }
    }
  });

  if (!lead) {
    return (
      <div className="page-container">
        <h1>Lead Not Found</h1>
        <p>The lead you are looking for does not exist or you do not have permission to view it.</p>
      </div>
    );
  }

  let employees: any[] = [];
  if (isAdmin) {
    employees = await prisma.employee.findMany({
      where: { organizationId },
      include: { user: true },
      orderBy: { user: { name: 'asc' } }
    });
  }

  return <LeadDetailClient lead={lead} employees={employees} />;
}
