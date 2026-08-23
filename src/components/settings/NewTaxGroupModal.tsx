"use client";

import React, { useState } from 'react';
import { X, Layers, Plus } from 'lucide-react';
import { createTaxRate } from '@/app/actions/taxActions';

interface NewTaxGroupModalProps {
  allTaxes: any[];
  onClose: () => void;
}

export default function NewTaxGroupModal({ allTaxes, onClose }: NewTaxGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedTaxIds, setSelectedTaxIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleTax = (id: string) => {
    setSelectedTaxIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Compute combined rate
  const combinedRate = allTaxes
    .filter(t => selectedTaxIds.includes(t.id))
    .reduce((acc, curr) => acc + curr.rate, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError("Group name is required.");
      return;
    }
    if (selectedTaxIds.length === 0) {
      setError("Please select at least one tax component for the group.");
      return;
    }

    setLoading(true);
    setError('');

    const res = await createTaxRate({
      name: groupName.trim(),
      type: "Tax Group",
      rate: Number(combinedRate),
      isGroup: true,
      subTaxes: selectedTaxIds,
      description: `Combined Group: ${allTaxes.filter(t => selectedTaxIds.includes(t.id)).map(t => `${t.name} (${t.rate}%)`).join(' + ')}`
    });

    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || "Failed to create tax group.");
    }
  };

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '520px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: '#16a34a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>New Tax Group</h2>
              <p style={{ fontSize: '0.78rem', margin: '2px 0 0', color: '#64748b' }}>Bundle multiple tax components (e.g. CGST 9% + SGST 9%)</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#94a3b8', cursor: 'pointer' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '0.82rem' }}>{error}</div>}

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>Group Name *</label>
            <input 
              type="text" 
              value={groupName} 
              onChange={e => setGroupName(e.target.value)} 
              placeholder="e.g. GST18 (Tax Group), GST12 (Tax Group)" 
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} 
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>
                Select Tax Components *
              </label>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16a34a' }}>
                Combined Rate: {combinedRate}%
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
              {allTaxes.map(tax => {
                const isChecked = selectedTaxIds.includes(tax.id);
                return (
                  <label
                    key={tax.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      backgroundColor: isChecked ? '#f0fdf4' : '#ffffff',
                      border: `1px solid ${isChecked ? '#86efac' : '#e2e8f0'}`,
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleTax(tax.id)}
                    />
                    <div>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{tax.name}</span>
                      <span style={{ marginLeft: '4px', color: '#64748b' }}>({tax.rate}%)</span>
                    </div>
                  </label>
                );
              })}
            </div>
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
              style={{ padding: '8px 20px', borderRadius: '8px', backgroundColor: '#16a34a', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.82rem', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? "Creating..." : "Save Tax Group"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
