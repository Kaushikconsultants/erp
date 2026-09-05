"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  updateLeadStage, 
  updateLeadValue, 
  assignLeadRep, 
  advanceLeadStep,
  scheduleLeadFollowUp,
  completeLeadFollowUp,
  savePipelineStageNames,
  getPipelineStageNames,
  deletePipelineLead
} from '@/app/actions/leadActions';
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
  Search, 
  Edit2, 
  X, 
  Target, 
  LayoutGrid, 
  UserPlus, 
  DollarSign,
  Inbox,
  CheckCircle2,
  MapPin,
  User,
  PhoneCall,
  Clock,
  Sparkles,
  Building2,
  Check,
  SlidersHorizontal,
  RotateCcw,
  AlertCircle,
  Calendar,
  CalendarPlus,
  CalendarClock,
  Trash2,
  Loader2
} from 'lucide-react';
import SalesTargetTracker from './SalesTargetTracker';
import AddCustomerModal from '@/components/ui/AddCustomerModal';
import './KanbanBoard.css';

export const STAGES = [
  { 
    id: 'New Lead', 
    title: 'New Lead', 
    color: '#2563eb', 
    bg: '#eff6ff', 
    border: '#bfdbfe', 
    badgeBg: '#dbeafe',
    nextStep: 'Contacted', 
    nextActionLabel: 'Mark Contacted' 
  },
  { 
    id: 'Contacted', 
    title: 'Contacted', 
    color: '#4f46e5', 
    bg: '#eef2ff', 
    border: '#c7d2fe', 
    badgeBg: '#e0e7ff',
    nextStep: 'Qualified', 
    nextActionLabel: 'Qualify Lead' 
  },
  { 
    id: 'Qualified', 
    title: 'Qualified', 
    color: '#7c3aed', 
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
  initialStageTitles?: Record<string, string>;
}

export default function KanbanBoard({ initialLeads, employees = [], initialStageTitles = {} }: KanbanBoardProps) {
  const [leads, setLeads] = useState(initialLeads || []);
  const [activeStage, setActiveStage] = useState('Contacted');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepFilter, setSelectedRepFilter] = useState('ALL');
  const [followUpFilter, setFollowUpFilter] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'NONE'>('ALL');
  const [sortBy, setSortBy] = useState<'VALUE_HIGH' | 'VALUE_LOW' | 'NAME' | 'NEWEST'>('VALUE_HIGH');
  const [currentView, setCurrentView] = useState<'BOARD' | 'FOCUS' | 'TARGETS'>('BOARD');
  
  // Custom Stage Titles State & Persistence
  const [customStageTitles, setCustomStageTitles] = useState<Record<string, string>>(initialStageTitles || {});
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState<string>('');
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [modalStageNames, setModalStageNames] = useState<Record<string, string>>({});

  // Follow-up Schedule & Manage Modal State
  const [managingFollowUpLead, setManagingFollowUpLead] = useState<any | null>(null);
  const [fuDateInput, setFuDateInput] = useState('');
  const [fuNotesInput, setFuNotesInput] = useState('');
  const [fuPriorityInput, setFuPriorityInput] = useState('Medium');
  const [fuTypeInput, setFuTypeInput] = useState('Call');
  const [fuLoading, setFuLoading] = useState(false);

  // Delete Junk Lead State
  const [leadToDelete, setLeadToDelete] = useState<any | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);

  // Load custom stage names from props, localStorage, and server action
  useEffect(() => {
    if (initialStageTitles && Object.keys(initialStageTitles).length > 0) {
      setCustomStageTitles(initialStageTitles);
      try {
        localStorage.setItem('crm_pipeline_stage_names', JSON.stringify(initialStageTitles));
      } catch (e) {}
    } else {
      try {
        const saved = localStorage.getItem('crm_pipeline_stage_names');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            setCustomStageTitles(parsed);
          }
        }
      } catch (e) {
        console.error('Failed to load custom stage names', e);
      }

      getPipelineStageNames().then(res => {
        if (res?.success && res.stageNames && Object.keys(res.stageNames).length > 0) {
          setCustomStageTitles(res.stageNames);
          try {
            localStorage.setItem('crm_pipeline_stage_names', JSON.stringify(res.stageNames));
          } catch (e) {}
        }
      }).catch(() => {});
    }
  }, [initialStageTitles]);

  // Compute dynamic stages with custom titles
  const stages = useMemo(() => {
    return STAGES.map(s => ({
      ...s,
      title: customStageTitles[s.id] || s.title
    }));
  }, [customStageTitles]);

  // Helper for computing follow-up status on deals
  const getFollowUpStatus = (dateStr?: string | null) => {
    if (!dateStr) return { type: 'NONE', label: 'No follow-up', formattedTime: '' };
    
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { type: 'NONE', label: 'No follow-up', formattedTime: '' };

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfTomorrow = new Date(startOfToday.getTime() + 86400000);
    const endOfTomorrow = new Date(endOfToday.getTime() + 86400000);

    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (d < startOfToday) {
      const diffDays = Math.max(1, Math.round((startOfToday.getTime() - d.getTime()) / 86400000));
      const label = diffDays === 1 ? 'Yesterday' : `${diffDays}d overdue`;
      return { type: 'OVERDUE', label, formattedTime: timeStr, date: d };
    } else if (d >= startOfToday && d <= endOfToday) {
      return { type: 'TODAY', label: 'Today', formattedTime: timeStr, date: d };
    } else if (d >= startOfTomorrow && d <= endOfTomorrow) {
      return { type: 'UPCOMING', label: `Tomorrow ${timeStr}`, formattedTime: timeStr, date: d };
    } else {
      const dateFormatted = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      return { type: 'UPCOMING', label: `${dateFormatted}, ${timeStr}`, formattedTime: timeStr, date: d };
    }
  };

  // Follow-up Count Metrics across all pipeline deals
  const fuCounts = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let upcoming = 0;
    let none = 0;

    leads.forEach(l => {
      const st = getFollowUpStatus(l.nextFollowUpDate);
      if (st.type === 'OVERDUE') overdue++;
      else if (st.type === 'TODAY') today++;
      else if (st.type === 'UPCOMING') upcoming++;
      else none++;
    });

    return { overdue, today, upcoming, none };
  }, [leads]);

  // Handle preset date selection
  const setQuickFollowUpPreset = (hoursOffset: number, daysOffset: number, setHour?: number, setMinute?: number) => {
    const d = new Date();
    if (daysOffset > 0) {
      d.setDate(d.getDate() + daysOffset);
    }
    if (hoursOffset > 0) {
      d.setHours(d.getHours() + hoursOffset);
    }
    if (setHour !== undefined) {
      d.setHours(setHour);
      d.setMinutes(setMinute || 0);
      d.setSeconds(0);
    }
    
    const pad = (n: number) => String(n).padStart(2, '0');
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setFuDateInput(localIso);
  };

  // Open follow-up modal
  const handleOpenFollowUpModal = (lead: any) => {
    setManagingFollowUpLead(lead);
    if (lead.nextFollowUpDate) {
      const d = new Date(lead.nextFollowUpDate);
      const pad = (n: number) => String(n).padStart(2, '0');
      const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setFuDateInput(localIso);
    } else {
      setQuickFollowUpPreset(0, 1, 11, 0); // Default: Tomorrow at 11:00 AM
    }
    setFuNotesInput(lead.nextFollowUpNotes || '');
    setFuPriorityInput(lead.nextFollowUpPriority || 'Medium');
    setFuTypeInput(lead.nextFollowUpType || 'Call');
  };

  // Save Follow-up Action
  const handleSaveFollowUp = async () => {
    if (!managingFollowUpLead || !fuDateInput) return;
    setFuLoading(true);

    const res = await scheduleLeadFollowUp(
      managingFollowUpLead.id,
      fuDateInput,
      fuNotesInput,
      fuPriorityInput,
      fuTypeInput
    );

    setFuLoading(false);

    if (res.success) {
      setLeads(leads.map(l => l.id === managingFollowUpLead.id ? {
        ...l,
        nextFollowUpDate: new Date(fuDateInput).toISOString(),
        nextFollowUpNotes: fuNotesInput,
        nextFollowUpPriority: fuPriorityInput,
        nextFollowUpType: fuTypeInput
      } : l));
      setManagingFollowUpLead(null);
    } else {
      alert(res.error || "Failed to schedule follow-up");
    }
  };

  // Mark Follow-up Completed
  const handleCompleteFollowUp = async () => {
    if (!managingFollowUpLead) return;
    setFuLoading(true);

    const res = await completeLeadFollowUp(managingFollowUpLead.id, fuNotesInput);

    setFuLoading(false);

    if (res.success) {
      setLeads(leads.map(l => l.id === managingFollowUpLead.id ? {
        ...l,
        nextFollowUpDate: null,
        nextFollowUpNotes: '',
        nextFollowUpPriority: 'Medium',
        nextFollowUpType: 'Call'
      } : l));
      setManagingFollowUpLead(null);
    } else {
      alert(res.error || "Failed to complete follow-up");
    }
  };

  // Handle saving individual stage name
  const handleSaveStageName = async (stageId: string, customName?: string) => {
    const nameToSave = (customName !== undefined ? customName : editingStageName).trim();
    const defaultStage = STAGES.find(s => s.id === stageId);
    const newTitles = { ...customStageTitles };

    if (!nameToSave || nameToSave === defaultStage?.title) {
      delete newTitles[stageId];
    } else {
      newTitles[stageId] = nameToSave;
    }

    setCustomStageTitles(newTitles);
    setEditingStageId(null);

    try {
      localStorage.setItem('crm_pipeline_stage_names', JSON.stringify(newTitles));
    } catch (e) {
      console.error('Failed to save custom stage names', e);
    }

    await savePipelineStageNames(newTitles);
  };

  // Handle opening customize modal
  const handleOpenCustomizeModal = () => {
    const initial: Record<string, string> = {};
    STAGES.forEach(s => {
      initial[s.id] = customStageTitles[s.id] || s.title;
    });
    setModalStageNames(initial);
    setIsCustomizeModalOpen(true);
  };

  // Handle saving from customize modal
  const handleSaveModalStageNames = async () => {
    const newTitles: Record<string, string> = {};
    STAGES.forEach(s => {
      const val = (modalStageNames[s.id] || '').trim();
      if (val && val !== s.title) {
        newTitles[s.id] = val;
      }
    });

    setCustomStageTitles(newTitles);
    setIsCustomizeModalOpen(false);

    try {
      localStorage.setItem('crm_pipeline_stage_names', JSON.stringify(newTitles));
    } catch (e) {
      console.error('Failed to save stage names', e);
    }

    await savePipelineStageNames(newTitles);
  };

  // Handle reset to default stage names
  const handleResetStages = async () => {
    setCustomStageTitles({});
    setModalStageNames({});
    try {
      localStorage.removeItem('crm_pipeline_stage_names');
    } catch (e) {}
    setIsCustomizeModalOpen(false);

    await savePipelineStageNames({});
  };

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
  const valuedDeals = openLeads.filter(l => (l.computedDealValue || l.expectedValue || 0) > 0);
  const avgDealSize = valuedDeals.length > 0 ? Math.round(totalOpenValue / valuedDeals.length) : (openLeads.length > 0 ? Math.round(totalOpenValue / openLeads.length) : 0);

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

      const fuStatus = getFollowUpStatus(l.nextFollowUpDate);
      const matchesFu = 
        followUpFilter === 'ALL' ||
        fuStatus.type === followUpFilter;

      return matchesSearch && matchesRep && matchesFu;
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
  }, [leads, searchQuery, selectedRepFilter, followUpFilter, sortBy]);

  const activeStageConfig = stages.find(s => s.id === activeStage) || stages[1];
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
    const currentConfig = stages.find(s => s.id === (lead.leadStage || 'New Lead'));
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

  const handleConfirmDeleteLead = async () => {
    if (!leadToDelete) return;
    const target = leadToDelete;
    setDeletingLeadId(target.id);

    const prevLeads = [...leads];
    setLeads(leads.filter(l => l.id !== target.id));

    try {
      const res = await deletePipelineLead(target.id, !!target.isLeadRecord);
      setDeletingLeadId(null);
      setLeadToDelete(null);

      if (res?.error) {
        alert(res.error);
        setLeads(prevLeads);
      }
    } catch (err: any) {
      setDeletingLeadId(null);
      setLeadToDelete(null);
      alert(err?.message || "Failed to delete lead");
      setLeads(prevLeads);
    }
  };

  // Render a Single Enterprise Deal Card
  const renderLeadCard = (lead: any, isCompact: boolean = false) => {
    const rawPhone = lead.mobile || lead.whatsappNumber || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    const dealVal = lead.computedDealValue || lead.expectedValue || 0;
    const isCustomer = !lead.isLeadRecord;
    const detailsUrl = isCustomer ? `/customers/${lead.id}` : `/leads/${lead.id}`;
    const assignedRep = employees.find(e => e.id === lead.assignedSalespersonId);
    const repName = assignedRep?.user?.name || assignedRep?.employeeId || (lead.assignedSalesperson?.user?.name) || '';

    return (
      <div 
        key={lead.id}
        className="deal-box"
      >
        {/* Row 1: Header with Name, Badge & Value */}
        <div className="deal-box-header">
          <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            <Link 
              href={detailsUrl} 
              className="deal-name-link"
              title={lead.businessName || lead.contactPerson}
            >
              {lead.businessName || lead.contactPerson || 'Unnamed Deal'}
            </Link>
            {lead.isLeadRecord ? (
              <span className="tag-lead">LEAD</span>
            ) : (
              <span className="tag-client">CLIENT</span>
            )}
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
                  style={{ width: '65px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #3b82f6', fontSize: '0.72rem', outline: 'none' }}
                />
                <button 
                  onClick={() => handleSaveDealValue(lead.id)}
                  style={{ padding: '2px 5px', borderRadius: '4px', backgroundColor: '#059669', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700 }}
                >
                  ✓
                </button>
              </div>
            ) : (
              <div 
                className="val-badge"
                onClick={() => {
                  setEditingValueLeadId(lead.id);
                  setCustomValueInput(String(dealVal));
                }}
                title="Click to edit deal value"
              >
                <span>₹{Number(dealVal || 0).toLocaleString('en-IN')}</span>
                <Edit2 size={8} style={{ opacity: 0.6 }} />
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Metadata (Location, Contact, Phone) */}
        <div className="deal-details-meta">
          {lead.city && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              <MapPin size={10} className="deal-meta-icon" /> {lead.city}
            </span>
          )}
          {lead.contactPerson && lead.contactPerson !== lead.businessName && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              <User size={10} className="deal-meta-icon" /> {lead.contactPerson}
            </span>
          )}
          {rawPhone && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#94a3b8' }}>
              • {rawPhone}
            </span>
          )}
        </div>

        {/* Row 2.5: Next Follow-Up Status */}
        {(() => {
          const fuStatus = getFollowUpStatus(lead.nextFollowUpDate);
          return (
            <div className="deal-fu-row">
              {fuStatus.type === 'OVERDUE' && (
                <div 
                  className="fu-tag overdue" 
                  onClick={() => handleOpenFollowUpModal(lead)}
                  title={`Overdue since ${fuStatus.formattedTime}. Click to reschedule or mark complete.`}
                >
                  <AlertCircle size={10} />
                  <span>Overdue: {fuStatus.label}</span>
                </div>
              )}
              {fuStatus.type === 'TODAY' && (
                <div 
                  className="fu-tag today" 
                  onClick={() => handleOpenFollowUpModal(lead)}
                  title={`Due today at ${fuStatus.formattedTime}. Click to reschedule or mark complete.`}
                >
                  <Clock size={10} />
                  <span>Today {fuStatus.formattedTime}</span>
                </div>
              )}
              {fuStatus.type === 'UPCOMING' && (
                <div 
                  className="fu-tag upcoming" 
                  onClick={() => handleOpenFollowUpModal(lead)}
                  title={`Follow-up on ${fuStatus.label}. Click to manage.`}
                >
                  <Calendar size={10} />
                  <span>{fuStatus.label}</span>
                </div>
              )}
              {fuStatus.type === 'NONE' && (
                <button 
                  type="button"
                  className="fu-tag none" 
                  onClick={() => handleOpenFollowUpModal(lead)}
                  title="Schedule a follow-up date and reminder"
                >
                  <CalendarPlus size={10} />
                  <span>+ Follow-up</span>
                </button>
              )}
            </div>
          );
        })()}

        {/* Row 3: Sales Rep & Stage Selector */}
        <div className="deal-rep-stage-row">
          <div className="deal-rep-group">
            <div className="deal-rep-circ" title={repName || 'Unassigned'}>
              {getRepInitials(repName)}
            </div>
            <select
              value={lead.assignedSalespersonId || ''}
              onChange={(e) => handleRepAssign(lead.id, e.target.value)}
              className="deal-rep-select"
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
            className="deal-stage-select"
          >
            {stages.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>

        {/* Row 4: Action Buttons Bar */}
        <div className="deal-btn-row">
          {/* Primary Advance Button */}
          {lead.leadStage !== 'Won' && lead.leadStage !== 'Lost' && (
            <button
              type="button"
              onClick={() => handleOpenAdvanceModal(lead, stages.find(s => s.id === (lead.leadStage || 'New Lead'))?.nextStep || 'Qualified')}
              className="btn-step-adv"
              title="Advance to next pipeline stage"
            >
              <ArrowRight size={10} /> Advance
            </button>
          )}

          {/* Quick Schedule / Manage Follow-up */}
          <button
            type="button"
            onClick={() => handleOpenFollowUpModal(lead)}
            className="action-icon-pill fu"
            title="Schedule or manage follow-up"
          >
            <CalendarClock size={11} />
          </button>

          {/* Quick Call */}
          {cleanPhone && (
            <a
              href={`tel:${cleanPhone}`}
              className="action-icon-pill call"
              title={`Call ${lead.businessName || 'Lead'}`}
            >
              <PhoneCall size={11} />
            </a>
          )}

          {/* Quick WhatsApp */}
          {cleanPhone && (
            <a
              href={`https://wa.me/91${cleanPhone}`}
              target="_blank"
              rel="noreferrer"
              className="action-icon-pill wa"
              title="Chat on WhatsApp"
            >
              <MessageSquare size={11} />
            </a>
          )}

          {/* Convert or +Quote Shortcut */}
          {lead.isLeadRecord ? (
            <button
              type="button"
              onClick={() => setConvertingLead(lead)}
              className="action-pill-text convert"
              title="Convert Lead into Client"
            >
              <UserPlus size={10} /> Convert
            </button>
          ) : (
            <Link
              href={`/quotations/new?customerId=${lead.id}`}
              className="action-pill-text quote"
              title="Generate New Quotation"
            >
              <FileText size={10} /> + Quote
            </Link>
          )}

          {/* Delete Junk Lead Button (ONLY in New Lead section) */}
          {(lead.leadStage || 'New Lead') === 'New Lead' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLeadToDelete(lead);
              }}
              disabled={deletingLeadId === lead.id}
              className="action-icon-pill delete"
              title="Delete junk lead"
            >
              {deletingLeadId === lead.id ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Trash2 size={11} />
              )}
            </button>
          )}

          {/* Card Details Link */}
          <Link
            href={detailsUrl}
            className="action-icon-pill"
            style={{ marginLeft: 'auto' }}
            title="View Full Details"
          >
            <ChevronRight size={12} />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="pipeline-container">
      
      {/* ─── 0. TOP VIEW SWITCHER TABS ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div className="pipeline-nav-tabs">
          <button
            type="button"
            onClick={() => setCurrentView('BOARD')}
            className={`pipeline-nav-btn ${currentView === 'BOARD' ? 'is-active' : ''}`}
          >
            <LayoutGrid size={14} /> Multi-Column Board
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('FOCUS')}
            className={`pipeline-nav-btn ${currentView === 'FOCUS' ? 'is-active' : ''}`}
          >
            <Layers size={14} /> Stage Flow View
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('TARGETS')}
            className={`pipeline-nav-btn ${currentView === 'TARGETS' ? 'is-active' : ''}`}
          >
            <Target size={14} /> Rep Targets & Closing
          </button>
        </div>
      </div>

      {currentView === 'TARGETS' ? (
        <SalesTargetTracker />
      ) : (
        <>
          {/* ─── 1. TOP PIPELINE METRICS CARDS ─── */}
          <div className="pipeline-kpi-row">
            {/* Card 1: Total Leads */}
            <div className="kpi-card">
              <div className="kpi-icon-wrap blue">
                <Layers size={18} />
              </div>
              <div className="kpi-data">
                <span className="kpi-title">Total Deals in Pipeline</span>
                <span className="kpi-metric">{leads.length}</span>
                <span className="kpi-sub">{openLeads.length} active in workflow</span>
              </div>
            </div>

            {/* Card 2: Open Pipeline Value */}
            <div className="kpi-card">
              <div className="kpi-icon-wrap indigo">
                <TrendingUp size={18} />
              </div>
              <div className="kpi-data">
                <span className="kpi-title">Open Pipeline Value</span>
                <span className="kpi-metric" style={{ color: '#4f46e5' }}>{formatCurrency(totalOpenValue)}</span>
                <span className="kpi-sub">Avg ~{formatCurrency(avgDealSize)} / deal</span>
              </div>
            </div>

            {/* Card 3: Deals Won & Win Rate */}
            <div className="kpi-card">
              <div className="kpi-icon-wrap emerald">
                <Award size={18} />
              </div>
              <div className="kpi-data">
                <span className="kpi-title">Deals Won & Win Rate</span>
                <span className="kpi-metric" style={{ color: '#059669' }}>{wonLeads.length} Won ({winRate}%)</span>
                <span className="kpi-sub" style={{ color: '#059669', fontWeight: 600 }}>
                  {formatCurrency(wonValue)} closed
                </span>
              </div>
            </div>
          </div>

          {/* ─── 2. TOOLBAR & FILTERS ─── */}
          <div className="pipeline-toolbar">
            {/* Search Box */}
            <div className="search-field">
              <Search size={14} className="search-field-icon" />
              <input 
                type="text"
                placeholder="Search deals by customer, shop, phone or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-field-input"
              />
            </div>

            {/* Sales Rep Selector */}
            {employees.length > 0 && (
              <select
                value={selectedRepFilter}
                onChange={(e) => setSelectedRepFilter(e.target.value)}
                className="filter-select-input"
              >
                <option value="ALL">All Sales Representatives ({employees.length})</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.user?.name || emp.employeeId}</option>
                ))}
              </select>
            )}

            {/* Follow-up Status Filter */}
            <select
              value={followUpFilter}
              onChange={(e) => setFollowUpFilter(e.target.value as any)}
              className="filter-select-input"
            >
              <option value="ALL">All Follow-ups</option>
              <option value="OVERDUE">🔴 Overdue Follow-ups ({fuCounts.overdue})</option>
              <option value="TODAY">🟢 Due Today ({fuCounts.today})</option>
              <option value="UPCOMING">🔵 Upcoming ({fuCounts.upcoming})</option>
              <option value="NONE">⚪ No Follow-up Set ({fuCounts.none})</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="filter-select-input"
            >
              <option value="VALUE_HIGH">Sort: Highest Deal Value</option>
              <option value="VALUE_LOW">Sort: Lowest Deal Value</option>
              <option value="NEWEST">Sort: Newest First</option>
              <option value="NAME">Sort: Customer Name (A-Z)</option>
            </select>

            {/* Rename / Customize Stages Button */}
            <button
              type="button"
              onClick={handleOpenCustomizeModal}
              className="stage-customize-btn"
              title="Edit and rename pipeline stage options"
            >
              <SlidersHorizontal size={13} />
              <span>Rename Stages</span>
            </button>

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
            <div className="kanban-track">
              {stages.map(stage => {
                const stageLeads = filteredLeads.filter(l => (l.leadStage || 'New Lead') === stage.id);
                const stageVal = stageLeads.reduce((sum, l) => sum + (l.computedDealValue || l.expectedValue || 0), 0);

                return (
                  <div 
                    key={stage.id}
                    className="kanban-col"
                  >
                    {/* Column Header */}
                    <div className="kanban-col-header">
                      <div className="col-header-left">
                        <span className="col-dot" style={{ backgroundColor: stage.color }}></span>
                        
                        {editingStageId === stage.id ? (
                          <div className="col-title-inline-edit" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              autoFocus
                              value={editingStageName}
                              onChange={(e) => setEditingStageName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveStageName(stage.id);
                                if (e.key === 'Escape') setEditingStageId(null);
                              }}
                              onBlur={() => handleSaveStageName(stage.id)}
                              className="col-title-input"
                              maxLength={30}
                            />
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); handleSaveStageName(stage.id); }}
                              className="col-title-action-btn save"
                              title="Save name"
                            >
                              <Check size={11} />
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); setEditingStageId(null); }}
                              className="col-title-action-btn cancel"
                              title="Cancel"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="col-title-wrap"
                            onClick={() => {
                              setEditingStageId(stage.id);
                              setEditingStageName(stage.title);
                            }}
                            title="Click to rename this stage column"
                          >
                            <span className="col-title">
                              {stage.title}
                            </span>
                            <span className="col-edit-icon" title="Rename column">
                              <Edit2 size={10} />
                            </span>
                          </div>
                        )}

                        <span 
                          className="col-badge" 
                          style={{ backgroundColor: stage.badgeBg, color: stage.color, borderColor: stage.border }}
                        >
                          {stageLeads.length}
                        </span>
                      </div>

                      <span className="col-sum">
                        {formatCurrency(stageVal)}
                      </span>
                    </div>

                    {/* Column Cards Container */}
                    <div className="kanban-col-cards">
                      {stageLeads.length > 0 ? (
                        stageLeads.map(lead => renderLeadCard(lead, true))
                      ) : (
                        <div className="empty-col-state">
                          <Inbox size={22} style={{ color: '#cbd5e1' }} />
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
              borderRadius: '10px', 
              border: '1px solid #e2e8f0', 
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              {/* Horizontal Stepper */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {stages.map((stage) => {
                  const stageLeads = filteredLeads.filter(l => (l.leadStage || 'New Lead') === stage.id);
                  const count = stageLeads.length;
                  const stageVal = stageLeads.reduce((sum, l) => sum + (l.computedDealValue || l.expectedValue || 0), 0);
                  const isSelected = activeStage === stage.id;

                  return (
                    <button
                      key={stage.id}
                      onClick={() => setActiveStage(stage.id)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '7px',
                        border: isSelected ? `1.5px solid ${stage.color}` : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? stage.bg : '#ffffff',
                        color: isSelected ? stage.color : '#475569',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 700 : 500,
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{stage.title}</span>
                      <span style={{ 
                        backgroundColor: isSelected ? stage.color : '#f1f5f9', 
                        color: isSelected ? '#ffffff' : '#64748b',
                        padding: '1px 6px', 
                        borderRadius: '8px', 
                        fontSize: '0.7rem',
                        fontWeight: 700
                      }}>
                        {count}
                      </span>
                      {stageVal > 0 && (
                        <span style={{ fontSize: '0.7rem', opacity: 0.85, fontWeight: 600 }}>
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
                padding: '9px 12px', 
                backgroundColor: '#f8fafc', 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: activeStageConfig.color }}></span>
                  <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0f172a' }}>{activeStageConfig.title} Stage</span>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>({activeStageLeads.length} Deals)</span>
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669' }}>
                  Total Value: {formatCurrency(activeStageTotalValue)}
                </span>
              </div>

              {/* Leads List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeStageLeads.length > 0 ? (
                  activeStageLeads.map(lead => renderLeadCard(lead, false))
                ) : (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <Inbox size={28} style={{ color: '#94a3b8', margin: '0 auto 6px auto' }} />
                    <h4 style={{ margin: 0, fontWeight: 650, fontSize: '0.88rem', color: '#1e293b' }}>
                      No deals currently in {activeStageConfig.title}
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
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
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '460px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700 }}>
                  Advance Pipeline Stage
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                  {advancingLead.businessName || advancingLead.contactPerson}
                </p>
              </div>
              <button onClick={() => setAdvancingLead(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={16} />
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
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', backgroundColor: '#f8fafc', outline: 'none' }}
                >
                  {stages.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} {s.id === 'Won' ? '🏆 (Close Deal)' : s.id === 'Lost' ? '❌ (Lost/Dropped)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Progress Note / Discussion Details
                </label>
                <textarea
                  placeholder="Add meeting notes, customer feedback, next steps..."
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontFamily: 'inherit', resize: 'none', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Schedule Next Follow-up (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={advanceFollowUp}
                  onChange={(e) => setAdvanceFollowUp(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setAdvancingLead(null)}
                  style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
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
                    fontSize: '0.8rem', 
                    cursor: advancingLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {advancingLoading ? "Advancing..." : `Move to ${stages.find(s => s.id === advanceNextStage)?.title || advanceNextStage} ➔`}
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

      {/* ─── 6. CUSTOMIZE PIPELINE STAGES MODAL ─── */}
      {isCustomizeModalOpen && (
        <div 
          className="modal-backdrop" 
          style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={16} style={{ color: '#818cf8' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700 }}>
                    Rename Pipeline Stages
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Customize the display names of each column in your sales workflow
                  </p>
                </div>
              </div>
              <button onClick={() => setIsCustomizeModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {STAGES.map((s, idx) => {
                  const currentCustomVal = modalStageNames[s.id] ?? s.title;
                  return (
                    <div 
                      key={s.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        padding: '10px 12px', 
                        backgroundColor: '#f8fafc', 
                        borderRadius: '8px', 
                        border: '1px solid #e2e8f0' 
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: s.color, flexShrink: 0 }}></span>
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
                            Step {idx + 1}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            Default: {s.title}
                          </div>
                        </div>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input
                          type="text"
                          value={currentCustomVal}
                          placeholder={`Enter name for ${s.title}...`}
                          onChange={(e) => setModalStageNames({
                            ...modalStageNames,
                            [s.id]: e.target.value
                          })}
                          maxLength={30}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: '#0f172a',
                            backgroundColor: '#ffffff',
                            outline: 'none',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>

                      {currentCustomVal !== s.title && (
                        <button
                          type="button"
                          onClick={() => setModalStageNames({ ...modalStageNames, [s.id]: s.title })}
                          title="Reset to default name"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #f1f5f9', backgroundColor: '#fafafa' }}>
              <button
                type="button"
                onClick={handleResetStages}
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '5px', 
                  padding: '7px 12px', 
                  borderRadius: '6px', 
                  border: '1px solid #e2e8f0', 
                  backgroundColor: '#fff', 
                  color: '#dc2626', 
                  fontWeight: 600, 
                  fontSize: '0.78rem', 
                  cursor: 'pointer' 
                }}
              >
                <RotateCcw size={12} /> Reset to Defaults
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsCustomizeModalOpen(false)}
                  style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveModalStageNames}
                  style={{ 
                    padding: '7px 16px', 
                    borderRadius: '6px', 
                    border: 'none', 
                    backgroundColor: '#4f46e5', 
                    color: '#ffffff', 
                    fontWeight: 600, 
                    fontSize: '0.8rem', 
                    cursor: 'pointer' 
                  }}
                >
                  Save Stage Names
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── 7. SCHEDULE & MANAGE FOLLOW-UP MODAL ─── */}
      {managingFollowUpLead && (
        <div 
          className="modal-backdrop" 
          style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} style={{ color: '#a78bfa' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700 }}>
                    Schedule Follow-up
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    {managingFollowUpLead.businessName || managingFollowUpLead.contactPerson} • Stage: {stages.find(s => s.id === (managingFollowUpLead.leadStage || 'New Lead'))?.title || managingFollowUpLead.leadStage || 'New Lead'}
                  </p>
                </div>
              </div>
              <button onClick={() => setManagingFollowUpLead(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Quick Presets */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                  Quick Presets
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setQuickFollowUpPreset(2, 0)}
                    className="fu-preset-btn"
                  >
                    ⚡ In 2 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickFollowUpPreset(0, 1, 11, 0)}
                    className="fu-preset-btn"
                  >
                    📅 Tomorrow 11 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickFollowUpPreset(0, 1, 16, 30)}
                    className="fu-preset-btn"
                  >
                    🕒 Tomorrow 4:30 PM
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickFollowUpPreset(0, 3, 11, 0)}
                    className="fu-preset-btn"
                  >
                    🗓️ In 3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickFollowUpPreset(0, 7, 11, 0)}
                    className="fu-preset-btn"
                  >
                    📆 Next Week
                  </button>
                </div>
              </div>

              {/* Date & Time Field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Follow-up Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={fuDateInput}
                  onChange={(e) => setFuDateInput(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', backgroundColor: '#f8fafc', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>

              {/* Type & Priority Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Follow-up Type
                  </label>
                  <select
                    value={fuTypeInput}
                    onChange={(e) => setFuTypeInput(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', backgroundColor: '#f8fafc', outline: 'none' }}
                  >
                    <option value="Call">📞 Outbound Call</option>
                    <option value="WhatsApp">💬 WhatsApp Follow-up</option>
                    <option value="Meeting">🤝 In-Person Meeting</option>
                    <option value="Email">✉️ Email Follow-up</option>
                    <option value="Sampling">📦 Sample Delivery / Feedback</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Priority
                  </label>
                  <select
                    value={fuPriorityInput}
                    onChange={(e) => setFuPriorityInput(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', backgroundColor: '#f8fafc', outline: 'none' }}
                  >
                    <option value="High">🔴 High (Hot Deal)</option>
                    <option value="Medium">🟡 Medium (Normal)</option>
                    <option value="Low">⚪ Low (Casual Check-in)</option>
                  </select>
                </div>
              </div>

              {/* Agenda / Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Agenda / Call Objective Notes
                </label>
                <textarea
                  placeholder="E.g. Discuss bulk pricing quote, confirm fabric sample selection, verify payment terms..."
                  value={fuNotesInput}
                  onChange={(e) => setFuNotesInput(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontFamily: 'inherit', resize: 'none', outline: 'none' }}
                />
              </div>

              {/* Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                {managingFollowUpLead.nextFollowUpDate ? (
                  <button
                    type="button"
                    disabled={fuLoading}
                    onClick={handleCompleteFollowUp}
                    style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #a7f3d0', backgroundColor: '#ecfdf5', color: '#065f46', fontWeight: 650, fontSize: '0.78rem', cursor: fuLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <CheckCircle2 size={13} /> Mark Done
                  </button>
                ) : (
                  <div></div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setManagingFollowUpLead(null)}
                    style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={fuLoading || !fuDateInput}
                    onClick={handleSaveFollowUp}
                    style={{ 
                      padding: '7px 16px', 
                      borderRadius: '6px', 
                      border: 'none', 
                      backgroundColor: '#4f46e5', 
                      color: '#ffffff', 
                      fontWeight: 600, 
                      fontSize: '0.8rem', 
                      cursor: fuLoading || !fuDateInput ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {fuLoading ? "Saving..." : "Save Follow-up"}
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ─── 8. DELETE JUNK LEAD CONFIRMATION MODAL ─── */}
      {leadToDelete && (
        <div 
          className="modal-backdrop" 
          style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ backgroundColor: '#dc2626', color: '#ffffff', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={18} />
                <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700 }}>
                  Delete Junk Lead
                </h3>
              </div>
              <button 
                onClick={() => !deletingLeadId && setLeadToDelete(null)} 
                disabled={!!deletingLeadId}
                style={{ background: 'none', border: 'none', color: '#fecaca', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#334155', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete this lead?
              </p>
              
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#991b1b' }}>
                  {leadToDelete.businessName || leadToDelete.contactPerson || 'Unnamed Lead'}
                </div>
                {(leadToDelete.mobile || leadToDelete.whatsappNumber) && (
                  <div style={{ fontSize: '0.78rem', color: '#b91c1c', marginTop: '2px' }}>
                    📞 {leadToDelete.mobile || leadToDelete.whatsappNumber}
                  </div>
                )}
                <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '4px', fontWeight: 600 }}>
                  Stage: New Lead • {leadToDelete.isLeadRecord ? 'Raw Lead Record' : 'Customer Record'}
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                This will permanently remove the lead, activity logs, and scheduled follow-ups. This action cannot be undone.
              </p>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  disabled={!!deletingLeadId}
                  onClick={() => setLeadToDelete(null)}
                  style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!!deletingLeadId}
                  onClick={handleConfirmDeleteLead}
                  style={{ 
                    padding: '7px 16px', 
                    borderRadius: '6px', 
                    border: 'none', 
                    backgroundColor: '#dc2626', 
                    color: '#ffffff', 
                    fontWeight: 600, 
                    fontSize: '0.8rem', 
                    cursor: deletingLeadId ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  {deletingLeadId ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={13} /> Delete Lead
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
