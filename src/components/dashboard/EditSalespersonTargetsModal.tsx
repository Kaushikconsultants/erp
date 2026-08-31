"use client";

import React, { useState } from 'react';
import { Target, X, Check, Save, Zap, AlertCircle, TrendingUp } from 'lucide-react';
import { updateSalespersonTargets } from '@/app/actions/sprintActions';

interface EditSalespersonTargetsModalProps {
  salesperson: {
    employeeId: string;
    name: string;
    email?: string;
    monthlyTarget: number;
    dailyCallsTarget?: number;
    dailyFollowUpsTarget?: number;
    dailyQuotesTarget?: number;
    dailyDealsTarget?: number;
    sprintWeightsJson?: string | null;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditSalespersonTargetsModal({
  salesperson,
  onClose,
  onSuccess
}: EditSalespersonTargetsModalProps) {
  const [monthlyTarget, setMonthlyTarget] = useState(salesperson.monthlyTarget || 500000);
  
  // Custom Sprint weights (default: 20%, 25%, 30%, 25%)
  let initialWeights = [20, 25, 30, 25];
  if (salesperson.sprintWeightsJson) {
    try {
      const parsed = JSON.parse(salesperson.sprintWeightsJson);
      if (Array.isArray(parsed) && parsed.length === 4) {
        initialWeights = parsed.map(w => Math.round(w * 100));
      }
    } catch (e) {
      console.error(e);
    }
  }

  const [sprint1Weight, setSprint1Weight] = useState(initialWeights[0]);
  const [sprint2Weight, setSprint2Weight] = useState(initialWeights[1]);
  const [sprint3Weight, setSprint3Weight] = useState(initialWeights[2]);
  const [sprint4Weight, setSprint4Weight] = useState(initialWeights[3]);

  // Daily Activity Goals
  const [dailyCalls, setDailyCalls] = useState(salesperson.dailyCallsTarget ?? 15);
  const [dailyFollowUps, setDailyFollowUps] = useState(salesperson.dailyFollowUpsTarget ?? 5);
  const [dailyQuotes, setDailyQuotes] = useState(salesperson.dailyQuotesTarget ?? 2);
  const [dailyDeals, setDailyDeals] = useState(salesperson.dailyDealsTarget ?? 1);

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const totalSprintPercent = sprint1Weight + sprint2Weight + sprint3Weight + sprint4Weight;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (monthlyTarget <= 0) {
      setStatusMessage({ type: 'error', text: 'Monthly target must be greater than 0' });
      return;
    }

    if (totalSprintPercent !== 100) {
      setStatusMessage({ type: 'error', text: `Sprint weights must total 100% (currently ${totalSprintPercent}%)` });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const weightsDecimals = [
      sprint1Weight / 100,
      sprint2Weight / 100,
      sprint3Weight / 100,
      sprint4Weight / 100
    ];

    const res = await updateSalespersonTargets({
      employeeId: salesperson.employeeId,
      monthlyTarget,
      dailyCallsTarget: Number(dailyCalls),
      dailyFollowUpsTarget: Number(dailyFollowUps),
      dailyQuotesTarget: Number(dailyQuotes),
      dailyDealsTarget: Number(dailyDeals),
      sprintWeights: weightsDecimals
    });

    setIsSaving(false);
    if (res.success) {
      setStatusMessage({ type: 'success', text: 'Targets updated successfully!' });
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to update targets' });
    }
  };

  const setTargetPreset = (amt: number) => {
    setMonthlyTarget(amt);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#4f46e5' }}>
                <Target size={20} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                Manage Sales Targets
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
              Configure monthly revenue targets and daily activity lead indicators for <strong style={{ color: '#0f172a' }}>{salesperson.name}</strong>.
            </p>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={15} />
          </button>
        </div>

        {statusMessage && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.85rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: statusMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: statusMessage.type === 'success' ? '#16a34a' : '#dc2626',
            border: `1px solid ${statusMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`
          }}>
            {statusMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* 1. Monthly Revenue Target */}
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Monthly Revenue Goal (₹)
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: '#64748b' }}>₹</span>
                <input
                  type="number"
                  min="10000"
                  step="5000"
                  value={monthlyTarget}
                  onChange={(e) => setMonthlyTarget(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 28px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    outline: 'none',
                    backgroundColor: '#ffffff'
                  }}
                  required
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
              {[250000, 500000, 750000, 1000000, 1500000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTargetPreset(amt)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: monthlyTarget === amt ? 700 : 500,
                    backgroundColor: monthlyTarget === amt ? '#4f46e5' : '#ffffff',
                    color: monthlyTarget === amt ? '#ffffff' : '#475569',
                    border: monthlyTarget === amt ? 'none' : '1px solid #cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ₹{(amt / 100000).toFixed(1)}L
                </button>
              ))}
            </div>
          </div>

          {/* 2. 4-Week Sprint Breakdown Weights */}
          <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Weekly Sprint Distribution</span>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Customizable target pacing across the 4 month weeks.</p>
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: totalSprintPercent === 100 ? '#dcfce7' : '#fee2e2',
                color: totalSprintPercent === 100 ? '#15803d' : '#b91c1c'
              }}>
                Total: {totalSprintPercent}%
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Sprint 1 */}
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>Sprint 1 (Days 1-7)</span>
                  <span style={{ fontWeight: 700, color: '#4f46e5' }}>₹{((monthlyTarget * sprint1Weight) / 100).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="number" 
                    min="5" 
                    max="60" 
                    value={sprint1Weight} 
                    onChange={e => setSprint1Weight(Number(e.target.value))} 
                    style={{ width: '60px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600 }}
                  />
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>% weight</span>
                </div>
              </div>

              {/* Sprint 2 */}
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>Sprint 2 (Days 8-14)</span>
                  <span style={{ fontWeight: 700, color: '#4f46e5' }}>₹{((monthlyTarget * sprint2Weight) / 100).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="number" 
                    min="5" 
                    max="60" 
                    value={sprint2Weight} 
                    onChange={e => setSprint2Weight(Number(e.target.value))} 
                    style={{ width: '60px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600 }}
                  />
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>% weight</span>
                </div>
              </div>

              {/* Sprint 3 */}
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>Sprint 3 (Days 15-21)</span>
                  <span style={{ fontWeight: 700, color: '#4f46e5' }}>₹{((monthlyTarget * sprint3Weight) / 100).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="number" 
                    min="5" 
                    max="60" 
                    value={sprint3Weight} 
                    onChange={e => setSprint3Weight(Number(e.target.value))} 
                    style={{ width: '60px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600 }}
                  />
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>% weight</span>
                </div>
              </div>

              {/* Sprint 4 */}
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>Sprint 4 (Days 22-End)</span>
                  <span style={{ fontWeight: 700, color: '#4f46e5' }}>₹{((monthlyTarget * sprint4Weight) / 100).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="number" 
                    min="5" 
                    max="60" 
                    value={sprint4Weight} 
                    onChange={e => setSprint4Weight(Number(e.target.value))} 
                    style={{ width: '60px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600 }}
                  />
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>% weight</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Daily Activity Goals (Lead Indicators) */}
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <Zap size={16} color="#d97706" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Daily Action Goals (Lead Indicators)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                  📞 Calls / Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={dailyCalls}
                  onChange={(e) => setDailyCalls(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    backgroundColor: '#ffffff'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                  🤝 Follow-ups
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={dailyFollowUps}
                  onChange={(e) => setDailyFollowUps(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    backgroundColor: '#ffffff'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                  📄 Quotes Sent
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={dailyQuotes}
                  onChange={(e) => setDailyQuotes(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    backgroundColor: '#ffffff'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                  🎯 Deals Closed
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={dailyDeals}
                  onChange={(e) => setDailyDeals(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    backgroundColor: '#ffffff'
                  }}
                  required
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)',
                opacity: isSaving ? 0.7 : 1
              }}
            >
              <Save size={15} />
              <span>{isSaving ? 'Saving...' : 'Save & Apply Targets'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
