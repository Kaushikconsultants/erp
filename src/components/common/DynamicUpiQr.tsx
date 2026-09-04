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
  layout?: 'standard' | 'compact' | 'receipt';
}

export default function DynamicUpiQr({
  upiId,
  payeeName,
  amount,
  transactionNote = 'Payment',
  transactionRef,
  size = 130,
  showDetails = true,
  layout = 'standard'
}: DynamicUpiQrProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const safeAmount = Number(amount) || 0;
  const safeUpiId = upiId || '';
  const safePayee = payeeName || 'Merchant';

  // Standard NPCI UPI URI Scheme (omit &am= when amount is 0/unspecified so payer can enter any amount)
  const upiUrl = `upi://pay?pa=${encodeURIComponent(safeUpiId)}&pn=${encodeURIComponent(safePayee)}${safeAmount > 0 ? `&am=${safeAmount.toFixed(2)}` : ''}&cu=INR${transactionNote ? `&tn=${encodeURIComponent(transactionNote)}` : ''}${transactionRef ? `&tr=${encodeURIComponent(transactionRef)}` : ''}`;

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
  }, [safeUpiId, upiUrl, size]);

  if (!safeUpiId) return null;

  const isReceipt = layout === 'receipt';
  const isCompact = layout === 'compact';

  return (
    <div style={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: isReceipt ? '4px' : '8px 10px',
      borderRadius: isReceipt ? '4px' : '8px',
      backgroundColor: '#ffffff',
      border: isReceipt ? '1px dashed #94a3b8' : '1px solid #e2e8f0',
      boxShadow: isReceipt ? 'none' : '0 1px 3px rgba(0,0,0,0.03)',
      maxWidth: `${size + 30}px`,
      textAlign: 'center'
    }}>
      {qrDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrDataUrl}
          alt={`Scan to Pay ₹${safeAmount.toLocaleString('en-IN')}`}
          style={{ width: `${size}px`, height: `${size}px`, display: 'block', borderRadius: isReceipt ? '0px' : '4px' }}
        />
      ) : (
        <div style={{ width: `${size}px`, height: `${size}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#94a3b8', fontSize: '0.72rem' }}>
          Generating QR...
        </div>
      )}

      {showDetails && (
        <div style={{ marginTop: '4px', fontSize: isReceipt ? '0.64rem' : '0.68rem', color: '#475569', lineHeight: 1.25 }}>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>
            Scan & Pay {safeAmount > 0 ? `₹${safeAmount.toLocaleString('en-IN')}` : ''}
          </div>
          <div style={{ color: '#64748b', fontSize: isReceipt ? '0.58rem' : '0.62rem', marginTop: '1px' }}>
            GPay • PhonePe • Paytm • UPI
          </div>
        </div>
      )}
    </div>
  );
}

