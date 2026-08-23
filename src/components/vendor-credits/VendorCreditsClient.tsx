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
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              padding: '20px 24px',
              maxHeight: '92vh',
              overflowY: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#dc2626', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileMinus size={16} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                    Record Vendor Debit Note / Credit
                  </h2>
                  <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--text-secondary)' }}>
                    Issue purchase returns or supplier price credit adjustment
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitCredit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, marginBottom: '3px' }}>
                    Select Vendor *
                  </label>
                  <ModernSearchableSelect
                    options={modalVendorOptions}
                    value={creditVendorId}
                    onChange={handleVendorSelect}
                    placeholder="-- Choose Vendor --"
                    searchPlaceholder="Search vendor name, contact..."
                    icon={<Building2 size={13} />}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, marginBottom: '3px' }}>
                    Link Vendor Bill (Optional)
                  </label>
                  <select
                    className="form-input"
                    style={{ width: '100%', height: '36px', fontSize: '0.82rem' }}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, marginBottom: '3px' }}>
                    Credit / Debit Note Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    style={{ width: '100%', height: '34px', fontSize: '0.8rem' }}
                    value={creditDate}
                    onChange={e => setCreditDate(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, marginBottom: '3px' }}>
                    Reason for Debit Note *
                  </label>
                  <select
                    className="form-input"
                    style={{ width: '100%', height: '34px', fontSize: '0.8rem' }}
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

              {/* Items Table */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', marginBottom: '14px', backgroundColor: 'var(--bg-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                    Returned / Adjusted Items
                  </span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    style={{ fontSize: '0.75rem', color: '#dc2626', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Plus size={13} /> Add Item
                  </button>
                </div>

                <div className="table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '6px', width: '28%' }}>Item / Product</th>
                        <th style={{ padding: '6px', width: '12%' }}>HSN</th>
                        <th style={{ padding: '6px', width: '12%' }}>Qty</th>
                        <th style={{ padding: '6px', width: '16%' }}>Rate (₹)</th>
                        <th style={{ padding: '6px', width: '12%' }}>GST %</th>
                        <th style={{ padding: '6px', width: '14%', textAlign: 'right' }}>Total (₹)</th>
                        <th style={{ padding: '6px', width: '6%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditItems.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '6px' }}>
                            <ModernSearchableSelect
                              options={productSelectOptions}
                              value={item.productId || ''}
                              onChange={(val) => handleItemChange(idx, 'productId', val)}
                              placeholder="Select Product"
                            />
                            <input
                              type="text"
                              placeholder="Description"
                              value={item.description}
                              onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                              style={{ width: '100%', fontSize: '0.75rem', marginTop: '4px', padding: '3px 6px', border: '1px solid var(--border)', borderRadius: '4px' }}
                            />
                          </td>
                          <td style={{ padding: '6px' }}>
                            <input
                              type="text"
                              value={item.hsnCode}
                              onChange={(e) => handleItemChange(idx, 'hsnCode', e.target.value)}
                              style={{ width: '100%', fontSize: '0.78rem', padding: '4px', border: '1px solid var(--border)', borderRadius: '4px' }}
                            />
                          </td>
                          <td style={{ padding: '6px' }}>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                              style={{ width: '100%', fontSize: '0.78rem', padding: '4px', border: '1px solid var(--border)', borderRadius: '4px' }}
                            />
                          </td>
                          <td style={{ padding: '6px' }}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) => handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                              style={{ width: '100%', fontSize: '0.78rem', padding: '4px', border: '1px solid var(--border)', borderRadius: '4px' }}
                            />
                          </td>
                          <td style={{ padding: '6px' }}>
                            <select
                              value={item.gstRate}
                              onChange={(e) => handleItemChange(idx, 'gstRate', parseFloat(e.target.value))}
                              style={{ width: '100%', fontSize: '0.78rem', padding: '4px', border: '1px solid var(--border)', borderRadius: '4px' }}
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td style={{ padding: '6px', textAlign: 'right', fontWeight: 600 }}>
                            ₹{item.total.toFixed(2)}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>
                            {creditItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItemRow(idx)}
                                style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, marginBottom: '3px' }}>
                    Notes & Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Return of 10 defective units against batch #412"
                    className="form-input"
                    style={{ width: '100%', fontSize: '0.8rem', resize: 'vertical' }}
                    value={creditNotes}
                    onChange={e => setCreditNotes(e.target.value)}
                  />

                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      id="deductStock"
                      checked={deductStock}
                      onChange={e => setDeductStock(e.target.checked)}
                    />
                    <label htmlFor="deductStock" style={{ fontSize: '0.76rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                      Deduct warehouse stock for returned products (Outward Return)
                    </label>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Subtotal:</span>
                    <span>₹{creditSubtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--text-muted)' }}>
                    <span>Tax Adjustment:</span>
                    <span>+ ₹{creditTaxTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '6px', fontWeight: 700, fontSize: '0.95rem', color: '#dc2626' }}>
                    <span>Total Debit Note Value:</span>
                    <span>₹{creditGrandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="action-btn"
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCredit}
                  className="primary-btn"
                  style={{ fontSize: '0.82rem', padding: '6px 18px', backgroundColor: '#dc2626', fontWeight: 600 }}
                >
                  <Check size={14} /> {submittingCredit ? 'Saving...' : 'Confirm & Save Debit Note'}
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
            if (e.target === e.currentTarget) setApplyModalCredit(null);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              padding: '20px 24px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Apply Credit {applyModalCredit.creditNoteNumber} to Bill
              </h3>
              <button
                type="button"
                onClick={() => setApplyModalCredit(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleApplySubmit}>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.8rem' }}>
                <div>Vendor: <strong>{applyModalCredit.vendor?.companyName}</strong></div>
                <div>Available Credit Balance: <strong style={{ color: '#059669' }}>₹{applyModalCredit.balanceAmount.toLocaleString('en-IN')}</strong></div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, marginBottom: '3px' }}>
                  Select Open Vendor Bill *
                </label>
                {openBillsForApply.length > 0 ? (
                  <select
                    required
                    className="form-input"
                    style={{ width: '100%', height: '36px', fontSize: '0.82rem' }}
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
                  <div style={{ fontSize: '0.75rem', color: '#dc2626', padding: '6px' }}>
                    No unpaid bills found for this vendor.
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, marginBottom: '3px' }}>
                  Adjustment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={applyModalCredit.balanceAmount}
                  required
                  className="form-input"
                  style={{ width: '100%', height: '34px', fontSize: '0.85rem', fontWeight: 600 }}
                  value={applyAmount}
                  onChange={e => setApplyAmount(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setApplyModalCredit(null)}
                  className="action-btn"
                  style={{ fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyingCredit || openBillsForApply.length === 0}
                  className="primary-btn"
                  style={{ fontSize: '0.82rem', backgroundColor: '#2563eb', fontWeight: 600 }}
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
            if (e.target === e.currentTarget) setViewCredit(null);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              padding: '24px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#dc2626' }}>Vendor Debit Note Voucher</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => window.print()}
                  className="action-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
                >
                  <Printer size={13} /> Print
                </button>
                <button
                  type="button"
                  onClick={() => setViewCredit(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 2px 0', fontSize: '1rem', fontWeight: 700 }}>{viewCredit.vendor?.companyName}</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GSTIN: {viewCredit.vendor?.gstNumber || 'Unregistered'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#dc2626' }}>{viewCredit.creditNoteNumber}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date: {new Date(viewCredit.creditDate).toLocaleDateString('en-GB')}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.78rem', marginBottom: '12px' }}>
                <div><strong>Reason:</strong> {viewCredit.reason}</div>
                <div><strong>Status:</strong> {viewCredit.status}</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', marginBottom: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Item Description</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Rate</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewCredit.items?.map((it: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px' }}>{it.description}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>{it.quantity}</td>
                      <td style={{ padding: '6px', textAlign: 'right' }}>₹{it.rate}</td>
                      <td style={{ padding: '6px', textAlign: 'right' }}>₹{it.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '8px', fontSize: '0.85rem' }}>
                <div><strong>Allocated to Bills:</strong> ₹{viewCredit.allocatedAmount.toLocaleString('en-IN')}</div>
                <div><strong>Available Credit:</strong> <span style={{ color: '#059669', fontWeight: 700 }}>₹{viewCredit.balanceAmount.toLocaleString('en-IN')}</span></div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
