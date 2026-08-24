import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { canUserAccessSection } from '@/lib/authPermissions';
import HiringClient from '@/components/hiring/HiringClient';

export const dynamic = 'force-dynamic';

export default async function HiringPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const hasAccess = await canUserAccessSection(session.user, 'hiring');
  if (!hasAccess) redirect('/');

  return <HiringClient />;
}
