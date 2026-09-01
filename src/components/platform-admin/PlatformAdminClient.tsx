"use client";

import DatePicker from '@/components/ui/DatePicker';

import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  CreditCard, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  ArrowUpRight, 
  ExternalLink, 
  Plus, 
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
  Settings,
  Edit,
  Sliders,
  X,
  Check,
  Zap,
  MessageSquare,
  Truck,
  Landmark
} from 'lucide-react';
import Link from 'next/link';
import { updatePlatformPricingSettings, updateTenantSubscriptionAndServices } from '@/app/actions/tenantActions';

interface PlatformAdminClientProps {
  initialData: any;
}

export default function PlatformAdminClient({ initialData }: PlatformAdminClientProps) {
  const [data, setData] = useState(initialData);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'TRIAL' | 'EXPIRED'>('ALL');
  const [planFilter, setPlanFilter] = useState<string>('ALL');

  // Modals State
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isEditTenantModalOpen, setIsEditTenantModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const { metrics = {}, organizations = [], pricingSettings = {} } = data;

  // Form State for Public Pricing
  const [pricingForm, setPricingForm] = useState({
    starterMonthlyPrice: pricingSettings.STARTER?.monthlyPrice || 999,
    starterQuarterlyPrice: pricingSettings.STARTER?.quarterlyPrice || 2699,
    starterAnnualPrice: pricingSettings.STARTER?.annualPrice || 9599,
    starterMaxUsers: pricingSettings.STARTER?.maxUsers || 3,
    starterMaxOrders: pricingSettings.STARTER?.monthlyOrderLimit || 500,
    starterWhatsAppCredits: pricingSettings.STARTER?.whatsAppCredits || 500,

    growthMonthlyPrice: pricingSettings.GROWTH?.monthlyPrice || 2499,
    growthQuarterlyPrice: pricingSettings.GROWTH?.quarterlyPrice || 6749,
    growthAnnualPrice: pricingSettings.GROWTH?.annualPrice || 23999,
    growthMaxUsers: pricingSettings.GROWTH?.maxUsers || 10,
    growthMaxOrders: pricingSettings.GROWTH?.monthlyOrderLimit || 2000,
    growthWhatsAppCredits: pricingSettings.GROWTH?.whatsAppCredits || 2500,

    enterpriseMonthlyPrice: pricingSettings.ENTERPRISE?.monthlyPrice || 5999,
    enterpriseQuarterlyPrice: pricingSettings.ENTERPRISE?.quarterlyPrice || 16199,
    enterpriseAnnualPrice: pricingSettings.ENTERPRISE?.annualPrice || 57599,
    enterpriseMaxUsers: pricingSettings.ENTERPRISE?.maxUsers || 999,
    enterpriseMaxOrders: pricingSettings.ENTERPRISE?.monthlyOrderLimit || 999999,
    enterpriseWhatsAppCredits: pricingSettings.ENTERPRISE?.whatsAppCredits || 10000,
  });

  // Form State for Editing Tenant
  const [tenantForm, setTenantForm] = useState<any>(null);

  const openEditTenantModal = (org: any) => {
    setSelectedTenant(org);
    setTenantForm({
      organizationId: org.id,
      name: org.name || '',
      tradeName: org.tradeName || '',
      subscriptionPlan: org.plan || 'GROWTH',
      billingCycle: org.billingCycle || 'MONTHLY',
      subscriptionStatus: org.status || 'ACTIVE',
      currentPeriodEnd: org.currentPeriodEnd ? new Date(org.currentPeriodEnd).toISOString().split('T')[0] : '',
      maxUsers: org.maxUsers || 10,
      maxBranches: org.maxBranches || 3,
      maxWarehouses: org.maxWarehouses || 2,
      monthlyOrderLimit: org.monthlyOrderLimit || 2000,
      whatsAppCreditBalance: org.whatsAppCreditBalance || 1000,
      isGstEnabled: org.isGstEnabled ?? true,
      isWhatsAppEnabled: org.isWhatsAppEnabled ?? true,
      isEWayBillEnabled: org.isEWayBillEnabled ?? true,
      isHrmsEnabled: org.isHrmsEnabled ?? true,
    });
    setIsEditTenantModalOpen(true);
  };

  // Handle Save Public Pricing
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updatePlatformPricingSettings(pricingForm);
    setIsSaving(false);
    if (res.success) {
      showToast(res.message || "Public pricing updated!");
      setIsPricingModalOpen(false);
      window.location.reload();
    } else {
      alert("Error: " + res.error);
    }
  };

  // Handle Save Tenant Services & Plan
  const handleSaveTenantServices = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateTenantSubscriptionAndServices(tenantForm);
    setIsSaving(false);
    if (res.success) {
      showToast(res.message || "Customer services updated!");
      setIsEditTenantModalOpen(false);
      window.location.reload();
    } else {
      alert("Error: " + res.error);
    }
  };

  const filteredOrgs = organizations.filter((org: any) => {
    const matchesSearch = 
      org.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.city?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || org.status === statusFilter;
    const matchesPlan = planFilter === 'ALL' || org.plan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: 'fixed', top: '16px', right: '16px', backgroundColor: '#0f172a', color: '#fff', padding: '12px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 999999, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', borderLeft: '4px solid #10b981' }}>
          <CheckCircle2 size={18} style={{ color: '#10b981' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MODAL 1: EDIT PUBLIC PRICING & TIERS */}
      {isPricingModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', maxWidth: '850px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex' }}>
                  <Sliders size={20} />
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                    Configure Public Pricing & Tier Quotas
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Changes reflect immediately on the live /pricing page and /register onboarding wizard.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPricingModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSavePricing} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Starter Plan Column */}
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>1. Starter Plan</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Monthly Price (₹)</label>
                    <input
                      type="number"
                      value={pricingForm.starterMonthlyPrice}
                      onChange={e => setPricingForm({ ...pricingForm, starterMonthlyPrice: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Quarterly Price (₹)</label>
                    <input
                      type="number"
                      value={pricingForm.starterQuarterlyPrice}
                      onChange={e => setPricingForm({ ...pricingForm, starterQuarterlyPrice: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Annual Price (₹)</label>
                    <input
                      type="number"
                      value={pricingForm.starterAnnualPrice}
                      onChange={e => setPricingForm({ ...pricingForm, starterAnnualPrice: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Max User Seats</label>
                    <input
                      type="number"
                      value={pricingForm.starterMaxUsers}
                      onChange={e => setPricingForm({ ...pricingForm, starterMaxUsers: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Monthly Orders Limit</label>
                    <input
                      type="number"
                      value={pricingForm.starterMaxOrders}
                      onChange={e => setPricingForm({ ...pricingForm, starterMaxOrders: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>WhatsApp Credits</label>
                    <input
                      type="number"
                      value={pricingForm.starterWhatsAppCredits}
                      onChange={e => setPricingForm({ ...pricingForm, starterWhatsAppCredits: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* Growth Plan Column */}
              <div style={{ padding: '16px', backgroundColor: '#f5f3ff', borderRadius: '12px', border: '1px solid #ddd6fe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '0.95rem', color: '#4f46e5' }}>2. Growth Plan (Most Popular)</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Monthly Price (₹)</label>
                    <input
                      type="number"
                      value={pricingForm.growthMonthlyPrice}
                      onChange={e => setPricingForm({ ...pricingForm, growthMonthlyPrice: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Quarterly Price (₹)</label>
                    <input
                      type="number"
                      value={pricingForm.growthQuarterlyPrice}
                      onChange={e => setPricingForm({ ...pricingForm, growthQuarterlyPrice: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Annual Price (₹)</label>
                    <input
                      type="number"
                      value={pricingForm.growthAnnualPrice}
                      onChange={e => setPricingForm({ ...pricingForm, growthAnnualPrice: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Max User Seats</label>
                    <input
                      type="number"
                      value={pricingForm.growthMaxUsers}
                      onChange={e => setPricingForm({ ...pricingForm, growthMaxUsers: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Monthly Orders Limit</label>
                    <input
                      type="number"
                      value={pricingForm.growthMaxOrders}
                      onChange={e => setPricingForm({ ...pricingForm, growthMaxOrders: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>WhatsApp Credits</label>
                    <input
                      type="number"
                      value={pricingForm.growthWhatsAppCredits}
                      onChange={e => setPricingForm({ ...pricingForm, growthWhatsAppCredits: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* Enterprise Plan Column */}
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>3. Enterprise Plan</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Monthly Price (₹)</label>
                    <input
                      type="number"
                      value={pricingForm.enterpriseMonthlyPrice}
                      onChange={e => setPricingForm({ ...pricingForm, enterpriseMonthlyPrice: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Quarterly Price (₹)</label>
                    <input
                      type="number"
                      value={pricingForm.enterpriseQuarterlyPrice}
                      onChange={e => setPricingForm({ ...pricingForm, enterpriseQuarterlyPrice: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Annual Price (₹)</label>
                    <input
                      type="number"
                      value={pricingForm.enterpriseAnnualPrice}
                      onChange={e => setPricingForm({ ...pricingForm, enterpriseAnnualPrice: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Max User Seats</label>
                    <input
                      type="number"
                      value={pricingForm.enterpriseMaxUsers}
                      onChange={e => setPricingForm({ ...pricingForm, enterpriseMaxUsers: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Monthly Orders Limit</label>
                    <input
                      type="number"
                      value={pricingForm.enterpriseMaxOrders}
                      onChange={e => setPricingForm({ ...pricingForm, enterpriseMaxOrders: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>WhatsApp Credits</label>
                    <input
                      type="number"
                      value={pricingForm.enterpriseWhatsAppCredits}
                      onChange={e => setPricingForm({ ...pricingForm, enterpriseWhatsAppCredits: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsPricingModalOpen(false)}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: isSaving ? 'not-allowed' : 'pointer' }}
                >
                  {isSaving ? "Saving Pricing..." : "Save Public Pricing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT CUSTOMER SERVICES, QUOTAS & MODULES */}
      {isEditTenantModalOpen && tenantForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                  Edit Services for {tenantForm.name}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Override subscription tier, quotas, expiry date, or toggle specific enterprise modules.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditTenantModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveTenantServices} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Company Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Company Legal Name</label>
                  <input
                    type="text"
                    value={tenantForm.name}
                    onChange={e => setTenantForm({ ...tenantForm, name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Trade / Brand Name</label>
                  <input
                    type="text"
                    value={tenantForm.tradeName}
                    onChange={e => setTenantForm({ ...tenantForm, tradeName: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Plan & Cycle & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Subscription Plan</label>
                  <select
                    value={tenantForm.subscriptionPlan}
                    onChange={e => setTenantForm({ ...tenantForm, subscriptionPlan: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="STARTER">STARTER</option>
                    <option value="GROWTH">GROWTH</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                    <option value="CUSTOM">CUSTOM</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Billing Cycle</label>
                  <select
                    value={tenantForm.billingCycle}
                    onChange={e => setTenantForm({ ...tenantForm, billingCycle: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="QUARTERLY">QUARTERLY</option>
                    <option value="ANNUALLY">ANNUALLY</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Status</label>
                  <select
                    value={tenantForm.subscriptionStatus}
                    onChange={e => setTenantForm({ ...tenantForm, subscriptionStatus: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="TRIAL">TRIAL</option>
                    <option value="PAST_DUE">PAST DUE</option>
                    <option value="EXPIRED">EXPIRED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Subscription Expiry Date
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <DatePicker
                    
                    value={tenantForm.currentPeriodEnd}
                    onChange={e => setTenantForm({ ...tenantForm, currentPeriodEnd: e.target.value })}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 30);
                      setTenantForm({ ...tenantForm, currentPeriodEnd: d.toISOString().split('T')[0] });
                    }}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    +30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setFullYear(d.getFullYear() + 1);
                      setTenantForm({ ...tenantForm, currentPeriodEnd: d.toISOString().split('T')[0] });
                    }}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    +1 Year
                  </button>
                </div>
              </div>

              {/* Resource Quotas Overrides */}
              <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>Resource Quota Limits Override</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>User Seats Limit</label>
                    <input
                      type="number"
                      value={tenantForm.maxUsers}
                      onChange={e => setTenantForm({ ...tenantForm, maxUsers: Number(e.target.value) })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Monthly Orders Limit</label>
                    <input
                      type="number"
                      value={tenantForm.monthlyOrderLimit}
                      onChange={e => setTenantForm({ ...tenantForm, monthlyOrderLimit: Number(e.target.value) })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>WhatsApp Balance</label>
                    <input
                      type="number"
                      value={tenantForm.whatsAppCreditBalance}
                      onChange={e => setTenantForm({ ...tenantForm, whatsAppCreditBalance: Number(e.target.value) })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* Feature Modules Toggles */}
              <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>Enabled Modules & Features</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={tenantForm.isGstEnabled}
                      onChange={e => setTenantForm({ ...tenantForm, isGstEnabled: e.target.checked })}
                    />
                    <span>🏛️ GST Portal Direct Filing</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={tenantForm.isWhatsAppEnabled}
                      onChange={e => setTenantForm({ ...tenantForm, isWhatsAppEnabled: e.target.checked })}
                    />
                    <span>💬 WhatsApp AI & Automation</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={tenantForm.isEWayBillEnabled}
                      onChange={e => setTenantForm({ ...tenantForm, isEWayBillEnabled: e.target.checked })}
                    />
                    <span>🚚 E-Way Bill Auto-Generation</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={tenantForm.isHrmsEnabled}
                      onChange={e => setTenantForm({ ...tenantForm, isHrmsEnabled: e.target.checked })}
                    />
                    <span>👥 HRMS & Payroll Suite</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditTenantModalOpen(false)}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: isSaving ? 'not-allowed' : 'pointer' }}
                >
                  {isSaving ? "Saving Changes..." : "Save Customer Services"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex' }}>
              <TrendingUp size={20} />
            </span>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
              Platform Super Admin & SaaS Metrics
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Live revenue analytics, tenant directories, public pricing controls, and customer service overrides.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setIsPricingModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '0.84rem', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)' }}
          >
            <Sliders size={15} /> Edit Public Pricing
          </button>

          <Link
            href="/pricing"
            target="_blank"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#334155', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' }}
          >
            <ExternalLink size={14} /> View Public Pricing Page
          </Link>
        </div>
      </div>

      {/* Platform Executive Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
        
        {/* MRR */}
        <div style={{ padding: '18px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Monthly Recurring Revenue (MRR)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            ₹{metrics.totalMRR?.toLocaleString('en-IN') || "0"}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
            Active Subscription Run Rate
          </div>
        </div>

        {/* ARR */}
        <div style={{ padding: '18px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Annual Run Rate (ARR)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4f46e5', marginTop: '6px' }}>
            ₹{metrics.totalARR?.toLocaleString('en-IN') || "0"}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            Annualized Recurring Volume
          </div>
        </div>

        {/* Active Tenants */}
        <div style={{ padding: '18px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Active Paid Tenants
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '6px' }}>
            {metrics.activeTenants || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            Paid Paying Businesses
          </div>
        </div>

        {/* Free Trials */}
        <div style={{ padding: '18px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            14-Day Free Trials
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb', marginTop: '6px' }}>
            {metrics.trialTenants || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            Trial Onboardings in Pipeline
          </div>
        </div>

      </div>

      {/* Tenants Table Section */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
        
        {/* Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search company, slug, email, city..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', backgroundColor: '#fff' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Paid</option>
              <option value="TRIAL">14-Day Trial</option>
              <option value="EXPIRED">Expired</option>
            </select>

            <select
              value={planFilter}
              onChange={e => setPlanFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', backgroundColor: '#fff' }}
            >
              <option value="ALL">All Plans</option>
              <option value="STARTER">Starter</option>
              <option value="GROWTH">Growth</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>

        </div>

        {/* Directory Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '10px 12px' }}>Company Legal Name</th>
                <th style={{ padding: '10px 12px' }}>Plan & Cycle</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Quotas & Users</th>
                <th style={{ padding: '10px 12px' }}>Active Modules</th>
                <th style={{ padding: '10px 12px' }}>Location</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrgs.map((org: any) => (
                <tr key={org.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{org.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                      {org.email} • slug: {org.slug}
                    </div>
                  </td>

                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 600, color: '#4f46e5' }}>{org.plan}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{org.billingCycle}</div>
                  </td>

                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '8px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      backgroundColor: org.status === 'ACTIVE' ? '#ecfdf5' : org.status === 'TRIAL' ? '#eff6ff' : '#fff1f2',
                      color: org.status === 'ACTIVE' ? '#059669' : org.status === 'TRIAL' ? '#2563eb' : '#e11d48'
                    }}>
                      {org.status === 'TRIAL' ? '14-DAY TRIAL' : org.status}
                    </span>
                  </td>

                  <td style={{ padding: '12px', color: '#334155' }}>
                    <div><strong>{org.userCount} / {org.maxUsers}</strong> users</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{org.monthlyOrderLimit} orders • {org.whatsAppCreditBalance} wa</div>
                  </td>

                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {org.isGstEnabled && <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 600 }}>GST</span>}
                      {org.isWhatsAppEnabled && <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#ecfdf5', color: '#059669', fontWeight: 600 }}>WA</span>}
                      {org.isEWayBillEnabled && <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#d97706', fontWeight: 600 }}>EWB</span>}
                      {org.isHrmsEnabled && <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#f5f3ff', color: '#7c3aed', fontWeight: 600 }}>HRMS</span>}
                    </div>
                  </td>

                  <td style={{ padding: '12px', color: '#475569' }}>
                    {org.city}, {org.state}
                  </td>

                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => openEditTenantModal(org)}
                        style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #4f46e5', backgroundColor: '#f5f3ff', color: '#4f46e5', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit size={12} /> Edit Services
                      </button>
                      <button
                        type="button"
                        onClick={() => alert(`Support impersonation mode for ${org.name} enabled.`)}
                        style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.74rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
                      >
                        Inspect
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrgs.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    No organizations matching your search criteria.
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
