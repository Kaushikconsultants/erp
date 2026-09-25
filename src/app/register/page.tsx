"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { 
  Building2, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  Landmark,
  Briefcase
} from 'lucide-react';
import { registerNewBusiness, getLivePlanPricing } from '@/app/actions/tenantActions';
import { PLAN_PRICING } from '@/lib/planConfig';

import BrandLogo from '@/components/ui/BrandLogo';

function RegisterWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [plans, setPlans] = useState<any>(PLAN_PRICING);

  React.useEffect(() => {
    getLivePlanPricing().then(res => {
      if (res) setPlans(res);
    });
  }, []);

  const initialPlan = (searchParams.get('plan') as any) || 'GROWTH';
  const initialCycle = (searchParams.get('cycle') as any) || 'ANNUALLY';

  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminMobile: '',
    companyName: '',
    tradeName: '',
    industry: 'Apparel & Garments',
    businessType: 'Private Limited',
    gstin: '',
    city: 'Rohtak',
    state: 'Haryana',
    pincode: '124001',
    plan: initialPlan as 'STARTER' | 'GROWTH' | 'ENTERPRISE',
    billingCycle: initialCycle as 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (step === 1) {
      if (!formData.adminName || !formData.adminEmail || !formData.adminPassword || !formData.adminMobile) {
        setErrorMessage("Please fill all required account details.");
        return;
      }
      if (formData.adminPassword.length < 6) {
        setErrorMessage("Password must be at least 6 characters long.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.companyName || !formData.city || !formData.state) {
        setErrorMessage("Please enter company name, city, and state.");
        return;
      }
      setStep(3);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await registerNewBusiness(formData);
    
    if (res.success) {
      // Auto sign-in
      const signInRes = await signIn("credentials", {
        redirect: false,
        email: formData.adminEmail,
        password: formData.adminPassword,
      });

      if (signInRes?.error) {
        router.push("/login?registered=true");
      } else {
        router.push("/");
      }
    } else {
      setIsSubmitting(false);
      setErrorMessage(res.error || "Registration failed. Please try again.");
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <header style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1000px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <BrandLogo size="md" showSubtitle={true} />
        </Link>

        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px 16px 40px 16px' }}>
        <div style={{ maxWidth: '620px', width: '100%', backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '36px 32px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
          
          {/* Step Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '28px' }}>
            {[
              { num: 1, label: "Account" },
              { num: 2, label: "Company" },
              { num: 3, label: "Plan & Launch" }
            ].map(s => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: step >= s.num ? '#4f46e5' : '#f1f5f9',
                  color: step >= s.num ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}>
                  {step > s.num ? <Check size={16} /> : s.num}
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: step === s.num ? 700 : 500, color: step >= s.num ? '#0f172a' : '#94a3b8' }}>
                  {s.label}
                </span>
                {s.num < 3 && <div style={{ width: '24px', height: '2px', backgroundColor: step > s.num ? '#4f46e5' : '#e2e8f0' }} />}
              </div>
            ))}
          </div>

          {errorMessage && (
            <div style={{ backgroundColor: '#fff1f2', borderLeft: '4px solid #e11d48', padding: '10px 14px', borderRadius: '8px', color: '#be123c', fontSize: '0.82rem', fontWeight: 500, marginBottom: '20px' }}>
              {errorMessage}
            </div>
          )}

          {/* STEP 1: ADMIN USER ACCOUNT */}
          {step === 1 && (
            <form onSubmit={handleNextStep}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                  Create Administrator Account
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                  You will use these credentials to access and manage your company workspace.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="adminName"
                    value={formData.adminName}
                    onChange={handleChange}
                    placeholder="e.g. Tinkal Admin"
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Work Email Address *
                  </label>
                  <input
                    type="email"
                    name="adminEmail"
                    value={formData.adminEmail}
                    onChange={handleChange}
                    placeholder="admin@yourcompany.com"
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    name="adminMobile"
                    value={formData.adminMobile}
                    onChange={handleChange}
                    placeholder="e.g. 9812345678"
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Password *
                  </label>
                  <input
                    type="password"
                    name="adminPassword"
                    value={formData.adminPassword}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <button
                  type="submit"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#4f46e5', color: '#ffffff', fontWeight: 600, fontSize: '0.9rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  Continue to Business Details <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: BUSINESS PROFILE */}
          {step === 2 && (
            <form onSubmit={handleNextStep}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                  Register Your Company
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                  Enter your business and taxation details to customize invoice templates and GST rates.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Company Legal Name *
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="e.g. Vardhman Textiles Private Limited"
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Industry Sector
                    </label>
                    <select
                      name="industry"
                      value={formData.industry}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#fff', boxSizing: 'border-box' }}
                    >
                      <option value="Apparel & Garments">Apparel & Garments</option>
                      <option value="Textile & Fabric Mills">Textile & Fabric Mills</option>
                      <option value="Wholesale Distribution">Wholesale Distribution</option>
                      <option value="Manufacturing & OEM">Manufacturing & OEM</option>
                      <option value="FMCG & Consumer Goods">FMCG & Consumer Goods</option>
                      <option value="Retail & Showrooms">Retail & Showrooms</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Business Entity Type
                    </label>
                    <select
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#fff', boxSizing: 'border-box' }}
                    >
                      <option value="Private Limited">Private Limited</option>
                      <option value="Partnership / LLP">Partnership / LLP</option>
                      <option value="Proprietorship">Proprietorship</option>
                      <option value="Public Limited">Public Limited</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleChange}
                    placeholder="15-digit GSTIN (e.g. 06AAHCE7721Q1Z4)"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontFamily: 'monospace', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="e.g. Rohtak"
                      required
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      State *
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="e.g. Haryana"
                      required
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  style={{ flex: 2, padding: '12px', borderRadius: '10px', backgroundColor: '#4f46e5', color: '#ffffff', fontWeight: 600, fontSize: '0.875rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  Select Plan & Free Trial <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: PLAN CONFIRMATION & LAUNCH */}
          {step === 3 && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                  Choose Your Subscription
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                  Enjoy 14 days of unrestricted access on us. Cancel or change plans anytime.
                </p>
              </div>

              {/* Cycle Toggle */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '16px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                {(['MONTHLY', 'QUARTERLY', 'ANNUALLY'] as const).map(cycle => (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, billingCycle: cycle }))}
                    style={{
                      flex: 1,
                      padding: '7px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: formData.billingCycle === cycle ? '#ffffff' : 'transparent',
                      color: formData.billingCycle === cycle ? '#0f172a' : '#64748b',
                      fontWeight: formData.billingCycle === cycle ? 700 : 500,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      boxShadow: formData.billingCycle === cycle ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    {cycle === 'MONTHLY' ? 'Monthly' : cycle === 'QUARTERLY' ? 'Quarterly (10% Off)' : 'Yearly (20% Off • 2.5 Mo Free)'}
                  </button>
                ))}
              </div>

              {/* Plan Choice Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {(['STARTER', 'GROWTH', 'ENTERPRISE'] as const).map(planKey => {
                  const plan = plans[planKey] || PLAN_PRICING[planKey];
                  const isSelected = formData.plan === planKey;
                  let price = plan.monthlyPrice;
                  if (formData.billingCycle === 'QUARTERLY') price = planKey === 'STARTER' ? 899 : (planKey === 'GROWTH' ? 2249 : 5399);
                  if (formData.billingCycle === 'ANNUALLY') price = planKey === 'STARTER' ? 799 : (planKey === 'GROWTH' ? 1999 : 4799);

                  const cycleNote = formData.billingCycle === 'ANNUALLY'
                    ? `Save 20% • ₹${plan.annualPrice.toLocaleString('en-IN')}/yr`
                    : formData.billingCycle === 'QUARTERLY'
                    ? `Save 10% • ₹${plan.quarterlyPrice.toLocaleString('en-IN')}/qtr`
                    : '14 Days Free Trial';

                  return (
                    <div
                      key={planKey}
                      onClick={() => setFormData(prev => ({ ...prev, plan: planKey }))}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{plan.name}</strong>
                          {planKey === 'GROWTH' && (
                            <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#4f46e5', color: '#fff', fontWeight: 700 }}>
                              POPULAR
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                          {plan.features.slice(0, 3).join(' • ')}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                          ₹{price.toLocaleString('en-IN')}<span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748b' }}>/mo</span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>{cycleNote}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Free Trial Banner */}
              <div style={{ padding: '12px', backgroundColor: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <ShieldCheck size={20} style={{ color: '#059669', flexShrink: 0 }} />
                <div style={{ fontSize: '0.78rem', color: '#065f46', lineHeight: 1.4 }}>
                  <strong>100% Risk-Free:</strong> Your 14-day free trial will start immediately. You can invite your team, upload catalog items, and test live GST filing with no commitments.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  style={{ flex: 2, padding: '12px', borderRadius: '10px', backgroundColor: '#10b981', color: '#ffffff', fontWeight: 700, fontSize: '0.92rem', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)' }}
                >
                  <Sparkles size={18} />
                  {isSubmitting ? "Provisioning Workspace..." : "Launch Workspace Now"}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading Registration...</div>}>
      <RegisterWizardContent />
    </Suspense>
  );
}
