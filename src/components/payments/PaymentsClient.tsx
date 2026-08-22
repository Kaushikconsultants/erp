"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  IndianRupee,
  TrendingUp,
  CreditCard,
  Search,
  Plus,
  FileSpreadsheet,
  Printer,
  Calendar as CalendarIcon,
  Wallet,
  Building2,
  ArrowUpRight,
  Receipt,
  FileText,
  Ban,
  X,
  User,
  Hash,
  Landmark,
  FileCheck,
  Check,
  ChevronDown
} from 'lucide-react';
import { recordCustomerPayment, getCustomerUnpaidInvoices, cancelPayment } from '@/app/actions/paymentActions';

interface CustomerOption {
  id: string;
  businessName: string;
  contactPerson: string;
  mobile: string;
  gstNumber?: string | null;
  city?: string | null;
  state?: string | null;
}

interface PaymentRecord {
  id: string;
  paymentNumber: string;
  paymentType: string;
  amount: number;
  paymentDate: string | Date;
  paymentMode: string;
  receivingAccount?: string | null;
  referenceNumber?: string | null;
  payerName?: string | null;
  status: string;
  notes?: string | null;
  recordedBy?: string | null;
  customer?: {
    id: string;
    businessName: string;
    contactPerson: string;
    mobile: string;
    city?: string | null;
    state?: string | null;
    gstNumber?: string | null;
  } | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    amountPaid: number;
    amountDue: number;
    status: string;
    orderId?: string | null;
    order?: { orderNumber: string } | null;
  } | null;
  order?: {
    id: string;
    orderNumber: string;
    totalValue: number;
  } | null;
}

interface Props {
  initialPayments: PaymentRecord[];
  summary: {
    totalCollected: number;
    thisMonthCollected: number;
    totalOutstanding: number;
    advanceCount: number;
    byMode: Array<{ paymentMode: string; _sum: { amount: number | null } }>;
    byAccount: Array<{ receivingAccount: string; _sum: { amount: number | null } }>;
  } | null;
  customers: CustomerOption[];
}

const PAYMENT_MODES = [
  'UPI (GPay / PhonePe / Paytm / QR)',
  'Bank Transfer (NEFT / RTGS / IMPS)',
  'Cash',
  'Cheque',
  'Credit / Debit Card',
  'Online Gateway',
  'Advance Adjustment',
  'Other'
];

const RECEIVING_ACCOUNTS = [
  'HDFC Bank Current A/c - 016805006415',
  'ICICI Bank Current A/c',
  'State Bank of India (SBI Current A/c)',
  'Main Axis UPI QR (7206066678@OKBIZAXIS)',
  'Store Cash Counter (Rohtak Branch)',
  'Petty Cash Wallet'
];

