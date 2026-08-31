"use client";

import React, { useState, useEffect } from 'react';
import { Sparkles, X, Check, ArrowRight, Zap, Target, AlertTriangle, Lightbulb, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { generateAISalespersonSprintPlan, applyAISprintPlan, AISprintPlanResult } from '@/app/actions/sprintAIActions';

interface AISprintCoachModalProps {
  salesperson: {
    employeeId: string;
    name: string;
    monthlyTarget?: number;
    currentSprintTarget?: number;
    currentSprintRevenue?: number;
    sprintProgressPercent?: number;
    sprintHealthScore?: number;
    healthStatus?: string;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AISprintCoachModal({
  salesperson,
  onClose,
  onSuccess
}: AISprintCoachModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<AISprintPlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Selected tasks for delegation
  const [selectedTaskIndices, setSelectedTaskIndices] = useState<Record<number, boolean>>({});
  const [isApplying, setIsApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchAIPlan = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const res = await generateAISalespersonSprintPlan(salesperson.employeeId);
    setIsLoading(false);

    if (res.success && res.plan) {
      setPlan(res.plan);
      // Select all tasks by default
      const initialSelected: Record<number, boolean> = {};
      res.plan.recommendedTasks.forEach((_, idx) => {
        initialSelected[idx] = true;
      });
      setSelectedTaskIndices(initialSelected);
    } else {
      setError(res.error || "Failed to generate AI plan");
    }
  };

  useEffect(() => {
    fetchAIPlan();
  }, [salesperson.employeeId]);

  const toggleTaskSelection = (idx: number) => {
    setSelectedTaskIndices(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleApplyPlan = async () => {
    if (!plan) return;

    setIsApplying(true);
    setError(null);

    const tasksToCreate = plan.recommendedTasks
      .filter((_, idx) => selectedTaskIndices[idx])
      .map(t => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
        customerId: t.customerId || undefined,
        dueDate: t.suggestedDueDate
      }));

    const res = await applyAISprintPlan({
      employeeId: salesperson.employeeId,
      dailyCallsTarget: plan.recommendedDailyGoals.calls,
      dailyFollowUpsTarget: plan.recommendedDailyGoals.followUps,
      dailyQuotesTarget: plan.recommendedDailyGoals.quotes,
      dailyDealsTarget: plan.recommendedDailyGoals.deals,
      tasksToCreate
    });

    setIsApplying(false);

    if (res.success) {
      setSuccessMessage(res.message || "AI Targets and Tasks applied successfully!");
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } else {
      setError(res.error || "Failed to apply plan");
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
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
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          border: '1px solid #e2e8f0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
                <Sparkles size={20} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                AI Sprint Target Optimizer
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
              Gemini AI strategic closing plan and activity recalibration for <strong style={{ color: '#0f172a' }}>{salesperson.name}</strong>.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={fetchAIPlan}
              disabled={isLoading}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
              title="Regenerate Plan"
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              <span>Regenerate</span>
            </button>
            <button 
              type="button" 
              onClick={onClose}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.85rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {successMessage && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
              <Sparkles size={24} className="animate-spin" />
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                AI is Analyzing Sprint Pipeline...
              </h3>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
                Evaluating quotation conversion probabilities, remaining days, and daily run-rate.
              </p>
            </div>
          </div>
        ) : plan ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* 1. AI Strategic Diagnostic */}
            <div style={{
              backgroundColor: '#f5f3ff',
              border: '1px solid #ddd6fe',
              borderRadius: '12px',
              padding: '14px 16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Sparkles size={16} color="#7c3aed" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  AI Sprint Diagnostic
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#4c1d95', lineHeight: 1.5 }}>
                {plan.diagnostic}
              </p>
            </div>

            {/* 2. Recalibrated Daily Goals */}
            <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={16} color="#d97706" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                    AI-Recommended Daily Action Quotas
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {plan.recommendedDailyGoals.rationale}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                <div style={{ padding: '8px 10px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>📞 Calls / Day</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>{plan.recommendedDailyGoals.calls}</span>
                </div>
                <div style={{ padding: '8px 10px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>🤝 Follow-ups</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>{plan.recommendedDailyGoals.followUps}</span>
                </div>
                <div style={{ padding: '8px 10px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>📄 Quotes</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>{plan.recommendedDailyGoals.quotes}</span>
                </div>
                <div style={{ padding: '8px 10px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>🎯 Deals</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#16a34a' }}>{plan.recommendedDailyGoals.deals}</span>
                </div>
              </div>
            </div>

            {/* 3. Closing Tactics */}
            {plan.closingTactics && plan.closingTactics.length > 0 && (
              <div style={{ backgroundColor: '#fefce8', padding: '12px 16px', borderRadius: '12px', border: '1px solid #fef08a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Lightbulb size={15} color="#ca8a04" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#854d0e', textTransform: 'uppercase' }}>
                    Recommended Closing Tactics
                  </span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8125rem', color: '#713f12', lineHeight: 1.5 }}>
                  {plan.closingTactics.map((tactic, i) => (
                    <li key={i} style={{ marginBottom: '2px' }}>{tactic}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 4. AI Recommended Delegable Tasks */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                  Recommended Action Tasks ({plan.recommendedTasks.length})
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Select tasks to automatically delegate to {salesperson.name}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {plan.recommendedTasks.map((task, idx) => {
                  const isSelected = !!selectedTaskIndices[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleTaskSelection(idx)}
                      style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        backgroundColor: isSelected ? '#f8fafc' : '#ffffff',
                        border: isSelected ? '1px solid #6366f1' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ marginTop: '3px', cursor: 'pointer', accentColor: '#4f46e5' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                            {task.title}
                          </span>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {task.estimatedValue && (
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#16a34a', backgroundColor: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                                ₹{task.estimatedValue.toLocaleString('en-IN')}
                              </span>
                            )}
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: task.priority === 'Urgent' ? '#fee2e2' : task.priority === 'High' ? '#fef3c7' : '#eff6ff',
                              color: task.priority === 'Urgent' ? '#dc2626' : task.priority === 'High' ? '#d97706' : '#2563eb'
                            }}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                          {task.description}
                        </p>
                        {task.customerName && (
                          <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '0.72rem', color: '#4f46e5', fontWeight: 500 }}>
                            👤 Account: {task.customerName}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
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
                Close
              </button>
              <button
                type="button"
                onClick={handleApplyPlan}
                disabled={isApplying}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#7c3aed',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: isApplying ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)',
                  opacity: isApplying ? 0.7 : 1
                }}
              >
                <Sparkles size={15} />
                <span>{isApplying ? 'Applying Plan...' : 'Apply AI Goals & Delegate Tasks'}</span>
              </button>
            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
}
