"use client";

import React, { useState } from 'react';
import { 
  Users, 
  Sparkles, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  CreditCard, 
  ArrowUpRight, 
  Plus, 
  Minus, 
  Zap,
  Info
} from 'lucide-react';
import { purchaseExtraUserSeats } from '@/app/actions/tenantActions';
import { getAddonSeatPrice } from '@/lib/planConfig';

interface BuySeatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newMaxUsers: number, invoiceNumber: string) => void;
  orgPlan?: string;
  billingCycle?: string;
  currentMaxUsers?: number;
  currentUserCount?: number;
  onOpenUpgradePlan?: () => void;
}

export default function BuySeatsModal({
  isOpen,
  onClose,
  onSuccess,
  orgPlan = 'STARTER',
  billingCycle = 'MONTHLY',
  currentMaxUsers = 3,
  currentUserCount = 3,
  onOpenUpgradePlan
}: BuySeatsModalProps) {
  const [seatCount, setSeatCount] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const pricing = getAddonSeatPrice(orgPlan, billingCycle);
  const unitPrice = pricing.unitPrice;
  const baseAmount = unitPrice * seatCount;
  const gstAmount = Math.round(baseAmount * 0.18 * 100) / 100;
  const totalAmount = Math.round((baseAmount + gstAmount) * 100) / 100;

  const quickPills = [1, 2, 3, 5, 10];
  const isStarter = orgPlan.toUpperCase() === 'STARTER';
  const showGrowthUpsell = isStarter && seatCount >= 3;

  const handleSeatChange = (delta: number) => {
    setSeatCount(prev => Math.max(1, Math.min(100, prev + delta)));
  };

  const handlePurchase = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await purchaseExtraUserSeats({
        seatCount,
        paymentMethod: paymentMethod === 'UPI' ? 'UPI_AUTOPAY' : paymentMethod === 'CARD' ? 'CREDIT_CARD' : 'NET_BANKING'
      });

      if (res.success && res.newMaxUsers !== undefined) {
        if (onSuccess) {
          onSuccess(res.newMaxUsers, res.invoiceNumber || "");
        }
        onClose();
      } else if (!res.success) {
        setErrorMessage(res.error || "Failed to process seat purchase.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong while completing the transaction.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div 
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div 
          style={{
            padding: '22px 24px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.18)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, marginBottom: '8px' }}>
              <Sparkles size={13} />
              <span>INSTANT SEAT EXPANSION</span>
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
              Add Additional User Seats
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#e0e7ff', opacity: 0.95 }}>
              Scale your team capacity on demand without changing your base tier.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Error Message */}
          {errorMessage && (
            <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Current Quota Status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Current Allocation</span>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                  {currentUserCount} of {currentMaxUsers} Seats in Use
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Plan Rate</span>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4f46e5' }}>
                ₹{unitPrice.toLocaleString('en-IN')}<span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748b' }}>{pricing.period}</span>
              </div>
              {pricing.discountBadge && (
                <span style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 700 }}>
                  {pricing.discountBadge}
                </span>
              )}
            </div>
          </div>

          {/* Seat Quantity Stepper */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
              Select Number of Additional Seats:
            </label>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', border: '2px solid #cbd5e1', borderRadius: '12px', backgroundColor: '#ffffff', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => handleSeatChange(-1)}
                  disabled={seatCount <= 1 || isProcessing}
                  style={{
                    padding: '10px 14px',
                    border: 'none',
                    background: '#f1f5f9',
                    color: seatCount <= 1 ? '#94a3b8' : '#334155',
                    cursor: seatCount <= 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={seatCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) setSeatCount(Math.max(1, Math.min(100, val)));
                  }}
                  disabled={isProcessing}
                  style={{
                    width: '60px',
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    border: 'none',
                    outline: 'none',
                    color: '#0f172a'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSeatChange(1)}
                  disabled={seatCount >= 100 || isProcessing}
                  style={{
                    padding: '10px 14px',
                    border: 'none',
                    background: '#f1f5f9',
                    color: seatCount >= 100 ? '#94a3b8' : '#334155',
                    cursor: seatCount >= 100 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Quick Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {quickPills.map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSeatCount(num)}
                    disabled={isProcessing}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: seatCount === num ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                      backgroundColor: seatCount === num ? '#eef2ff' : '#ffffff',
                      color: seatCount === num ? '#4338ca' : '#475569',
                      fontWeight: seatCount === num ? 700 : 500,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    +{num} {num === 1 ? 'Seat' : 'Seats'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
              New total capacity will be: <strong style={{ color: '#0f172a' }}>{currentMaxUsers + seatCount} users</strong>.
            </div>
          </div>

          {/* Growth Upsell Banner (Only if Starter + 3 or more extra seats) */}
          {showGrowthUpsell && (
            <div 
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#92400e', fontWeight: 700, fontSize: '0.78rem' }}>
                  <Zap size={14} style={{ color: '#d97706' }} />
                  <span>Cost Optimization Tip</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#78350f', marginTop: '2px' }}>
                  Adding {seatCount} seats costs ₹{baseAmount.toLocaleString('en-IN')}. For ₹2,499/mo, the <strong>Growth Plan</strong> gives you <strong>10 users</strong> + 3 branches + AI Copilot.
                </div>
              </div>
              {onOpenUpgradePlan && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenUpgradePlan();
                  }}
                  style={{
                    flexShrink: 0,
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)'
                  }}
                >
                  <span>View Growth</span>
                  <ArrowUpRight size={13} />
                </button>
              )}
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
              Payment Method:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'UPI', label: 'UPI / QR', sub: 'Instant Auto-Verify' },
                { id: 'CARD', label: 'Debit / Card', sub: 'Visa, Master, RuPay' },
                { id: 'NETBANKING', label: 'Net Banking', sub: 'All Indian Banks' }
              ].map(pm => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPaymentMethod(pm.id as any)}
                  disabled={isProcessing}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: paymentMethod === pm.id ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                    backgroundColor: paymentMethod === pm.id ? '#f5f3ff' : '#ffffff',
                    color: paymentMethod === pm.id ? '#312e81' : '#475569',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{pm.label}</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{pm.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Invoice Summary */}
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: '6px' }}>
              <span>{seatCount} × Additional Seat{seatCount > 1 ? 's' : ''}</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>₹{baseAmount.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: '8px' }}>
              <span>GST (18% Software SaaS - SAC 998315)</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>₹{gstAmount.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', borderTop: '1px solid #cbd5e1', paddingTop: '8px' }}>
              <span>Total Payable Now</span>
              <span style={{ color: '#059669' }}>₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div 
          style={{
            padding: '16px 24px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#64748b' }}>
            <ShieldCheck size={16} style={{ color: '#059669' }} />
            <span>Instant Activation • GST Tax Invoice</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: isProcessing ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePurchase}
              disabled={isProcessing}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
              }}
            >
              <Sparkles size={16} />
              {isProcessing ? "Processing Activation..." : `Pay ₹${totalAmount.toLocaleString('en-IN')} & Add Seats`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
