"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Code, FileSpreadsheet, Plus, AlertCircle, CheckCircle2, Globe, Building2, Anchor, GlassWater } from 'lucide-react';
import { createLead, getWebhookLogs } from '@/actions/leads';
import DataImportWizardModal from '@/components/common/DataImportWizardModal';
import DuplicateWarningBanner, { DuplicateEntityInfo } from '@/components/ui/DuplicateWarningBanner';
import { checkDuplicateEntity } from '@/app/actions/duplicateActions';

const EXPORT_COUNTRIES = [
  "United States", "United Kingdom", "Germany", "United Arab Emirates", 
  "France", "Italy", "Australia", "Canada", "Japan", "Singapore", 
  "Saudi Arabia", "Netherlands", "Spain", "Switzerland", "Qatar", 
  "Kuwait", "Oman", "South Africa", "Brazil", "India", "Other"
];

const CURRENCIES = [
  { code: "USD", symbol: "$", label: "USD ($) - US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR (€) - Euro" },
  { code: "GBP", symbol: "£", label: "GBP (£) - British Pound" },
  { code: "AED", symbol: "AED", label: "AED (د.إ) - UAE Dirham" },
  { code: "CAD", symbol: "$", label: "CAD ($) - Canadian Dollar" },
  { code: "AUD", symbol: "$", label: "AUD ($) - Australian Dollar" },
  { code: "JPY", symbol: "¥", label: "JPY (¥) - Japanese Yen" },
  { code: "INR", symbol: "₹", label: "INR (₹) - Indian Rupee" }
];

const BUYER_TYPES = [
  "Direct Importer",
  "Hotel & Hospitality Chain",
  "Barware & Restaurant Group",
  "Wholesale Distributor",
  "Retail Store / Chain",
  "Brand OEM / Private Label",
  "Corporate Gifting & Events",
  "Other"
];

