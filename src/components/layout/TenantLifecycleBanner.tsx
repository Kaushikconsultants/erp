"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, Clock, ShieldAlert, ArrowRight, CreditCard, RefreshCw } from 'lucide-react';

interface TenantLifecycleBannerProps {
  subscriptionPlan: string;
  subscriptionStatus: string;
  isHardLocked: boolean;
  isSoftLocked: boolean;
  trialDaysRemaining: number | null;
  isPlatformOwner: boolean;
}

export default function TenantLifecycleBanner({
  subscriptionPlan,
  subscriptionStatus,
  isHardLocked,
  isSoftLocked,
  trialDaysRemaining,
  isPlatformOwner
}: TenantLifecycleBannerProps) {
  const pathname = usePathname();

  // Platform root super-admin is never blocked
  if (isPlatformOwner) {
    return null;
  }

  // 1. HARD LOCKOUT: Subscription Expired, Suspended, or Trial Ended
  if (isHardLocked) {
    // Allow navigation to billing and platform-admin pages so the tenant can resolve payment
    const isExemptPath = pathname.startsWith('/settings/billing') || pathname.startsWith('/platform-admin');

    if (isExemptPath) {
      return (
        <div style={{
          backgroundColor: '#fff1f2',
          borderBottom: '1px solid #fecdd3',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '0.82rem',
          color: '#9f1239',
          fontWeight: 500
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} style={{ color: '#e11d48', flexShrink: 0 }} />
            <span>
              <strong>Workspace Suspended:</strong> Your subscription has expired. Please renew below to restore full CRM and ERP functionality.
            </span>
          </div>
        </div>
      );
    }

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 999998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          maxWidth: '540px',
          width: '100%',
          padding: '36px 30px',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #fecdd3'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#ffe4e6',
            color: '#e11d48',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto'
          }}>
            <ShieldAlert size={32} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
            Workspace Access Suspended
          </h2>

          <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.55, margin: '0 0 20px 0' }}>
            Your <strong>{subscriptionPlan}</strong> subscription is currently inactive ({subscriptionStatus}). 
            All business data and records are safe and intact, but active operations are locked until renewal.
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <Link
              href="/settings/billing"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '12px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.92rem',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                transition: 'all 0.2s'
              }}
            >
              <CreditCard size={18} />
              <span>Renew & Upgrade Subscription</span>
              <ArrowRight size={16} />
            </Link>

            <a
              href="mailto:support@heartofbusiness.in?subject=Subscription%20Assistance"
              style={{
                fontSize: '0.8rem',
                color: '#64748b',
                textDecoration: 'underline',
                marginTop: '6px'
              }}
            >
              Need assistance? Contact Enterprise Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 2. SOFT LOCK: Payment Past Due
  if (isSoftLocked) {
    return (
      <div style={{
        backgroundColor: '#fffbeb',
        borderBottom: '1px solid #fef3c7',
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        fontSize: '0.82rem',
        color: '#92400e',
        fontWeight: 500,
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
          <span>
            <strong>Payment Past Due:</strong> The auto-renewal for your subscription failed. Please update your payment method to avoid account suspension.
          </span>
        </div>
        <Link
          href="/settings/billing"
          style={{
            padding: '5px 12px',
            borderRadius: '6px',
            backgroundColor: '#d97706',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.76rem',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          Update Billing <ArrowRight size={13} />
        </Link>
      </div>
    );
  }

  // 3. TRIAL STATUS BANNER (When 5 days or fewer left in trial)
  if (subscriptionStatus === 'TRIAL' && trialDaysRemaining !== null && trialDaysRemaining <= 5) {
    return (
      <div style={{
        backgroundColor: '#eff6ff',
        borderBottom: '1px solid #dbeafe',
        padding: '8px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        fontSize: '0.82rem',
        color: '#1e40af',
        fontWeight: 500
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
          <span>
            <strong>Free Trial Ending Soon:</strong> You have <strong>{trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'}</strong> remaining. Upgrade to maintain team access without disruption.
          </span>
        </div>
        <Link
          href="/settings/billing"
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.74rem',
            textDecoration: 'none'
          }}
        >
          Choose Plan
        </Link>
      </div>
    );
  }

  return null;
}
