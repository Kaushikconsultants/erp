import React from 'react';
import { getPayments, getPaymentSummary } from '@/app/actions/paymentActions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { IndianRupee, TrendingUp, CreditCard } from 'lucide-react';

export const dynamic = 'force-dynamic';

const MODE_COLORS: Record<string, string> = {
  Cash: 'bg-green-100 text-green-700',
  UPI: 'bg-purple-100 text-purple-700',
  'Bank Transfer': 'bg-blue-100 text-blue-700',
  Cheque: 'bg-orange-100 text-orange-700',
  Card: 'bg-indigo-100 text-indigo-700',
  Other: 'bg-gray-100 text-gray-700',
};

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const [paymentsRes, summaryRes] = await Promise.all([
    getPayments(),
    getPaymentSummary(),
  ]);

  const payments = paymentsRes.success ? paymentsRes.payments : [];
  const summary = summaryRes.success ? summaryRes : null;

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <div className="dashboard-header mb-6">
        <div>
          <h1 className="page-title">Payment Collection</h1>
          <p className="page-subtitle">Track all payment transactions and collection status.</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={22} color="#fff" />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Collected</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>₹{summary.totalCollected.toLocaleString()}</div>
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={22} color="#fff" />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>This Month</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹{summary.thisMonthCollected.toLocaleString()}</div>
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={22} color="#fff" />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Outstanding</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>₹{summary.totalOutstanding.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Mode Breakdown */}
      {summary?.byMode && summary.byMode.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontWeight: 600 }}>Collection by Payment Mode</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {summary.byMode.map((m: any) => (
              <div key={m.paymentMode} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', minWidth: 140 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.paymentMode}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>₹{(m._sum.amount || 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payments Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '16px', fontWeight: 600 }}>Payment History</h3>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Payment #</th>
                <th>Customer</th>
                <th>Invoice</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Reference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((pay: any) => (
                <tr key={pay.id}>
                  <td><strong>{pay.paymentNumber}</strong></td>
                  <td>{pay.invoice?.customer?.businessName || '-'}</td>
                  <td style={{ color: 'var(--primary)' }}>{pay.invoice?.invoiceNumber || '-'}</td>
                  <td>{new Date(pay.paymentDate).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{pay.amount.toLocaleString()}</td>
                  <td>
                    <span style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600, background: '#e0e7ff', color: '#3730a3' }}>
                      {pay.paymentMode}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{pay.referenceNumber || '-'}</td>
                  <td>
                    <span className={`status-badge ${pay.status === 'Completed' ? 'active' : 'inactive'}`}>{pay.status}</span>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No payments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
