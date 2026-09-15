"use client";

import React, { useEffect, useState, Suspense } from "react";
import { getCustomerPortalData } from "@/app/actions/portalActions";
import { FileText, CreditCard, CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

export const dynamic = 'force-dynamic';


function PortalInvoicesContent() {
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get("customerId") || undefined;

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getCustomerPortalData(customerIdParam);
      if (res.success && res.invoices) {
        setInvoices(res.invoices);
      }
      setLoading(false);
    }
    load();
  }, [customerIdParam]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading your invoices...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText style={{ color: '#d97706' }} />
          Invoices & Payments
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>
          View statement of account, download invoices, and clear pending dues.
        </p>
      </div>

      <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {invoices.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            <FileText size={48} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
            No invoices generated for your account yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 20px' }}>Invoice #</th>
                  <th style={{ padding: '14px 20px' }}>Invoice Date</th>
                  <th style={{ padding: '14px 20px' }}>Amount</th>
                  <th style={{ padding: '14px 20px' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, idx) => (
                  <tr key={inv.id} style={{ borderBottom: idx === invoices.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 20px', fontWeight: '700', color: '#4f46e5' }}>{inv.invoiceNumber}</td>
                    <td style={{ padding: '16px 20px', color: '#64748b' }}>{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                    <td style={{ padding: '16px 20px', fontWeight: '700', color: '#0f172a' }}>₹{(inv.totalAmount || inv.grandTotal)?.toLocaleString()}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        fontWeight: '700',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        backgroundColor: inv.status === 'Paid' ? '#dcfce7' : '#fef3c7',
                        color: inv.status === 'Paid' ? '#15803d' : '#b45309'
                      }}>
                        {inv.status === "Paid" ? <CheckCircle2 size={14} /> : <CreditCard size={14} />}
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      {inv.status !== "Paid" && (
                        <button 
                          onClick={() => alert("Redirecting to Razorpay / UPI payment gateway...")}
                          style={{
                            padding: '6px 14px',
                            backgroundColor: '#4f46e5',
                            color: '#ffffff',
                            fontWeight: '700',
                            fontSize: '0.75rem',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Pay Now
                        </button>
                      )}
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

export default function PortalInvoicesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading invoices...</div>}>
      <PortalInvoicesContent />
    </Suspense>
  );
}
