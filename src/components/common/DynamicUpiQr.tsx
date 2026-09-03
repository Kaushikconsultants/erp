"use client";

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface DynamicUpiQrProps {
  upiId: string;
  payeeName: string;
  amount: number;
  transactionNote?: string;
  transactionRef?: string;
  size?: number;
  showDetails?: boolean;
}

export default function DynamicUpiQr({
  upiId,
  payeeName,
  amount,
  transactionNote = 'Payment',
  transactionRef,
  size = 140,
  showDetails = true
}: DynamicUpiQrProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const safeAmount = Number(amount) || 0;
  const safeUpiId = upiId || '';
  const safePayee = payeeName || 'Merchant';

  // Standard NPCI UPI URI Scheme
  const upiUrl = `upi://pay?pa=${encodeURIComponent(safeUpiId)}&pn=${encodeURIComponent(safePayee)}&am=${safeAmount > 0 ? safeAmount.toFixed(2) : '0.00'}&cu=INR${transactionNote ? `&tn=${encodeURIComponent(transactionNote)}` : ''}${transactionRef ? `&tr=${encodeURIComponent(transactionRef)}` : ''}`;

  useEffect(() => {
    if (!safeUpiId) return;

    QRCode.toDataURL(upiUrl, {
      width: size * 2, // 2x for sharp print quality
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error("Error generating UPI QR code:", err));
  }, [safeUpiId, safePayee, safeAmount, transactionNote, transactionRef, size, upiUrl]);

  if (!safeUpiId) return null;

  return (
    <div style={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '8px 10px',
      borderRadius: '8px',
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      maxWidth: `${size + 30}px`,
      textAlign: 'center'
    }}>
      {qrDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrDataUrl}
          alt={`Scan to Pay ₹${safeAmount.toLocaleString('en-IN')}`}
          style={{ width: `${size}px`, height: `${size}px`, display: 'block', borderRadius: '4px' }}
        />
      ) : (
        <div style={{ width: `${size}px`, height: `${size}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#94a3b8', fontSize: '0.72rem' }}>
          Generating QR...
        </div>
      )}

      {showDetails && (
        <div style={{ marginTop: '6px', fontSize: '0.68rem', color: '#475569', lineHeight: 1.3 }}>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>
            Scan & Pay {safeAmount > 0 ? `₹${safeAmount.toLocaleString('en-IN')}` : ''}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.62rem' }}>
            Google Pay • PhonePe • Paytm • UPI
          </div>
        </div>
      )}
    </div>
  );
}
