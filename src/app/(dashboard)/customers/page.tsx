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
  let allEmployees: { id: string; name: string }[] = [];

  try {
    const [custRes, empRes] = await Promise.allSettled([
      prisma.customer.findMany({
        where: whereClause,
        take: 100,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          businessName: true,
          contactPerson: true,
          email: true,
          mobile: true,
          whatsappNumber: true,
          alternatePhone: true,
          billingAddress: true,
          city: true,
          state: true,
          pincode: true,
          landmark: true,
          gstNumber: true,
          regularDiscount: true,
          preferredPaymentMethod: true,
          status: true,
          createdAt: true,
          assignedSalespersonId: true,
          assignedSalesperson: {
            select: {
              id: true,
              user: {
                select: { name: true }
              }
            }
          }
        }
      }),
      isAdmin ? prisma.employee.findMany({
        where: { organizationId },
        select: {
          id: true,
          user: { select: { name: true } }
        },
        orderBy: { user: { name: 'asc' } }
      }) : Promise.resolve([])
    ]);

    if (custRes.status === 'fulfilled') {
      customers = (custRes.value as any[]) || [];
    }
    if (empRes.status === 'fulfilled' && empRes.value) {
      allEmployees = (empRes.value as any[]).map((e: any) => ({
        id: e.id,
        name: e.user?.name || 'Unknown'
      }));
    }
  } catch (err) {
    console.error("Error fetching customers/employees:", err);
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

      <div className="customer-page-panel">
        <CustomerTable initialCustomers={customers} allEmployees={allEmployees} />
      </div>
    </div>
  );
}
