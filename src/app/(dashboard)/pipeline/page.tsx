import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTenantScope } from '@/lib/tenant';
import { getPipelineData } from '@/app/actions/leadActions';
import KanbanBoard from '@/components/leads/KanbanBoard';
import AddLeadButton from '@/components/ui/AddLeadButton';

export const dynamic = 'force-dynamic';

export default async function SalesPipelinePage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const { organizationId, isAdmin } = await getTenantScope();
  const pipelineRes = await getPipelineData();

  const leads = pipelineRes.customers || [];
  const employees = (pipelineRes.employees || []).map((e: any) => ({
    id: e.id,
    name: e.user?.name || e.employeeId || 'Unknown'
  }));

  return (
    <div className="page-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Sales Pipeline & Deal Flow
          </h1>
          <p className="page-subtitle" style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Track every lead through Discovery, Qualification, Proposal, and Closing.
          </p>
        </div>
        <AddLeadButton employees={employees} organizationId={organizationId || undefined} isAdmin={isAdmin} />
      </div>

      <KanbanBoard 
        initialLeads={leads} 
        employees={pipelineRes.employees || []} 
        initialStageTitles={pipelineRes.customStageTitles || {}} 
      />
    </div>
  );
}
