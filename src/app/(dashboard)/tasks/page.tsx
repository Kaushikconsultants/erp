import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CreateTaskButton from '@/components/ui/CreateTaskButton';
import TaskListClient from '@/components/tasks/TaskListClient';
import { getOrCreateEmployee } from '@/lib/employeeHelper';
import { CheckSquare } from 'lucide-react';
import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const orgId = await getTenantOrgId();
  const userRole = (session.user as any).role || 'SALES';
  const userId = (session.user as any).id;
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  let taskWhereClause: any = {
    assignee: { organizationId: orgId }
  };
  let customerWhereClause: any = {
    organizationId: orgId
  };

  if (userRole === 'SALES') {
    const employee = await getOrCreateEmployee(userId, session.user);
    if (employee) {
      taskWhereClause = {
        assignee: { organizationId: orgId },
        OR: [
          { assigneeId: employee.id },
          { creatorId: employee.id }
        ]
      };
      customerWhereClause = { assignedSalespersonId: employee.id, organizationId: orgId };
    }
  }

  const tasks = await prisma.task.findMany({
    where: taskWhereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      assignee: { include: { user: true } },
      customer: true
    }
  });

  const employees = await prisma.employee.findMany({
    where: { organizationId: orgId },
    include: { user: true },
    orderBy: { user: { name: 'asc' } }
  });

  const customers = await prisma.customer.findMany({
    where: customerWhereClause,
    orderBy: { businessName: 'asc' }
  });

  const mappedEmployees = employees.map(e => ({ id: e.id, name: e.user.name }));
  const mappedCustomers = customers.map(c => ({ id: c.id, name: c.businessName }));

  return (
    <div className="page-container" style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '1.5rem', fontWeight: 600, color: '#0f172a' }}>
            <CheckSquare style={{ color: "var(--accent-primary, #4f46e5)" }} size={26} />
            Tasks & Action Assignments
          </h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem', fontWeight: 400 }}>
            Assign, track, and manage salesperson sales tasks and closing to-dos.
          </p>
        </div>
        <CreateTaskButton employees={mappedEmployees} customers={mappedCustomers} />
      </div>

      <TaskListClient 
        initialTasks={tasks} 
        employees={mappedEmployees} 
        customers={mappedCustomers} 
        isAdmin={isAdmin} 
      />
    </div>
  );
}

