import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CreateQuotationForm from '@/components/quotations/CreateQuotationForm';
import { getCategories } from '@/app/actions/categoryActions';
import { getCompanySettings } from '@/app/actions/companyActions';
import { getOrCreateEmployee } from '@/lib/employeeHelper';

export const dynamic = 'force-dynamic';

export default async function NewQuotationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  let customerWhere: any = {};
  if (!isAdmin) {
    const employee = await getOrCreateEmployee(userId, session.user);
    if (employee) {
      customerWhere = { assignedSalespersonId: employee.id };
    }
  }

  let customers: any[] = [];
  let products: any[] = [];
  let employeesRaw: any[] = [];
  let categoriesData: any[] = [];
  let companyRes: any = { settings: null };

  try {
    const results = await Promise.allSettled([
      prisma.customer.findMany({
        where: customerWhere,
        select: { id: true, businessName: true, state: true, pincode: true, billingAddress: true, shippingAddress: true, email: true, mobile: true, gstNumber: true, assignedSalespersonId: true },
        orderBy: { businessName: 'asc' }
      }),
      prisma.product.findMany({
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
        include: { user: true }
      }),
      getCategories(),
      getCompanySettings()
    ]);

    if (results[0].status === 'fulfilled') customers = results[0].value;
    if (results[1].status === 'fulfilled') products = results[1].value;
    if (results[2].status === 'fulfilled') employeesRaw = results[2].value;
    if (results[3].status === 'fulfilled') categoriesData = results[3].value;
    if (results[4].status === 'fulfilled') companyRes = results[4].value;
  } catch (err) {
    console.error("Failed to load page data:", err);
  }

  const employees = employeesRaw.map(e => ({ id: e.id, name: e.user?.name || 'Unknown' }));
  const defaultQuotationNumber = companyRes.settings?.nextQuotationNumber || 'QT-1001';

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <CreateQuotationForm 
        customers={customers} 
        products={products} 
        employees={employees} 
        categoriesData={categoriesData} 
        defaultQuotationNumber={defaultQuotationNumber}
      />
    </div>
  );
}
