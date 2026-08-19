"use client";

import React, { useEffect, useState } from "react";
import { getWorkflowRules, toggleWorkflowRule, processUnpaidInvoicesWorkflow } from "@/app/actions/workflowActions";
import { getCommunicationLogs } from "@/app/actions/whatsappActions";
import { Zap, MessageSquare, Play, RefreshCw, CheckCircle2, Sliders, ShieldCheck } from "lucide-react";

export default function WorkflowsPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<any>(null);

  async function loadData() {
    setLoading(true);
    const [rulesRes, logsRes] = await Promise.all([
      getWorkflowRules(),
      getCommunicationLogs()
    ]);

    if (rulesRes.success && rulesRes.rules) setRules(rulesRes.rules);
    if (logsRes.success && logsRes.logs) setLogs(logsRes.logs);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (id: string, current: boolean) => {
    const res = await toggleWorkflowRule(id, !current);
    if (res.success) {
      setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !current } : r));
    }
  };

  const handleRunNow = async () => {
    setExecuting(true);
    setExecResult(null);
    const res = await processUnpaidInvoicesWorkflow();
    setExecResult(res);
    setExecuting(false);
    loadData();
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
        Loading workflow engine...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap style={{ color: '#f59e0b' }} size={26} />
            Automated Workflows & Omnichannel Rules
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>
            Configure automated CRM triggers, WhatsApp reminders, and background sales rep tasks.
          </p>
        </div>
        <button
          onClick={handleRunNow}
          disabled={executing}
          style={{
            padding: '10px 18px',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '0.875rem',
            borderRadius: '10px',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: executing ? 'not-allowed' : 'pointer',
            opacity: executing ? 0.6 : 1,
            boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)',
            transition: 'background-color 0.2s'
          }}
        >
          {executing ? <RefreshCw style={{ animation: 'spin 1s linear infinite' }} size={16} /> : <Play size={16} />}
          {executing ? "Evaluating Rules..." : "Run Workflows Now"}
        </button>
      </div>

      {/* Manual Execution Banner */}
      {execResult && (
        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '16px 20px', borderRadius: '12px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <CheckCircle2 style={{ color: '#059669', flexShrink: 0 }} size={24} />
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Automated Rules Executed Successfully!</div>
            <div style={{ fontSize: '0.825rem', marginTop: '2px', color: '#047857' }}>
              Processed {execResult.processedCount || 0} overdue invoices &bull; Sent {execResult.remindersSent || 0} WhatsApp reminders &bull; Created {execResult.tasksCreated || 0} follow-up tasks
            </div>
          </div>
        </div>
      )}

      {/* Active Rules Grid */}
      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={20} style={{ color: '#4f46e5' }} />
          Active Automation Triggers
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {rules.map((rule) => (
            <div key={rule.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '3px 10px', backgroundColor: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {rule.trigger}
                  </span>
                  <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={rule.isActive}
                      onChange={() => handleToggle(rule.id, rule.isActive)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: '#4f46e5' }}
                    />
                  </label>
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>{rule.name}</h3>
                <p style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: '1.4' }}>{rule.description}</p>
              </div>

              <div style={{ paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669', fontWeight: '600' }}>
                  <ShieldCheck size={14} /> Auto-Enforced
                </span>
                <span style={{ fontWeight: '500' }}>Action: {rule.action}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Communication Log Table */}
      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={20} style={{ color: '#059669' }} />
          Omnichannel Message History
        </h2>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {logs.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              No WhatsApp or SMS communication logs recorded yet. Click "Run Workflows Now" above to trigger rules!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 16px' }}>Channel</th>
                    <th style={{ padding: '12px 16px' }}>Recipient</th>
                    <th style={{ padding: '12px 16px' }}>Message</th>
                    <th style={{ padding: '12px 16px' }}>Trigger</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Sent At</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr key={log.id} style={{ borderBottom: idx === logs.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 8px', backgroundColor: '#ecfdf5', color: '#047857', fontWeight: '700', borderRadius: '6px', fontSize: '0.75rem' }}>
                          {log.type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>+{log.recipient}</td>
                      <td style={{ padding: '12px 16px', color: '#475569', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.8rem' }}>{log.triggerEvent || "MANUAL"}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '2px 8px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: '600', borderRadius: '4px', fontSize: '0.75rem' }}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.8rem' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
