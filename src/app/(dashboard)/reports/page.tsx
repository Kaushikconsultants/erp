import React from 'react';
import { getSalesReport, getInventoryReport, getFinancialsReport, getSalesIntelligence } from '@/app/actions/reportActions';
import ReportCenterClient from '@/components/reports/ReportCenterClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PieChart } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const [salesRes, inventoryRes, financialsRes, intelRes] = await Promise.all([
    getSalesReport(),
    getInventoryReport(),
    getFinancialsReport(),
    getSalesIntelligence(),
  ]);

  const salesData = salesRes.success ? salesRes.orders : [];
  const inventoryData = inventoryRes.success ? inventoryRes : {};
  const financialData = financialsRes.success ? financialsRes : {};
  const productSales = intelRes.success ? intelRes.productSales : {};

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <div className="dashboard-header mb-6">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PieChart className="text-indigo-600" /> Report Center & Analytics
          </h1>
          <p className="page-subtitle">Exportable CSV & PDF business reports across all modules.</p>
        </div>
      </div>

      <ReportCenterClient
        salesData={JSON.parse(JSON.stringify(salesData))}
        inventoryData={JSON.parse(JSON.stringify(inventoryData))}
        financialData={JSON.parse(JSON.stringify(financialData))}
        productSales={JSON.parse(JSON.stringify(productSales))}
      />
    </div>
  );
}
