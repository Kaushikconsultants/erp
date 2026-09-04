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
  Search, 
  Edit2, 
  X, 
  Target, 
  LayoutGrid, 
  UserPlus, 
  DollarSign,
  ArrowUpDown,
  Building2,
  Sparkles,
  Inbox,
  CheckCircle2,
  PhoneCall,
  Clock,
  Briefcase
} from 'lucide-react';
import SalesTargetTracker from './SalesTargetTracker';
import AddCustomerModal from '@/components/ui/AddCustomerModal';
import './KanbanBoard.css';

export const STAGES = [
  { 
    id: 'New Lead', 
    title: 'New Lead', 
    color: '#3b82f6', 
    bg: '#eff6ff', 
    border: '#bfdbfe', 
    badgeBg: '#dbeafe',
    nextStep: 'Contacted', 
    nextActionLabel: 'Mark Contacted' 
  },
  { 
    id: 'Contacted', 
    title: 'Contacted', 
    color: '#6366f1', 
    bg: '#eef2ff', 
    border: '#c7d2fe', 
    badgeBg: '#e0e7ff',
    nextStep: 'Qualified', 
    nextActionLabel: 'Qualify Lead' 
  },
  { 
    id: 'Qualified', 
    title: 'Qualified', 
    color: '#8b5cf6', 
    bg: '#f5f3ff', 
    border: '#ddd6fe', 
    badgeBg: '#ede9fe',
    nextStep: 'Opportunity', 
    nextActionLabel: 'Move to Opportunity' 
  },
  { 
    id: 'Opportunity', 
    title: 'Opportunity', 
    color: '#d97706', 
    bg: '#fffbeb', 
    border: '#fde68a', 
    badgeBg: '#fef3c7',
    nextStep: 'Won', 
    nextActionLabel: 'Close & Win Deal' 
  },
  { 
    id: 'Won', 
    title: 'Won', 
    color: '#059669', 
    bg: '#ecfdf5', 
    border: '#a7f3d0', 
    badgeBg: '#d1fae5',
    nextStep: null, 
    nextActionLabel: 'Deal Won' 
  },
  { 
    id: 'Lost', 
    title: 'Lost', 
    color: '#dc2626', 
    bg: '#fef2f2', 
    border: '#fecaca', 
    badgeBg: '#fee2e2',
    nextStep: null, 
    nextActionLabel: 'Lost' 
  },
];

interface KanbanBoardProps {
  initialLeads: any[];
  employees?: any[];
}

