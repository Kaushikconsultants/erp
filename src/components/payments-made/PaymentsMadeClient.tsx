"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  Banknote,
  Plus,
  Search,
  Building2,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  Printer,
  X,
  CreditCard,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Eye,
  Check,
  Ban,
  Wallet,
  Receipt,
  Landmark,
  User,
  FileCheck
} from 'lucide-react';
import { recordVendorPayment, cancelVendorPayment } from '@/app/actions/vendorPaymentActions';
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

interface UnpaidBillOption {
  id: string;
  billNumber: string;
  vendorBillNumber?: string | null;
  vendorId: string;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
}

interface VendorPaymentRecord {
  id: string;
  paymentNumber: string;
  vendorId: string;
  vendor: VendorOption;
  billId?: string | null;
  bill?: { id: string; billNumber: string; vendorBillNumber?: string | null; totalAmount: number; amountDue: number } | null;
  amount: number;
  paymentDate: string;
  paymentMode: string;
  paidFromAccount?: string | null;
  referenceNumber?: string | null;
  paymentType: string;
  status: string;
  notes?: string | null;
  recordedBy?: string | null;
  createdAt: string;
}

export default function PaymentsMadeClient({
  initialPayments,
  initialSummary,
  vendors,
  unpaidBills
}: {
  initialPayments: VendorPaymentRecord[];
  initialSummary: any;
  vendors: VendorOption[];
  unpaidBills: UnpaidBillOption[];
}) {
  const [payments, setPayments] = useState<VendorPaymentRecord[]>(initialPayments);
  const [summary, setSummary] = useState(initialSummary);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('All');
  const [selectedMode, setSelectedMode] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Record Payment Modal State
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'bill' | 'advance'>('bill');
  const [payVendorId, setPayVendorId] = useState('');
  const [selectedBillId, setSelectedBillId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState('Bank Transfer (NEFT/RTGS)');
  const [payAccount, setPayAccount] = useState('HDFC Bank Current A/c - 016805006415');
  const [refNumber, setRefNumber] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Cancel Modal State
  const [cancelModalPay, setCancelModalPay] = useState<VendorPaymentRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('Entered in Error');
  const [cancelling, setCancelling] = useState(false);

  // View Remittance Advice Voucher State
  const [viewVoucher, setViewVoucher] = useState<VendorPaymentRecord | null>(null);

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

  // Bills for selected vendor
  const vendorBills = useMemo(() => {
    if (!payVendorId) return [];
    return unpaidBills.filter(b => b.vendorId === payVendorId);
  }, [unpaidBills, payVendorId]);

  const modalBillOptions: SelectOption[] = useMemo(() => [
    ...vendorBills.map(b => ({
      value: b.id,
      label: `${b.billNumber}${b.vendorBillNumber ? ` (${b.vendorBillNumber})` : ''}`,
      subLabel: `Balance Due: ₹${b.amountDue.toLocaleString('en-IN')}`
    }))
  ], [vendorBills]);

  // When vendor changes
  const handleVendorSelect = (vId: string) => {
    setPayVendorId(vId);
    setSelectedBillId('');
    setPayAmount('');
    const billsForV = unpaidBills.filter(b => b.vendorId === vId);
    if (billsForV.length > 0) {
      setSelectedBillId(billsForV[0].id);
      setPayAmount(String(billsForV[0].amountDue));
    }
  };

  // When bill changes
  const handleBillSelect = (bId: string) => {
    setSelectedBillId(bId);
    const b = unpaidBills.find(bill => bill.id === bId);
    if (b) {
      setPayAmount(String(b.amountDue));
    }
  };

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const searchTerms = q.split(/\s+/).filter(Boolean);
        const text = [
          p.paymentNumber,
          p.vendor?.companyName,
          p.vendor?.contactPerson,
          p.vendor?.mobile,
          p.bill?.billNumber,
          p.bill?.vendorBillNumber,
          p.paymentMode,
          p.paidFromAccount,
          p.referenceNumber,
          p.status,
          p.notes,
          String(p.amount),
          p.amount ? p.amount.toLocaleString('en-IN') : ''
        ].filter(Boolean).join(' ').toLowerCase();

        const match = searchTerms.every(term => text.includes(term));
        if (!match) return false;
      }

      if (selectedVendor !== 'All' && p.vendorId !== selectedVendor) {
        return false;
      }

      if (selectedMode !== 'All' && !p.paymentMode.toLowerCase().includes(selectedMode.toLowerCase())) {
        return false;
      }

      if (selectedType !== 'All' && p.paymentType !== selectedType) {
        return false;
      }

      if (startDate) {
        const pDate = new Date(p.paymentDate).toISOString().split('T')[0];
        if (pDate < startDate) return false;
      }
      if (endDate) {
        const pDate = new Date(p.paymentDate).toISOString().split('T')[0];
        if (pDate > endDate) return false;
      }

      return true;
    });
  }, [payments, search, selectedVendor, selectedMode, selectedType, startDate, endDate]);

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

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payVendorId || !payAmount || parseFloat(payAmount) <= 0) {
      alert("Please select a vendor and specify a valid payment amount.");
      return;
    }

    setSubmittingPayment(true);
    const res = await recordVendorPayment({
      vendorId: payVendorId,
      billId: modalTab === 'bill' ? selectedBillId : undefined,
      amount: parseFloat(payAmount),
      paymentDate: payDate,
      paymentMode: payMode,
      paidFromAccount: payAccount,
      referenceNumber: refNumber,
      paymentType: modalTab === 'bill' ? 'Bill Payment' : 'Vendor Advance',
      notes: payNotes
    });
    setSubmittingPayment(false);

    if (res.error) {
      alert("Error recording payment: " + res.error);
    } else {
      setRecordModalOpen(false);
      window.location.reload();
    }
  };

  // Cancel Payment
  const handleCancelPayment = async () => {
    if (!cancelModalPay) return;
    setCancelling(true);
    const res = await cancelVendorPayment(cancelModalPay.id, cancelReason);
    setCancelling(false);

    if (res.error) {
      alert("Error cancelling payment: " + res.error);
    } else {
      setCancelModalPay(null);
      window.location.reload();
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const data = filteredPayments.map(p => ({
      "Payment #": p.paymentNumber,
      "Date": new Date(p.paymentDate).toLocaleDateString('en-GB'),
      "Vendor Name": p.vendor?.companyName || '-',
      "Payment Type": p.paymentType,
      "Bill #": p.bill?.billNumber || 'Advance / Direct',
      "Amount Paid (₹)": p.amount,
      "Payment Mode": p.paymentMode,
      "Paid From Account": p.paidFromAccount || '-',
      "Reference # (UTR)": p.referenceNumber || '-',
      "Status": p.status,
      "Recorded By": p.recordedBy || '-',
      "Notes": p.notes || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payments Made");
    XLSX.writeFile(wb, `Vendor_Payments_Made_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div className="dashboard-header mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <Banknote size={22} />
            </span>
            <h1 className="page-title" style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700 }}>
              Payments Made (Vendor Outflow)
            </h1>
          </div>
          <p className="page-subtitle" style={{ margin: '4px 0 0 38px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Track all outgoing vendor remittances, bill disbursements, and advance deposits
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
              setPayVendorId('');
              setSelectedBillId('');
              setPayAmount('');
              setRecordModalOpen(true);
            }}
            className="primary-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#059669',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.84rem',
              padding: '8px 18px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
            }}
          >
            <Plus size={16} /> Record Vendor Payment
          </button>
        </div>
      </div>

      {/* KPI Summary Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        
        {/* Card 1: Total Outflow */}
        <div className="glass-panel" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
            <Banknote size={22} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Outflow Paid</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#059669', marginTop: '2px' }}>
              ₹{summary.totalPaidOut?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              {summary.totalTransactions} Total Remittances
            </div>
          </div>
        </div>

        {/* Card 2: Settled Bills */}
        <div className="glass-panel" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
            <Receipt size={22} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Bill Settlements</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>
              {summary.billPaymentsCount} Bills
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              Against Purchase Invoices
            </div>
          </div>
        </div>

        {/* Card 3: Vendor Advances */}
        <div className="glass-panel" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f766e' }}>
            <Wallet size={22} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Advance Deposits</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f766e', marginTop: '2px' }}>
              {summary.advancePaymentsCount} Recorded
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              On-Account Deposits
            </div>
          </div>
        </div>

        {/* Card 4: Outflow Bank */}
        <div className="glass-panel" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <Landmark size={22} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Primary Channel</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              HDFC Current A/c
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              NEFT / RTGS / IMPS
            </div>
          </div>
        </div>

      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '20px', borderRadius: '12px' }}>
        
        {/* Row 1: Search & Dropdowns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1.4fr) repeat(3, minmax(170px, 1fr))', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
          
          {/* Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', minWidth: 0, height: '36px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search by Payment #, Vendor, Bill #, UTR #..."
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

          {/* Payment Mode */}
          <ModernSearchableSelect
            options={[
              { value: 'All', label: 'All Modes' },
              { value: 'Bank Transfer', label: 'Bank Transfer (NEFT/RTGS)' },
              { value: 'UPI', label: 'UPI' },
              { value: 'Cheque', label: 'Cheque' },
              { value: 'Cash', label: 'Cash in Hand' }
            ]}
            value={selectedMode}
            onChange={setSelectedMode}
            placeholder="All Modes"
            icon={<Wallet size={13} />}
          />

          {/* Payment Type */}
          <ModernSearchableSelect
            options={[
              { value: 'All', label: 'All Types' },
              { value: 'Bill Payment', label: 'Bill Payment' },
              { value: 'Vendor Advance', label: 'Vendor Advance' }
            ]}
            value={selectedType}
            onChange={setSelectedType}
            placeholder="All Types"
            icon={<FileCheck size={13} />}
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
              Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredPayments.length}</strong> of {payments.length} remittances
            </span>

            {(search || selectedVendor !== 'All' || selectedMode !== 'All' || selectedType !== 'All' || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedVendor('All');
                  setSelectedMode('All');
                  setSelectedType('All');
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
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Vendor Outward Payments Ledger</h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Showing {filteredPayments.length} payment transaction entries</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Payment #</th>
                <th>Date</th>
                <th>Vendor</th>
                <th>Type</th>
                <th>Against Bill</th>
                <th style={{ textAlign: 'right' }}>Amount Paid (₹)</th>
                <th>Mode</th>
                <th>Paid From Account</th>
                <th>UTR / Ref #</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(pay => (
                <tr key={pay.id}>
                  <td style={{ fontWeight: 600, color: '#059669' }}>
                    {pay.paymentNumber}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {new Date(pay.paymentDate).toLocaleDateString('en-GB')}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {pay.vendor?.companyName}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {pay.vendor?.contactPerson ? `${pay.vendor.contactPerson} • ` : ''}{pay.vendor?.mobile || ''}
                    </div>
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      backgroundColor: pay.paymentType === 'Bill Payment' ? '#eff6ff' : '#f0fdfa',
                      color: pay.paymentType === 'Bill Payment' ? '#2563eb' : '#0f766e',
                      border: `1px solid ${pay.paymentType === 'Bill Payment' ? '#bfdbfe' : '#99f6e4'}`
                    }}>
                      {pay.paymentType}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {pay.bill ? (
                      <span style={{ fontWeight: 500, color: '#2563eb' }}>{pay.bill.billNumber}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Advance / On-Account</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669', fontSize: '0.9rem' }}>
                    ₹{pay.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {pay.paymentMode}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {pay.paidFromAccount || '-'}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {pay.referenceNumber || '-'}
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      backgroundColor: pay.status === 'Completed' ? '#ecfdf5' : '#fef2f2',
                      color: pay.status === 'Completed' ? '#059669' : '#dc2626',
                      border: `1px solid ${pay.status === 'Completed' ? '#a7f3d0' : '#fca5a5'}`
                    }}>
                      {pay.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setViewVoucher(pay)}
                        title="Print Advice"
                        style={{ padding: '4px', border: '1px solid var(--border)', borderRadius: '6px', background: '#ffffff', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        <Eye size={13} />
                      </button>

                      {pay.status === 'Completed' && (
                        <button
                          type="button"
                          onClick={() => setCancelModalPay(pay)}
                          title="Cancel / Reverse Payment"
                          style={{ padding: '4px', border: '1px solid var(--border)', borderRadius: '6px', background: '#ffffff', color: 'var(--danger)', cursor: 'pointer' }}
                        >
                          <Ban size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    <Banknote size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>No vendor payments found matching criteria</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD VENDOR PAYMENT MODAL */}
      {mounted && recordModalOpen && createPortal(
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
            if (e.target === e.currentTarget) setRecordModalOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '860px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              padding: '18px 24px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 30, height: 30, borderRadius: '8px', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                  <Plus size={16} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Record Vendor Payment
                  </h2>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Settle unpaid vendor bills or issue advance deposit
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRecordModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitPayment}>
              {/* Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', backgroundColor: 'var(--bg-primary)', padding: '3px', borderRadius: '8px', marginBottom: '12px', border: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setModalTab('bill')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: modalTab === 'bill' ? 600 : 400,
                    backgroundColor: modalTab === 'bill' ? '#059669' : 'transparent',
                    color: modalTab === 'bill' ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    cursor: 'pointer'
                  }}
                >
                  <Receipt size={13} /> Settle Unpaid Bill
                </button>

                <button
                  type="button"
                  onClick={() => setModalTab('advance')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: modalTab === 'advance' ? 600 : 400,
                    backgroundColor: modalTab === 'advance' ? '#0f766e' : 'transparent',
                    color: modalTab === 'advance' ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    cursor: 'pointer'
                  }}
                >
                  <Building2 size={13} /> Vendor Advance / On-Account
                </button>
              </div>

              {/* 2 Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                
                {/* Left Column: Vendor & Bill */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                      Select Vendor *
                    </label>
                    <ModernSearchableSelect
                      options={modalVendorOptions}
                      value={payVendorId}
                      onChange={handleVendorSelect}
                      placeholder="-- Choose Vendor --"
                      searchPlaceholder="Search vendor name, contact..."
                      icon={<Building2 size={13} />}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                      {modalTab === 'bill' ? 'Select Bill to Settle *' : 'Allocation Type'}
                    </label>
                    {modalTab === 'bill' ? (
                      !payVendorId ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', backgroundColor: '#ffffff', padding: '8px', borderRadius: '6px', border: '1px dashed var(--border)' }}>
                          Select a vendor to pick unpaid bills
                        </div>
                      ) : vendorBills.length > 0 ? (
                        <ModernSearchableSelect
                          options={modalBillOptions}
                          value={selectedBillId}
                          onChange={handleBillSelect}
                          placeholder="Select Bill"
                          searchPlaceholder="Search bill #..."
                          icon={<Receipt size={13} />}
                        />
                      ) : (
                        <div style={{ fontSize: '0.74rem', color: '#059669', backgroundColor: '#ecfdf5', padding: '7px 10px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                          ✓ No pending bills for this vendor.
                        </div>
                      )
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#0f766e', backgroundColor: '#f0fdfa', padding: '7px 10px', borderRadius: '6px', border: '1px solid #99f6e4' }}>
                        Advance will be credited to vendor balance
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                      Remarks / Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cleared via online banking"
                      className="form-input"
                      style={{ width: '100%', height: '34px', fontSize: '0.8rem' }}
                      value={payNotes}
                      onChange={e => setPayNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* Right Column: Amount, Mode & Bank */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                        Amount (₹) *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#059669', fontWeight: 700, fontSize: '0.85rem' }}>
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          required
                          placeholder="0.00"
                          className="form-input"
                          style={{ width: '100%', paddingLeft: '22px', height: '34px', fontSize: '0.85rem', fontWeight: 600 }}
                          value={payAmount}
                          onChange={e => setPayAmount(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                        Payment Date *
                      </label>
                      <input
                        type="date"
                        required
                        className="form-input"
                        style={{ width: '100%', height: '34px', fontSize: '0.78rem' }}
                        value={payDate}
                        onChange={e => setPayDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                        Payment Mode
                      </label>
                      <select
                        className="form-input"
                        style={{ width: '100%', height: '34px', fontSize: '0.78rem' }}
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
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                        Paid From Account
                      </label>
                      <select
                        className="form-input"
                        style={{ width: '100%', height: '34px', fontSize: '0.78rem' }}
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
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                      UTR / Cheque Ref #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UTR-9876543210"
                      className="form-input"
                      style={{ width: '100%', height: '34px', fontSize: '0.8rem' }}
                      value={refNumber}
                      onChange={e => setRefNumber(e.target.value)}
                    />
                  </div>

                </div>

              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRecordModalOpen(false)}
                  className="action-btn"
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="primary-btn"
                  style={{ fontSize: '0.82rem', padding: '6px 18px', backgroundColor: '#059669', fontWeight: 600 }}
                >
                  <Check size={14} /> {submittingPayment ? 'Recording...' : 'Confirm & Save Payment'}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CANCEL PAYMENT MODAL */}
      {mounted && cancelModalPay && createPortal(
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
            if (e.target === e.currentTarget) setCancelModalPay(null);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              padding: '20px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--danger)', marginBottom: '6px' }}>
              Cancel & Reverse Vendor Payment
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Are you sure you want to cancel payment <strong>{cancelModalPay.paymentNumber}</strong> of <strong>₹{cancelModalPay.amount.toLocaleString('en-IN')}</strong>? This will restore the unpaid balance on the vendor bill.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, marginBottom: '4px' }}>
                Cancellation Reason
              </label>
              <select
                className="form-input"
                style={{ width: '100%', fontSize: '0.82rem' }}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              >
                <option>Entered in Error</option>
                <option>Bank Transaction Failed</option>
                <option>Vendor Refund</option>
                <option>Duplicate Entry</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setCancelModalPay(null)}
                className="action-btn"
                style={{ fontSize: '0.8rem' }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCancelPayment}
                disabled={cancelling}
                style={{ backgroundColor: 'var(--danger)', color: '#ffffff', fontWeight: 600, padding: '6px 14px', borderRadius: '6px', border: 'none', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                {cancelling ? 'Reversing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* VIEW VOUCHER MODAL */}
      {mounted && viewVoucher && createPortal(
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
            if (e.target === e.currentTarget) setViewVoucher(null);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '640px',
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
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#059669' }}>Vendor Remittance Advice Voucher</span>
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
                  onClick={() => setViewVoucher(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '12px' }}>
                <h3 style={{ margin: '0 0 2px 0', fontSize: '1.1rem', fontWeight: 700 }}>ESPON CLOTHING PRIVATE LIMITED</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OUTWARD VENDOR REMITTANCE ADVICE</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '10px' }}>
                <div><strong>Voucher #:</strong> {viewVoucher.paymentNumber}</div>
                <div><strong>Date:</strong> {new Date(viewVoucher.paymentDate).toLocaleDateString('en-GB')}</div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-primary)', padding: '10px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '12px' }}>
                <div><strong>Paid To:</strong> {viewVoucher.vendor?.companyName}</div>
                <div><strong>Contact:</strong> {viewVoucher.vendor?.contactPerson} ({viewVoucher.vendor?.mobile})</div>
                {viewVoucher.vendor?.gstNumber && <div><strong>GSTIN:</strong> {viewVoucher.vendor.gstNumber}</div>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '10px' }}>
                <span><strong>Payment Type:</strong> {viewVoucher.paymentType}</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#059669' }}>
                  ₹{viewVoucher.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <div>Paid via: <strong>{viewVoucher.paymentMode}</strong> ({viewVoucher.paidFromAccount})</div>
                <div>UTR / Ref: <strong>{viewVoucher.referenceNumber || '-'}</strong></div>
                <div>Recorded by: {viewVoucher.recordedBy || 'Accounts Team'}</div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
