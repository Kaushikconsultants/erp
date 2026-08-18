import React from 'react';
import { getAuditLogs } from '@/app/actions/auditActions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AuditLogsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const res = await getAuditLogs();
  const logs = res.success ? res.logs : [];

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <div className="dashboard-header mb-6">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck className="text-indigo-600" /> System Audit Logs
          </h1>
          <p className="page-subtitle">Track all security events, status changes, and administrative actions.</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Module</th>
                <th>Record ID</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{log.user?.name || 'System'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.user?.email}</div>
                  </td>
                  <td>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-secondary)', fontWeight: 600, fontSize: '0.8rem' }}>
                      {log.action}
                    </span>
                  </td>
                  <td>{log.module}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.recordId || '-'}</td>
                  <td style={{ fontSize: '0.8rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.newValue || log.previousValue || '-'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No audit logs recorded yet.
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
