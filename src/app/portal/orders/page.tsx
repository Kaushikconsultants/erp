"use client";

import React, { useEffect, useState, Suspense } from "react";
import { getCustomerPortalData } from "@/app/actions/portalActions";
import { ShoppingBag, Package, Truck } from "lucide-react";
import { useSearchParams } from "next/navigation";

export const dynamic = 'force-dynamic';


function PortalOrdersContent() {
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get("customerId") || undefined;

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getCustomerPortalData(customerIdParam);
      if (res.success && res.orders) {
        setOrders(res.orders);
      }
      setLoading(false);
    }
    load();
  }, [customerIdParam]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading your orders...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShoppingBag style={{ color: '#4f46e5' }} />
          My Orders & Deliveries
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>
          Track all your sales orders and shipments in real-time.
        </p>
      </div>

      <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {orders.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            <Package size={48} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
            No orders found for your account yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 20px' }}>Order #</th>
                  <th style={{ padding: '14px 20px' }}>Order Date</th>
                  <th style={{ padding: '14px 20px' }}>Total Amount</th>
                  <th style={{ padding: '14px 20px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, idx) => (
                  <tr key={o.id} style={{ borderBottom: idx === orders.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 20px', fontWeight: '700', color: '#4f46e5' }}>{o.orderNumber}</td>
                    <td style={{ padding: '16px 20px', color: '#64748b' }}>{new Date(o.orderDate).toLocaleDateString()}</td>
                    <td style={{ padding: '16px 20px', fontWeight: '700', color: '#0f172a' }}>₹{(o.totalValue || o.grandTotal)?.toLocaleString()}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', backgroundColor: '#e0e7ff', color: '#3730a3', fontWeight: '700', borderRadius: '20px', fontSize: '0.75rem' }}>
                        <Truck size={14} /> {o.orderStatus || o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PortalOrdersPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading orders...</div>}>
      <PortalOrdersContent />
    </Suspense>
  );
}
