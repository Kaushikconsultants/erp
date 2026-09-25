"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Code, FileSpreadsheet, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createLead, getWebhookLogs } from '@/actions/leads';
import DataImportWizardModal from '@/components/common/DataImportWizardModal';
import DuplicateWarningBanner, { DuplicateEntityInfo } from '@/components/ui/DuplicateWarningBanner';
import { checkDuplicateEntity } from '@/app/actions/duplicateActions';

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

  const [formData, setFormData] = useState({
    name: '',
    whatsappNumber: '',
    shopName: '',
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
    const hasPhone = cleanPhone.length >= 10;
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
    
    const res = await createLead(formData);
    
    setIsSubmitting(false);
    if (res.success) {
      setIsModalOpen(false);
      setFormData({ name: '', whatsappNumber: '', shopName: '', assignedSalespersonId: '' });
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
        <div className="modal-backdrop">
          <div className="modal-content glass-panel" style={{maxWidth: '520px', width: '100%'}}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                Add New Lead
              </h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              
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

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Name *</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Lead Contact Name"
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>WhatsApp Number *</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={formData.whatsappNumber}
                  onChange={e => setFormData({...formData, whatsappNumber: e.target.value})}
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Shop Name (Optional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.shopName}
                  onChange={e => setFormData({...formData, shopName: e.target.value})}
                  placeholder="e.g. Acme Stores"
                />
              </div>

              {employees && employees.length > 0 && (
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Assign To</label>
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

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
                  style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.85rem', opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? 'Creating...' : 'Create Lead'}
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
          defaultEntityType="LEADS"
          onSuccess={() => {
            setIsImportOpen(false);
            router.refresh();
          }}
        />
      )}

      {/* Webhooks Guide Modal */}
      {isApiGuideOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{maxWidth: '650px', width: '90%', maxHeight: '90vh', overflowY: 'auto'}}>
            <div className="modal-header">
              <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Code size={20} color="var(--accent-primary)"/> WhatsApp API & Webhooks</h3>
              <button className="modal-close" onClick={() => setIsApiGuideOpen(false)}>×</button>
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <button 
                onClick={() => setApiActiveTab('guide')}
                style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderBottom: apiActiveTab === 'guide' ? '2px solid var(--accent-primary)' : '2px solid transparent', color: apiActiveTab === 'guide' ? 'var(--accent-primary)' : '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}
              >
                Setup Guide
              </button>
              <button 
                onClick={() => {
                  setApiActiveTab('logs');
                  loadLogs();
                }}
                style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderBottom: apiActiveTab === 'logs' ? '2px solid var(--accent-primary)' : '2px solid transparent', color: apiActiveTab === 'logs' ? 'var(--accent-primary)' : '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}
              >
                Webhook Logs
              </button>
            </div>

            <div className="modal-body" style={{display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: 0}}>
              {apiActiveTab === 'guide' ? (
                <>
                  <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0}}>
                    Use this API to push new leads from your WhatsApp Chatbot directly into the CRM.
                  </p>
                  
                  <div>
                    <label style={{display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px'}}>Endpoint URL (POST)</label>
                    <div suppressHydrationWarning style={{background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.85rem', color: '#0f172a'}}>
                      {typeof window !== 'undefined' ? window.location.origin : 'https://your-crm-url.com'}/api/webhooks/whatsapp/leads
                    </div>
                  </div>

                  <div>
                    <label style={{display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px'}}>Headers</label>
                    <div style={{background: '#1e293b', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.85rem', color: '#f8fafc', whiteSpace: 'pre-wrap'}}>
{`Authorization: Bearer ${organizationId || 'YOUR_ORG_ID'}
Content-Type: application/json`}
                    </div>
                  </div>

                  <div>
                    <label style={{display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px'}}>JSON Payload</label>
                    <div style={{background: '#1e293b', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.85rem', color: '#f8fafc', whiteSpace: 'pre-wrap'}}>
{`{
  "name": "Customer Name",
  "whatsappNumber": "+91 9999999999",
  "shopName": "Optional Shop Name",
  "agentEmail": "agent@yourcompany.com"
}`}
                    </div>
                  </div>

                  <div style={{background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px', borderRadius: '8px'}}>
                    <h4 style={{fontSize: '0.85rem', fontWeight: 600, color: '#1e40af', margin: '0 0 6px 0'}}>Note on Duplicates</h4>
                    <p style={{fontSize: '0.8rem', color: '#1e3a8a', margin: 0}}>
                      If the mobile number already exists in the system as a Customer or Lead, the API will return a <code>409 Conflict</code> error, and you can redirect the user to a live agent in your chatbot.
                    </p>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', margin: 0}}>Recent Webhook Events</h4>
                    <button onClick={loadLogs} style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                      Refresh
                    </button>
                  </div>
                  {isLoadingLogs ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading logs...</div>
                  ) : logs.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>No webhook logs found.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                      {logs.map((log: any) => (
                        <div key={log.id} style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(log.createdAt).toLocaleString()}</span>
                            <span style={{ 
                              fontSize: '0.75rem', 
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: log.responseStatus >= 200 && log.responseStatus < 300 ? '#dcfce7' : log.responseStatus === 409 ? '#fef3c7' : '#fee2e2',
                              color: log.responseStatus >= 200 && log.responseStatus < 300 ? '#166534' : log.responseStatus === 409 ? '#92400e' : '#991b1b'
                            }}>
                              {log.responseStatus}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#334155', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            <strong>Payload:</strong><br/>
                            {log.payload || 'No payload'}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#334155', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: '8px' }}>
                            <strong>Response:</strong><br/>
                            {log.responseBody || 'No response body'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="action-btn" onClick={() => setIsApiGuideOpen(false)}>Close Guide</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
