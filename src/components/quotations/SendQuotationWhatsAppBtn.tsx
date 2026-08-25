"use client";

import React, { useState } from 'react';
import { MessageSquare, Check, AlertCircle } from 'lucide-react';
import { sendQuotationViaWhatsApp } from '@/app/actions/documentShareActions';

interface SendQuotationWhatsAppBtnProps {
  quotationId: string;
  customerPhone?: string;
  quotationNumber: string;
}

export default function SendQuotationWhatsAppBtn({ 
  quotationId, 
  customerPhone, 
  quotationNumber 
}: SendQuotationWhatsAppBtnProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    const res = await sendQuotationViaWhatsApp(quotationId);
    setLoading(false);

    if (res.success) {
      setSent(true);
      alert(`Quotation #${quotationNumber} dispatched to WhatsApp (+${res.phone}) successfully!`);
      setTimeout(() => setSent(false), 5000);
    } else {
      // Fallback: Open WhatsApp Web directly if API send encountered an issue
      const cleanPhone = (customerPhone || '').replace(/\D/g, '');
      const waUrl = cleanPhone ? `https://wa.me/91${cleanPhone}` : `https://wa.me/`;
      window.open(waUrl, '_blank');
    }
  };

  return (
    <button
      type="button"
      onClick={handleSend}
      disabled={loading}
      className="no-print"
      style={{
        padding: '7px 14px',
        borderRadius: '8px',
        backgroundColor: sent ? '#059669' : '#25D366',
        color: '#ffffff',
        border: 'none',
        fontSize: '0.82rem',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)',
        transition: 'all 0.15s ease'
      }}
    >
      {loading ? (
        "Sending..."
      ) : sent ? (
        <>
          <Check size={15} /> Sent on WhatsApp
        </>
      ) : (
        <>
          <MessageSquare size={15} /> Send via WhatsApp
        </>
      )}
    </button>
  );
}
