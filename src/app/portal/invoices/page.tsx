"use client";

import React, { useEffect, useState } from "react";
import { getCustomerPortalData } from "@/app/actions/portalActions";
import { FileText, CreditCard, CheckCircle2 } from "lucide-react";

export default function PortalInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getCustomerPortalData();
      if (res.success && res.invoices) {
        setInvoices(res.invoices);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading your invoices...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="text-indigo-600" />
          Invoices & Payments
        </h1>
        <p className="text-sm text-slate-500">View statement of account, download PDFs, and clear dues.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText size={48} className="mx-auto mb-3 text-slate-300" />
            No invoices generated yet.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Invoice #</th>
                <th className="p-4">Date</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 font-bold text-indigo-900">{inv.invoiceNumber}</td>
                  <td className="p-4 text-slate-600">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                  <td className="p-4 font-semibold text-slate-900">₹{inv.grandTotal?.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 font-semibold rounded-full text-xs ${
                      inv.status === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {inv.status === "Paid" ? <CheckCircle2 size={14} /> : <CreditCard size={14} />}
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {inv.status !== "Paid" && (
                      <button 
                        onClick={() => alert("Redirecting to payment gateway...")}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition"
                      >
                        Pay Now
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
