import React from 'react';
import { getExpenses } from '@/app/actions/expenseActions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ExpensesClient from '@/components/expenses/ExpensesClient';

export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const res = await getExpenses();
  if (res.error) redirect('/');

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <ExpensesClient
        initialExpenses={JSON.parse(JSON.stringify(res.expenses || []))}
        isAdmin={res.isAdmin || false}
        currentUserId={(session.user as any)?.id}
      />
    </div>
  );
}
