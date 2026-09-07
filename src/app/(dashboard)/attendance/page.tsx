import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MonthPicker from '@/components/ui/MonthPicker';
import AttendanceCard from '@/components/attendance/AttendanceCard';

import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

const STATUS_COLOR: Record<string, string> = {
  Present: '#22c55e',
  Absent: '#ef4444',
  'Half Day': '#f59e0b',
  Leave: '#8b5cf6',
};

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const orgId = await getTenantOrgId();
  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const resolvedParams = await searchParams;
  const today = new Date();
  const month = resolvedParams?.month || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [year, mon] = month.split('-').map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 0, 23, 59, 59);

  let employees: any[] = [];

  if (isAdmin) {
    employees = await prisma.employee.findMany({
      where: { organizationId: orgId },
      include: {
        user: { select: { name: true } },
        attendances: {
          where: { date: { gte: start, lte: end } },
          orderBy: { date: 'asc' }
        }
      },
      orderBy: { user: { name: 'asc' } }
    });
  } else {
    const employee = await prisma.employee.findFirst({
      where: { userId, organizationId: orgId },
      include: {
        user: { select: { name: true } },
        attendances: {
          where: { date: { gte: start, lte: end } },
          orderBy: { date: 'asc' }
        }
      }
    });
    if (employee) employees = [employee];
  }

  const daysInMonth = new Date(year, mon, 0).getDate();
  const daysArr = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="page-container">
      <div className="dashboard-header mb-4">
        <div>
          <h1 className="page-title">Attendance Register</h1>
          <p className="page-subtitle">Monthly attendance overview for all employees.</p>
        </div>
        <MonthPicker defaultValue={month} />
      </div>

      {employees.map(emp => (
        <AttendanceCard
          key={emp.id}
          emp={emp}
          isAdmin={isAdmin}
          year={year}
          mon={mon}
          daysArr={daysArr}
          today={today}
        />
      ))}

      {employees.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          No employee records found.
        </div>
      )}
    </div>
  );
}
