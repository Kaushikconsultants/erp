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
    return <div className="p-8 text-center text-slate-500 animate-pulse">Loading workflow engine...</div>;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="text-amber-500" />
            Automated Workflows & Omnichannel Rules
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure automated CRM triggers, WhatsApp reminders, and background sales rep tasks.
          </p>
        </div>
        <button
          onClick={handleRunNow}
          disabled={executing}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md transition flex items-center gap-2 self-start md:self-auto"
        >
          {executing ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
          {executing ? "Evaluating Rules..." : "Run Workflows Now"}
        </button>
      </div>

      {/* Manual Execution Banner */}
      {execResult && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-600" size={24} />
            <div>
              <div className="font-bold text-sm">Automated Rules Executed Successfully!</div>
              <div className="text-xs text-emerald-700">
                Processed {execResult.processedCount || 0} overdue invoices &bull; Sent {execResult.remindersSent || 0} WhatsApp reminders &bull; Created {execResult.tasksCreated || 0} tasks
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Rules Grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Sliders size={20} className="text-indigo-600" />
          Active Automation Triggers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md uppercase tracking-wider">
                    {rule.trigger}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.isActive}
                      onChange={() => handleToggle(rule.id, rule.isActive)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <h3 className="font-bold text-slate-900">{rule.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{rule.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={14} className="text-emerald-500" /> Auto-Enforced
                </span>
                <span>Action: {rule.action}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Communication Log Table */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <MessageSquare size={20} className="text-emerald-600" />
          Omnichannel Message History
        </h2>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No WhatsApp or SMS communication logs recorded yet. Click "Run Workflows Now" above to trigger rules!
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Channel</th>
                  <th className="p-4">Recipient</th>
                  <th className="p-4">Message</th>
                  <th className="p-4">Trigger</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-md text-xs">
                        {log.type}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-900">+{log.recipient}</td>
                    <td className="p-4 text-xs text-slate-600 max-w-xs truncate">{log.message}</td>
                    <td className="p-4 text-xs font-medium text-slate-500">{log.triggerEvent || "MANUAL"}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded text-xs">
                        {log.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
