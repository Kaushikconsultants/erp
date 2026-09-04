"use client";

import React, { useState } from 'react';
import { 
  PhoneCall, 
  PhoneForwarded, 
  PhoneOff, 
  CheckCircle2, 
  X, 
  Clock, 
  User, 
  Sparkles,
  Volume2
} from 'lucide-react';
import { initiateClickToCall } from '@/app/actions/telephonyActions';

interface ClickToCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  callerName?: string;
  customerId?: string;
  leadId?: string;
  onCallLogged?: () => void;
}

export default function ClickToCallModal({
  isOpen,
  onClose,
  phoneNumber,
  callerName,
  customerId,
  leadId,
  onCallLogged
}: ClickToCallModalProps) {
  const [callStatus, setCallStatus] = useState<'IDLE' | 'DIALING' | 'CONNECTED' | 'COMPLETED'>('IDLE');
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [callSid, setCallSid] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleStartCall = async () => {
    setLoading(true);
    setCallStatus('DIALING');
    const res = await initiateClickToCall({
      phoneNumber,
      callerName,
      customerId,
      leadId
    });
    setLoading(false);

    if (res.success) {
      setCallSid(res.callSid || null);
      setCallStatus('CONNECTED');
      if (onCallLogged) onCallLogged();
    } else {
      alert(res.error || "Failed to initiate call");
      setCallStatus('IDLE');
    }
  };

  const handleEndCall = () => {
    setCallStatus('COMPLETED');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        maxWidth: '420px',
        width: '100%',
        padding: '24px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        textAlign: 'center',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', right: '16px', top: '16px', color: '#94a3b8' }}
        >
          <X size={18} />
        </button>

        {/* DIALER AVATAR */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: callStatus === 'CONNECTED' ? '#dcfce7' : '#e0e7ff',
          color: callStatus === 'CONNECTED' ? '#16a34a' : '#4f46e5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          boxShadow: callStatus === 'CONNECTED' ? '0 0 0 8px rgba(34, 197, 94, 0.15)' : 'none',
          transition: 'all 0.3s ease'
        }}>
          {callStatus === 'CONNECTED' ? <Volume2 size={32} /> : <PhoneCall size={28} />}
        </div>

        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
          {callerName || 'Customer'}
        </h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '0.95rem', fontWeight: 600, color: '#4f46e5', fontFamily: 'monospace' }}>
          {phoneNumber}
        </p>

        {/* STATUS BANNER */}
        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          backgroundColor: callStatus === 'CONNECTED' ? '#ecfdf5' : '#f8fafc',
          border: `1px solid ${callStatus === 'CONNECTED' ? '#a7f3d0' : '#e2e8f0'}`,
          fontSize: '0.82rem',
          color: callStatus === 'CONNECTED' ? '#065f46' : '#64748b',
          fontWeight: 600,
          marginBottom: '24px'
        }}>
          {callStatus === 'IDLE' && 'Ready to connect via Cloud Dialer'}
          {callStatus === 'DIALING' && 'Connecting to carrier network...'}
          {callStatus === 'CONNECTED' && `Call in progress (${callSid})`}
          {callStatus === 'COMPLETED' && 'Call ended. Call log saved in CRM.'}
        </div>

        {/* BUTTONS */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          {callStatus === 'IDLE' && (
            <button
              type="button"
              onClick={handleStartCall}
              disabled={loading}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                backgroundColor: '#059669',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)'
              }}
            >
              <PhoneForwarded size={16} /> {loading ? 'Dialing...' : 'Start Call Now'}
            </button>
          )}

          {callStatus === 'CONNECTED' && (
            <button
              type="button"
              onClick={handleEndCall}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)'
              }}
            >
              <PhoneOff size={16} /> End Call
            </button>
          )}

          {callStatus === 'COMPLETED' && (
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 700
              }}
            >
              Close Window
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