export default function KanbanBoard({ initialLeads, employees = [] }: KanbanBoardProps) {
  const [leads, setLeads] = useState(initialLeads || []);
  const [activeStage, setActiveStage] = useState('Contacted');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepFilter, setSelectedRepFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'VALUE_HIGH' | 'VALUE_LOW' | 'NAME' | 'NEWEST'>('VALUE_HIGH');
  const [currentView, setCurrentView] = useState<'BOARD' | 'FOCUS' | 'TARGETS'>('BOARD');
  
  // Advance Modal State
  const [advancingLead, setAdvancingLead] = useState<any | null>(null);
  const [advanceNextStage, setAdvanceNextStage] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [advanceFollowUp, setAdvanceFollowUp] = useState('');
  const [advancingLoading, setAdvancingLoading] = useState(false);

  // Convert Modal State
  const [convertingLead, setConvertingLead] = useState<any | null>(null);

  // Edit Value State
  const [editingValueLeadId, setEditingValueLeadId] = useState<string | null>(null);
  const [customValueInput, setCustomValueInput] = useState<string>('');

  React.useEffect(() => {
    setLeads(initialLeads || []);
  }, [initialLeads]);

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
  const totalLeadsCount = leads.length;
  const openLeads = leads.filter(l => l.leadStage !== 'Lost' && l.leadStage !== 'Won');
  const totalOpenValue = openLeads.reduce((sum, l) => sum + (l.computedDealValue || l.expectedValue || 0), 0);
  const wonLeads = leads.filter(l => l.leadStage === 'Won');
  const wonValue = wonLeads.reduce((sum, l) => sum + (l.computedDealValue || l.expectedValue || 0), 0);
  
  const winRate = totalLeadsCount > 0 ? Math.round((wonLeads.length / totalLeadsCount) * 100) : 0;
  const avgDealSize = openLeads.length > 0 ? Math.round(totalOpenValue / (openLeads.length || 1)) : 0;

  // Filtered & Sorted Leads
  const filteredLeads = useMemo(() => {
    let result = leads.filter(l => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        (l.businessName || '').toLowerCase().includes(q) ||
        (l.contactPerson || '').toLowerCase().includes(q) ||
        (l.mobile || l.whatsappNumber || '').includes(searchQuery) ||
        (l.city || '').toLowerCase().includes(q);
      
      const matchesRep = selectedRepFilter === 'ALL' || l.assignedSalespersonId === selectedRepFilter;

      return matchesSearch && matchesRep;
    });

    // Sorting
    result.sort((a, b) => {
      const valA = a.computedDealValue || a.expectedValue || 0;
      const valB = b.computedDealValue || b.expectedValue || 0;

      if (sortBy === 'VALUE_HIGH') return valB - valA;
      if (sortBy === 'VALUE_LOW') return valA - valB;
      if (sortBy === 'NAME') return (a.businessName || a.contactPerson || '').localeCompare(b.businessName || b.contactPerson || '');
      if (sortBy === 'NEWEST') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      return 0;
    });

    return result;
  }, [leads, searchQuery, selectedRepFilter, sortBy]);

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

  // Helper to extract Rep Initials
  const getRepInitials = (repName?: string) => {
    if (!repName) return 'UN';
    const parts = repName.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return repName.slice(0, 2).toUpperCase();
  };

  // Render a Single Modern Deal Card
  const renderLeadCard = (lead: any, isCompact: boolean = false) => {
    const cleanPhone = (lead.mobile || lead.whatsappNumber || '').replace(/[^0-9]/g, '');
    const dealVal = lead.computedDealValue || lead.expectedValue || 0;
    const isCustomer = !lead.isLeadRecord;
    const detailsUrl = isCustomer ? `/customers/${lead.id}` : `/leads/${lead.id}`;
    const assignedRep = employees.find(e => e.id === lead.assignedSalespersonId);
    const repName = assignedRep?.user?.name || assignedRep?.employeeId || (lead.assignedSalesperson?.user?.name) || '';

    return (
      <div 
        key={lead.id}
        className="deal-card"
      >
        {/* Top: Name, Badge & Value */}
        <div className="deal-card-header">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <Link 
                href={detailsUrl} 
                className="deal-title-link"
                title={lead.businessName || lead.contactPerson}
              >
                {lead.businessName || lead.contactPerson || 'Unnamed Deal'}
              </Link>
              {lead.isLeadRecord ? (
                <span className="deal-lead-tag">LEAD</span>
              ) : (
                <span className="deal-customer-tag">CLIENT</span>
              )}
            </div>

            <div className="deal-meta-text" style={{ marginTop: '3px' }}>
              {lead.city && <span>📍 {lead.city}</span>}
              {lead.contactPerson && lead.contactPerson !== lead.businessName && <span>👤 {lead.contactPerson}</span>}
            </div>
          </div>

          {/* Deal Value Pill */}
          <div style={{ flexShrink: 0 }}>
            {editingValueLeadId === lead.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <input 
                  type="number" 
                  autoFocus
                  value={customValueInput}
                  onChange={(e) => setCustomValueInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveDealValue(lead.id); }}
                  style={{ width: '70px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #3b82f6', fontSize: '0.74rem', outline: 'none' }}
                />
                <button 
                  onClick={() => handleSaveDealValue(lead.id)}
                  style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#059669', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}
                >
                  ✓
                </button>
              </div>
            ) : (
              <div 
                className="deal-value-pill"
                onClick={() => {
                  setEditingValueLeadId(lead.id);
                  setCustomValueInput(String(dealVal));
                }}
                title="Click to edit deal value"
              >
                <span>₹{Number(dealVal || 0).toLocaleString('en-IN')}</span>
                <Edit2 size={9} style={{ opacity: 0.6 }} />
              </div>
            )}
          </div>
        </div>

        {/* Middle Row: Rep Assignment & Stage Jumper */}
        <div className="deal-mid-row">
          <div className="deal-rep-selector">
            <div className="deal-rep-avatar" title={repName || 'Unassigned'}>
              {getRepInitials(repName)}
            </div>
            <select
              value={lead.assignedSalespersonId || ''}
              onChange={(e) => handleRepAssign(lead.id, e.target.value)}
              className="deal-select-mini"
            >
              <option value="">Unassigned</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.user?.name || emp.employeeId}</option>
              ))}
            </select>
          </div>

          <select
            value={lead.leadStage || 'New Lead'}
            onChange={(e) => handleStageChange(lead.id, e.target.value)}
            className="deal-stage-badge-select"
          >
            {STAGES.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>

        {/* Action Row */}
        <div className="deal-actions-row">
          {/* Primary Advance Button */}
          {lead.leadStage !== 'Won' && lead.leadStage !== 'Lost' && (
            <button
              type="button"
              onClick={() => handleOpenAdvanceModal(lead, STAGES.find(s => s.id === (lead.leadStage || 'New Lead'))?.nextStep || 'Qualified')}
              className="btn-advance-primary"
              title="Advance to next pipeline stage"
            >
              <ArrowRight size={11} /> Advance
            </button>
          )}

          {/* Quick Call */}
          {cleanPhone && (
            <a
              href={`tel:${cleanPhone}`}
              className="btn-icon-action call"
              title={`Call ${lead.businessName || 'Lead'}`}
            >
              <Phone size={12} />
            </a>
          )}

          {/* Quick WhatsApp */}
          {cleanPhone && (
            <a
              href={`https://wa.me/91${cleanPhone}`}
              target="_blank"
              rel="noreferrer"
              className="btn-icon-action wa"
              title="Chat on WhatsApp"
            >
              <MessageSquare size={12} />
            </a>
          )}

          {/* Convert or +Quote Shortcut */}
          {lead.isLeadRecord ? (
            <button
              type="button"
              onClick={() => setConvertingLead(lead)}
              className="btn-pill-action convert"
              title="Convert Lead into Client"
            >
              <UserPlus size={11} /> Convert
            </button>
          ) : (
            <Link
              href={`/quotations/new?customerId=${lead.id}`}
              className="btn-pill-action quote"
              title="Generate New Quotation"
            >
              <FileText size={11} /> + Quote
            </Link>
          )}

          {/* Card Details Link */}
          <Link
            href={detailsUrl}
            className="btn-icon-action"
            style={{ marginLeft: 'auto' }}
            title="View Full Details"
          >
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="pipeline-wrapper">
      
      {/* ─── 0. TOP VIEW SWITCHER TABS ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div className="pipeline-tab-switcher">
          <button
            type="button"
            onClick={() => setCurrentView('BOARD')}
            className={`pipeline-tab-btn ${currentView === 'BOARD' ? 'is-active' : ''}`}
          >
            <LayoutGrid size={15} /> Multi-Column Board
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('FOCUS')}
            className={`pipeline-tab-btn ${currentView === 'FOCUS' ? 'is-active' : ''}`}
          >
            <Layers size={15} /> Stage Flow View
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('TARGETS')}
            className={`pipeline-tab-btn ${currentView === 'TARGETS' ? 'is-active' : ''}`}
          >
            <Target size={15} /> Rep Targets & Closing
          </button>
        </div>
      </div>

      {currentView === 'TARGETS' ? (
        <SalesTargetTracker />
      ) : (
        <>
          {/* ─── 1. TOP PIPELINE METRICS CARDS ─── */}
          <div className="pipeline-kpi-grid">
            {/* Card 1: Total Leads */}
            <div className="pipeline-kpi-card">
              <div className="kpi-icon-box blue">
                <Layers size={20} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">Total Pipeline Deals</span>
                <span className="kpi-value">{leads.length}</span>
                <span className="kpi-subtext">{openLeads.length} active in workflow</span>
              </div>
            </div>

            {/* Card 2: Open Pipeline Value */}
            <div className="pipeline-kpi-card">
              <div className="kpi-icon-box purple">
                <TrendingUp size={20} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">Open Pipeline Value</span>
                <span className="kpi-value" style={{ color: '#4f46e5' }}>{formatCurrency(totalOpenValue)}</span>
                <span className="kpi-subtext">Avg ~{formatCurrency(avgDealSize)} / deal</span>
              </div>
            </div>

            {/* Card 3: Deals Won & Win Rate */}
            <div className="pipeline-kpi-card">
              <div className="kpi-icon-box emerald">
                <Award size={20} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">Deals Won & Win Rate</span>
                <span className="kpi-value" style={{ color: '#059669' }}>{wonLeads.length} Won ({winRate}%)</span>
                <span className="kpi-subtext" style={{ color: '#059669', fontWeight: 600 }}>
                  {formatCurrency(wonValue)} closed
                </span>
              </div>
            </div>
          </div>

          {/* ─── 2. SEARCH, REP & SORT FILTER TOOLBAR ─── */}
          <div className="pipeline-filter-bar">
            {/* Search Input */}
            <div className="pipeline-search-box">
              <Search size={15} className="pipeline-search-icon" />
              <input 
                type="text"
                placeholder="Search deals by customer, shop, phone or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pipeline-search-input"
              />
            </div>

            {/* Rep Selector */}
            {employees.length > 0 && (
              <select
                value={selectedRepFilter}
                onChange={(e) => setSelectedRepFilter(e.target.value)}
                className="pipeline-filter-select"
              >
                <option value="ALL">All Sales Representatives ({employees.length})</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.user?.name || emp.employeeId}</option>
                ))}
              </select>
            )}

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="pipeline-filter-select"
            >
              <option value="VALUE_HIGH">Sort: Highest Deal Value</option>
              <option value="VALUE_LOW">Sort: Lowest Deal Value</option>
              <option value="NEWEST">Sort: Newest First</option>
              <option value="NAME">Sort: Customer Name (A-Z)</option>
            </select>

            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}
              >
                Clear
              </button>
            )}
          </div>

          {/* ─── 3. VIEW MODE RENDERING ─── */}
          {currentView === 'BOARD' ? (
            /* MULTI-COLUMN KANBAN BOARD */
            <div className="kanban-board-track">
              {STAGES.map(stage => {
                const stageLeads = filteredLeads.filter(l => (l.leadStage || 'New Lead') === stage.id);
                const stageVal = stageLeads.reduce((sum, l) => sum + (l.computedDealValue || l.expectedValue || 0), 0);

                return (
                  <div 
                    key={stage.id}
                    className="kanban-column"
                  >
                    {/* Column Header */}
                    <div className="column-header">
                      <div className="column-header-left">
                        <span className="column-status-dot" style={{ backgroundColor: stage.color }}></span>
                        <span className="column-title" style={{ color: '#0f172a' }}>
                          {stage.title}
                        </span>
                        <span 
                          className="column-count-badge" 
                          style={{ backgroundColor: stage.badgeBg, color: stage.color, borderColor: stage.border }}
                        >
                          {stageLeads.length}
                        </span>
                      </div>

                      <span className="column-total-val">
                        {formatCurrency(stageVal)}
                      </span>
                    </div>

                    {/* Column Cards Stack */}
                    <div className="column-cards-container">
                      {stageLeads.length > 0 ? (
                        stageLeads.map(lead => renderLeadCard(lead, true))
                      ) : (
                        <div className="empty-column-box">
                          <Inbox size={24} style={{ color: '#cbd5e1' }} />
                          <span>No deals in {stage.title}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* STAGE FLOW FOCUSED VIEW */
            <div style={{ 
              backgroundColor: '#ffffff', 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0', 
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {/* Horizontal Stage Stepper Pills */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {STAGES.map((stage, idx) => {
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
                        borderRadius: '8px',
                        border: isSelected ? `1.5px solid ${stage.color}` : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? stage.bg : '#ffffff',
                        color: isSelected ? stage.color : '#475569',
                        fontSize: '0.82rem',
                        fontWeight: isSelected ? 750 : 500,
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{stage.title}</span>
                      <span style={{ 
                        backgroundColor: isSelected ? stage.color : '#f1f5f9', 
                        color: isSelected ? '#ffffff' : '#64748b',
                        padding: '2px 7px', 
                        borderRadius: '10px', 
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}>
                        {count}
                      </span>
                      {stageVal > 0 && (
                        <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 600 }}>
                          • {formatCurrency(stageVal)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Stage Header Summary */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '10px 14px', 
                backgroundColor: '#f8fafc', 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: activeStageConfig.color }}></span>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{activeStageConfig.title} Stage</span>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>({activeStageLeads.length} Deals)</span>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>
                  Total Value: {formatCurrency(activeStageTotalValue)}
                </span>
              </div>

              {/* Leads List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeStageLeads.length > 0 ? (
                  activeStageLeads.map(lead => renderLeadCard(lead, false))
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                    <Inbox size={32} style={{ color: '#94a3b8', margin: '0 auto 8px auto' }} />
                    <h4 style={{ margin: 0, fontWeight: 650, fontSize: '0.92rem', color: '#1e293b' }}>
                      No deals currently in {activeStageConfig.title}
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                      Advance deals from earlier stages or create new leads.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── 4. ADVANCE PIPELINE STEP MODAL ─── */}
      {advancingLead && (
        <div 
          className="modal-backdrop" 
          style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                  Advance Pipeline Stage
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  {advancingLead.businessName || advancingLead.contactPerson}
                </p>
              </div>
              <button onClick={() => setAdvancingLead(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 650, color: '#334155', marginBottom: '6px' }}>
                  Move To Target Stage
                </label>
                <select
                  value={advanceNextStage}
                  onChange={(e) => setAdvanceNextStage(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontWeight: 600, color: '#1e293b', backgroundColor: '#f8fafc', outline: 'none' }}
                >
                  {STAGES.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} {s.id === 'Won' ? '🏆 (Close Deal)' : s.id === 'Lost' ? '❌ (Lost/Dropped)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 650, color: '#334155', marginBottom: '6px' }}>
                  Progress Note / Discussion Details
                </label>
                <textarea
                  placeholder="Add meeting notes, customer feedback, next steps..."
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontFamily: 'inherit', resize: 'none', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 650, color: '#334155', marginBottom: '6px' }}>
                  Schedule Next Follow-up (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={advanceFollowUp}
                  onChange={(e) => setAdvanceFollowUp(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setAdvancingLead(null)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
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
                    background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', 
                    color: '#ffffff', 
                    fontWeight: 650, 
                    fontSize: '0.82rem', 
                    cursor: advancingLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  {advancingLoading ? "Advancing..." : `Move to ${advanceNextStage} ➔`}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── 5. CONVERT LEAD TO CUSTOMER MODAL ─── */}
      {convertingLead && (
        <AddCustomerModal 
          onClose={(newCustomer) => {
            setConvertingLead(null);
            if (newCustomer) {
              setLeads(leads.map(l => l.id === convertingLead.id ? { ...l, isLeadRecord: false, id: newCustomer.id, businessName: newCustomer.businessName } : l));
            }
          }} 
          employees={employees}
          leadToConvert={convertingLead}
        />
      )}

    </div>
  );
}
