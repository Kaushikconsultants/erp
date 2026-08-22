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
  CheckCircle2,
  Building2,
  QrCode,
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
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 700,
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
            width: 44,
            height: 44,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
          }}>
            <Wallet size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Payment Collection & Ledger
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
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
              fontWeight: 700,
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
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
              fontWeight: 700,
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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              color: '#ffffff',
              fontWeight: 700,
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={16} /> Record Customer Payment
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="glass-panel" style={{ padding: '18px', display: 'flex', gap: '14px', alignItems: 'center', borderTop: '3px solid #10b981', borderRadius: '12px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={22} />
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Collected</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#059669', marginTop: '2px' }}>
                ₹{summary.totalCollected.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '18px', display: 'flex', gap: '14px', alignItems: 'center', borderTop: '3px solid #6366f1', borderRadius: '12px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>This Month</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#4f46e5', marginTop: '2px' }}>
                ₹{summary.thisMonthCollected.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '18px', display: 'flex', gap: '14px', alignItems: 'center', borderTop: '3px solid #ef4444', borderRadius: '12px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={22} />
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Outstanding</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#dc2626', marginTop: '2px' }}>
                ₹{summary.totalOutstanding.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '18px', display: 'flex', gap: '14px', alignItems: 'center', borderTop: '3px solid #0d9488', borderRadius: '12px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#ccfbf1', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={22} />
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Advance Deposits</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f766e', marginTop: '2px' }}>
                {summary.advanceCount} Recorded
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Filter Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        
        {/* Row 1: Search & Filter Dropdowns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(3, minmax(160px, 1fr))', gap: '10px', marginBottom: '12px' }}>
          
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search payment #, customer, UTR, ref..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.82rem',
                color: '#1e293b',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Customer Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              style={{
                width: '100%',
                padding: '8px 28px 8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.82rem',
                color: '#1e293b',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
              value={selectedCustomer}
              onChange={e => setSelectedCustomer(e.target.value)}
            >
              <option value="All">All Customers</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.businessName} ({c.contactPerson})</option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          </div>

          {/* Payment Mode */}
          <div style={{ position: 'relative' }}>
            <select
              style={{
                width: '100%',
                padding: '8px 28px 8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.82rem',
                color: '#1e293b',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
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
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          </div>

          {/* Payment Type */}
          <div style={{ position: 'relative' }}>
            <select
              style={{
                width: '100%',
                padding: '8px 28px 8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.82rem',
                color: '#1e293b',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
            >
              <option value="All">All Payment Types</option>
              <option value="Invoice Payment">Invoice Payment</option>
              <option value="Advance Payment">Advance Payment</option>
              <option value="On-Account">On-Account</option>
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Row 2: Modern Calendar & Date Presets */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
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
                  fontWeight: datePreset === p.id ? 700 : 500,
                  backgroundColor: datePreset === p.id ? '#4f46e5' : '#f1f5f9',
                  color: datePreset === p.id ? '#ffffff' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {p.label}
              </button>
            ))}

            {/* Modern Date Input Controls */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px', backgroundColor: '#f8fafc', padding: '2px 6px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <input
                type="date"
                style={{
                  padding: '3px 6px',
                  border: 'none',
                  background: 'transparent',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  outline: 'none'
                }}
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setDatePreset('custom'); }}
              />
              <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>→</span>
              <input
                type="date"
                style={{
                  padding: '3px 6px',
                  border: 'none',
                  background: 'transparent',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#1e293b',
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
                color: '#ef4444',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
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
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Payment Transactions Ledger</h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Showing {filteredPayments.length} transaction entries</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '12px 16px' }}>Payment #</th>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Customer</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>Invoice / Ref</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '12px 16px' }}>Mode & Channel</th>
                <th style={{ padding: '12px 16px' }}>Reference / UTR</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(pay => (
                <tr key={pay.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 800, color: '#4f46e5' }}>
                    {pay.paymentNumber}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.82rem' }}>
                    {new Date(pay.paymentDate).toLocaleDateString('en-GB')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {pay.customer?.businessName || pay.payerName || '-'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {pay.customer?.contactPerson ? `${pay.customer.contactPerson} • ` : ''}{pay.customer?.mobile || ''}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: pay.paymentType === 'Advance Payment' ? '#f0fdfa' : '#f1f5f9',
                      color: pay.paymentType === 'Advance Payment' ? '#0f766e' : '#475569',
                      border: `1px solid ${pay.paymentType === 'Advance Payment' ? '#99f6e4' : '#e2e8f0'}`
                    }}>
                      {pay.paymentType}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {pay.invoice ? (
                      <a
                        href={`/orders/${pay.invoice.orderId}/invoice`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        {pay.invoice.invoiceNumber} <ArrowUpRight size={12} />
                      </a>
                    ) : (
                      <span style={{ color: '#0d9488', fontSize: '0.78rem', fontWeight: 600 }}>Advance Deposit</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 900, color: '#16a34a', fontSize: '0.95rem' }}>
                    ₹{pay.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div>{getModeBadge(pay.paymentMode)}</div>
                    {pay.receivingAccount && (
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                        {pay.receivingAccount.split(' - ')[0]}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#334155' }}>
                    <div style={{ fontWeight: 600 }}>{pay.referenceNumber || '-'}</div>
                    {pay.payerName && pay.payerName !== pay.customer?.businessName && (
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Payer: {pay.payerName}</div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`status-badge ${pay.status === 'Completed' ? 'active' : pay.status === 'Cancelled' ? 'danger' : 'warning'}`} style={{ fontWeight: 700 }}>
                      {pay.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => setViewReceipt(pay)}
                        className="action-btn outline-primary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Print Receipt Voucher"
                      >
                        <Receipt size={13} /> Receipt
                      </button>

                      {pay.status === 'Completed' && (
                        <button
                          onClick={() => setCancelModalPay(pay)}
                          style={{
                            padding: '4px 8px',
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
                  <td colSpan={10} style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                    <Wallet size={36} style={{ margin: '0 auto 12px auto', color: '#cbd5e1' }} />
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#334155' }}>No payment records found</div>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
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
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '680px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: '16px 22px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(to right, #f8fafc, #ffffff)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}>
                  <Plus size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    Record Customer Payment
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                    Settle open invoice or receive customer advance deposit
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitPayment} style={{ padding: '18px 22px' }}>
              
              {/* Tab Selector Segmented Bar */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
                backgroundColor: '#f1f5f9',
                padding: '4px',
                borderRadius: '10px',
                marginBottom: '16px'
              }}>
                <button
                  type="button"
                  onClick={() => setModalTab('invoice')}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: modalTab === 'invoice' ? 800 : 600,
                    backgroundColor: modalTab === 'invoice' ? '#ffffff' : 'transparent',
                    color: modalTab === 'invoice' ? '#4f46e5' : '#64748b',
                    border: 'none',
                    boxShadow: modalTab === 'invoice' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <FileCheck size={14} /> Settle Unpaid Invoice
                </button>

                <button
                  type="button"
                  onClick={() => setModalTab('advance')}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: modalTab === 'advance' ? 800 : 600,
                    backgroundColor: modalTab === 'advance' ? '#ffffff' : 'transparent',
                    color: modalTab === 'advance' ? '#0d9488' : '#64748b',
                    border: 'none',
                    boxShadow: modalTab === 'advance' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <Building2 size={14} /> Advance / On-Account
                </button>
              </div>

              {/* Grid 1: Customer & Invoice in clean 2-column layout */}
              <div style={{ display: 'grid', gridTemplateColumns: modalTab === 'invoice' && modalCustomer ? '1.1fr 1fr' : '1fr', gap: '12px', marginBottom: '14px' }}>
                
                {/* Select Customer */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Customer *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <select
                      required
                      style={{
                        width: '100%',
                        padding: '8px 26px 8px 32px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        outline: 'none',
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
                    <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* If Invoice Tab & Customer Selected, show compact Invoice Picker */}
                {modalTab === 'invoice' && modalCustomer && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                      Invoice to Settle *
                    </label>
                    {loadingInvoices ? (
                      <div style={{ fontSize: '0.78rem', color: '#64748b', padding: '8px' }}>Loading invoices...</div>
                    ) : customerInvoices.length > 0 ? (
                      <div style={{ position: 'relative' }}>
                        <select
                          style={{
                            width: '100%',
                            padding: '8px 26px 8px 10px',
                            borderRadius: '8px',
                            border: '1px solid #4f46e5',
                            backgroundColor: '#eff6ff',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: '#1e40af',
                            outline: 'none',
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
                        <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4f46e5', pointerEvents: 'none' }} />
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#059669', backgroundColor: '#ecfdf5', padding: '7px 10px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                        ✓ No pending invoice. Switch to Advance tab.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Grid 2: Amount & Modern Calendar Date Picker in 2-column layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                
                {/* Amount */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Payment Amount (₹) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#16a34a', fontWeight: 900, fontSize: '0.95rem' }}>
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 28px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        outline: 'none'
                      }}
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                    />
                  </div>
                </div>

                {/* Modern Date Input with quick Today / Yesterday controls */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                      Payment Date *
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setQuickModalDate('today')}
                        style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#4f46e5', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickModalDate('yesterday')}
                        style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#64748b', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                      >
                        Yesterday
                      </button>
                    </div>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <CalendarIcon size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="date"
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 30px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        outline: 'none'
                      }}
                      value={payDate}
                      onChange={e => setPayDate(e.target.value)}
                    />
                  </div>
                </div>

              </div>

              {/* Grid 3: Payment Mode & Receiving Account in 2-column layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                
                {/* Payment Mode */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Payment Mode *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      style={{
                        width: '100%',
                        padding: '8px 26px 8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        outline: 'none',
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
                    <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Receiving Account / Bank / QR */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Receiving Account / Source *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Landmark size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <select
                      style={{
                        width: '100%',
                        padding: '8px 26px 8px 30px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        outline: 'none',
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
                    <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  </div>
                </div>

              </div>

              {/* Grid 4: Reference Number & Payer Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    UTR / Cheque / Txn Ref #
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Hash size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="e.g. UTR-9876543210"
                      style={{
                        width: '100%',
                        padding: '8px 10px 8px 30px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                        color: '#0f172a',
                        outline: 'none'
                      }}
                      value={refNumber}
                      onChange={e => setRefNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Payer Name / Depositor Title
                  </label>
                  <input
                    type="text"
                    placeholder="Name of payer"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      color: '#0f172a',
                      outline: 'none'
                    }}
                    value={payerName}
                    onChange={e => setPayerName(e.target.value)}
                  />
                </div>

              </div>

              {/* Remarks / Notes */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  Internal Notes & Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received via PhonePe QR, verified in HDFC account"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                />
              </div>

              {/* Modal Footer Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)'
                  }}
                >
                  <Check size={16} /> {submitting ? 'Recording...' : 'Confirm & Save Payment'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT VOUCHER MODAL */}
      {viewReceipt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '650px',
            padding: '30px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            color: '#0f172a'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }} className="no-print">
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4f46e5' }}>Payment Receipt Voucher</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => window.print()}
                  className="action-btn outline-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700 }}
                >
                  <Printer size={14} /> Print Receipt
                </button>
                <button onClick={() => setViewReceipt(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Receipt Body */}
            <div style={{ border: '2px solid #e2e8f0', padding: '24px', borderRadius: '12px' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '12px', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 2px 0' }}>ESPON CLOTHING PRIVATE LIMITED</h2>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Rohtak, Haryana - 124001 • GSTIN: 06AAHCE7721Q1Z4</div>
                <div style={{ marginTop: '8px', display: 'inline-block', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '3px 14px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 800 }}>
                  PAYMENT RECEIPT VOUCHER
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '0.82rem' }}>
                <div>
                  <div><strong>Receipt No:</strong> {viewReceipt.paymentNumber}</div>
                  <div><strong>Date:</strong> {new Date(viewReceipt.paymentDate).toLocaleDateString('en-GB')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div><strong>Payment Mode:</strong> {viewReceipt.paymentMode}</div>
                  <div><strong>Status:</strong> {viewReceipt.status}</div>
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.82rem' }}>
                <div><strong>Received From:</strong> {viewReceipt.customer?.businessName || viewReceipt.payerName}</div>
                <div><strong>Contact:</strong> {viewReceipt.customer?.contactPerson} ({viewReceipt.customer?.mobile})</div>
                {viewReceipt.customer?.gstNumber && <div><strong>GSTIN:</strong> {viewReceipt.customer.gstNumber}</div>}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Particulars / Reference</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Amount Paid (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0' }}>
                      <strong>{viewReceipt.paymentType}</strong>
                      {viewReceipt.invoice ? ` against Invoice ${viewReceipt.invoice.invoiceNumber}` : ' towards On-Account Advance'}
                      {viewReceipt.referenceNumber ? ` (Ref: ${viewReceipt.referenceNumber})` : ''}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 900, color: '#16a34a', fontSize: '1rem' }}>
                      ₹{viewReceipt.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '16px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  <div>Deposited into: <strong>{viewReceipt.receivingAccount || 'Company Bank A/c'}</strong></div>
                  <div>Recorded by: {viewReceipt.recordedBy || 'Accounts Team'}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', borderTop: '1px solid #0f172a', paddingTop: '4px', minWidth: '140px' }}>
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
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{ width: '100%', maxWidth: '440px', padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626', marginBottom: '8px' }}>
              Cancel & Reverse Payment
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              Are you sure you want to cancel payment <strong>{cancelModalPay.paymentNumber}</strong> of <strong>₹{cancelModalPay.amount.toLocaleString('en-IN')}</strong>? This will restore the unpaid balance on the invoice.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                Cancellation Reason
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
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
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCancelPayment}
                disabled={cancelling}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.82rem',
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
