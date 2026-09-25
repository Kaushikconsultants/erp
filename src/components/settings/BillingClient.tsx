"use client";

import React, { useState } from 'react';
import { 
  CreditCard, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  ArrowUpRight, 
  Calendar, 
  Users, 
  UserPlus,
  ShoppingCart, 
  MessageSquare, 
  Download, 
  X, 
  Clock, 
  Building2,
  Zap,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { changeSubscriptionPlan } from '@/app/actions/tenantActions';
import { PLAN_PRICING, getAddonSeatPrice } from '@/lib/planConfig';
import BuySeatsModal from './BuySeatsModal';

interface BillingClientProps {
  initialData: any;
}

export default function BillingClient({ initialData }: BillingClientProps) {
  const [data, setData] = useState(initialData);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isBuySeatsModalOpen, setIsBuySeatsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'STARTER' | 'GROWTH' | 'ENTERPRISE'>((data.org?.subscriptionPlan as any) || 'GROWTH');
  const [selectedCycle, setSelectedCycle] = useState<'MONTHLY' | 'QUARTERLY' | 'ANNUALLY'>((data.org?.billingCycle as any) || 'ANNUALLY');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const { org, usage, subscriptions = [], invoices = [] } = data;

  const handleUpgradeSubmit = async () => {
    setIsUpgrading(true);
    const res = await changeSubscriptionPlan(selectedPlan, selectedCycle);
    setIsUpgrading(false);
    if (res.success) {
      showToast(res.message || "Subscription updated successfully!");
      setIsUpgradeModalOpen(false);
      window.location.reload();
    } else {
      alert("Error: " + res.error);
    }
  };

  const getPrice = (planKey: 'STARTER' | 'GROWTH' | 'ENTERPRISE') => {
    const plan = PLAN_PRICING[planKey];
    if (selectedCycle === 'MONTHLY') return { amount: plan.monthlyPrice, period: '/ month', note: 'Billed monthly • Cancel anytime' };
    if (selectedCycle === 'QUARTERLY') {
      const perMonth = planKey === 'STARTER' ? 899 : planKey === 'GROWTH' ? 2249 : 5399;
      const regularQuarterly = plan.monthlyPrice * 3;
      const savings = Math.max(0, regularQuarterly - plan.quarterlyPrice);
      return { amount: perMonth, period: '/ month', note: `Billed quarterly (₹${plan.quarterlyPrice.toLocaleString('en-IN')}) • Save ₹${savings.toLocaleString('en-IN')} (10% Off)` };
    }
    const perMonth = planKey === 'STARTER' ? 799 : planKey === 'GROWTH' ? 1999 : 4799;
    const regularAnnual = plan.monthlyPrice * 12;
    const savings = Math.max(0, regularAnnual - plan.annualPrice);
    return { amount: perMonth, period: '/ month', note: `Billed annually (₹${plan.annualPrice.toLocaleString('en-IN')}) • Save ₹${savings.toLocaleString('en-IN')} (20% Off)` };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1100px', width: '100%' }}>
      
      {/* Toast */}
      {toastMessage && (
        <div style={{ position: 'fixed', top: '16px', right: '16px', backgroundColor: '#0f172a', color: '#fff', padding: '12px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 999999, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', borderLeft: '4px solid #10b981' }}>
          <CheckCircle2 size={18} style={{ color: '#10b981' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Upgrade / Change Plan Modal */}
      {isUpgradeModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', maxWidth: '850px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#0f172a' }}>
                  Upgrade or Change Subscription Plan
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Select the best plan tailored for your business volume and growth.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Cycle Toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '20px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px', maxWidth: '450px', margin: '0 auto 24px auto' }}>
              {(['MONTHLY', 'QUARTERLY', 'ANNUALLY'] as const).map(cycle => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setSelectedCycle(cycle)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: selectedCycle === cycle ? '#ffffff' : 'transparent',
                    color: selectedCycle === cycle ? '#0f172a' : '#64748b',
                    fontWeight: selectedCycle === cycle ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    boxShadow: selectedCycle === cycle ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  {cycle === 'MONTHLY' ? 'Monthly' : cycle === 'QUARTERLY' ? 'Quarterly (10% Off)' : 'Yearly (20% Off • 2.5 Mo Free)'}
                </button>
              ))}
            </div>

            {/* Plan Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {(['STARTER', 'GROWTH', 'ENTERPRISE'] as const).map(planKey => {
                const plan = PLAN_PRICING[planKey];
                const isSelected = selectedPlan === planKey;
                const priceInfo = getPrice(planKey);

                return (
                  <div
                    key={planKey}
                    onClick={() => setSelectedPlan(planKey)}
                    style={{
                      border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#f5f3ff' : '#ffffff',
                      borderRadius: '14px',
                      padding: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    {planKey === 'GROWTH' && (
                      <span style={{ position: 'absolute', top: '-10px', right: '14px', backgroundColor: '#4f46e5', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '8px' }}>
                        RECOMMENDED
                      </span>
                    )}

                    <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{plan.name}</strong>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '10px 0 2px 0' }}>
                      ₹{priceInfo.amount.toLocaleString('en-IN')}<span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>{priceInfo.period}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600, marginBottom: '14px' }}>
                      {priceInfo.note}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', fontSize: '0.76rem', color: '#475569' }}>
                      {plan.features.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Check size={14} style={{ color: '#4f46e5', flexShrink: 0 }} />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpgradeSubmit}
                disabled={isUpgrading}
                style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: isUpgrading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Sparkles size={16} />
                {isUpgrading ? "Processing Upgrade..." : `Confirm & Upgrade to ${PLAN_PRICING[selectedPlan].name}`}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Buy Seats Modal */}
      <BuySeatsModal
        isOpen={isBuySeatsModalOpen}
        onClose={() => setIsBuySeatsModalOpen(false)}
        onSuccess={(newMaxUsers, invoiceNumber) => {
          showToast(`Capacity increased to ${newMaxUsers} users! (Invoice: ${invoiceNumber})`);
          setTimeout(() => {
            window.location.reload();
          }, 800);
        }}
        orgPlan={org.subscriptionPlan}
        billingCycle={org.billingCycle}
        currentMaxUsers={org.maxUsers}
        currentUserCount={usage.userCount}
        onOpenUpgradePlan={() => setIsUpgradeModalOpen(true)}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
            Subscription & Cloud Billing
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Manage your company license, user seats quota, and download official GST tax invoices.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setIsBuySeatsModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', backgroundColor: '#eef2ff', color: '#4338ca', fontWeight: 700, fontSize: '0.85rem', border: '1px solid #c7d2fe', cursor: 'pointer', transition: 'all 0.15s ease' }}
          >
            <UserPlus size={16} /> Add User Seats
          </button>

          <button
            type="button"
            onClick={() => setIsUpgradeModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', backgroundColor: '#4f46e5', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)' }}
          >
            <Sparkles size={16} /> Upgrade Plan
          </button>
        </div>
      </div>

      {/* Active Subscription Summary Card */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        
        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Company Workspace</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
            {org.name}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
            slug: {org.slug}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Current Plan</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4f46e5' }}>
              {org.subscriptionPlan} Plan
            </span>
            <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: org.subscriptionStatus === 'ACTIVE' ? '#ecfdf5' : '#eff6ff', color: org.subscriptionStatus === 'ACTIVE' ? '#059669' : '#2563eb' }}>
              {org.subscriptionStatus === 'TRIAL' ? '14-DAY TRIAL' : 'ACTIVE'}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Billed {org.billingCycle?.toLowerCase()}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Renewal / Expiry Date</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
            {new Date(org.currentPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <span style={{ fontSize: '0.75rem', color: org.daysRemaining <= 5 ? '#e11d48' : '#059669', fontWeight: 600 }}>
            {org.daysRemaining} days remaining
          </span>
        </div>

      </div>

      {/* Quota & Usage Progress Meters */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
          Resource Quotas & Real-Time Usage
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          
          {/* Users */}
          <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} style={{ color: '#4f46e5' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>User Seats</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {usage.userCount >= org.maxUsers && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#e11d48', backgroundColor: '#ffe4e6', padding: '1px 6px', borderRadius: '6px' }}>
                      Limit Reached
                    </span>
                  )}
                  <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{usage.userCount} / {org.maxUsers}</strong>
                </div>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (usage.userCount / org.maxUsers) * 100)}%`, height: '100%', backgroundColor: usage.userCount >= org.maxUsers ? '#e11d48' : '#4f46e5' }} />
              </div>
            </div>

            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                ₹{getAddonSeatPrice(org.subscriptionPlan, org.billingCycle).unitPrice.toLocaleString('en-IN')}{getAddonSeatPrice(org.subscriptionPlan, org.billingCycle).period}
              </span>
              <button
                type="button"
                onClick={() => setIsBuySeatsModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #c7d2fe',
                  backgroundColor: '#ffffff',
                  color: '#4338ca',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <UserPlus size={12} /> + Add Seats
              </button>
            </div>
          </div>

          {/* Orders */}
          <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShoppingCart size={16} style={{ color: '#059669' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Monthly Orders</span>
              </div>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{usage.orderCount} / {org.monthlyOrderLimit}</strong>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (usage.orderCount / org.monthlyOrderLimit) * 100)}%`, height: '100%', backgroundColor: '#059669' }} />
            </div>
          </div>

          {/* WhatsApp Credits */}
          <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={16} style={{ color: '#2563eb' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>WhatsApp Credits</span>
              </div>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{org.whatsAppCreditBalance} msgs</strong>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: '80%', height: '100%', backgroundColor: '#2563eb' }} />
            </div>
          </div>

        </div>
      </div>

      {/* Invoice History */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
          Billing & Tax Invoice History
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '10px 12px' }}>Invoice Number</th>
                <th style={{ padding: '10px 12px' }}>Date</th>
                <th style={{ padding: '10px 12px' }}>Amount (excl. tax)</th>
                <th style={{ padding: '10px 12px' }}>GST (18%)</th>
                <th style={{ padding: '10px 12px' }}>Total Amount</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tax Invoice</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#4f46e5', fontFamily: 'monospace' }}>{inv.invoiceNumber}</td>
                  <td style={{ padding: '12px', color: '#334155' }}>{new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                  <td style={{ padding: '12px', color: '#0f172a' }}>₹{inv.amount.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px', color: '#64748b' }}>₹{(inv.cgst + inv.sgst + inv.igst).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#059669' }}>₹{inv.total.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => alert(`Official GST Tax Invoice ${inv.invoiceNumber} generated!`)}
                      style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.75rem', fontWeight: 600, color: '#334155', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Download size={13} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    No paid tax invoices yet. You are currently on a 14-day free trial.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
