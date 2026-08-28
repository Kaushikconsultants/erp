"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  Receipt,
  Plus,
  Search,
  Building2,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  X,
  CreditCard,
  Trash2,
  Package,
  Clock,
  ArrowUpRight,
  Eye,
  Check,
  Ban,
  Wallet,
  Sparkles
} from 'lucide-react';
import { createBill, updateBillStatus } from '@/app/actions/billActions';
import { recordVendorPayment } from '@/app/actions/vendorPaymentActions';
import ModernSearchableSelect, { SelectOption } from '@/components/ui/ModernSearchableSelect';
import PurchaseBillScannerModal from '@/components/bills/PurchaseBillScannerModal';

interface VendorOption {
  id: string;
  companyName: string;
  contactPerson?: string | null;
  mobile?: string | null;
  gstNumber?: string | null;
  city?: string | null;
  state?: string | null;
  paymentTerms?: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  sku?: string | null;
  purchasePrice: number;
  sellingPrice: number;
}

interface PurchaseOrderOption {
  id: string;
  poNumber: string;
  vendorId: string;
  totalValue: number;
  status: string;
  items?: any[];
}

interface BillItem {
  productId?: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  gstRate: number;
  taxAmount: number;
  total: number;
}

interface BillRecord {
  id: string;
  billNumber: string;
  vendorBillNumber?: string | null;
  vendorId: string;
  vendor: VendorOption;
  purchaseOrderId?: string | null;
  purchaseOrder?: { id: string; poNumber: string; status: string } | null;
  billDate: string;
  dueDate?: string | null;
  paymentTerms?: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  status: string;
  notes?: string | null;
  items?: any[];
  payments?: any[];
  vendorCredits?: any[];
  createdAt: string;
}

