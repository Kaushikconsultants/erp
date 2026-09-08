"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  Store, 
  Users, 
  FileSpreadsheet, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  Upload, 
  Mail,
  Zap,
  Globe,
  Loader2
} from 'lucide-react';
import DataImportWizardModal from '@/components/common/DataImportWizardModal';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCompanyName?: string;
}

export default function OnboardingWizardModal({
  isOpen,
  onClose,
  initialCompanyName = "Espon Clothing"
}: OnboardingWizardModalProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<'CUSTOMERS' | 'LEADS'>('CUSTOMERS');

  // Step 1: Company Profile Form
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [tradeName, setTradeName] = useState('Espon Apparel');
  const [gstin, setGstin] = useState('06AAHCE7721Q1Z4');
  const [phone, setPhone] = useState('+91 7206066678');
  const [city, setCity] = useState('Rohtak');
  const [state, setState] = useState('Haryana');

  // Step 2: Branch Setup
  const [branchName, setBranchName] = useState('Rohtak Head Office');
  const [branchCode, setBranchCode] = useState('HO');

  // Step 3: Team Invites
  const [teamEmails, setTeamEmails] = useState('');

  // Step 5: Channels
  const [enableWhatsApp, setEnableWhatsApp] = useState(true);
  const [enableEmail, setEnableEmail] = useState(true);

  if (!isOpen) return null;

  const totalSteps = 6;
  const progressPercent = Math.round((currentStep / totalSteps) * 100);

  const handleFinish = () => {
    try {
      localStorage.setItem('erp_onboarding_completed_v1', 'true');
    } catch {}
    onClose();
  };

  const stepsMetadata = [
    { num: 1, title: "Company Profile", icon: Building2 },
    { num: 2, title: "Branches & Hubs", icon: Store },
    { num: 3, title: "Team Members", icon: Users },
    { num: 4, title: "Data Migration", icon: FileSpreadsheet },
    { num: 5, title: "Channels & Sync", icon: MessageSquare },
    { num: 6, title: "Launch Workspace", icon: Sparkles }
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100060,
      padding: '10px 8px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '780px',
        maxHeight: 'calc(94dvh - 16px)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* HEADER WITH PROGRESS BAR */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid #f1f5f9',
          background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
          color: '#ffffff',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={20} color="#fff" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                  ERP Onboarding & Setup Tour
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                  Step {currentStep} of {totalSteps}: {stepsMetadata[currentStep - 1]?.title}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Progress bar line */}
          <div style={{
            height: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${progressPercent}%`,
              backgroundColor: '#10b981',
              borderRadius: '10px',
              transition: 'width 0.3s ease-in-out'
            }} />
          </div>
        </div>

        {/* STEPPER ICONS BAR */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '10px 14px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          gap: '8px'
        }}>
          {stepsMetadata.map((s) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  opacity: isCurrent ? 1 : isCompleted ? 0.85 : 0.45,
                  padding: '4px 8px',
                  borderRadius: '6px'
                }}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: isCurrent ? '#4f46e5' : isCompleted ? '#10b981' : '#e2e8f0',
                  color: isCurrent || isCompleted ? '#fff' : '#64748b',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isCompleted ? '✓' : s.num}
                </div>
                <span style={{
                  fontSize: '0.76rem',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? '#4f46e5' : '#334155',
                  whiteSpace: 'nowrap'
                }}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* MODAL BODY CONTENT */}
        <div style={{ padding: '16px 18px', flex: 1, overflowY: 'auto' }}>
          
          {/* STEP 1: COMPANY PROFILE */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  Verify Your Business Details
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                  These will be printed on your tax invoices, GST e-way bills, and quotations.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Company Legal Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Trade / Brand Name
                  </label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={e => setTradeName(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    GSTIN Number (15 Digits)
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={e => setGstin(e.target.value.toUpperCase())}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Official Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    State
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={e => setState(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: BRANCHES & HUBS */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  Setup Head Office & Branch Network
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                  Define your primary operating location. You can switch between branches seamlessly in the topbar.
                </p>
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Store size={18} style={{ color: '#4f46e5' }} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>Primary Head Office</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Branch Name
                    </label>
                    <input
                      type="text"
                      value={branchName}
                      onChange={e => setBranchName(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Branch Code
                    </label>
                    <input
                      type="text"
                      value={branchCode}
                      onChange={e => setBranchCode(e.target.value.toUpperCase())}
                      className="form-input"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{
                padding: '12px',
                backgroundColor: '#ecfdf5',
                borderRadius: '8px',
                border: '1px solid #bbf7d0',
                fontSize: '0.8rem',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
                <span>Multi-branch switcher is active in your Topbar. You can add additional warehouse/retail branches anytime from Settings.</span>
              </div>
            </div>
          )}

          {/* STEP 3: TEAM MEMBERS */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  Invite Your Sales & Operations Team
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                  Enter colleague email addresses (separated by commas) to invite them to your ERP workspace.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Team Member Emails
                </label>
                <textarea
                  rows={4}
                  value={teamEmails}
                  onChange={e => setTeamEmails(e.target.value)}
                  placeholder="sales1@example.com, accountant@example.com, dispatch@example.com"
                  className="form-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{
                padding: '12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '0.78rem',
                color: '#64748b',
                lineHeight: 1.5
              }}>
                🛡️ <strong>Role-Based Access Control:</strong> Each invited member can be assigned roles (SALES, ACCOUNTS, DISPATCH, HR, ADMIN) with isolated permissions under your organization.
              </div>
            </div>
          )}

          {/* STEP 4: DATA MIGRATION */}
          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  Migrate Existing Data from Excel or Google Sheets
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                  Quickly import your contacts, leads, and item master without typing them manually.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div style={{
                  padding: '18px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Users size={20} style={{ color: '#4f46e5' }} />
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Customer Master</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                      Import B2B buyers, GST numbers, and opening ledger balances from Excel or Google Sheets.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setImportType('CUSTOMERS');
                      setIsImportModalOpen(true);
                    }}
                    style={{
                      marginTop: '16px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#4f46e5',
                      color: '#fff',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Upload size={14} /> Import Customers
                  </button>
                </div>

                <div style={{
                  padding: '18px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <FileSpreadsheet size={20} style={{ color: '#059669' }} />
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Leads & Pipeline</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                      Import prospect lists, WhatsApp leads, and trade inquiries with automatic duplicate checking.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setImportType('LEADS');
                      setIsImportModalOpen(true);
                    }}
                    style={{
                      marginTop: '16px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#059669',
                      color: '#fff',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Upload size={14} /> Import Leads
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: CHANNELS & SYNC */}
          {currentStep === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  Enable Communication & Messaging Channels
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                  Power up your CRM with automated WhatsApp notifications and integrated email threads.
                </p>
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#dcfce7',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>WhatsApp Cloud API Integration</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>Send quotes, order receipts, and payment reminders via WhatsApp</div>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={enableWhatsApp}
                  onChange={e => setEnableWhatsApp(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: '#16a34a' }}
                />
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Mail size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Gmail & SMTP Email Timeline</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>Sync email conversations and log quotes directly to 360° timeline</div>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={enableEmail}
                  onChange={e => setEnableEmail(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: '#0284c7' }}
                />
              </div>
            </div>
          )}

          {/* STEP 6: READY & CELEBRATION */}
          {currentStep === 6 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 10px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: '#d1fae5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.25)'
              }}>
                <CheckCircle2 size={40} />
              </div>

              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                You're Ready for Business!
              </h3>
              <p style={{ margin: '8px 0 24px 0', fontSize: '0.88rem', color: '#64748b', maxWidth: '480px', lineHeight: 1.5 }}>
                Your company workspace is fully configured with multi-branch switching, real-time duplicate protection, Excel/Sheets import, and communication sync.
              </p>

              <button
                type="button"
                onClick={handleFinish}
                style={{
                  padding: '12px 32px',
                  borderRadius: '10px',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>Enter Workspace Dashboard</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        {currentStep < 6 && (
          <div style={{
            padding: '12px 18px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={16} /> Back
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#64748b',
                  backgroundColor: '#f8fafc',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Skip for now
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Embedded Data Import Modal from within onboarding step 4 */}
      {isImportModalOpen && (
        <DataImportWizardModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          defaultEntityType={importType}
          onSuccess={() => setIsImportModalOpen(false)}
        />
      )}
    </div>
  );
}
