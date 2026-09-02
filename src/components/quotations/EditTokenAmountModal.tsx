"use client";

import React, { useState, useEffect } from 'react';
import { updateQuotationTokenAmount } from '@/app/actions/quotationActions';
import { useRouter } from 'next/navigation';
import { Coins, X, CheckCircle2, CreditCard, Percent, ShieldAlert } from 'lucide-react';
import '@/components/ui/modal.css';

const SLAB_OPTIONS = [
  { id: '0', title: '0% Discount (Bonus)', icon: <Percent size={14} color="#059669" /> },
  { id: '1-15', title: '1 - 15% Discount (Standard)', icon: <CheckCircle2 size={14} color="#059669" /> },
  { id: '>15', title: 'Above 15% Discount', icon: <ShieldAlert size={14} color="#d97706" /> },
  { id: 'credit', title: 'Credit Customer', icon: <CreditCard size={14} color="#4f46e5" /> }
];

interface EditTokenAmountModalProps {
  quotationId: string;
  quotationNumber: string;
  customerName?: string;
  totalValue: number;
  currentReceivedAmount: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newAmount: number, newSlab?: string) => void;
  discountSlab?: string;
}

export default function EditTokenAmountModal({
  quotationId,
  quotationNumber,
  customerName,
  totalValue,
  currentReceivedAmount,
  isOpen,
  onClose,
  onSuccess,
  discountSlab
}: EditTokenAmountModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSlab, setSelectedSlab] = useState(discountSlab || '1-15');

  // Initial payment option based on current amount
  const initialOption: 'FULL' | 'TOKEN' | 'CREDIT' = 
    currentReceivedAmount >= totalValue && totalValue > 0 
      ? 'FULL' 
      : currentReceivedAmount > 0 
      ? 'TOKEN' 
      : 'CREDIT';

  const [paymentOption, setPaymentOption] = useState<'FULL' | 'TOKEN' | 'CREDIT'>(initialOption);
  const [tokenAmountStr, setTokenAmountStr] = useState<string>(
    currentReceivedAmount > 0 ? String(currentReceivedAmount) : ''
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedSlab(discountSlab || '1-15');
      const opt: 'FULL' | 'TOKEN' | 'CREDIT' = 
        currentReceivedAmount >= totalValue && totalValue > 0 
          ? 'FULL' 
          : currentReceivedAmount > 0 
          ? 'TOKEN' 
          : 'CREDIT';
      setPaymentOption(opt);
      setTokenAmountStr(currentReceivedAmount > 0 ? String(currentReceivedAmount) : '');
      setError('');
    }
  }, [isOpen, discountSlab, currentReceivedAmount, totalValue]);

  if (!isOpen) return null;

  const resolvedAmount = 
    paymentOption === 'FULL' 
      ? totalValue 
      : paymentOption === 'CREDIT' 
      ? 0 
      : Number(tokenAmountStr || 0);

  const remainingBalance = Math.max(0, totalValue - resolvedAmount);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentOption === 'TOKEN' && (!tokenAmountStr || Number(tokenAmountStr) < 0)) {
      setError('Please enter a valid token amount.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await updateQuotationTokenAmount(quotationId, resolvedAmount, paymentOption, selectedSlab);
    setLoading(false);

    if (res.success) {
      if (onSuccess) onSuccess(resolvedAmount, selectedSlab);
      onClose();
      router.refresh();
    } else {
      setError(res.error || 'Failed to update token amount and pricing structure');
    }
  };

  return (
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
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: '#ffffff',
          width: '100%',
          maxWidth: '500px',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          color: '#ffffff',
          padding: '18px 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Coins size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Edit Token / Advance & Pricing</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#e6fffa', fontWeight: 500 }}>
                Quote #{quotationNumber} • {customerName || 'Customer'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSave} style={{ padding: '22px' }}>
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: '16px',
              border: '1px solid #fca5a5'
            }}>
              {error}
            </div>
          )}

          {/* TOTAL QUOTATION BANNER */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px'
          }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Total Quotation Value:</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* PAYMENT OPTION PILLS */}
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
            Payment Advance Type
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '18px' }}>
            {/* FULL */}
            <button
              type="button"
              onClick={() => {
                setPaymentOption('FULL');
                setTokenAmountStr(String(totalValue));
              }}
              style={{
                padding: '10px 8px',
                borderRadius: '8px',
                border: paymentOption === 'FULL' ? '2px solid #059669' : '1px solid #cbd5e1',
                backgroundColor: paymentOption === 'FULL' ? '#ecfdf5' : '#ffffff',
                color: paymentOption === 'FULL' ? '#065f46' : '#475569',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              100% Full (₹{totalValue > 0 ? (totalValue / 1000).toFixed(1) + 'k' : '0'})
            </button>

            {/* TOKEN */}
            <button
              type="button"
              onClick={() => setPaymentOption('TOKEN')}
              style={{
                padding: '10px 8px',
                borderRadius: '8px',
                border: paymentOption === 'TOKEN' ? '2px solid #059669' : '1px solid #cbd5e1',
                backgroundColor: paymentOption === 'TOKEN' ? '#ecfdf5' : '#ffffff',
                color: paymentOption === 'TOKEN' ? '#065f46' : '#475569',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              🪙 Custom Token
            </button>

            {/* CREDIT / ZERO */}
            <button
              type="button"
              onClick={() => {
                setPaymentOption('CREDIT');
                setTokenAmountStr('0');
              }}
              style={{
                padding: '10px 8px',
                borderRadius: '8px',
                border: paymentOption === 'CREDIT' ? '2px solid #059669' : '1px solid #cbd5e1',
                backgroundColor: paymentOption === 'CREDIT' ? '#ecfdf5' : '#ffffff',
                color: paymentOption === 'CREDIT' ? '#065f46' : '#475569',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              0 Advance (Credit)
            </button>
          </div>

          {/* TOKEN AMOUNT INPUT IF TOKEN IS SELECTED */}
          {paymentOption === 'TOKEN' && (
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Enter Token / Advance Amount Received (₹) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '2px solid #059669',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.12)'
              }}>
                <span style={{
                  padding: '10px 14px',
                  backgroundColor: '#f0fdf4',
                  color: '#059669',
                  fontWeight: 800,
                  fontSize: '1rem',
                  borderRight: '1px solid #86efac'
                }}>
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={totalValue}
                  value={tokenAmountStr}
                  onChange={e => setTokenAmountStr(e.target.value)}
                  placeholder="e.g. 5000"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: 'none',
                    outline: 'none',
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    color: '#0f172a'
                  }}
                />
              </div>
            </div>
          )}

          {/* DISCOUNT & PRICING STRUCTURE (SLABS) */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
              Discount & Pricing Structure
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
                      padding: '9px 10px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #059669' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input 
                      type="radio"
                      name="discountSlabModal"
                      value={option.id}
                      checked={isSelected}
                      onChange={() => setSelectedSlab(option.id)}
                      style={{ accentColor: '#059669', width: '15px', height: '15px', cursor: 'pointer', margin: 0 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      {option.icon}
                      <span style={{ fontSize: '0.75rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#065f46' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {option.title}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DYNAMIC BALANCE SUMMARY */}
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#065f46', fontWeight: 600 }}>Amount Received / Paid:</span>
              <span style={{ color: '#059669', fontWeight: 800 }}>₹{resolvedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', paddingTop: '4px', borderTop: '1px dashed #a7f3d0' }}>
              <span style={{ color: '#065f46', fontWeight: 600 }}>Remaining Balance Due:</span>
              <span style={{ color: remainingBalance > 0 ? '#b45309' : '#059669', fontWeight: 800 }}>
                ₹{remainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '9px 16px',
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
              type="submit"
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
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
              }}
            >
              <CheckCircle2 size={16} />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
