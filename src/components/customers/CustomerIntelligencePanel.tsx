"use client";

import React, { useEffect, useState } from "react";
import { getCustomerIntelligence } from "@/app/actions/customerActions";
import { BrainCircuit, TrendingUp, AlertTriangle } from "lucide-react";

export default function CustomerIntelligencePanel({ customerId }: { customerId: string }) {
  const [intel, setIntel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getCustomerIntelligence(customerId);
      if (res.success) {
        setIntel(res.intelligence);
      }
      setLoading(false);
    }
    load();
  }, [customerId]);

  if (loading) return <div className="p-4 border rounded-xl animate-pulse bg-gray-50 h-32"></div>;
  if (!intel) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
      <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-2 mb-4">
        <BrainCircuit size={18} />
        Business Memory / Intelligence
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-50">
          <div className="text-xs text-gray-500 mb-1">Health Score</div>
          <div className="text-2xl font-bold flex items-center gap-2">
            <span className={intel.healthScore >= 70 ? 'text-green-600' : intel.healthScore >= 40 ? 'text-orange-500' : 'text-red-500'}>
              {intel.healthScore}/100
            </span>
            {intel.healthScore < 50 && <AlertTriangle size={18} className="text-red-500" />}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-50">
          <div className="text-xs text-gray-500 mb-1">Lifetime Value</div>
          <div className="text-2xl font-bold text-gray-800">
            ₹{intel.totalSpent.toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-50">
          <div className="text-xs text-gray-500 mb-1">Total Orders</div>
          <div className="text-2xl font-bold text-gray-800">
            {intel.totalOrders}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-50">
          <div className="text-xs text-gray-500 mb-1">Avg Order Value</div>
          <div className="text-2xl font-bold text-gray-800">
            ₹{Math.round(intel.averageOrderValue).toLocaleString()}
          </div>
        </div>

        <div className="col-span-2 md:col-span-4 bg-white p-4 rounded-lg shadow-sm border border-indigo-50">
          <div className="text-xs text-gray-500 mb-2">Frequently Purchased</div>
          <div className="flex flex-wrap gap-2">
            {intel.topProducts?.length ? (
              intel.topProducts.map((p: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                  {p}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-400">No purchase history yet.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
