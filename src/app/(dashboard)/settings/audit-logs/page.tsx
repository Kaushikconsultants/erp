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

  const userRole = (session.user as any)?.role;
  const canManageSettings = (session.user as any)?.canManageSettings;

  // Role Guard: Only Admins can inspect audit logs
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && !canManageSettings) {
    redirect('/');
  }

  const res = await getAuditLogs();
  const logs = res.success ? res.logs : [];

  return (
    <div
      style={{
        padding: '16px 14px 100px 14px',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
        <h1
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: 0
          }}
        >
          <ShieldCheck className="text-indigo-600" size={22} />
          <span>System Audit Logs</span>
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0 0', lineHeight: 1.45 }}>
          Track all security events, status changes, and administrative actions.
        </p>
      </div>

      {/* Log Table Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden'
        }}
      >
        {logs.length === 0 ? (
          <div style={{ padding: '44px 20px', textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto'
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem' }}>
              No audit logs recorded yet
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Administrative operations, login security, and record modifications will be tracked here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table
              style={{
                width: '100%',
                minWidth: '640px',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.82rem'
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  <th style={{ padding: '10px 14px' }}>Timestamp</th>
                  <th style={{ padding: '10px 14px' }}>User</th>
                  <th style={{ padding: '10px 14px' }}>Action</th>
                  <th style={{ padding: '10px 14px' }}>Module</th>
                  <th style={{ padding: '10px 14px' }}>Record ID</th>
                  <th style={{ padding: '10px 14px' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any, idx: number) => (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: idx === logs.length - 1 ? 'none' : '1px solid #f1f5f9'
                    }}
                  >
                    <td style={{ padding: '10px 14px', fontSize: '0.76rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{log.user?.name || 'System'}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{log.user?.email}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: '#f1f5f9',
                          color: '#334155',
                          fontWeight: 600,
                          fontSize: '0.74rem'
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#475569', fontWeight: 500 }}>{log.module}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.74rem', color: '#94a3b8' }}>{log.recordId || '-'}</td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: '0.75rem',
                        color: '#475569',
                        maxWidth: '240px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {log.newValue || log.previousValue || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
