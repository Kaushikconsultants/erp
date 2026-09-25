import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AddLeadButton from '@/components/ui/AddLeadButton';
import LeadTable from '@/components/ui/LeadTable';
import { getTenantScope } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const { organizationId, isAdmin, employeeId } = await getTenantScope();

  let whereClause: any = { organizationId };

  if (!isAdmin) {
    whereClause.assignedSalespersonId = employeeId || 'unassigned';
  }

  let leads: any[] = [];
  let allEmployees: { id: string; name: string }[] = [];

  try {
    const [leadsRes, empRes] = await Promise.allSettled([
      prisma.lead.findMany({
        where: whereClause,
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedSalesperson: {
            select: {
              id: true,
              user: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        }
      }),
      isAdmin ? prisma.employee.findMany({
        where: { organizationId },
        select: {
          id: true,
          user: {
            select: { id: true, name: true }
          }
        },
        orderBy: { user: { name: 'asc' } }
      }) : Promise.resolve([])
    ]);

    if (leadsRes.status === 'fulfilled') {
      leads = leadsRes.value || [];
    }
    if (empRes.status === 'fulfilled' && empRes.value) {
      allEmployees = (empRes.value as any[]).map((e: any) => ({
        id: e.id,
        name: e.user?.name || 'Unknown'
      }));
    }
  } catch (err) {
    console.error("Error fetching leads:", err);
  }

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">Manage your incoming leads, WhatsApp inquiries, and track conversions.</p>
        </div>
        <AddLeadButton employees={allEmployees} organizationId={organizationId || undefined} isAdmin={isAdmin} />
      </div>

      <div className="lead-page-panel">
        <LeadTable initialLeads={leads} allEmployees={allEmployees} />
      </div>
    </div>
  );
}
