"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  MessageCircle,
  Edit,
  RefreshCw,
  Trash2,
  Sparkles,
  Loader2,
  Search,
  SlidersHorizontal,
  MapPin,
  UserCheck,
  Building2,
  PhoneCall,
  Phone,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { deleteCustomer } from '@/app/actions/customerActions';
import EditCustomerModal from './EditCustomerModal';
import ReassignCustomerModal from './ReassignCustomerModal';
import AIReorderPredictorModal from '../ai/AIReorderPredictorModal';
import PhoneDialerModal from './PhoneDialerModal';
import './customerTable.css';

interface Customer {
  id: string;
  businessName: string;
  contactPerson: string;
  email: string | null;
  mobile: string;
  state: string | null;
  status: string;
  createdAt: Date;
  assignedSalesperson: {
    user: {
      name: string;
    };
  } | null;
}

export default function CustomerTable({
  initialCustomers,
  allEmployees = []
}: {
  initialCustomers: Customer[];
  allEmployees?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams?.get('search') || "";
  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [customersList, setCustomersList] = useState<Customer[]>(initialCustomers);

  useEffect(() => {
    setCustomersList(initialCustomers);
  }, [initialCustomers]);

  useEffect(() => {
    const q = searchParams?.get('search');
    if (q !== null && q !== undefined) {
      setSearchTerm(q);
    }
  }, [searchParams]);

  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [stateFilter, setStateFilter] = useState("All States");
  const [agentFilter, setAgentFilter] = useState("All Agents");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [reassigningCustomer, setReassigningCustomer] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showReorderModal, setShowReorderModal] = useState(false);

  // Phone Dialer State
  const [isDialerOpen, setIsDialerOpen] = useState<boolean>(false);
  const [dialerPhone, setDialerPhone] = useState<string>("");
  const [dialerName, setDialerName] = useState<string>("");
  const [dialerCustomerId, setDialerCustomerId] = useState<string | undefined>(undefined);

  const openDialerWithContact = (phone: string, name: string, customerId?: string) => {
    setDialerPhone(phone || "");
    setDialerName(name || "");
    setDialerCustomerId(customerId);
    setIsDialerOpen(true);
  };

  const openWhatsApp = (phone: string) => {
    const cleanNum = (phone || "").replace(/\D/g, "");
    if (!cleanNum) return;
    const formatted = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;
    window.open(`https://wa.me/${formatted}`, "_blank");
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone and will remove related activities.`)) {
      return;
    }
    setIsDeleting(id);
    try {
      const res = await deleteCustomer(id);
      if (res?.error) {
        alert("Could not delete customer: " + res.error);
      } else {
        setCustomersList(prev => prev.filter(c => c.id !== id));
        router.refresh();
      }
    } catch (err: any) {
      alert("An unexpected error occurred while deleting the customer: " + (err.message || ""));
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredCustomers = customersList.filter(customer => {
    const matchesSearch = 
      (customer.businessName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.contactPerson || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.mobile || "").includes(searchTerm);
    
    const matchesStatus = statusFilter === "All Statuses" || customer.status === statusFilter;
    const matchesState = stateFilter === "All States" || (customer.state && customer.state.toLowerCase() === stateFilter.toLowerCase());
    const matchesAgent = agentFilter === "All Agents" || (customer.assignedSalesperson?.user?.name === agentFilter);

    return matchesSearch && matchesStatus && matchesState && matchesAgent;
  });

  const getStatusBadgeStyles = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === 'new lead' || s === 'new') {
      return { bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
    }
    if (s === 'cold') {
      return { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' };
    }
    if (s === 'active' || s === 'client') {
      return { bg: '#d1fae5', color: '#047857', border: '#a7f3d0' };
    }
    return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
  };

  const handleReset = () => {
    setSearchTerm("");
    setStatusFilter("All Statuses");
    setStateFilter("All States");
    setAgentFilter("All Agents");
  };

  const activeFilterCount = (stateFilter !== "All States" ? 1 : 0) + (agentFilter !== "All Agents" ? 1 : 0);

  // Get unique states for filter
  const uniqueStates = Array.from(new Set(customersList.map(c => c.state).filter(Boolean))) as string[];

  const statusOptions = [
    { label: "All", value: "All Statuses" },
    { label: "Active", value: "Active" },
    { label: "Client", value: "Client" },
    { label: "New Lead", value: "New Lead" },
    { label: "Cold", value: "Cold" },
    { label: "Inactive", value: "Inactive" }
  ];

  return (
    <div className="customer-container">
      {/* ─── Search & Responsive Filter Toolbar ─── */}
      <div className="customer-search-toolbar">
        <div className="customer-search-top-row">
          {/* Search Input */}
          <div className="customer-search-input-wrap">
            <Search size={16} className="customer-search-icon" />
            <input 
              type="text" 
              placeholder="Search name, phone, shop..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="customer-search-input"
            />
          </div>

          {/* Filter Toggle Button */}
          <button
            type="button"
            className={`btn-filter-toggle ${showAdvancedFilters || activeFilterCount > 0 ? 'active' : ''}`}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            title="Filter by State & Sales Agent"
          >
            <SlidersHorizontal size={15} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="filter-badge-count">{activeFilterCount}</span>
            )}
            {showAdvancedFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* AI Re-Order Predictor Action */}
          <button
            type="button"
            onClick={() => setShowReorderModal(true)}
            className="btn-ai-predictor"
            title="Analyze customer order cycles and predict overdue restocks"
          >
            <Sparkles size={15} />
            <span>AI Predictor</span>
          </button>
        </div>

        {/* Horizontal Status Chips Bar */}
        <div className="customer-status-chips-bar">
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`customer-status-chip ${statusFilter === opt.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="customer-advanced-filters">
            <select 
              value={stateFilter} 
              onChange={(e) => setStateFilter(e.target.value)}
              className="filter-select"
            >
              <option value="All States">All States</option>
              {uniqueStates.map(st => <option key={st} value={st}>{st}</option>)}
            </select>

            <select 
              value={agentFilter} 
              onChange={(e) => setAgentFilter(e.target.value)}
              className="filter-select"
            >
              <option value="All Agents">All Agents</option>
              {allEmployees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
            </select>

            {(stateFilter !== "All States" || agentFilter !== "All Agents" || statusFilter !== "All Statuses" || searchTerm) && (
              <button 
                type="button"
                onClick={handleReset}
                className="btn-filter-reset"
              >
                Reset All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── 1. MOBILE CUSTOMER CARDS FEED (Visible on mobile <= 768px) ─── */}
      <div className="customer-mobile-feed">
        {filteredCustomers.map(customer => {
          const statusStyles = getStatusBadgeStyles(customer.status);
          const displayName = customer.businessName || customer.contactPerson || "Customer";
          const contactName = customer.contactPerson && customer.businessName ? customer.contactPerson : "";
          const initials = (displayName || "C").slice(0, 2).toUpperCase();

          return (
            <div key={customer.id} className="customer-mobile-card">
              {/* Card Header: Avatar, Name & Status Pill */}
              <div className="customer-card-header">
                <div className="customer-card-identity">
                  <div className="customer-avatar-badge">
                    {initials}
                  </div>
                  <div className="customer-titles-group">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="customer-business-name"
                    >
                      {displayName}
                    </Link>
                    {contactName && (
                      <span className="customer-contact-person">
                        {contactName}
                      </span>
                    )}
                  </div>
                </div>

                <span
                  className="customer-status-pill"
                  style={{
                    backgroundColor: statusStyles.bg,
                    color: statusStyles.color,
                    border: `1px solid ${statusStyles.border}`
                  }}
                >
                  {customer.status || "Active"}
                </span>
              </div>

              {/* Card Meta Grid */}
              <div className="customer-meta-grid">
                <div className="customer-meta-item">
                  <Phone size={13} className="customer-meta-icon" />
                  <span>{customer.mobile || "No phone"}</span>
                </div>

                <div className="customer-meta-item">
                  <MapPin size={13} className="customer-meta-icon" />
                  <span>{customer.state || "State N/A"}</span>
                </div>

                <div className="customer-meta-item" style={{ gridColumn: 'span 2' }}>
                  <UserCheck size={13} className="customer-meta-icon" />
                  <span>Agent: {customer.assignedSalesperson?.user?.name || "Unassigned"}</span>
                </div>
              </div>

              {/* Bottom Quick Action Toolbar */}
              <div className="customer-card-actions">
                <div className="customer-primary-actions">
                  {customer.mobile && (
                    <button
                      type="button"
                      className="btn-card-call"
                      onClick={() => openDialerWithContact(customer.mobile, displayName, customer.id)}
                      title="Call customer"
                    >
                      <PhoneCall size={13} />
                      <span>Call</span>
                    </button>
                  )}

                  {customer.mobile && (
                    <button
                      type="button"
                      className="btn-card-whatsapp"
                      onClick={() => openWhatsApp(customer.mobile)}
                      title="Chat on WhatsApp"
                    >
                      <MessageCircle size={13} />
                      <span>WhatsApp</span>
                    </button>
                  )}
                </div>

                <div className="customer-icon-actions">
                  <button 
                    type="button"
                    className="btn-icon-action edit"
                    onClick={() => setEditingCustomer(customer)}
                    title="Edit Customer"
                  >
                    <Edit size={14} />
                  </button>

                  <button 
                    type="button"
                    className="btn-icon-action reassign"
                    onClick={() => setReassigningCustomer(customer)}
                    title="Reassign Sales Rep"
                  >
                    <RefreshCw size={14} />
                  </button>

                  <button 
                    type="button"
                    className="btn-icon-action delete"
                    onClick={() => handleDelete(customer.id, displayName)}
                    disabled={isDeleting === customer.id}
                    title="Delete Customer"
                  >
                    {isDeleting === customer.id ? (
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

        {filteredCustomers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '36px 16px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
            <Building2 size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>No customers found</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>Try adjusting your search query or status filter.</p>
          </div>
        )}
      </div>

      {/* ─── 2. DESKTOP DATA TABLE (Visible on desktop > 768px) ─── */}
      <div className="customer-desktop-table">
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
              {filteredCustomers.map(customer => {
                const statusStyles = getStatusBadgeStyles(customer.status);
                const displayName = customer.businessName || customer.contactPerson || "Customer";

                return (
                  <tr key={customer.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px' }}><input type="checkbox" /></td>
                    <td style={{ padding: '16px' }}>
                      <Link href={`/customers/${customer.id}`} style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
                        {customer.contactPerson || customer.businessName}
                      </Link>
                    </td>
                    <td style={{ padding: '16px', color: '#475569' }}>{customer.mobile}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{customer.businessName || '-'}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{customer.assignedSalesperson?.user?.name || '-'}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{customer.state || '-'}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        backgroundColor: statusStyles.bg, 
                        color: statusStyles.color, 
                        border: `1px solid ${statusStyles.border}`,
                        padding: '4px 12px', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600 
                      }}>
                        {customer.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => setEditingCustomer(customer)}
                          style={{ padding: '4px 8px', background: '#fff', color: '#3b82f6', borderRadius: '6px', border: '1px solid #bfdbfe', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => setReassigningCustomer(customer)}
                          style={{ padding: '4px 8px', background: '#fff', color: '#d97706', borderRadius: '6px', border: '1px solid #fde68a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                          title="Reassign"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(customer.id, displayName)}
                          disabled={isDeleting === customer.id}
                          style={{ padding: '4px 8px', background: '#fff', color: '#ef4444', borderRadius: '6px', border: '1px solid #fecaca', cursor: isDeleting === customer.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isDeleting === customer.id ? 0.6 : 1 }} 
                          title="Delete"
                        >
                          {isDeleting === customer.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No customers found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <EditCustomerModal 
          customer={editingCustomer} 
          employees={allEmployees}
          onClose={() => setEditingCustomer(null)} 
        />
      )}

      {/* Reassign Customer Modal */}
      {reassigningCustomer && (
        <ReassignCustomerModal
          customerId={reassigningCustomer.id}
          currentAgent={reassigningCustomer.assignedSalesperson?.user?.name || null}
          employees={allEmployees}
          onClose={() => setReassigningCustomer(null)}
        />
      )}

      {/* AI Re-Order Predictor Modal */}
      {showReorderModal && (
        <AIReorderPredictorModal
          onClose={() => setShowReorderModal(false)}
        />
      )}

      {/* Phone Dialer Modal */}
      <PhoneDialerModal
        isOpen={isDialerOpen}
        onClose={() => setIsDialerOpen(false)}
        initialPhone={dialerPhone}
        initialName={dialerName}
        initialCustomerId={dialerCustomerId}
      />
    </div>
  );
}
