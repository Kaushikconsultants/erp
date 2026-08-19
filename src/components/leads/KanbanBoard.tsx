"use client";

import React, { useState } from 'react';
import { updateLeadStage } from '@/app/actions/leadActions';
import Link from 'next/link';
import { Phone, MessageSquare, ChevronRight, Filter, TrendingUp, Award, Layers } from 'lucide-react';

const STAGES = [
  { id: 'New Lead', title: 'New Lead', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'Contacted', title: 'Contacted', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'Qualified', title: 'Qualified', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'Opportunity', title: 'Opportunity', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'Won', title: 'Won', color: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'Lost', title: 'Lost', color: 'bg-red-100 text-red-800 border-red-200' },
];

export default function KanbanBoard({ initialLeads }: { initialLeads: any[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [activeStage, setActiveStage] = useState('New Lead');
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Derive pipeline metrics
  const pipelineValue = leads
    .filter(l => l.leadStage !== 'Lost' && l.leadStage !== 'Won')
    .reduce((sum, l) => sum + (l.expectedValue || 0), 0);
  
  const wonCount = leads.filter(l => l.leadStage === 'Won').length;
  const lostCount = leads.filter(l => l.leadStage === 'Lost').length;
  const closedTotal = wonCount + lostCount;
  const winRate = closedTotal > 0 ? Math.round((wonCount / closedTotal) * 100) : 0;

  const handleStageChange = async (leadId: string, targetStage: string) => {
    const previousLeads = [...leads];
    setLeads(leads.map(l => l.id === leadId ? { ...l, leadStage: targetStage } : l));

    let newStatus = undefined;
    if (targetStage === 'Won') newStatus = 'Active Lead';
    if (targetStage === 'Lost') newStatus = 'Inactive';
    
    const res = await updateLeadStage(leadId, targetStage, newStatus);
    if (res?.error) {
      alert(res.error);
      setLeads(previousLeads);
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggingId(leadId);
    e.dataTransfer.setData('leadId', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;
    handleStageChange(leadId, targetStage);
    setDraggingId(null);
  };

  const activeStageLeads = leads.filter(l => (l.leadStage || 'New Lead') === activeStage);
  const activeStageValue = activeStageLeads.reduce((sum, l) => sum + (l.expectedValue || 0), 0);

  return (
    <div>
      {/* ─── MOBILE PIPELINE METRICS ─── */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
        <div style={{ flex: 1, minWidth: '110px', padding: '10px 12px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Total Leads</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{leads.length}</span>
        </div>
        <div style={{ flex: 1, minWidth: '130px', padding: '10px 12px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Pipeline Value</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>₹{(pipelineValue / 1000).toFixed(1)}k</span>
        </div>
        <div style={{ flex: 1, minWidth: '100px', padding: '10px 12px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Win Rate</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>{winRate}%</span>
        </div>
      </div>

      {/* ─── STAGE SELECTOR TABS (MOBILE & DESKTOP) ─── */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '14px' }}>
        {STAGES.map(stage => {
          const count = leads.filter(l => (l.leadStage || 'New Lead') === stage.id).length;
          const isSelected = activeStage === stage.id;
          return (
            <button
              key={stage.id}
              onClick={() => setActiveStage(stage.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: isSelected ? '1px solid #ef4444' : '1px solid #cbd5e1',
                backgroundColor: isSelected ? '#ef4444' : '#ffffff',
                color: isSelected ? '#ffffff' : '#475569',
                fontSize: '0.78rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{stage.title}</span>
              <span style={{ 
                backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#f1f5f9', 
                color: isSelected ? '#ffffff' : '#64748b',
                padding: '1px 6px', 
                borderRadius: '10px', 
                fontSize: '0.7rem' 
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── ACTIVE STAGE CARDS VIEW (MOBILE TOUCH OPTIMIZED) ─── */}
      <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
              {activeStage} Stage
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Total Value: ₹{activeStageValue.toLocaleString('en-IN')}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', backgroundColor: '#fee2e2', padding: '3px 10px', borderRadius: '12px' }}>
            {activeStageLeads.length} Deals
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activeStageLeads.length > 0 ? (
            activeStageLeads.map(lead => {
              const cleanPhone = (lead.mobile || '').replace(/[^0-9]/g, '');

              return (
                <div 
                  key={lead.id}
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '14px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Link href={`/customers/${lead.id}`} style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', textDecoration: 'none' }}>
                        {lead.businessName}
                      </Link>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                        {lead.contactPerson} • {lead.city || 'Rohtak'}
                      </p>
                    </div>

                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#10b981' }}>
                      ₹{(lead.expectedValue || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#475569', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                    <span>Rep: <strong>{lead.assignedSalesperson?.user?.name || 'Unassigned'}</strong></span>
                    
                    {/* Stage Selector Dropdown */}
                    <select
                      value={lead.leadStage || 'New Lead'}
                      onChange={(e) => handleStageChange(lead.id, e.target.value)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#0f172a'
                      }}
                    >
                      {STAGES.map(s => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* One-tap Quick Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    {cleanPhone && (
                      <>
                        <a 
                          href={`tel:${cleanPhone}`} 
                          className="action-btn outline-success" 
                          style={{ textDecoration: 'none', padding: '5px 10px', fontSize: '0.75rem', flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Phone size={12} /> Call
                        </a>
                        <a 
                          href={`https://wa.me/91${cleanPhone}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="action-btn" 
                          style={{ textDecoration: 'none', padding: '5px 10px', fontSize: '0.75rem', flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#25D366', color: '#fff' }}
                        >
                          <MessageSquare size={12} /> WhatsApp
                        </a>
                      </>
                    )}
                    <Link 
                      href={`/customers/${lead.id}`} 
                      className="action-btn outline-primary" 
                      style={{ textDecoration: 'none', padding: '5px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '2px' }}
                    >
                      Details <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: '#64748b', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <Layers size={28} style={{ color: '#94a3b8', margin: '0 auto 8px auto' }} />
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem' }}>No leads in {activeStage} stage</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem' }}>Use stage tabs above or add a new lead.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
