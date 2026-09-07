import React from 'react';
import { getVendors } from '@/app/actions/vendorActions';
import VendorManagementClient from '@/components/vendors/VendorManagementClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { canUserAccessSection } from '@/lib/authPermissions';

export const dynamic = 'force-dynamic';

export default async function VendorsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const hasAccess = await canUserAccessSection(session.user, 'purchases');
  if (!hasAccess) redirect('/');

  const res = await getVendors();
  const vendors = res.success && res.vendors ? (res.vendors as any[]) : [];

  return <VendorManagementClient initialVendors={vendors} />;
}
