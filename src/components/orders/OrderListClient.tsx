"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DateRangeFilter from '@/components/ui/DateRangeFilter';
import { 
  Calendar, 
  Edit, 
  FileText, 
  Trash2, 
  Copy, 
  Search, 
  ChevronDown, 
  CheckCircle2, 
  Truck, 
  X, 
  RotateCcw, 
  UserCheck, 
  ShoppingBag, 
  Eye, 
  ExternalLink,
  RefreshCw,
  Download,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import OrderTrackingModal from '@/components/orders/OrderTrackingModal';
import EditOrderModal from '@/components/orders/EditOrderModal';
import { deleteOrder, deleteMultipleOrders, syncActiveOrdersTracking } from '@/app/actions/orderActions';
import { deleteQuotation } from '@/app/actions/quotationActions';
import TablePagination, { paginate } from '@/components/ui/TablePagination';

type DocumentType = 'Order' | 'Quotation';

export interface UnifiedDocument {
  id: string;
  type: DocumentType;
  date: string;
  customerName: string;
  customerSub: string;
  agentName: string;
  totalAmount: number;
  taxableAmount: number;
  paymentType: string;
  discountBadge: string;
  discountColor: string;
  commissionValue: number;
  commissionAvg: string;
  documentNumber: string;
  status: string;
  statusColor: string;
  statusBg: string;
  awbNumber: string | null;
  notes: string | null;
  isCreditCustomer: boolean;
}

interface OrderListClientProps {
  documents: UnifiedDocument[];
  agents: { id: string; name: string }[];
  isAdmin?: boolean;
  currentUserEmployeeId?: string;
  currentUserName?: string;
}

const TABS = ['All', 'Printed', 'AWB Assigned', 'In Transit', 'OFD', 'Delivered', 'Quotations'];

export default function OrderListClient({ 
  documents, 
  agents, 
  isAdmin = true, 
  currentUserEmployeeId, 
  currentUserName 
}: OrderListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get('search') || '';
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  const [selectedAgent, setSelectedAgent] = useState('All Agents');
  const [selectedPayment, setSelectedPayment] = useState('All Payment Types');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination state: default 25 per page (options: 25, 50, 100, 200)
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const [copiedAwb, setCopiedAwb] = useState<string | null>(null);
  const [commissionModal, setCommissionModal] = useState<UnifiedDocument | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<UnifiedDocument | null>(null);
  const [editingOrder, setEditingOrder] = useState<UnifiedDocument | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [docList, setDocList] = useState<UnifiedDocument[]>(documents);
  const [isSyncingTracking, setIsSyncingTracking] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Multi-select & Export State
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const exportMenuRef = React.useRef<HTMLDivElement>(null);
  const headerCheckboxRef = React.useRef<HTMLInputElement>(null);

  // Close export dropdown on outside click
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

  // Sync tracking statuses across active shipments
  const handleSyncAllTracking = useCallback(async (isManual = false) => {
    if (isSyncingTracking) return;
    setIsSyncingTracking(true);
    try {
      const res = await syncActiveOrdersTracking();
      localStorage.setItem('last_awb_tracking_sync', Date.now().toString());
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      if (res?.updatedOrders && res.updatedOrders.length > 0) {
        setDocList(prev => prev.map(doc => {
          const match = res.updatedOrders.find((u: any) => u.id === doc.id);
          if (match) {
            return {
              ...doc,
              status: match.shippingStatus,
              statusBg: match.statusBg,
              statusColor: match.statusColor
            };
          }
          return doc;
        }));
        router.refresh();
      }
    } catch (err) {
      console.error("Auto tracking sync error:", err);
    } finally {
      setIsSyncingTracking(false);
    }
  }, [isSyncingTracking, router]);

  // Automatic 30-minute background tracking sync
  useEffect(() => {
    const AUTO_REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
    const lastSyncStr = localStorage.getItem('last_awb_tracking_sync');
    const now = Date.now();
    if (!lastSyncStr || (now - parseInt(lastSyncStr, 10)) >= AUTO_REFRESH_INTERVAL_MS) {
      handleSyncAllTracking(false);
    }

    const interval = setInterval(() => {
      handleSyncAllTracking(false);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [handleSyncAllTracking]);

  useEffect(() => {
    setDocList(documents);
  }, [documents]);

  const handleDeleteDoc = async (doc: UnifiedDocument) => {
    const isOrder = doc.type === 'Order';
    const label = isOrder ? `Sales Order #${doc.documentNumber}` : `Quotation #${doc.documentNumber}`;
    if (!window.confirm(`Are you sure you want to delete ${label}? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(doc.id);
    const res = isOrder ? await deleteOrder(doc.id) : await deleteQuotation(doc.id);
    setDeletingId(null);

    if (res?.error) {
      alert(`Failed to delete: ${res.error}`);
    } else {
      setDocList(prev => prev.filter(d => d.id !== doc.id));
    }
  };

  useEffect(() => {
    const s = searchParams?.get('search');
    if (s !== null && s !== undefined) {
      setSearchQuery(s);
    }
  }, [searchParams]);

  // Tab Count Computation
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'All': 0,
      'Printed': 0,
      'AWB Assigned': 0,
      'In Transit': 0,
      'OFD': 0,
      'Delivered': 0,
      'Quotations': 0
    };

    docList.forEach(doc => {
      // In Orders view, quotations MUST be Confirmed
      if (doc.type === 'Quotation' && (doc.status || '').toLowerCase() !== 'confirmed') {
        return;
      }
      counts['All'] += 1;

      if (doc.type === 'Quotation') {
        counts['Quotations'] = (counts['Quotations'] || 0) + 1;
        return;
      }
      const s = (doc.status || '').toLowerCase();
      if (s.includes('printed') || s.includes('processing')) counts['Printed'] = (counts['Printed'] || 0) + 1;
      if (doc.awbNumber) counts['AWB Assigned'] = (counts['AWB Assigned'] || 0) + 1;
      if (s.includes('transit')) counts['In Transit'] = (counts['In Transit'] || 0) + 1;
      if (s.includes('out for delivery') || s.includes('ofd')) counts['OFD'] = (counts['OFD'] || 0) + 1;
      if (s.includes('delivered') || s.includes('converted')) counts['Delivered'] = (counts['Delivered'] || 0) + 1;
    });

    return counts;
  }, [docList]);

  const filteredDocs = useMemo(() => {
    return docList.filter(doc => {
      // In Orders view, quotations MUST be Confirmed
      if (doc.type === 'Quotation' && (doc.status || '').toLowerCase() !== 'confirmed') {
        return false;
      }

      // 1. Tab filter
      if (activeTab === 'Quotations' && doc.type !== 'Quotation') return false;
      if (activeTab !== 'All' && activeTab !== 'Quotations') {
        if (doc.type === 'Quotation') return false;
        
        let tabMatch = false;
        const statusLower = (doc.status || '').toLowerCase();
        if (activeTab === 'Printed' && (statusLower.includes('printed') || statusLower.includes('processing'))) tabMatch = true;
        else if (activeTab === 'AWB Assigned' && doc.awbNumber) tabMatch = true;
        else if (activeTab === 'In Transit' && statusLower.includes('transit')) tabMatch = true;
        else if (activeTab === 'OFD' && (statusLower.includes('out for delivery') || statusLower.includes('ofd'))) tabMatch = true;
        else if (activeTab === 'Delivered' && (statusLower.includes('delivered') || statusLower.includes('converted'))) tabMatch = true;
        else if (statusLower === activeTab.toLowerCase()) tabMatch = true;
        
        if (!tabMatch) return false;
      }

      // 2. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCust = doc.customerName.toLowerCase().includes(q);
        const matchSub = (doc.customerSub || '').toLowerCase().includes(q);
        const matchDoc = doc.documentNumber.toLowerCase().includes(q);
        const matchAgent = doc.agentName.toLowerCase().includes(q);
        const matchAwb = (doc.awbNumber || '').toLowerCase().includes(q);
        const matchNotes = (doc.notes || '').toLowerCase().includes(q);
        const matchAmount = doc.totalAmount.toString().includes(q);

        if (!matchCust && !matchSub && !matchDoc && !matchAgent && !matchAwb && !matchNotes && !matchAmount) {
          return false;
        }
      }

      // 3. Agent filter (only for admins)
      if (isAdmin && selectedAgent !== 'All Agents' && doc.agentName !== selectedAgent) {
        return false;
      }

      // 4. Payment filter
      if (selectedPayment !== 'All Payment Types') {
        const pType = (doc.paymentType || '').toLowerCase();
        if (selectedPayment === 'Prepaid' && !(pType.includes('prepaid') || pType === 'paid')) return false;
        if (selectedPayment === 'Token' && !(pType.includes('token') || pType.includes('partially'))) return false;
        if (selectedPayment === 'COD' && !pType.includes('cod')) return false;
        if (selectedPayment === 'Credit' && !pType.includes('credit')) return false;
        if (selectedPayment === 'Unpaid' && !pType.includes('unpaid')) return false;
      }

      // 5. Date filter
      if (startDate || endDate) {
        const docDate = new Date(doc.date);
        if (startDate && docDate < new Date(startDate)) return false;
        if (endDate) {
          const eDate = new Date(endDate);
          eDate.setHours(23, 59, 59, 999);
          if (docDate > eDate) return false;
        }
      }

      return true;
    });
  }, [docList, activeTab, searchQuery, selectedAgent, selectedPayment, startDate, endDate, isAdmin]);

  // Reset to first page when search, tab, or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, selectedAgent, selectedPayment, startDate, endDate, pageSize]);

  const paginatedDocs = useMemo(() => {
    return paginate(filteredDocs, currentPage, pageSize);
  }, [filteredDocs, currentPage, pageSize]);

  const isAllSelected = paginatedDocs.length > 0 && paginatedDocs.every(d => selectedDocIds.has(d.id));
  const isSomeSelected = paginatedDocs.some(d => selectedDocIds.has(d.id));

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeSelected && !isAllSelected;
    }
  }, [isSomeSelected, isAllSelected]);

  const handleToggleSelect = (id: string) => {
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedDocIds(prev => {
        const next = new Set(prev);
        paginatedDocs.forEach(d => next.delete(d.id));
        return next;
      });
    } else {
      setSelectedDocIds(prev => {
        const next = new Set(prev);
        paginatedDocs.forEach(d => next.add(d.id));
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocIds.size === 0) return;
    const count = selectedDocIds.size;
    if (!window.confirm(`Are you sure you want to permanently delete ${count} selected order(s)? This will restore inventory, unlink payments, and remove associated records.`)) {
      return;
    }

    setIsBulkDeleting(true);
    const ids = Array.from(selectedDocIds);
    const res = await deleteMultipleOrders(ids);
    setIsBulkDeleting(false);

    if (res?.error) {
      alert(`Error: ${res.error}`);
    } else {
      setDocList(prev => prev.filter(d => !selectedDocIds.has(d.id)));
      setSelectedDocIds(new Set());
      router.refresh();
    }
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    const targetDocs = selectedDocIds.size > 0
      ? docList.filter(d => selectedDocIds.has(d.id))
      : filteredDocs;

    if (targetDocs.length === 0) {
      alert("No records available to export.");
      return;
    }

    const rows = targetDocs.map(d => ({
      "Doc #": d.documentNumber || "",
      "Type": d.type,
      "Date": d.date,
      "Customer Name": d.customerName || "",
      "Customer Details": d.customerSub || "",
      "Sales Agent": d.agentName || "",
      "Total Amount (₹)": d.totalAmount || 0,
      "Taxable Amount (₹)": d.taxableAmount || 0,
      "Payment Type": d.paymentType || "",
      "Status": d.status || "",
      "AWB Number": d.awbNumber || "",
      "Commission (₹)": d.commissionValue || 0,
      "Credit Customer": d.isCreditCustomer ? "Yes" : "No"
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'xlsx') {
      XLSX.writeFile(wb, `Orders_Export_${dateStr}.xlsx`);
    } else {
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `Orders_Export_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setIsExportMenuOpen(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAwb(text);
    setTimeout(() => setCopiedAwb(null), 2000);
  };


  const handleReset = () => {
    setSearchQuery('');
    setSelectedAgent('All Agents');
    setSelectedPayment('All Payment Types');
    setStartDate('');
    setEndDate('');
    setActiveTab('All');
  };

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
      
      {/* ─── 1. MODERN THEME TABS ─── */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '12px 18px', 
        borderBottom: '1px solid #f1f5f9', 
        backgroundColor: '#f8fafc',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {TABS.map(tab => {
          const isSelected = activeTab === tab;
          const count = tabCounts[tab] || 0;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '0.8125rem',
                fontWeight: isSelected ? 550 : 500,
                border: isSelected ? 'none' : '1px solid #e2e8f0',
                backgroundColor: isSelected ? 'var(--accent-primary, #4f46e5)' : '#ffffff',
                color: isSelected ? '#ffffff' : '#475569',
                cursor: 'pointer',
                boxShadow: isSelected ? '0 2px 5px rgba(79, 70, 229, 0.2)' : '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{tab}</span>
              <span style={{
                padding: '1px 6px',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 500,
                backgroundColor: isSelected ? 'rgba(255,255,255,0.22)' : '#f1f5f9',
                color: isSelected ? '#ffffff' : '#64748b'
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── 2. MODERN FILTERS & THEMED SEARCH BAR ─── */}
      <div style={{ 
        padding: '14px 18px', 
        borderBottom: '1px solid #f1f5f9', 
        display: 'flex', 
        gap: '12px', 
        flexWrap: 'wrap', 
        alignItems: 'center',
        backgroundColor: '#ffffff'
      }}>
        
        {/* Themed Pill Search Box */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            backgroundColor: '#f8fafc', 
            border: '1px solid #cbd5e1', 
            borderRadius: '9999px', 
            padding: '7px 14px', 
            flex: '1', 
            minWidth: '240px',
            maxWidth: '360px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease'
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = "var(--accent-primary, #4f46e5)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79, 70, 229, 0.12)";
            e.currentTarget.style.backgroundColor = "#ffffff";
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = "#cbd5e1";
            e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.03)";
            e.currentTarget.style.backgroundColor = "#f8fafc";
          }}
        >
          <Search size={14} style={{ color: '#94a3b8', marginRight: '8px', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search customer, order #, AWB..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              border: 'none', 
              background: 'transparent', 
              outline: 'none', 
              fontSize: '0.85rem', 
              color: '#0f172a',
              fontFamily: 'inherit'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: '0 2px' }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Agent Dropdown (Admin Only) or Scoped Badge */}
        {isAdmin ? (
          <div style={{ position: 'relative', width: '180px' }}>
            <select 
              value={selectedAgent} 
              onChange={e => setSelectedAgent(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '7px 32px 7px 12px', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                fontSize: '0.8125rem', 
                fontWeight: 500,
                appearance: 'none', 
                backgroundColor: '#ffffff', 
                color: '#334155',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All Agents">All Sales Agents</option>
              {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
            <ChevronDown size={14} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        ) : (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
            borderRadius: '8px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            color: '#475569',
            fontSize: '0.8125rem',
            fontWeight: 500
          }}>
            <UserCheck size={13} style={{ color: 'var(--accent-primary, #4f46e5)' }} />
            <span>Rep: {currentUserName || 'You'}</span>
          </div>
        )}

        {/* Payment Dropdown */}
        <div style={{ position: 'relative', width: '170px' }}>
          <select 
            value={selectedPayment} 
            onChange={e => setSelectedPayment(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '7px 32px 7px 12px', 
              borderRadius: '8px', 
              border: '1px solid #cbd5e1', 
              fontSize: '0.8125rem', 
              fontWeight: 500,
              appearance: 'none', 
              backgroundColor: '#ffffff', 
              color: '#334155',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="All Payment Types">All Payments</option>
            <option value="Prepaid">Prepaid / Paid</option>
            <option value="Token">Token / Partial</option>
            <option value="COD">COD</option>
            <option value="Credit">Credit Terms</option>
            <option value="Unpaid">Unpaid</option>
          </select>
          <ChevronDown size={14} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        {/* Interactive Date Range Filter */}
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />

        {/* Reset Filter Button */}
        {(searchQuery || selectedAgent !== 'All Agents' || selectedPayment !== 'All Payment Types' || startDate || endDate || activeTab !== 'All') && (
          <button 
            type="button"
            onClick={handleReset}
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px', 
              borderRadius: '8px', 
              border: '1px solid #cbd5e1', 
              backgroundColor: '#ffffff', 
              fontSize: '0.8125rem', 
              cursor: 'pointer', 
              fontWeight: 500, 
              color: '#475569',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.color = '#475569';
            }}
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        )}

        {/* Auto Tracking Sync Badge & Manual Trigger (30m Interval) */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Export Dropdown Menu */}
          <div className="erp-export-dropdown-container" ref={exportMenuRef}>
            <button
              type="button"
              className="btn-erp-export"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              title="Export orders to Excel or CSV"
            >
              <Download size={14} />
              <span>Export {selectedDocIds.size > 0 ? `(${selectedDocIds.size})` : ''}</span>
              <ChevronDown size={13} style={{ transform: isExportMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {isExportMenuOpen && (
              <div className="erp-export-dropdown-menu">
                <div className="erp-export-dropdown-header">
                  <span>{selectedDocIds.size > 0 ? `Export Selected (${selectedDocIds.size})` : `Export All (${filteredDocs.length})`}</span>
                </div>
                <button
                  type="button"
                  className="erp-export-dropdown-item"
                  onClick={() => handleExport('xlsx')}
                >
                  <FileSpreadsheet size={15} style={{ color: '#10b981' }} />
                  <div className="erp-export-item-text">
                    <span className="title">Excel Spreadsheet</span>
                    <span className="sub">.xlsx format</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="erp-export-dropdown-item"
                  onClick={() => handleExport('csv')}
                >
                  <Download size={15} style={{ color: '#3b82f6' }} />
                  <div className="erp-export-item-text">
                    <span className="title">CSV File</span>
                    <span className="sub">Standard comma-separated</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Selection Action Buttons (Matched with Theme) */}
          {selectedDocIds.size > 0 && (
            <>
              <div className="btn-selection-count" title={`${selectedDocIds.size} orders selected`}>
                <span className="selection-count-pill">{selectedDocIds.size}</span>
                <span>Selected</span>
              </div>

              <button
                type="button"
                className="btn-select-all"
                onClick={handleToggleSelectAll}
                title={isAllSelected ? "Deselect page" : `Select all ${paginatedDocs.length} on page`}
              >
                <span>{isAllSelected ? "Deselect Page" : `Select Page (${paginatedDocs.length})`}</span>
              </button>

              <button
                type="button"
                className="btn-delete-selected"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                title="Delete selected orders"
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete ({selectedDocIds.size})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn-clear-selection"
                onClick={() => setSelectedDocIds(new Set())}
                title="Clear selection"
              >
                <X size={14} />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => handleSyncAllTracking(true)}
            disabled={isSyncingTracking}
            title={lastSyncTime ? `Last synced at ${lastSyncTime}. Auto-refreshes every 30 minutes.` : "Auto-refreshes every 30 minutes. Click to refresh live AWB tracking now."}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #bbf7d0',
              backgroundColor: isSyncingTracking ? '#f0fdf4' : '#ffffff',
              fontSize: '0.78rem',
              cursor: isSyncingTracking ? 'not-allowed' : 'pointer',
              fontWeight: 550,
              color: '#15803d',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (!isSyncingTracking) {
                e.currentTarget.style.backgroundColor = '#f0fdf4';
                e.currentTarget.style.borderColor = '#86efac';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSyncingTracking) {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#bbf7d0';
              }
            }}
          >
            <RefreshCw size={13} style={{ animation: isSyncingTracking ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isSyncingTracking ? 'Syncing AWBs...' : 'Sync Tracking (30m)'}</span>
          </button>
        </div>
      </div>

      {/* ─── 3. MOBILE ORDER CARDS VIEW (HIDDEN ON DESKTOP) ─── */}
      <div className="mobile-order-cards" style={{ display: 'none', flexDirection: 'column', gap: '12px', padding: '16px' }}>
        {paginatedDocs.map((doc) => (
          <div 
            key={doc.id}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={selectedDocIds.has(doc.id)}
                  onChange={() => handleToggleSelect(doc.id)}
                  className="table-checkbox"
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 550, color: 'var(--accent-primary, #4f46e5)', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace' }}>
                    <FileText size={13} /> {doc.documentNumber} • {doc.date}
                  </span>
                  <h4 style={{ margin: '4px 0 0 0', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                    {doc.customerName}
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    {doc.customerSub} • Rep: {doc.agentName}
                  </p>
                </div>
              </div>

              <span style={{ 
                backgroundColor: doc.statusBg, 
                color: doc.statusColor, 
                padding: '3px 8px', 
                borderRadius: '9999px', 
                fontSize: '0.72rem', 
                fontWeight: 500 
              }}>
                {doc.status}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '10px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Amount</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>₹{doc.totalAmount.toLocaleString()}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Payment</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569' }}>{doc.paymentType}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Commission</span>
                <button 
                  onClick={() => setCommissionModal(doc)}
                  style={{ background: 'none', border: 'none', color: '#10b981', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', padding: 0 }}
                >
                  ₹{doc.commissionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </button>
              </div>
            </div>

            {doc.awbNumber && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569', backgroundColor: '#f0fdf4', padding: '6px 10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <span>AWB: <span style={{ fontWeight: 550 }}>{doc.awbNumber}</span></span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => copyToClipboard(doc.awbNumber!)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary, #4f46e5)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}>
                    {copiedAwb === doc.awbNumber ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={() => setTrackingOrder(doc)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Truck size={13} /> Track
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '6px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', alignItems: 'center' }}>
              <a 
                href={`/${doc.type === 'Order' ? 'orders' : 'quotations'}/${doc.id}`} 
                style={{ 
                  flex: 1, 
                  textAlign: 'center', 
                  textDecoration: 'none', 
                  fontSize: '0.78rem', 
                  fontWeight: 600,
                  padding: '7px 8px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155'
                }}
              >
                View
              </a>
              {doc.type === 'Order' ? (
                <button
                  type="button"
                  onClick={() => setEditingOrder(doc)}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Edit
                </button>
              ) : (
                <a
                  href={`/quotations/${doc.id}/edit`}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  Edit
                </a>
              )}
              <button
                type="button"
                onClick={() => handleDeleteDoc(doc)}
                disabled={deletingId === doc.id}
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: deletingId === doc.id ? 'not-allowed' : 'pointer',
                  opacity: deletingId === doc.id ? 0.6 : 1
                }}
              >
                <Trash2 size={13} />
              </button>
              <a 
                href={doc.type === 'Order' ? `/orders/${doc.id}/invoice` : `/quotations/${doc.id}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ 
                  padding: '7px 12px',
                  textAlign: 'center', 
                  textDecoration: 'none', 
                  fontSize: '0.78rem', 
                  fontWeight: 600,
                  borderRadius: '8px',
                  backgroundColor: '#10b981', 
                  color: '#ffffff'
                }}
              >
                {doc.type === 'Order' ? 'Invoice' : 'Quote'}
              </a>
            </div>
          </div>
        ))}

        {filteredDocs.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', backgroundColor: '#ffffff', borderRadius: '12px' }}>
            No records found matching your filters.
          </div>
        )}
      </div>

      {/* ─── MOBILE PAGINATION FOOTER ─── */}
      <div className="mobile-order-pagination" style={{ display: 'none', padding: '0 16px 16px' }}>
        <TablePagination
          totalCount={filteredDocs.length}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName={activeTab === 'Quotations' ? 'quotations' : 'orders'}
          style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
        />
      </div>

      {/* ─── 4. MODERN DESKTOP DATA TABLE ─── */}
      <div className="desktop-order-table" ref={tableContainerRef} style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              <th className="table-checkbox-cell">
                <input
                  type="checkbox"
                  ref={headerCheckboxRef}
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  className="table-checkbox"
                />
              </th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Date</th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Customer</th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Agent</th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Amount</th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Payment</th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Discount</th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Commission</th>
              <th style={{ padding: '10px 14px', fontWeight: 550, whiteSpace: 'nowrap' }}>Doc # / Status</th>
              <th style={{ padding: '10px 14px', fontWeight: 550, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDocs.map((doc, idx) => (
              <tr 
                key={doc.id} 
                style={{ 
                  borderBottom: '1px solid #f1f5f9', 
                  backgroundColor: selectedDocIds.has(doc.id) ? '#f5f3ff' : (idx % 2 === 0 ? '#ffffff' : '#fafafa'),
                  transition: 'background-color 0.15s ease' 
                }} 
                onMouseEnter={(e) => {
                  if (!selectedDocIds.has(doc.id)) e.currentTarget.style.backgroundColor = 'var(--accent-light, #f8faff)';
                }} 
                onMouseLeave={(e) => {
                  if (!selectedDocIds.has(doc.id)) e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fafafa';
                }}
              >
                <td className="table-checkbox-cell">
                  <input
                    type="checkbox"
                    checked={selectedDocIds.has(doc.id)}
                    onChange={() => handleToggleSelect(doc.id)}
                    className="table-checkbox"
                  />
                </td>
                {/* Date */}
                <td style={{ padding: '12px 14px', color: '#475569', whiteSpace: 'nowrap', verticalAlign: 'middle', fontSize: '0.8125rem' }}>
                  {doc.date}
                </td>
                
                {/* Customer */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <a 
                    href={`/customers`} 
                    style={{ 
                      color: 'var(--accent-primary, #4f46e5)', 
                      fontWeight: 550, 
                      fontSize: '0.875rem', 
                      textDecoration: 'none',
                      display: 'block'
                    }}
                  >
                    {doc.customerName}
                  </a>
                  {doc.customerSub && (
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>
                      {doc.customerSub}
                    </div>
                  )}
                </td>
                
                {/* Agent */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      backgroundColor: 'var(--accent-light, #eff6ff)', 
                      color: 'var(--accent-primary, #4f46e5)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '0.72rem', 
                      fontWeight: 600 
                    }}>
                      {doc.agentName.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.8125rem' }}>{doc.agentName}</span>
                  </div>
                </td>
                
                {/* Amount */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <div style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.875rem', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{doc.totalAmount.toLocaleString()}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '1px' }}>
                    Taxable: ₹{doc.taxableAmount.toLocaleString()}
                  </div>
                </td>
                
                {/* Payment */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <span style={{ 
                    backgroundColor: doc.paymentType.toLowerCase().includes('prepaid') || doc.paymentType.toLowerCase() === 'paid' ? '#dcfce7' : doc.paymentType.toLowerCase().includes('token') || doc.paymentType.toLowerCase().includes('partial') ? '#dbeafe' : doc.paymentType.toLowerCase().includes('credit') ? '#fef3c7' : doc.paymentType.toLowerCase().includes('unpaid') ? '#fee2e2' : '#f1f5f9', 
                    color: doc.paymentType.toLowerCase().includes('prepaid') || doc.paymentType.toLowerCase() === 'paid' ? '#166534' : doc.paymentType.toLowerCase().includes('token') || doc.paymentType.toLowerCase().includes('partial') ? '#1e40af' : doc.paymentType.toLowerCase().includes('credit') ? '#854d0e' : doc.paymentType.toLowerCase().includes('unpaid') ? '#991b1b' : '#475569', 
                    padding: '3px 8px', 
                    borderRadius: '9999px', 
                    fontSize: '0.72rem', 
                    fontWeight: 600,
                    border: `1px solid ${doc.paymentType.toLowerCase().includes('prepaid') || doc.paymentType.toLowerCase() === 'paid' ? '#bbf7d0' : doc.paymentType.toLowerCase().includes('token') || doc.paymentType.toLowerCase().includes('partial') ? '#bfdbfe' : doc.paymentType.toLowerCase().includes('credit') ? '#fde68a' : doc.paymentType.toLowerCase().includes('unpaid') ? '#fecaca' : '#e2e8f0'}`,
                    display: 'inline-block',
                    whiteSpace: 'nowrap'
                  }}>
                    {doc.paymentType}
                  </span>
                </td>

                {/* Discount */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <span style={{ 
                    backgroundColor: 'var(--accent-light, #eff6ff)', 
                    color: 'var(--accent-primary, #4f46e5)', 
                    padding: '3px 8px', 
                    borderRadius: '9999px', 
                    border: '1px solid rgba(79, 70, 229, 0.2)',
                    fontSize: '0.72rem', 
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    display: 'inline-block'
                  }}>
                    {doc.discountBadge}
                  </span>
                </td>

                {/* Commission */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <button 
                    type="button"
                    onClick={() => setCommissionModal(doc)}
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      backgroundColor: '#f8fafc', 
                      color: '#0f172a', 
                      padding: '3px 8px', 
                      borderRadius: '6px', 
                      fontWeight: 500, 
                      fontSize: '0.78rem', 
                      gap: '4px', 
                      border: '1px solid #e2e8f0', 
                      cursor: 'pointer', 
                      outline: 'none',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary, #4f46e5)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                  >
                    <span>₹{doc.commissionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    <div style={{ opacity: 0.4 }}><FileText size={12} /></div>
                  </button>
                  <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '2px', fontWeight: 400 }}>
                    {doc.commissionAvg}
                  </div>
                </td>

                {/* Doc # / Status */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary, #4f46e5)', fontWeight: 550, fontSize: '0.8125rem', fontFamily: 'monospace', marginBottom: '4px' }}>
                    <FileText size={13} />
                    <span>{doc.documentNumber}</span>
                  </div>
                  
                  <span style={{ 
                    backgroundColor: doc.statusBg, 
                    color: doc.statusColor, 
                    padding: '2px 8px', 
                    borderRadius: '9999px', 
                    fontSize: '0.72rem', 
                    fontWeight: 500,
                    display: 'inline-block'
                  }}>
                    {doc.status}
                  </span>

                  {doc.awbNumber && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '5px', 
                      color: '#475569', 
                      fontSize: '0.73rem', 
                      marginTop: '5px',
                      whiteSpace: 'nowrap' 
                    }}>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>AWB:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{doc.awbNumber}</span>
                      <button 
                        type="button"
                        onClick={() => copyToClipboard(doc.awbNumber!)}
                        title="Copy AWB"
                        style={{ 
                          background: 'transparent', 
                          border: 'none', 
                          cursor: 'pointer', 
                          padding: '2px', 
                          color: 'var(--accent-primary, #4f46e5)', 
                          display: 'inline-flex', 
                          alignItems: 'center' 
                        }}
                      >
                        {copiedAwb === doc.awbNumber ? <CheckCircle2 size={13} color="#10b981" /> : <Copy size={13} />}
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTrackingOrder(doc);
                        }}
                        title="Track Shipment Live"
                        style={{ 
                          background: 'transparent', 
                          border: 'none', 
                          cursor: 'pointer', 
                          padding: '2px', 
                          color: '#10b981', 
                          display: 'inline-flex', 
                          alignItems: 'center' 
                        }}
                      >
                        <Truck size={13} />
                      </button>
                    </div>
                  )}
                </td>

                {/* Actions */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
                    
                    {/* View Details */}
                    <a 
                      href={`/${doc.type === 'Order' ? 'orders' : 'quotations'}/${doc.id}`} 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        width: '30px', 
                        height: '30px', 
                        backgroundColor: '#ffffff', 
                        color: '#475569', 
                        borderRadius: '8px', 
                        textDecoration: 'none', 
                        border: '1px solid #cbd5e1',
                        transition: 'all 0.15s ease'
                      }} 
                      title="View Details"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--accent-primary, #4f46e5)";
                        e.currentTarget.style.color = "var(--accent-primary, #4f46e5)";
                        e.currentTarget.style.backgroundColor = "var(--accent-light, #eff6ff)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#cbd5e1";
                        e.currentTarget.style.color = "#475569";
                        e.currentTarget.style.backgroundColor = "#ffffff";
                      }}
                    >
                      <Eye size={14} />
                    </a>

                    {/* Edit Action Button */}
                    {doc.type === 'Order' ? (
                      <button
                        type="button"
                        onClick={() => setEditingOrder(doc)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '30px',
                          height: '30px',
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          borderRadius: '8px',
                          border: '1px solid #bfdbfe',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title="Edit Sales Order"
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                      >
                        <Edit size={14} />
                      </button>
                    ) : (
                      <a
                        href={`/quotations/${doc.id}/edit`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '30px',
                          height: '30px',
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          borderRadius: '8px',
                          border: '1px solid #bfdbfe',
                          textDecoration: 'none',
                          transition: 'all 0.15s ease'
                        }}
                        title="Edit Quotation"
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                      >
                        <Edit size={14} />
                      </a>
                    )}

                    {/* Delete Action Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteDoc(doc)}
                      disabled={deletingId === doc.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '30px',
                        height: '30px',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                        cursor: deletingId === doc.id ? 'not-allowed' : 'pointer',
                        opacity: deletingId === doc.id ? 0.6 : 1,
                        transition: 'all 0.15s ease'
                      }}
                      title={`Delete ${doc.type}`}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                    >
                      <Trash2 size={14} />
                    </button>

                    {/* Tax Invoice / Quotation Sheet Action Button */}
                    <a 
                      href={doc.type === 'Order' ? `/orders/${doc.id}/invoice` : `/quotations/${doc.id}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        padding: '5px 11px', 
                        gap: '5px', 
                        height: '30px', 
                        backgroundColor: '#10b981', 
                        border: 'none', 
                        color: '#ffffff', 
                        borderRadius: '8px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        textDecoration: 'none',
                        boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
                        transition: 'all 0.15s ease'
                      }} 
                      title={doc.type === 'Order' ? "View & Print Tax Invoice" : "View & Print Quotation / Invoice Sheet"}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                    >
                      <FileText size={13} />
                      <span>{doc.type === 'Order' ? 'Invoice' : 'Quote / Inv'}</span>
                    </a>

                  </div>
                </td>
              </tr>
            ))}
            
            {filteredDocs.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                      <ShoppingBag size={24} />
                    </div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>No orders found</div>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#94a3b8' }}>
                      {searchQuery || selectedAgent !== 'All Agents' || selectedPayment !== 'All Payment Types' || startDate || endDate || activeTab !== 'All'
                        ? "Try adjusting or clearing your filters to see more results."
                        : !isAdmin 
                          ? "No orders have been recorded for your assigned customers yet."
                          : "Create your first sales order using the + Create Order button above."}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ─── DESKTOP PAGINATION FOOTER ─── */}
        <TablePagination
          totalCount={filteredDocs.length}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName={activeTab === 'Quotations' ? 'quotations' : 'orders'}
          containerRef={tableContainerRef}
        />
      </div>

      {/* ─── 5. COMMISSION CALCULATION MODAL ─── */}
      {commissionModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(15, 23, 42, 0.6)', 
            backdropFilter: 'blur(4px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 99999,
            padding: '16px'
          }}
          onClick={() => setCommissionModal(null)}
        >
          <div 
            style={{ 
              backgroundColor: '#ffffff', 
              borderRadius: '16px', 
              padding: '24px', 
              width: '100%', 
              maxWidth: '420px', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Commission Breakdown</h2>
              <button 
                type="button"
                onClick={() => setCommissionModal(null)} 
                style={{ 
                  background: '#f1f5f9', 
                  border: 'none', 
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer', 
                  color: '#64748b' 
                }}
              >
                <X size={15} />
              </button>
            </div>
            
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.8125rem' }}>
                <span style={{ color: '#64748b' }}>Order / Document:</span>
                <span style={{ fontWeight: 550, color: 'var(--accent-primary, #4f46e5)', fontFamily: 'monospace' }}>{commissionModal.documentNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.8125rem' }}>
                <span style={{ color: '#64748b' }}>Taxable Amount:</span>
                <span style={{ fontWeight: 550, color: '#0f172a' }}>₹{commissionModal.taxableAmount.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.8125rem' }}>
                <span style={{ color: '#64748b' }}>Discount Profile:</span>
                <span style={{ fontWeight: 550, color: commissionModal.discountColor }}>{commissionModal.discountBadge}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.8125rem' }}>
                <span style={{ color: '#64748b' }}>Commission Slab:</span>
                <span style={{ fontWeight: 550, color: 'var(--accent-primary, #4f46e5)' }}>{commissionModal.commissionAvg}</span>
              </div>
              <div style={{ borderTop: '1px dashed #cbd5e1', margin: '12px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>Calculated Commission:</span>
                <span style={{ fontWeight: 600, color: '#10b981', fontSize: '1.2rem', fontVariantNumeric: 'tabular-nums' }}>₹{commissionModal.commissionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', margin: 0 }}>
              Calculated based on {commissionModal.isCreditCustomer ? 'credit terms and discount slabs' : 'standard discount incentive rules'}.
            </p>
          </div>
        </div>
      )}

      {/* ─── 6. TRACKING MODAL ─── */}
      {trackingOrder && (
        <OrderTrackingModal
          orderId={trackingOrder.id}
          orderNumber={trackingOrder.documentNumber}
          awbNumber={trackingOrder.awbNumber}
          onClose={() => {
            setTrackingOrder(null);
            router.refresh();
          }}
        />
      )}

      {/* ─── 7. EDIT ORDER MODAL ─── */}
      {editingOrder && (
        <EditOrderModal
          isOpen={!!editingOrder}
          order={{
            id: editingOrder.id,
            orderNumber: editingOrder.documentNumber,
            customerName: editingOrder.customerName,
            totalAmount: editingOrder.totalAmount,
            status: editingOrder.status,
            paymentType: editingOrder.paymentType,
            notes: editingOrder.notes,
            awbNumber: editingOrder.awbNumber,
          }}
          onClose={() => setEditingOrder(null)}
          onSuccess={() => {
            // refresh
          }}
        />
      )}
    </div>
  );
}
