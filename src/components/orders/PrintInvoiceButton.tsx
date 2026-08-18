"use client";

import React from 'react';
import { Printer } from 'lucide-react';

export default function PrintInvoiceButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        padding: '8px 16px',
        backgroundColor: '#4f46e5',
        color: 'white',
        borderRadius: '6px',
        border: 'none',
        fontWeight: 600,
        fontSize: '13px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
      }}
      className="no-print"
    >
      <Printer size={16} /> Print / Save PDF
    </button>
  );
}
