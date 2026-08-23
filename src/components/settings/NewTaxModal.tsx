"use client";

import React, { useState } from 'react';
import { X, Percent } from 'lucide-react';
import { createTaxRate } from '@/app/actions/taxActions';

interface NewTaxModalProps {
  onClose: () => void;
}

export default function NewTaxModal({ onClose }: NewTaxModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('CGST');
  const [rate, setRate] = useState<number | ''>(9);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Tax name is required.");
      return;
    }
    if (rate === '' || rate < 0) {
      setError("Please specify a valid tax rate percentage.");
      return;
    }

    setLoading(true);
    setError('');

    const res = await createTaxRate({
      name: name.trim(),
      type,
      rate: Number(rate),
      description: description.trim() || undefined
    });

    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || "Failed to create tax rate.");
    }
  };

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Percent size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>New Tax Rate</h2>
              <p style={{ fontSize: '0.78rem', margin: '2px 0 0', color: '#64748b' }}>Create a custom tax percentage rate</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#94a3b8', cursor: 'pointer' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '0.82rem' }}>{error}</div>}

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>Tax Name *</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. CGST 9%, IGST 18%, SGST 6%" 
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>Tax Type *</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              >
                <option value="CGST">CGST (Central Tax)</option>
                <option value="SGST">SGST (State Tax)</option>
                <option value="IGST">IGST (Integrated Tax)</option>
                <option value="UTGST">UTGST (Union Territory)</option>
                <option value="CESS">CESS (Compensation Cess)</option>
                <option value="CUSTOM">Custom Tax</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>Rate (%) *</label>
              <input 
                type="number" 
                step="0.01" 
                min="0"
                max="100"
                value={rate} 
                onChange={e => setRate(e.target.value === '' ? '' : Number(e.target.value))} 
                placeholder="e.g. 9" 
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} 
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>Description / Note</label>
            <input 
              type="text" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="e.g. Applicable on apparel & garments" 
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} 
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.82rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              style={{ padding: '8px 20px', borderRadius: '8px', backgroundColor: '#2563eb', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.82rem', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? "Creating..." : "Create Tax Rate"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
