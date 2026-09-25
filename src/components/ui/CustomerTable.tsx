"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import TablePagination, { paginate } from '@/components/ui/TablePagination';
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
  X,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { deleteCustomer, deleteMultipleCustomers } from '@/app/actions/customerActions';
import EditCustomerModal from './EditCustomerModal';
import ReassignCustomerModal from './ReassignCustomerModal';
import AIReorderPredictorModal from '../ai/AIReorderPredictorModal';
import { openPhoneDialer } from '@/lib/dialer';
import * as XLSX from 'xlsx';
import './customerTable.css';

interface Customer {
  id: string;
  businessName: string;
  contactPerson: string;
  email: string | null;
  mobile: string;
  whatsappNumber?: string | null;
  alternatePhone?: string | null;
  billingAddress?: string | null;
  city?: string | null;
  state: string | null;
  pincode?: string | null;
  landmark?: string | null;
  gstNumber?: string | null;
  regularDiscount?: string | null;
  preferredPaymentMethod?: string | null;
  status: string;
  createdAt: Date;
  assignedSalespersonId?: string | null;
  assignedSalesperson: {
    id?: string;
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

  // Selection & Bulk State
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = React.useRef<HTMLDivElement>(null);
  const headerCheckboxRef = React.useRef<HTMLInputElement>(null);

  // Close export dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportMenuOpen]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [reassigningCustomer, setReassigningCustomer] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showReorderModal, setShowReorderModal] = useState(false);

  const openDialerWithContact = (phone: string, name: string, customerId?: string) => {
    openPhoneDialer({ phone, name, customerId });
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
        setSelectedCustomerIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, stateFilter, agentFilter, pageSize]);

  const paginatedCustomers = useMemo(() => {
    return paginate(filteredCustomers, currentPage, pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  // Selection helpers
  const isAllPageSelected = paginatedCustomers.length > 0 && paginatedCustomers.every(c => selectedCustomerIds.has(c.id));
  const isSomePageSelected = paginatedCustomers.some(c => selectedCustomerIds.has(c.id));

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomePageSelected && !isAllPageSelected;
    }
  }, [isSomePageSelected, isAllPageSelected]);

