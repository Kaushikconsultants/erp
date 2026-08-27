"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  FileMinus,
  Plus,
  Search,
  Building2,
  Calendar,
  FileSpreadsheet,
  Printer,
  X,
  CreditCard,
  Trash2,
  Eye,
  Check,
  CheckCircle2,
  Clock,
  Receipt,
  Scale
} from 'lucide-react';
import { createVendorCredit, applyVendorCreditToBill } from '@/app/actions/vendorCreditActions';
import ModernSearchableSelect, { SelectOption } from '@/components/ui/ModernSearchableSelect';

interface VendorOption {
  id: string;
  companyName: string;
  contactPerson?: string | null;
  mobile?: string | null;
  gstNumber?: string | null;
  city?: string | null;
  state?: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  sku?: string | null;
  purchasePrice: number;
}

interface BillOption {
  id: string;
  billNumber: string;
  vendorBillNumber?: string | null;
  vendorId: string;
  totalAmount: number;
  amountDue: number;
  status: string;
}

interface VendorCreditItem {
  productId?: string;
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  gstRate: number;
  taxAmount: number;
  total: number;
}

interface VendorCreditRecord {
  id: string;
  creditNoteNumber: string;
  vendorId: string;
  vendor: VendorOption;
  billId?: string | null;
  bill?: { id: string; billNumber: string; vendorBillNumber?: string | null; totalAmount: number } | null;
  creditDate: string;
  reason: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  allocatedAmount: number;
  balanceAmount: number;
  notes?: string | null;
  items?: any[];
  createdAt: string;
}

