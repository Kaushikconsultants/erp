import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import InventoryScanner from '@/components/ui/InventoryScanner';
import InventoryReportsButton from '@/components/ui/InventoryReportsButton';
import ProductListClient from '@/components/products/ProductListClient';
import { getCategories } from '@/app/actions/categoryActions';

import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const session = await getServerSession(authOptions);
  const orgId = await getTenantOrgId();
  const roleName = (session?.user as any)?.role;
  let canManageInventory = roleName === 'ADMIN' || roleName === 'SUPER_ADMIN';

  if (!canManageInventory && roleName) {
    const roleDef = await prisma.role.findUnique({ where: { name: roleName } });
    if (roleDef) {
      try {
        const perms = JSON.parse(roleDef.permissions) as string[];
        if (perms.includes("Manage Inventory")) {
          canManageInventory = true;
        }
      } catch(e) {}
    }
  }

  const [products, categoriesData] = await Promise.all([
    prisma.product.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' }
    }),
    getCategories()
  ]);

  const uniqueCategories = categoriesData.map(c => c.name);

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Product Master</h1>
          <p className="page-subtitle">Manage inventory, product categories, and pricing.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {canManageInventory && (
            <>
              <InventoryReportsButton />
            </>
          )}
        </div>
      </div>

      {canManageInventory && <InventoryScanner />}

      <ProductListClient 
        products={products} 
        categories={uniqueCategories} 
        categoriesData={categoriesData}
        canManage={canManageInventory} 
      />
    </div>
  );
}
