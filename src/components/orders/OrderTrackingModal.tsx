"use client";
import React, { useState } from 'react';
import { trackOrder } from '@/app/actions/orderActions';
import { Package, Truck, CheckCircle, X, MapPin, Loader2, ArrowRight } from 'lucide-react';

interface OrderTrackingModalProps {
  orderId: string;
  orderNumber: string;
  awbNumber?: string | null;
  onClose: () => void;
}

export default function OrderTrackingModal({ orderId, orderNumber, awbNumber, onClose }: OrderTrackingModalProps) {
  const [trackingData, setTrackingData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async () => {
    setLoading(true);
    setError('');
    const res = await trackOrder(orderId);
    if (res.error) {
      setError(res.error);
    } else {
      setTrackingData(res);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'fadeIn 0.2s ease-out' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#eff6ff', color: '#3b82f6', padding: '8px', borderRadius: '10px', display: 'flex' }}>
              <Package size={20} />
            </div>
            Track {orderNumber}
          </h2>
          <button 
            onClick={onClose} 
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '50%', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: '#fafaf9' }}>
          {!awbNumber ? (
            <div style={{ backgroundColor: '#fffbeb', color: '#b45309', padding: '20px', borderRadius: '12px', textAlign: 'center', fontWeight: 500, border: '1px solid #fde68a' }}>
              This order has no AWB number assigned yet.
            </div>
          ) : !trackingData && !loading ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ display: 'inline-flex', backgroundColor: '#f1f5f9', padding: '8px 16px', borderRadius: '20px', color: '#475569', fontWeight: 600, fontSize: '0.9rem', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                AWB: {awbNumber}
              </div>
              <button 
                onClick={handleTrack} 
                style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '14px 24px', borderRadius: '12px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)', transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
              >
                Fetch Live Status <ArrowRight size={18} />
              </button>
            </div>
          ) : loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
              <Loader2 size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
              <p style={{ color: '#64748b', fontWeight: 500, margin: 0 }}>Connecting to Courier...</p>
            </div>
          ) : error ? (
            <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '20px', borderRadius: '12px', textAlign: 'center', fontWeight: 500, border: '1px solid #fecaca' }}>
              {error}
            </div>
          ) : (
            <div>
              {/* Top Summary Card */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', marginBottom: '32px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Status</span>
                  <span style={{ 
                    fontWeight: 700, 
                    fontSize: '0.9rem',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    backgroundColor: trackingData.currentStatus === 'Delivered' ? '#dcfce3' : '#eff6ff',
                    color: trackingData.currentStatus === 'Delivered' ? '#166534' : '#1d4ed8'
                  }}>
                    {trackingData.currentStatus}
                  </span>
                </div>
                
                <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '12px 0' }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Courier Partner</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{trackingData.courier}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                  <span style={{ color: '#64748b' }}>Tracking ID (AWB)</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{trackingData.awb}</span>
                </div>
              </div>

              {/* Timeline */}
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 20px 0' }}>Tracking History</h3>
              
              <div style={{ position: 'relative', marginLeft: '16px', paddingLeft: '28px', borderLeft: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '10px' }}>
                {trackingData.events?.map((ev: any, idx: number) => {
                  const isLatest = idx === 0;
                  const isDelivered = ev.status === 'Delivered';
                  
                  return (
                    <div key={idx} style={{ position: 'relative' }}>
                      {/* Timeline Dot/Icon */}
                      <div style={{ 
                        position: 'absolute', 
                        left: '-43px', // -28px (paddingLeft) - 15px (half width) + 1px (half border) = -42px
                        top: '0', 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: isDelivered ? '#10b981' : isLatest ? '#3b82f6' : '#94a3b8',
                        color: '#ffffff',
                        border: '4px solid #fafaf9',
                        boxShadow: '0 0 0 1px #e2e8f0'
                      }}>
                        {isDelivered ? <CheckCircle size={14} strokeWidth={3} /> : <MapPin size={14} strokeWidth={2.5} />}
                      </div>
                      
                      {/* Content */}
                      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: isLatest ? '1px solid #bfdbfe' : '1px solid #e2e8f0', boxShadow: isLatest ? '0 4px 6px -1px rgba(59, 130, 246, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isLatest ? '#1e40af' : '#334155' }}>
                            {ev.status}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                            {new Date(ev.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '8px', lineHeight: 1.4 }}>
                          {ev.description}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                          <MapPin size={12} /> {ev.location} • {new Date(ev.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}} />
    </div>
  );
}
