"use client";
import React, { useState } from "react";
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
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
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

      {/* Invoice Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Order</th>
                <th>Invoice Date</th>
                <th>Due Date</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const isOverdue = inv.status !== 'Paid' && inv.dueDate && new Date(inv.dueDate) < new Date();
                return (
                  <tr key={inv.id}>
                    <td><strong>{inv.invoiceNumber}</strong></td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{inv.customer?.businessName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.customer?.mobile}</div>
                    </td>
                    <td>{inv.order?.orderNumber || <span style={{ color: 'var(--text-muted)' }}>Manual</span>}</td>
                    <td>{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                    <td style={{ color: isOverdue ? 'var(--danger)' : 'inherit', fontWeight: isOverdue ? 600 : 400 }}>
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}
                      {isOverdue && <div style={{ fontSize: '0.7rem' }}>OVERDUE</div>}
                    </td>
                    <td>₹{inv.totalAmount.toLocaleString()}</td>
                    <td style={{ color: 'var(--success)' }}>₹{inv.amountPaid.toLocaleString()}</td>
                    <td style={{ color: inv.amountDue > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                      ₹{inv.amountDue.toLocaleString()}
                    </td>
                    <td>
                      <span className={`status-badge ${STATUS_COLORS[inv.status] || ''}`}>{inv.status}</span>
                    </td>
                    <td>
                      {inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
                        <button className="action-btn text-blue" onClick={() => setPaymentModal(inv)}>
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
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
