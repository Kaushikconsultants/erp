"use client";

import React, { useEffect, useState } from "react";
import { getCustomerPortalData, acceptQuotationFromPortal } from "@/app/actions/portalActions";
import { ShoppingBag, FileText, FileCheck, ArrowUpRight, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function PortalDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getCustomerPortalData();
      if (res.success) {
        setData(res);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleAcceptQuote = async (id: string) => {
    const res = await acceptQuotationFromPortal(id);
    if (res.success) {
      alert("Quotation approved successfully!");
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-200 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="h-32 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!data || !data.customer) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-8 rounded-xl text-center">
        <h3 className="text-lg font-bold text-amber-900 mb-2">No Customer Profile Linked</h3>
        <p className="text-sm text-amber-700">
          Your account is not linked to any customer business profile yet. Please contact support or your account manager.
        </p>
      </div>
    );
  }

  const { customer, orders, invoices, quotations } = data;
  const pendingInvoices = invoices?.filter((i: any) => i.status !== "Paid") || [];
  const activeQuotes = quotations?.filter((q: any) => q.status === "Draft" || q.status === "Sent") || [];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-indigo-300 font-semibold">Welcome to your Portal</span>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">{customer.businessName}</h1>
          <p className="text-sm text-indigo-200 mt-1">Contact: {customer.contactPerson} ({customer.mobile})</p>
        </div>
        <div className="flex gap-3">
          <Link href="/portal/invoices" className="px-4 py-2 bg-white text-indigo-900 font-semibold text-sm rounded-lg hover:bg-indigo-50 transition shadow-sm">
            View Dues & Invoices
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ShoppingBag size={24} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Orders</div>
            <div className="text-2xl font-bold text-slate-900">{orders?.length || 0}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <FileText size={24} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pending Invoices</div>
            <div className="text-2xl font-bold text-amber-600">{pendingInvoices.length}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <FileCheck size={24} />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Active Quotations</div>
            <div className="text-2xl font-bold text-slate-900">{activeQuotes.length}</div>
          </div>
        </div>
      </div>

      {/* Active Quotations Pending Approval */}
      {activeQuotes.length > 0 && (
        <div className="bg-white border border-indigo-100 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="text-indigo-600" size={20} />
            Quotations Awaiting Your Approval
          </h2>
          <div className="divide-y divide-slate-100">
            {activeQuotes.map((q: any) => (
              <div key={q.id} className="py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-slate-900">Quotation #{q.quotationNumber}</div>
                  <div className="text-xs text-slate-500">Issued: {new Date(q.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-lg font-bold text-slate-900">₹{q.grandTotal?.toLocaleString()}</div>
                  <button
                    onClick={() => handleAcceptQuote(q.id)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1"
                  >
                    <CheckCircle size={14} /> Accept Quote
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders & Invoices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Recent Orders</h3>
            <Link href="/portal/orders" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold">
              View All <ArrowUpRight size={14} />
            </Link>
          </div>
          {orders?.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">No recent orders placed.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {orders?.slice(0, 5).map((o: any) => (
                <div key={o.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Order #{o.orderNumber}</div>
                    <div className="text-xs text-slate-500">{new Date(o.orderDate).toLocaleDateString()}</div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Invoices</h3>
            <Link href="/portal/invoices" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold">
              View All <ArrowUpRight size={14} />
            </Link>
          </div>
          {invoices?.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">No invoices generated yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {invoices?.slice(0, 5).map((inv: any) => (
                <div key={inv.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Invoice #{inv.invoiceNumber}</div>
                    <div className="text-xs text-slate-500">₹{inv.grandTotal?.toLocaleString()}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    inv.status === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {inv.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
