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
  Target,
  LayoutGrid,
  Filter,
  UserPlus,
  Clock,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import SalesTargetTracker from './SalesTargetTracker';
import AddCustomerModal from '@/components/ui/AddCustomerModal';

export const STAGES = [
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
  const [leads, setLeads] = useState(initialLeads || []);
  const [activeStage, setActiveStage] = useState('Contacted');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepFilter, setSelectedRepFilter] = useState('ALL');
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
  const lostLeads = leads.filter(l => l.leadStage === 'Lost');
  
  const winRate = totalLeadsCount > 0 ? Math.round((wonLeads.length / totalLeadsCount) * 100) : 0;
  const avgDealSize = openLeads.length > 0 ? Math.round(totalOpenValue / (openLeads.length || 1)) : 0;

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        (l.businessName || '').toLowerCase().includes(q) ||
        (l.contactPerson || '').toLowerCase().includes(q) ||
        (l.mobile || l.whatsappNumber || '').includes(searchQuery) ||
        (l.city || '').toLowerCase().includes(q);
      
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

  // Render a single deal card (used in both multi-column board and focused stage list)
  const renderLeadCard = (lead: any, isCompactColumn: boolean = false) => {
    const cleanPhone = (lead.mobile || lead.whatsappNumber || '').replace(/[^0-9]/g, '');
    const dealVal = lead.computedDealValue || lead.expectedValue || 0;
    const isCustomer = !lead.isLeadRecord;
    const detailsUrl = isCustomer ? `/customers/${lead.id}` : `/leads/${lead.id}`;

    return (
      <div 
        key={lead.id}
        style={{
          backgroundColor: '#ffffff',
          padding: isCompactColumn ? '10px 12px' : '14px 16px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: isCompactColumn ? '8px' : '10px',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'; }}
      >
        {/* Top: Name, Lead/Customer Badge, Value */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <Link 
                href={detailsUrl} 
                style={{ 
                  fontWeight: 650, 
                  color: '#0f172a', 
                  fontSize: isCompactColumn ? '0.84rem' : '0.92rem', 
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: isCompactColumn ? '160px' : '220px'
                }}
                className="hover:underline"
              >
                {lead.businessName || lead.contactPerson || 'Unnamed Deal'}
              </Link>
              {lead.isLeadRecord && (
                <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', backgroundColor: '#eef2ff', color: '#4f46e5' }}>
                  Lead
                </span>
              )}
            </div>

            <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {lead.contactPerson && lead.contactPerson !== lead.businessName ? `${lead.contactPerson} • ` : ''}
              {lead.city ? `${lead.city} • ` : ''}
              {lead.mobile || lead.whatsappNumber || 'No Phone'}
            </p>
          </div>

          {/* Deal Value */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {editingValueLeadId === lead.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input 
                  type="number" 
                  autoFocus
                  value={customValueInput}
                  onChange={(e) => setCustomValueInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveDealValue(lead.id); }}
                  style={{ width: '75px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #3b82f6', fontSize: '0.75rem' }}
                />
                <button 
                  onClick={() => handleSaveDealValue(lead.id)}
                  style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#059669', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}
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
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}
                title="Click to edit deal value"
              >
                <span style={{ fontWeight: 700, fontSize: isCompactColumn ? '0.82rem' : '0.88rem', color: '#059669' }}>
                  ₹{Number(dealVal || 0).toLocaleString('en-IN')}
                </span>
                <Edit2 size={10} color="#94a3b8" />
              </div>
            )}
          </div>
        </div>

        {/* Middle: Rep Assignment & Stage Selector */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '6px', 
          paddingTop: '6px', 
          borderTop: '1px solid #f8fafc',
          fontSize: '0.74rem',
          color: '#64748b'
        }}>
          {/* Rep Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.7rem' }}>Rep:</span>
            <select
              value={lead.assignedSalespersonId || ''}
              onChange={(e) => handleRepAssign(lead.id, e.target.value)}
              style={{
                padding: '1px 6px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 500,
                color: '#334155',
                maxWidth: '110px'
              }}
            >
              <option value="">Unassigned</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.user?.name || emp.employeeId}</option>
              ))}
            </select>
          </div>

          {/* Quick Stage Jumper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <select
              value={lead.leadStage || 'New Lead'}
              onChange={(e) => handleStageChange(lead.id, e.target.value)}
              style={{
                padding: '1px 6px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: 600,
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

        {/* Action Row */}
        <div style={{ 
          display: 'flex', 
          gap: '4px', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          paddingTop: '6px',
          borderTop: '1px solid #f1f5f9'
        }}>
          {/* Advance Step Button */}
          {activeStageConfig.nextStep && lead.leadStage !== 'Won' && lead.leadStage !== 'Lost' && (
            <button
              type="button"
              onClick={() => handleOpenAdvanceModal(lead, STAGES.find(s => s.id === (lead.leadStage || 'New Lead'))?.nextStep || 'Qualified')}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <ArrowRight size={11} /> Advance ➔
            </button>
          )}

          {/* Call button */}
          {cleanPhone && (
            <a
              href={`tel:${cleanPhone}`}
              style={{
                padding: '3px 7px',
                borderRadius: '4px',
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                fontSize: '0.72rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <Phone size={11} /> Call
            </a>
          )}

          {/* WhatsApp button */}
          {cleanPhone && (
            <a
              href={`https://wa.me/91${cleanPhone}`}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '3px 7px',
                borderRadius: '4px',
                backgroundColor: '#25D366',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.72rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <MessageSquare size={11} /> WhatsApp
            </a>
          )}

          {/* Convert Lead to Customer if raw lead */}
          {lead.isLeadRecord ? (
            <button
              type="button"
              onClick={() => setConvertingLead(lead)}
              style={{
                padding: '3px 7px',
                borderRadius: '4px',
                backgroundColor: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                cursor: 'pointer'
              }}
            >
              <UserPlus size={11} /> Convert
            </button>
          ) : (
            <Link
              href={`/quotations/new?customerId=${lead.id}`}
              style={{
                padding: '3px 7px',
                borderRadius: '4px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                fontSize: '0.72rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <FileText size={11} /> + Quote
            </Link>
          )}

          <Link
            href={detailsUrl}
            style={{
              padding: '3px 6px',
              borderRadius: '4px',
              backgroundColor: '#f8fafc',
              color: '#475569',
              border: '1px solid #e2e8f0',
              fontSize: '0.72rem',
              fontWeight: 500,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              marginLeft: 'auto'
            }}
          >
            <ChevronRight size={12} />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* ─── 0. TOP VIEW SWITCHER TABS ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => setCurrentView('BOARD')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: currentView === 'BOARD' ? '#ffffff' : 'transparent',
              color: currentView === 'BOARD' ? '#4f46e5' : '#64748b',
              fontWeight: currentView === 'BOARD' ? 700 : 500,
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: currentView === 'BOARD' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <LayoutGrid size={14} /> Multi-Column Board
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('FOCUS')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: currentView === 'FOCUS' ? '#ffffff' : 'transparent',
              color: currentView === 'FOCUS' ? '#4f46e5' : '#64748b',
              fontWeight: currentView === 'FOCUS' ? 700 : 500,
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: currentView === 'FOCUS' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <Layers size={14} /> Stage Flow View
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('TARGETS')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: currentView === 'TARGETS' ? '#ffffff' : 'transparent',
              color: currentView === 'TARGETS' ? '#4f46e5' : '#64748b',
              fontWeight: currentView === 'TARGETS' ? 700 : 500,
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: currentView === 'TARGETS' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <Target size={14} color="#4f46e5" /> Rep Targets & Closing
          </button>
        </div>
      </div>

      {currentView === 'TARGETS' ? (
        <SalesTargetTracker />
      ) : (
        <>
          {/* ─── 1. TOP PIPELINE METRICS CARDS ─── */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '12px' 
          }}>
            {/* Card 1: Total Leads */}
            <div style={{ 
              backgroundColor: '#ffffff', 
              padding: '12px 16px', 
              borderRadius: '10px', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '8px', 
                backgroundColor: '#eff6ff', 
                color: '#3b82f6', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Layers size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Pipeline Leads
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2, marginTop: '1px' }}>
                  {leads.length}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  {openLeads.length} active in pipeline
                </div>
              </div>
            </div>

            {/* Card 2: Pipeline Value */}
            <div style={{ 
              backgroundColor: '#ffffff', 
              padding: '12px 16px', 
              borderRadius: '10px', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '8px', 
                backgroundColor: '#eef2ff', 
                color: '#4f46e5', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <TrendingUp size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Open Pipeline Value
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#4f46e5', lineHeight: 1.2, marginTop: '1px' }}>
                  {formatCurrency(totalOpenValue)}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  Avg ~{formatCurrency(avgDealSize)} / deal
                </div>
              </div>
            </div>

            {/* Card 3: Win Rate & Deals Won */}
            <div style={{ 
              backgroundColor: '#ffffff', 
              padding: '12px 16px', 
              borderRadius: '10px', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '8px', 
                backgroundColor: '#ecfdf5', 
                color: '#059669', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Award size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Deals Won & Win Rate
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669', lineHeight: 1.2, marginTop: '1px' }}>
                  {wonLeads.length} Won ({winRate}%)
                </div>
                <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>
                  {formatCurrency(wonValue)} closed
                </div>
              </div>
            </div>
          </div>

          {/* ─── 2. SEARCH & REP FILTER TOOLBAR ─── */}
          <div style={{ 
            backgroundColor: '#ffffff', 
            padding: '10px 14px', 
            borderRadius: '10px', 
            border: '1px solid #e2e8f0', 
            display: 'flex', 
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text"
                placeholder="Search leads by name, shop, mobile, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 30px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '0.82rem',
                  color: '#0f172a',
                  outline: 'none'
                }}
              />
            </div>

            {employees.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserCheck size={14} color="#64748b" />
                <select
                  value={selectedRepFilter}
                  onChange={(e) => setSelectedRepFilter(e.target.value)}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '6px',
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

            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* ─── 3. VIEW MODE RENDERING ─── */}
          {currentView === 'BOARD' ? (
            /* MULTI-COLUMN KANBAN BOARD */
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
              gap: '14px',
              overflowX: 'auto',
              paddingBottom: '12px'
            }}>
              {STAGES.map(stage => {
                const stageLeads = filteredLeads.filter(l => (l.leadStage || 'New Lead') === stage.id);
                const stageVal = stageLeads.reduce((sum, l) => sum + (l.computedDealValue || l.expectedValue || 0), 0);

                return (
                  <div 
                    key={stage.id}
                    style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '10px',
                      border: `1px solid ${stage.border}`,
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: '480px',
                      maxHeight: '80vh',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Column Header */}
                    <div style={{
                      padding: '10px 12px',
                      backgroundColor: stage.bg,
                      borderBottom: `1px solid ${stage.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stage.color }}></span>
                        <span style={{ fontWeight: 700, fontSize: '0.84rem', color: stage.color }}>
                          {stage.title}
                        </span>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: 700, 
                          backgroundColor: '#ffffff', 
                          color: stage.color, 
                          padding: '1px 6px', 
                          borderRadius: '10px', 
                          border: `1px solid ${stage.border}` 
                        }}>
                          {stageLeads.length}
                        </span>
                      </div>

                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: stage.color }}>
                        {formatCurrency(stageVal)}
                      </span>
                    </div>

                    {/* Column Cards Stack */}
                    <div style={{
                      padding: '8px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      flex: 1
                    }}>
                      {stageLeads.length > 0 ? (
                        stageLeads.map(lead => renderLeadCard(lead, true))
                      ) : (
                        <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>
                          No leads in {stage.title}
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
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              {/* Horizontal Stage Selector Pills */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
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
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: isSelected ? `1px solid ${stage.color}` : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? stage.bg : '#ffffff',
                        color: isSelected ? stage.color : '#475569',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 700 : 500,
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <span>{stage.title}</span>
                      <span style={{ 
                        backgroundColor: isSelected ? stage.color : '#f1f5f9', 
                        color: isSelected ? '#ffffff' : '#64748b',
                        padding: '1px 6px', 
                        borderRadius: '10px', 
                        fontSize: '0.7rem',
                        fontWeight: 700
                      }}>
                        {count}
                      </span>
                      {stageVal > 0 && (
                        <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                          • {formatCurrency(stageVal)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Stage Header Summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: activeStageConfig.color }}></span>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{activeStageConfig.title} Stage</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({activeStageLeads.length} Deals)</span>
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669' }}>
                  Total: {formatCurrency(activeStageTotalValue)}
                </span>
              </div>

              {/* Leads List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeStageLeads.length > 0 ? (
                  activeStageLeads.map(lead => renderLeadCard(lead, false))
                ) : (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <Layers size={32} style={{ color: '#94a3b8', margin: '0 auto 8px auto' }} />
                    <h4 style={{ margin: 0, fontWeight: 600, fontSize: '0.92rem', color: '#1e293b' }}>
                      No leads in {activeStageConfig.title} stage
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem' }}>
                      Switch tabs or add a new lead to populate this stage.
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
          style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600 }}>
                  Advance Lead Pipeline Step
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                  {advancingLead.businessName} ({advancingLead.contactPerson})
                </p>
              </div>
              <button onClick={() => setAdvancingLead(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Target Stage
                </label>
                <select
                  value={advanceNextStage}
                  onChange={(e) => setAdvanceNextStage(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 500, color: '#1e293b' }}
                >
                  {STAGES.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} {s.id === 'Won' ? '🏆 (Close Deal)' : s.id === 'Lost' ? '❌ (Archive)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Progress Note / Discussion Summary
                </label>
                <textarea
                  placeholder="e.g., Customer agreed on pricing, scheduled follow-up call..."
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontFamily: 'inherit', resize: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Next Follow-up Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={advanceFollowUp}
                  onChange={(e) => setAdvanceFollowUp(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setAdvancingLead(null)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 500, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={advancingLoading}
                  onClick={handleConfirmAdvance}
                  style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#4f46e5', color: '#ffffff', fontWeight: 600, fontSize: '0.8rem', cursor: advancingLoading ? 'not-allowed' : 'pointer' }}
                >
                  {advancingLoading ? "Advancing..." : `Confirm Move to ${advanceNextStage} ➔`}
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
