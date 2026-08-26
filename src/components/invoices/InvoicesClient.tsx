"use client";

import React, { useState } from "react";
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
  Download
} from "lucide-react";
import { recordPayment } from "@/app/actions/paymentActions";
import { updateInvoice, deleteInvoice } from "@/app/actions/invoiceActions";
import { sendInvoiceViaWhatsApp, sendPaymentReminder } from "@/app/actions/documentShareActions";
import { exportTallySalesInvoices } from "@/app/actions/tallyExportActions";
import "@/components/ui/modal.css";

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
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");

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

  // --- EDIT INVOICE ---
  async function handleEditInvoice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editModal) return;
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    
    const invoiceDate = fd.get("invoiceDate") as string;
    const dueDate = fd.get("dueDate") as string;
    const paymentTerms = fd.get("paymentTerms") as string;
    const status = fd.get("status") as string;
    const notes = fd.get("notes") as string;
    const totalAmount = parseFloat(fd.get("totalAmount") as string);
    const amountPaid = parseFloat(fd.get("amountPaid") as string);

    const res = await updateInvoice(editModal.id, {
      invoiceDate,
      dueDate,
      paymentTerms,
      status,
      notes,
      totalAmount: isNaN(totalAmount) ? undefined : totalAmount,
      amountPaid: isNaN(amountPaid) ? undefined : amountPaid,
    });

    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }

    if (res.invoice) {
      setInvoices(prev => prev.map(inv => (inv.id === editModal.id ? { ...inv, ...res.invoice } : inv)));
    }

    setEditModal(null);
    showToast(`Invoice ${editModal.invoiceNumber} updated successfully!`);
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

      {/* KPI Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
        gap: '16px' 
      }}>
        {/* Card 1: Total Outstanding */}
        <div style={{ 
          padding: '18px 20px', 
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>
              Total Outstanding
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 600, color: '#0f172a', marginTop: '3px' }}>
              ₹{totalOutstanding.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
              Across pending & overdue invoices
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={20} color="#dc2626" />
          </div>
        </div>

        {/* Card 2: Total Collected */}
        <div style={{ 
          padding: '18px 20px', 
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>
              Total Collected
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 600, color: '#0f172a', marginTop: '3px' }}>
              ₹{totalCollected.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 500, marginTop: '2px' }}>
              ✓ {paidCount} fully paid invoices
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={20} color="#16a34a" />
          </div>
        </div>

        {/* Card 3: Overdue Invoices */}
        <div style={{ 
          padding: '18px 20px', 
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>
              Overdue Invoices
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 600, color: overdueCount > 0 ? '#b91c1c' : '#0f172a', marginTop: '3px' }}>
              {overdueCount}
            </div>
            <div style={{ fontSize: '0.74rem', color: overdueCount > 0 ? '#b91c1c' : '#64748b', marginTop: '2px' }}>
              {overdueCount > 0 ? "Requires follow-up" : "All payments on schedule"}
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: overdueCount > 0 ? '#fef2f2' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={20} color={overdueCount > 0 ? '#dc2626' : '#4f46e5'} />
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS CONTROLS */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '12px',
        backgroundColor: '#ffffff',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        {/* Left: Search input + Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1, minWidth: '300px' }}>
          {/* Search Box */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            minWidth: '260px',
            maxWidth: '360px',
            flex: 1
          }}>
            <Search 
              size={15} 
              style={{ position: 'absolute', left: '12px', color: '#94a3b8', pointerEvents: 'none' }} 
            />
            <input
              type="text"
              placeholder="Search invoice #, customer, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 32px 8px 34px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                fontSize: '0.82rem',
                color: '#0f172a',
                outline: 'none',
                transition: 'all 0.15s ease',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="#64748b" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 500,
                color: '#334155',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">All Invoices ({invoices.length})</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {(search || filterStatus !== 'All') && (
            <button
              onClick={() => { setSearch(''); setFilterStatus('All'); }}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                fontSize: '0.78rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Reset Filters"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            href="/credit-notes"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
          >
            <FileMinus size={14} color="#64748b" /> Credit Notes & Returns
          </Link>
        </div>
      </div>

      {/* Invoice Table Panel */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        overflow: 'hidden'
      }}>
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: '#475569', fontSize: '0.75rem', letterSpacing: '0.3px', textAlign: 'left', whiteSpace: 'nowrap' }}>Invoice #</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: '#475569', fontSize: '0.75rem', letterSpacing: '0.3px', textAlign: 'left' }}>Customer</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: '#475569', fontSize: '0.75rem', letterSpacing: '0.3px', textAlign: 'left' }}>Order Ref</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: '#475569', fontSize: '0.75rem', letterSpacing: '0.3px', textAlign: 'left' }}>Invoice Date</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: '#475569', fontSize: '0.75rem', letterSpacing: '0.3px', textAlign: 'left' }}>Due Date</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: '#475569', fontSize: '0.75rem', letterSpacing: '0.3px', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: '#475569', fontSize: '0.75rem', letterSpacing: '0.3px', textAlign: 'right' }}>Paid</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: '#475569', fontSize: '0.75rem', letterSpacing: '0.3px', textAlign: 'right' }}>Outstanding</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: '#475569', fontSize: '0.75rem', letterSpacing: '0.3px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: '#475569', fontSize: '0.75rem', letterSpacing: '0.3px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const isOverdue = inv.status !== 'Paid' && inv.dueDate && new Date(inv.dueDate) < new Date();
                const badge = STATUS_BADGES[inv.status] || STATUS_BADGES.Unpaid;

                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.1s ease' }}>
                    {/* INVOICE # */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
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
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.84rem' }}>{inv.customer?.businessName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>{inv.customer?.mobile || '-'}</div>
                    </td>

                    {/* ORDER REF */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      {inv.order?.orderNumber ? (
                        <a 
                          href={`/orders/${inv.orderId}`} 
                          style={{ color: '#475569', fontWeight: 500, textDecoration: 'none', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.76rem' }}
                        >
                          {inv.order.orderNumber}
                        </a>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.76rem' }}>Manual</span>
                      )}
                    </td>

                    {/* INVOICE DATE */}
                    <td style={{ padding: '12px 14px', color: '#475569', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {new Date(inv.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>

                    {/* DUE DATE */}
                    <td style={{ padding: '12px 14px', color: isOverdue ? '#b91c1c' : '#475569', fontSize: '0.8rem', whiteSpace: 'nowrap', fontWeight: isOverdue ? 600 : 400 }}>
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      {isOverdue && (
                        <span style={{ fontSize: '0.62rem', backgroundColor: '#fee2e2', color: '#991b1b', padding: '1px 4px', borderRadius: '3px', marginLeft: '4px', fontWeight: 600, border: '1px solid #fecaca' }}>
                          OVERDUE
                        </span>
                      )}
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
                    <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                        
                        {/* 1. Print Button */}
                        {inv.orderId && (
                          <a
                            href={`/orders/${inv.orderId}/invoice`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '4px 8px',
                              borderRadius: '5px',
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              textDecoration: 'none',
                              transition: 'all 0.15s ease'
                            }}
                            title="Print Tax Invoice"
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.color = '#334155'; }}
                          >
                            <Printer size={12} /> Print
                          </a>
                        )}

                        {/* 2. WhatsApp Send Invoice Button */}
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(inv)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '5px',
                            backgroundColor: '#f0fdf4',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          title="Send Invoice on WhatsApp"
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#dcfce7'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f0fdf4'; }}
                        >
                          <MessageSquare size={12} /> WhatsApp
                        </button>

                        {/* 3. Overdue Payment Reminder Button */}
                        {inv.amountDue > 0 && (
                          <button
                            type="button"
                            onClick={() => handleReminder(inv)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '5px',
                              backgroundColor: '#fffbeb',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                            title="Send Overdue WhatsApp Payment Reminder"
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fef3c7'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fffbeb'; }}
                          >
                            <BellRing size={12} /> Remind
                          </button>
                        )}

                        {/* 4. Record Payment Button */}
                        {inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
                          <button
                            type="button"
                            onClick={() => { setError(""); setPaymentModal(inv); }}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '5px',
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                            title="Record Customer Payment"
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#dbeafe'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                          >
                            <CreditCard size={12} /> Pay
                          </button>
                        )}

                        {/* 5. Edit Invoice Button */}
                        <button
                          type="button"
                          onClick={() => { setError(""); setEditModal(inv); }}
                          style={{
                            padding: '4px 6px',
                            borderRadius: '5px',
                            backgroundColor: '#f8fafc',
                            color: '#4f46e5',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
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
                            padding: '4px 6px',
                            borderRadius: '5px',
                            backgroundColor: '#f8fafc',
                            color: '#e11d48',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                          title="Delete Invoice"
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fff1f2'; e.currentTarget.style.borderColor = '#fecdd3'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                        >
                          <Trash2 size={13} />
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
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
                  <input 
                    name="paymentDate" 
                    type="date" 
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

      {/* ─── MODAL 2: EDIT INVOICE MODAL ─── */}
      {editModal && (
        <div className="modal-backdrop" onClick={() => setEditModal(null)}>
          <div className="modal-content glass-panel animate-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Edit3 size={16} color="var(--accent-primary, #4f46e5)" /> Edit Invoice
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  {editModal.invoiceNumber} • <span style={{ fontWeight: 600, color: '#334155' }}>{editModal.customer?.businessName}</span>
                </p>
              </div>
              <button className="close-btn" onClick={() => setEditModal(null)}>×</button>
            </div>

            <form onSubmit={handleEditInvoice} className="modal-body" style={{ marginTop: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                
                {/* Invoice Date */}
                <div className="vertical-group">
                  <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Invoice Date *</label>
                  <input
                    name="invoiceDate"
                    type="date"
                    required
                    defaultValue={editModal.invoiceDate ? new Date(editModal.invoiceDate).toISOString().split('T')[0] : ''}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', width: '100%' }}
                  />
                </div>

                {/* Due Date */}
                <div className="vertical-group">
                  <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Due Date</label>
                  <input
                    name="dueDate"
                    type="date"
                    defaultValue={editModal.dueDate ? new Date(editModal.dueDate).toISOString().split('T')[0] : ''}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', width: '100%' }}
                  />
                </div>

                {/* Total Amount */}
                <div className="vertical-group">
                  <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Total Amount (₹) *</label>
                  <input
                    name="totalAmount"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={editModal.totalAmount}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', width: '100%' }}
                  />
                </div>

                {/* Amount Paid */}
                <div className="vertical-group">
                  <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Amount Paid (₹)</label>
                  <input
                    name="amountPaid"
                    type="number"
                    step="0.01"
                    defaultValue={editModal.amountPaid}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', width: '100%' }}
                  />
                </div>

                {/* Status */}
                <div className="vertical-group">
                  <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Invoice Status</label>
                  <select
                    name="status"
                    defaultValue={editModal.status}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', width: '100%' }}
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Payment Terms */}
                <div className="vertical-group">
                  <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Payment Terms</label>
                  <input
                    name="paymentTerms"
                    defaultValue={editModal.paymentTerms || 'Net 30'}
                    placeholder="e.g. Net 30, Due on Receipt"
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', width: '100%' }}
                  />
                </div>

                {/* Notes */}
                <div className="vertical-group" style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Internal Notes</label>
                  <textarea
                    name="notes"
                    defaultValue={editModal.notes || ''}
                    rows={2}
                    placeholder="Optional notes or reference information"
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              {error && (
                <div style={{ color: '#dc2626', backgroundColor: '#fee2e2', padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem', marginTop: '12px' }}>
                  {error}
                </div>
              )}

              <div className="modal-footer" style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
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
