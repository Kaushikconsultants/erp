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
import { getDocumentSequences, saveDocumentSequences, DocSeriesItem } from '@/app/actions/numberingActions';

export default function DocumentNumberingSettingsPage() {
  const [seriesList, setSeriesList] = useState<DocSeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentFy, setCurrentFy] = useState<string>(() => getFinancialYear());

  useEffect(() => {
    getDocumentSequences().then(res => {
      if (res.success && res.seriesList) {
        setSeriesList(res.seriesList);
        if (res.currentFy) setCurrentFy(res.currentFy);
      }
      setLoading(false);
    });
  }, []);

  const handleUpdate = (idx: number, field: keyof DocSeriesItem, value: any) => {
    setSeriesList(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const getPreview = (s: DocSeriesItem) => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const formattedPrefix = (s.prefix || '')
      .replace(/{FY}/g, currentFy)
      .replace(/{YYYY}/g, yyyy)
      .replace(/{YY}/g, yy)
      .replace(/{MM}/g, mm)
      .replace(/{BRANCH}/g, 'HO');
    const num = String(s.nextNumber || 1001).padStart(s.zeroPadding || 4, '0');
    return `${formattedPrefix}${num}${s.suffix || ''}`;
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await saveDocumentSequences(seriesList);
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3500);
      } else {
        setErrorMsg(res.error || "Failed to save numbering rules");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
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
          disabled={saving || loading}
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
            cursor: saving || loading ? 'not-allowed' : 'pointer',
            opacity: saving || loading ? 0.7 : 1,
            boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
          }}
        >
          <Save size={16} /> {saving ? "Saving Rules..." : "Save Numbering Rules"}
        </button>
      </div>

      {saved && (
        <div style={{ padding: '12px 16px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46', fontSize: '0.84rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} /> Document numbering rules successfully saved to database!
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.84rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {errorMsg}
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
