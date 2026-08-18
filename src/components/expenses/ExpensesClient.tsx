"use client";
import React, { useState } from "react";
import { submitExpense, approveExpense, rejectExpense, markExpensePaid } from "@/app/actions/expenseActions";

const EXPENSE_CATEGORIES = ["Travel", "Meals & Entertainment", "Office Supplies", "Equipment", "Software", "Marketing", "Training", "Utilities", "Other"];

const STATUS_COLOR: Record<string, string> = {
  Pending: 'warning',
  Approved: 'active',
  Rejected: 'inactive',
  Paid: 'active',
};

export default function ExpensesClient({ initialExpenses, isAdmin }: { initialExpenses: any[]; isAdmin: boolean }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const filtered = filterStatus === "All" ? expenses : expenses.filter(e => e.status === filterStatus);

  const totalPending = expenses.filter(e => e.status === 'Pending').reduce((s, e) => s + e.amount, 0);
  const totalApproved = expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + e.amount, 0);
  const totalPaid = expenses.filter(e => e.status === 'Paid').reduce((s, e) => s + e.amount, 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    const res = await submitExpense(fd);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setAddOpen(false);
    window.location.reload();
  }

  async function handleAction(fn: (id: string) => Promise<any>, id: string) {
    const res = await fn(id);
    if (res.error) alert(res.error);
    else window.location.reload();
  }

  return (
    <div>
      {/* Header */}
      <div className="dashboard-header mb-6">
        <div>
          <h1 className="page-title">Expense Management</h1>
          <p className="page-subtitle">{isAdmin ? "Review and approve employee expense claims." : "Submit and track your expense claims."}</p>
        </div>
        <button className="primary-btn" onClick={() => setAddOpen(true)}>+ Submit Expense</button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Pending Approval</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b' }}>₹{totalPending.toLocaleString()}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{expenses.filter(e => e.status === 'Pending').length} claims</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Approved (Unpaid)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3b82f6' }}>₹{totalApproved.toLocaleString()}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{expenses.filter(e => e.status === 'Approved').length} claims</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Paid Out</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>₹{totalPaid.toLocaleString()}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{expenses.filter(e => e.status === 'Paid').length} claims</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '16px' }}>
        <select className="form-input" style={{ maxWidth: 180 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          {["All", "Pending", "Approved", "Rejected", "Paid"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Expense #</th>
                {isAdmin && <th>Employee</th>}
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((exp: any) => (
                <tr key={exp.id}>
                  <td><strong>{exp.expenseNumber}</strong></td>
                  {isAdmin && <td>{exp.employee?.user?.name || '-'}</td>}
                  <td>{new Date(exp.date).toLocaleDateString()}</td>
                  <td>
                    <span style={{ padding: '2px 8px', borderRadius: '999px', background: 'var(--bg-secondary)', fontSize: '0.8rem' }}>
                      {exp.category}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{exp.description || '-'}</td>
                  <td style={{ fontWeight: 700 }}>₹{exp.amount.toLocaleString()}</td>
                  <td>
                    <span className={`status-badge ${STATUS_COLOR[exp.status] || ''}`}>{exp.status}</span>
                  </td>
                  {isAdmin && (
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {exp.status === 'Pending' && (
                          <>
                            <button className="action-btn text-green" onClick={() => handleAction(approveExpense, exp.id)}>Approve</button>
                            <button className="action-btn text-red" onClick={() => handleAction(rejectExpense, exp.id)}>Reject</button>
                          </>
                        )}
                        {exp.status === 'Approved' && (
                          <button className="action-btn text-blue" onClick={() => handleAction(markExpensePaid, exp.id)}>Mark Paid</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No expenses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Expense Modal */}
      {addOpen && (
        <div className="modal-overlay" onClick={() => setAddOpen(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>Submit Expense Claim</h2>
              <button className="modal-close" onClick={() => setAddOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Category *</label>
                  <select name="category" className="form-input" required>
                    <option value="">Select category...</option>
                    {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input name="date" type="date" className="form-input" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="form-group">
                  <label>Amount (₹) *</label>
                  <input name="amount" type="number" step="0.01" min="1" className="form-input" required placeholder="0.00" />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Description</label>
                  <input name="description" className="form-input" placeholder="Brief description of expense" />
                </div>
              </div>
              {error && <p style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p>}
              <div className="modal-footer" style={{ marginTop: 16 }}>
                <button type="button" className="action-btn" onClick={() => setAddOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? "Submitting..." : "Submit Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
