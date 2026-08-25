import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AddCustomerButton from '@/components/ui/AddCustomerButton';
import CustomerTable from '@/components/ui/CustomerTable';
import { getOrCreateEmployee } from '@/lib/employeeHelper';

import { getTenantScope } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const { organizationId, isAdmin, employeeId } = await getTenantScope();

  let whereClause: any = { organizationId };

  if (!isAdmin) {
    whereClause.assignedSalespersonId = employeeId || 'unassigned';
  }

  let customers: any[] = [];
  try {
    customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        assignedSalesperson: {
          include: {
            user: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (err) {
    console.error("Error fetching customers:", err);
  }

  let allEmployees: { id: string; name: string }[] = [];
  if (isAdmin) {
    try {
      const employeesData = await prisma.employee.findMany({
        where: { organizationId },
        include: { user: true },
        orderBy: { user: { name: 'asc' } }
      });
      allEmployees = employeesData.map(e => ({
        id: e.id,
        name: e.user?.name || 'Unknown'
      }));
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  }

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage your B2B customers, view profiles, and track retention.</p>
        </div>
        <AddCustomerButton employees={allEmployees} />
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <CustomerTable initialCustomers={customers} allEmployees={allEmployees} />
      </div>
    </div>
  );
}
