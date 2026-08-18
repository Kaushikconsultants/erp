"use client";

import React, { useState } from 'react';
import { convertQuotationToOrder } from '@/app/actions/quotationActions';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, X, FileCheck, Percent, ShieldAlert, CreditCard } from 'lucide-react';

export default function ConvertQuotationBtn({ quotationId }: { quotationId: string }) {
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlab, setSelectedSlab] = useState('1-15');
  const router = useRouter();

  const handleConvert = async () => {
    setIsModalOpen(false);
    setLoading(true);
    const res = await convertQuotationToOrder(quotationId, selectedSlab);
    setLoading(false);

    if (res.success && res.orderId) {
      alert(`Quotation converted successfully to Order #${res.orderNumber}!`);
      router.push(`/orders/${res.orderId}`);
    } else {
      alert(res.error || "Failed to convert quotation");
    }
  };

  const SLAB_OPTIONS = [
    {
      id: '0',
      title: '0% Discount (Bonus)',
      subtitle: 'Issue invoice at full catalog list price with 0% discount',
      icon: <Percent size={18} className="text-emerald-600" />
    },
    {
      id: '1-15',
      title: '1 - 15% Discount (Standard)',
      subtitle: 'Standard tier customer pricing and discount structure',
      icon: <CheckCircle2 size={18} className="text-emerald-600" />
    },
    {
      id: '>15',
      title: 'Above 15% Discount',
      subtitle: 'High volume bulk order or VIP client custom discount',
      icon: <ShieldAlert size={18} className="text-amber-600" />
    },
    {
      id: 'credit',
      title: 'Credit Customer',
      subtitle: 'Deferred payment terms (Accounts Receivable credit invoice)',
      icon: <CreditCard size={18} className="text-indigo-600" />
    }
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        disabled={loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '0.8rem',
          fontWeight: 600,
          backgroundColor: '#ecfdf5',
          color: '#047857',
          border: '1px solid #a7f3d0',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        {loading ? (
          "Converting..."
        ) : (
          <>
            <CheckCircle2 size={14} /> Convert to Invoice <ArrowRight size={12} />
          </>
        )}
      </button>

      {isModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              width: '100%',
              maxWidth: '480px',
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ELEGANT MODAL HEADER */}
            <div 
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: '#ffffff',
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileCheck size={22} color="#ffffff" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                    Convert to Invoice
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.3 }}>
                    Select the applicable discount slab to generate a formal Sales Order invoice.
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', opacity: 0.8, cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div style={{ padding: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
                Select Discount & Billing Terms
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {SLAB_OPTIONS.map((option) => {
                  const isSelected = selectedSlab === option.id;
                  return (
                    <div
                      key={option.id}
                      onClick={() => setSelectedSlab(option.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input 
                        type="radio"
                        name="discountSlab"
                        value={option.id}
                        checked={isSelected}
                        onChange={() => setSelectedSlab(option.id)}
                        style={{ accentColor: '#059669', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#065f46' : '#1e293b' }}>
                          {option.title}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: isSelected ? '#047857' : '#64748b', marginTop: '1px' }}>
                          {option.subtitle}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div 
              style={{
                backgroundColor: '#f8fafc',
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px'
              }}
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConvert}
                disabled={loading}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle2 size={16} />
                {loading ? "Converting..." : "Confirm & Generate Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