export default function VendorCreditsClient({
  initialCredits,
  initialSummary,
  vendors,
  products,
  bills
}: {
  initialCredits: VendorCreditRecord[];
  initialSummary: any;
  vendors: VendorOption[];
  products: ProductOption[];
  bills: BillOption[];
}) {
  const [credits, setCredits] = useState<VendorCreditRecord[]>(initialCredits);
  const [summary, setSummary] = useState(initialSummary);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Create Credit Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creditVendorId, setCreditVendorId] = useState('');
  const [creditBillId, setCreditBillId] = useState('');
  const [creditDate, setCreditDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('Goods Return');
  const [creditNotes, setCreditNotes] = useState('');
  const [deductStock, setDeductStock] = useState(true);
  const [creditItems, setCreditItems] = useState<VendorCreditItem[]>([
    { productId: '', description: '', hsnCode: '6109', quantity: 1, rate: 0, gstRate: 12, taxAmount: 0, total: 0 }
  ]);
  const [submittingCredit, setSubmittingCredit] = useState(false);

  // Apply to Bill Modal State
  const [applyModalCredit, setApplyModalCredit] = useState<VendorCreditRecord | null>(null);
  const [applyBillId, setApplyBillId] = useState('');
  const [applyAmount, setApplyAmount] = useState('');
  const [applyingCredit, setApplyingCredit] = useState(false);

  // View Voucher Modal
  const [viewCredit, setViewCredit] = useState<VendorCreditRecord | null>(null);

  // Vendor Select Options
  const vendorSelectOptions: SelectOption[] = useMemo(() => [
    { value: 'All', label: 'All Vendors' },
    ...vendors.map(v => ({
      value: v.id,
      label: v.companyName,
      subLabel: `${v.contactPerson || ''} • ${v.city || ''}`
    }))
  ], [vendors]);

  const modalVendorOptions: SelectOption[] = useMemo(() => [
    ...vendors.map(v => ({
      value: v.id,
      label: v.companyName,
      subLabel: `${v.contactPerson || ''} • GST: ${v.gstNumber || 'Unregistered'}`
    }))
  ], [vendors]);

  const productSelectOptions: SelectOption[] = useMemo(() => [
    ...products.map(p => ({
      value: p.id,
      label: p.name,
      subLabel: `SKU: ${p.sku || '-'} • Cost: ₹${p.purchasePrice}`
    }))
  ], [products]);

  // Bills for selected vendor in create modal
  const vendorBillsForCreate = useMemo(() => {
    if (!creditVendorId) return [];
    return bills.filter(b => b.vendorId === creditVendorId);
  }, [bills, creditVendorId]);

  // Open bills for apply modal
  const openBillsForApply = useMemo(() => {
    if (!applyModalCredit) return [];
    return bills.filter(b => b.vendorId === applyModalCredit.vendorId && b.amountDue > 0);
  }, [bills, applyModalCredit]);

  const handleVendorSelect = (vId: string) => {
    setCreditVendorId(vId);
    setCreditBillId('');
  };

  // Line item helpers
  const handleItemChange = (index: number, field: keyof VendorCreditItem, value: any) => {
    const next = [...creditItems];
    next[index] = { ...next[index], [field]: value };

    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        next[index].description = prod.name;
        next[index].rate = prod.purchasePrice || 0;
      }
    }

    const qty = next[index].quantity || 0;
    const rate = next[index].rate || 0;
    const gst = next[index].gstRate || 0;
    const sub = qty * rate;
    const tax = (sub * gst) / 100;
    next[index].taxAmount = tax;
    next[index].total = sub + tax;

    setCreditItems(next);
  };

  const addItemRow = () => {
    setCreditItems([
      ...creditItems,
      { productId: '', description: '', hsnCode: '6109', quantity: 1, rate: 0, gstRate: 12, taxAmount: 0, total: 0 }
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (creditItems.length === 1) return;
    setCreditItems(creditItems.filter((_, i) => i !== idx));
  };

  const creditSubtotal = creditItems.reduce((s, it) => s + (it.quantity * it.rate), 0);
  const creditTaxTotal = creditItems.reduce((s, it) => s + it.taxAmount, 0);
  const creditGrandTotal = creditSubtotal + creditTaxTotal;

  // Filtered Credits
  const filteredCredits = useMemo(() => {
    return credits.filter(c => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const searchTerms = q.split(/\s+/).filter(Boolean);
        const text = [
          c.creditNoteNumber,
          c.vendor?.companyName,
          c.vendor?.contactPerson,
          c.bill?.billNumber,
          c.reason,
          c.status,
          c.notes,
          String(c.totalAmount),
          c.totalAmount ? c.totalAmount.toLocaleString('en-IN') : ''
        ].filter(Boolean).join(' ').toLowerCase();

        const match = searchTerms.every(term => text.includes(term));
        if (!match) return false;
      }

      if (selectedVendor !== 'All' && c.vendorId !== selectedVendor) {
        return false;
      }

      if (selectedStatus !== 'All' && c.status !== selectedStatus) {
        return false;
      }

      if (startDate) {
        const cDate = new Date(c.creditDate).toISOString().split('T')[0];
        if (cDate < startDate) return false;
      }
      if (endDate) {
        const cDate = new Date(c.creditDate).toISOString().split('T')[0];
        if (cDate > endDate) return false;
      }

      return true;
    });
  }, [credits, search, selectedVendor, selectedStatus, startDate, endDate]);

  // Handle Date presets
  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    if (preset === 'today') {
      const d = today.toISOString().split('T')[0];
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'week') {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // Submit Create Vendor Credit
  const handleSubmitCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditVendorId) {
      alert("Please select a vendor.");
      return;
    }
    if (creditItems.some(it => !it.description || it.quantity <= 0 || it.rate <= 0)) {
      alert("Please ensure all line items have description, quantity, and valid rate.");
      return;
    }

    setSubmittingCredit(true);
    const res = await createVendorCredit({
      vendorId: creditVendorId,
      billId: creditBillId || undefined,
      creditDate,
      reason,
      notes: creditNotes,
      items: creditItems,
      deductStock
    });
    setSubmittingCredit(false);

    if (res.error) {
      alert("Error: " + res.error);
    } else {
      setCreateModalOpen(false);
      window.location.reload();
    }
  };

  // Submit Apply Credit to Bill
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyModalCredit || !applyBillId || !applyAmount || parseFloat(applyAmount) <= 0) {
      alert("Please select a bill and enter a valid adjustment amount.");
      return;
    }

    setApplyingCredit(true);
    const res = await applyVendorCreditToBill(
      applyModalCredit.id,
      applyBillId,
      parseFloat(applyAmount)
    );
    setApplyingCredit(false);

    if (res.error) {
      alert("Error applying credit: " + res.error);
    } else {
      setApplyModalCredit(null);
      window.location.reload();
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const data = filteredCredits.map(c => ({
      "Debit Note #": c.creditNoteNumber,
      "Date": new Date(c.creditDate).toLocaleDateString('en-GB'),
      "Vendor Name": c.vendor?.companyName || '-',
      "Against Bill #": c.bill?.billNumber || '-',
      "Reason": c.reason,
      "Total Amount (₹)": c.totalAmount,
      "Allocated (₹)": c.allocatedAmount,
      "Balance (₹)": c.balanceAmount,
      "Status": c.status,
      "Notes": c.notes || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendor Credits");
    XLSX.writeFile(wb, `Vendor_Credits_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div className="dashboard-header mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <FileMinus size={22} />
            </span>
            <h1 className="page-title" style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700 }}>
              Vendor Credits & Debit Notes
            </h1>
          </div>
          <p className="page-subtitle" style={{ margin: '4px 0 0 38px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Record purchase returns, vendor debit notes, price adjustments, and allocate credits against bills
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={exportToExcel}
            className="action-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 500 }}
          >
            <FileSpreadsheet size={15} /> Export Excel
          </button>

          <button
            type="button"
            onClick={() => {
              setCreditVendorId('');
              setCreditBillId('');
              setCreditItems([{ productId: '', description: '', hsnCode: '6109', quantity: 1, rate: 0, gstRate: 12, taxAmount: 0, total: 0 }]);
              setCreateModalOpen(true);
            }}
            className="primary-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.84rem',
              padding: '8px 18px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)'
            }}
          >
            <Plus size={16} /> Record Debit Note / Credit
          </button>
        </div>
      </div>

      {/* KPI Summary Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        
        {/* Card 1: Total Credits */}
        <div className="glass-panel" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
            <FileMinus size={22} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Debit Notes</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#dc2626', marginTop: '2px' }}>
              ₹{summary.totalCreditAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              {summary.totalCredits} Notes Issued
            </div>
          </div>
        </div>

        {/* Card 2: Available Balance */}
        <div className="glass-panel" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Available Credit Balance</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#059669', marginTop: '2px' }}>
              ₹{summary.availableBalance?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '1px' }}>
              {summary.openCreditsCount} Active / Open
            </div>
          </div>
        </div>

        {/* Card 3: Applied to Bills */}
        <div className="glass-panel" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
            <Receipt size={22} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Applied to Bills</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>
              ₹{summary.adjustedAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              Set-off against payables
            </div>
          </div>
        </div>

        {/* Card 4: Main Reason */}
        <div className="glass-panel" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
            <Scale size={22} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Primary Reason</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              Goods Return
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              Defective / Excess Stock
            </div>
          </div>
        </div>

      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '20px', borderRadius: '12px' }}>
        
        {/* Row 1: Search & Dropdowns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1.5fr) minmax(200px, 1.2fr) minmax(160px, 1fr)', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
          
          {/* Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', minWidth: 0, height: '36px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search by Debit Note #, Vendor, Bill #, Reason..."
              style={{
                width: '100%',
                height: '36px',
                boxSizing: 'border-box',
                paddingLeft: '34px',
                paddingRight: search ? '30px' : '12px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '0.82rem',
                color: 'var(--text-primary)',
                outline: 'none',
                boxShadow: 'var(--shadow-sm)'
              }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Vendor Dropdown */}
          <ModernSearchableSelect
            options={vendorSelectOptions}
            value={selectedVendor}
            onChange={setSelectedVendor}
            placeholder="All Vendors"
            searchPlaceholder="Search vendor..."
            icon={<Building2 size={13} />}
          />

          {/* Status Dropdown */}
          <ModernSearchableSelect
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'OPEN', label: 'OPEN (Unadjusted)' },
              { value: 'ADJUSTED', label: 'ADJUSTED (Settled)' },
              { value: 'REFUNDED', label: 'REFUNDED' },
              { value: 'CANCELLED', label: 'CANCELLED' }
            ]}
            value={selectedStatus}
            onChange={setSelectedStatus}
            placeholder="All Statuses"
          />
        </div>

        {/* Row 2: Date Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
              <Calendar size={14} /> Period:
            </span>

            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleDatePreset(p.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: datePreset === p.id ? 600 : 400,
                  backgroundColor: datePreset === p.id ? 'var(--accent-primary)' : 'var(--bg-primary)',
                  color: datePreset === p.id ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer'
                }}
              >
                {p.label}
              </button>
            ))}

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px', backgroundColor: '#ffffff', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <input
                type="date"
                style={{ border: 'none', background: 'transparent', fontSize: '0.78rem', color: 'var(--text-primary)', outline: 'none' }}
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setDatePreset('custom'); }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>→</span>
              <input
                type="date"
                style={{ border: 'none', background: 'transparent', fontSize: '0.78rem', color: 'var(--text-primary)', outline: 'none' }}
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setDatePreset('custom'); }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredCredits.length}</strong> of {credits.length} debit notes
            </span>

            {(search || selectedVendor !== 'All' || selectedStatus !== 'All' || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedVendor('All');
                  setSelectedStatus('All');
                  setStartDate('');
                  setEndDate('');
                  setDatePreset('all');
                }}
                style={{ fontSize: '0.74rem', color: 'var(--accent-primary)', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Clear Filters
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Vendor Debit Notes Ledger</h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Showing {filteredCredits.length} credit entries</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Debit Note #</th>
                <th>Date</th>
                <th>Vendor</th>
                <th>Reason</th>
                <th>Against Bill</th>
                <th style={{ textAlign: 'right' }}>Credit Amount (₹)</th>
                <th style={{ textAlign: 'right' }}>Allocated (₹)</th>
                <th style={{ textAlign: 'right' }}>Available Balance (₹)</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCredits.map(cred => (
                <tr key={cred.id}>
                  <td style={{ fontWeight: 600, color: '#dc2626' }}>
                    {cred.creditNoteNumber}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {new Date(cred.creditDate).toLocaleDateString('en-GB')}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {cred.vendor?.companyName}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {cred.vendor?.contactPerson ? `${cred.vendor.contactPerson} • ` : ''}{cred.vendor?.mobile || ''}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {cred.reason}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {cred.bill ? (
                      <span style={{ fontWeight: 500, color: '#2563eb' }}>{cred.bill.billNumber}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>General / Standalone</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    ₹{cred.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'right', color: '#2563eb', fontWeight: 500 }}>
                    ₹{cred.allocatedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'right', color: cred.balanceAmount > 0 ? '#059669' : 'var(--text-muted)', fontWeight: 700 }}>
                    ₹{cred.balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      backgroundColor: cred.status === 'OPEN' ? '#ecfdf5' : cred.status === 'ADJUSTED' ? '#eff6ff' : '#f1f5f9',
                      color: cred.status === 'OPEN' ? '#059669' : cred.status === 'ADJUSTED' ? '#2563eb' : '#64748b',
                      border: `1px solid ${cred.status === 'OPEN' ? '#a7f3d0' : cred.status === 'ADJUSTED' ? '#bfdbfe' : '#cbd5e1'}`
                    }}>
                      {cred.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setViewCredit(cred)}
                        title="View Voucher"
                        style={{ padding: '4px', border: '1px solid var(--border)', borderRadius: '6px', background: '#ffffff', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        <Eye size={13} />
                      </button>

                      {cred.status === 'OPEN' && cred.balanceAmount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setApplyModalCredit(cred);
                            setApplyBillId('');
                            setApplyAmount(String(cred.balanceAmount));
                          }}
                          className="primary-btn"
                          style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: '#2563eb' }}
                        >
                          <Receipt size={12} /> Apply to Bill
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredCredits.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    <FileMinus size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>No vendor debit notes found matching criteria</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE DEBIT NOTE MODAL */}
      {mounted && createModalOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateModalOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '920px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              maxHeight: '92vh',
              overflowY: 'auto',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff', position: 'sticky', top: 0, zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(244, 63, 94, 0.25)', flexShrink: 0 }}>
                  <FileMinus size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.01em' }}>
                    Record Vendor Debit Note / Credit
                  </h2>
                  <p style={{ fontSize: '0.8rem', margin: '2px 0 0 0', color: '#64748b' }}>
                    Issue purchase returns or supplier price credit adjustment
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0', 
                  backgroundColor: '#f8fafc', 
                  color: '#64748b', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fee2e2';
                  e.currentTarget.style.color = '#dc2626';
                  e.currentTarget.style.borderColor = '#fca5a5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.color = '#64748b';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitCredit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Row 1: Vendor & Link Bill */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Select Vendor <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <ModernSearchableSelect
                      options={modalVendorOptions}
                      value={creditVendorId}
                      onChange={handleVendorSelect}
                      placeholder="-- Choose Vendor --"
                      searchPlaceholder="Search vendor name, contact..."
                      icon={<Building2 size={15} />}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Link Vendor Bill <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <select
                      style={{ 
                        width: '100%', 
                        height: '38px', 
                        fontSize: '0.84rem', 
                        padding: '0 12px', 
                        borderRadius: '8px', 
                        border: '1px solid #cbd5e1', 
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                        outline: 'none'
                      }}
                      value={creditBillId}
                      onChange={e => setCreditBillId(e.target.value)}
                    >
                      <option value="">-- Standalone / General Credit --</option>
                      {vendorBillsForCreate.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.billNumber} (Total: ₹{b.totalAmount.toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Date & Reason */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Credit / Debit Note Date <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      required
                      style={{ 
                        width: '100%', 
                        height: '38px', 
                        fontSize: '0.84rem', 
                        padding: '0 12px', 
                        borderRadius: '8px', 
                        border: '1px solid #cbd5e1', 
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                        outline: 'none'
                      }}
                      value={creditDate}
                      onChange={e => setCreditDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Reason for Debit Note <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      style={{ 
                        width: '100%', 
                        height: '38px', 
                        fontSize: '0.84rem', 
                        padding: '0 12px', 
                        borderRadius: '8px', 
                        border: '1px solid #cbd5e1', 
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                        outline: 'none'
                      }}
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                    >
                      <option>Goods Return</option>
                      <option>Rate Difference</option>
                      <option>Quality Rejection / Damaged Goods</option>
                      <option>Post-Purchase Discount</option>
                      <option>Shortage in Shipment</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                {/* Items Table Card */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Returned / Adjusted Items
                      </span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#b91c1c' }}>
                        {creditItems.length} {creditItems.length === 1 ? 'Item' : 'Items'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={addItemRow}
                      style={{ 
                        fontSize: '0.78rem', 
                        color: '#dc2626', 
                        backgroundColor: '#fef2f2', 
                        border: '1px solid #fca5a5', 
                        padding: '6px 12px', 
                        borderRadius: '6px', 
                        fontWeight: 600, 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '5px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#fee2e2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#fef2f2';
                      }}
                    >
                      <Plus size={14} /> Add Item
                    </button>
                  </div>

                  <div className="table-responsive" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                          <th style={{ padding: '10px 10px', fontWeight: 700, width: '32%', borderRadius: '6px 0 0 6px' }}>Item / Product</th>
                          <th style={{ padding: '10px 8px', fontWeight: 700, width: '12%', textAlign: 'center' }}>HSN</th>
                          <th style={{ padding: '10px 8px', fontWeight: 700, width: '10%', textAlign: 'center' }}>Qty</th>
                          <th style={{ padding: '10px 8px', fontWeight: 700, width: '16%', textAlign: 'right' }}>Rate (₹)</th>
                          <th style={{ padding: '10px 8px', fontWeight: 700, width: '12%', textAlign: 'center' }}>GST %</th>
                          <th style={{ padding: '10px 10px', fontWeight: 700, width: '14%', textAlign: 'right' }}>Total (₹)</th>
                          <th style={{ padding: '10px 6px', fontWeight: 700, width: '4%', textAlign: 'center', borderRadius: '0 6px 6px 0' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {creditItems.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                            <td style={{ padding: '10px 8px' }}>
                              <ModernSearchableSelect
                                options={productSelectOptions}
                                value={item.productId || ''}
                                onChange={(val) => handleItemChange(idx, 'productId', val)}
                                placeholder="Select Product"
                              />
                              <input
                                type="text"
                                placeholder="Return reason / Item details..."
                                value={item.description}
                                onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                style={{ width: '100%', fontSize: '0.78rem', marginTop: '6px', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', color: '#0f172a', outline: 'none' }}
                              />
                            </td>
                            <td style={{ padding: '10px 6px', verticalAlign: 'top', paddingTop: '10px' }}>
                              <input
                                type="text"
                                value={item.hsnCode}
                                onChange={(e) => handleItemChange(idx, 'hsnCode', e.target.value)}
                                style={{ width: '100%', fontSize: '0.82rem', padding: '8px 6px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'center', backgroundColor: '#ffffff', color: '#0f172a', outline: 'none' }}
                              />
                            </td>
                            <td style={{ padding: '10px 6px', verticalAlign: 'top', paddingTop: '10px' }}>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                                style={{ width: '100%', fontSize: '0.84rem', fontWeight: 600, padding: '8px 6px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'center', backgroundColor: '#ffffff', color: '#0f172a', outline: 'none' }}
                              />
                            </td>
                            <td style={{ padding: '10px 6px', verticalAlign: 'top', paddingTop: '10px' }}>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.rate}
                                onChange={(e) => handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                                style={{ width: '100%', fontSize: '0.84rem', fontWeight: 600, padding: '8px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'right', backgroundColor: '#ffffff', color: '#0f172a', outline: 'none' }}
                              />
                            </td>
                            <td style={{ padding: '10px 6px', verticalAlign: 'top', paddingTop: '10px' }}>
                              <select
                                value={item.gstRate}
                                onChange={(e) => handleItemChange(idx, 'gstRate', parseFloat(e.target.value))}
                                style={{ width: '100%', height: '36px', fontSize: '0.82rem', padding: '0 4px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'center', backgroundColor: '#ffffff', color: '#0f172a', outline: 'none' }}
                              >
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                              </select>
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', verticalAlign: 'top', paddingTop: '18px', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontSize: '0.9rem' }}>
                              ₹{item.total.toFixed(2)}
                            </td>
                            <td style={{ padding: '10px 4px', textAlign: 'center', verticalAlign: 'top', paddingTop: '14px' }}>
                              {creditItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeItemRow(idx)}
                                  style={{ 
                                    width: 28, 
                                    height: 28, 
                                    borderRadius: '6px', 
                                    border: '1px solid #fecaca', 
                                    backgroundColor: '#fef2f2', 
                                    color: '#dc2626', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#fee2e2';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#fef2f2';
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bottom Notes & Totals */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Notes & Remarks
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Return of defective / excess units against purchase bill"
                      style={{ 
                        width: '100%', 
                        fontSize: '0.82rem', 
                        padding: '10px 12px', 
                        borderRadius: '8px', 
                        border: '1px solid #cbd5e1', 
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                        resize: 'vertical',
                        outline: 'none'
                      }}
                      value={creditNotes}
                      onChange={e => setCreditNotes(e.target.value)}
                    />

                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px' }}>
                      <input
                        type="checkbox"
                        id="deductStock"
                        checked={deductStock}
                        onChange={e => setDeductStock(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#e11d48', cursor: 'pointer' }}
                      />
                      <label htmlFor="deductStock" style={{ fontSize: '0.78rem', color: '#9f1239', cursor: 'pointer', fontWeight: 500 }}>
                        📤 Automatically deduct warehouse stock for returned products (Outward Return)
                      </label>
                    </div>
                  </div>

                  <div style={{ background: '#fef2f2', padding: '14px 18px', borderRadius: '12px', border: '1px solid #fecaca', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
                      <span>Subtotal</span>
                      <span style={{ fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>₹{creditSubtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
                      <span>Tax Adjustment (GST)</span>
                      <span style={{ fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>+ ₹{creditTaxTotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1.5px dashed #fca5a5', paddingTop: '10px', marginTop: '2px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#991b1b' }}>Total Debit Note Value</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{creditGrandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 24px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  style={{ 
                    fontSize: '0.84rem', 
                    padding: '8px 18px', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1', 
                    backgroundColor: '#ffffff', 
                    color: '#475569', 
                    fontWeight: 600, 
                    cursor: 'pointer' 
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCredit}
                  style={{ 
                    fontSize: '0.86rem', 
                    padding: '8px 22px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    backgroundColor: '#dc2626', 
                    color: '#ffffff', 
                    fontWeight: 700, 
                    cursor: submittingCredit ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Check size={16} /> {submittingCredit ? 'Saving...' : 'Confirm & Save Debit Note'}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* APPLY CREDIT TO BILL MODAL */}
      {mounted && applyModalCredit && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setApplyModalCredit(null);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              overflow: 'hidden',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)' }}>
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Apply Credit Note #{applyModalCredit.creditNoteNumber}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
                    {applyModalCredit.vendor?.companyName}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setApplyModalCredit(null)}
                style={{ width: 30, height: 30, borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleApplySubmit}>
              <div style={{ padding: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Vendor</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>{applyModalCredit.vendor?.companyName}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Available Credit</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>₹{applyModalCredit.balanceAmount.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Select Open Vendor Bill <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  {openBillsForApply.length > 0 ? (
                    <select
                      required
                      style={{ width: '100%', height: '38px', fontSize: '0.84rem', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', outline: 'none' }}
                      value={applyBillId}
                      onChange={e => {
                        setApplyBillId(e.target.value);
                        const b = openBillsForApply.find(bill => bill.id === e.target.value);
                        if (b) {
                          setApplyAmount(String(Math.min(applyModalCredit.balanceAmount, b.amountDue)));
                        }
                      }}
                    >
                      <option value="">-- Choose Bill --</option>
                      {openBillsForApply.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.billNumber} (Due: ₹{b.amountDue.toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#dc2626', backgroundColor: '#fef2f2', padding: '10px 12px', borderRadius: '8px', border: '1px solid #fecaca', fontWeight: 500 }}>
                      No unpaid bills found for this vendor.
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Adjustment / Set-Off Amount (₹) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#2563eb', fontWeight: 700, fontSize: '0.9rem' }}>₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max={applyModalCredit.balanceAmount}
                      required
                      style={{ width: '100%', height: '38px', paddingLeft: '24px', paddingRight: '10px', fontSize: '0.9rem', fontWeight: 700, borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#0f172a' }}
                      value={applyAmount}
                      onChange={e => setApplyAmount(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => setApplyModalCredit(null)}
                  style={{ fontSize: '0.84rem', padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyingCredit || openBillsForApply.length === 0}
                  style={{ fontSize: '0.86rem', padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 700, cursor: (applyingCredit || openBillsForApply.length === 0) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.28)' }}
                >
                  {applyingCredit ? 'Applying...' : 'Confirm Set-Off'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* VIEW DEBIT NOTE VOUCHER MODAL */}
      {mounted && viewCredit && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewCredit(null);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '720px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              overflow: 'hidden',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileMinus size={18} color="#dc2626" />
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>Vendor Debit Note Voucher #{viewCredit.creditNoteNumber}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => window.print()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
                >
                  <Printer size={14} /> Print Voucher
                </button>
                <button
                  type="button"
                  onClick={() => setViewCredit(null)}
                  style={{ width: 30, height: 30, borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 3px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{viewCredit.vendor?.companyName}</h3>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>GSTIN: <strong style={{ color: '#0f172a' }}>{viewCredit.vendor?.gstNumber || 'Unregistered'}</strong></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#dc2626', fontSize: '1.05rem' }}>{viewCredit.creditNoteNumber}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Date: {new Date(viewCredit.creditDate).toLocaleDateString('en-GB')}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '0.8rem', marginBottom: '14px', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div><span style={{ color: '#64748b' }}>Reason:</span> <div style={{ fontWeight: 600, color: '#0f172a' }}>{viewCredit.reason}</div></div>
                  <div><span style={{ color: '#64748b' }}>Status:</span> <div><span style={{ fontWeight: 700, color: viewCredit.status === 'Open' ? '#2563eb' : '#16a34a' }}>{viewCredit.status}</span></div></div>
                  <div><span style={{ color: '#64748b' }}>Allocated:</span> <div style={{ fontWeight: 600, color: '#0f172a' }}>₹{viewCredit.allocatedAmount.toLocaleString('en-IN')}</div></div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', borderRadius: '6px 0 0 6px' }}>Item Description</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rate</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', borderRadius: '0 6px 6px 0' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewCredit.items?.map((it: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 10px', fontWeight: 500, color: '#0f172a' }}>{it.description}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'center', color: '#475569' }}>{it.quantity}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>₹{it.rate}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>₹{it.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px dashed #cbd5e1', paddingTop: '12px', fontSize: '0.9rem' }}>
                  <div>Allocated to Bills: <strong style={{ color: '#0f172a' }}>₹{viewCredit.allocatedAmount.toLocaleString('en-IN')}</strong></div>
                  <div>Available Credit Balance: <strong style={{ color: '#059669', fontSize: '1.05rem' }}>₹{viewCredit.balanceAmount.toLocaleString('en-IN')}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
