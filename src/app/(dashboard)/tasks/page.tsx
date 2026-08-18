import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CreateTaskButton from '@/components/ui/CreateTaskButton';

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as any).role || 'SALES';
  const userId = (session.user as any).id;

  let taskWhereClause = {};
  let customerWhereClause = {};

  if (userRole === 'SALES') {
    const employee = await prisma.employee.findUnique({
      where: { userId: userId }
    });

    if (employee) {
      taskWhereClause = {
        OR: [
          { assigneeId: employee.id },
          { creatorId: employee.id }
        ]
      };
      customerWhereClause = { assignedSalespersonId: employee.id };
    } else {
      taskWhereClause = { id: '00000000-0000-0000-0000-000000000000' };
      customerWhereClause = { id: '00000000-0000-0000-0000-000000000000' };
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
    <div className="page-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Tasks & Assignments</h1>
          <p className="page-subtitle">Track employee to-dos and follow-ups.</p>
        </div>
        <CreateTaskButton employees={mappedEmployees} customers={mappedCustomers} />
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Assignee</th>
                <th>Customer</th>
                <th>Due Date</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task.id}>
                  <td>
                    <strong>{task.title}</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{task.description || 'No description'}</div>
                  </td>
                  <td>{task.assignee?.user?.name || 'Unassigned'}</td>
                  <td>{task.customer?.businessName || '-'}</td>
                  <td>
                    {task.dueDate ? (
                      <span style={{ color: new Date(task.dueDate) < new Date() && task.status !== 'Completed' ? 'var(--danger)' : 'inherit' }}>
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    <span style={{ color: task.priority === 'High' ? 'var(--danger)' : task.priority === 'Medium' ? 'var(--warning)' : 'var(--text-muted)' }}>
                      {task.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${task.status === 'Completed' ? 'active' : task.status === 'In Progress' ? 'warning' : 'inactive'}`}>
                      {task.status}
                    </span>
                  </td>
                  <td>
                    <button className="action-btn text-blue">Update Status</button>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No tasks found. Click "+ Create Task" to assign one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
