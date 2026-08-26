"use client";

import React, { useState } from 'react';
import { confirmQuotation } from '@/app/actions/quotationActions';
import { useRouter } from 'next/navigation';
import { CheckCircle2, X, FileCheck, Percent, ShieldAlert, CreditCard, ShieldCheck } from 'lucide-react';

export default function ConvertQuotationBtn({ quotationId }: { quotationId: string }) {
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlab, setSelectedSlab] = useState('1-15');
  const [paymentOption, setPaymentOption] = useState<'FULL' | 'TOKEN' | 'CREDIT'>('FULL');
  const [tokenAmount, setTokenAmount] = useState<string>('');
  const router = useRouter();

  const handleConvert = async () => {
    if (paymentOption === 'TOKEN' && (!tokenAmount || Number(tokenAmount) <= 0)) {
      alert("Please enter a valid Token / Advance Payment amount greater than ₹0.");
      return;
    }

    setIsModalOpen(false);
    setLoading(true);

    const res = await confirmQuotation(quotationId, selectedSlab, {
      paymentOption,
      tokenAmount: Number(tokenAmount || 0)
    });

    setLoading(false);

    if (res.success) {
      alert('Quotation confirmed successfully!');
      router.refresh();
    } else {
      alert(res.error || "Failed to confirm quotation");
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
          gap: '5px',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '0.8rem',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          color: '#ffffff',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease'
        }}
      >
        {loading ? (
          "Processing..."
        ) : (
          <>
            <CheckCircle2 size={14} /> Confirm Quotation
          </>
        )}
      </button>

      {isModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              width: '100%',
              maxWidth: '480px',
              maxHeight: 'min(90vh, 520px)',
              borderRadius: '14px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* COMPACT MODAL HEADER */}
            <div 
              style={{
                backgroundColor: '#059669',
                color: '#ffffff',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileCheck size={16} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>
                    Confirm Quotation
                  </h3>
                  <p style={{ margin: '1px 0 0 0', fontSize: '0.72rem', color: '#d1fae5' }}>
                    Select payment received & discount structure
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', opacity: 0.85, cursor: 'pointer', padding: '4px', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* SCROLLABLE COMPACT MODAL BODY */}
            <div style={{ padding: '14px 18px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* STEP 1: PAYMENT METHOD (3 COMPACT CARDS) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  1. Payment Requirement
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {/* Full Payment */}
                  <div
                    onClick={() => setPaymentOption('FULL')}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '10px',
                      border: paymentOption === 'FULL' ? '2px solid #059669' : '1px solid #e2e8f0',
                      backgroundColor: paymentOption === 'FULL' ? '#ecfdf5' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '1.15rem', marginBottom: '2px' }}>💳</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: paymentOption === 'FULL' ? '#065f46' : '#0f172a' }}>
                      Full Paid
                    </div>
                    <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '1px' }}>
                      100% Amount
                    </div>
                  </div>

                  {/* Token Advance */}
                  <div
                    onClick={() => setPaymentOption('TOKEN')}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '10px',
                      border: paymentOption === 'TOKEN' ? '2px solid #059669' : '1px solid #e2e8f0',
                      backgroundColor: paymentOption === 'TOKEN' ? '#ecfdf5' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '1.15rem', marginBottom: '2px' }}>🪙</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: paymentOption === 'TOKEN' ? '#065f46' : '#0f172a' }}>
                      Token Adv
                    </div>
                    <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '1px' }}>
                      Partial Advance
                    </div>
                  </div>

                  {/* Credit Customer */}
                  <div
                    onClick={() => setPaymentOption('CREDIT')}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '10px',
                      border: paymentOption === 'CREDIT' ? '2px solid #059669' : '1px solid #e2e8f0',
                      backgroundColor: paymentOption === 'CREDIT' ? '#ecfdf5' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '1.15rem', marginBottom: '2px' }}>🏢</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: paymentOption === 'CREDIT' ? '#065f46' : '#0f172a' }}>
                      Credit B2B
                    </div>
                    <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '1px' }}>
                      Deferred Terms
                    </div>
                  </div>
                </div>

                {/* Inline Token Amount Field */}
                {paymentOption === 'TOKEN' && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.76rem', fontWeight: 600, color: '#166534', whiteSpace: 'nowrap' }}>
                      Token Amount (₹):
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      value={tokenAmount}
                      onChange={(e) => setTokenAmount(e.target.value)}
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '5px 8px',
                        fontSize: '0.82rem',
                        border: '1px solid #86efac',
                        borderRadius: '6px',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* STEP 2: DISCOUNT & PRICING STRUCTURE (2x2 GRID) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  2. Discount & Pricing Structure
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {SLAB_OPTIONS.map((option) => {
                    const isSelected = selectedSlab === option.id;
                    return (
                      <div
                        key={option.id}
                        onClick={() => setSelectedSlab(option.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '8px',
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
                          style={{ accentColor: '#059669', width: '14px', height: '14px', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: isSelected ? 600 : 500, color: isSelected ? '#065f46' : '#1e293b' }}>
                            {option.title}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* FIXED MODAL FOOTER */}
            <div 
              style={{
                backgroundColor: '#f8fafc',
                padding: '10px 18px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 500,
                  fontSize: '0.8rem',
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
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px rgba(5, 150, 105, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <CheckCircle2 size={14} />
                {loading ? "Processing..." : "Confirm Quotation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
