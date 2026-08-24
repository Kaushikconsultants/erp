import React from 'react';
import { getAllCategoryTemplates } from '@/app/actions/templateActions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TemplatesClient from '@/components/templates/TemplatesClient';

export const dynamic = 'force-dynamic';

export default async function DocumentTemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const res = await getAllCategoryTemplates();
  const initialTemplates = res.success ? (res.templates as any) : {};

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <TemplatesClient initialTemplates={initialTemplates} />
    </div>
  );
}
