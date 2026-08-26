"use client";

import React, { useState } from 'react';
import { convertQuotationToOrder } from '@/app/actions/quotationActions';
import { useRouter } from 'next/navigation';
import { FileText, Loader2 } from 'lucide-react';

export default function ConvertToInvoiceBtn({ quotationId }: { quotationId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleConvert = async () => {
    if (!confirm('Convert this confirmed quotation to a Sales Order & Tax Invoice?')) return;
    setLoading(true);
    const res = await convertQuotationToOrder(quotationId, '1-15', { paymentOption: 'FULL' });
    setLoading(false);
    if (res.success && res.orderId) {
      alert(`Tax Invoice & Sales Order #${res.orderNumber} created successfully!`);
      router.push(`/orders/${res.orderId}/invoice`);
      router.refresh();
    } else {
      alert(res.error || 'Failed to convert to invoice');
    }
  };

  return (
    <button
      type="button"
      onClick={handleConvert}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '5px 11px',
        borderRadius: '6px',
        fontSize: '0.78rem',
        fontWeight: 700,
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        color: '#ffffff',
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s ease',
        opacity: loading ? 0.7 : 1
      }}
      title="Convert confirmed quotation to Sales Order & Invoice"
    >
      {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={13} />}
      {loading ? 'Converting...' : 'Convert to Invoice'}
    </button>
  );
}
