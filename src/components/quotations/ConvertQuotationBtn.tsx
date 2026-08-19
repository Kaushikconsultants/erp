"use client";

import React, { useState } from 'react';
import { convertQuotationToOrder } from '@/app/actions/quotationActions';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, X, FileCheck, Percent, ShieldAlert, CreditCard, Banknote, ShieldCheck } from 'lucide-react';

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

    const res = await convertQuotationToOrder(quotationId, selectedSlab, {
      paymentOption,
      tokenAmount: Number(tokenAmount || 0)
    });

    setLoading(false);

    if (res.success && res.orderId) {
      alert(`Quotation confirmed & converted to Sales Order #${res.orderNumber}!`);
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
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          fontWeight: 700,
          backgroundColor: '#059669',
          color: '#ffffff',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
          transition: 'all 0.15s ease'
        }}
      >
        {loading ? (
          "Processing..."
        ) : (
          <>
            <ShieldCheck size={16} /> Confirm & Process to Order <ArrowRight size={14} />
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
              maxWidth: '520px',
              borderRadius: '20px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ELEGANT MODAL HEADER */}
            <div 
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#ffffff',
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileCheck size={24} color="#ffffff" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                    Confirm Quotation & Convert to Order
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.3 }}>
                    Verify payment received or credit terms to officially issue a Sales Order.
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
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* STEP 1: PAYMENT & CONFIRMATION METHOD */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  1. Payment / Confirmation Requirement
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  
                  {/* Full Payment */}
                  <div
                    onClick={() => setPaymentOption('FULL')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: paymentOption === 'FULL' ? '2px solid #059669' : '1px solid #cbd5e1',
                      backgroundColor: paymentOption === 'FULL' ? '#ecfdf5' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <input type="radio" checked={paymentOption === 'FULL'} onChange={() => setPaymentOption('FULL')} style={{ accentColor: '#059669' }} />
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0f172a' }}>💳 Full Payment Received</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Customer paid 100% full amount of the quotation.</div>
                    </div>
                  </div>

                  {/* Token Amount */}
                  <div
                    onClick={() => setPaymentOption('TOKEN')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: paymentOption === 'TOKEN' ? '2px solid #059669' : '1px solid #cbd5e1',
                      backgroundColor: paymentOption === 'TOKEN' ? '#ecfdf5' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input type="radio" checked={paymentOption === 'TOKEN'} onChange={() => setPaymentOption('TOKEN')} style={{ accentColor: '#059669' }} />
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0f172a' }}>🪙 Token / Advance Amount Received</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Customer paid advance token amount to confirm order.</div>
                      </div>
                    </div>

                    {paymentOption === 'TOKEN' && (
                      <div style={{ paddingLeft: '28px', marginTop: '4px' }}>
                        <input
                          type="number"
                          placeholder="Enter Token Amount (₹)"
                          value={tokenAmount}
                          onChange={(e) => setTokenAmount(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: '0.85rem',
                            border: '1px solid #059669',
                            borderRadius: '8px',
                            fontWeight: '700',
                            outline: 'none'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Credit Customer */}
                  <div
                    onClick={() => setPaymentOption('CREDIT')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: paymentOption === 'CREDIT' ? '2px solid #059669' : '1px solid #cbd5e1',
                      backgroundColor: paymentOption === 'CREDIT' ? '#ecfdf5' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <input type="radio" checked={paymentOption === 'CREDIT'} onChange={() => setPaymentOption('CREDIT')} style={{ accentColor: '#059669' }} />
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0f172a' }}>🏢 Credit Customer</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Approved B2B credit customer account with deferred payment terms.</div>
                    </div>
                  </div>

                </div>
              </div>

              {/* STEP 2: DISCOUNT SLAB */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  2. Select Discount & Pricing Structure
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                          padding: '10px 12px',
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
                          <div style={{ fontSize: '0.85rem', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#065f46' : '#1e293b' }}>
                            {option.title}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle2 size={16} />
                {loading ? "Processing..." : "Confirm & Process to Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
