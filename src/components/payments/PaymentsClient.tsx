"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  IndianRupee,
  TrendingUp,
  CreditCard,
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  Printer,
  Calendar,
  Wallet,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  QrCode,
  ArrowUpRight,
  RefreshCcw,
  Receipt,
  Eye,
  FileText,
  Ban
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
  'State Bank of India (SBI)',
  'Main Axis UPI QR (7206066678@OKBIZAXIS)',
  'Store Cash Counter (Rohtak)',
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
  const [loading, setLoading] = useState(false);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedMode, setSelectedMode] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedAccount, setSelectedAccount] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState('All');
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

      // Account
      if (selectedAccount !== 'All' && p.receivingAccount !== selectedAccount) {
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
  }, [payments, search, selectedMode, selectedType, selectedAccount, selectedStatus, selectedCustomer, startDate, endDate]);

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
        padding: '3px 9px',
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
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
            <Wallet className="text-indigo-600" size={28} /> Payment Collection & Ledger
          </h1>
          <p className="page-subtitle" style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
            Record customer settlements, advance deposits, bank credits, and generate collection reports.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={exportToExcel}
            className="action-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f0fdf4',
              borderColor: '#86efac',
              color: '#166534',
              fontWeight: 700,
              padding: '9px 15px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <FileSpreadsheet size={16} /> Export Excel
          </button>

          <Link
            href="/invoices"
            className="action-btn outline-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, padding: '9px 15px', borderRadius: '8px', textDecoration: 'none' }}
          >
            <FileText size={16} /> View Invoices
          </Link>

          <button
            onClick={() => setShowModal(true)}
            className="action-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              fontWeight: 700,
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
            }}
          >
            <Plus size={18} /> Record Customer Payment
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center', borderLeft: '4px solid #16a34a' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={24} />
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Collected</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#16a34a' }}>
                ₹{summary.totalCollected.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center', borderLeft: '4px solid #4f46e5' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>This Month</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#4f46e5' }}>
                ₹{summary.thisMonthCollected.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center', borderLeft: '4px solid #ef4444' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={24} />
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Outstanding</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ef4444' }}>
                ₹{summary.totalOutstanding.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center', borderLeft: '4px solid #0d9488' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#ccfbf1', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={24} />
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Advance Deposits</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0d9488' }}>
                {summary.advanceCount} Recorded
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode & Receiving Source Breakdown */}
      {summary?.byMode && summary.byMode.length > 0 && (
        <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', backgroundColor: '#f8fafc' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <QrCode size={16} /> Collections by Payment Mode & Channel
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {summary.byMode.map(m => (
              <div key={m.paymentMode} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', minWidth: '130px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{m.paymentMode}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  ₹{(m._sum.amount || 0).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Filter Toolbar */}
      <div className="glass-panel" style={{ padding: '18px 20px', marginBottom: '20px' }}>
        
        {/* Row 1: Search, Customer, Mode, Type */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '14px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search payment #, customer, UTR, ref..."
              className="form-input"
              style={{ paddingLeft: '36px', width: '100%', fontSize: '0.85rem' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div>
            <select
              className="form-input"
              style={{ width: '100%', fontSize: '0.85rem' }}
              value={selectedCustomer}
              onChange={e => setSelectedCustomer(e.target.value)}
            >
              <option value="All">All Customers</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.businessName} ({c.contactPerson})</option>
              ))}
            </select>
          </div>

          <div>
            <select
              className="form-input"
              style={{ width: '100%', fontSize: '0.85rem' }}
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
          </div>

          <div>
            <select
              className="form-input"
              style={{ width: '100%', fontSize: '0.85rem' }}
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
            >
              <option value="All">All Payment Types</option>
              <option value="Invoice Payment">Invoice Payment</option>
              <option value="Advance Payment">Advance Payment</option>
              <option value="On-Account">On-Account</option>
            </select>
          </div>
        </div>

        {/* Row 2: Date Presets & Range */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Date:</span>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handleDatePreset(p.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: datePreset === p.id ? 700 : 500,
                  backgroundColor: datePreset === p.id ? '#4f46e5' : '#f1f5f9',
                  color: datePreset === p.id ? '#ffffff' : '#475569',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {p.label}
              </button>
            ))}

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
              <input
                type="date"
                className="form-input"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setDatePreset('custom'); }}
              />
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>to</span>
              <input
                type="date"
                className="form-input"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
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
              style={{ fontSize: '0.78rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Reset Filters ✕
            </button>
          )}
        </div>
      </div>

      {/* Payment History Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Payment Transactions Ledger</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Showing {filteredPayments.length} transaction records</span>
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

      {/* RECORD PAYMENT MODAL */}
      {showModal && (
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="modal-content glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Record Customer Payment</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>Settle open invoice or receive customer advance deposit</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>×</button>
            </div>

            {/* Tab Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
              <button
                type="button"
                onClick={() => setModalTab('invoice')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: modalTab === 'invoice' ? 800 : 500,
                  backgroundColor: modalTab === 'invoice' ? '#4f46e5' : 'transparent',
                  color: modalTab === 'invoice' ? '#ffffff' : '#64748b',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Settle Unpaid Invoice
              </button>
              <button
                type="button"
                onClick={() => setModalTab('advance')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: modalTab === 'advance' ? 800 : 500,
                  backgroundColor: modalTab === 'advance' ? '#0d9488' : 'transparent',
                  color: modalTab === 'advance' ? '#ffffff' : '#64748b',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Advance Payment / On-Account
              </button>
            </div>

            <form onSubmit={handleSubmitPayment}>
              
              {/* Customer Selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                  Select Customer *
                </label>
                <select
                  required
                  className="form-input"
                  style={{ width: '100%' }}
                  value={modalCustomer}
                  onChange={e => handleCustomerChange(e.target.value)}
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.businessName} ({c.contactPerson} - {c.mobile}) {c.city ? `• ${c.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* If Settle Invoice Tab, show unpaid invoices */}
              {modalTab === 'invoice' && modalCustomer && (
                <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px', color: '#334155' }}>
                    Select Invoice to Settle *
                  </label>

                  {loadingInvoices ? (
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Loading customer invoices...</div>
                  ) : customerInvoices.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {customerInvoices.map(inv => (
                        <div
                          key={inv.id}
                          onClick={() => handleInvoiceSelect(inv.id)}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '6px',
                            border: `2px solid ${selectedInvoiceId === inv.id ? '#4f46e5' : '#cbd5e1'}`,
                            backgroundColor: selectedInvoiceId === inv.id ? '#eef2ff' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                              {inv.invoiceNumber} {inv.order?.orderNumber ? `(${inv.order.orderNumber})` : ''}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              Date: {new Date(inv.invoiceDate).toLocaleDateString('en-GB')} • Total: ₹{inv.totalAmount.toLocaleString('en-IN')}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700 }}>Due Balance</div>
                            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#dc2626' }}>
                              ₹{inv.amountDue.toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 600 }}>
                      ✓ This customer currently has NO outstanding unpaid invoices. You can record an Advance Payment instead.
                    </div>
                  )}
                </div>
              )}

              {/* Amount & Date Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                    Payment Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="Enter amount"
                    className="form-input"
                    style={{ width: '100%', fontWeight: 700, fontSize: '1rem' }}
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    style={{ width: '100%' }}
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Payment Mode & Receiving Account Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                    Payment Mode *
                  </label>
                  <select
                    className="form-input"
                    style={{ width: '100%' }}
                    value={payMode}
                    onChange={e => setPayMode(e.target.value)}
                  >
                    {PAYMENT_MODES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                    Receiving Account / Bank / QR *
                  </label>
                  <select
                    className="form-input"
                    style={{ width: '100%' }}
                    value={payAccount}
                    onChange={e => setPayAccount(e.target.value)}
                  >
                    {RECEIVING_ACCOUNTS.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reference # & Payer Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                    UTR / Cheque / Txn Reference #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-9876543210 / Cheque #123456"
                    className="form-input"
                    style={{ width: '100%' }}
                    value={refNumber}
                    onChange={e => setRefNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                    Payer Name / Bank Account Title
                  </label>
                  <input
                    type="text"
                    placeholder="Name of payer"
                    className="form-input"
                    style={{ width: '100%' }}
                    value={payerName}
                    onChange={e => setPayerName(e.target.value)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                  Internal Notes & Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received via PhonePe QR, verified by accounts"
                  className="form-input"
                  style={{ width: '100%' }}
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                />
              </div>

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="action-btn"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="action-btn"
                  style={{
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '8px 20px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  {submitting ? 'Recording...' : 'Confirm & Save Payment'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT VOUCHER MODAL */}
      {viewReceipt && (
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="modal-content glass-panel" style={{ width: '100%', maxWidth: '650px', padding: '32px', backgroundColor: '#ffffff', color: '#0f172a' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }} className="no-print">
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5' }}>Official Payment Receipt</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => window.print()}
                  className="action-btn outline-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  <Printer size={14} /> Print Receipt
                </button>
                <button onClick={() => setViewReceipt(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}>×</button>
              </div>
            </div>

            {/* Printable Receipt Body */}
            <div style={{ border: '2px solid #e2e8f0', padding: '24px', borderRadius: '8px' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '12px', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 2px 0' }}>ESPON CLOTHING PRIVATE LIMITED</h2>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Rohtak, Haryana - 124001 • GSTIN: 06AAHCE7721Q1Z4</div>
                <div style={{ marginTop: '8px', display: 'inline-block', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '3px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 800 }}>
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

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.82rem' }}>
                <div><strong>Received From:</strong> {viewReceipt.customer?.businessName || viewReceipt.payerName}</div>
                <div><strong>Contact:</strong> {viewReceipt.customer?.contactPerson} ({viewReceipt.customer?.mobile})</div>
                {viewReceipt.customer?.gstNumber && <div><strong>GSTIN:</strong> {viewReceipt.customer.gstNumber}</div>}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Description / Invoice Reference</th>
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '20px' }}>
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
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
          <div className="modal-content glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626', marginBottom: '8px' }}>
              Cancel & Reverse Payment
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              Are you sure you want to cancel payment <strong>{cancelModalPay.paymentNumber}</strong> of <strong>₹{cancelModalPay.amount.toLocaleString()}</strong>? This will restore the unpaid balance on the invoice.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                Cancellation Reason
              </label>
              <select
                className="form-input"
                style={{ width: '100%' }}
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setCancelModalPay(null)}
                className="action-btn"
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
                  fontWeight: 700,
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
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
