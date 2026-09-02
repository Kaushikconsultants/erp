"use client";

import React, { useState } from 'react';
import { updateOrder } from '@/app/actions/orderActions';
import { useRouter } from 'next/navigation';
import { X, CheckCircle2, ShoppingBag, Truck, CreditCard, DollarSign } from 'lucide-react';
import '@/components/ui/modal.css';

interface EditOrderModalProps {
  order: {
    id: string;
    orderNumber: string;
    customerName?: string;
    totalAmount: number;
    status: string;
    paymentType: string;
    notes?: string | null;
    awbNumber?: string | null;
    courierName?: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditOrderModal({ order, isOpen, onClose, onSuccess }: EditOrderModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [orderStatus, setOrderStatus] = useState(order.status || 'Processing');
  const [paymentStatus, setPaymentStatus] = useState(order.paymentType || 'Unpaid');
  const [paymentReceived, setPaymentReceived] = useState<string>(
    order.paymentType === 'Paid' ? String(order.totalAmount) : ''
  );
  const [discount, setDiscount] = useState<string>('0');
  const [notes, setNotes] = useState(order.notes || '');
  const [awbNumber, setAwbNumber] = useState(order.awbNumber || '');
  const [courierName, setCourierName] = useState(order.courierName || '');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await updateOrder(order.id, {
      orderStatus,
      paymentStatus,
      paymentReceived: paymentReceived !== '' ? Number(paymentReceived) : undefined,
      discount: discount !== '' ? Number(discount) : undefined,
      notes,
      awbNumber: awbNumber || undefined,
      courierName: courierName || undefined,
    });

    setLoading(false);

    if (res.success) {
      if (onSuccess) onSuccess();
      onClose();
      router.refresh();
    } else {
      setError(res.error || 'Failed to update order');
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
          maxWidth: '520px',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
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
              <ShoppingBag size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Edit Sales Order</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#e0e7ff', fontWeight: 500 }}>
                {order.orderNumber} • {order.customerName || 'Customer'}
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
        <form onSubmit={handleSubmit} style={{ padding: '22px', overflowY: 'auto', flex: 1 }}>
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

          {/* TOTAL ORDER VALUE BANNER */}
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
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Total Order Value:</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              ₹{order.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            {/* ORDER STATUS */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>
                Order Status
              </label>
              <select
                value={orderStatus}
                onChange={e => setOrderStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  fontWeight: 600
                }}
              >
                <option value="Processing">Processing</option>
                <option value="Packed">Packed</option>
                <option value="Dispatched">Dispatched</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* PAYMENT STATUS */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={e => setPaymentStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  fontWeight: 600
                }}
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
                <option value="Credit">Credit Customer</option>
              </select>
            </div>
          </div>

          {/* PAYMENT RECEIVED & DISCOUNT */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>
                Payment Received (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={paymentReceived}
                onChange={e => setPaymentReceived(e.target.value)}
                placeholder="e.g. 5000"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>
                Additional Discount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* SHIPPING & COURIER */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>
                AWB / Tracking Number
              </label>
              <input
                type="text"
                value={awbNumber}
                onChange={e => setAwbNumber(e.target.value)}
                placeholder="e.g. 1432890123"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>
                Courier Name
              </label>
              <input
                type="text"
                value={courierName}
                onChange={e => setCourierName(e.target.value)}
                placeholder="e.g. Delhivery, Bluedart"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* NOTES */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>
              Notes & Remarks
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add order instructions or dispatch notes..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                resize: 'vertical'
              }}
            />
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
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)'
              }}
            >
              <CheckCircle2 size={16} />
              {loading ? 'Saving...' : 'Save Order Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
