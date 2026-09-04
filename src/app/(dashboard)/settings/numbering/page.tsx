"use client";

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Save, 
  RotateCcw, 
  HelpCircle, 
  CheckCircle2, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { getFinancialYear } from '@/lib/documentNumbering';

interface DocSeriesSetting {
  docType: string;
  title: string;
  prefix: string;
  suffix: string;
  nextNumber: number;
  zeroPadding: number;
}

const DEFAULT_SERIES: DocSeriesSetting[] = [
  { docType: 'INVOICE', title: 'Tax Invoices', prefix: 'INV/{FY}/', suffix: '', nextNumber: 1001, zeroPadding: 4 },
  { docType: 'QUOTATION', title: 'Sales Quotations', prefix: 'QT/{FY}/', suffix: '', nextNumber: 1001, zeroPadding: 4 },
  { docType: 'ORDER', title: 'Sales Orders', prefix: 'ORD/{FY}/', suffix: '', nextNumber: 1001, zeroPadding: 4 },
  { docType: 'DELIVERY_CHALLAN', title: 'Delivery Challans (DC)', prefix: 'DC/{FY}/', suffix: '', nextNumber: 1001, zeroPadding: 4 },
  { docType: 'CREDIT_NOTE', title: 'Credit Notes', prefix: 'CN/{FY}/', suffix: '', nextNumber: 1001, zeroPadding: 4 },
  { docType: 'PURCHASE_ORDER', title: 'Purchase Orders (PO)', prefix: 'PO/{FY}/', suffix: '', nextNumber: 1001, zeroPadding: 4 },
  { docType: 'BILL', title: 'Vendor Bills', prefix: 'BILL/{FY}/', suffix: '', nextNumber: 1001, zeroPadding: 4 },
  { docType: 'DEBIT_NOTE', title: 'Vendor Debit Notes', prefix: 'DN/{FY}/', suffix: '', nextNumber: 1001, zeroPadding: 4 }
];

export default function DocumentNumberingSettingsPage() {
  const [seriesList, setSeriesList] = useState<DocSeriesSetting[]>(DEFAULT_SERIES);
  const [saved, setSaved] = useState(false);
  const currentFy = getFinancialYear();

  const handleUpdate = (idx: number, field: keyof DocSeriesSetting, value: any) => {
    setSeriesList(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const getPreview = (s: DocSeriesSetting) => {
    const formattedPrefix = s.prefix.replace(/{FY}/g, currentFy).replace(/{YY}/g, '26').replace(/{BRANCH}/g, 'HO');
    const num = String(s.nextNumber).padStart(s.zeroPadding, '0');
    return `${formattedPrefix}${num}${s.suffix || ''}`;
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Document Numbering & Prefix Settings
            </h1>
          </div>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Configure auto-incrementing document numbering formats by Financial Year ({currentFy}) and Branch.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          style={{
            padding: '10px 22px',
            borderRadius: '8px',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            fontSize: '0.84rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
          }}
        >
          <Save size={16} /> Save Numbering Rules
        </button>
      </div>

      {saved && (
        <div style={{ padding: '12px 16px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46', fontSize: '0.84rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} /> Document numbering rules successfully saved!
        </div>
      )}

      {/* DYNAMIC TAGS HELPER */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '14px 18px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#334155' }}>
          <Sparkles size={16} style={{ color: '#4f46e5' }} />
          <span><strong>Dynamic Template Tags Supported:</strong></span>
          <code style={{ backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>{'{FY}'}</code> (e.g. {currentFy})
          <code style={{ backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>{'{YY}'}</code> (e.g. 26)
          <code style={{ backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>{'{BRANCH}'}</code> (e.g. RTK)
        </div>
      </div>

      {/* SERIES CONFIGURATION TABLE */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Document Type</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Prefix Format</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Next Number</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Zero Padding</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Sample Generated Number</th>
            </tr>
          </thead>
          <tbody>
            {seriesList.map((s, idx) => (
              <tr key={s.docType} style={{ borderBottom: idx !== seriesList.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                  {s.title}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <input
                    type="text"
                    value={s.prefix}
                    onChange={e => handleUpdate(idx, 'prefix', e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontFamily: 'monospace',
                      fontSize: '0.82rem',
                      width: '160px'
                    }}
                  />
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <input
                    type="number"
                    value={s.nextNumber}
                    onChange={e => handleUpdate(idx, 'nextNumber', parseInt(e.target.value, 10) || 1)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      width: '90px'
                    }}
                  />
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <select
                    value={s.zeroPadding}
                    onChange={e => handleUpdate(idx, 'zeroPadding', parseInt(e.target.value, 10))}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem'
                    }}
                  >
                    <option value={3}>3 digits (001)</option>
                    <option value={4}>4 digits (0001)</option>
                    <option value={5}>5 digits (00001)</option>
                    <option value={6}>6 digits (000001)</option>
                  </select>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#eef2ff',
                    color: '#4f46e5',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '0.84rem'
                  }}>
                    {getPreview(s)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
