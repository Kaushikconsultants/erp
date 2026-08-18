import React from 'react';
import { getPipelineData } from '@/app/actions/leadActions';
import KanbanBoard from '@/components/leads/KanbanBoard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const res = await getPipelineData();
  const leads = res.success ? res.customers : [];

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '100%', overflow: 'hidden' }}>
      <div className="dashboard-header mb-6">
        <div>
          <h1 className="page-title">Sales Pipeline</h1>
          <p className="page-subtitle">Drag and drop leads to update their stage</p>
        </div>
        <div>
          <Link href="/customers" className="primary-btn">
            + New Lead
          </Link>
        </div>
      </div>

      <KanbanBoard initialLeads={leads} />
    </div>
  );
}
