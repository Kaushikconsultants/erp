"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { trackOrder } from '@/app/actions/orderActions';
import { Package, Truck, CheckCircle, X, MapPin, Loader2, ArrowRight, RefreshCw, Copy, Check, AlertCircle } from 'lucide-react';

interface OrderTrackingModalProps {
  orderId: string;
  orderNumber: string;
  awbNumber?: string | null;
  courierName?: string | null;
  onClose: () => void;
}

export default function OrderTrackingModal({ orderId, orderNumber, awbNumber, courierName, onClose }: OrderTrackingModalProps) {
  const [trackingData, setTrackingData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleTrack = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await trackOrder(orderId);
      if (!res) {
        setError('No response received from tracking service');
      } else if ('error' in res && res.error) {
        setError(res.error);
      } else if ('success' in res && (res as any).success === false) {
        setError((res as any).error || 'Live tracking details are currently unavailable.');
      } else {
        setTrackingData(res as any);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to courier partner.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Auto-fetch tracking on open if AWB is present
  useEffect(() => {
    if (awbNumber) {
      handleTrack();
    }
  }, [awbNumber, handleTrack]);

  const handleCopyAwb = (awbToCopy: string) => {
    if (!awbToCopy) return;
    navigator.clipboard.writeText(awbToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatEventDate = (dateStr?: string) => {
    if (!dateStr) return { time: '', date: '' };
    try {
      const cleanStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
      const d = new Date(cleanStr);
      if (isNaN(d.getTime())) {
        return { time: '', date: dateStr };
      }
      return {
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase(),
        date: d.toLocaleDateString()
      };
    } catch {
      return { time: '', date: dateStr };
    }
  };

  const effectiveAwb = trackingData?.awb || awbNumber;
  const effectiveCourier = trackingData?.courier || courierName || "Courier Partner";

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '520px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'fadeIn 0.2s ease-out' }}>
        
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '8px', borderRadius: '10px', display: 'flex' }}>
              <Truck size={20} />
            </div>
            Track {orderNumber}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {trackingData && (
              <button
                onClick={handleTrack}
                disabled={loading}
                title="Refresh Live Status"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', cursor: loading ? 'not-allowed' : 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '8px', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            )}
            <button 
              onClick={onClose} 
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '50%', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: '#fafaf9' }}>
          {!awbNumber ? (
            <div style={{ backgroundColor: '#fffbeb', color: '#b45309', padding: '24px', borderRadius: '12px', textAlign: 'center', fontWeight: 500, border: '1px solid #fde68a' }}>
              <Package size={32} style={{ margin: '0 auto 12px auto', color: '#f59e0b', opacity: 0.8 }} />
              <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>No AWB Assigned</div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e' }}>
                This order does not have a tracking number yet. Assign an AWB in Edit Order or Dispatch Pipeline.
              </p>
            </div>
          ) : loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 0' }}>
              <div style={{ position: 'relative', width: '56px', height: '56px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #e0e7ff' }}></div>
                <Loader2 size={36} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
              <div style={{ color: '#0f172a', fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>Connecting to Courier</div>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                Querying live tracking for AWB: {awbNumber}...
              </p>
            </div>
          ) : error ? (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #fecaca', borderRadius: '16px', padding: '24px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <AlertCircle size={26} />
              </div>
              <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.05rem', fontWeight: 700 }}>
                Tracking Status Unavailable
              </h4>
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                {error}
              </p>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#f1f5f9', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginBottom: '20px' }}>
                <span>AWB: {awbNumber}</span>
                <button
                  type="button"
                  onClick={() => handleCopyAwb(awbNumber!)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', padding: 0 }}
                  title="Copy AWB"
                >
                  {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button 
                  onClick={handleTrack} 
                  style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}
                >
                  <RefreshCw size={16} /> Retry Fetch
                </button>
              </div>
            </div>
          ) : !trackingData ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#f1f5f9', padding: '8px 16px', borderRadius: '20px', color: '#475569', fontWeight: 600, fontSize: '0.9rem', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                <span>AWB: {awbNumber}</span>
                <button
                  type="button"
                  onClick={() => handleCopyAwb(awbNumber!)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', padding: 0 }}
                >
                  {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                </button>
              </div>
              <button 
                onClick={handleTrack} 
                style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '14px 24px', borderRadius: '12px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)', transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              >
                Fetch Live Status <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            <div>
              {/* Top Summary Card */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', marginBottom: '24px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Current Shipment Status
                  </span>
                  <span style={{ 
                    fontWeight: 700, 
                    fontSize: '0.85rem',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    backgroundColor: 
                      trackingData.currentStatus?.toLowerCase().includes('delivered') ? '#dcfce7' :
                      trackingData.currentStatus?.toLowerCase().includes('transit') || trackingData.currentStatus?.toLowerCase().includes('pickup') ? '#eff6ff' : '#f1f5f9',
                    color: 
                      trackingData.currentStatus?.toLowerCase().includes('delivered') ? '#15803d' :
                      trackingData.currentStatus?.toLowerCase().includes('transit') || trackingData.currentStatus?.toLowerCase().includes('pickup') ? '#1d4ed8' : '#334155'
                  }}>
                    {trackingData.currentStatus}
                  </span>
                </div>
                
                <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '12px 0' }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', marginBottom: '10px' }}>
                  <span style={{ color: '#64748b' }}>Courier Partner</span>
                  <span style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Truck size={15} color="#2563eb" /> {effectiveCourier}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', marginBottom: trackingData.expectedDelivery ? '10px' : '0' }}>
                  <span style={{ color: '#64748b' }}>Tracking ID (AWB)</span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{effectiveAwb}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAwb(effectiveAwb)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', padding: 0 }}
                      title="Copy AWB"
                    >
                      {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {trackingData.expectedDelivery && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                    <span style={{ color: '#64748b' }}>Expected Delivery</span>
                    <span style={{ fontWeight: 600, color: '#059669' }}>
                      {new Date(trackingData.expectedDelivery).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>

              {/* Timeline Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Tracking Activity ({trackingData.events?.length || 0})
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                  Live synchronized
                </span>
              </div>
              
              {/* Timeline */}
              {(!trackingData.events || trackingData.events.length === 0) ? (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.875rem' }}>
                  No detailed scan events reported yet. Shipment is manifested and ready for pickup.
                </div>
              ) : (
                <div style={{ position: 'relative', marginLeft: '16px', paddingLeft: '28px', borderLeft: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '22px', paddingBottom: '10px' }}>
                  {trackingData.events.map((ev: any, idx: number) => {
                    const isLatest = idx === 0;
                    const isDelivered = (ev.status || '').toLowerCase().includes('delivered');
                    const { time, date } = formatEventDate(ev.date);
                    
                    return (
                      <div key={idx} style={{ position: 'relative' }}>
                        {/* Timeline Dot/Icon */}
                        <div style={{ 
                          position: 'absolute', 
                          left: '-43px',
                          top: '2px', 
                          width: '28px', 
                          height: '28px', 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          backgroundColor: isDelivered ? '#10b981' : isLatest ? '#2563eb' : '#94a3b8',
                          color: '#ffffff',
                          border: '4px solid #fafaf9',
                          boxShadow: '0 0 0 1px #e2e8f0',
                          zIndex: 2
                        }}>
                          {isDelivered ? <CheckCircle size={14} strokeWidth={3} /> : <MapPin size={13} strokeWidth={2.5} />}
                        </div>
                        
                        {/* Content Card */}
                        <div style={{ 
                          backgroundColor: '#ffffff', 
                          padding: '14px 16px', 
                          borderRadius: '12px', 
                          border: isLatest ? '1px solid #bfdbfe' : '1px solid #e2e8f0', 
                          boxShadow: isLatest ? '0 4px 6px -1px rgba(37, 99, 235, 0.08)' : '0 1px 2px 0 rgba(0, 0, 0, 0.04)' 
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: isLatest ? '#1d4ed8' : '#1e293b' }}>
                              {ev.status}
                            </span>
                            {time && (
                              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '10px' }}>
                                {time}
                              </span>
                            )}
                          </div>
                          
                          {ev.description && ev.description !== ev.status && (
                            <div style={{ fontSize: '0.84rem', color: '#475569', marginBottom: '8px', lineHeight: 1.4 }}>
                              {ev.description}
                            </div>
                          )}

                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 500, marginTop: '4px' }}>
                            <MapPin size={12} /> 
                            <span>{ev.location}</span>
                            {date && <span>• {date}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}} />
    </div>
  );
}
