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
  Search, 
  Sparkles,
  Edit2,
  X,
  Target
} from 'lucide-react';
import SalesTargetTracker from './SalesTargetTracker';

const STAGES = [
  { id: 'New Lead', title: 'New Lead', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', nextStep: 'Contacted', nextActionLabel: 'Mark Contacted' },
  { id: 'Contacted', title: 'Contacted', color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', nextStep: 'Qualified', nextActionLabel: 'Qualify Lead' },
  { id: 'Qualified', title: 'Qualified', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', nextStep: 'Opportunity', nextActionLabel: 'Move to Opportunity' },
  { id: 'Opportunity', title: 'Opportunity', color: '#d97706', bg: '#fffbeb', border: '#fde68a', nextStep: 'Won', nextActionLabel: 'Close & Win Deal' },
  { id: 'Won', title: 'Won', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', nextStep: null, nextActionLabel: 'Deal Won' },
  { id: 'Lost', title: 'Lost', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', nextStep: null, nextActionLabel: 'Lost' },
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

  const [currentView, setCurrentView] = useState<'KANBAN' | 'TARGETS'>('KANBAN');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* ─── 0. TOP VIEW SWITCHER TABS ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px', backgroundColor: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => setCurrentView('KANBAN')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: currentView === 'KANBAN' ? '#ffffff' : 'transparent',
              color: currentView === 'KANBAN' ? '#0f172a' : '#64748b',
              fontWeight: currentView === 'KANBAN' ? 600 : 500,
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: currentView === 'KANBAN' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <Layers size={14} /> Pipeline Kanban
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('TARGETS')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: currentView === 'TARGETS' ? '#ffffff' : 'transparent',
              color: currentView === 'TARGETS' ? '#0f172a' : '#64748b',
              fontWeight: currentView === 'TARGETS' ? 600 : 500,
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: currentView === 'TARGETS' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <Target size={14} color="#4f46e5" /> Rep Targets & Leaderboard
          </button>
        </div>
      </div>

      {currentView === 'TARGETS' ? (
        <SalesTargetTracker />
      ) : (
        <>
          {/* ─── 1. TOP PIPELINE METRICS CARDS (THEME MATCHED) ─── */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '16px' 
          }}>
        {/* Card 1: Total Leads */}
        <div style={{ 
          backgroundColor: '#ffffff', 
          padding: '18px 20px', 
          borderRadius: '12px', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '10px', 
            backgroundColor: '#eff6ff', 
            color: '#3b82f6', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Active Leads
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2, marginTop: '2px' }}>
              {leads.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
              {openLeads.length} in open pipeline
            </div>
          </div>
        </div>

        {/* Card 2: Pipeline Value */}
        <div style={{ 
          backgroundColor: '#ffffff', 
          padding: '18px 20px', 
          borderRadius: '12px', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '10px', 
            backgroundColor: '#eef2ff', 
            color: '#4f46e5', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Open Pipeline Value
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#4f46e5', lineHeight: 1.2, marginTop: '2px' }}>
              {formatCurrency(totalOpenValue)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
              Avg ~{formatCurrency(avgDealSize)} / deal
            </div>
          </div>
        </div>

        {/* Card 3: Win Rate */}
        <div style={{ 
          backgroundColor: '#ffffff', 
          padding: '18px 20px', 
          borderRadius: '12px', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '10px', 
            backgroundColor: '#ecfdf5', 
            color: '#10b981', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Award size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Sales Win Rate
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981', lineHeight: 1.2, marginTop: '2px' }}>
              {winRate}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 500, marginTop: '2px' }}>
              {wonLeads.length} Deals Won ({formatCurrency(wonValue)})
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. STAGE TABS & FILTER TOOLBAR (THEME MATCHED) ─── */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        padding: '14px 18px', 
        borderRadius: '12px', 
        border: '1px solid #e2e8f0', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        
        {/* Horizontal Stage Selector Pills */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          overflowX: 'auto', 
          paddingBottom: '2px',
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
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: isSelected ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#eef2ff' : '#ffffff',
                  color: isSelected ? '#4f46e5' : '#475569',
                  fontSize: '0.82rem',
                  fontWeight: isSelected ? 600 : 500,
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{stage.title}</span>
                
                {/* Count Badge */}
                <span style={{ 
                  backgroundColor: isSelected ? '#4f46e5' : '#f1f5f9', 
                  color: isSelected ? '#ffffff' : '#64748b',
                  padding: '1px 7px', 
                  borderRadius: '10px', 
                  fontSize: '0.72rem',
                  fontWeight: 600
                }}>
                  {count}
                </span>

                {/* Stage Value */}
                {stageVal > 0 && (
                  <span style={{ 
                    fontSize: '0.72rem', 
                    color: isSelected ? '#4f46e5' : '#94a3b8', 
                    fontWeight: 500 
                  }}>
                    • {formatCurrency(stageVal)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search and Rep Filter */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text"
              placeholder="Search company, contact person, mobile, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                fontSize: '0.84rem',
                color: '#1e293b',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>

          {employees.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserCheck size={15} color="#64748b" />
              <select
                value={selectedRepFilter}
                onChange={(e) => setSelectedRepFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  color: '#334155',
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
        borderRadius: '12px', 
        border: '1px solid #e2e8f0', 
        padding: '18px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
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
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                backgroundColor: activeStageConfig.color 
              }}></span>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                {activeStageConfig.title} Stage
              </h3>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
              Total Volume: <strong style={{ color: '#1e293b' }}>{formatCurrency(activeStageTotalValue)}</strong>
            </span>
          </div>

          <div>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 600, 
              color: '#475569', 
              backgroundColor: '#f1f5f9', 
              padding: '4px 12px', 
              borderRadius: '20px',
              border: '1px solid #e2e8f0'
            }}>
              {activeStageLeads.length} Deals
            </span>
          </div>
        </div>

        {/* Lead Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeStageLeads.length > 0 ? (
            activeStageLeads.map(lead => {
              const cleanPhone = (lead.mobile || '').replace(/[^0-9]/g, '');
              const dealVal = lead.computedDealValue || lead.expectedValue || 0;

              return (
                <div 
                  key={lead.id}
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#fafafa'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
                >
                  {/* Card Row 1: Company Name & Deal Value */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Link 
                          href={`/customers/${lead.id}`} 
                          style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem', textDecoration: 'none' }}
                        >
                          {lead.businessName}
                        </Link>
                        {lead.temperature && (
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: lead.temperature === 'HOT' ? '#fee2e2' : lead.temperature === 'WARM' ? '#fef3c7' : '#f1f5f9',
                            color: lead.temperature === 'HOT' ? '#dc2626' : lead.temperature === 'WARM' ? '#d97706' : '#64748b'
                          }}>
                            {lead.temperature}
                          </span>
                        )}
                      </div>

                      <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                            style={{ width: '90px', padding: '3px 6px', borderRadius: '6px', border: '1px solid #3b82f6', fontSize: '0.82rem' }}
                          />
                          <button 
                            onClick={() => handleSaveDealValue(lead.id)}
                            style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: '#059669', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}
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
                          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#059669' }}>
                            ₹{dealVal.toLocaleString('en-IN')}
                          </span>
                          <Edit2 size={11} color="#94a3b8" />
                        </div>
                      )}
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Estimated Deal Value</span>
                    </div>
                  </div>

                  {/* Card Row 2: Sales Rep Assignment & Follow-Up Info */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    gap: '8px', 
                    paddingTop: '6px', 
                    borderTop: '1px solid #f8fafc',
                    fontSize: '0.78rem',
                    color: '#64748b'
                  }}>
                    {/* Rep Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Rep:</span>
                      <select
                        value={lead.assignedSalespersonId || ''}
                        onChange={(e) => handleRepAssign(lead.id, e.target.value)}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: '#334155'
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
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc',
                          color: '#334155'
                        }}
                      >
                        {STAGES.map(s => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Card Row 3: Action Buttons (Theme Harmonized) */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '6px', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    paddingTop: '6px',
                    borderTop: '1px solid #f1f5f9'
                  }}>
                    
                    {/* Primary Next Step Button */}
                    {activeStageConfig.nextStep && (
                      <button
                        type="button"
                        onClick={() => handleOpenAdvanceModal(lead, activeStageConfig.nextStep!)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          backgroundColor: '#4f46e5',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '0.78rem',
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#4338ca'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#4f46e5'; }}
                      >
                        <ArrowRight size={13} />
                        {activeStageConfig.nextActionLabel} ➔
                      </button>
                    )}

                    {/* Quotation Shortcut */}
                    <Link
                      href={`/quotations/new?customerId=${lead.id}`}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        fontSize: '0.78rem',
                        fontWeight: 500,
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
                          padding: '6px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#25D366',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '0.78rem',
                          fontWeight: 500,
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
                          padding: '6px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#ffffff',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.78rem',
                          fontWeight: 500,
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
                        padding: '6px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        fontSize: '0.78rem',
                        fontWeight: 500,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        marginLeft: 'auto'
                      }}
                    >
                      Details <ChevronRight size={13} />
                    </Link>
                  </div>

                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <Layers size={32} style={{ color: '#94a3b8', margin: '0 auto 8px auto' }} />
              <h4 style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: '#1e293b' }}>
                No leads found in {activeStageConfig.title} stage
              </h4>
              <p style={{ margin: '4px 0 14px 0', fontSize: '0.8rem' }}>
                Select another stage tab above or add a new lead.
              </p>
              <Link href="/customers" className="primary-btn" style={{ display: 'inline-block', fontSize: '0.8rem', padding: '6px 14px' }}>
                + Add New Lead
              </Link>
            </div>
          )}
        </div>

      </div>
      </>
      )}

      {/* ─── 4. PROCEED TO NEXT STEP MODAL (THEME MATCHED) ─── */}
      {advancingLead && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }} onClick={() => setAdvancingLead(null)}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{
              backgroundColor: '#1e293b',
              color: '#ffffff',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
                  Advance Lead Pipeline Step
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  {advancingLead.businessName} ({advancingLead.contactPerson})
                </p>
              </div>
              <button onClick={() => setAdvancingLead(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Target Stage
                </label>
                <select
                  value={advanceNextStage}
                  onChange={(e) => setAdvanceNextStage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    color: '#1e293b'
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
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Progress Note / Discussion Summary
                </label>
                <textarea
                  placeholder="e.g., Customer agreed on pricing, requested quotation..."
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    fontFamily: 'inherit',
                    resize: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
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
                    fontSize: '0.82rem'
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setAdvancingLead(null)}
                  style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 500, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={advancingLoading}
                  onClick={handleConfirmAdvance}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: advancingLoading ? 'not-allowed' : 'pointer'
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
