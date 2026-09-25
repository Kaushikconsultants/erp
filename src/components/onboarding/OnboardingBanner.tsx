"use client";

import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, X, ShieldAlert } from 'lucide-react';
import { useSession } from 'next-auth/react';
import OnboardingWizardModal from './OnboardingWizardModal';

interface OnboardingBannerProps {
  showSettings?: boolean;
  userRole?: string;
  isPlatformOwner?: boolean;
}

export default function OnboardingBanner({
  showSettings,
  userRole: propUserRole,
  isPlatformOwner
}: OnboardingBannerProps) {
  const { data: session } = useSession();
  const [showBanner, setShowBanner] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Security Guard: ONLY Super Admin, Admin, or Platform Owner can access ERP setup or edit organization
  const role = propUserRole || (session?.user as any)?.role;
  const isAdmin =
    role === 'SUPER_ADMIN' ||
    role === 'ADMIN' ||
    showSettings === true ||
    isPlatformOwner === true;

  useEffect(() => {
    // If user is not an administrator (e.g. sales rep, telecaller, employee), NEVER show banner
    if (!isAdmin) {
      setShowBanner(false);
      return;
    }

    try {
      const isCompleted =
        localStorage.getItem('erp_onboarding_completed_v1') ||
        localStorage.getItem('erp_setup_tour_completed');
      const isDismissed =
        localStorage.getItem('erp_onboarding_banner_dismissed') ||
        localStorage.getItem('erp_setup_tour_dismissed');
      if (!isCompleted && !isDismissed) {
        setShowBanner(true);
      }
    } catch {}
  }, [isAdmin]);

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem('erp_onboarding_banner_dismissed', 'true');
      localStorage.setItem('erp_setup_tour_dismissed', 'true');
    } catch {}
  };

  // Immediate bail-out for team members / non-admins
  if (!isAdmin) {
    return null;
  }

  if (!showBanner) {
    return isWizardOpen ? (
      <OnboardingWizardModal
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          try {
            localStorage.setItem('erp_onboarding_completed_v1', 'true');
            localStorage.setItem('erp_onboarding_banner_dismissed', 'true');
            localStorage.setItem('erp_setup_tour_completed', 'true');
            localStorage.setItem('erp_setup_tour_dismissed', 'true');
          } catch {}
        }}
      />
    ) : null;
  }

  return (
    <>
      <div
        style={{
          margin: '0 0 16px 0',
          padding: '16px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 45%, #4338ca 100%)',
          color: '#ffffff',
          boxShadow: '0 8px 24px -4px rgba(37, 99, 235, 0.35)',
          position: 'relative',
          overflow: 'hidden',
          animation: 'fadeIn 0.25s ease-in-out'
        }}
      >
        {/* Subtle decorative glow orb */}
        <div
          style={{
            position: 'absolute',
            right: '-24px',
            top: '-24px',
            width: '130px',
            height: '130px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none'
          }}
        />

        {/* Top Header Row: Sparkles Icon + Admin Pill + Close X Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
              }}
            >
              <Sparkles size={17} color="#fff" />
            </div>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                padding: '3px 8px',
                borderRadius: '12px',
                color: '#ffffff'
              }}
            >
              Admin Setup Tour (3 min)
            </span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            title="Dismiss setup banner"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Headline & Description */}
        <div style={{ marginBottom: '14px' }}>
          <h3
            style={{
              margin: '0 0 4px 0',
              fontSize: '1rem',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.2px',
              lineHeight: 1.3
            }}
          >
            Welcome! Setup your ERP in 3 minutes
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '0.78rem',
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: 1.45
            }}
          >
            Configure company branches, import customer/lead spreadsheets, and invite team members.
          </p>
        </div>

        {/* Action Button Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setIsWizardOpen(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              backgroundColor: '#ffffff',
              color: '#1d4ed8',
              fontSize: '0.84rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              minHeight: '40px',
              flex: '1 1 auto',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Start Setup Tour</span>
            <ArrowRight size={15} />
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: 'transparent',
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: '1px solid rgba(255, 255, 255, 0.25)',
              cursor: 'pointer',
              minHeight: '40px',
              flexShrink: 0
            }}
          >
            Later
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
