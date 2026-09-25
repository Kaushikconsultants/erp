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

  const [tasks, employees, customers] = await Promise.all([
    prisma.task.findMany({
      where: taskWhereClause,
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: {
          select: {
            id: true,
            user: { select: { id: true, name: true } }
          }
        },
        customer: {
          select: {
            id: true,
            businessName: true
          }
        }
      }
    }),
    prisma.employee.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        user: { select: { name: true } }
      },
      orderBy: { user: { name: 'asc' } }
    }),
    prisma.customer.findMany({
      where: customerWhereClause,
      select: { id: true, businessName: true },
      take: 200,
      orderBy: { businessName: 'asc' }
    })
  ]);

  const mappedEmployees = employees.map(e => ({ id: e.id, name: e.user?.name || 'Unknown' }));
  const mappedCustomers = customers.map(c => ({ id: c.id, name: c.businessName }));

  return (
    <div className="task-page-wrapper">
      {/* Header Banner */}
      <div className="task-header-card">
        <div className="task-header-left">
          <div className="task-header-icon-box">
            <CheckSquare size={22} />
          </div>
          <div className="task-header-titles">
            <h1 className="task-main-title">
              Tasks & Action Assignments
            </h1>
            <p className="task-main-subtitle">
              Assign, track, and manage salesperson sales tasks and closing to-dos.
            </p>
          </div>
        </div>
        
        <CreateTaskButton 
          employees={mappedEmployees} 
          customers={mappedCustomers}
          className="btn-create-task-main"
          buttonText="+ Create Task"
        />
      </div>

      {/* Interactive Task Client (Filters + Mobile Card Feed + Desktop Table) */}
      <TaskListClient 
        initialTasks={tasks} 
        employees={mappedEmployees} 
        customers={mappedCustomers} 
        isAdmin={isAdmin} 
      />
    </div>
  );
}

