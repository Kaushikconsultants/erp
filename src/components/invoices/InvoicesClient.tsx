"use client";
import React, { useState } from "react";
import Link from "next/link";
import { FileMinus, Printer, ExternalLink } from "lucide-react";
import { recordPayment } from "@/app/actions/paymentActions";
import { cancelInvoice } from "@/app/actions/invoiceActions";

const PAYMENT_MODES = ["Cash", "Bank Transfer", "UPI", "Cheque", "Card", "Other"];

const STATUS_COLORS: Record<string, string> = {
  Unpaid: "inactive",
  "Partially Paid": "warning",
  Paid: "active",
  Overdue: "danger",
  Cancelled: "inactive",
};

export default function InvoicesClient({ initialInvoices }: { initialInvoices: any[] }) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [paymentModal, setPaymentModal] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = invoices.filter(inv => {
    const matchStatus = filterStatus === "All" || inv.status === filterStatus;
    const matchSearch = inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.businessName?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalOutstanding = invoices
    .filter(i => ["Unpaid", "Partially Paid", "Overdue"].includes(i.status))
    .reduce((s, i) => s + i.amountDue, 0);

  const totalCollected = invoices.reduce((s, i) => s + i.amountPaid, 0);
  const overdueCount = invoices.filter(i => i.status === "Overdue").length;

  async function handlePayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!paymentModal) return;
    setLoading(true); setError("");
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
    if (res.error) { setError(res.error); return; }
    setPaymentModal(null);
    window.location.reload();
  }

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Outstanding</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--danger)' }}>₹{totalOutstanding.toLocaleString()}</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Collected</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>₹{totalCollected.toLocaleString()}</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Overdue Invoices</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: overdueCount > 0 ? 'var(--warning)' : 'inherit' }}>{overdueCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search invoice or customer..."
            className="form-input"
            style={{ maxWidth: 280 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="form-input" style={{ maxWidth: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            {["All", "Unpaid", "Partially Paid", "Paid", "Overdue", "Cancelled"].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <Link
          href="/credit-notes"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #fecdd3',
            backgroundColor: '#fff1f2',
            color: '#e11d48',
            fontSize: '0.85rem',
            fontWeight: 700,
            textDecoration: 'none'
          }}
        >
          <FileMinus size={15} /> Credit Notes & Returns
        </Link>
      </div>

      {/* Invoice Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>Invoice #</th>
                <th style={{ padding: '12px 16px' }}>Customer</th>
                <th style={{ padding: '12px 16px' }}>Order Ref</th>
                <th style={{ padding: '12px 16px' }}>Invoice Date</th>
                <th style={{ padding: '12px 16px' }}>Due Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Paid</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Outstanding</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const isOverdue = inv.status !== 'Paid' && inv.dueDate && new Date(inv.dueDate) < new Date();
                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#2563eb' }}>
                      {inv.orderId ? (
                        <a
                          href={`/orders/${inv.orderId}/invoice`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="View / Print Tax Invoice"
                        >
                          {inv.invoiceNumber} <ExternalLink size={12} />
                        </a>
                      ) : (
                        inv.invoiceNumber
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      <div>{inv.customer?.businessName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{inv.customer?.mobile}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {inv.order?.orderNumber ? (
                        <a href={`/orders/${inv.orderId}`} style={{ color: '#475569', fontWeight: 600, textDecoration: 'none' }}>
                          {inv.order.orderNumber}
                        </a>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Manual</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {new Date(inv.invoiceDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px', color: isOverdue ? '#dc2626' : '#475569', fontWeight: isOverdue ? 700 : 400 }}>
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}
                      {isOverdue && <span style={{ fontSize: '0.68rem', backgroundColor: '#fee2e2', color: '#991b1b', padding: '1px 5px', borderRadius: '4px', marginLeft: '4px', fontWeight: 800 }}>OVERDUE</span>}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      ₹{inv.totalAmount.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                      ₹{inv.amountPaid.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: inv.amountDue > 0 ? '#dc2626' : '#16a34a' }}>
                      ₹{inv.amountDue.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`status-badge ${STATUS_COLORS[inv.status] || ''}`} style={{ fontWeight: 700 }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {inv.orderId && (
                          <a
                            href={`/orders/${inv.orderId}/invoice`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="action-btn outline-primary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                            title="Print Invoice"
                          >
                            <Printer size={13} /> Print
                          </a>
                        )}
                        {inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
                          <button
                            className="action-btn"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 600, cursor: 'pointer', borderRadius: '6px' }}
                            onClick={() => setPaymentModal(inv)}
                          >
                            Record Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {paymentModal && (
        <div className="modal-overlay" onClick={() => setPaymentModal(null)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div>
                <h2>Record Payment</h2>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{paymentModal.invoiceNumber} — {paymentModal.customer?.businessName}</div>
              </div>
              <button className="modal-close" onClick={() => setPaymentModal(null)}>×</button>
            </div>
            <form onSubmit={handlePayment} className="modal-body">
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Amount</span>
                  <strong>₹{paymentModal.totalAmount?.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Already Paid</span>
                  <span style={{ color: 'var(--success)' }}>₹{paymentModal.amountPaid?.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
                  <span>Amount Due</span>
                  <span style={{ color: 'var(--danger)' }}>₹{paymentModal.amountDue?.toLocaleString()}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Amount (₹) *</label>
                  <input name="amount" type="number" step="0.01" min="1" max={paymentModal.amountDue} defaultValue={paymentModal.amountDue} className="form-input" required />
                </div>
                <div className="form-group">
                  <label>Payment Mode *</label>
                  <select name="paymentMode" className="form-input" required>
                    {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Date</label>
                  <input name="paymentDate" type="date" className="form-input" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="form-group">
                  <label>Reference / UTR No.</label>
                  <input name="referenceNumber" className="form-input" placeholder="e.g. UTR123456" />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Notes</label>
                  <input name="notes" className="form-input" placeholder="Optional payment notes" />
                </div>
              </div>

              {error && <p style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p>}
              <div className="modal-footer" style={{ marginTop: 16 }}>
                <button type="button" className="action-btn" onClick={() => setPaymentModal(null)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? "Recording..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
