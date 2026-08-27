import React from 'react';
import { getPayrollData } from '@/app/actions/hrmsActions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PayrollClient from '@/components/payroll/PayrollClient';
import MonthPicker from '@/components/ui/MonthPicker';

export const dynamic = 'force-dynamic';

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const resolvedParams = await searchParams;
  const today = new Date();
  const month = resolvedParams?.month || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const res = await getPayrollData(month);
  if (res.error) redirect('/');

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <PayrollClient
        employees={JSON.parse(JSON.stringify(res.employees || []))}
        month={month}
        isAdmin={res.isAdmin || false}
      />
    </div>
  );
}
