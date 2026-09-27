"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Briefcase,
  Loader2
} from 'lucide-react';
import { registerNewBusiness } from '@/app/actions/tenantActions';
import BrandLogo from '@/components/ui/BrandLogo';

function RegisterWizardContent() {
  const router = useRouter();

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
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.city || !formData.state) {
      setErrorMessage("Please enter company name, city, and state.");
      return;
    }

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '28px' }}>
            {[
              { num: 1, label: "Admin Profile" },
              { num: 2, label: "Company Details" }
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
                <span style={{ fontSize: '0.85rem', fontWeight: step === s.num ? 700 : 500, color: step >= s.num ? '#0f172a' : '#94a3b8' }}>
                  {s.label}
                </span>
                {s.num < 2 && <div style={{ width: '36px', height: '2px', backgroundColor: step > s.num ? '#4f46e5' : '#e2e8f0' }} />}
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
                  This account will have master administrative privileges to manage all company records, employees, branches, and operations.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Full Name *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      name="adminName"
                      required
                      placeholder="e.g. Rahul Gupta"
                      value={formData.adminName}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Work Email Address *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="email"
                      name="adminEmail"
                      required
                      placeholder="admin@yourcompany.com"
                      value={formData.adminEmail}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Password *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        type="password"
                        name="adminPassword"
                        required
                        placeholder="••••••••"
                        value={formData.adminPassword}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Mobile Phone *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        type="tel"
                        name="adminMobile"
                        required
                        placeholder="+91 98765 43210"
                        value={formData.adminMobile}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>Continue to Company Details</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: COMPANY & BUSINESS PROFILE */}
          {step === 2 && (
            <form onSubmit={handleFinalSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                  Register Company Profile
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                  Enter legal organization info. You can also add sister companies and branches later.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Company Legal Name *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Building2 size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      name="companyName"
                      required
                      placeholder="e.g. R3 EXPORTS"
                      value={formData.companyName}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Trade / Brand Name
                    </label>
                    <input
                      type="text"
                      name="tradeName"
                      placeholder="e.g. R3 Clothing"
                      value={formData.tradeName}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      GSTIN (Optional)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Landmark size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        type="text"
                        name="gstin"
                        placeholder="e.g. 06AAAAA0000A1Z5"
                        value={formData.gstin}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Industry
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Briefcase size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <select
                        name="industry"
                        value={formData.industry}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box', backgroundColor: '#fff' }}
                      >
                        <option value="Apparel & Garments">Apparel & Garments</option>
                        <option value="Textile & Fabric">Textile & Fabric</option>
                        <option value="Manufacturing & Workshop">Manufacturing & Workshop</option>
                        <option value="Wholesale & Distribution">Wholesale & Distribution</option>
                        <option value="Retail & Showroom">Retail & Showroom</option>
                        <option value="Services & Trading">Services & Trading</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Business Type
                    </label>
                    <select
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box', backgroundColor: '#fff' }}
                    >
                      <option value="Private Limited">Private Limited</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Proprietorship">Proprietorship</option>
                      <option value="LLP">LLP</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      required
                      placeholder="Rohtak"
                      value={formData.city}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      State *
                    </label>
                    <input
                      type="text"
                      name="state"
                      required
                      placeholder="Haryana"
                      value={formData.state}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Pincode
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      placeholder="124001"
                      value={formData.pincode}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    padding: '12px 18px',
                    borderRadius: '10px',
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    border: 'none',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Creating Enterprise Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Launch Workspace</span>
                      <Sparkles size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Footer Security Badges */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="#10b981" />
              <span>Full ERP & CRM Suite</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} color="#4f46e5" />
              <span>Permanent Access</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={16} color="#0284c7" />
              <span>Multi-Company Ready</span>
            </div>
          </div>

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
