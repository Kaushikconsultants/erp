"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Edit,
  Trash2,
  Loader2,
  UserPlus,
  Search,
  SlidersHorizontal,
  PhoneCall,
  Phone,
  MessageCircle,
  Building2,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers
} from 'lucide-react';
import { updateLead, deleteLead } from '@/actions/leads';
import AddCustomerModal from './AddCustomerModal';
import PhoneDialerModal from './PhoneDialerModal';
import './leadTable.css';

export default function LeadTable({
  initialLeads,
  allEmployees
}: {
  initialLeads: any[];
  allEmployees?: any[];
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [leadToConvert, setLeadToConvert] = useState<any>(null);

  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [agentFilter, setAgentFilter] = useState("All Agents");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Phone Dialer State
  const [isDialerOpen, setIsDialerOpen] = useState<boolean>(false);
  const [dialerPhone, setDialerPhone] = useState<string>("");
  const [dialerName, setDialerName] = useState<string>("");
  const [dialerLeadId, setDialerLeadId] = useState<string | undefined>(undefined);

  const openDialerWithContact = (phone: string, name: string, leadId?: string) => {
    setDialerPhone(phone || "");
    setDialerName(name || "");
    setDialerLeadId(leadId);
    setIsDialerOpen(true);
  };

  const openWhatsApp = (phone: string) => {
    const cleanNum = (phone || "").replace(/\D/g, "");
    if (!cleanNum) return;
    const formatted = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;
    window.open(`https://wa.me/${formatted}`, "_blank");
  };

  const filteredLeads = initialLeads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      lead.whatsappNumber.includes(searchTerm) ||
      (lead.shopName && lead.shopName.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesStatus = statusFilter === "All Statuses" || lead.status === statusFilter;
    const matchesAgent = agentFilter === "All Agents" || (lead.assignedSalesperson?.user?.name === agentFilter);
    
    return matchesSearch && matchesStatus && matchesAgent;
  });

  const handleReset = () => {
    setSearchTerm("");
    setStatusFilter("All Statuses");
    setAgentFilter("All Agents");
  };

  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateLead(id, { status: newStatus });
    router.refresh();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    setIsDeleting(id);
    await deleteLead(id);
    setIsDeleting(null);
    router.refresh();
  };

  const getStatusBadgeStyles = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === 'new') return { bg: '#fef3c7', color: '#b45309', border: '#fde68a' }; // Yellow
    if (s === 'lost') return { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' }; // Red
    if (s === 'converted') return { bg: '#d1fae5', color: '#047857', border: '#a7f3d0' }; // Green
    if (s === 'contacted') return { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' }; // Indigo
    if (s === 'qualified') return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' }; // Emerald
    if (s === 'opportunity') return { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' }; // Violet
    if (s === 'in progress') return { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' }; // Sky
    return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' }; // Gray
  };

  const statusOptions = [
    { label: "All", value: "All Statuses" },
    { label: "New", value: "New" },
    { label: "Contacted", value: "Contacted" },
    { label: "Qualified", value: "Qualified" },
    { label: "Opportunity", value: "Opportunity" },
    { label: "In Progress", value: "In Progress" },
    { label: "Converted", value: "Converted" },
    { label: "Lost", value: "Lost" }
  ];

  return (
    <div className="lead-container">
      {/* ─── Search & Responsive Filter Toolbar ─── */}
      <div className="lead-search-toolbar">
        <div className="lead-search-top-row">
          {/* Search Input */}
          <div className="lead-search-input-wrap">
            <Search size={16} className="lead-search-icon" />
            <input 
              type="text"
              placeholder="Search leads by name, shop, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="lead-search-input"
            />
          </div>

          {/* Filter Toggle Button */}
          <button
            type="button"
            className={`btn-lead-filter-toggle ${showAdvancedFilters || agentFilter !== "All Agents" ? 'active' : ''}`}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            title="Filter by Sales Agent"
          >
            <SlidersHorizontal size={15} />
            <span>Agent Filter</span>
            {agentFilter !== "All Agents" && (
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4f46e5' }} />
            )}
            {showAdvancedFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Kanban Link */}
          <Link 
            href="/pipeline"
            className="btn-pipeline-kanban"
            title="Open Interactive Pipeline Kanban Board"
          >
            <Layers size={15} />
            <span>Sales Kanban</span>
          </Link>
        </div>

        {/* Horizontal Status Filter Chips Bar */}
        <div className="lead-status-chips-bar">
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`lead-status-chip ${statusFilter === opt.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="lead-advanced-filters">
            <select 
              value={agentFilter} 
              onChange={(e) => setAgentFilter(e.target.value)}
              className="lead-filter-select"
            >
              <option value="All Agents">All Agents</option>
              {allEmployees && allEmployees.map(emp => (
                <option key={emp.id} value={emp.name}>{emp.name}</option>
              ))}
            </select>

            {(agentFilter !== "All Agents" || statusFilter !== "All Statuses" || searchTerm) && (
              <button 
                type="button"
                onClick={handleReset}
                className="btn-lead-reset"
              >
                Reset All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── 1. MOBILE LEADS CARDS FEED (Visible on mobile <= 768px) ─── */}
      <div className="lead-mobile-feed">
        {filteredLeads.map(lead => {
          const statusStyles = getStatusBadgeStyles(lead.status);
          const initials = (lead.name || "L").slice(0, 2).toUpperCase();

          return (
            <div key={lead.id} className="lead-mobile-card">
              {/* Card Header: Avatar, Name & Interactive Status Select */}
              <div className="lead-card-header">
                <div className="lead-card-identity">
                  <div className="lead-avatar-badge">
                    {initials}
                  </div>
                  <div className="lead-titles-group">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="lead-name-link"
                    >
                      {lead.name}
                    </Link>
                    {lead.shopName && (
                      <span className="lead-shop-name">
                        {lead.shopName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Dropdown */}
                <select 
                  value={lead.status}
                  onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                  className="lead-status-dropdown"
                  style={{
                    backgroundColor: statusStyles.bg,
                    color: statusStyles.color,
                    border: `1px solid ${statusStyles.border}`
                  }}
                >
                  <option value="New" style={{ background: '#fff', color: '#0f172a' }}>New</option>
                  <option value="Contacted" style={{ background: '#fff', color: '#0f172a' }}>Contacted</option>
                  <option value="Qualified" style={{ background: '#fff', color: '#0f172a' }}>Qualified</option>
                  <option value="Opportunity" style={{ background: '#fff', color: '#0f172a' }}>Opportunity</option>
                  <option value="In Progress" style={{ background: '#fff', color: '#0f172a' }}>In Progress</option>
                  <option value="Converted" style={{ background: '#fff', color: '#0f172a' }}>Converted</option>
                  <option value="Lost" style={{ background: '#fff', color: '#0f172a' }}>Lost</option>
                </select>
              </div>

              {/* Card Meta Grid */}
              <div className="lead-meta-grid">
                <div className="lead-meta-item">
                  <Phone size={13} className="lead-meta-icon" />
                  <span>{lead.whatsappNumber || "No number"}</span>
                </div>

                <div className="lead-meta-item">
                  <UserCheck size={13} className="lead-meta-icon" />
                  <span>{lead.assignedSalesperson?.user?.name || "Unassigned"}</span>
                </div>
              </div>

              {/* Bottom Quick Action Toolbar */}
              <div className="lead-card-actions">
                <div className="lead-primary-actions">
                  {lead.whatsappNumber && (
                    <button
                      type="button"
                      className="btn-card-call"
                      onClick={() => openDialerWithContact(lead.whatsappNumber, lead.name, lead.id)}
                      title="Call Lead"
                    >
                      <PhoneCall size={13} />
                      <span>Call</span>
                    </button>
                  )}

                  {lead.whatsappNumber && (
                    <button
                      type="button"
                      className="btn-card-whatsapp"
                      onClick={() => openWhatsApp(lead.whatsappNumber)}
                      title="Chat on WhatsApp"
                    >
                      <MessageCircle size={13} />
                      <span>WhatsApp</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-card-convert"
                    onClick={() => setLeadToConvert(lead)}
                    title="Convert this lead into a B2B Customer"
                  >
                    <UserPlus size={13} />
                    <span>Convert</span>
                  </button>
                </div>

                <div className="lead-icon-actions">
                  <button 
                    type="button"
                    className="btn-lead-icon edit"
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    title="View & Edit Details"
                  >
                    <Edit size={14} />
                  </button>

                  <button 
                    type="button"
                    className="btn-lead-icon delete"
                    onClick={() => handleDelete(lead.id, lead.name)}
                    disabled={isDeleting === lead.id}
                    title="Delete Lead"
                  >
                    {isDeleting === lead.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredLeads.length === 0 && (
          <div style={{ textAlign: 'center', padding: '36px 16px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
            <Building2 size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>No leads found</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>Try changing your status filter or search query.</p>
          </div>
        )}
      </div>

      {/* ─── 2. DESKTOP DATA TABLE (Visible on desktop > 768px) ─── */}
      <div className="lead-desktop-table">
        <div className="table-responsive">
          <table className="data-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', padding: '16px' }}><input type="checkbox" disabled /></th>
                <th style={{ fontWeight: 600, color: '#1e293b', textTransform: 'none', fontSize: '0.875rem' }}>Name</th>
                <th style={{ fontWeight: 600, color: '#1e293b', textTransform: 'none', fontSize: '0.875rem' }}>Phone</th>
                <th style={{ fontWeight: 600, color: '#1e293b', textTransform: 'none', fontSize: '0.875rem' }}>Shop Name</th>
                <th style={{ fontWeight: 600, color: '#1e293b', textTransform: 'none', fontSize: '0.875rem' }}>Agent</th>
                <th style={{ fontWeight: 600, color: '#1e293b', textTransform: 'none', fontSize: '0.875rem' }}>State</th>
                <th style={{ fontWeight: 600, color: '#1e293b', textTransform: 'none', fontSize: '0.875rem' }}>Status</th>
                <th style={{ fontWeight: 600, color: '#1e293b', textTransform: 'none', fontSize: '0.875rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map(lead => {
                const statusStyles = getStatusBadgeStyles(lead.status);
                return (
                  <tr key={lead.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px' }}><input type="checkbox" /></td>
                    <td style={{ padding: '16px' }}>
                      <Link href={`/leads/${lead.id}`} style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
                        {lead.name}
                      </Link>
                    </td>
                    <td style={{ padding: '16px', color: '#475569' }}>{lead.whatsappNumber}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{lead.shopName || '-'}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{lead.assignedSalesperson?.user?.name || '-'}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>-</td>
                    <td style={{ padding: '16px' }}>
                      <select 
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        style={{ 
                          backgroundColor: statusStyles.bg, 
                          color: statusStyles.color, 
                          border: `1px solid ${statusStyles.border}`,
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="New" style={{background: '#fff', color: '#000'}}>New</option>
                        <option value="Contacted" style={{background: '#fff', color: '#000'}}>Contacted</option>
                        <option value="Qualified" style={{background: '#fff', color: '#000'}}>Qualified</option>
                        <option value="Opportunity" style={{background: '#fff', color: '#000'}}>Opportunity</option>
                        <option value="In Progress" style={{background: '#fff', color: '#000'}}>In Progress</option>
                        <option value="Converted" style={{background: '#fff', color: '#000'}}>Converted</option>
                        <option value="Lost" style={{background: '#fff', color: '#000'}}>Lost</option>
                      </select>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => setLeadToConvert(lead)}
                          style={{ padding: '4px 8px', background: '#fff', color: '#10b981', borderRadius: '6px', border: '1px solid #a7f3d0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                          title="Convert to Customer"
                        >
                          <UserPlus size={14} />
                        </button>
                        <button 
                          onClick={() => router.push(`/leads/${lead.id}`)}
                          style={{ padding: '4px 8px', background: '#fff', color: '#3b82f6', borderRadius: '6px', border: '1px solid #bfdbfe', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                          title="View/Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(lead.id, lead.name)}
                          disabled={isDeleting === lead.id}
                          style={{ padding: '4px 8px', background: '#fff', color: '#ef4444', borderRadius: '6px', border: '1px solid #fecaca', cursor: isDeleting === lead.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isDeleting === lead.id ? 0.6 : 1 }} 
                          title="Delete"
                        >
                          {isDeleting === lead.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Convert to Customer Modal */}
      {leadToConvert && (
        <AddCustomerModal 
          onClose={(newCustomer) => {
            setLeadToConvert(null);
            if (newCustomer) {
              router.push(`/customers/${newCustomer.id}`);
            }
          }} 
          employees={allEmployees?.map(e => ({ id: e.id, name: e.name })) || []}
          leadToConvert={leadToConvert}
        />
      )}

      {/* Phone Dialer Modal */}
      <PhoneDialerModal
        isOpen={isDialerOpen}
        onClose={() => setIsDialerOpen(false)}
        initialPhone={dialerPhone}
        initialName={dialerName}
        initialLeadId={dialerLeadId}
      />
    </div>
  );
}
