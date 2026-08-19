"use client";

import React, { useEffect, useState } from "react";
import { getCustomerPortalData, acceptQuotationFromPortal } from "@/app/actions/portalActions";
import { FileCheck, CheckCircle } from "lucide-react";

export default function PortalQuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getCustomerPortalData();
      if (res.success && res.quotations) {
        setQuotations(res.quotations);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleAccept = async (id: string) => {
    const res = await acceptQuotationFromPortal(id);
    if (res.success) {
      alert("Quotation approved!");
      window.location.reload();
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading your quotations...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileCheck className="text-indigo-600" />
          Quotations & Proposals
        </h1>
        <p className="text-sm text-slate-500">Review formal quotes issued by your sales representative and approve them online.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {quotations.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileCheck size={48} className="mx-auto mb-3 text-slate-300" />
            No active quotations.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Quotation #</th>
                <th className="p-4">Date</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {quotations.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 font-bold text-indigo-900">{q.quotationNumber}</td>
                  <td className="p-4 text-slate-600">{new Date(q.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 font-semibold text-slate-900">₹{q.grandTotal?.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 font-semibold rounded-full text-xs ${
                      q.status === "Approved" ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"
                    }`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {q.status !== "Approved" && (
                      <button
                        onClick={() => handleAccept(q.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1 ml-auto"
                      >
                        <CheckCircle size={14} /> Accept Quote
                      </button>
                    )}
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