const MODE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Cash: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
  UPI: { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' },
  'Bank Transfer': { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  Cheque: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  Card: { bg: '#fdf2f8', text: '#9d174d', border: '#fbcfe8' },
  'Online Gateway': { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  'Advance Adjustment': { bg: '#f0fdfa', text: '#0f766e', border: '#99f6e4' },
  Other: { bg: '#f8fafc', text: '#475569', border: '#cbd5e1' }
};

export default function PaymentsClient({ initialPayments, summary, customers }: Props) {
  const [payments, setPayments] = useState<PaymentRecord[]>(initialPayments);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedMode, setSelectedMode] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Record Payment Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'invoice' | 'advance'>('invoice');
  const [modalCustomer, setModalCustomer] = useState('');
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('UPI (GPay / PhonePe / Paytm / QR)');
  const [payAccount, setPayAccount] = useState('HDFC Bank Current A/c - 016805006415');
  const [refNumber, setRefNumber] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Cancel Payment Modal
  const [cancelModalPay, setCancelModalPay] = useState<PaymentRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('Entered in Error');
  const [cancelling, setCancelling] = useState(false);

  // View Receipt Modal State
  const [viewReceipt, setViewReceipt] = useState<PaymentRecord | null>(null);

  // Quick date presets
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

  // Quick set modal date (Today / Yesterday)
  const setQuickModalDate = (type: 'today' | 'yesterday') => {
    const d = new Date();
    if (type === 'yesterday') {
      d.setDate(d.getDate() - 1);
    }
    setPayDate(d.toISOString().split('T')[0]);
  };

  // When customer is selected in Record Payment Modal, load unpaid invoices
  const handleCustomerChange = async (custId: string) => {
    setModalCustomer(custId);
    setSelectedInvoiceId('');
    setPayAmount('');
    const cust = customers.find(c => c.id === custId);
    if (cust) {
      setPayerName(cust.businessName || cust.contactPerson);
    }

    if (!custId) {
      setCustomerInvoices([]);
      return;
    }

    setLoadingInvoices(true);
    const res = await getCustomerUnpaidInvoices(custId);
    setLoadingInvoices(false);
    if (res.success) {
      setCustomerInvoices(res.invoices || []);
      if (res.invoices && res.invoices.length > 0) {
        setSelectedInvoiceId(res.invoices[0].id);
        setPayAmount(String(res.invoices[0].amountDue));
      }
    }
  };

  const handleInvoiceSelect = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = customerInvoices.find(i => i.id === invId);
    if (inv) {
      setPayAmount(String(inv.amountDue));
    }
  };

  // Handle Form Submission
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCustomer || !payAmount || parseFloat(payAmount) <= 0) {
      alert("Please select a customer and specify a valid payment amount.");
      return;
    }

    setSubmitting(true);
    const cleanMode = payMode.split(' (')[0];

    const res = await recordCustomerPayment({
      paymentType: modalTab === 'invoice' ? 'Invoice Payment' : 'Advance Payment',
      customerId: modalCustomer,
      invoiceId: modalTab === 'invoice' ? selectedInvoiceId : undefined,
      amount: parseFloat(payAmount),
      paymentMode: cleanMode,
      receivingAccount: payAccount,
      referenceNumber: refNumber,
      payerName: payerName,
      paymentDate: payDate,
      notes: payNotes,
      status: 'Completed'
    });

    setSubmitting(false);

    if (res.error) {
      alert("Error: " + res.error);
    } else {
      setShowModal(false);
      window.location.reload();
    }
  };

  // Handle Payment Cancellation
  const handleCancelPayment = async () => {
    if (!cancelModalPay) return;
    setCancelling(true);
    const res = await cancelPayment(cancelModalPay.id, cancelReason);
    setCancelling(false);
    if (res.error) {
      alert("Error cancelling payment: " + res.error);
    } else {
      setCancelModalPay(null);
      window.location.reload();
    }
  };

  // Filter Payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchNumber = p.paymentNumber.toLowerCase().includes(q);
        const matchCust = p.customer?.businessName.toLowerCase().includes(q) || p.customer?.contactPerson.toLowerCase().includes(q) || p.customer?.mobile.includes(q);
        const matchInv = p.invoice?.invoiceNumber.toLowerCase().includes(q);
        const matchRef = p.referenceNumber?.toLowerCase().includes(q);
        const matchPayer = p.payerName?.toLowerCase().includes(q);
        if (!matchNumber && !matchCust && !matchInv && !matchRef && !matchPayer) return false;
      }

      // Mode
      if (selectedMode !== 'All') {
        if (!p.paymentMode.toLowerCase().includes(selectedMode.toLowerCase())) return false;
      }

      // Type
      if (selectedType !== 'All' && p.paymentType !== selectedType) {
        return false;
      }

      // Status
      if (selectedStatus !== 'All' && p.status !== selectedStatus) {
        return false;
      }

      // Customer
      if (selectedCustomer !== 'All' && p.customer?.id !== selectedCustomer) {
        return false;
      }

      // Date Range
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
  }, [payments, search, selectedMode, selectedType, selectedStatus, selectedCustomer, startDate, endDate]);

  // Export to Excel
  const exportToExcel = () => {
    const data = filteredPayments.map(p => ({
      "Payment #": p.paymentNumber,
      "Date": new Date(p.paymentDate).toLocaleDateString('en-GB'),
      "Customer Name": p.customer?.businessName || '-',
      "Contact Person": p.customer?.contactPerson || '-',
      "Mobile": p.customer?.mobile || '-',
      "Payment Type": p.paymentType,
      "Invoice #": p.invoice?.invoiceNumber || 'Advance / Direct',
      "Order #": p.order?.orderNumber || p.invoice?.order?.orderNumber || '-',
      "Amount (₹)": p.amount,
      "Payment Mode": p.paymentMode,
      "Receiving Account": p.receivingAccount || '-',
      "Reference / UTR #": p.referenceNumber || '-',
      "Payer Name": p.payerName || '-',
      "Status": p.status,
      "Recorded By": p.recordedBy || '-',
      "Notes": p.notes || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payment Collection");
    XLSX.writeFile(wb, `Payment_Collection_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getModeBadge = (mode: string) => {
    let matched = Object.keys(MODE_COLORS).find(k => mode.includes(k)) || 'Other';
    const style = MODE_COLORS[matched] || MODE_COLORS.Other;
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '0.75rem',
        fontWeight: 500,
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        {mode}
      </span>
    );
  };

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '10px',
            background: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Wallet size={20} />
          </div>
          <div>
            <h1 className="page-title" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Payment Collection & Ledger
            </h1>
            <p className="page-subtitle" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
              Track receipts, settle customer invoices, record advance deposits, and generate ledgers.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={exportToExcel}
            className="action-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ecfdf5',
              borderColor: '#a7f3d0',
              color: '#047857',
              fontWeight: 600,
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <FileSpreadsheet size={15} /> Export Excel
          </button>

          <Link
            href="/invoices"
            className="action-btn outline-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              textDecoration: 'none'
            }}
          >
            <FileText size={15} /> View Invoices
          </Link>

          <button
            onClick={() => setShowModal(true)}
            className="primary-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Plus size={16} /> Record Customer Payment
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="glass-panel" style={{ padding: '18px', display: 'flex', gap: '14px', alignItems: 'center', borderTop: '3px solid #10b981' }}>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={20} />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Collected</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--success)', marginTop: '2px' }}>
                ₹{summary.totalCollected.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '18px', display: 'flex', gap: '14px', alignItems: 'center', borderTop: '3px solid #6366f1' }}>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>This Month</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '2px' }}>
                ₹{summary.thisMonthCollected.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '18px', display: 'flex', gap: '14px', alignItems: 'center', borderTop: '3px solid #ef4444' }}>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={20} />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Outstanding</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--danger)', marginTop: '2px' }}>
                ₹{summary.totalOutstanding.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '18px', display: 'flex', gap: '14px', alignItems: 'center', borderTop: '3px solid #0d9488' }}>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: '#ccfbf1', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={20} />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Advance Deposits</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0f766e', marginTop: '2px' }}>
                {summary.advanceCount} Recorded
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        
        {/* Row 1: Search & Filter Dropdowns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(3, minmax(160px, 1fr))', gap: '10px', marginBottom: '12px' }}>
          
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search payment #, customer, UTR, ref..."
              className="form-input"
              style={{
                width: '100%',
                paddingLeft: '34px',
                fontSize: '0.82rem',
                fontWeight: 400
              }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Customer Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              className="form-input"
              style={{
                width: '100%',
                paddingRight: '28px',
                fontSize: '0.82rem',
                fontWeight: 400,
                appearance: 'none',
                cursor: 'pointer'
              }}
              value={selectedCustomer}
              onChange={e => setSelectedCustomer(e.target.value)}
            >
              <option value="All">All Customers</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.businessName} ({c.contactPerson})</option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          </div>

          {/* Payment Mode */}
          <div style={{ position: 'relative' }}>
            <select
              className="form-input"
              style={{
                width: '100%',
                paddingRight: '28px',
                fontSize: '0.82rem',
                fontWeight: 400,
                appearance: 'none',
                cursor: 'pointer'
              }}
              value={selectedMode}
              onChange={e => setSelectedMode(e.target.value)}
            >
              <option value="All">All Payment Modes</option>
              <option value="UPI">UPI / QR Code</option>
              <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="Card">Card</option>
              <option value="Advance Adjustment">Advance Adjustment</option>
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          </div>

          {/* Payment Type */}
          <div style={{ position: 'relative' }}>
            <select
              className="form-input"
              style={{
                width: '100%',
                paddingRight: '28px',
                fontSize: '0.82rem',
                fontWeight: 400,
                appearance: 'none',
                cursor: 'pointer'
              }}
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
            >
              <option value="All">All Payment Types</option>
              <option value="Invoice Payment">Invoice Payment</option>
              <option value="Advance Payment">Advance Payment</option>
              <option value="On-Account">On-Account</option>
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Row 2: Date Presets & Inputs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
              <CalendarIcon size={14} /> Period:
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

            {/* Date Input Controls */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px', backgroundColor: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <input
                type="date"
                style={{
                  padding: '2px 4px',
                  border: 'none',
                  background: 'transparent',
                  fontSize: '0.78rem',
                  fontWeight: 400,
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setDatePreset('custom'); }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>→</span>
              <input
                type="date"
                style={{
                  padding: '2px 4px',
                  border: 'none',
                  background: 'transparent',
                  fontSize: '0.78rem',
                  fontWeight: 400,
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setDatePreset('custom'); }}
              />
            </div>
          </div>

          {(search || selectedMode !== 'All' || selectedType !== 'All' || selectedCustomer !== 'All' || startDate || endDate) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedMode('All');
                setSelectedType('All');
                setSelectedCustomer('All');
                setSelectedStatus('All');
                handleDatePreset('all');
              }}
              style={{
                fontSize: '0.75rem',
                color: 'var(--danger)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              Reset Filters ✕
            </button>
          )}
        </div>
      </div>

      {/* Payment History Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Payment Transactions Ledger</h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Showing {filteredPayments.length} transaction entries</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Payment #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Invoice / Ref</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Mode & Channel</th>
                <th>Reference / UTR</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(pay => (
                <tr key={pay.id}>
                  <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                    {pay.paymentNumber}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {new Date(pay.paymentDate).toLocaleDateString('en-GB')}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {pay.customer?.businessName || pay.payerName || '-'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {pay.customer?.contactPerson ? `${pay.customer.contactPerson} • ` : ''}{pay.customer?.mobile || ''}
                    </div>
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      backgroundColor: pay.paymentType === 'Advance Payment' ? '#f0fdfa' : 'var(--bg-primary)',
                      color: pay.paymentType === 'Advance Payment' ? '#0f766e' : 'var(--text-secondary)',
                      border: `1px solid ${pay.paymentType === 'Advance Payment' ? '#99f6e4' : 'var(--border)'}`
                    }}>
                      {pay.paymentType}
                    </span>
                  </td>
                  <td>
                    {pay.invoice ? (
                      <a
                        href={`/orders/${pay.invoice.orderId}/invoice`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2563eb', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        {pay.invoice.invoiceNumber} <ArrowUpRight size={12} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Advance Deposit</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)', fontSize: '0.9rem' }}>
                    ₹{pay.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <div>{getModeBadge(pay.paymentMode)}</div>
                    {pay.receivingAccount && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {pay.receivingAccount.split(' - ')[0]}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <div>{pay.referenceNumber || '-'}</div>
                    {pay.payerName && pay.payerName !== pay.customer?.businessName && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Payer: {pay.payerName}</div>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${pay.status === 'Completed' ? 'active' : pay.status === 'Cancelled' ? 'danger' : 'warning'}`} style={{ fontWeight: 500, fontSize: '0.75rem' }}>
                      {pay.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => setViewReceipt(pay)}
                        className="action-btn outline-primary"
                        style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Print Receipt Voucher"
                      >
                        <Receipt size={13} /> Receipt
                      </button>

                      {pay.status === 'Completed' && (
                        <button
                          onClick={() => setCancelModalPay(pay)}
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.75rem',
                            backgroundColor: '#fff1f2',
                            color: '#e11d48',
                            border: '1px solid #fecdd3',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title="Cancel / Reverse Payment"
                        >
                          <Ban size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                    <Wallet size={32} style={{ margin: '0 auto 10px auto', color: 'var(--border)' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>No payment records found</div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Click "Record Customer Payment" to log collections, advances, or bank transfers.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPACT & STYLISH RECORD PAYMENT MODAL (NO SCROLLING NEEDED) */}
      {showModal && (
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="modal-content glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '24px' }}>
            
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: '8px',
                  background: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}>
                  <Plus size={16} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Record Customer Payment
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Settle open invoice or receive customer advance deposit
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="close-btn"
                style={{ fontSize: '1.25rem', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitPayment}>
              
              {/* Tab Selector Segmented Bar */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
                backgroundColor: 'var(--bg-primary)',
                padding: '4px',
                borderRadius: '8px',
                marginBottom: '14px',
                border: '1px solid var(--border)'
              }}>
                <button
                  type="button"
                  onClick={() => setModalTab('invoice')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: modalTab === 'invoice' ? 600 : 400,
                    backgroundColor: modalTab === 'invoice' ? 'var(--bg-secondary)' : 'transparent',
                    color: modalTab === 'invoice' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    border: 'none',
                    boxShadow: modalTab === 'invoice' ? 'var(--shadow-sm)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <FileCheck size={14} /> Settle Unpaid Invoice
                </button>

                <button
                  type="button"
                  onClick={() => setModalTab('advance')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: modalTab === 'advance' ? 600 : 400,
                    backgroundColor: modalTab === 'advance' ? 'var(--bg-secondary)' : 'transparent',
                    color: modalTab === 'advance' ? '#0f766e' : 'var(--text-secondary)',
                    border: 'none',
                    boxShadow: modalTab === 'advance' ? 'var(--shadow-sm)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Building2 size={14} /> Advance / On-Account
                </button>
              </div>

              {/* Grid 1: Customer & Invoice in clean 2-column layout */}
              <div style={{ display: 'grid', gridTemplateColumns: modalTab === 'invoice' && modalCustomer ? '1.1fr 1fr' : '1fr', gap: '12px', marginBottom: '12px' }}>
                
                {/* Select Customer */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Customer *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <select
                      required
                      className="form-input"
                      style={{
                        width: '100%',
                        paddingLeft: '30px',
                        paddingRight: '26px',
                        fontSize: '0.82rem',
                        fontWeight: 400,
                        appearance: 'none',
                        cursor: 'pointer'
                      }}
                      value={modalCustomer}
                      onChange={e => handleCustomerChange(e.target.value)}
                    >
                      <option value="">-- Choose Customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.businessName} ({c.contactPerson}) {c.city ? `• ${c.city}` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* If Invoice Tab & Customer Selected, show compact Invoice Picker */}
                {modalTab === 'invoice' && modalCustomer && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Invoice to Settle *
                    </label>
                    {loadingInvoices ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '6px' }}>Loading invoices...</div>
                    ) : customerInvoices.length > 0 ? (
                      <div style={{ position: 'relative' }}>
                        <select
                          className="form-input"
                          style={{
                            width: '100%',
                            paddingRight: '26px',
                            fontSize: '0.82rem',
                            fontWeight: 500,
                            color: 'var(--accent-primary)',
                            appearance: 'none',
                            cursor: 'pointer'
                          }}
                          value={selectedInvoiceId}
                          onChange={e => handleInvoiceSelect(e.target.value)}
                        >
                          {customerInvoices.map(inv => (
                            <option key={inv.id} value={inv.id}>
                              {inv.invoiceNumber} (Due: ₹{inv.amountDue.toLocaleString('en-IN')})
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)', pointerEvents: 'none' }} />
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#059669', backgroundColor: '#ecfdf5', padding: '6px 10px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                        ✓ No pending invoice. Switch to Advance tab.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Grid 2: Amount & Modern Calendar Date Picker in 2-column layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                
                {/* Amount */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Payment Amount (₹) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      placeholder="0.00"
                      className="form-input"
                      style={{
                        width: '100%',
                        paddingLeft: '26px',
                        fontSize: '0.9rem',
                        fontWeight: 600
                      }}
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                    />
                  </div>
                </div>

                {/* Date Input with quick presets */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                      Payment Date *
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setQuickModalDate('today')}
                        style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--accent-primary)', fontWeight: 500, border: '1px solid var(--border)', cursor: 'pointer' }}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickModalDate('yesterday')}
                        style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontWeight: 400, border: '1px solid var(--border)', cursor: 'pointer' }}
                      >
                        Yesterday
                      </button>
                    </div>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <CalendarIcon size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="date"
                      required
                      className="form-input"
                      style={{
                        width: '100%',
                        paddingLeft: '28px',
                        fontSize: '0.82rem',
                        fontWeight: 400
                      }}
                      value={payDate}
                      onChange={e => setPayDate(e.target.value)}
                    />
                  </div>
                </div>

              </div>

              {/* Grid 3: Payment Mode & Receiving Account in 2-column layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                
                {/* Payment Mode */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Payment Mode *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      className="form-input"
                      style={{
                        width: '100%',
                        paddingRight: '26px',
                        fontSize: '0.82rem',
                        fontWeight: 400,
                        appearance: 'none',
                        cursor: 'pointer'
                      }}
                      value={payMode}
                      onChange={e => setPayMode(e.target.value)}
                    >
                      {PAYMENT_MODES.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Receiving Account / Bank / QR */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Receiving Account / Source *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Landmark size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <select
                      className="form-input"
                      style={{
                        width: '100%',
                        paddingLeft: '28px',
                        paddingRight: '26px',
                        fontSize: '0.82rem',
                        fontWeight: 400,
                        appearance: 'none',
                        cursor: 'pointer'
                      }}
                      value={payAccount}
                      onChange={e => setPayAccount(e.target.value)}
                    >
                      {RECEIVING_ACCOUNTS.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  </div>
                </div>

              </div>

              {/* Grid 4: Reference Number & Payer Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    UTR / Cheque / Txn Ref #
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Hash size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="e.g. UTR-9876543210"
                      className="form-input"
                      style={{
                        width: '100%',
                        paddingLeft: '28px',
                        fontSize: '0.82rem',
                        fontWeight: 400
                      }}
                      value={refNumber}
                      onChange={e => setRefNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Payer Name / Depositor Title
                  </label>
                  <input
                    type="text"
                    placeholder="Name of payer"
                    className="form-input"
                    style={{
                      width: '100%',
                      fontSize: '0.82rem',
                      fontWeight: 400
                    }}
                    value={payerName}
                    onChange={e => setPayerName(e.target.value)}
                  />
                </div>

              </div>

              {/* Remarks / Notes */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Internal Notes & Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received via PhonePe QR, verified in account"
                  className="form-input"
                  style={{
                    width: '100%',
                    fontSize: '0.82rem',
                    fontWeight: 400
                  }}
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                />
              </div>

              {/* Modal Footer Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="action-btn"
                  style={{ fontSize: '0.82rem', fontWeight: 500 }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="primary-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Check size={14} /> {submitting ? 'Recording...' : 'Confirm & Save Payment'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT VOUCHER MODAL */}
      {viewReceipt && (
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="modal-content glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '24px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }} className="no-print">
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)' }}>Payment Receipt Voucher</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => window.print()}
                  className="action-btn outline-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', fontSize: '0.78rem', fontWeight: 500 }}
                >
                  <Printer size={13} /> Print Receipt
                </button>
                <button onClick={() => setViewReceipt(null)} className="close-btn" style={{ fontSize: '1.25rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  ×
                </button>
              </div>
            </div>

            {/* Printable Receipt Body */}
            <div style={{ border: '1px solid var(--border)', padding: '20px', borderRadius: '8px', background: '#ffffff' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>ESPON CLOTHING PRIVATE LIMITED</h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rohtak, Haryana - 124001 • GSTIN: 06AAHCE7721Q1Z4</div>
                <div style={{ marginTop: '6px', display: 'inline-block', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
                  PAYMENT RECEIPT VOUCHER
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.8rem' }}>
                <div>
                  <div><strong>Receipt No:</strong> {viewReceipt.paymentNumber}</div>
                  <div><strong>Date:</strong> {new Date(viewReceipt.paymentDate).toLocaleDateString('en-GB')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div><strong>Payment Mode:</strong> {viewReceipt.paymentMode}</div>
                  <div><strong>Status:</strong> {viewReceipt.status}</div>
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-primary)', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '0.8rem' }}>
                <div><strong>Received From:</strong> {viewReceipt.customer?.businessName || viewReceipt.payerName}</div>
                <div><strong>Contact:</strong> {viewReceipt.customer?.contactPerson} ({viewReceipt.customer?.mobile})</div>
                {viewReceipt.customer?.gstNumber && <div><strong>GSTIN:</strong> {viewReceipt.customer.gstNumber}</div>}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginBottom: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Particulars / Reference</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>Amount Paid (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                      <strong>{viewReceipt.paymentType}</strong>
                      {viewReceipt.invoice ? ` against Invoice ${viewReceipt.invoice.invoiceNumber}` : ' towards On-Account Advance'}
                      {viewReceipt.referenceNumber ? ` (Ref: ${viewReceipt.referenceNumber})` : ''}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--success)', fontSize: '0.95rem' }}>
                      ₹{viewReceipt.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <div>Deposited into: <strong>{viewReceipt.receivingAccount || 'Company Bank A/c'}</strong></div>
                  <div>Recorded by: {viewReceipt.recordedBy || 'Accounts Team'}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', borderTop: '1px solid var(--text-primary)', paddingTop: '4px', minWidth: '120px' }}>
                    Authorized Signatory
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CANCEL PAYMENT MODAL */}
      {cancelModalPay && (
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="modal-content glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--danger)', marginBottom: '6px' }}>
              Cancel & Reverse Payment
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Are you sure you want to cancel payment <strong>{cancelModalPay.paymentNumber}</strong> of <strong>₹{cancelModalPay.amount.toLocaleString('en-IN')}</strong>? This will restore the unpaid balance on the invoice.
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
                <option>Cheque Bounced / Return</option>
                <option>Customer Refund</option>
                <option>Bank Transaction Failed</option>
                <option>Duplicate Entry</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setCancelModalPay(null)}
                className="action-btn"
                style={{ fontSize: '0.8rem', fontWeight: 500 }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCancelPayment}
                disabled={cancelling}
                style={{
                  backgroundColor: 'var(--danger)',
                  color: '#ffffff',
                  fontWeight: 600,
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                {cancelling ? 'Reversing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
