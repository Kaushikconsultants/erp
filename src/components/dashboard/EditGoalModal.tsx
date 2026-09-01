"use client";

import React, { useState } from 'react';
import { updateMonthlyTarget } from '@/app/actions/companyActions';
import { Target, X, Edit3, IndianRupee } from 'lucide-react';
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
        type="button"
        onClick={() => setIsOpen(true)}
        className="analytics-btn-edit-goal"
      >
        <Edit3 size={12} /> Edit Goal
      </button>

      {isOpen && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          backgroundColor: 'rgba(15, 23, 42, 0.55)', 
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{ 
            backgroundColor: '#fff', 
            padding: '28px', 
            borderRadius: '20px', 
            width: '100%',
            maxWidth: '440px', 
            boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '10px', 
                  backgroundColor: '#fef3c7', 
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Target size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Edit Monthly Target</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsOpen(false)} 
                style={{ 
                  background: '#f1f5f9', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: '#64748b',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b', marginBottom: '8px' }}>
                Target Amount (₹)
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                  <IndianRupee size={16} />
                </div>
                <input 
                  type="number" 
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px 12px 38px', 
                    borderRadius: '12px', 
                    border: '1.5px solid #cbd5e1', 
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                type="button"
                onClick={() => setIsOpen(false)} 
                style={{ 
                  padding: '10px 18px', 
                  borderRadius: '10px', 
                  border: '1.5px solid #e2e8f0', 
                  backgroundColor: '#ffffff', 
                  color: '#475569',
                  cursor: 'pointer', 
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSave} 
                disabled={loading} 
                style={{ 
                  padding: '10px 22px', 
                  borderRadius: '10px', 
                  border: 'none', 
                  background: 'var(--accent-gradient, linear-gradient(135deg, var(--accent-primary, #00a884) 0%, var(--accent-primary-hover, #008f70) 100%))', 
                  color: '#fff', 
                  cursor: 'pointer', 
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  boxShadow: '0 4px 12px -2px rgba(0, 168, 132, 0.3)',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Saving...' : 'Save Target'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
