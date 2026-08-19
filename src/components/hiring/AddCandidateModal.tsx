"use client";

import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { createCandidate } from '@/app/actions/hiringActions';

interface AddCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCandidateModal({ isOpen, onClose, onSuccess }: AddCandidateModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await createCandidate(formData);
    setLoading(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      alert(res.error || "Failed to create candidate");
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#ffffff',
        width: '100%',
        maxWidth: '560px',
        borderRadius: 'var(--radius-lg, 16px)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* CLEAN SOFTWARE THEME HEADER */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'var(--accent-light, #e0e7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus size={20} style={{ color: 'var(--accent-primary, #4f46e5)' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', fontFamily: 'inherit' }}>
                Add New Job Candidate
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Register candidate details & reference for 3-round interview evaluation
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', fontSize: '1.25rem', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '75vh', overflowY: 'auto' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              Full Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Anish Sharma"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md, 8px)', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a', outline: 'none', backgroundColor: '#ffffff' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Email Address <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="anish@example.com"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md, 8px)', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a', outline: 'none', backgroundColor: '#ffffff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Phone Number
              </label>
              <input
                type="text"
                name="phone"
                placeholder="+91 98765 43210"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md, 8px)', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a', outline: 'none', backgroundColor: '#ffffff' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Applied Position / Role <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="appliedRole"
                required
                placeholder="e.g. Senior Sales Manager"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md, 8px)', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a', outline: 'none', backgroundColor: '#ffffff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Experience (Years)
              </label>
              <input
                type="number"
                step="0.5"
                name="experienceYears"
                placeholder="e.g. 4.5"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md, 8px)', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a', outline: 'none', backgroundColor: '#ffffff' }}
              />
            </div>
          </div>

          {/* REFERENCE / REFERRED BY FIELD */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Reference Name / Referred By
              </label>
              <input
                type="text"
                name="referenceName"
                placeholder="e.g. Rahul Verma / Agency / Self"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md, 8px)', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a', outline: 'none', backgroundColor: '#ffffff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Expected CTC / Salary
              </label>
              <input
                type="text"
                name="expectedSalary"
                placeholder="e.g. ₹12,00,000 PA"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md, 8px)', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a', outline: 'none', backgroundColor: '#ffffff' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              Resume Link / Document URL (Optional)
            </label>
            <input
              type="url"
              name="resumeUrl"
              placeholder="https://drive.google.com/..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md, 8px)', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a', outline: 'none', backgroundColor: '#ffffff' }}
            />
          </div>

          {/* FOOTER */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '9px 20px',
                borderRadius: 'var(--radius-md, 8px)',
                backgroundColor: 'var(--accent-primary, #4f46e5)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {loading ? "Adding..." : "Add Candidate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