export default function AddLeadButton({ employees, organizationId, isAdmin }: { employees?: {id: string, name: string}[], organizationId?: string, isAdmin?: boolean }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isApiGuideOpen, setIsApiGuideOpen] = useState(false);
  const [apiActiveTab, setApiActiveTab] = useState<'guide' | 'logs'>('guide');
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const [isInternational, setIsInternational] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    whatsappNumber: '',
    shopName: '',
    email: '',
    country: 'United States',
    currency: 'USD',
    buyerType: 'Direct Importer',
    destinationPort: '',
    targetCapacity: '',
    notes: '',
    assignedSalespersonId: ''
  });

  // Duplicate detection state
  const [duplicateInfo, setDuplicateInfo] = useState<{
    isDuplicate: boolean;
    matchType?: 'PHONE' | 'EMAIL' | 'NAME';
    confidence: number;
    entity: DuplicateEntityInfo;
  } | null>(null);
  const duplicateTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (duplicateTimerRef.current) clearTimeout(duplicateTimerRef.current);

    const cleanPhone = formData.whatsappNumber.replace(/[^0-9]/g, '');
    const hasPhone = cleanPhone.length >= 7;
    const hasName = formData.name.trim().length >= 3;

    if (hasPhone || hasName) {
      duplicateTimerRef.current = setTimeout(async () => {
        const res = await checkDuplicateEntity({
          type: 'lead',
          phone: cleanPhone,
          name: formData.name.trim()
        });
        if (res.success && res.result.isDuplicate && res.result.entity) {
          setDuplicateInfo({
            isDuplicate: true,
            matchType: res.result.matchType,
            confidence: res.result.confidence,
            entity: res.result.entity
          });
        } else {
          setDuplicateInfo(null);
        }
      }, 400);
    } else {
      setDuplicateInfo(null);
    }

    return () => {
      if (duplicateTimerRef.current) clearTimeout(duplicateTimerRef.current);
    };
  }, [formData.whatsappNumber, formData.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);
    
    if (isAdmin && !formData.assignedSalespersonId) {
      setSubmitError("Please select a sales representative to assign this lead.");
      setIsSubmitting(false);
      return;
    }
    
    const res = await createLead({
      name: formData.name.trim(),
      whatsappNumber: formData.whatsappNumber.trim(),
      shopName: formData.shopName.trim() || undefined,
      email: formData.email.trim() || undefined,
      isInternational: isInternational,
      country: isInternational ? formData.country : "India",
      currency: isInternational ? formData.currency : "INR",
      buyerType: isInternational ? formData.buyerType : undefined,
      destinationPort: isInternational ? formData.destinationPort.trim() : undefined,
      targetCapacity: formData.targetCapacity.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      assignedSalespersonId: formData.assignedSalespersonId || undefined
    });
    
    setIsSubmitting(false);
    if (res.success) {
      setIsModalOpen(false);
      setFormData({
        name: '',
        whatsappNumber: '',
        shopName: '',
        email: '',
        country: 'United States',
        currency: 'USD',
        buyerType: 'Direct Importer',
        destinationPort: '',
        targetCapacity: '',
        notes: '',
        assignedSalespersonId: ''
      });
      setDuplicateInfo(null);
      router.refresh();
    } else {
      setSubmitError(res.error || "Failed to create lead.");
    }
  };

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    const fetchedLogs = await getWebhookLogs();
    setLogs(fetchedLogs);
    setIsLoadingLogs(false);
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {isAdmin && (
          <button 
            className="action-btn"
            onClick={() => {
              setIsApiGuideOpen(true);
              setApiActiveTab('guide');
            }}
            style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
            title="API / Webhook Setup"
          >
            <Code size={15} /> <span>Webhooks</span>
          </button>
        )}
        
        {/* Bulk Import Leads */}
        <button 
          className="action-btn hover-lift" 
          onClick={() => setIsImportOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 13px', borderRadius: '10px', border: '1px solid #10b981', color: '#059669', background: '#ecfdf5', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
          title="Bulk Import Leads from Excel, CSV, or Google Sheets"
        >
          <FileSpreadsheet size={15} />
          <span>Import Excel / Sheets</span>
        </button>

        <button 
          onClick={() => {
            setSubmitError(null);
            setDuplicateInfo(null);
            setIsModalOpen(true);
          }}
          className="primary-btn hover-lift"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={16} />
          <span>Add Lead</span>
        </button>
      </div>

      {isModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 100050 }}>
          <div className="modal-content glass-panel animate-in" style={{ maxWidth: '600px', width: '100%', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div className="modal-header" style={{ padding: '16px 22px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '14px 14px 0 0' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                <Plus size={18} color="#2563eb" /> Add New Lead / Buyer Inquiry
              </h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px 24px', maxHeight: '78vh', overflowY: 'auto' }}>
              
              {submitError && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Real-Time Duplicate Detection Banner */}
              {duplicateInfo && duplicateInfo.entity && (
                <DuplicateWarningBanner
                  matchType={duplicateInfo.matchType}
                  confidence={duplicateInfo.confidence}
                  entity={duplicateInfo.entity}
                  onDismiss={() => setDuplicateInfo(null)}
                />
              )}

              {/* Domestic vs International Toggle */}
              <div style={{ backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px' }}>
                <button
                  type="button"
                  onClick={() => setIsInternational(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    borderRadius: '6px',
                    border: !isInternational ? '1px solid #cbd5e1' : 'none',
                    backgroundColor: !isInternational ? '#ffffff' : 'transparent',
                    color: !isInternational ? '#0f172a' : '#64748b',
                    fontWeight: !isInternational ? 700 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  <Building2 size={14} color={!isInternational ? "#2563eb" : "#64748b"} />
                  <span>🇮🇳 Domestic Lead (India)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsInternational(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    borderRadius: '6px',
                    border: isInternational ? '1px solid #93c5fd' : 'none',
                    backgroundColor: isInternational ? '#eff6ff' : 'transparent',
                    color: isInternational ? '#1d4ed8' : '#64748b',
                    fontWeight: isInternational ? 700 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  <Globe size={14} color={isInternational ? "#2563eb" : "#64748b"} />
                  <span>🌐 International Export Buyer</span>
                </button>
              </div>

              {/* International Specific Fields */}
              {isInternational && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Country *</label>
                    <select
                      className="form-input"
                      value={formData.country}
                      onChange={e => setFormData({...formData, country: e.target.value})}
                      style={{ padding: '7px 10px', fontSize: '0.82rem', fontWeight: 600 }}
                    >
                      {EXPORT_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Target Currency</label>
                    <select
                      className="form-input"
                      value={formData.currency}
                      onChange={e => setFormData({...formData, currency: e.target.value})}
                      style={{ padding: '7px 10px', fontSize: '0.82rem', fontWeight: 600 }}
                    >
                      {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Buyer Classification</label>
                    <select
                      className="form-input"
                      value={formData.buyerType}
                      onChange={e => setFormData({...formData, buyerType: e.target.value})}
                      style={{ padding: '7px 10px', fontSize: '0.82rem' }}
                    >
                      {BUYER_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Destination Port</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.destinationPort}
                      onChange={e => setFormData({...formData, destinationPort: e.target.value})}
                      placeholder="e.g. Los Angeles, Hamburg"
                      style={{ padding: '7px 10px', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    Contact Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Michael Scott"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    {isInternational ? 'Company / Importer Name' : 'Shop / Business Name'}
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.shopName}
                    onChange={e => setFormData({...formData, shopName: e.target.value})}
                    placeholder={isInternational ? "e.g. Dunder Mifflin Barware LLC" : "e.g. Royal Glassware Store"}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    Phone / WhatsApp <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    value={formData.whatsappNumber}
                    onChange={e => setFormData({...formData, whatsappNumber: e.target.value})}
                    placeholder={isInternational ? "+1 555-019-2834" : "9876543210"}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Email Address</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="buyer@domain.com"
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                  Target Products / Glassware Requirements
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.targetCapacity}
                  onChange={e => setFormData({...formData, targetCapacity: e.target.value})}
                  placeholder="e.g. 450ml Lead-free Red Wine Glasses, 5000 pcs MOQ, Custom Logo Engraving"
                />
              </div>

              {employees && employees.length > 0 && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Assign To Sales Rep</label>
                  <select 
                    className="form-input"
                    value={formData.assignedSalespersonId}
                    onChange={e => setFormData({...formData, assignedSalespersonId: e.target.value})}
                  >
                    <option value="">-- Unassigned --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Notes / Context</label>
                <textarea 
                  className="form-input" 
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  placeholder="Initial quotation discussion, container requirements, trade show lead notes..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.85rem', opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? 'Creating...' : isInternational ? 'Create Export Lead' : 'Create Lead'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Leads Import Wizard */}
      {isImportOpen && (
        <DataImportWizardModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          entityType="leads"
          onImportComplete={() => {
            setIsImportOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
