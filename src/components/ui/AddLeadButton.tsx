"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLead, getWebhookLogs } from '@/actions/leads';

export default function AddLeadButton({ employees, organizationId }: { employees?: {id: string, name: string}[], organizationId?: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApiGuideOpen, setIsApiGuideOpen] = useState(false);
  const [apiActiveTab, setApiActiveTab] = useState<'guide' | 'logs'>('guide');
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    whatsappNumber: '',
    shopName: '',
    assignedSalespersonId: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const res = await createLead(formData);
    
    setIsSubmitting(false);
    if (res.success) {
      setIsModalOpen(false);
      setFormData({ name: '', whatsappNumber: '', shopName: '', assignedSalespersonId: '' });
      router.refresh();
    } else {
      alert(res.error || "Failed to create lead");
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
      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          className="action-btn"
          onClick={() => {
            setIsApiGuideOpen(true);
            setApiActiveTab('guide');
          }}
          style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
        >
          <Code size={16} /> API / Webhook Setup
        </button>
        <button 
          className="action-btn hover-lift" 
          onClick={() => {}}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)', color: 'var(--success)', background: 'transparent' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg> Bulk Import
        </button>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="primary-btn hover-lift"
        >
          + Add Lead
        </button>
      </div>

      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{maxWidth: '500px'}}>
            <div className="modal-header">
              <h2>Add New Lead</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              
              <div className="form-group">
                <label>Name *</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Lead Name"
                />
              </div>

              <div className="form-group">
                <label>WhatsApp Number *</label>
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
                <label>Shop Name (Optional)</label>
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
                  <label>Assign To</label>
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

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>
                  {isSubmitting ? 'Creating...' : 'Create Lead'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
      {isApiGuideOpen && (
        <div className="modal-backdrop" onClick={() => setIsApiGuideOpen(false)}>
          <div className="modal-content" style={{maxWidth: '650px', width: '90%', maxHeight: '90vh', overflowY: 'auto'}} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Code size={20} color="var(--accent-primary)"/> WhatsApp API & Webhooks</h3>
              <button className="modal-close" onClick={() => setIsApiGuideOpen(false)}>×</button>
            </div>
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

              <div style={{background: '#fffbeb', border: '1px solid #fde68a', padding: '12px', borderRadius: '8px'}}>
                <h4 style={{fontSize: '0.85rem', fontWeight: 600, color: '#b45309', margin: '0 0 6px 0'}}>⚠️ Auto-Agent Assignment</h4>
                <p style={{fontSize: '0.8rem', color: '#92400e', margin: 0}}>
                  To perfectly assign leads to the correct agent automatically, ensure that the <code>agentEmail</code> you send from WhatsApp exactly matches the agent's email registered here in the CRM/ERP.
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
