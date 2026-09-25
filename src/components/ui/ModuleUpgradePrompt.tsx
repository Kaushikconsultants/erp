"use client";

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';
import { AppModule, MODULE_REGISTRY } from '@/lib/entitlements';

interface ModuleUpgradePromptProps {
  moduleKey: AppModule;
  currentPlan?: string;
}

export default function ModuleUpgradePrompt({
  moduleKey,
  currentPlan = 'GROWTH'
}: ModuleUpgradePromptProps) {
  const meta = MODULE_REGISTRY[moduleKey];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '65vh',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        padding: '36px 32px',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.06)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '18px',
          backgroundColor: '#eff6ff',
          color: meta.badgeColor || '#2563eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
        }}>
          <Lock size={30} />
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '12px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 700, marginBottom: '12px' }}>
          <span>{meta.minTier} PLAN MODULE</span>
        </div>

        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
          Unlock {meta.name}
        </h2>

        <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6, margin: '0 0 24px 0' }}>
          {meta.description}. This module is currently not enabled on your organization's <strong>{currentPlan}</strong> subscription plan.
        </p>

        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'left',
          marginBottom: '24px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '8px' }}>
            What you get with this module:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#475569' }}>
              <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
              <span>Full multi-user workflow access & team role permissions</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#475569' }}>
              <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
              <span>Instant synchronization with inventory, GST, and accounting ledgers</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#475569' }}>
              <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
              <span>Priority cloud backups & audit trail logging</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)'
            }}
          >
            <Sparkles size={18} />
            <span>Upgrade to {meta.minTier} in Billing</span>
            <ArrowRight size={16} />
          </Link>

          <Link
            href="/"
            style={{
              padding: '8px',
              color: '#64748b',
              fontSize: '0.82rem',
              textDecoration: 'none'
            }}
          >
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
