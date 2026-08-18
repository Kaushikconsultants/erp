import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import EmployeeLeavePanel from '@/components/leaves/EmployeeLeavePanel';
import AdminLeavePanel from '@/components/leaves/AdminLeavePanel';

export default async function LeavesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as any).role || 'SALES';
  const userId = (session.user as any).id;

  const employee = await prisma.employee.findUnique({
    where: { userId: userId },
    include: { user: true }
  });

  if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
    // Admin View: Fetch all leave requests
    const allLeaves = await prisma.leave.findMany({
      include: {
        employee: {
          include: {
            user: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return <AdminLeavePanel leaves={allLeaves} />;
  } else {
    // Employee View: Fetch only their own leave requests
    if (!employee) {
      return <div>Employee record not found.</div>;
    }

    const myLeaves = await prisma.leave.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' }
    });

    return <EmployeeLeavePanel employeeId={employee.id} leaves={myLeaves} />;
  }
}
