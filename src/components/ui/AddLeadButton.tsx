"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLead } from '@/actions/leads';

export default function AddLeadButton({ employees, organizationId }: { employees?: {id: string, name: string}[], organizationId?: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApiGuideOpen, setIsApiGuideOpen] = useState(false);
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

  return (
    <>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          className="action-btn hover-lift" 
          onClick={() => setIsApiGuideOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #4f46e5', color: '#4f46e5', background: 'transparent' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> API / Webhook Setup
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
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{maxWidth: '650px'}}>
            <div className="modal-header">
              <h2>WhatsApp Lead Webhook API Setup</h2>
              <button className="modal-close" onClick={() => setIsApiGuideOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>
                Use this API to push new leads from your WhatsApp Chatbot directly into the CRM.
              </p>
              
              <div>
                <label style={{display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px'}}>Endpoint URL (POST)</label>
                <div style={{background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.85rem', color: '#0f172a'}}>
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
