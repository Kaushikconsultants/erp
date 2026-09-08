"use client";

import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, X, CheckCircle2 } from 'lucide-react';
import OnboardingWizardModal from './OnboardingWizardModal';

export default function OnboardingBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  useEffect(() => {
    try {
      const isCompleted = localStorage.getItem('erp_onboarding_completed_v1');
      const isDismissed = sessionStorage.getItem('erp_onboarding_banner_dismissed');
      if (!isCompleted && !isDismissed) {
        setShowBanner(true);
      }
    } catch {}
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      sessionStorage.setItem('erp_onboarding_banner_dismissed', 'true');
    } catch {}
  };

  if (!showBanner) {
    return isWizardOpen ? (
      <OnboardingWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
    ) : null;
  }

  return (
    <>
      <div style={{
        margin: '0 0 18px 0',
        padding: '12px 16px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
        flexWrap: 'wrap',
        gap: '12px',
        animation: 'fadeIn 0.3s ease-in-out'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>
              Welcome! Setup your ERP in 3 minutes
            </div>
            <div style={{ fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.3 }}>
              Configure company branches, import customer/lead spreadsheets, and invite team members.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsWizardOpen(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              color: '#4f46e5',
              fontSize: '0.82rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              minHeight: '36px'
            }}
          >
            <span>Start Setup Tour</span>
            <ArrowRight size={14} />
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            title="Dismiss banner"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.75)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {isWizardOpen && (
        <OnboardingWizardModal
          isOpen={isWizardOpen}
          onClose={() => {
            setIsWizardOpen(false);
            setShowBanner(false);
          }}
        />
      )}
    </>
  );
}
