"use client";

import React, { useState } from 'react';
import { updatePricingStructure } from '@/app/actions/quotationActions';
import { useRouter } from 'next/navigation';
import { Edit3, CheckCircle2, X, Percent, ShieldAlert, CreditCard, AlertCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';

const SLAB_OPTIONS = [
  {
    id: '0',
    title: '0% Discount (Bonus)',
    subtitle: 'Issue invoice at full catalog list price with 0% discount',
    icon: <Percent size={18} className="text-emerald-600" />
  },
  {
    id: '1-15',
    title: '1 - 15% Discount (Standard)',
    subtitle: 'Standard tier customer pricing and discount structure',
    icon: <CheckCircle2 size={18} className="text-emerald-600" />
  },
  {
    id: '>15',
    title: 'Above 15% Discount',
    subtitle: 'High volume bulk order or VIP client custom discount',
    icon: <ShieldAlert size={18} className="text-amber-600" />
  },
  {
    id: 'credit',
    title: 'Credit Customer',
    subtitle: 'Deferred payment terms (Accounts Receivable credit invoice)',
    icon: <CreditCard size={18} className="text-indigo-600" />
  }
];

export default function EditPricingStructureBtn({ quotationId, currentSlab }: { quotationId: string, currentSlab?: string }) {
  const { data: session } = useSession();
  const rawRole = (session?.user as any)?.role || 'SALES';
  const normRole = String(rawRole).trim().toUpperCase();
  const isAdmin = normRole === 'ADMIN' || normRole === 'SUPER_ADMIN';

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlab, setSelectedSlab] = useState(currentSlab || '1-15');
  const router = useRouter();

  if (!isAdmin) return null;

  const handleUpdate = async () => {
    setIsModalOpen(false);
    setLoading(true);

    const res = await updatePricingStructure(quotationId, selectedSlab);

    setLoading(false);

    if (res.success) {
      alert('Pricing structure updated successfully!');
      router.refresh();
    } else {
      alert(res.error || "Failed to update pricing structure");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelectedSlab(currentSlab || '1-15');
          setIsModalOpen(true);
        }}
        disabled={loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '0.85rem',
          fontWeight: 600,
          background: '#fef3c7',
          color: '#b45309',
          border: '1px solid #fde68a',
          cursor: loading ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease'
        }}
        title="Admin only: Edit the discount slab / pricing structure"
      >
        {loading ? (
          "Saving..."
        ) : (
          <>
            <Edit3 size={14} /> Edit Pricing
          </>
        )}
      </button>

      {isModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              width: '100%',
              maxWidth: '480px',
              borderRadius: '14px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              style={{
                backgroundColor: '#b45309',
                color: '#ffffff',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit3 size={16} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>
                    Edit Pricing Structure
                  </h3>
                  <p style={{ margin: '1px 0 0 0', fontSize: '0.72rem', color: '#fef3c7' }}>
                    Admin Override
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', opacity: 0.85, cursor: 'pointer', padding: '4px', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '10px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontSize: '0.8rem' }}>
                <AlertCircle size={16} />
                <span>This changes the incentive label. It does not auto-recalculate numerical quotation discounts.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Select Correct Structure
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {SLAB_OPTIONS.map((option) => {
                    const isSelected = selectedSlab === option.id;
                    return (
                      <div
                        key={option.id}
                        onClick={() => setSelectedSlab(option.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #b45309' : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? '#fffbeb' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input 
                          type="radio"
                          name="discountSlab"
                          value={option.id}
                          checked={isSelected}
                          onChange={() => setSelectedSlab(option.id)}
                          style={{ accentColor: '#b45309', width: '14px', height: '14px', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: isSelected ? 600 : 500, color: isSelected ? '#78350f' : '#1e293b' }}>
                            {option.title}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div 
              style={{
                backgroundColor: '#f8fafc',
                padding: '10px 18px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                disabled={loading}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#b45309',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px rgba(180, 83, 9, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <CheckCircle2 size={14} />
                {loading ? "Saving..." : "Update Structure"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
