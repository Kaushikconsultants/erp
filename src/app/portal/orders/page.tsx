"use client";

import React, { useEffect, useState } from "react";
import { getCustomerPortalData } from "@/app/actions/portalActions";
import { ShoppingBag, Package, Truck } from "lucide-react";

export default function PortalOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getCustomerPortalData();
      if (res.success && res.orders) {
        setOrders(res.orders);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading your orders...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShoppingBag className="text-indigo-600" />
          My Orders & Deliveries
        </h1>
        <p className="text-sm text-slate-500">Track all your sales orders and shipments in real-time.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package size={48} className="mx-auto mb-3 text-slate-300" />
            No orders found for your account yet.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Order #</th>
                <th className="p-4">Date</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 font-bold text-indigo-900">{o.orderNumber}</td>
                  <td className="p-4 text-slate-600">{new Date(o.orderDate).toLocaleDateString()}</td>
                  <td className="p-4 font-semibold text-slate-900">₹{o.grandTotal?.toLocaleString()}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 font-semibold rounded-full text-xs">
                      <Truck size={14} /> {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
