"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddCustomerModal from './AddCustomerModal';
import LogCallModal from './LogCallModal';

export default function LeadDetailClient({ lead, employees }: { lead: any, employees: any[] }) {
  const router = useRouter();
  const [isConverting, setIsConverting] = useState(false);
  const [isLoggingCall, setIsLoggingCall] = useState(false);

  return (
    <div className="page-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <button onClick={() => router.push('/leads')} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', marginBottom: '8px' }}>
            ← Back to Leads
          </button>
          <h1 className="page-title">{lead.name}</h1>
          <p className="page-subtitle">Lead Profile & Interactions</p>
        </div>
        
        {lead.status !== 'Converted' ? (
          <button 
            className="primary-btn hover-lift"
            onClick={() => setIsConverting(true)}
            style={{ padding: '12px 24px', background: 'var(--success)' }}
          >
            Convert to Customer
          </button>
        ) : (
          <div style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', border: '1px solid var(--success)', color: 'var(--success)' }}>
            ✓ Converted to Customer
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
        {/* Left Column: Details */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>Lead Details</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Name</label>
              <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{lead.name}</div>
            </div>
            
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>WhatsApp Number</label>
              <div style={{ fontSize: '1.1rem' }}>
                <a href={`https://wa.me/${lead.whatsappNumber}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)' }}>
                  {lead.whatsappNumber}
                </a>
              </div>
            </div>
            
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Shop Name</label>
              <div style={{ fontSize: '1.1rem' }}>{lead.shopName || '-'}</div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status</label>
              <div>
                <span className={`status-badge ${lead.status.toLowerCase().replace(' ', '-')}`}>
                  {lead.status}
                </span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Assigned Salesperson</label>
              <div style={{ fontSize: '1.1rem' }}>{lead.assignedSalesperson?.user?.name || 'Unassigned'}</div>
            </div>
          </div>
        </div>

        {/* Right Column: Activity */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Recent Calls</h2>
              <button 
                className="btn-primary" 
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                onClick={() => setIsLoggingCall(true)}
              >
                + Log Call
              </button>
            </div>
            {lead.calls.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No calls recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {lead.calls.slice(0, 5).map((call: any) => (
                  <div key={call.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{call.callType} Call</strong>
                      <span suppressHydrationWarning style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(call.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Outcome: {call.outcome}</div>
                    {call.notes && <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>{call.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>Follow-ups</h2>
            {lead.followUps.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No follow-ups scheduled.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {lead.followUps.slice(0, 5).map((fu: any) => (
                  <div key={fu.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: `3px solid ${fu.status === 'Completed' ? 'var(--success)' : 'var(--accent-primary)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{fu.followUpType}</strong>
                      <span suppressHydrationWarning style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(fu.date).toLocaleDateString()}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>Status: {fu.status}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isConverting && (
        <AddCustomerModal 
          onClose={(newCustomer) => {
            setIsConverting(false);
            if (newCustomer) {
              router.push(`/customers/${newCustomer.id}`);
            }
          }} 
          employees={employees.map(e => ({ id: e.id, name: e.user?.name || 'Unknown' }))}
          leadToConvert={lead}
        />
      )}

      {isLoggingCall && (
        <LogCallModal 
          onClose={() => setIsLoggingCall(false)}
          leadId={lead.id}
          leadName={lead.name}
        />
      )}
    </div>
  );
}