  const handleToggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedCustomerIds(prev => {
        const next = new Set(prev);
        paginatedCustomers.forEach(c => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedCustomerIds(prev => {
        const next = new Set(prev);
        paginatedCustomers.forEach(c => next.add(c.id));
        return next;
      });
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedCustomerIds(new Set(filteredCustomers.map(c => c.id)));
  };

  const handleToggleSelect = (id: string) => {
    setSelectedCustomerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const count = selectedCustomerIds.size;
    if (count === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${count} selected customer${count > 1 ? 's' : ''}? This action cannot be undone and will delete related activities/records.`)) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      const res = await deleteMultipleCustomers(Array.from(selectedCustomerIds));
      if (res?.success) {
        setCustomersList(prev => prev.filter(c => !selectedCustomerIds.has(c.id)));
        setSelectedCustomerIds(new Set());
        router.refresh();
      } else {
        alert(res?.error || "Failed to delete selected customers.");
      }
    } catch (err: any) {
      alert("An unexpected error occurred: " + (err.message || ""));
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExport = (format: 'xlsx' | 'csv', onlySelected = false) => {
    const targetCustomers = onlySelected || selectedCustomerIds.size > 0
      ? filteredCustomers.filter(c => selectedCustomerIds.has(c.id))
      : filteredCustomers;

    if (targetCustomers.length === 0) {
      alert("No customers available to export.");
      return;
    }

    const exportRows = targetCustomers.map(c => ({
      "Business Name": c.businessName || "",
      "Contact Person": c.contactPerson || "",
      "Mobile": c.mobile || "",
      "Email": c.email || "",
      "State": c.state || "",
      "Assigned Agent": c.assignedSalesperson?.user?.name || "Unassigned",
      "Status": c.status || "Active",
      "Created Date": c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : ""
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'xlsx') {
      XLSX.writeFile(wb, `Customers_Export_${dateStr}.xlsx`);
    } else {
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `Customers_Export_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setIsExportMenuOpen(false);
  };

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

          {/* Export Dropdown Menu */}
          <div className="customer-export-dropdown-container" ref={exportMenuRef}>
            <button
              type="button"
              className="btn-customer-export"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              title="Export customers to Excel or CSV"
            >
              <Download size={15} />
              <span>Export {selectedCustomerIds.size > 0 ? `(${selectedCustomerIds.size})` : ''}</span>
              <ChevronDown size={14} style={{ transform: isExportMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {isExportMenuOpen && (
              <div className="customer-export-dropdown-menu">
                <div className="customer-export-dropdown-header">
                  <span>{selectedCustomerIds.size > 0 ? `Export Selected (${selectedCustomerIds.size})` : `Export All (${filteredCustomers.length})`}</span>
                </div>
                <button
                  type="button"
                  className="customer-export-dropdown-item"
                  onClick={() => handleExport('xlsx')}
                >
                  <FileSpreadsheet size={15} style={{ color: '#10b981' }} />
                  <div className="customer-export-item-text">
                    <span className="title">Excel Spreadsheet</span>
                    <span className="sub">.xlsx format</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="customer-export-dropdown-item"
                  onClick={() => handleExport('csv')}
                >
                  <Download size={15} style={{ color: '#3b82f6' }} />
                  <div className="customer-export-item-text">
                    <span className="title">CSV File</span>
                    <span className="sub">Standard comma-separated</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Selection Action Buttons (Matched with Theme) */}
          {selectedCustomerIds.size > 0 && (
            <>
              <div className="btn-selection-count" title={`${selectedCustomerIds.size} customers selected`}>
                <span className="selection-count-pill">{selectedCustomerIds.size}</span>
                <span>Selected</span>
              </div>

              <button
                type="button"
                className="btn-select-all"
                onClick={handleToggleSelectAllPage}
                title={isAllPageSelected ? "Deselect page" : `Select all on page (${paginatedCustomers.length})`}
              >
                <span>{isAllPageSelected ? "Deselect Page" : `Select Page (${paginatedCustomers.length})`}</span>
              </button>

              {filteredCustomers.length > paginatedCustomers.length && selectedCustomerIds.size < filteredCustomers.length && (
                <button
                  type="button"
                  className="btn-select-all"
                  onClick={handleSelectAllFiltered}
                  title={`Select all ${filteredCustomers.length} filtered customers`}
                >
                  <span>Select All ({filteredCustomers.length})</span>
                </button>
              )}

              <button
                type="button"
                className="btn-delete-selected"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                title="Delete selected customers"
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Delete ({selectedCustomerIds.size})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn-clear-selection"
                onClick={() => setSelectedCustomerIds(new Set())}
                title="Clear selection"
              >
                <X size={15} />
              </button>
            </>
          )}
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
        {paginatedCustomers.map(customer => {
          const statusStyles = getStatusBadgeStyles(customer.status);
          const displayName = customer.businessName || customer.contactPerson || "Customer";
          const contactName = customer.contactPerson && customer.businessName ? customer.contactPerson : "";
          const initials = (displayName || "C").slice(0, 2).toUpperCase();
          const isSelected = selectedCustomerIds.has(customer.id);

          return (
            <div 
              key={customer.id} 
              className="customer-mobile-card"
              style={{
                borderColor: isSelected ? '#818cf8' : undefined,
                background: isSelected ? '#f8faff' : undefined
              }}
            >
              {/* Card Header: Checkbox, Avatar, Name & Status Pill */}
              <div className="customer-card-header">
                <div className="customer-card-identity">
                  <div className="customer-card-select-wrap">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(customer.id)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: '#4f46e5' }}
                      title="Select customer"
                    />
                  </div>
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

        {filteredCustomers.length > 0 && (
          <div style={{ marginTop: '10px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredCustomers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemName="customers"
            />
          </div>
        )}
      </div>

      {/* ─── 2. DESKTOP DATA TABLE (Visible on desktop > 768px) ─── */}
      <div className="customer-desktop-table">
        <div className="table-responsive">
          <table className="data-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', padding: '16px' }}>
                  <input 
                    type="checkbox" 
                    ref={headerCheckboxRef}
                    checked={isAllPageSelected}
                    onChange={handleToggleSelectAllPage}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#4f46e5' }}
                    title={isAllPageSelected ? "Deselect page" : "Select all on page"}
                  />
                </th>
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
              {paginatedCustomers.map(customer => {
                const statusStyles = getStatusBadgeStyles(customer.status);
                const displayName = customer.businessName || customer.contactPerson || "Customer";
                const isSelected = selectedCustomerIds.has(customer.id);

                return (
                  <tr 
                    key={customer.id} 
                    style={{ 
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isSelected ? '#f0f7ff' : 'transparent',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '16px' }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => handleToggleSelect(customer.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#4f46e5' }}
                        title="Select customer"
                      />
                    </td>
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

        <TablePagination
          currentPage={currentPage}
          totalItems={filteredCustomers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="customers"
        />
      </div>

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <EditCustomerModal 
          customer={editingCustomer} 
          employees={allEmployees}
          onClose={(saved) => {
            if (saved) {
              router.refresh();
            }
            setEditingCustomer(null);
          }} 
        />
      )}

      {/* Reassign Customer Modal */}
      {reassigningCustomer && (
        <ReassignCustomerModal
          customerId={reassigningCustomer.id}
          currentAgent={reassigningCustomer.assignedSalesperson?.user?.name || null}
          employees={allEmployees}
          onClose={(newAgentId) => {
            if (newAgentId) {
              const matchedEmp = allEmployees.find(e => e.id === newAgentId);
              setCustomersList(prev => prev.map(c => c.id === reassigningCustomer.id ? {
                ...c,
                assignedSalespersonId: newAgentId,
                assignedSalesperson: matchedEmp ? { id: matchedEmp.id, user: { name: matchedEmp.name } } : null
              } : c));
              router.refresh();
            }
            setReassigningCustomer(null);
          }}
        />
      )}

      {/* AI Re-Order Predictor Modal */}
      {showReorderModal && (
        <AIReorderPredictorModal
          onClose={() => setShowReorderModal(false)}
        />
      )}
    </div>
  );
}
