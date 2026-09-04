import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getStockTransfers } from '@/app/actions/stockTransferActions';
import StockTransferClient from '@/components/warehouses/StockTransferClient';

export const dynamic = 'force-dynamic';

export default async function StockTransfersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const res = await getStockTransfers();

  if (!res.success) {
    return (
      <div style={{ padding: '24px' }}>
        <h2>Stock Transfers</h2>
        <p style={{ color: '#ef4444' }}>{res.error || "Failed to load stock transfers"}</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <StockTransferClient
        initialTransfers={res.transfers || []}
        warehouses={res.warehouses || []}
        products={res.products || []}
      />
    </div>
  );
}
