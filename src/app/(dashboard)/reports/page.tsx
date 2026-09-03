import React from 'react';
import { getAllReportsHubData } from '@/app/actions/reportActions';
import ReportCenterClient from '@/components/reports/ReportCenterClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BarChart3 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const hubRes = await getAllReportsHubData();
  const hubData = hubRes.success ? hubRes.data : ({} as any);

  const salesData = hubData.salesOrders || [];
  const inventoryData = hubData.inventory || {};
  const financialData = hubData.financials || {};
  const productSales = hubData.productSales || {};
  const employeesData = hubData.employees || [];
  const quotationsData = hubData.quotations || [];

  return (
    <div className="reports-page-wrapper" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
      <div className="dashboard-header" style={{ marginBottom: '18px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            <BarChart3 className="text-indigo-600" size={24} /> Reports Center & AI Analytics
          </h1>
          <p className="page-subtitle" style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Comprehensive business reports, financial statements, sales ledger breakdowns, and AI diagnostics.
          </p>
        </div>
      </div>

      <ReportCenterClient
        salesData={JSON.parse(JSON.stringify(salesData))}
        inventoryData={JSON.parse(JSON.stringify(inventoryData))}
        financialData={JSON.parse(JSON.stringify(financialData))}
        productSales={JSON.parse(JSON.stringify(productSales))}
        employeesData={JSON.parse(JSON.stringify(employeesData))}
        quotationsData={JSON.parse(JSON.stringify(quotationsData))}
      />
    </div>
  );
}
