import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import CreateQuotationForm from '@/components/quotations/CreateQuotationForm';
import { getCategories } from '@/app/actions/categoryActions';
import { getCompanySettings } from '@/app/actions/companyActions';

import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const orgId = await getTenantOrgId();
  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  let customerWhere: any = { organizationId: orgId };
  if (!isAdmin) {
    try {
      const employee = await prisma.employee.findUnique({ where: { userId } });
      if (employee) {
        customerWhere = { assignedSalespersonId: employee.id, organizationId: orgId };
      } else {
        customerWhere = { id: '00000000-0000-0000-0000-000000000000' };
      }
    } catch (e) {
      console.error("Employee lookup error:", e);
    }
  }

  const [quotation, customers, products, employeesRaw, categoriesData, companyRes] = await Promise.all([
    prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: true } }
      }
    }),
    prisma.customer.findMany({
      where: customerWhere,
      select: { id: true, businessName: true, state: true, pincode: true, billingAddress: true, shippingAddress: true, email: true, mobile: true, gstNumber: true, assignedSalespersonId: true },
      orderBy: { businessName: 'asc' }
    }),
    prisma.product.findMany({
      where: { organizationId: orgId },
      select: { 
        id: true, 
        name: true, 
        sellingPrice: true, 
        articleNumber: true, 
        sku: true,
        weight: true,
        category: true,
        description: true, 
        stockQuantity: true, 
        size: true, 
        color: true, 
        fabric: true 
      },
      orderBy: { name: 'asc' }
    }),
    prisma.employee.findMany({
      where: { organizationId: orgId },
      include: { user: true }
    }),
    getCategories(),
    getCompanySettings()
  ]);

  if (!quotation || quotation.organizationId !== orgId) {
    notFound();
  }

  const employees = employeesRaw.map(e => ({ id: e.id, name: e.user?.name || 'Unknown' }));

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <CreateQuotationForm 
        customers={customers} 
        products={products} 
        employees={employees} 
        categoriesData={categoriesData} 
        defaultQuotationNumber={quotation.quotationNumber}
        initialQuotation={quotation}
      />
    </div>
  );
}
