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
  deletePipelineLead,
  updateLeadCategory,
  updateLeadSource,
  savePipelineCategories,
  getPipelineCategories
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
  Loader2,
  Tag,
  Plus,
  Palette,
  Radio,
  Share2,
  Globe
} from 'lucide-react';
import SalesTargetTracker from './SalesTargetTracker';
import AddCustomerModal from '@/components/ui/AddCustomerModal';
import './KanbanBoard.css';

export interface StageCategory {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  bg?: string;
  border?: string;
}

export const DEFAULT_STAGE_CATEGORIES: StageCategory[] = [
  { id: 'Very Interested', label: 'Very Interested', icon: '🔥', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  { id: 'Less Interested', label: 'Less Interested', icon: '❄️', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
  { id: 'Big Deal', label: 'Big Deal', icon: '💎', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'Sample Order', label: 'Sample Order', icon: '📦', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
];

export interface LeadSourceOption {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
}

export const DEFAULT_LEAD_SOURCES: LeadSourceOption[] = [
  { id: 'WhatsApp', label: 'WhatsApp', icon: '📱', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  { id: 'Reference', label: 'Reference / Referral', icon: '👥', color: '#4338ca', bg: '#eef2ff', border: '#c7d2fe' },
  { id: 'IndiaMART', label: 'IndiaMART', icon: '📦', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
  { id: 'Website', label: 'Website Form', icon: '🌐', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'Meta Ads', label: 'Meta / Facebook Ads', icon: '📢', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'Instagram', label: 'Instagram Direct', icon: '📷', color: '#be185d', bg: '#fdf2f8', border: '#fbcfe8' },
  { id: 'JustDial', label: 'JustDial', icon: '💼', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  { id: 'Google Ads', label: 'Google Search / Ads', icon: '🔍', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  { id: 'Cold Call', label: 'Cold Call / Field Visit', icon: '🤝', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'Exhibition', label: 'Exhibition / Trade Fair', icon: '🏪', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  { id: 'Direct Inbound', label: 'Direct Inbound Call', icon: '📞', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  { id: 'Other', label: 'Other Source', icon: '🏷️', color: '#475569', bg: '#f8fafc', border: '#cbd5e1' },
];

export const STAGES = [
  { 
    id: 'New Lead', 
    title: 'New Lead', 
    stepNumber: 1,
    color: '#2563eb', 
    accentGradient: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)',
    headerBg: 'linear-gradient(180deg, #eff6ff 0%, #f8faff 100%)',
    bg: '#f8faff', 
    border: '#bfdbfe', 
    badgeBg: '#dbeafe',
    badgeColor: '#1d4ed8',
    glow: 'rgba(37, 99, 235, 0.28)',
    nextStep: 'Contacted', 
    nextActionLabel: 'Mark Contacted' 
  },
  { 
    id: 'Contacted', 
    title: 'Contacted', 
    stepNumber: 2,
    color: '#4f46e5', 
    accentGradient: 'linear-gradient(90deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)',
    headerBg: 'linear-gradient(180deg, #eef2ff 0%, #f9f9ff 100%)',
    bg: '#f9f9ff', 
    border: '#c7d2fe', 
    badgeBg: '#e0e7ff',
    badgeColor: '#4338ca',
    glow: 'rgba(79, 70, 229, 0.28)',
    nextStep: 'Qualified', 
    nextActionLabel: 'Qualify Lead' 
  },
  { 
    id: 'Qualified', 
    title: 'Qualified', 
    stepNumber: 3,
    color: '#7c3aed', 
    accentGradient: 'linear-gradient(90deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%)',
    headerBg: 'linear-gradient(180deg, #f5f3ff 0%, #faf8ff 100%)',
    bg: '#faf8ff', 
    border: '#ddd6fe', 
    badgeBg: '#ede9fe',
    badgeColor: '#6d28d9',
    glow: 'rgba(124, 58, 237, 0.28)',
    nextStep: 'Opportunity', 
    nextActionLabel: 'Move to Opportunity' 
  },
  { 
    id: 'Opportunity', 
    title: 'Opportunity', 
    stepNumber: 4,
    color: '#d97706', 
    accentGradient: 'linear-gradient(90deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)',
    headerBg: 'linear-gradient(180deg, #fffbeb 0%, #fffdf5 100%)',
    bg: '#fffdf5', 
    border: '#fde68a', 
    badgeBg: '#fef3c7',
    badgeColor: '#b45309',
    glow: 'rgba(217, 119, 6, 0.28)',
    nextStep: 'Won', 
    nextActionLabel: 'Close & Win Deal' 
  },
  { 
    id: 'Won', 
    title: 'Won', 
    stepNumber: 5,
    color: '#059669', 
    accentGradient: 'linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%)',
    headerBg: 'linear-gradient(180deg, #ecfdf5 0%, #f4fdf8 100%)',
    bg: '#f4fdf8', 
    border: '#a7f3d0', 
    badgeBg: '#d1fae5',
    badgeColor: '#047857',
    glow: 'rgba(5, 150, 105, 0.28)',
    nextStep: null, 
    nextActionLabel: 'Deal Won' 
  },
  { 
    id: 'Lost', 
    title: 'Lost', 
    stepNumber: 6,
    color: '#dc2626', 
    accentGradient: 'linear-gradient(90deg, #dc2626 0%, #ef4444 50%, #f87171 100%)',
    headerBg: 'linear-gradient(180deg, #fef2f2 0%, #fff8f8 100%)',
    bg: '#fff8f8', 
    border: '#fecaca', 
    badgeBg: '#fee2e2',
    badgeColor: '#b91c1c',
    glow: 'rgba(220, 38, 38, 0.28)',
    nextStep: null, 
    nextActionLabel: 'Lost' 
  },
];

export const getStageIcon = (stageId: string, size = 12) => {
  switch (stageId) {
    case 'New Lead':
      return <Sparkles size={size} />;
    case 'Contacted':
      return <MessageSquare size={size} />;
    case 'Qualified':
      return <Target size={size} />;
    case 'Opportunity':
      return <TrendingUp size={size} />;
    case 'Won':
      return <Award size={size} />;
    case 'Lost':
      return <RotateCcw size={size} />;
    default:
      return <Sparkles size={size} />;
  }
};

interface KanbanBoardProps {
  initialLeads: any[];
  employees?: any[];
  initialStageTitles?: Record<string, string>;
  initialCategories?: StageCategory[];
}

export default function KanbanBoard({ initialLeads, employees = [], initialStageTitles = {}, initialCategories = [] }: KanbanBoardProps) {
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
  
  // Stage Intent Categories & Customization
  const [categories, setCategories] = useState<StageCategory[]>(initialCategories && initialCategories.length > 0 ? initialCategories : DEFAULT_STAGE_CATEGORIES);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [activeCategoryPickerLeadId, setActiveCategoryPickerLeadId] = useState<string | null>(null);

  // Lead Acquisition Source State
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('ALL');
  const [activeSourcePickerLeadId, setActiveSourcePickerLeadId] = useState<string | null>(null);
  const [customReferenceInput, setCustomReferenceInput] = useState<string>('');

  // Customize Modal State
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [customizeModalTab, setCustomizeModalTab] = useState<'STAGES' | 'CATEGORIES'>('STAGES');
  const [modalStageNames, setModalStageNames] = useState<Record<string, string>>({});
  const [modalCategories, setModalCategories] = useState<StageCategory[]>([]);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🔥');
  const [newCatColor, setNewCatColor] = useState('#7c3aed');

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

  // Close floating popovers on click outside
  useEffect(() => {
    const handleWindowClick = () => {
      setActiveCategoryPickerLeadId(null);
      setActiveSourcePickerLeadId(null);
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // Load custom stage names & categories from props, localStorage, and server action
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

    if (initialCategories && initialCategories.length > 0) {
      setCategories(initialCategories);
      try {
        localStorage.setItem('crm_pipeline_categories', JSON.stringify(initialCategories));
      } catch (e) {}
    } else {
      try {
        const savedCats = localStorage.getItem('crm_pipeline_categories');
        if (savedCats) {
          const parsedCats = JSON.parse(savedCats);
          if (Array.isArray(parsedCats) && parsedCats.length > 0) {
            setCategories(parsedCats);
          }
        }
      } catch (e) {}

      getPipelineCategories().then(res => {
        if (res?.success && res.categories && res.categories.length > 0) {
          setCategories(res.categories);
          try {
            localStorage.setItem('crm_pipeline_categories', JSON.stringify(res.categories));
          } catch (e) {}
        }
      }).catch(() => {});
    }
  }, [initialStageTitles, initialCategories]);

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

    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

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

  // Category counts across leads
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: leads.length, UNCATEGORIZED: 0, TAGGED: 0 };
    categories.forEach(c => { counts[c.id] = 0; });

    leads.forEach(l => {
      const tag = (l.tags || l.category || '').trim();
      if (!tag) {
        counts.UNCATEGORIZED = (counts.UNCATEGORIZED || 0) + 1;
      } else {
        counts.TAGGED = (counts.TAGGED || 0) + 1;
        const matched = categories.find(c => c.id.toLowerCase() === tag.toLowerCase() || c.label.toLowerCase() === tag.toLowerCase());
        if (matched) {
          counts[matched.id] = (counts[matched.id] || 0) + 1;
        } else {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      }
    });

    return counts;
  }, [leads, categories]);

  // Handle setting/changing lead category
  const handleSetLeadCategory = async (leadId: string, category: string | null, isLeadRecord: boolean = false) => {
    setLeads(prevLeads => prevLeads.map(l => l.id === leadId ? { 
      ...l, 
      tags: category || null,
      category: category || null
    } : l));
    setActiveCategoryPickerLeadId(null);

    const res = await updateLeadCategory(leadId, category, isLeadRecord);
    if (res?.error) {
      alert("Failed to save intent category: " + res.error);
    } else if (res?.customerId && res.customerId !== leadId) {
      setLeads(prevLeads => prevLeads.map(l => l.id === leadId ? { 
        ...l, 
        id: res.customerId,
        isLeadRecord: false,
        tags: category || null,
        category: category || null
      } : l));
    }
  };

  // Lead Source counts across leads
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: leads.length, NONE: 0, SET: 0 };
    DEFAULT_LEAD_SOURCES.forEach(s => { counts[s.id] = 0; });

    leads.forEach(l => {
      const src = (l.source || '').trim();
      if (!src) {
        counts.NONE = (counts.NONE || 0) + 1;
      } else {
        counts.SET = (counts.SET || 0) + 1;
        const matched = DEFAULT_LEAD_SOURCES.find(s => 
          s.id.toLowerCase() === src.toLowerCase() || 
          s.label.toLowerCase() === src.toLowerCase() ||
          src.toLowerCase().startsWith(s.id.toLowerCase())
        );
        if (matched) {
          counts[matched.id] = (counts[matched.id] || 0) + 1;
        } else {
          counts[src] = (counts[src] || 0) + 1;
        }
      }
    });

    return counts;
  }, [leads]);

  // Handle setting/changing lead source
  const handleSetLeadSource = async (leadId: string, source: string | null, isLeadRecord: boolean = false) => {
    setLeads(prevLeads => prevLeads.map(l => l.id === leadId ? { 
      ...l, 
      source: source || null
    } : l));
    setActiveSourcePickerLeadId(null);
    setCustomReferenceInput('');

    const res = await updateLeadSource(leadId, source, isLeadRecord);
    if (res?.error) {
      alert("Failed to save lead source: " + res.error);
    } else if (res?.customerId && res.customerId !== leadId) {
      setLeads(prevLeads => prevLeads.map(l => l.id === leadId ? { 
        ...l, 
        id: res.customerId,
        isLeadRecord: false,
        source: source || null
      } : l));
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
    setModalCategories([...categories]);
    setNewCatLabel('');
    setCustomizeModalTab('STAGES');
    setIsCustomizeModalOpen(true);
  };

  // Add new category in customize modal
  const handleAddModalCategory = () => {
    if (!newCatLabel.trim()) return;
    const catId = newCatLabel.trim();
    if (modalCategories.some(c => c.id.toLowerCase() === catId.toLowerCase() || c.label.toLowerCase() === catId.toLowerCase())) {
      alert("A category with this name already exists");
      return;
    }

    const paletteMap: Record<string, { bg: string; border: string }> = {
      '#dc2626': { bg: '#fef2f2', border: '#fecaca' },
      '#2563eb': { bg: '#eff6ff', border: '#bfdbfe' },
      '#4f46e5': { bg: '#eef2ff', border: '#c7d2fe' },
      '#7c3aed': { bg: '#f5f3ff', border: '#ddd6fe' },
      '#d97706': { bg: '#fffbeb', border: '#fde68a' },
      '#059669': { bg: '#ecfdf5', border: '#a7f3d0' },
      '#475569': { bg: '#f1f5f9', border: '#cbd5e1' },
      '#e11d48': { bg: '#fff1f2', border: '#fecdd3' },
      '#0891b2': { bg: '#ecfeff', border: '#a5f3fc' },
    };

    const colors = paletteMap[newCatColor] || { bg: '#f1f5f9', border: '#cbd5e1' };

    const newCat: StageCategory = {
      id: catId,
      label: catId,
      icon: newCatIcon || '🏷️',
      color: newCatColor,
      bg: colors.bg,
      border: colors.border
    };

    setModalCategories([...modalCategories, newCat]);
    setNewCatLabel('');
  };

  const handleDeleteModalCategory = (id: string) => {
    setModalCategories(modalCategories.filter(c => c.id !== id));
  };

  const handleResetModalCategories = () => {
    setModalCategories([...DEFAULT_STAGE_CATEGORIES]);
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
    setCategories(modalCategories);
    setIsCustomizeModalOpen(false);

    try {
      localStorage.setItem('crm_pipeline_stage_names', JSON.stringify(newTitles));
      localStorage.setItem('crm_pipeline_categories', JSON.stringify(modalCategories));
    } catch (e) {
      console.error('Failed to save stage/category names', e);
    }

    await Promise.all([
      savePipelineStageNames(newTitles),
      savePipelineCategories(modalCategories)
    ]);
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

      const leadCat = (l.tags || l.category || '').trim();
      const matchesCat = 
        selectedCategoryFilter === 'ALL' ||
        (selectedCategoryFilter === 'TAGGED' ? !!leadCat :
        (selectedCategoryFilter === 'UNCATEGORIZED' ? !leadCat :
        (leadCat.toLowerCase() === selectedCategoryFilter.toLowerCase())));

      const leadSrc = (l.source || '').trim();
      const matchesSrc = 
        selectedSourceFilter === 'ALL' ||
        (selectedSourceFilter === 'SET' ? !!leadSrc :
        (selectedSourceFilter === 'NONE' ? !leadSrc :
        (leadSrc.toLowerCase().includes(selectedSourceFilter.toLowerCase()) ||
         selectedSourceFilter.toLowerCase().includes(leadSrc.toLowerCase()))));

      return matchesSearch && matchesRep && matchesFu && matchesCat && matchesSrc;
    });

    // Sorting
    result.sort((a, b) => {
      const valA = a.computedDealValue || a.expectedValue || 0;
      const valB = b.computedDealValue || b.expectedValue || 0;
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();

      if (sortBy === 'VALUE_HIGH') {
        if (valB !== valA) return valB - valA;
        return timeB - timeA;
      }
      if (sortBy === 'VALUE_LOW') {
        if (valA !== valB) return valA - valB;
        return timeB - timeA;
      }
      if (sortBy === 'NAME') {
        const nameA = (a.businessName || a.contactPerson || '').toLowerCase();
        const nameB = (b.businessName || b.contactPerson || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'NEWEST') {
        return timeB - timeA;
      }
      return timeB - timeA;
    });

    return result;
  }, [leads, searchQuery, selectedRepFilter, followUpFilter, selectedCategoryFilter, selectedSourceFilter, sortBy]);

  const activeStageConfig = stages.find(s => s.id === activeStage) || stages[1];
  const activeStageLeads = filteredLeads.filter(l => (l.leadStage || 'New Lead') === activeStage);
  const activeStageTotalValue = activeStageLeads.reduce((sum, l) => sum + (l.computedDealValue || l.expectedValue || 0), 0);

  // Handlers
  const handleStageChange = async (leadId: string, targetStage: string) => {
    const previousLeads = [...leads];
    const nowIso = new Date().toISOString();
    
    // Put updated lead at the top of the array with fresh updatedAt timestamp
    const targetLead = leads.find(l => l.id === leadId);
    if (targetLead) {
      const updatedLead = { ...targetLead, leadStage: targetStage, updatedAt: nowIso };
      setLeads([updatedLead, ...leads.filter(l => l.id !== leadId)]);
    }

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
    const previousLeads = [...leads];
    const targetLead = advancingLead;
    setAdvancingLoading(true);

    const nowIso = new Date().toISOString();
    const updatedLead = { ...targetLead, leadStage: advanceNextStage, updatedAt: nowIso };
    
    // Optimistically put updated lead at the top of the list
    setLeads([updatedLead, ...leads.filter(l => l.id !== targetLead.id)]);

    const res = await advanceLeadStep(
      targetLead.id, 
      advanceNextStage, 
      advanceNotes, 
      advanceFollowUp || undefined
    );

    setAdvancingLoading(false);

    if (res.success) {
      setAdvancingLead(null);
    } else {
      alert(res.error || "Failed to advance lead step");
      setLeads(previousLeads);
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
    const leadCategory = (lead.tags || lead.category || '').trim();
    const currentCatObj = categories.find(c => c.id.toLowerCase() === leadCategory.toLowerCase() || c.label.toLowerCase() === leadCategory.toLowerCase());
    const leadSource = (lead.source || '').trim();
    const currentSrcObj = DEFAULT_LEAD_SOURCES.find(s => 
      s.id.toLowerCase() === leadSource.toLowerCase() || 
      s.label.toLowerCase() === leadSource.toLowerCase() ||
      leadSource.toLowerCase().startsWith(s.id.toLowerCase())
    );

    const hasActivePopover = activeCategoryPickerLeadId === lead.id || activeSourcePickerLeadId === lead.id;

    return (
      <div 
        key={lead.id}
        className={`deal-box ${hasActivePopover ? 'has-active-popover' : ''}`}
        style={hasActivePopover ? { zIndex: 100 } : undefined}
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

        {/* Row 2.2: Customer Category / Intent & Lead Source Tags Row */}
        <div className="deal-tags-row">
          {/* Customer Category / Intent Chip */}
          <div className="deal-cat-container" onClick={(e) => e.stopPropagation()}>
            {leadCategory ? (
              <div 
                className="deal-cat-chip"
                style={{
                  backgroundColor: currentCatObj?.bg || '#f1f5f9',
                  color: currentCatObj?.color || '#334155',
                  borderColor: currentCatObj?.border || '#cbd5e1'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSourcePickerLeadId(null);
                  setActiveCategoryPickerLeadId(activeCategoryPickerLeadId === lead.id ? null : lead.id);
                }}
                title="Click to change customer category / intent"
              >
                <span className="deal-cat-chip-icon">{currentCatObj?.icon || '🏷️'}</span>
                <span className="deal-cat-chip-label">{currentCatObj?.label || leadCategory}</span>
                <Tag size={9} style={{ opacity: 0.6, marginLeft: '2px' }} />
              </div>
            ) : (
              ((lead.leadStage || 'New Lead') === 'Qualified' || activeCategoryPickerLeadId === lead.id) ? (
                <button
                  type="button"
                  className="deal-cat-add-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSourcePickerLeadId(null);
                    setActiveCategoryPickerLeadId(activeCategoryPickerLeadId === lead.id ? null : lead.id);
                  }}
                  title="Categorize customer intent (Very Interested, Big Deal, Sample Order...)"
                >
                  <Sparkles size={10} style={{ color: '#7c3aed' }} />
                  <span>+ Intent</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="deal-cat-ghost-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSourcePickerLeadId(null);
                    setActiveCategoryPickerLeadId(activeCategoryPickerLeadId === lead.id ? null : lead.id);
                  }}
                  title="Categorize customer intent"
                >
                  <Tag size={9} />
                  <span>+ Intent</span>
                </button>
              )
            )}
          </div>

          {/* Lead Source Chip */}
          <div className="deal-src-container" onClick={(e) => e.stopPropagation()}>
            {leadSource ? (
              <div 
                className="deal-src-chip"
                style={{
                  backgroundColor: currentSrcObj?.bg || '#eff6ff',
                  color: currentSrcObj?.color || '#1d4ed8',
                  borderColor: currentSrcObj?.border || '#bfdbfe'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveCategoryPickerLeadId(null);
                  setActiveSourcePickerLeadId(activeSourcePickerLeadId === lead.id ? null : lead.id);
                  setCustomReferenceInput(leadSource);
                }}
                title={`Lead Source: ${leadSource}. Click to change.`}
              >
                <span className="deal-src-chip-icon">{currentSrcObj?.icon || '📡'}</span>
                <span className="deal-src-chip-label">{leadSource}</span>
                <Globe size={9} style={{ opacity: 0.6, marginLeft: '2px' }} />
              </div>
            ) : (
              ((lead.leadStage || 'New Lead') === 'New Lead' || activeSourcePickerLeadId === lead.id) ? (
                <button
                  type="button"
                  className="deal-src-add-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCategoryPickerLeadId(null);
                    setActiveSourcePickerLeadId(activeSourcePickerLeadId === lead.id ? null : lead.id);
                    setCustomReferenceInput('');
                  }}
                  title="Specify Lead Source / Reference"
                >
                  <Radio size={10} style={{ color: '#2563eb' }} />
                  <span>+ Source</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="deal-src-ghost-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCategoryPickerLeadId(null);
                    setActiveSourcePickerLeadId(activeSourcePickerLeadId === lead.id ? null : lead.id);
                    setCustomReferenceInput('');
                  }}
                  title="Add Lead Source / Reference"
                >
                  <Globe size={9} />
                  <span>+ Source</span>
                </button>
              )
            )}
          </div>

          {/* Floating Category Picker Popover */}
          {activeCategoryPickerLeadId === lead.id && (
            <div className="deal-cat-popover" onClick={(e) => e.stopPropagation()}>
              <div className="deal-cat-popover-header">
                <span className="deal-cat-popover-title">Select Customer Intent</span>
                <button 
                  type="button" 
                  onClick={() => setActiveCategoryPickerLeadId(null)}
                  className="deal-cat-popover-close"
                >
                  <X size={12} />
                </button>
              </div>

              <div className="deal-cat-popover-list">
                {categories.map(cat => {
                  const isSelected = leadCategory.toLowerCase() === cat.id.toLowerCase() || leadCategory.toLowerCase() === cat.label.toLowerCase();
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`deal-cat-popover-item ${isSelected ? 'selected' : ''}`}
                      style={isSelected ? {
                        backgroundColor: cat.bg,
                        borderColor: cat.border,
                        color: cat.color
                      } : {}}
                      onClick={() => handleSetLeadCategory(lead.id, cat.id, !!lead.isLeadRecord)}
                    >
                      <span className="cat-item-icon">{cat.icon || '🏷️'}</span>
                      <span className="cat-item-label">{cat.label}</span>
                      {isSelected && <Check size={12} className="cat-item-check" />}
                    </button>
                  );
                })}

                {leadCategory && (
                  <button
                    type="button"
                    className="deal-cat-popover-clear"
                    onClick={() => handleSetLeadCategory(lead.id, null, !!lead.isLeadRecord)}
                  >
                    <X size={11} /> Remove Category Tag
                  </button>
                )}
              </div>

              <div className="deal-cat-popover-footer">
                <button
                  type="button"
                  className="deal-cat-popover-manage-btn"
                  onClick={() => {
                    setActiveCategoryPickerLeadId(null);
                    handleOpenCustomizeModal();
                    setCustomizeModalTab('CATEGORIES');
                  }}
                >
                  <SlidersHorizontal size={11} /> Customize Options
                </button>
              </div>
            </div>
          )}

          {/* Floating Lead Source Picker Popover */}
          {activeSourcePickerLeadId === lead.id && (
            <div className="deal-src-popover" onClick={(e) => e.stopPropagation()}>
              <div className="deal-src-popover-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Radio size={13} style={{ color: '#2563eb' }} />
                  <span className="deal-src-popover-title">Lead Source & Reference</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setActiveSourcePickerLeadId(null)}
                  className="deal-src-popover-close"
                >
                  <X size={12} />
                </button>
              </div>

              {/* Predefined Quick Sources List (1-column full readable layout) */}
              <div className="deal-src-popover-list">
                {DEFAULT_LEAD_SOURCES.map(src => {
                  const isSelected = leadSource.toLowerCase() === src.id.toLowerCase() || 
                                     leadSource.toLowerCase() === src.label.toLowerCase() ||
                                     leadSource.toLowerCase().startsWith(src.id.toLowerCase());
                  return (
                    <button
                      key={src.id}
                      type="button"
                      className={`deal-src-popover-item ${isSelected ? 'selected' : ''}`}
                      style={isSelected ? {
                        backgroundColor: src.bg,
                        borderColor: src.border,
                        color: src.color
                      } : {}}
                      onClick={() => handleSetLeadSource(lead.id, src.id, !!lead.isLeadRecord)}
                    >
                      <span className="src-item-icon">{src.icon}</span>
                      <span className="src-item-label">{src.label}</span>
                      {isSelected && <Check size={12} className="src-item-check" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom / Reference Input Section */}
              <div className="deal-src-custom-box">
                <div className="deal-src-custom-label">
                  <Share2 size={11} style={{ color: '#4338ca' }} />
                  <span>Reference / Referral / Custom:</span>
                </div>
                <div className="deal-src-custom-input-row">
                  <input
                    type="text"
                    placeholder="e.g. Ref: Sharmaji, Ramesh..."
                    value={customReferenceInput}
                    onChange={(e) => setCustomReferenceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customReferenceInput.trim()) {
                        handleSetLeadSource(lead.id, customReferenceInput.trim(), !!lead.isLeadRecord);
                      }
                    }}
                    className="deal-src-custom-input"
                  />
                  <button
                    type="button"
                    disabled={!customReferenceInput.trim()}
                    onClick={() => {
                      if (customReferenceInput.trim()) {
                        handleSetLeadSource(lead.id, customReferenceInput.trim(), !!lead.isLeadRecord);
                      }
                    }}
                    className="deal-src-custom-save-btn"
                  >
                    Save
                  </button>
                </div>
              </div>

              {leadSource && (
                <div className="deal-src-popover-footer">
                  <button
                    type="button"
                    className="deal-src-popover-clear"
                    onClick={() => handleSetLeadSource(lead.id, null, !!lead.isLeadRecord)}
                  >
                    <X size={11} /> Remove Source Tag
                  </button>
                </div>
              )}
            </div>
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
          {/* ─── 1. TOP EXECUTIVE PIPELINE METRICS ─── */}
          <div className="pipeline-metrics-bar">
            {/* Card 1: Total Deals */}
            <div className="pipeline-metric-card">
              <div className="pipeline-metric-top">
                <div className="pipeline-metric-left">
                  <div className="pipeline-metric-icon blue">
                    <Layers size={16} />
                  </div>
                  <span className="pipeline-metric-label">Total Deals</span>
                </div>
                <span className="pipeline-metric-badge blue">
                  {openLeads.length} Active
                </span>
              </div>
              <div className="pipeline-metric-val">
                {leads.length}
              </div>
              <div className="pipeline-metric-footer">
                <span><strong>{openLeads.length}</strong> active in sales workflow</span>
              </div>
            </div>

            {/* Card 2: Open Pipeline Value */}
            <div className="pipeline-metric-card">
              <div className="pipeline-metric-top">
                <div className="pipeline-metric-left">
                  <div className="pipeline-metric-icon indigo">
                    <TrendingUp size={16} />
                  </div>
                  <span className="pipeline-metric-label">Pipeline Value</span>
                </div>
                <span className="pipeline-metric-badge indigo">
                  Funnel
                </span>
              </div>
              <div className="pipeline-metric-val" style={{ color: '#4f46e5' }}>
                {formatCurrency(totalOpenValue)}
              </div>
              <div className="pipeline-metric-footer">
                <span>Avg ~<strong>{formatCurrency(avgDealSize)}</strong> / active deal</span>
              </div>
            </div>

            {/* Card 3: Deals Won & Win Rate */}
            <div className="pipeline-metric-card">
              <div className="pipeline-metric-top">
                <div className="pipeline-metric-left">
                  <div className="pipeline-metric-icon emerald">
                    <Award size={16} />
                  </div>
                  <span className="pipeline-metric-label">Won Revenue</span>
                </div>
                <span className="pipeline-metric-badge emerald">
                  {winRate}% Win Rate
                </span>
              </div>
              <div className="pipeline-metric-val" style={{ color: '#059669' }}>
                {formatCurrency(wonValue)}
              </div>
              <div className="pipeline-metric-footer">
                <span><strong>{wonLeads.length} deals</strong> successfully closed</span>
              </div>
            </div>

            {/* Card 4: Follow-up Cadence & Overdue */}
            <div className="pipeline-metric-card">
              <div className="pipeline-metric-top">
                <div className="pipeline-metric-left">
                  <div className={`pipeline-metric-icon ${fuCounts.overdue > 0 ? 'red' : 'purple'}`}>
                    <CalendarClock size={16} />
                  </div>
                  <span className="pipeline-metric-label">Follow-up Due</span>
                </div>
                {fuCounts.overdue > 0 ? (
                  <span className="pipeline-metric-badge red">
                    {fuCounts.overdue} Overdue
                  </span>
                ) : (
                  <span className="pipeline-metric-badge purple">
                    On Schedule
                  </span>
                )}
              </div>
              <div className="pipeline-metric-val" style={{ color: fuCounts.overdue > 0 ? '#dc2626' : '#0f172a' }}>
                {fuCounts.today + fuCounts.overdue}
              </div>
              <div className="pipeline-metric-footer">
                <span><strong>{fuCounts.today}</strong> due today • <strong>{fuCounts.upcoming}</strong> upcoming</span>
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

            {/* Category / Customer Intent Filter */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="filter-select-input"
              style={selectedCategoryFilter !== 'ALL' ? {
                borderColor: '#7c3aed',
                backgroundColor: '#f5f3ff',
                color: '#6d28d9',
                fontWeight: 700
              } : {}}
            >
              <option value="ALL">All Categories ({leads.length} Deals)</option>
              {categoryCounts.TAGGED > 0 && (
                <option value="TAGGED">✨ Any Tagged Intent ({categoryCounts.TAGGED})</option>
              )}
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon || '🏷️'} {cat.label} ({categoryCounts[cat.id] || 0})
                </option>
              ))}
              <option value="UNCATEGORIZED">⚪ Uncategorized ({categoryCounts.UNCATEGORIZED || 0})</option>
            </select>

            {/* Lead Source Filter */}
            <select
              value={selectedSourceFilter}
              onChange={(e) => setSelectedSourceFilter(e.target.value)}
              className="filter-select-input"
              style={selectedSourceFilter !== 'ALL' ? {
                borderColor: '#2563eb',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                fontWeight: 700
              } : {}}
            >
              <option value="ALL">All Lead Sources ({leads.length})</option>
              {sourceCounts.SET > 0 && (
                <option value="SET">📡 Any Tagged Source ({sourceCounts.SET})</option>
              )}
              {DEFAULT_LEAD_SOURCES.map(src => (
                <option key={src.id} value={src.id}>
                  {src.icon} {src.label} ({sourceCounts[src.id] || 0})
                </option>
              ))}
              <option value="NONE">⚪ No Source Specified ({sourceCounts.NONE || 0})</option>
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
              title="Customize pipeline stage names and customer intent categories"
            >
              <SlidersHorizontal size={13} />
              <span>Customize Pipeline</span>
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
              {stages.map((stage, idx) => {
                const stageLeads = filteredLeads.filter(l => (l.leadStage || 'New Lead') === stage.id);
                const stageVal = stageLeads.reduce((sum, l) => sum + (l.computedDealValue || l.expectedValue || 0), 0);

                return (
                  <div 
                    key={stage.id}
                    className="kanban-col"
                    style={{
                      borderColor: stage.border,
                      backgroundColor: stage.bg
                    }}
                  >
                    {/* Top Accent Gradient Ribbon */}
                    <div 
                      className="col-top-accent-bar" 
                      style={{ background: stage.accentGradient || stage.color }}
                    />

                    {/* Column Header */}
                    <div 
                      className="kanban-col-header"
                      style={{
                        background: stage.headerBg || '#ffffff',
                        borderBottom: `1.5px solid ${stage.border || '#e2e8f0'}`
                      }}
                    >
                      <div className="col-header-left">
                        {/* Creative Illuminated Stage Icon Chip */}
                        <div 
                          className="col-stage-icon-chip"
                          style={{
                            backgroundColor: stage.badgeBg,
                            borderColor: stage.border,
                            color: stage.badgeColor || stage.color,
                            boxShadow: `0 2px 6px ${stage.glow || 'rgba(0,0,0,0.06)'}`
                          }}
                          title={`Stage ${idx + 1}: ${stage.title}`}
                        >
                          {getStageIcon(stage.id, 12)}
                        </div>
                        
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
                              style={{ borderColor: stage.color }}
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
                              <Edit2 size={11} />
                            </span>
                          </div>
                        )}

                        <span 
                          className="col-badge" 
                          style={{ 
                            backgroundColor: stage.badgeBg, 
                            color: stage.badgeColor || stage.color, 
                            borderColor: stage.border,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                          }}
                        >
                          {stageLeads.length}
                        </span>
                      </div>

                      {/* Stage Total Revenue Pill */}
                      <div 
                        className={`col-sum-pill ${stageVal > 0 ? 'has-value' : 'is-zero'}`}
                        style={stageVal > 0 ? {
                          color: stage.color,
                          backgroundColor: stage.badgeBg,
                          borderColor: stage.border,
                          boxShadow: `0 2px 6px ${stage.glow || 'rgba(0,0,0,0.06)'}`
                        } : undefined}
                        title={`Total ${stage.title} value: ${formatCurrency(stageVal)}`}
                      >
                        <span>{formatCurrency(stageVal)}</span>
                      </div>
                    </div>

                    {/* Column Cards Container */}
                    <div className="kanban-col-cards">
                      {stageLeads.length > 0 ? (
                        stageLeads.map(lead => renderLeadCard(lead, true))
                      ) : (
                        <div className="empty-col-state">
                          <Inbox size={22} style={{ color: stage.color, opacity: 0.35 }} />
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
              borderRadius: '14px', 
              border: '1px solid #e2e8f0', 
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
            }}>
              {/* Horizontal Stepper */}
              <div className="stage-flow-tabs" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {stages.map((stage, idx) => {
                  const stageLeads = filteredLeads.filter(l => (l.leadStage || 'New Lead') === stage.id);
                  const count = stageLeads.length;
                  const stageVal = stageLeads.reduce((sum, l) => sum + (l.computedDealValue || l.expectedValue || 0), 0);
                  const isSelected = activeStage === stage.id;

                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => setActiveStage(stage.id)}
                      className={`stage-flow-step-btn ${isSelected ? 'is-active' : ''}`}
                      style={{
                        padding: '8px 15px',
                        borderRadius: '9px',
                        border: isSelected ? `1.5px solid ${stage.color}` : `1px solid ${stage.border}`,
                        backgroundColor: isSelected ? stage.badgeBg : '#ffffff',
                        color: isSelected ? stage.color : '#334155',
                        fontSize: '0.84rem',
                        fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
                        fontWeight: isSelected ? 800 : 700,
                        letterSpacing: '-0.015em',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        boxShadow: isSelected ? `0 2px 8px ${stage.glow || 'rgba(0,0,0,0.08)'}, 0 0 0 1px ${stage.color}` : '0 1px 2px rgba(0,0,0,0.02)'
                      }}
                    >
                      <span 
                        style={{ 
                          width: '18px', 
                          height: '18px', 
                          borderRadius: '5px', 
                          backgroundColor: isSelected ? stage.color : stage.badgeBg,
                          color: isSelected ? '#ffffff' : (stage.badgeColor || stage.color),
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isSelected ? `0 0 6px ${stage.color}` : 'none'
                        }}
                      >
                        {getStageIcon(stage.id, 10)}
                      </span>
                      <span style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif", fontWeight: 800 }}>{stage.title}</span>
                      <span style={{ 
                        fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
                        backgroundColor: isSelected ? stage.color : stage.badgeBg, 
                        color: isSelected ? '#ffffff' : (stage.badgeColor || stage.color),
                        padding: '1.5px 7px', 
                        borderRadius: '9999px', 
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        letterSpacing: '0.01em',
                        border: `1px solid ${isSelected ? 'transparent' : stage.border}`
                      }}>
                        {count}
                      </span>
                      {stageVal > 0 && (
                        <span style={{ 
                          fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
                          fontSize: '0.74rem', 
                          fontWeight: 800,
                          letterSpacing: '-0.015em',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.85)' : '#ecfdf5',
                          color: isSelected ? stage.color : '#059669',
                          border: `1px solid ${isSelected ? stage.border : '#a7f3d0'}`
                        }}>
                          {formatCurrency(stageVal)}
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
                padding: '12px 16px', 
                background: activeStageConfig.headerBg || '#f8fafc', 
                borderRadius: '10px', 
                border: `1.5px solid ${activeStageConfig.border || '#e2e8f0'}`,
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div 
                    className="col-stage-icon-chip"
                    style={{
                      backgroundColor: activeStageConfig.badgeBg,
                      borderColor: activeStageConfig.border,
                      color: activeStageConfig.badgeColor || activeStageConfig.color,
                      boxShadow: `0 2px 8px ${activeStageConfig.glow || 'rgba(0,0,0,0.1)'}`
                    }}
                  >
                    {getStageIcon(activeStageConfig.id, 13)}
                  </div>
                  <span style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '0.94rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
                    {activeStageConfig.title} Stage
                  </span>
                  <span 
                    style={{ 
                      fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
                      fontSize: '0.74rem', 
                      fontWeight: 800, 
                      backgroundColor: activeStageConfig.badgeBg, 
                      color: activeStageConfig.badgeColor || activeStageConfig.color, 
                      padding: '2.5px 9px', 
                      borderRadius: '9999px',
                      border: `1.5px solid ${activeStageConfig.border}`,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                  >
                    {activeStageLeads.length} Deals
                  </span>
                </div>
                <div 
                  className="col-sum-pill has-value"
                  style={{
                    color: activeStageConfig.color,
                    backgroundColor: activeStageConfig.badgeBg,
                    borderColor: activeStageConfig.border,
                    fontSize: '0.82rem',
                    padding: '4px 12px',
                    boxShadow: `0 2px 6px ${activeStageConfig.glow || 'rgba(0,0,0,0.06)'}`
                  }}
                >
                  <span>Total Value: {formatCurrency(activeStageTotalValue)}</span>
                </div>
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
                    backgroundColor: '#059669', 
                    color: '#ffffff', 
                    fontWeight: 600, 
                    fontSize: '0.8rem', 
                    cursor: advancingLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
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

      {/* ─── 6. CUSTOMIZE PIPELINE & CATEGORIES MODAL ─── */}
      {isCustomizeModalOpen && (
        <div 
          className="modal-backdrop" 
          style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '560px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            
            {/* Modal Header */}
            <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={16} style={{ color: '#818cf8' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700 }}>
                    Customize Pipeline Settings
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Configure pipeline stage names and customer intent categories
                  </p>
                </div>
              </div>
              <button onClick={() => setIsCustomizeModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '6px 14px 0 14px', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setCustomizeModalTab('STAGES')}
                style={{
                  padding: '8px 14px',
                  border: 'none',
                  borderBottom: customizeModalTab === 'STAGES' ? '2px solid #4f46e5' : '2px solid transparent',
                  background: 'none',
                  color: customizeModalTab === 'STAGES' ? '#4f46e5' : '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Layers size={14} /> Stage Names ({STAGES.length})
              </button>
              <button
                type="button"
                onClick={() => setCustomizeModalTab('CATEGORIES')}
                style={{
                  padding: '8px 14px',
                  border: 'none',
                  borderBottom: customizeModalTab === 'CATEGORIES' ? '2px solid #7c3aed' : '2px solid transparent',
                  background: 'none',
                  color: customizeModalTab === 'CATEGORIES' ? '#7c3aed' : '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Tag size={14} /> Intent Categories ({modalCategories.length})
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '60vh', overflowY: 'auto' }}>
              
              {customizeModalTab === 'STAGES' ? (
                /* STAGE NAMES TAB */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Rename default pipeline stages to fit your sales workflow:
                  </p>
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
              ) : (
                /* INTENT CATEGORIES TAB */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                    Define customer intent & deal categories (e.g. <strong>Very Interested</strong>, <strong>Less Interested</strong>, <strong>Big Deal</strong>, <strong>Sample Order</strong>). These can be assigned on cards in the <strong>Interested</strong> stage and filtered in the toolbar.
                  </div>

                  {/* Existing Categories List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                      Active Categories ({modalCategories.length})
                    </label>
                    {modalCategories.map((cat) => (
                      <div 
                        key={cat.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          backgroundColor: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              backgroundColor: cat.bg || '#f1f5f9',
                              color: cat.color || '#334155',
                              border: `1px solid ${cat.border || '#cbd5e1'}`
                            }}
                          >
                            <span>{cat.icon || '🏷️'}</span>
                            <span>{cat.label}</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteModalCategory(cat.id)}
                          title={`Delete "${cat.label}" category`}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: modalCategories.length <= 1 ? 0.4 : 1
                          }}
                          disabled={modalCategories.length <= 1}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add New Category Box */}
                  <div style={{
                    padding: '14px',
                    backgroundColor: '#faf5ff',
                    borderRadius: '10px',
                    border: '1px solid #e9d5ff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6b21a8' }}>
                      + Add New Category Option
                    </label>

                    {/* Emoji Picker Selector */}
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#7e22ce', marginBottom: '4px', fontWeight: 600 }}>
                        Select Icon:
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {['🔥', '❄️', '💎', '📦', '⭐', '🚀', '⚡', '🎯', '🤝', '🏷️', '💡', '👑', '📈', '🚨'].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setNewCatIcon(emoji)}
                            style={{
                              padding: '4px 7px',
                              borderRadius: '6px',
                              border: newCatIcon === emoji ? '1.5px solid #7c3aed' : '1px solid #e2e8f0',
                              backgroundColor: newCatIcon === emoji ? '#ffffff' : 'rgba(255,255,255,0.6)',
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              transform: newCatIcon === emoji ? 'scale(1.15)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color Swatch Selector */}
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#7e22ce', marginBottom: '4px', fontWeight: 600 }}>
                        Select Color:
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {[
                          { color: '#dc2626', name: 'Red' },
                          { color: '#2563eb', name: 'Blue' },
                          { color: '#4f46e5', name: 'Indigo' },
                          { color: '#7c3aed', name: 'Purple' },
                          { color: '#d97706', name: 'Amber' },
                          { color: '#059669', name: 'Emerald' },
                          { color: '#475569', name: 'Slate' },
                          { color: '#e11d48', name: 'Rose' },
                          { color: '#0891b2', name: 'Cyan' },
                        ].map(swatch => (
                          <button
                            key={swatch.color}
                            type="button"
                            onClick={() => setNewCatColor(swatch.color)}
                            title={swatch.name}
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: swatch.color,
                              border: newCatColor === swatch.color ? '2.5px solid #0f172a' : '1.5px solid transparent',
                              cursor: 'pointer',
                              boxShadow: newCatColor === swatch.color ? '0 0 0 2px #fff' : 'none',
                              transform: newCatColor === swatch.color ? 'scale(1.15)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Input Field & Add Button */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={newCatLabel}
                        placeholder="e.g. VIP Customer, Trial Run, Export Deal..."
                        onChange={(e) => setNewCatLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddModalCategory(); }}
                        maxLength={25}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          backgroundColor: '#ffffff',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddModalCategory}
                        disabled={!newCatLabel.trim()}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: newCatLabel.trim() ? '#7c3aed' : '#cbd5e1',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: newCatLabel.trim() ? 'pointer' : 'not-allowed',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={13} /> Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #f1f5f9', backgroundColor: '#fafafa' }}>
              {customizeModalTab === 'STAGES' ? (
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
                  <RotateCcw size={12} /> Reset Stage Names
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResetModalCategories}
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
                  <RotateCcw size={12} /> Reset Categories
                </button>
              )}

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
                  Save Settings
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
