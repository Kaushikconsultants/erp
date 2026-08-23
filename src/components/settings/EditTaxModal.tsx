"use client";

import React, { useState } from 'react';
import { X, Percent, Trash2 } from 'lucide-react';
import { updateTaxRate, deleteTaxRate } from '@/app/actions/taxActions';

interface EditTaxModalProps {
  tax: {
    id: string;
    name: string;
    type: string;
    rate: number;
    description?: string | null;
    status: string;
  };
  onClose: () => void;
}

export default function EditTaxModal({ tax, onClose }: EditTaxModalProps) {
  const [name, setName] = useState(tax.name);
  const [type, setType] = useState(tax.type);
  const [rate, setRate] = useState<number | ''>(tax.rate);
  const [description, setDescription] = useState(tax.description || '');
  const [status, setStatus] = useState(tax.status);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

    const res = await updateTaxRate(tax.id, {
      name: name.trim(),
      type,
      rate: Number(rate),
      description: description.trim() || undefined,
      status
    });

    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || "Failed to update tax rate.");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete tax "${tax.name}"?`)) return;
    setDeleting(true);
    const res = await deleteTaxRate(tax.id);
    setDeleting(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || "Failed to delete tax rate.");
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
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Edit Tax Rate</h2>
              <p style={{ fontSize: '0.78rem', margin: '2px 0 0', color: '#64748b' }}>Modify tax percentage or status</p>
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
                <option value="Tax Group">Tax Group</option>
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
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>Status</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>Description</label>
              <input 
                type="text" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Optional notes" 
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <button 
              type="button" 
              onClick={handleDelete}
              disabled={deleting}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fecdd3', backgroundColor: '#fff1f2', color: '#e11d48', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
            >
              <Trash2 size={14} /> {deleting ? "Deleting..." : "Delete"}
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
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
                {loading ? "Saving..." : "Update Tax"}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
