"use client";

import React, { useState, useMemo } from 'react';
import { updateLeadStage, updateLeadValue, assignLeadRep, advanceLeadStep } from '@/app/actions/leadActions';
import Link from 'next/link';
import { 
  Phone, 
  MessageSquare, 
  ChevronRight, 
  TrendingUp, 
  Award, 
  Layers, 
  ArrowRight, 
  FileText, 
  UserCheck, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter,
  Sparkles,
  Edit2,
  Clock,
  Building2,
  X
} from 'lucide-react';

const STAGES = [
  { id: 'New Lead', title: 'New Lead', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', nextStep: 'Contacted', nextActionLabel: 'Mark Contacted' },
  { id: 'Contacted', title: 'Contacted', color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', nextStep: 'Qualified', nextActionLabel: 'Qualify Lead' },
  { id: 'Qualified', title: 'Qualified', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', nextStep: 'Opportunity', nextActionLabel: 'Move to Opportunity' },
  { id: 'Opportunity', title: 'Opportunity', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', nextStep: 'Won', nextActionLabel: 'Close & Win Deal' },
  { id: 'Won', title: 'Won', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', nextStep: null, nextActionLabel: 'Deal Won' },
  { id: 'Lost', title: 'Lost', color: '#ef4444', bg: '#fef2f2', border: '#fecaca', nextStep: null, nextActionLabel: 'Lost' },
];

interface KanbanBoardProps {
  initialLeads: any[];
  employees?: any[];
}

export default function KanbanBoard({ initialLeads, employees = [] }: KanbanBoardProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [activeStage, setActiveStage] = useState('Contacted');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepFilter, setSelectedRepFilter] = useState('ALL');
  
  // Advance Modal State
  const [advancingLead, setAdvancingLead] = useState<any | null>(null);
  const [advanceNextStage, setAdvanceNextStage] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [advanceFollowUp, setAdvanceFollowUp] = useState('');
  const [advancingLoading, setAdvancingLoading] = useState(false);

  // Edit Value Modal / Inline
  const [editingValueLeadId, setEditingValueLeadId] = useState<string | null>(null);
  const [customValueInput, setCustomValueInput] = useState<string>('');

  // Helper formatting for Currency
  const formatCurrency = (val: number) => {
    if (!val || val === 0) return '₹0';
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)}L`;
    }
    if (val >= 1000) {
      return `₹${(val / 1000).toFixed(1)}k`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  // Pipeline Metrics Calculation
  const openLeads = leads.filter(l => l.leadStage !== 'Lost' && l.leadStage !== 'Won');
  const totalOpenValue = openLeads.reduce((sum, l) => sum + (l.computedDealValue || l.expectedValue || 0), 0);
  const wonLeads = leads.filter(l => l.leadStage === 'Won');
  const wonValue = wonLeads.reduce((sum, l) => sum + (l.computedDealValue || l.expectedValue || 0), 0);
  const lostLeads = leads.filter(l => l.leadStage === 'Lost');
  
  const closedCount = wonLeads.length + lostLeads.length;
  const winRate = closedCount > 0 ? Math.round((wonLeads.length / closedCount) * 100) : (wonLeads.length > 0 ? 100 : 0);
  const avgDealSize = openLeads.length > 0 ? Math.round(totalOpenValue / openLeads.length) : 0;

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchesSearch = 
        (l.businessName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.contactPerson || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.mobile || '').includes(searchQuery) ||
        (l.city || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRep = selectedRepFilter === 'ALL' || l.assignedSalespersonId === selectedRepFilter;

      return matchesSearch && matchesRep;
    });
  }, [leads, searchQuery, selectedRepFilter]);

  const activeStageConfig = STAGES.find(s => s.id === activeStage) || STAGES[1];
  const activeStageLeads = filteredLeads.filter(l => (l.leadStage || 'New Lead') === activeStage);
  const activeStageTotalValue = activeStageLeads.reduce((sum, l) => sum + (l.computedDealValue || l.expectedValue || 0), 0);

  // Handlers
  const handleStageChange = async (leadId: string, targetStage: string) => {
    const previousLeads = [...leads];
    setLeads(leads.map(l => l.id === leadId ? { ...l, leadStage: targetStage } : l));

    const res = await updateLeadStage(leadId, targetStage);
    if (res?.error) {
      alert(res.error);
      setLeads(previousLeads);
    }
  };

  const handleOpenAdvanceModal = (lead: any, defaultNextStage?: string) => {
    const currentConfig = STAGES.find(s => s.id === (lead.leadStage || 'New Lead'));
    setAdvancingLead(lead);
    setAdvanceNextStage(defaultNextStage || currentConfig?.nextStep || 'Qualified');
    setAdvanceNotes('');
    setAdvanceFollowUp('');
  };

  const handleConfirmAdvance = async () => {
    if (!advancingLead || !advanceNextStage) return;
    setAdvancingLoading(true);

    const res = await advanceLeadStep(
      advancingLead.id, 
      advanceNextStage, 
      advanceNotes, 
      advanceFollowUp || undefined
    );

    setAdvancingLoading(false);

    if (res.success) {
      setLeads(leads.map(l => l.id === advancingLead.id ? { ...l, leadStage: advanceNextStage } : l));
      setAdvancingLead(null);
    } else {
      alert(res.error || "Failed to advance lead step");
    }
  };

  const handleSaveDealValue = async (leadId: string) => {
    const val = parseFloat(customValueInput);
    if (isNaN(val) || val < 0) {
      setEditingValueLeadId(null);
      return;
    }

    setLeads(leads.map(l => l.id === leadId ? { ...l, expectedValue: val, computedDealValue: val } : l));
    setEditingValueLeadId(null);
    await updateLeadValue(leadId, val);
  };

  const handleRepAssign = async (leadId: string, empId: string) => {
    const selectedEmp = employees.find(e => e.id === empId);
    setLeads(leads.map(l => l.id === leadId ? {
      ...l,
      assignedSalespersonId: empId || null,
      assignedSalesperson: selectedEmp ? { ...selectedEmp } : null
    } : l));

    await assignLeadRep(leadId, empId || null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* ─── 1. TOP PIPELINE METRICS CARDS ─── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '12px' 
      }}>
        {/* Card 1: Total Leads */}
        <div style={{ 
          backgroundColor: '#ffffff', 
          padding: '16px', 
          borderRadius: '16px', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#3b82f6' }}>
            <Layers size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Active Leads
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {leads.length}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {openLeads.length} in open stages
            </span>
          </div>
        </div>

        {/* Card 2: Pipeline Value */}
        <div style={{ 
          backgroundColor: '#ffffff', 
          padding: '16px', 
          borderRadius: '16px', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#eef2ff', color: '#6366f1' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Open Pipeline Value
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6366f1', lineHeight: 1.2 }}>
              {formatCurrency(totalOpenValue)}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Avg ~{formatCurrency(avgDealSize)} / deal
            </span>
          </div>
        </div>

        {/* Card 3: Win Rate */}
        <div style={{ 
          backgroundColor: '#ffffff', 
          padding: '16px', 
          borderRadius: '16px', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#ecfdf5', color: '#10b981' }}>
            <Award size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Sales Win Rate
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', lineHeight: 1.2 }}>
              {winRate}%
            </div>
            <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
              {wonLeads.length} Deals Won ({formatCurrency(wonValue)})
            </span>
          </div>
        </div>
      </div>

      {/* ─── 2. STAGE TABS & FILTER TOOLBAR ─── */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        padding: '14px 16px', 
        borderRadius: '16px', 
        border: '1px solid #e2e8f0', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px' 
      }}>
        
        {/* Horizontal Stage Selector Pills */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          overflowX: 'auto', 
          paddingBottom: '4px',
          WebkitOverflowScrolling: 'touch'
        }}>
          {STAGES.map(stage => {
            const stageLeads = filteredLeads.filter(l => (l.leadStage || 'New Lead') === stage.id);
            const count = stageLeads.length;
            const stageVal = stageLeads.reduce((sum, l) => sum + (l.computedDealValue || l.expectedValue || 0), 0);
            const isSelected = activeStage === stage.id;

            return (
              <button
                key={stage.id}
                onClick={() => setActiveStage(stage.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '12px',
                  border: isSelected ? `2px solid ${stage.color}` : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? stage.bg : '#ffffff',
                  color: isSelected ? stage.color : '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.04)' : 'none'
                }}
              >
                <span>{stage.title}</span>
                
                {/* Count Badge */}
                <span style={{ 
                  backgroundColor: isSelected ? stage.color : '#f1f5f9', 
                  color: isSelected ? '#ffffff' : '#64748b',
                  padding: '2px 8px', 
                  borderRadius: '20px', 
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}>
                  {count}
                </span>

                {/* Stage Value */}
                {stageVal > 0 && (
                  <span style={{ 
                    fontSize: '0.72rem', 
                    color: isSelected ? stage.color : '#94a3b8', 
                    fontWeight: 700 
                  }}>
                    • {formatCurrency(stageVal)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search and Rep Filter */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text"
              placeholder="Search company, contact person, mobile, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>

          {employees.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserCheck size={16} color="#64748b" />
              <select
                value={selectedRepFilter}
                onChange={(e) => setSelectedRepFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="ALL">All Sales Representatives</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.user?.name || emp.employeeId}</option>
                ))}
              </select>
            </div>
          )}
        </div>

      </div>

      {/* ─── 3. ACTIVE STAGE CARDS & ACTION WORKFLOW ─── */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        borderRadius: '16px', 
        border: '1px solid #e2e8f0', 
        padding: '20px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
      }}>
        
        {/* Stage Header Summary */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '16px', 
          paddingBottom: '12px', 
          borderBottom: '1px solid #f1f5f9' 
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%', 
                backgroundColor: activeStageConfig.color 
              }}></span>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                {activeStageConfig.title} Stage
              </h3>
            </div>
            <span style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
              Total Stage Volume: <strong>{formatCurrency(activeStageTotalValue)}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ 
              fontSize: '0.8rem', 
              fontWeight: 800, 
              color: activeStageConfig.color, 
              backgroundColor: activeStageConfig.bg, 
              padding: '5px 14px', 
              borderRadius: '20px',
              border: `1px solid ${activeStageConfig.border}`
            }}>
              {activeStageLeads.length} Deals
            </span>
          </div>
        </div>

        {/* Lead Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {activeStageLeads.length > 0 ? (
            activeStageLeads.map(lead => {
              const cleanPhone = (lead.mobile || '').replace(/[^0-9]/g, '');
              const dealVal = lead.computedDealValue || lead.expectedValue || 0;
              const hasQuotation = lead.quotations && lead.quotations.length > 0;
              const latestCall = lead.calls?.[0];

              return (
                <div 
                  key={lead.id}
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '16px',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Card Row 1: Company Name & Deal Value */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Link 
                          href={`/customers/${lead.id}`} 
                          style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', textDecoration: 'none' }}
                        >
                          {lead.businessName}
                        </Link>
                        {lead.temperature && (
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: lead.temperature === 'HOT' ? '#fee2e2' : lead.temperature === 'WARM' ? '#fef3c7' : '#f1f5f9',
                            color: lead.temperature === 'HOT' ? '#dc2626' : lead.temperature === 'WARM' ? '#d97706' : '#64748b'
                          }}>
                            {lead.temperature}
                          </span>
                        )}
                      </div>

                      <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>👤 {lead.contactPerson || 'Contact Person'}</span>
                        <span>•</span>
                        <span>📍 {lead.city || 'Rohtak'}, {lead.state || 'Haryana'}</span>
                      </p>
                    </div>

                    {/* Deal Value Section (Editable) */}
                    <div style={{ textAlign: 'right' }}>
                      {editingValueLeadId === lead.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input 
                            type="number" 
                            autoFocus
                            value={customValueInput}
                            onChange={(e) => setCustomValueInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveDealValue(lead.id); }}
                            style={{ width: '90px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #3b82f6', fontSize: '0.85rem' }}
                          />
                          <button 
                            onClick={() => handleSaveDealValue(lead.id)}
                            style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#059669', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => {
                            setEditingValueLeadId(lead.id);
                            setCustomValueInput(String(dealVal));
                          }}
                          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}
                          title="Click to edit expected deal value"
                        >
                          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#059669' }}>
                            ₹{dealVal.toLocaleString('en-IN')}
                          </span>
                          <Edit2 size={12} color="#94a3b8" />
                        </div>
                      )}
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Estimated Deal Value</span>
                    </div>
                  </div>

                  {/* Card Row 2: Sales Rep Assignment & Follow-Up Info */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    gap: '8px', 
                    paddingTop: '8px', 
                    borderTop: '1px solid #f8fafc',
                    fontSize: '0.78rem',
                    color: '#475569'
                  }}>
                    {/* Rep Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Rep:</span>
                      <select
                        value={lead.assignedSalespersonId || ''}
                        onChange={(e) => handleRepAssign(lead.id, e.target.value)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#0f172a'
                        }}
                      >
                        <option value="">Unassigned</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.user?.name || emp.employeeId}</option>
                        ))}
                      </select>
                    </div>

                    {/* Stage Selector Dropdown */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Stage:</span>
                      <select
                        value={lead.leadStage || 'New Lead'}
                        onChange={(e) => handleStageChange(lead.id, e.target.value)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          border: `1px solid ${activeStageConfig.color}`,
                          backgroundColor: activeStageConfig.bg,
                          color: activeStageConfig.color
                        }}
                      >
                        {STAGES.map(s => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Card Row 3: Next Step Action Button Bar */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    paddingTop: '6px',
                    borderTop: '1px solid #f1f5f9'
                  }}>
                    
                    {/* 🚀 PRIMARY NEXT STEP ACTION BUTTON */}
                    {activeStageConfig.nextStep && (
                      <button
                        type="button"
                        onClick={() => handleOpenAdvanceModal(lead, activeStageConfig.nextStep!)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          backgroundColor: '#4f46e5',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)',
                          flex: '1 1 auto'
                        }}
                      >
                        <ArrowRight size={14} />
                        {activeStageConfig.nextActionLabel} ➔
                      </button>
                    )}

                    {/* Quotation Shortcut */}
                    <Link
                      href={`/quotations/new?customerId=${lead.id}`}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <FileText size={13} /> + Quotation
                    </Link>

                    {/* WhatsApp Action */}
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/91${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '7px 12px',
                          borderRadius: '8px',
                          backgroundColor: '#25D366',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <MessageSquare size={13} /> WhatsApp
                      </a>
                    )}

                    {/* Call Action */}
                    {cleanPhone && (
                      <a
                        href={`tel:${cleanPhone}`}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '8px',
                          backgroundColor: '#f8fafc',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Phone size={13} /> Call
                      </a>
                    )}

                    {/* View Details */}
                    <Link
                      href={`/customers/${lead.id}`}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '8px',
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      Details <ChevronRight size={13} />
                    </Link>
                  </div>

                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
              <Layers size={36} style={{ color: '#94a3b8', margin: '0 auto 10px auto' }} />
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>
                No leads found in {activeStageConfig.title} stage
              </h4>
              <p style={{ margin: '4px 0 16px 0', fontSize: '0.82rem' }}>
                Select another stage pill above or register a new lead.
              </p>
              <Link href="/customers" className="primary-btn" style={{ display: 'inline-block', fontSize: '0.82rem', padding: '8px 16px' }}>
                + Add New Lead
              </Link>
            </div>
          )}
        </div>

      </div>

      {/* ─── 4. PROCEED TO NEXT STEP MODAL ─── */}
      {advancingLead && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }} onClick={() => setAdvancingLead(null)}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              color: '#ffffff',
              padding: '18px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Advance Lead Pipeline Step
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>
                  {advancingLead.businessName} ({advancingLead.contactPerson})
                </p>
              </div>
              <button onClick={() => setAdvancingLead(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Target Stage
                </label>
                <select
                  value={advanceNextStage}
                  onChange={(e) => setAdvanceNextStage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#0f172a'
                  }}
                >
                  {STAGES.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} {s.id === 'Won' ? '🏆 (Close Deal)' : s.id === 'Lost' ? '❌ (Archive)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Progress Note / Discussion Summary
                </label>
                <textarea
                  placeholder="e.g., Customer agreed on pricing, requested quotation for 50 pieces..."
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    resize: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Next Follow-up Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={advanceFollowUp}
                  onChange={(e) => setAdvanceFollowUp(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setAdvancingLead(null)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={advancingLoading}
                  onClick={handleConfirmAdvance}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: advancingLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  {advancingLoading ? "Advancing..." : `Confirm Move to ${advanceNextStage} ➔`}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
