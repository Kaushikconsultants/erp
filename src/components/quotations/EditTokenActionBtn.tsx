"use client";

import React, { useState } from 'react';
import { Coins } from 'lucide-react';
import EditTokenAmountModal from './EditTokenAmountModal';

export default function EditTokenActionBtn({
  quotationId,
  quotationNumber,
  customerName,
  totalValue,
  receivedAmount
}: {
  quotationId: string;
  quotationNumber: string;
  customerName?: string;
  totalValue: number;
  receivedAmount: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          padding: '8px 16px',
          border: '1px solid #86efac',
          backgroundColor: '#f0fdf4',
          borderRadius: '6px',
          color: '#15803d',
          fontSize: '0.85rem',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          transition: 'all 0.15s ease'
        }}
      >
        <Coins size={15} /> Edit Token (₹{receivedAmount.toLocaleString('en-IN')})
      </button>

      {isOpen && (
        <EditTokenAmountModal
          isOpen={isOpen}
          quotationId={quotationId}
          quotationNumber={quotationNumber}
          customerName={customerName}
          totalValue={totalValue}
          currentReceivedAmount={receivedAmount}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
