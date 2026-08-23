"use client";

import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { createTaxExemption } from '@/app/actions/taxActions';

interface NewExemptionModalProps {
  onClose: () => void;
}

export default function NewExemptionModal({ onClose }: NewExemptionModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Customer');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Reason title is required.");
      return;
    }
    if (!reason.trim()) {
      setError("Statutory reason is required.");
      return;
    }

    setLoading(true);
    setError('');

    const res = await createTaxExemption({
      name: name.trim(),
      type,
      reason: reason.trim()
    });

    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || "Failed to create tax exemption.");
    }
  };

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: '#7c3aed', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>New Tax Exemption</h2>
              <p style={{ fontSize: '0.78rem', margin: '2px 0 0', color: '#64748b' }}>Define exemption reason for non-taxable supplies</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#94a3b8', cursor: 'pointer' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '0.82rem' }}>{error}</div>}

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>Exemption Title *</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Special Economic Zone (SEZ), Export LUT" 
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>Applicable Type *</label>
            <select 
              value={type} 
              onChange={e => setType(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="Customer">Customer Account Exemption</option>
              <option value="Vendor">Vendor Account Exemption</option>
              <option value="Item">Product / Item Exemption</option>
              <option value="Transaction">Invoice / Order Level Exemption</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>Statutory Reason / Clause *</label>
            <textarea 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              placeholder="e.g. Supply to SEZ unit against bond without payment of integrated tax under Section 16"
              rows={3}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'none' }} 
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
              style={{ padding: '8px 20px', borderRadius: '8px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.82rem', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? "Saving..." : "Save Exemption"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