export default function BillsClient({
  initialBills,
  initialSummary,
  vendors,
  products,
  purchaseOrders
}: {
  initialBills: BillRecord[];
  initialSummary: any;
  vendors: VendorOption[];
  products: ProductOption[];
  purchaseOrders: PurchaseOrderOption[];
}) {
  const [bills, setBills] = useState<BillRecord[]>(initialBills);
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

  // Create Bill Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [showAiScanner, setShowAiScanner] = useState(false);
  const [billVendorId, setBillVendorId] = useState('');
  const [billPoId, setBillPoId] = useState('');
  const [vendorBillNumber, setVendorBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [billNotes, setBillNotes] = useState('');
  const [autoRestock, setAutoRestock] = useState(true);
  const [billItems, setBillItems] = useState<BillItem[]>([
    { productId: '', description: '', hsnCode: '6109', quantity: 1, unit: 'pcs', rate: 0, gstRate: 12, taxAmount: 0, total: 0 }
  ]);
  const [submittingBill, setSubmittingBill] = useState(false);

  // Quick Record Payment Modal State
  const [payModalBill, setPayModalBill] = useState<BillRecord | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState('Bank Transfer (NEFT/RTGS)');
  const [payAccount, setPayAccount] = useState('HDFC Bank Current A/c - 016805006415');
  const [refNumber, setRefNumber] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // View Voucher Modal
  const [viewBill, setViewBill] = useState<BillRecord | null>(null);

  // Vendor options for Select
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

  // When Vendor changes in Create Bill Modal
  const handleVendorSelect = (vId: string) => {
    setBillVendorId(vId);
    setBillPoId('');
    const v = vendors.find(vend => vend.id === vId);
    if (v?.paymentTerms) {
      setPaymentTerms(v.paymentTerms);
    }
  };

  // When PO is selected to autofill bill
  const handlePoSelect = (poId: string) => {
    setBillPoId(poId);
    if (!poId) return;
    const po = purchaseOrders.find(p => p.id === poId);
    if (po && po.items && po.items.length > 0) {
      const itemsFromPo: BillItem[] = po.items.map((it: any) => {
        const prod = products.find(p => p.id === it.productId);
        const lineSubtotal = it.quantity * it.rate;
        const lineTax = (lineSubtotal * 12) / 100;
        return {
          productId: it.productId,
          description: prod ? prod.name : 'Goods item',
          hsnCode: '6109',
          quantity: it.quantity,
          unit: 'pcs',
          rate: it.rate,
          gstRate: 12,
          taxAmount: lineTax,
          total: lineSubtotal + lineTax
        };
      });
      setBillItems(itemsFromPo);
    }
  };

  // Line item helpers
  const handleItemChange = (index: number, field: keyof BillItem, value: any) => {
    const next = [...billItems];
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

    setBillItems(next);
  };

  const addItemRow = () => {
    setBillItems([
      ...billItems,
      { productId: '', description: '', hsnCode: '6109', quantity: 1, unit: 'pcs', rate: 0, gstRate: 12, taxAmount: 0, total: 0 }
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (billItems.length === 1) return;
    setBillItems(billItems.filter((_, i) => i !== idx));
  };

  // Bill totals
  const billSubtotal = billItems.reduce((s, it) => s + (it.quantity * it.rate), 0);
  const billTaxTotal = billItems.reduce((s, it) => s + it.taxAmount, 0);
  const billGrandTotal = billSubtotal + billTaxTotal;

  // Filtered Bills
  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const searchTerms = q.split(/\s+/).filter(Boolean);
        const text = [
          b.billNumber,
          b.vendorBillNumber,
          b.vendor?.companyName,
          b.vendor?.contactPerson,
          b.vendor?.mobile,
          b.vendor?.gstNumber,
          b.status,
          b.notes,
          String(b.totalAmount),
          b.totalAmount ? b.totalAmount.toLocaleString('en-IN') : ''
        ].filter(Boolean).join(' ').toLowerCase();

        const match = searchTerms.every(term => text.includes(term));
        if (!match) return false;
      }

      if (selectedVendor !== 'All' && b.vendorId !== selectedVendor) {
        return false;
      }

      if (selectedStatus !== 'All' && b.status !== selectedStatus) {
        return false;
      }

      if (startDate) {
        const bDate = new Date(b.billDate).toISOString().split('T')[0];
        if (bDate < startDate) return false;
      }
      if (endDate) {
        const bDate = new Date(b.billDate).toISOString().split('T')[0];
        if (bDate > endDate) return false;
      }

      return true;
    });
  }, [bills, search, selectedVendor, selectedStatus, startDate, endDate]);

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

  // Submit Create Bill
  const handleSubmitBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billVendorId) {
      alert("Please select a vendor.");
      return;
    }
    if (billItems.some(it => !it.description || it.quantity <= 0 || it.rate < 0)) {
      alert("Please ensure all line items have description, quantity, and valid rate.");
      return;
    }

    setSubmittingBill(true);
    const res = await createBill({
      vendorId: billVendorId,
      vendorBillNumber,
      purchaseOrderId: billPoId || undefined,
      billDate,
      dueDate,
      paymentTerms,
      notes: billNotes,
      items: billItems,
      autoRestock
    });
    setSubmittingBill(false);

    if (res.error) {
      alert("Error: " + res.error);
    } else {
      setCreateModalOpen(false);
      window.location.reload();
    }
  };

  // Quick Record Payment against Bill
  const handleQuickPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalBill || !payAmount || parseFloat(payAmount) <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    setRecordingPayment(true);
    const res = await recordVendorPayment({
      vendorId: payModalBill.vendorId,
      billId: payModalBill.id,
      amount: parseFloat(payAmount),
      paymentDate: payDate,
      paymentMode: payMode,
      paidFromAccount: payAccount,
      referenceNumber: refNumber,
      notes: payNotes
    });
    setRecordingPayment(false);

    if (res.error) {
      alert("Error recording payment: " + res.error);
    } else {
      setPayModalBill(null);
      window.location.reload();
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const data = filteredBills.map(b => ({
      "Bill #": b.billNumber,
      "Vendor Invoice #": b.vendorBillNumber || '-',
      "Vendor Name": b.vendor?.companyName || '-',
      "Bill Date": new Date(b.billDate).toLocaleDateString('en-GB'),
      "Due Date": b.dueDate ? new Date(b.dueDate).toLocaleDateString('en-GB') : '-',
      "Total Amount (₹)": b.totalAmount,
      "Paid Amount (₹)": b.amountPaid,
      "Due Amount (₹)": b.amountDue,
      "Status": b.status,
      "Terms": b.paymentTerms || '-',
      "Notes": b.notes || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendor Bills");
    XLSX.writeFile(wb, `Vendor_Bills_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div className="dashboard-header mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <Receipt size={22} />
            </span>
            <h1 className="page-title" style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700 }}>
              Vendor Bills & Purchase Invoices
            </h1>
          </div>
          <p className="page-subtitle" style={{ margin: '4px 0 0 38px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Record supplier purchase bills, track accounts payable, and manage invoice settlements
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
            onClick={() => setShowAiScanner(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              fontWeight: 600,
              fontSize: '0.84rem',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={16} color="#2563eb" /> AI Scan Bill (PDF / Photo)
          </button>

          <button
            type="button"
            onClick={() => {
              setBillVendorId('');
              setBillPoId('');
              setVendorBillNumber('');
              setBillItems([{ productId: '', description: '', hsnCode: '6109', quantity: 1, unit: 'pcs', rate: 0, gstRate: 12, taxAmount: 0, total: 0 }]);
              setCreateModalOpen(true);
            }}
            className="primary-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.84rem',
              padding: '8px 18px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
            }}
          >
            <Plus size={16} /> Record Vendor Bill
          </button>
        </div>
      </div>

      {/* KPI Summary Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        
        {/* Card 1: Total Incurred */}
        <div className="glass-panel" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
            <Receipt size={22} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Incurred Bills</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              ₹{summary.totalAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              {summary.totalBills} Recorded Bills
            </div>
          </div>
        </div>

        {/* Card 2: Outstanding Payables (Unpaid) */}
        <div className="glass-panel" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Unpaid Payables</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#e11d48', marginTop: '2px' }}>
              ₹{summary.totalDue?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#e11d48', marginTop: '1px' }}>
              {summary.unpaidCount} Pending Bills
            </div>
          </div>
        </div>

        {/* Card 3: Total Settled / Paid */}
        <div className="glass-panel" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Settled to Vendors</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#059669', marginTop: '2px' }}>
              ₹{summary.totalPaid?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '1px' }}>
              {summary.paidCount} Fully Paid
            </div>
          </div>
        </div>

        {/* Card 4: Overdue Bills */}
        <div className="glass-panel" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Overdue Bills</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#d97706', marginTop: '2px' }}>
              {summary.overdueCount} Overdue
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              Past Payment Term
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
              placeholder="Search by Bill #, Vendor Bill #, Vendor Name..."
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
              { value: 'Open', label: 'Open / Unpaid' },
              { value: 'Partially Paid', label: 'Partially Paid' },
              { value: 'Paid', label: 'Paid' },
              { value: 'Void', label: 'Void / Cancelled' }
            ]}
            value={selectedStatus}
            onChange={setSelectedStatus}
            placeholder="All Statuses"
          />
        </div>

        {/* Row 2: Date Filters & Summary */}
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
              Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredBills.length}</strong> of {bills.length} bills
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

      {/* Bills Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Vendor Bills Ledger</h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Showing {filteredBills.length} purchase bill entries</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Bill #</th>
                <th>Vendor Inv #</th>
                <th>Vendor</th>
                <th>Bill Date</th>
                <th>Due Date</th>
                <th style={{ textAlign: 'right' }}>Total (₹)</th>
                <th style={{ textAlign: 'right' }}>Paid (₹)</th>
                <th style={{ textAlign: 'right' }}>Balance Due (₹)</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map(bill => (
                <tr key={bill.id}>
                  <td style={{ fontWeight: 600, color: '#2563eb' }}>
                    {bill.billNumber}
                    {bill.purchaseOrder && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PO: {bill.purchaseOrder.poNumber}</div>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {bill.vendorBillNumber || '-'}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {bill.vendor?.companyName}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {bill.vendor?.contactPerson ? `${bill.vendor.contactPerson} • ` : ''}{bill.vendor?.mobile || ''}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {new Date(bill.billDate).toLocaleDateString('en-GB')}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('en-GB') : '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    ₹{bill.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'right', color: '#059669', fontWeight: 500 }}>
                    ₹{bill.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'right', color: bill.amountDue > 0 ? '#e11d48' : 'var(--text-muted)', fontWeight: 600 }}>
                    ₹{bill.amountDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      backgroundColor: bill.status === 'Paid' ? '#ecfdf5' : bill.status === 'Partially Paid' ? '#eff6ff' : bill.status === 'Open' ? '#fff1f2' : '#f1f5f9',
                      color: bill.status === 'Paid' ? '#059669' : bill.status === 'Partially Paid' ? '#2563eb' : bill.status === 'Open' ? '#e11d48' : '#64748b',
                      border: `1px solid ${bill.status === 'Paid' ? '#a7f3d0' : bill.status === 'Partially Paid' ? '#bfdbfe' : bill.status === 'Open' ? '#fecdd3' : '#cbd5e1'}`
                    }}>
                      {bill.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      
                      {/* View Voucher */}
                      <button
                        type="button"
                        onClick={() => setViewBill(bill)}
                        title="View Bill Details"
                        style={{ padding: '4px', border: '1px solid var(--border)', borderRadius: '6px', background: '#ffffff', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        <Eye size={13} />
                      </button>

                      {/* Record Payment if open */}
                      {bill.amountDue > 0 && bill.status !== 'Void' && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayModalBill(bill);
                            setPayAmount(String(bill.amountDue));
                          }}
                          className="primary-btn"
                          style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: '#059669' }}
                        >
                          <Wallet size={12} /> Pay
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredBills.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    <Receipt size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>No vendor bills found matching criteria</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE VENDOR BILL POPUP MODAL */}
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
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)', flexShrink: 0 }}>
                  <Receipt size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.01em' }}>
                    Record New Vendor Bill
                  </h2>
                  <p style={{ fontSize: '0.8rem', margin: '2px 0 0 0', color: '#64748b' }}>
                    Enter purchase invoice details from supplier
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAiScanner(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    padding: '6px 12px',
                    borderRadius: '7px',
                    cursor: 'pointer'
                  }}
                >
                  <Sparkles size={14} /> Scan with AI
                </button>

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
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitBill} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              
              <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Row 1: Vendor & Optional PO Selection */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Select Vendor <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <ModernSearchableSelect
                      options={modalVendorOptions}
                      value={billVendorId}
                      onChange={handleVendorSelect}
                      placeholder="-- Choose Vendor --"
                      searchPlaceholder="Search vendor name, contact, GST..."
                      icon={<Building2 size={15} />}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Link Purchase Order <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
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
                      value={billPoId}
                      onChange={e => handlePoSelect(e.target.value)}
                    >
                      <option value="">-- No PO (Direct Bill) --</option>
                      {purchaseOrders
                        .filter(po => !billVendorId || po.vendorId === billVendorId)
                        .map(po => (
                          <option key={po.id} value={po.id}>
                            {po.poNumber} (₹{po.totalValue.toLocaleString('en-IN')})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Vendor Bill #, Dates, Terms */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Vendor Bill / Inv #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. INV-9842"
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
                      value={vendorBillNumber}
                      onChange={e => setVendorBillNumber(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Bill Date <span style={{ color: '#ef4444' }}>*</span>
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
                      value={billDate}
                      onChange={e => setBillDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Due Date
                    </label>
                    <input
                      type="date"
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
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Payment Terms
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
                      value={paymentTerms}
                      onChange={e => setPaymentTerms(e.target.value)}
                    >
                      <option>Due on Receipt</option>
                      <option>Net 15</option>
                      <option>Net 30</option>
                      <option>Net 45</option>
                      <option>Net 60</option>
                    </select>
                  </div>
                </div>

                {/* Line Items Table Card */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Items & Pricing
                      </span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', backgroundColor: '#e2e8f0', color: '#475569' }}>
                        {billItems.length} {billItems.length === 1 ? 'Line Item' : 'Line Items'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={addItemRow}
                      style={{ 
                        fontSize: '0.78rem', 
                        color: '#2563eb', 
                        backgroundColor: '#eff6ff', 
                        border: '1px solid #bfdbfe', 
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
                        e.currentTarget.style.backgroundColor = '#dbeafe';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#eff6ff';
                      }}
                    >
                      <Plus size={14} /> Add Line Item
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
                        {billItems.map((item, idx) => (
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
                                placeholder="Item Description / Details..."
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
                              {billItems.length > 1 && (
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

                {/* Bottom Summary & Notes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Internal Notes & Remarks
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Received batch #412 via transport with verified packing list"
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
                      value={billNotes}
                      onChange={e => setBillNotes(e.target.value)}
                    />

                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                      <input
                        type="checkbox"
                        id="autoRestock"
                        checked={autoRestock}
                        onChange={e => setAutoRestock(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                      />
                      <label htmlFor="autoRestock" style={{ fontSize: '0.78rem', color: '#166534', cursor: 'pointer', fontWeight: 500 }}>
                        📦 Automatically increase warehouse inventory stock (Inward GRN)
                      </label>
                    </div>
                  </div>

                  <div style={{ background: '#eff6ff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
                      <span>Subtotal</span>
                      <span style={{ fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>₹{billSubtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
                      <span>Taxes (GST)</span>
                      <span style={{ fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>+ ₹{billTaxTotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1.5px dashed #bfdbfe', paddingTop: '10px', marginTop: '2px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e40af' }}>Total Bill Value</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{billGrandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
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
                  disabled={submittingBill}
                  style={{ 
                    fontSize: '0.86rem', 
                    padding: '8px 22px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    backgroundColor: '#2563eb', 
                    color: '#ffffff', 
                    fontWeight: 700, 
                    cursor: submittingBill ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Check size={16} /> {submittingBill ? 'Saving Bill...' : 'Confirm & Save Bill'}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* QUICK RECORD PAYMENT MODAL */}
      {mounted && payModalBill && createPortal(
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
            if (e.target === e.currentTarget) setPayModalBill(null);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
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
                <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)' }}>
                  <Wallet size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Pay Vendor Bill #{payModalBill.billNumber}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
                    {payModalBill.vendor?.companyName}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPayModalBill(null)}
                style={{ width: 30, height: 30, borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleQuickPaymentSubmit}>
              <div style={{ padding: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Bill Value</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>₹{payModalBill.totalAmount.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Remaining Balance Due</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#e11d48' }}>₹{payModalBill.amountDue.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                      Payment Amount (₹) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#059669', fontWeight: 700, fontSize: '0.9rem' }}>₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        required
                        style={{ width: '100%', height: '38px', paddingLeft: '24px', paddingRight: '10px', fontSize: '0.9rem', fontWeight: 700, borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#0f172a' }}
                        value={payAmount}
                        onChange={e => setPayAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                      Payment Date <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      required
                      style={{ width: '100%', height: '38px', padding: '0 10px', fontSize: '0.82rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#0f172a' }}
                      value={payDate}
                      onChange={e => setPayDate(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                      Payment Mode
                    </label>
                    <select
                      style={{ width: '100%', height: '38px', padding: '0 10px', fontSize: '0.82rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#ffffff', color: '#0f172a' }}
                      value={payMode}
                      onChange={e => setPayMode(e.target.value)}
                    >
                      <option>Bank Transfer (NEFT/RTGS)</option>
                      <option>UPI (GPay / PhonePe / Paytm)</option>
                      <option>Cheque</option>
                      <option>Cash in Hand</option>
                      <option>Debit Card</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                      Paid From Account
                    </label>
                    <select
                      style={{ width: '100%', height: '38px', padding: '0 10px', fontSize: '0.82rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#ffffff', color: '#0f172a' }}
                      value={payAccount}
                      onChange={e => setPayAccount(e.target.value)}
                    >
                      <option>HDFC Bank Current A/c - 016805006415</option>
                      <option>SBI Current Account</option>
                      <option>Petty Cash Box</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    Reference # (UTR / Cheque #)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-9876543210"
                    style={{ width: '100%', height: '38px', padding: '0 10px', fontSize: '0.84rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#0f172a' }}
                    value={refNumber}
                    onChange={e => setRefNumber(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => setPayModalBill(null)}
                  style={{ fontSize: '0.84rem', padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  style={{ fontSize: '0.86rem', padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#059669', color: '#ffffff', fontWeight: 700, cursor: recordingPayment ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.28)' }}
                >
                  {recordingPayment ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* VIEW BILL VOUCHER MODAL */}
      {mounted && viewBill && createPortal(
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
            if (e.target === e.currentTarget) setViewBill(null);
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
                <Receipt size={18} color="#2563eb" />
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>Purchase Bill Voucher #{viewBill.billNumber}</span>
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
                  onClick={() => setViewBill(null)}
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
                    <h3 style={{ margin: '0 0 3px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{viewBill.vendor?.companyName}</h3>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>GSTIN: <strong style={{ color: '#0f172a' }}>{viewBill.vendor?.gstNumber || 'Unregistered'}</strong></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#2563eb', fontSize: '1.05rem' }}>{viewBill.billNumber}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Date: {new Date(viewBill.billDate).toLocaleDateString('en-GB')}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '0.8rem', marginBottom: '14px', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div><span style={{ color: '#64748b' }}>Vendor Ref:</span> <div style={{ fontWeight: 600, color: '#0f172a' }}>{viewBill.vendorBillNumber || '-'}</div></div>
                  <div><span style={{ color: '#64748b' }}>Due Date:</span> <div style={{ fontWeight: 600, color: '#0f172a' }}>{viewBill.dueDate ? new Date(viewBill.dueDate).toLocaleDateString('en-GB') : '-'}</div></div>
                  <div><span style={{ color: '#64748b' }}>Terms:</span> <div style={{ fontWeight: 600, color: '#0f172a' }}>{viewBill.paymentTerms || 'Net 30'}</div></div>
                  <div><span style={{ color: '#64748b' }}>Status:</span> <div><span style={{ fontWeight: 700, color: viewBill.status === 'Paid' ? '#16a34a' : '#e11d48' }}>{viewBill.status}</span></div></div>
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
                    {viewBill.items?.map((it: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 10px', fontWeight: 500, color: '#0f172a' }}>{it.description}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'center', color: '#475569' }}>{it.quantity} {it.unit}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>₹{it.rate}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>₹{it.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px dashed #cbd5e1', paddingTop: '12px', fontSize: '0.9rem' }}>
                  <div>Amount Paid: <strong style={{ color: '#16a34a' }}>₹{viewBill.amountPaid.toLocaleString('en-IN')}</strong></div>
                  <div>Balance Due: <strong style={{ color: '#e11d48', fontSize: '1.05rem' }}>₹{viewBill.amountDue.toLocaleString('en-IN')}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* AI PURCHASE BILL SCANNER MODAL */}
      {showAiScanner && (
        <PurchaseBillScannerModal
          vendors={vendors}
          products={products}
          onClose={() => setShowAiScanner(false)}
          onApplyToBillForm={(extracted) => {
            setBillVendorId(extracted.vendorId);
            setVendorBillNumber(extracted.vendorBillNumber);
            setBillDate(extracted.billDate);
            setDueDate(extracted.dueDate);
            setPaymentTerms(extracted.paymentTerms);
            setBillNotes(extracted.notes);
            setBillItems(extracted.items.map(it => ({
              productId: it.productId,
              description: it.description,
              hsnCode: it.hsnCode,
              quantity: it.quantity,
              unit: it.unit,
              rate: it.rate,
              gstRate: it.gstRate,
              taxAmount: it.taxAmount,
              total: it.total
            })));
            setCreateModalOpen(true);
          }}
        />
      )}

    </div>
  );
}
