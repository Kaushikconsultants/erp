"use client";

import DatePicker from '@/components/ui/DatePicker';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FileMinus, 
  Printer, 
  ExternalLink, 
  Search, 
  X, 
  Edit3, 
  Trash2, 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Wallet, 
  Filter, 
  Receipt, 
  RotateCcw, 
  MessageSquare, 
  BellRing, 
  FileSpreadsheet, 
  Download,
  MoreHorizontal
} from "lucide-react";
import { recordPayment } from "@/app/actions/paymentActions";
import { updateInvoice, deleteInvoice } from "@/app/actions/invoiceActions";
import { sendInvoiceViaWhatsApp, sendPaymentReminder } from "@/app/actions/documentShareActions";
import { exportTallySalesInvoices } from "@/app/actions/tallyExportActions";
import EditFullInvoiceModal from "./EditFullInvoiceModal";
import { openPhoneDialer } from "@/lib/dialer";
import "@/components/ui/modal.css";
import "./invoices.css";

const PAYMENT_MODES = ["Cash", "Bank Transfer", "UPI", "Cheque", "Card", "Other"];

const STATUS_BADGES: Record<string, { bg: string; color: string; border: string }> = {
  Paid: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  "Partially Paid": { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  Unpaid: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  Overdue: { bg: "#fef2f2", color: "#991b1b", border: "#fca5a5" },
  Cancelled: { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
  Draft: { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" }
};

export default function InvoicesClient({ initialInvoices }: { initialInvoices: any[] }) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [paymentModal, setPaymentModal] = useState<any | null>(null);
  const [editModal, setEditModal] = useState<any | null>(null);
  const [deleteModal, setDeleteModal] = useState<any | null>(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.invoice-action-menu-container')) {
        setActionMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = invoices.filter(inv => {
    const matchStatus = filterStatus === "All" || inv.status === filterStatus;
    const matchSearch = 
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.businessName?.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customer?.mobile && inv.customer.mobile.includes(search)) ||
      (inv.order?.orderNumber && inv.order.orderNumber.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const totalOutstanding = invoices
    .filter(i => ["Unpaid", "Partially Paid", "Overdue"].includes(i.status))
    .reduce((s, i) => s + (Number(i.amountDue) || 0), 0);

  const totalCollected = invoices.reduce((s, i) => s + (Number(i.amountPaid) || 0), 0);
  const overdueCount = invoices.filter(i => i.status === "Overdue").length;
  const paidCount = invoices.filter(i => i.status === "Paid").length;
  const unpaidCount = invoices.filter(i => i.status === "Unpaid").length;
  const partiallyPaidCount = invoices.filter(i => i.status === "Partially Paid").length;
  const cancelledCount = invoices.filter(i => i.status === "Cancelled").length;

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 3500);
  };

  const handleSendWhatsApp = async (inv: any) => {
    const res = await sendInvoiceViaWhatsApp(inv.id);
    if (res.success) {
      showToast(res.message || "Invoice sent on WhatsApp!");
    } else {
      const cleanPhone = (inv.customer?.mobile || '').replace(/\D/g, '');
      const waUrl = cleanPhone ? `https://wa.me/91${cleanPhone}` : `https://wa.me/`;
      window.open(waUrl, '_blank');
    }
  };

  const handleReminder = async (inv: any) => {
    const res = await sendPaymentReminder(inv.id);
    if (res.success) {
      showToast(res.message || "Payment reminder sent!");
    } else {
      alert(res.error || "Failed to send payment reminder");
    }
  };

  const handleExportTally = async () => {
    const res = await exportTallySalesInvoices();
    if (res.success && res.csvContent) {
      const encodedUri = encodeURI("data:text/csv;charset=utf-8," + res.csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", res.filename || "Tally_Sales_Invoices.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Exported ${res.totalInvoices} invoices for Tally Prime / Busy ERP!`);
    } else {
      alert(res.error || "Failed to export Tally data");
    }
  };

  // --- RECORD PAYMENT ---
  async function handlePayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!paymentModal) return;
    setLoading(true); 
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await recordPayment({
      invoiceId: paymentModal.id,
      amount: parseFloat(fd.get("amount") as string),
      paymentMode: fd.get("paymentMode") as string,
      referenceNumber: fd.get("referenceNumber") as string,
      notes: fd.get("notes") as string,
      paymentDate: fd.get("paymentDate") as string,
    });
    setLoading(false);
    if (res.error) { 
      setError(res.error); 
      return; 
    }
    
    // Update local state
    const pAmt = parseFloat(fd.get("amount") as string);
    setInvoices(prev => prev.map(inv => {
      if (inv.id === paymentModal.id) {
        const newPaid = (inv.amountPaid || 0) + pAmt;
        const newDue = Math.max(0, (inv.totalAmount || 0) - newPaid);
        const newStatus = newDue <= 0 ? "Paid" : "Partially Paid";
        return { ...inv, amountPaid: newPaid, amountDue: newDue, status: newStatus };
      }
      return inv;
    }));

    setPaymentModal(null);
    showToast("Payment recorded successfully!");
  }

  // --- DELETE INVOICE ---
  async function handleDeleteInvoice() {
    if (!deleteModal) return;
    setLoading(true);
    setError("");
    const res = await deleteInvoice(deleteModal.id);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }

    setInvoices(prev => prev.filter(inv => inv.id !== deleteModal.id));
    const invNum = deleteModal.invoiceNumber;
    setDeleteModal(null);
    showToast(`Invoice ${invNum} deleted permanently.`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Toast Notification */}
      {successMessage && (
        <div style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          backgroundColor: "#0f172a",
          color: "#ffffff",
          padding: "12px 20px",
          borderRadius: "10px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          zIndex: 9999,
          fontSize: "0.875rem",
          fontWeight: 600,
          animation: "fadeIn 0.2s ease"
        }}>
          <CheckCircle2 size={18} color="#22c55e" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* KPI Metrics Summary */}
      <div className="invoice-kpi-grid">
        {/* Card 1: Total Outstanding */}
        <div className="invoice-kpi-card">
          <div className="invoice-kpi-info">
            <span className="invoice-kpi-label">Total Outstanding</span>
            <span className="invoice-kpi-val" style={{ color: totalOutstanding > 0 ? '#b91c1c' : '#0f172a' }}>
              ₹{totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
            </span>
            <span className="invoice-kpi-sub">Across pending & overdue</span>
          </div>
          <div className="invoice-kpi-icon-wrap" style={{ backgroundColor: '#fef2f2' }}>
            <AlertCircle size={22} color="#dc2626" />
          </div>
        </div>

        {/* Card 2: Total Collected */}
        <div className="invoice-kpi-card">
          <div className="invoice-kpi-info">
            <span className="invoice-kpi-label">Total Collected</span>
            <span className="invoice-kpi-val" style={{ color: '#16a34a' }}>
              ₹{totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
            </span>
            <span className="invoice-kpi-sub" style={{ color: '#16a34a', fontWeight: 500 }}>
              ✓ {paidCount} fully paid
            </span>
          </div>
          <div className="invoice-kpi-icon-wrap" style={{ backgroundColor: '#f0fdf4' }}>
            <Wallet size={22} color="#16a34a" />
          </div>
        </div>

        {/* Card 3: Overdue Invoices */}
        <div className="invoice-kpi-card">
          <div className="invoice-kpi-info">
            <span className="invoice-kpi-label">Overdue Invoices</span>
            <span className="invoice-kpi-val" style={{ color: overdueCount > 0 ? '#b91c1c' : '#0f172a' }}>
              {overdueCount}
            </span>
            <span className="invoice-kpi-sub" style={{ color: overdueCount > 0 ? '#b91c1c' : '#64748b' }}>
              {overdueCount > 0 ? "Requires follow-up" : "All payments on schedule"}
            </span>
          </div>
          <div className="invoice-kpi-icon-wrap" style={{ backgroundColor: overdueCount > 0 ? '#fef2f2' : '#eff6ff' }}>
            <Receipt size={22} color={overdueCount > 0 ? '#dc2626' : '#4f46e5'} />
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS TOOLBAR */}
      <div className="invoice-toolbar">
        <div className="invoice-toolbar-top">
          {/* Search Box */}
          <div className="invoice-search-wrap">
            <Search size={16} className="invoice-search-icon" />
            <input
              type="text"
              placeholder="Search invoice #, customer, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="invoice-search-input"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="invoice-search-clear"
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="invoice-toolbar-actions">
            <Link href="/credit-notes" className="btn-credit-notes">
              <FileMinus size={15} color="#64748b" /> Credit Notes & Returns
            </Link>
            <button
              type="button"
              onClick={handleExportTally}
              className="btn-tally-export"
              title="Export all sales invoices to CSV for Tally Prime / Busy ERP"
            >
              <FileSpreadsheet size={15} color="#2563eb" /> Tally / Excel
            </button>
          </div>
        </div>

        {/* Horizontal Status Filter Chips */}
        <div className="invoice-status-chips-bar">
          <button
            type="button"
            className={`invoice-status-chip ${filterStatus === 'All' ? 'active' : ''}`}
            onClick={() => setFilterStatus('All')}
          >
            All <span className="chip-count">{invoices.length}</span>
          </button>
          <button
            type="button"
            className={`invoice-status-chip ${filterStatus === 'Unpaid' ? 'active' : ''}`}
            onClick={() => setFilterStatus('Unpaid')}
          >
            Unpaid <span className="chip-count">{unpaidCount}</span>
          </button>
          <button
            type="button"
            className={`invoice-status-chip ${filterStatus === 'Partially Paid' ? 'active' : ''}`}
            onClick={() => setFilterStatus('Partially Paid')}
          >
            Partially Paid <span className="chip-count">{partiallyPaidCount}</span>
          </button>
          <button
            type="button"
            className={`invoice-status-chip ${filterStatus === 'Paid' ? 'active' : ''}`}
            onClick={() => setFilterStatus('Paid')}
          >
            Paid <span className="chip-count">{paidCount}</span>
          </button>
          <button
            type="button"
            className={`invoice-status-chip ${filterStatus === 'Overdue' ? 'active' : ''}`}
            onClick={() => setFilterStatus('Overdue')}
          >
            Overdue <span className="chip-count">{overdueCount}</span>
          </button>
          {cancelledCount > 0 && (
            <button
              type="button"
              className={`invoice-status-chip ${filterStatus === 'Cancelled' ? 'active' : ''}`}
              onClick={() => setFilterStatus('Cancelled')}
            >
              Cancelled <span className="chip-count">{cancelledCount}</span>
            </button>
          )}

          {(search || filterStatus !== 'All') && (
            <button
              type="button"
              onClick={() => { setSearch(''); setFilterStatus('All'); }}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap'
              }}
              title="Reset Filters"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* ─── DESKTOP DATA TABLE (SCREEN > 768px) ─── */}
      <div className="invoice-desktop-table">
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.75rem', letterSpacing: '0.3px', textAlign: 'left', whiteSpace: 'nowrap' }}>Invoice #</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.75rem', letterSpacing: '0.3px', textAlign: 'left' }}>Customer</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.75rem', letterSpacing: '0.3px', textAlign: 'left' }}>Invoice Date</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.75rem', letterSpacing: '0.3px', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.75rem', letterSpacing: '0.3px', textAlign: 'right' }}>Paid</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.75rem', letterSpacing: '0.3px', textAlign: 'right' }}>Outstanding</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.75rem', letterSpacing: '0.3px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.75rem', letterSpacing: '0.3px', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const badge = STATUS_BADGES[inv.status] || STATUS_BADGES.Unpaid;

                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.1s ease' }}>
                    {/* INVOICE # */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {inv.orderId ? (
                        <a
                          href={`/orders/${inv.orderId}/invoice`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#4f46e5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, fontSize: '0.82rem' }}
                          title="View / Print Tax Invoice"
                        >
                          {inv.invoiceNumber} <ExternalLink size={11} color="#6366f1" />
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: 600 }}>{inv.invoiceNumber}</span>
                      )}
                    </td>

                    {/* CUSTOMER */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.84rem' }}>{inv.customer?.businessName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>{inv.customer?.mobile || '-'}</div>
                    </td>

                    {/* INVOICE DATE */}
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {new Date(inv.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>

                    {/* TOTAL */}
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 500, color: '#0f172a', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                      ₹{(Number(inv.totalAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* PAID */}
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 500, color: '#16a34a', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                      ₹{(Number(inv.amountPaid) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* OUTSTANDING */}
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: (Number(inv.amountDue) || 0) > 0 ? '#b91c1c' : '#16a34a', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                      ₹{(Number(inv.amountDue) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* STATUS BADGE */}
                    <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px', 
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 500,
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: badge.color }} />
                        {inv.status}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end', verticalAlign: 'middle' }}>
                        
                        {/* 1. Print Button */}
                        {inv.orderId && (
                          <a
                            href={`/orders/${inv.orderId}/invoice`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              height: '28px',
                              padding: '0 8px',
                              borderRadius: '6px',
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              textDecoration: 'none',
                              transition: 'all 0.15s ease',
                              boxSizing: 'border-box'
                            }}
                            title="Print Tax Invoice"
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#0f172a'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; }}
                          >
                            <Printer size={13} /> Print
                          </a>
                        )}

                        {/* 2. WhatsApp Send Invoice Button */}
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(inv)}
                          style={{
                            height: '28px',
                            padding: '0 8px',
                            borderRadius: '6px',
                            backgroundColor: '#f0fdf4',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                            boxSizing: 'border-box'
                          }}
                          title="Send Invoice on WhatsApp"
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#dcfce7'; e.currentTarget.style.borderColor = '#86efac'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f0fdf4'; e.currentTarget.style.borderColor = '#bbf7d0'; }}
                        >
                          <MessageSquare size={13} /> WhatsApp
                        </button>

                        {/* 3. Overdue Payment Reminder Button */}
                        {inv.amountDue > 0 && (
                          <button
                            type="button"
                            onClick={() => handleReminder(inv)}
                            style={{
                              height: '28px',
                              padding: '0 8px',
                              borderRadius: '6px',
                              backgroundColor: '#fffbeb',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                              boxSizing: 'border-box'
                            }}
                            title="Send Overdue WhatsApp Payment Reminder"
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fef3c7'; e.currentTarget.style.borderColor = '#fcd34d'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fffbeb'; e.currentTarget.style.borderColor = '#fde68a'; }}
                          >
                            <BellRing size={13} /> Remind
                          </button>
                        )}

                        {/* 4. Record Payment Button */}
                        {inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
                          <button
                            type="button"
                            onClick={() => { setError(""); setPaymentModal(inv); }}
                            style={{
                              height: '28px',
                              padding: '0 8px',
                              borderRadius: '6px',
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                              boxSizing: 'border-box'
                            }}
                            title="Record Customer Payment"
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#dbeafe'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                          >
                            <CreditCard size={13} /> Pay
                          </button>
                        )}

                        {/* 5. Edit Invoice Button */}
                        <button
                          type="button"
                          onClick={() => { setError(""); setEditModal(inv); }}
                          style={{
                            height: '28px',
                            width: '28px',
                            padding: '0',
                            borderRadius: '6px',
                            backgroundColor: '#f8fafc',
                            color: '#4f46e5',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            boxSizing: 'border-box'
                          }}
                          title="Edit Invoice Details"
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#eef2ff'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                        >
                          <Edit3 size={13} />
                        </button>

                        {/* 6. Delete Invoice Button */}
                        <button
                          type="button"
                          onClick={() => { setError(""); setDeleteModal(inv); }}
                          style={{
                            height: '28px',
                            width: '28px',
                            padding: '0',
                            borderRadius: '6px',
                            backgroundColor: '#f8fafc',
                            color: '#e11d48',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            boxSizing: 'border-box'
                          }}
                          title="Delete Invoice"
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fff1f2'; e.currentTarget.style.borderColor = '#fecdd3'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                        >
                          <Trash2 size={13} />
                        </button>

                        {/* 7. Action Dropdown Menu Button */}
                        <div className="invoice-action-menu-container" style={{ position: 'relative', display: 'inline-flex' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuOpenId(actionMenuOpenId === inv.id ? null : inv.id);
                            }}
                            style={{
                              height: '28px',
                              width: '28px',
                              padding: '0',
                              borderRadius: '6px',
                              backgroundColor: actionMenuOpenId === inv.id ? '#e2e8f0' : '#f8fafc',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                              boxSizing: 'border-box'
                            }}
                            title="More Action Menu Options"
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = actionMenuOpenId === inv.id ? '#e2e8f0' : '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                          >
                            <MoreHorizontal size={14} />
                          </button>

                          {/* Action Menu Dropdown List */}
                          {actionMenuOpenId === inv.id && (
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: 'calc(100% + 4px)',
                                backgroundColor: '#ffffff',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                zIndex: 100,
                                minWidth: '200px',
                                padding: '6px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                textAlign: 'left'
                              }}
                              onClick={e => e.stopPropagation()}
                            >
                              {/* Print */}
                              {inv.orderId && (
                                <a
                                  href={`/orders/${inv.orderId}/invoice`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => setActionMenuOpenId(null)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '7px 10px',
                                    borderRadius: '6px',
                                    color: '#334155',
                                    fontSize: '0.78rem',
                                    fontWeight: 500,
                                    textDecoration: 'none',
                                    transition: 'background-color 0.15s ease'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <Printer size={14} color="#64748b" />
                                  <span>Print Tax Invoice</span>
                                </a>
                              )}

                              {/* WhatsApp */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenuOpenId(null);
                                  handleSendWhatsApp(inv);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '7px 10px',
                                  borderRadius: '6px',
                                  color: '#15803d',
                                  fontSize: '0.78rem',
                                  fontWeight: 500,
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  cursor: 'pointer',
                                  width: '100%',
                                  textAlign: 'left',
                                  transition: 'background-color 0.15s ease'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <MessageSquare size={14} color="#16a34a" />
                                <span>Send on WhatsApp</span>
                              </button>

                              {/* Payment Reminder */}
                              {inv.amountDue > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuOpenId(null);
                                    handleReminder(inv);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '7px 10px',
                                    borderRadius: '6px',
                                    color: '#b45309',
                                    fontSize: '0.78rem',
                                    fontWeight: 500,
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    width: '100%',
                                    textAlign: 'left',
                                    transition: 'background-color 0.15s ease'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fffbeb'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <BellRing size={14} color="#d97706" />
                                  <span>Send Payment Reminder</span>
                                </button>
                              )}

                              {/* Record Payment */}
                              {inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuOpenId(null);
                                    setError("");
                                    setPaymentModal(inv);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '7px 10px',
                                    borderRadius: '6px',
                                    color: '#2563eb',
                                    fontSize: '0.78rem',
                                    fontWeight: 500,
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    width: '100%',
                                    textAlign: 'left',
                                    transition: 'background-color 0.15s ease'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eff6ff'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <CreditCard size={14} color="#2563eb" />
                                  <span>Record Payment</span>
                                </button>
                              )}

                              <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '3px 0' }} />

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenuOpenId(null);
                                  setError("");
                                  setEditModal(inv);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '7px 10px',
                                  borderRadius: '6px',
                                  color: '#4f46e5',
                                  fontSize: '0.78rem',
                                  fontWeight: 500,
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  cursor: 'pointer',
                                  width: '100%',
                                  textAlign: 'left',
                                  transition: 'background-color 0.15s ease'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eef2ff'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Edit3 size={14} color="#4f46e5" />
                                <span>Edit Invoice Details</span>
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenuOpenId(null);
                                  setError("");
                                  setDeleteModal(inv);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '7px 10px',
                                  borderRadius: '6px',
                                  color: '#dc2626',
                                  fontSize: '0.78rem',
                                  fontWeight: 500,
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  cursor: 'pointer',
                                  width: '100%',
                                  textAlign: 'left',
                                  transition: 'background-color 0.15s ease'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Trash2 size={14} color="#dc2626" />
                                <span>Delete Invoice</span>
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                    <Receipt size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#475569' }}>No invoices found</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>Try searching with a different keyword or resetting filters.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MOBILE INVOICE CARDS FEED (SCREEN <= 768px) ─── */}
      <div className="invoice-mobile-feed">
        {filtered.map(inv => {
          const badge = STATUS_BADGES[inv.status] || STATUS_BADGES.Unpaid;
          const due = Number(inv.amountDue) || 0;
          const total = Number(inv.totalAmount) || 0;
          const paid = Number(inv.amountPaid) || 0;
          const formattedDate = new Date(inv.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

          return (
            <div key={inv.id} className="invoice-mobile-card">
              {/* Header: Invoice # & Status */}
              <div className="inv-card-header">
                <div className="inv-card-num-group">
                  {inv.orderId ? (
                    <a
                      href={`/orders/${inv.orderId}/invoice`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inv-card-num"
                      title="View / Print Tax Invoice"
                    >
                      {inv.invoiceNumber}
                      <ExternalLink size={12} color="#6366f1" />
                    </a>
                  ) : (
                    <span className="inv-card-num" style={{ color: '#0f172a' }}>
                      {inv.invoiceNumber}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span 
                    className="inv-status-pill"
                    style={{
                      backgroundColor: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`
                    }}
                  >
                    <span className="inv-status-dot" style={{ backgroundColor: badge.color }} />
                    {inv.status}
                  </span>
                </div>
              </div>

              {/* Customer & Date Info */}
              <div className="inv-card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div className="inv-customer-name">
                    {inv.customer?.businessName || 'Unnamed Customer'}
                  </div>
                  <span className="inv-card-date">
                    {formattedDate}
                  </span>
                </div>

                {inv.customer?.mobile && (
                  <button 
                    type="button"
                    onClick={() => openPhoneDialer({
                      phone: inv.customer.mobile,
                      name: inv.customer.businessName || inv.customer.name,
                      customerId: inv.customerId || inv.customer.id
                    })}
                    className="inv-customer-phone"
                    style={{ textDecoration: 'none', color: '#4f46e5', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
                    title={`Call ${inv.customer?.businessName || 'Customer'}`}
                  >
                    📞 {inv.customer.mobile}
                  </button>
                )}
              </div>

              {/* Financial Stats Breakdown */}
              <div className="inv-fin-grid">
                <div className="inv-fin-cell">
                  <span className="inv-fin-label">Total Amount</span>
                  <span className="inv-fin-val">₹{total.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
                </div>
                <div className="inv-fin-cell text-center">
                  <span className="inv-fin-label">Paid</span>
                  <span className="inv-fin-val paid">₹{paid.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
                </div>
                <div className="inv-fin-cell text-right">
                  <span className="inv-fin-label">Balance Due</span>
                  <span className={`inv-fin-val ${due > 0 ? 'due' : 'paid'}`}>
                    ₹{due.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                  </span>
                </div>
              </div>

              {/* 1-Tap Quick Action Buttons */}
              <div className="inv-card-actions">
                <div className="inv-primary-actions">
                  {/* WhatsApp Direct Share */}
                  <button
                    type="button"
                    onClick={() => handleSendWhatsApp(inv)}
                    className="inv-btn-action inv-btn-whatsapp"
                    title="Send on WhatsApp"
                  >
                    <MessageSquare size={13} /> WhatsApp
                  </button>

                  {/* Record Payment (if due > 0) */}
                  {inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
                    <button
                      type="button"
                      onClick={() => { setError(""); setPaymentModal(inv); }}
                      className="inv-btn-action inv-btn-pay"
                      title="Record Payment"
                    >
                      <CreditCard size={13} /> Pay
                    </button>
                  )}

                  {/* Send Overdue Reminder */}
                  {due > 0 && (
                    <button
                      type="button"
                      onClick={() => handleReminder(inv)}
                      className="inv-btn-action inv-btn-remind"
                      title="Send WhatsApp Payment Reminder"
                    >
                      <BellRing size={13} /> Remind
                    </button>
                  )}

                  {/* Print / View Tax Invoice */}
                  {inv.orderId && (
                    <a
                      href={`/orders/${inv.orderId}/invoice`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inv-btn-action inv-btn-print"
                      title="Print Tax Invoice"
                    >
                      <Printer size={13} /> Print
                    </a>
                  )}
                </div>

                {/* More Actions Menu */}
                <div className="invoice-action-menu-container" style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionMenuOpenId(actionMenuOpenId === inv.id ? null : inv.id);
                    }}
                    className="inv-icon-btn"
                    title="More actions"
                  >
                    <MoreHorizontal size={15} />
                  </button>

                  {/* Dropdown Menu */}
                  {actionMenuOpenId === inv.id && (
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        bottom: 'calc(100% + 4px)',
                        backgroundColor: '#ffffff',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                        zIndex: 100,
                        minWidth: '190px',
                        padding: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        textAlign: 'left'
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => {
                          setActionMenuOpenId(null);
                          setError("");
                          setEditModal(inv);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          color: '#4f46e5',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          border: 'none',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left'
                        }}
                      >
                        <Edit3 size={14} color="#4f46e5" />
                        <span>Edit Details</span>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => {
                          setActionMenuOpenId(null);
                          setError("");
                          setDeleteModal(inv);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          color: '#dc2626',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          border: 'none',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left'
                        }}
                      >
                        <Trash2 size={14} color="#dc2626" />
                        <span>Delete Invoice</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="inv-empty-state">
            <Receipt size={36} style={{ color: '#94a3b8', marginBottom: '8px' }} />
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155' }}>No Invoices Found</div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 12px 0' }}>
              No invoices match your active filters or search terms.
            </p>
            <button
              type="button"
              onClick={() => { setSearch(''); setFilterStatus('All'); }}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#334155',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* ─── MODAL 1: RECORD PAYMENT MODAL ─── */}
      {paymentModal && (
        <div className="modal-backdrop" onClick={() => setPaymentModal(null)}>
          <div className="modal-content glass-panel animate-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: '#0f172a' }}>Record Payment</h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  {paymentModal.invoiceNumber} — <span style={{ fontWeight: 600, color: '#334155' }}>{paymentModal.customer?.businessName}</span>
                </p>
              </div>
              <button className="close-btn" onClick={() => setPaymentModal(null)}>×</button>
            </div>

            <form onSubmit={handlePayment} className="modal-body" style={{ marginTop: '14px' }}>
              {/* Payment Summary Box */}
              <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b' }}>
                  <span>Total Invoice Amount</span>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>₹{paymentModal.totalAmount?.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                  <span>Already Paid</span>
                  <span style={{ color: '#16a34a', fontWeight: 500 }}>₹{paymentModal.amountPaid?.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
                  <span style={{ color: '#334155' }}>Remaining Due</span>
                  <span style={{ color: '#b91c1c' }}>₹{paymentModal.amountDue?.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="vertical-group">
                  <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Payment Amount (₹) *</label>
                  <input 
                    name="amount" 
                    type="number" 
                    step="0.01" 
                    min="1" 
                    max={paymentModal.amountDue} 
                    defaultValue={paymentModal.amountDue} 
                    className="form-input" 
                    required 
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
                <div className="vertical-group">
                  <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Payment Mode *</label>
                  <select 
                    name="paymentMode" 
                    className="form-input" 
                    required
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  >
                    {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="vertical-group">
                  <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Payment Date</label>
                  <DatePicker 
                    name="paymentDate" 
                     
                    className="form-input" 
                    defaultValue={new Date().toISOString().split('T')[0]} 
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
                <div className="vertical-group">
                  <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Ref / Transaction UTR</label>
                  <input 
                    name="referenceNumber" 
                    className="form-input" 
                    placeholder="e.g. UTR-982341" 
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
                <div className="vertical-group" style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Payment Notes</label>
                  <input 
                    name="notes" 
                    className="form-input" 
                    placeholder="Optional notes or remarks" 
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {error && (
                <div style={{ color: '#dc2626', backgroundColor: '#fee2e2', padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem', marginTop: '12px' }}>
                  {error}
                </div>
              )}

              <div className="modal-footer" style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setPaymentModal(null)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? "Recording..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: EDIT FULL INVOICE MODAL ─── */}
      {editModal && (
        <EditFullInvoiceModal
          invoiceId={editModal.id}
          isOpen={!!editModal}
          onClose={() => setEditModal(null)}
          onSuccess={(updatedInvoice) => {
            if (updatedInvoice) {
              setInvoices(prev => prev.map(inv => (inv.id === updatedInvoice.id ? { ...inv, ...updatedInvoice } : inv)));
            }
            showToast(`Invoice ${editModal.invoiceNumber} updated successfully!`);
          }}
        />
      )}

      {/* ─── MODAL 3: DELETE CONFIRMATION MODAL ─── */}
      {deleteModal && (
        <div className="modal-backdrop" onClick={() => setDeleteModal(null)}>
          <div className="modal-content glass-panel animate-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={20} color="#dc2626" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>Delete Invoice?</h2>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    {deleteModal.invoiceNumber}
                  </p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setDeleteModal(null)}>×</button>
            </div>

            <div className="modal-body" style={{ marginTop: '14px' }}>
              <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to delete invoice <strong style={{ color: '#0f172a' }}>{deleteModal.invoiceNumber}</strong> for <strong style={{ color: '#0f172a' }}>{deleteModal.customer?.businessName}</strong>?
              </p>
              
              <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '12px', marginTop: '14px', fontSize: '0.8rem', color: '#991b1b' }}>
                ⚠️ <strong>Warning:</strong> This action will permanently remove this invoice record and unlink associated payments. This cannot be undone.
              </div>

              {error && (
                <div style={{ color: '#dc2626', backgroundColor: '#fee2e2', padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem', marginTop: '12px' }}>
                  {error}
                </div>
              )}

              <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setDeleteModal(null)}>Cancel</button>
                <button 
                  type="button" 
                  onClick={handleDeleteInvoice}
                  disabled={loading}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash2 size={15} />
                  {loading ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
