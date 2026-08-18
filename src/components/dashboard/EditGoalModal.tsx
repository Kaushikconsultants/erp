"use client";

import React, { useState } from 'react';
import { updateMonthlyTarget } from '@/app/actions/companyActions';
import { Target, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function EditGoalModal({ currentTarget }: { currentTarget: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [goal, setGoal] = useState(currentTarget.toString());
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setLoading(true);
    const result = await updateMonthlyTarget(parseFloat(goal) || 0);
    setLoading(false);
    if (result.success) {
      setIsOpen(false);
      router.refresh();
    } else {
      alert("Failed to update target");
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
      >
        Edit Goal
      </button>

      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}><Target size={20} color="#4f46e5"/> Edit Monthly Target</h3>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Target Amount (₹)</label>
              <input 
                type="number" 
                value={goal}
                onChange={e => setGoal(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setIsOpen(false)} style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSave} disabled={loading} style={{ padding: '10px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#4f46e5', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                {loading ? 'Saving...' : 'Save Target'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
