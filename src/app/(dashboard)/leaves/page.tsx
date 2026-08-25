import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import EmployeeLeavePanel from '@/components/leaves/EmployeeLeavePanel';
import AdminLeavePanel from '@/components/leaves/AdminLeavePanel';
import { getOrCreateEmployee } from '@/lib/employeeHelper';

import { getTenantOrgId } from '@/lib/tenant';

export default async function LeavesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const orgId = await getTenantOrgId();
  const userRole = (session.user as any).role || 'SALES';
  const userId = (session.user as any).id;

  const employee = await getOrCreateEmployee(userId, session.user);

  if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
    // Admin View: Fetch all leave requests for this organization
    const allLeaves = await prisma.leave.findMany({
      where: {
        employee: { organizationId: orgId }
      },
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
    const myLeaves = employee ? await prisma.leave.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' }
    }) : [];

    return <EmployeeLeavePanel employeeId={employee?.id || "default"} leaves={myLeaves} />;
  }
}
