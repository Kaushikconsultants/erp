"use client";

import React, { useState } from 'react';
import { Target, X, Check, Save, Zap, AlertCircle } from 'lucide-react';
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
  // Allow empty string so the user can easily backspace and delete "0" without it bouncing back
  const [monthlyTarget, setMonthlyTarget] = useState<number | ''>(
    salesperson.monthlyTarget && salesperson.monthlyTarget > 0 ? salesperson.monthlyTarget : ''
  );
  
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

  const [sprint1Weight, setSprint1Weight] = useState<number | ''>(initialWeights[0] ?? 20);
  const [sprint2Weight, setSprint2Weight] = useState<number | ''>(initialWeights[1] ?? 25);
  const [sprint3Weight, setSprint3Weight] = useState<number | ''>(initialWeights[2] ?? 30);
  const [sprint4Weight, setSprint4Weight] = useState<number | ''>(initialWeights[3] ?? 25);

  // Daily Activity Goals (default: 15, 5, 2, 1)
  const [dailyCalls, setDailyCalls] = useState<number | ''>(
    salesperson.dailyCallsTarget !== undefined && salesperson.dailyCallsTarget !== null
      ? (salesperson.dailyCallsTarget === 0 ? '' : salesperson.dailyCallsTarget)
      : 15
  );
  const [dailyFollowUps, setDailyFollowUps] = useState<number | ''>(
    salesperson.dailyFollowUpsTarget !== undefined && salesperson.dailyFollowUpsTarget !== null
      ? (salesperson.dailyFollowUpsTarget === 0 ? '' : salesperson.dailyFollowUpsTarget)
      : 5
  );
  const [dailyQuotes, setDailyQuotes] = useState<number | ''>(
    salesperson.dailyQuotesTarget !== undefined && salesperson.dailyQuotesTarget !== null
      ? (salesperson.dailyQuotesTarget === 0 ? '' : salesperson.dailyQuotesTarget)
      : 2
  );
  const [dailyDeals, setDailyDeals] = useState<number | ''>(
    salesperson.dailyDealsTarget !== undefined && salesperson.dailyDealsTarget !== null
      ? (salesperson.dailyDealsTarget === 0 ? '' : salesperson.dailyDealsTarget)
      : 1
  );

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const s1Num = Number(sprint1Weight) || 0;
  const s2Num = Number(sprint2Weight) || 0;
  const s3Num = Number(sprint3Weight) || 0;
  const s4Num = Number(sprint4Weight) || 0;
  const targetNum = Number(monthlyTarget) || 0;

  const totalSprintPercent = s1Num + s2Num + s3Num + s4Num;

  // Indian currency formatting helper
  const formatIndianWords = (amt: number) => {
    if (!amt || isNaN(amt)) return '';
    if (amt >= 10000000) {
      return `₹${amt.toLocaleString('en-IN')} (${(amt / 10000000).toFixed(2)} Cr)`;
    }
    if (amt >= 100000) {
      return `₹${amt.toLocaleString('en-IN')} (${(amt / 100000).toFixed(2)} Lakhs)`;
    }
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a monthly revenue goal greater than 0' });
      return;
    }

    if (totalSprintPercent !== 100) {
      setStatusMessage({ type: 'error', text: `Sprint weights must total 100% (currently ${totalSprintPercent}%)` });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const weightsDecimals = [
      s1Num / 100,
      s2Num / 100,
      s3Num / 100,
      s4Num / 100
    ];

    const res = await updateSalespersonTargets({
      employeeId: salesperson.employeeId,
      monthlyTarget: targetNum,
      dailyCallsTarget: Number(dailyCalls) || 0,
      dailyFollowUpsTarget: Number(dailyFollowUps) || 0,
      dailyQuotesTarget: Number(dailyQuotes) || 0,
      dailyDealsTarget: Number(dailyDeals) || 0,
      sprintWeights: weightsDecimals
    });

    setIsSaving(false);
    if (res.success) {
      setStatusMessage({ type: 'success', text: 'Targets updated successfully!' });
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 900);
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
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '12px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '16px 20px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb'
            }}>
              <Target size={16} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                Manage Sales Targets
              </h2>
              <p style={{ margin: '1px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                Pacing and goals for <strong style={{ color: '#0f172a' }}>{salesperson.name}</strong>
              </p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '50%',
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
          >
            <X size={13} />
          </button>
        </div>

        {statusMessage && (
          <div style={{
            padding: '6px 10px',
            borderRadius: '6px',
            marginBottom: '10px',
            fontSize: '0.74rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: statusMessage.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`
          }}>
            {statusMessage.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          
          {/* 1. Monthly Revenue Target */}
          <div style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Monthly Revenue Goal (₹)
              </label>
              {targetNum > 0 && (
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#2563eb' }}>
                  {formatIndianWords(targetNum)}
                </span>
              )}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              overflow: 'hidden',
              height: '32px'
            }}>
              <div style={{
                padding: '0 10px',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                borderRight: '1px solid #e2e8f0',
                color: '#475569',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}>
                ₹
              </div>
              <input
                type="number"
                min="0"
                step="5000"
                value={monthlyTarget}
                placeholder="Enter monthly goal (e.g. 500000)"
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setMonthlyTarget(val === '' ? '' : Math.max(0, Number(val)));
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  padding: '0 10px',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  outline: 'none',
                  backgroundColor: 'transparent'
                }}
                required
              />
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: '5px', marginTop: '6px', flexWrap: 'wrap' }}>
              {[250000, 500000, 750000, 1000000, 1500000, 2000000].map(amt => {
                const isActive = targetNum === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTargetPreset(amt)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '5px',
                      fontSize: '0.7rem',
                      fontWeight: isActive ? 700 : 500,
                      backgroundColor: isActive ? '#2563eb' : '#ffffff',
                      color: isActive ? '#ffffff' : '#475569',
                      border: isActive ? '1px solid #2563eb' : '1px solid #cbd5e1',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    ₹{(amt / 100000).toFixed(1)}L
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. 4-Week Sprint Breakdown Weights */}
          <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
                Weekly Sprint Distribution
              </span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '1px 7px',
                borderRadius: '5px',
                backgroundColor: totalSprintPercent === 100 ? '#ecfdf5' : '#fef2f2',
                color: totalSprintPercent === 100 ? '#065f46' : '#991b1b',
                border: totalSprintPercent === 100 ? '1px solid #a7f3d0' : '1px solid #fecaca'
              }}>
                Total: {totalSprintPercent}%
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {/* Sprint 1 */}
              <div style={{ padding: '6px 10px', borderRadius: '7px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Sprint 1 (Days 1-7)</div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#2563eb' }}>
                    ₹{Math.round((targetNum * s1Num) / 100).toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={sprint1Weight} 
                    placeholder="0"
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const v = e.target.value;
                      setSprint1Weight(v === '' ? '' : Math.max(0, Number(v)));
                    }}
                    style={{
                      width: '46px',
                      height: '26px',
                      padding: '0 4px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>%</span>
                </div>
              </div>

              {/* Sprint 2 */}
              <div style={{ padding: '6px 10px', borderRadius: '7px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Sprint 2 (Days 8-14)</div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#2563eb' }}>
                    ₹{Math.round((targetNum * s2Num) / 100).toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={sprint2Weight} 
                    placeholder="0"
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const v = e.target.value;
                      setSprint2Weight(v === '' ? '' : Math.max(0, Number(v)));
                    }}
                    style={{
                      width: '46px',
                      height: '26px',
                      padding: '0 4px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>%</span>
                </div>
              </div>

              {/* Sprint 3 */}
              <div style={{ padding: '6px 10px', borderRadius: '7px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Sprint 3 (Days 15-21)</div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#2563eb' }}>
                    ₹{Math.round((targetNum * s3Num) / 100).toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={sprint3Weight} 
                    placeholder="0"
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const v = e.target.value;
                      setSprint3Weight(v === '' ? '' : Math.max(0, Number(v)));
                    }}
                    style={{
                      width: '46px',
                      height: '26px',
                      padding: '0 4px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>%</span>
                </div>
              </div>

              {/* Sprint 4 */}
              <div style={{ padding: '6px 10px', borderRadius: '7px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Sprint 4 (Days 22-End)</div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#2563eb' }}>
                    ₹{Math.round((targetNum * s4Num) / 100).toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={sprint4Weight} 
                    placeholder="0"
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const v = e.target.value;
                      setSprint4Weight(v === '' ? '' : Math.max(0, Number(v)));
                    }}
                    style={{
                      width: '46px',
                      height: '26px',
                      padding: '0 4px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Daily Activity Goals (Lead Indicators) */}
          <div style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
              <Zap size={13} color="#d97706" />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>Daily Action Goals (Lead Indicators)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {/* Calls */}
              <div style={{ backgroundColor: '#ffffff', padding: '6px 8px', borderRadius: '7px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '0.64rem', fontWeight: 600, color: '#64748b', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  📞 Calls/Day
                </label>
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={dailyCalls}
                  placeholder="0"
                  onFocus={e => e.target.select()}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDailyCalls(v === '' ? '' : Math.max(0, Number(v)));
                  }}
                  style={{
                    width: '100%',
                    height: '28px',
                    padding: '0 4px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Follow-ups */}
              <div style={{ backgroundColor: '#ffffff', padding: '6px 8px', borderRadius: '7px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '0.64rem', fontWeight: 600, color: '#64748b', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  🤝 Follow-ups
                </label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={dailyFollowUps}
                  placeholder="0"
                  onFocus={e => e.target.select()}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDailyFollowUps(v === '' ? '' : Math.max(0, Number(v)));
                  }}
                  style={{
                    width: '100%',
                    height: '28px',
                    padding: '0 4px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Quotes */}
              <div style={{ backgroundColor: '#ffffff', padding: '6px 8px', borderRadius: '7px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '0.64rem', fontWeight: 600, color: '#64748b', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  📄 Quotes
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={dailyQuotes}
                  placeholder="0"
                  onFocus={e => e.target.select()}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDailyQuotes(v === '' ? '' : Math.max(0, Number(v)));
                  }}
                  style={{
                    width: '100%',
                    height: '28px',
                    padding: '0 4px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Deals Closed */}
              <div style={{ backgroundColor: '#ffffff', padding: '6px 8px', borderRadius: '7px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '0.64rem', fontWeight: 600, color: '#64748b', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  🎯 Deals
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={dailyDeals}
                  placeholder="0"
                  onFocus={e => e.target.select()}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDailyDeals(v === '' ? '' : Math.max(0, Number(v)));
                  }}
                  style={{
                    width: '100%',
                    height: '28px',
                    padding: '0 4px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: '32px',
                padding: '0 14px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                height: '32px',
                padding: '0 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 1px 2px rgba(37, 99, 235, 0.25)',
                opacity: isSaving ? 0.7 : 1,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { if (!isSaving) e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
              onMouseLeave={e => { if (!isSaving) e.currentTarget.style.backgroundColor = '#2563eb'; }}
            >
              <Save size={13} />
              <span>{isSaving ? 'Saving...' : 'Save & Apply Targets'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
