import React from 'react';
import { getWarehouses } from '@/app/actions/warehouseActions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Warehouse, ArrowDown, ArrowUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function WarehousesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const res = await getWarehouses();
  const warehouses = res.success ? res.warehouses : [];

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <div className="dashboard-header mb-6">
        <div>
          <h1 className="page-title">Warehouse Management</h1>
          <p className="page-subtitle">Track stock locations and inventory movements.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {warehouses.map((wh: any) => {
          const totalIn = wh.inventoryTransactions.filter((t: any) => t.type === 'IN').reduce((s: number, t: any) => s + t.quantity, 0);
          const totalOut = wh.inventoryTransactions.filter((t: any) => t.type === 'OUT').reduce((s: number, t: any) => s + t.quantity, 0);
          return (
            <div key={wh.id} className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Warehouse size={20} style={{ color: '#fff' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{wh.name}</div>
                  {wh.code && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Code: {wh.code}</div>}
                </div>
              </div>

              {wh.branch && (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Branch: {wh.branch.name}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--success)', marginBottom: '4px' }}>
                    <ArrowDown size={16} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total IN</div>
                  <div style={{ fontWeight: 700 }}>{totalIn}</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--danger)', marginBottom: '4px' }}>
                    <ArrowUp size={16} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total OUT</div>
                  <div style={{ fontWeight: 700 }}>{totalOut}</div>
                </div>
              </div>

              {wh.address && (
                <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{wh.address}</div>
              )}
              <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {wh.inventoryTransactions.length} total transactions
              </div>
            </div>
          );
        })}

        {warehouses.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            No warehouses configured. Warehouses are created by Admins from Settings.
          </div>
        )}
      </div>
    </div>
  );
}
