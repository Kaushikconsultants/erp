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
          backgroundColor: 'rgba(15, 23, 42, 0.45)', 
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{ 
            backgroundColor: '#fff', 
            padding: '24px', 
            borderRadius: 'var(--radius-lg, 12px)', 
            width: '100%',
            maxWidth: '420px', 
            boxShadow: '0 16px 32px -8px rgba(0, 0, 0, 0.15)',
            border: '1px solid var(--border, #e2e8f0)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  width: '34px', 
                  height: '34px', 
                  borderRadius: 'var(--radius-sm, 6px)', 
                  backgroundColor: '#fef3c7', 
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Target size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Edit Monthly Target</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsOpen(false)} 
                style={{ 
                  background: '#f1f5f9', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: 'var(--text-secondary)',
                  width: '30px',
                  height: '30px',
                  borderRadius: 'var(--radius-sm, 6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Target Amount (₹)
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  <IndianRupee size={15} />
                </div>
                <input 
                  type="number" 
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px 14px 10px 34px', 
                    borderRadius: 'var(--radius-md, 8px)', 
                    border: '1px solid var(--border, #cbd5e1)', 
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button"
                onClick={() => setIsOpen(false)} 
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: 'var(--radius-md, 8px)', 
                  border: '1px solid var(--border, #e2e8f0)', 
                  backgroundColor: '#ffffff', 
                  color: 'var(--text-secondary)',
                  cursor: 'pointer', 
                  fontWeight: 500,
                  fontSize: '0.85rem'
                }}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSave} 
                disabled={loading} 
                style={{ 
                  padding: '8px 18px', 
                  borderRadius: 'var(--radius-md, 8px)', 
                  border: 'none', 
                  background: 'var(--accent-gradient, linear-gradient(135deg, var(--accent-primary, #00a884) 0%, var(--accent-primary-hover, #008f70) 100%))', 
                  color: '#fff', 
                  cursor: 'pointer', 
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
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
