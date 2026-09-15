"use client";

import React, { useEffect, useState, Suspense } from "react";
import { getCustomerPortalData, acceptQuotationFromPortal } from "@/app/actions/portalActions";
import { FileCheck, CheckCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";

export const dynamic = 'force-dynamic';


function PortalQuotationsContent() {
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get("customerId") || undefined;

  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getCustomerPortalData(customerIdParam);
      if (res.success && res.quotations) {
        setQuotations(res.quotations);
      }
      setLoading(false);
    }
    load();
  }, [customerIdParam]);

  const handleAccept = async (id: string) => {
    const res = await acceptQuotationFromPortal(id);
    if (res.success) {
      alert("Quotation approved successfully!");
      window.location.reload();
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading your quotations...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileCheck style={{ color: '#059669' }} />
          Quotations & Proposals
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>
          Review formal quotes issued by your sales representative and approve them online.
        </p>
      </div>

      <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {quotations.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            <FileCheck size={48} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
            No active quotations for your account.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 20px' }}>Quotation #</th>
                  <th style={{ padding: '14px 20px' }}>Date</th>
                  <th style={{ padding: '14px 20px' }}>Total Amount</th>
                  <th style={{ padding: '14px 20px' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q, idx) => (
                  <tr key={q.id} style={{ borderBottom: idx === quotations.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 20px', fontWeight: '700', color: '#4f46e5' }}>{q.quotationNumber}</td>
                    <td style={{ padding: '16px 20px', color: '#64748b' }}>{new Date(q.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '16px 20px', fontWeight: '700', color: '#0f172a' }}>₹{q.grandTotal?.toLocaleString()}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        fontWeight: '700',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        backgroundColor: q.status === 'Approved' ? '#dcfce7' : '#e0e7ff',
                        color: q.status === 'Approved' ? '#15803d' : '#3730a3'
                      }}>
                        {q.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      {q.status !== "Approved" && (
                        <button
                          onClick={() => handleAccept(q.id)}
                          style={{
                            padding: '6px 14px',
                            backgroundColor: '#059669',
                            color: '#ffffff',
                            fontWeight: '700',
                            fontSize: '0.75rem',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <CheckCircle size={14} /> Accept Quote
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

export default function PortalQuotationsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading quotations...</div>}>
      <PortalQuotationsContent />
    </Suspense>
  );
}
