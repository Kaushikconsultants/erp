"use client";

import DatePicker from '@/components/ui/DatePicker';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  FileMinus, 
  Plus, 
  Search, 
  ChevronDown, 
  Filter, 
  Printer, 
  ExternalLink, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  Receipt, 
  X,
  FileSpreadsheet
} from 'lucide-react';
import { createCreditNote, cancelCreditNote } from '@/app/actions/creditNoteActions';
import * as XLSX from 'xlsx';
import './credit-notes.css';

interface CreditNotesClientProps {
  initialCreditNotes: any[];
  customers: any[];
  products: any[];
  invoices: any[];
}

export default function CreditNotesClient({
  initialCreditNotes,
  customers,
  products,
  invoices
}: CreditNotesClientProps) {
  const [creditNotes, setCreditNotes] = useState<any[]>(initialCreditNotes);
  const [search, setSearch] = useState('');
  const [filterReason, setFilterReason] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Create Modal State
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [reason, setReason] = useState('Sales Return');
  const [restockGoods, setRestockGoods] = useState(true);
  const [cnDate, setCnDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('Credit note valid for adjustment against future invoices or payments.');

  // Dynamic Line Items
  const [lineItems, setLineItems] = useState<Array<{
    productId: string;
    description: string;
    sku: string;
    hsnCode: string;
    quantity: number;
    unit: string;
    rate: number;
    gstRate: number;
  }>>([
    { productId: '', description: '', sku: '', hsnCode: '6109', quantity: 1, unit: 'pcs', rate: 0, gstRate: 12 }
  ]);

  // Customer Invoices
  const customerInvoices = useMemo(() => {
    if (!selectedCustomerId) return [];
    return invoices.filter(i => i.customerId === selectedCustomerId);
  }, [selectedCustomerId, invoices]);

  // Filtered List
  const filtered = useMemo(() => {
    return creditNotes.filter(cn => {
      const matchStatus = filterStatus === 'All' || cn.status === filterStatus;
      const matchReason = filterReason === 'All' || cn.reason === filterReason;
      const q = search.toLowerCase();
      const matchSearch = !search ||
        cn.creditNoteNumber.toLowerCase().includes(q) ||
        (cn.customer?.businessName || '').toLowerCase().includes(q) ||
        (cn.customer?.contactPerson || '').toLowerCase().includes(q) ||
        (cn.invoice?.invoiceNumber || '').toLowerCase().includes(q);

      return matchStatus && matchReason && matchSearch;
    });
  }, [creditNotes, search, filterReason, filterStatus]);

  // Metrics
  const totalIssued = creditNotes.filter(cn => cn.status !== 'CANCELLED').reduce((acc, cn) => acc + (cn.totalAmount || 0), 0);
  const openBalance = creditNotes.filter(cn => cn.status === 'OPEN').reduce((acc, cn) => acc + (cn.balanceAmount || cn.totalAmount || 0), 0);
  const salesReturnsCount = creditNotes.filter(cn => cn.reason === 'Sales Return' && cn.status !== 'CANCELLED').length;
  const restockedCount = creditNotes.filter(cn => cn.restockReturnedGoods && cn.status !== 'CANCELLED').length;

  // Handle Product Select for line item
  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    const updated = [...lineItems];
    if (prod) {
      updated[index] = {
        ...updated[index],
        productId: prod.id,
        description: prod.name,
        sku: prod.sku || prod.articleNumber || '',
        hsnCode: prod.hsnCode || '6109',
        rate: prod.sellingPrice || 0
      };
    } else {
      updated[index] = {
        ...updated[index],
        productId: '',
        description: '',
        sku: '',
        rate: 0
      };
    }
    setLineItems(updated);
  };

  // Add & Remove line item
  const addLineItem = () => {
    setLineItems([...lineItems, { productId: '', description: '', sku: '', hsnCode: '6109', quantity: 1, unit: 'pcs', rate: 0, gstRate: 12 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setError('Please select a customer.');
      return;
    }

    const validItems = lineItems.filter(item => item.description.trim() !== '' && item.quantity > 0);
    if (validItems.length === 0) {
      setError('Please provide at least one valid line item.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await createCreditNote({
      customerId: selectedCustomerId,
      invoiceId: selectedInvoiceId || undefined,
      reason,
      creditNoteDate: cnDate,
      restockReturnedGoods: restockGoods,
      notes,
      termsConditions: terms,
      items: validItems
    });

    setLoading(false);

    if (res.success && res.creditNote) {
      setCreditNotes([res.creditNote, ...creditNotes]);
      setShowModal(false);
      // Reset
      setSelectedCustomerId('');
      setSelectedInvoiceId('');
      setReason('Sales Return');
      setNotes('');
      setLineItems([{ productId: '', description: '', sku: '', hsnCode: '6109', quantity: 1, unit: 'pcs', rate: 0, gstRate: 12 }]);
    } else {
      setError(res.error || 'Failed to create credit note');
    }
  };

  // Cancel Credit Note
  const handleCancel = async (id: string, cnNumber: string) => {
    if (!confirm(`Are you sure you want to cancel Credit Note ${cnNumber}? This will reverse inventory restock if applicable.`)) return;
    const res = await cancelCreditNote(id, 'Cancelled from list view');
    if (res.success) {
      setCreditNotes(creditNotes.map(cn => cn.id === id ? { ...cn, status: 'CANCELLED' } : cn));
    } else {
      alert(res.error || 'Failed to cancel');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filtered.map(cn => ({
      'Credit Note #': cn.creditNoteNumber,
      'Date': new Date(cn.creditNoteDate).toLocaleDateString(),
      'Customer': cn.customer?.businessName || cn.customer?.contactPerson,
      'Original Invoice': cn.invoice?.invoiceNumber || '-',
      'Reason': cn.reason,
      'Subtotal (₹)': cn.subtotal,
      'CGST (₹)': cn.cgst,
      'SGST (₹)': cn.sgst,
      'IGST (₹)': cn.igst,
      'Total Amount (₹)': cn.totalAmount,
      'Balance (₹)': cn.balanceAmount,
      'Status': cn.status,
      'Restocked': cn.restockReturnedGoods ? 'Yes' : 'No'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Credit Notes");
    XLSX.writeFile(wb, `Credit_Notes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Calculate modal live totals
  const modalSubtotal = lineItems.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
  const modalTax = lineItems.reduce((acc, item) => acc + ((Number(item.quantity || 0) * Number(item.rate || 0) * Number(item.gstRate || 0)) / 100), 0);
  const modalGrandTotal = Math.round(modalSubtotal + modalTax);

  // Status counts for chips
  const statusCounts = useMemo(() => {
    return {
      All: creditNotes.length,
      OPEN: creditNotes.filter(cn => cn.status === 'OPEN').length,
      ADJUSTED: creditNotes.filter(cn => cn.status === 'ADJUSTED').length,
      REFUNDED: creditNotes.filter(cn => cn.status === 'REFUNDED').length,
      CANCELLED: creditNotes.filter(cn => cn.status === 'CANCELLED').length,
    };
  }, [creditNotes]);

  return (
    <div className="credit-notes-container">
      {/* ─── 1. RESPONSIVE KPI METRICS ─── */}
      <div className="credit-notes-kpi-grid">
        <div className="credit-notes-kpi-card issued">
          <div className="credit-notes-kpi-label">Total Credit Issued</div>
          <div className="credit-notes-kpi-value" style={{ color: '#e11d48' }}>
            ₹{totalIssued.toLocaleString('en-IN')}
          </div>
          <div className="credit-notes-kpi-sub">
            Across {creditNotes.length} credit notes
          </div>
        </div>

        <div className="credit-notes-kpi-card balance">
          <div className="credit-notes-kpi-label">Open / Unadjusted Balance</div>
          <div className="credit-notes-kpi-value" style={{ color: '#d97706' }}>
            ₹{openBalance.toLocaleString('en-IN')}
          </div>
          <div className="credit-notes-kpi-sub">
            Available for future deductions
          </div>
        </div>

        <div className="credit-notes-kpi-card returns">
          <div className="credit-notes-kpi-label">Sales Returns</div>
          <div className="credit-notes-kpi-value" style={{ color: '#2563eb' }}>
            {salesReturnsCount} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>returns</span>
          </div>
          <div className="credit-notes-kpi-sub">
            {restockedCount} restocked into warehouse
          </div>
        </div>
      </div>

      {/* ─── 2. TOOLBAR & CONTROLS ─── */}
      <div className="credit-notes-toolbar">
        <div className="credit-notes-toolbar-top">
          {/* Search Input */}
          <div className="credit-notes-search-wrap">
            <Search size={15} className="credit-notes-search-icon" />
            <input
              type="text"
              placeholder="Search CN #, customer, invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="credit-notes-search-input"
            />
          </div>

          {/* Reason Filter */}
          <div style={{ position: 'relative', minWidth: '170px' }}>
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="credit-notes-select"
              style={{ width: '100%' }}
            >
              <option value="All">All Reasons</option>
              <option value="Sales Return">Sales Return</option>
              <option value="Post-Sale Discount">Post-Sale Discount</option>
              <option value="Defective Goods">Defective Goods</option>
              <option value="Price Correction">Price Correction</option>
              <option value="Other">Other</option>
            </select>
            <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {(search || filterReason !== 'All' || filterStatus !== 'All') && (
            <button
              onClick={() => { setSearch(''); setFilterReason('All'); setFilterStatus('All'); }}
              style={{
                height: '40px',
                padding: '0 12px',
                borderRadius: '10px',
                border: '1px solid #fecaca',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RotateCcw size={13} /> Reset
            </button>
          )}

          {/* Action Buttons */}
          <div className="credit-notes-toolbar-actions">
            <button
              onClick={handleExportExcel}
              style={{
                height: '40px',
                padding: '0 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#166534',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FileSpreadsheet size={15} /> Export Excel
            </button>

            <button
              onClick={() => setShowModal(true)}
              style={{
                height: '40px',
                padding: '0 16px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#e11d48',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(225, 29, 72, 0.25)'
              }}
            >
              <Plus size={16} /> Create Credit Note
            </button>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="credit-notes-status-chips-bar">
          {(['All', 'OPEN', 'ADJUSTED', 'REFUNDED', 'CANCELLED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`credit-notes-status-chip ${filterStatus === st ? 'active' : ''}`}
            >
              <span>{st === 'All' ? 'All Statuses' : st.charAt(0) + st.slice(1).toLowerCase()}</span>
              <span className="cn-chip-count">{statusCounts[st] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── 3. DESKTOP DATA TABLE (Visible > 768px) ─── */}
      <div className="credit-notes-desktop-table">
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>Credit Note #</th>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Customer</th>
                <th style={{ padding: '12px 16px' }}>Linked Invoice</th>
                <th style={{ padding: '12px 16px' }}>Reason</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Open Balance</th>
                <th style={{ padding: '12px 16px' }}>Restocked</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    <FileMinus size={36} style={{ margin: '0 auto 10px auto', color: '#cbd5e1' }} />
                    <p style={{ margin: 0, fontWeight: 700, color: '#475569' }}>No Credit Notes Found</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>Create a credit note for sales returns or billing adjustments.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(cn => (
                  <tr key={cn.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#e11d48' }}>
                      <Link href={`/credit-notes/${cn.id}`} style={{ color: '#e11d48', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {cn.creditNoteNumber} <ExternalLink size={12} />
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {new Date(cn.creditNoteDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      <div>{cn.customer?.businessName || cn.customer?.contactPerson}</div>
                      {cn.customer?.gstin && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>GSTIN: {cn.customer.gstin}</div>}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {cn.invoice?.invoiceNumber ? (
                        <span style={{ fontWeight: 600, color: '#4f46e5' }}>{cn.invoice.invoiceNumber}</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Direct / None</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: cn.reason === 'Sales Return' ? '#fee2e2' : '#f1f5f9',
                        color: cn.reason === 'Sales Return' ? '#991b1b' : '#334155'
                      }}>
                        {cn.reason}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>
                      ₹{cn.totalAmount?.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: cn.balanceAmount > 0 ? '#d97706' : '#16a34a', textAlign: 'right' }}>
                      ₹{cn.balanceAmount?.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {cn.restockReturnedGoods ? (
                        <span style={{ color: '#16a34a', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <CheckCircle2 size={13} /> Yes
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>No</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: cn.status === 'OPEN' ? '#fef3c7' : (cn.status === 'ADJUSTED' ? '#dcfce7' : '#fee2e2'),
                        color: cn.status === 'OPEN' ? '#92400e' : (cn.status === 'ADJUSTED' ? '#166534' : '#991b1b')
                      }}>
                        {cn.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <Link
                          href={`/credit-notes/${cn.id}`}
                          title="Print / View Credit Note"
                          style={{
                            height: '28px',
                            padding: '0 8px',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            border: '1px solid #cbd5e1',
                            boxSizing: 'border-box'
                          }}
                        >
                          <Printer size={13} /> Print
                        </Link>
                        {cn.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancel(cn.id, cn.creditNoteNumber)}
                            title="Cancel Credit Note"
                            style={{
                              height: '28px',
                              padding: '0 8px',
                              borderRadius: '6px',
                              border: '1px solid #fecdd3',
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              boxSizing: 'border-box'
                            }}
                          >
                            <Trash2 size={13} /> Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 4. MOBILE CREDIT NOTE CARDS FEED (Visible <= 768px) ─── */}
      <div className="credit-notes-mobile-feed">
        {filtered.length === 0 ? (
          <div className="cn-empty-state">
            <FileMinus size={36} color="#cbd5e1" style={{ marginBottom: '8px' }} />
            <div style={{ fontWeight: 700, color: '#475569', fontSize: '0.9rem' }}>No Credit Notes Found</div>
            <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>
              Create a credit note for sales returns or billing adjustments.
            </div>
          </div>
        ) : (
          filtered.map(cn => {
            const statusBg = cn.status === 'OPEN' ? '#fef3c7' : (cn.status === 'ADJUSTED' ? '#dcfce7' : '#fee2e2');
            const statusColor = cn.status === 'OPEN' ? '#92400e' : (cn.status === 'ADJUSTED' ? '#166534' : '#991b1b');
            const reasonBg = cn.reason === 'Sales Return' ? '#fee2e2' : '#f1f5f9';
            const reasonColor = cn.reason === 'Sales Return' ? '#991b1b' : '#334155';

            return (
              <div key={cn.id} className="credit-note-mobile-card">
                {/* Header: CN Number, Status & Date */}
                <div className="cn-card-header">
                  <div className="cn-card-num-group">
                    <Link href={`/credit-notes/${cn.id}`} className="cn-card-num">
                      {cn.creditNoteNumber} <ExternalLink size={12} />
                    </Link>
                    <span className="cn-status-pill" style={{ backgroundColor: statusBg, color: statusColor }}>
                      {cn.status}
                    </span>
                  </div>
                  <span className="cn-card-date">
                    {new Date(cn.creditNoteDate).toLocaleDateString()}
                  </span>
                </div>

                {/* Customer & Tags */}
                <div className="cn-card-body">
                  <div className="cn-customer-name">
                    {cn.customer?.businessName || cn.customer?.contactPerson}
                  </div>
                  {cn.customer?.gstin && (
                    <div className="cn-customer-gst">GSTIN: {cn.customer.gstin}</div>
                  )}

                  <div className="cn-tags-row">
                    <span className="cn-reason-tag" style={{ backgroundColor: reasonBg, color: reasonColor }}>
                      {cn.reason}
                    </span>
                    {cn.invoice?.invoiceNumber && (
                      <span className="cn-invoice-tag">
                        Inv #{cn.invoice.invoiceNumber}
                      </span>
                    )}
                    {cn.restockReturnedGoods ? (
                      <span className="cn-restock-tag" style={{ color: '#16a34a' }}>
                        <CheckCircle2 size={12} /> Restocked
                      </span>
                    ) : (
                      <span className="cn-restock-tag" style={{ color: '#94a3b8' }}>
                        No Restock
                      </span>
                    )}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="cn-fin-box">
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                      Total Amount
                    </div>
                    <div className="cn-fin-amount">
                      ₹{cn.totalAmount?.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="cn-fin-balance">
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                      Open Balance
                    </div>
                    <div className="cn-fin-balance-val" style={{ color: cn.balanceAmount > 0 ? '#d97706' : '#16a34a' }}>
                      ₹{cn.balanceAmount?.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="cn-card-actions">
                  <Link href={`/credit-notes/${cn.id}`} className="cn-btn-action cn-btn-print">
                    <Printer size={13} /> Print / View
                  </Link>
                  {cn.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      onClick={() => handleCancel(cn.id, cn.creditNoteNumber)}
                      className="cn-btn-action cn-btn-cancel"
                    >
                      <Trash2 size={13} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── CREATE CREDIT NOTE MODAL ─── */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '850px',
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ffe4e6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48' }}>
                  <FileMinus size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Create New Credit Note / Sales Return
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {error && (
                <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}

              <form id="create-cn-form" onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Row 1: Customer & Linked Invoice */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Customer *
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        setSelectedInvoiceId('');
                      }}
                      required
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                    >
                      <option value="">Select Customer...</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.businessName || c.contactPerson} {c.city ? `(${c.city})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Linked Invoice (Optional)
                    </label>
                    <select
                      value={selectedInvoiceId}
                      onChange={(e) => setSelectedInvoiceId(e.target.value)}
                      disabled={!selectedCustomerId}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                    >
                      <option value="">No linked invoice (Standalone)</option>
                      {customerInvoices.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} - Total: ₹{inv.totalAmount?.toLocaleString()} ({inv.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Credit Note Date
                    </label>
                    <DatePicker
                      
                      value={cnDate}
                      onChange={(e) => setCnDate(e.target.value)}
                      required
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Reason for Credit Note *
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                    >
                      <option value="Sales Return">Sales Return (Goods Returned)</option>
                      <option value="Post-Sale Discount">Post-Sale Discount</option>
                      <option value="Defective Goods">Defective Goods</option>
                      <option value="Price Correction">Price Correction</option>
                      <option value="Other">Other Adjustment</option>
                    </select>
                  </div>
                </div>

                {/* Restock Toggle */}
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="restock-goods-checkbox"
                    checked={restockGoods}
                    onChange={(e) => setRestockGoods(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                  />
                  <label htmlFor="restock-goods-checkbox" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534', cursor: 'pointer' }}>
                    Automatically replenish returned quantities back into warehouse stock (IN Movement)
                  </label>
                </div>

                {/* Line Items Table */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Line Items / Returned Items</span>
                    <button
                      type="button"
                      onClick={addLineItem}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#4f46e5',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={13} /> Add Item
                    </button>
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left' }}>Product / Description</th>
                          <th style={{ padding: '8px 10px', width: '90px', textAlign: 'right' }}>Qty</th>
                          <th style={{ padding: '8px 10px', width: '110px', textAlign: 'right' }}>Rate (₹)</th>
                          <th style={{ padding: '8px 10px', width: '90px', textAlign: 'right' }}>GST %</th>
                          <th style={{ padding: '8px 10px', width: '110px', textAlign: 'right' }}>Total (₹)</th>
                          <th style={{ padding: '8px 10px', width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item, idx) => {
                          const itemTotal = (item.quantity * item.rate) + ((item.quantity * item.rate * item.gstRate) / 100);
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <select
                                    value={item.productId}
                                    onChange={(e) => handleProductSelect(idx, e.target.value)}
                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
                                  >
                                    <option value="">Select Catalog Product...</option>
                                    {products.map(p => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} {p.sku ? `(${p.sku})` : ''} - ₹{p.sellingPrice}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="text"
                                    placeholder="Custom Description / Reason note"
                                    value={item.description}
                                    onChange={(e) => {
                                      const updated = [...lineItems];
                                      updated[idx].description = e.target.value;
                                      setLineItems(updated);
                                    }}
                                    required
                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
                                  />
                                </div>
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const updated = [...lineItems];
                                    updated[idx].quantity = parseFloat(e.target.value) || 1;
                                    setLineItems(updated);
                                  }}
                                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', textAlign: 'right', outline: 'none' }}
                                />
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.rate}
                                  onChange={(e) => {
                                    const updated = [...lineItems];
                                    updated[idx].rate = parseFloat(e.target.value) || 0;
                                    setLineItems(updated);
                                  }}
                                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', textAlign: 'right', outline: 'none' }}
                                />
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <select
                                  value={item.gstRate}
                                  onChange={(e) => {
                                    const updated = [...lineItems];
                                    updated[idx].gstRate = parseFloat(e.target.value) || 0;
                                    setLineItems(updated);
                                  }}
                                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
                                >
                                  <option value={12}>12%</option>
                                  <option value={5}>5%</option>
                                  <option value={18}>18%</option>
                                  <option value={28}>28%</option>
                                  <option value={0}>0%</option>
                                </select>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                ₹{itemTotal.toFixed(2)}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                {lineItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeLineItem(idx)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Totals Summary Strip */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  backgroundColor: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  gap: '24px',
                  fontSize: '0.85rem'
                }}>
                  <div>Subtotal: <strong>₹{modalSubtotal.toFixed(2)}</strong></div>
                  <div>Estimated Tax: <strong>₹{modalTax.toFixed(2)}</strong></div>
                  <div style={{ color: '#e11d48', fontSize: '0.95rem', fontWeight: 800 }}>
                    Credit Total: ₹{modalGrandTotal.toLocaleString()}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Return due to size mismatch or damaged packaging"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-cn-form"
                disabled={loading}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#e11d48',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: loading ? 'default' : 'pointer'
                }}
              >
                {loading ? 'Creating...' : 'Confirm & Issue Credit Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
