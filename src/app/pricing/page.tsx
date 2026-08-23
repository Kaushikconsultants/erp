"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Building2, 
  Receipt, 
  MessageSquare, 
  Truck, 
  Users, 
  HelpCircle,
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import { PLAN_PRICING } from '@/lib/planConfig';
import { getLivePlanPricing } from '@/app/actions/tenantActions';

export default function PricingPage() {
  const [plans, setPlans] = useState<any>(PLAN_PRICING);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'QUARTERLY' | 'ANNUALLY'>('ANNUALLY');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  React.useEffect(() => {
    getLivePlanPricing().then(res => {
      if (res) setPlans(res);
    });
  }, []);

  const getPrice = (planKey: 'STARTER' | 'GROWTH' | 'ENTERPRISE') => {
    const plan = plans[planKey] || PLAN_PRICING[planKey];
    if (billingCycle === 'MONTHLY') return { amount: plan.monthlyPrice, period: '/ month', note: 'Billed monthly' };
    if (billingCycle === 'QUARTERLY') return { amount: Math.round(plan.quarterlyPrice / 3), period: '/ month', note: `Billed quarterly (₹${plan.quarterlyPrice.toLocaleString('en-IN')}) • 10% Off` };
    return { amount: Math.round(plan.annualPrice / 12), period: '/ month', note: `Billed annually (₹${plan.annualPrice.toLocaleString('en-IN')}) • 20% Off` };
  };

  const faqs = [
    {
      q: "Can I try the software before purchasing?",
      a: "Yes! Every new company registration starts with a full-featured 14-day free trial. No credit card or upfront payment is required."
    },
    {
      q: "Can I switch billing cycles or upgrade later?",
      a: "Absolutely. You can switch between Monthly, Quarterly, and Yearly billing cycles, or upgrade your plan anytime with automatic pro-rata adjustments from your Billing Settings."
    },
    {
      q: "Is GST Filing and E-Way Bill generation included?",
      a: "Yes, Growth and Enterprise plans include direct integration with the GST Portal for GSTR-1, GSTR-3B filing, GSTR-2B ITC reconciliation, and automated E-Way Bill generation."
    },
    {
      q: "Is my business data isolated and secure from other companies?",
      a: "Yes, our multi-tenant cloud architecture ensures strict cryptographic and database isolation (tenantId scoping) across all customers, orders, inventory, invoices, and accounting records."
    }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Top Navbar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
            E
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Espon ERP
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/login" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Sign In
          </Link>
          <Link href="/register" style={{ padding: '8px 18px', borderRadius: '8px', backgroundColor: '#4f46e5', color: '#ffffff', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)' }}>
            Start Free Trial
          </Link>
        </div>
      </nav>

      {/* Hero Header */}
      <section style={{ textAlign: 'center', padding: '50px 20px 30px 20px', maxWidth: '850px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '0.8rem', fontWeight: 600, marginBottom: '16px' }}>
          <Sparkles size={16} /> Commercial B2B ERP & SaaS Cloud
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.2, color: '#0f172a', marginBottom: '16px' }}>
          Simple, Transparent Pricing For Growing Businesses
        </h1>
        <p style={{ fontSize: '1.05rem', color: '#64748b', lineHeight: 1.6, marginBottom: '32px' }}>
          Everything you need to manage sales, purchases, warehouse inventory, GST filing, HRMS, and automated WhatsApp AI in one unified platform.
        </p>

        {/* Billing Cycle Switcher */}
        <div style={{ display: 'inline-flex', padding: '4px', backgroundColor: '#e2e8f0', borderRadius: '12px', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setBillingCycle('MONTHLY')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: billingCycle === 'MONTHLY' ? '#ffffff' : 'transparent',
              color: billingCycle === 'MONTHLY' ? '#0f172a' : '#64748b',
              fontWeight: billingCycle === 'MONTHLY' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: billingCycle === 'MONTHLY' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('QUARTERLY')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: billingCycle === 'QUARTERLY' ? '#ffffff' : 'transparent',
              color: billingCycle === 'QUARTERLY' ? '#0f172a' : '#64748b',
              fontWeight: billingCycle === 'QUARTERLY' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: billingCycle === 'QUARTERLY' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Quarterly <span style={{ color: '#059669', fontSize: '0.72rem', fontWeight: 700 }}>10% OFF</span>
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('ANNUALLY')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: billingCycle === 'ANNUALLY' ? '#ffffff' : 'transparent',
              color: billingCycle === 'ANNUALLY' ? '#0f172a' : '#64748b',
              fontWeight: billingCycle === 'ANNUALLY' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: billingCycle === 'ANNUALLY' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Yearly <span style={{ color: '#2563eb', fontSize: '0.72rem', fontWeight: 700 }}>20% OFF</span>
          </button>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 60px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Plan 1: Starter */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', padding: '32px 24px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Starter</div>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '6px 0 18px 0' }}>Perfect for boutique brands and small trading setups.</p>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>₹{getPrice('STARTER').amount.toLocaleString('en-IN')}</span>
            <span style={{ color: '#64748b', fontSize: '0.875rem' }}>{getPrice('STARTER').period}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, marginTop: '2px', marginBottom: '24px' }}>
            {getPrice('STARTER').note}
          </div>

          <Link href={`/register?plan=STARTER&cycle=${billingCycle}`} style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', marginBottom: '24px' }}>
            Start 14-Day Free Trial
          </Link>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '20px', flex: 1 }}>
            {(plans.STARTER?.features || PLAN_PRICING.STARTER.features).map((feat: string, idx: number) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: '#334155' }}>
                <Check size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan 2: Growth (Highlighted) */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', border: '2px solid #4f46e5', padding: '32px 24px', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 12px 30px rgba(79, 70, 229, 0.12)' }}>
          <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#4f46e5', color: '#ffffff', padding: '3px 14px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Most Popular
          </div>

          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Growth</div>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '6px 0 18px 0' }}>For growing manufacturers, apparel brands & distributors.</p>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>₹{getPrice('GROWTH').amount.toLocaleString('en-IN')}</span>
            <span style={{ color: '#64748b', fontSize: '0.875rem' }}>{getPrice('GROWTH').period}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, marginTop: '2px', marginBottom: '24px' }}>
            {getPrice('GROWTH').note}
          </div>

          <Link href={`/register?plan=GROWTH&cycle=${billingCycle}`} style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '10px', backgroundColor: '#4f46e5', color: '#ffffff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', marginBottom: '24px', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)' }}>
            Start 14-Day Free Trial
          </Link>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '20px', flex: 1 }}>
            {(plans.GROWTH?.features || PLAN_PRICING.GROWTH.features).map((feat: string, idx: number) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: '#334155' }}>
                <Check size={16} style={{ color: '#4f46e5', flexShrink: 0 }} />
                <span><strong>{feat}</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan 3: Enterprise */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', padding: '32px 24px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Enterprise</div>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '6px 0 18px 0' }}>For high-volume multi-branch manufacturing enterprises.</p>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>₹{getPrice('ENTERPRISE').amount.toLocaleString('en-IN')}</span>
            <span style={{ color: '#64748b', fontSize: '0.875rem' }}>{getPrice('ENTERPRISE').period}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, marginTop: '2px', marginBottom: '24px' }}>
            {getPrice('ENTERPRISE').note}
          </div>

          <Link href={`/register?plan=ENTERPRISE&cycle=${billingCycle}`} style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', marginBottom: '24px' }}>
            Start 14-Day Free Trial
          </Link>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '20px', flex: 1 }}>
            {(plans.ENTERPRISE?.features || PLAN_PRICING.ENTERPRISE.features).map((feat: string, idx: number) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: '#334155' }}>
                <Check size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* FAQ Section */}
      <section style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 20px 80px 20px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.75rem', fontWeight: 700, marginBottom: '32px' }}>
          Frequently Asked Questions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0f172a' }}>{faq.q}</span>
                <ChevronDown size={18} style={{ transform: openFaq === idx ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', color: '#64748b' }} />
              </div>
              {openFaq === idx && (
                <p style={{ marginTop: '12px', fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
