import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function FollowUpsDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as any).role || 'SALES';
  const userId = (session.user as any).id;

  let whereClause: any = {};

  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    const employee = await prisma.employee.findUnique({
      where: { userId: userId }
    });

    if (employee) {
      whereClause = { employeeId: employee.id };
    } else {
      whereClause = { id: '00000000-0000-0000-0000-000000000000' };
    }
  }

  const followUps = await prisma.followUp.findMany({
    where: whereClause,
    orderBy: { date: 'asc' },
    include: {
      customer: true,
      employee: { include: { user: true } }
    }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const overdue = followUps.filter(f => new Date(f.date) < today && f.status === 'Pending');
  const dueToday = followUps.filter(f => new Date(f.date) >= today && new Date(f.date) < tomorrow && f.status === 'Pending');
  const upcoming = followUps.filter(f => new Date(f.date) >= tomorrow && f.status === 'Pending');

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <div className="dashboard-header mb-6">
        <div>
          <h1 className="page-title">Follow-up Dashboard</h1>
          <p className="page-subtitle">Centralized view of all sales follow-ups.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overdue */}
        <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
          <div className="bg-red-50 px-4 py-3 border-b border-red-200 flex justify-between items-center">
            <h3 className="font-bold text-red-800">Overdue</h3>
            <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded-full">{overdue.length}</span>
          </div>
          <div className="p-4 space-y-4">
            {overdue.map(f => (
              <div key={f.id} className="border border-gray-100 p-3 rounded-lg hover:shadow-md transition">
                <div className="flex justify-between items-start mb-1">
                  <Link href={`/customers/${f.customerId}`} className="font-semibold text-gray-800 hover:text-blue-600">
                    {f.customer?.businessName}
                  </Link>
                  <span className="text-xs text-red-600 font-medium">
                    {new Date(f.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-2">{f.followUpType} - {f.notes}</div>
                <div className="text-xs text-gray-500">Rep: {f.employee?.user?.name}</div>
              </div>
            ))}
            {overdue.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No overdue follow-ups!</p>}
          </div>
        </div>

        {/* Due Today */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
          <div className="bg-orange-50 px-4 py-3 border-b border-orange-200 flex justify-between items-center">
            <h3 className="font-bold text-orange-800">Due Today</h3>
            <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-1 rounded-full">{dueToday.length}</span>
          </div>
          <div className="p-4 space-y-4">
            {dueToday.map(f => (
              <div key={f.id} className="border border-gray-100 p-3 rounded-lg hover:shadow-md transition">
                <div className="flex justify-between items-start mb-1">
                  <Link href={`/customers/${f.customerId}`} className="font-semibold text-gray-800 hover:text-blue-600">
                    {f.customer?.businessName}
                  </Link>
                  <span className="text-xs text-orange-600 font-medium">
                    Today
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-2">{f.followUpType} - {f.notes}</div>
                <div className="text-xs text-gray-500">Rep: {f.employee?.user?.name}</div>
              </div>
            ))}
            {dueToday.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No follow-ups due today.</p>}
          </div>
        </div>

        {/* Upcoming */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden">
          <div className="bg-blue-50 px-4 py-3 border-b border-blue-200 flex justify-between items-center">
            <h3 className="font-bold text-blue-800">Upcoming</h3>
            <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">{upcoming.length}</span>
          </div>
          <div className="p-4 space-y-4">
            {upcoming.map(f => (
              <div key={f.id} className="border border-gray-100 p-3 rounded-lg hover:shadow-md transition">
                <div className="flex justify-between items-start mb-1">
                  <Link href={`/customers/${f.customerId}`} className="font-semibold text-gray-800 hover:text-blue-600">
                    {f.customer?.businessName}
                  </Link>
                  <span className="text-xs text-blue-600 font-medium">
                    {new Date(f.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-2">{f.followUpType} - {f.notes}</div>
                <div className="text-xs text-gray-500">Rep: {f.employee?.user?.name}</div>
              </div>
            ))}
            {upcoming.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No upcoming follow-ups.</p>}
          </div>
        </div>

      </div>
    </div>
  );
}
