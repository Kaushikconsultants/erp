"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  getWorkflowRules,
  toggleWorkflowRule,
  processUnpaidInvoicesWorkflow,
  getCommunicationLogs
} from "@/app/actions/workflowActions";
import {
  Zap,
  MessageSquare,
  Play,
  RefreshCw,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";

export default function WorkflowsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [rules, setRules] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<any>(null);

  const role = (session?.user as any)?.role;
  const isSuperOrAdmin = role === "SUPER_ADMIN" || role === "ADMIN";

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
    if (status === "authenticated") {
      if (!isSuperOrAdmin) {
        setLoading(false);
        return;
      }
      loadData();
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, isSuperOrAdmin, router]);

  const handleToggle = async (id: string, current: boolean) => {
    const res = await toggleWorkflowRule(id, !current);
    if (res.success) {
      setRules(prev => prev.map(r => (r.id === id ? { ...r, isActive: !current } : r)));
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

  // Role Guard: Access Restricted for non-admins (Salesperson / Employee)
  if (status === "authenticated" && !isSuperOrAdmin) {
    return (
      <div
        style={{
          padding: "32px 16px 100px 16px",
          maxWidth: "480px",
          margin: "40px auto",
          textAlign: "center"
        }}
      >
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: "32px 24px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)"
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              backgroundColor: "#fee2e2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto"
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f172a", margin: "0 0 8px 0" }}>
            Administrator Access Required
          </h2>
          <p style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5, margin: "0 0 20px 0" }}>
            Automated workflows and omnichannel triggers are restricted to Organization Admins.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "10px 20px",
              borderRadius: "8px",
              backgroundColor: "#4f46e5",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "0.85rem",
              textDecoration: "none"
            }}
          >
            <ArrowLeft size={16} /> Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "48px 16px", textAlign: "center", color: "#64748b", fontSize: "0.9rem" }}>
        <RefreshCw size={20} className="animate-spin" style={{ margin: "0 auto 10px auto", color: "#4f46e5" }} />
        <span>Loading workflow engine...</span>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "16px 14px 100px 14px",
        maxWidth: "1200px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "20px"
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "16px",
          flexWrap: "wrap",
          gap: "14px"
        }}
      >
        <div style={{ flex: "1 1 280px" }}>
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              color: "#0f172a",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              margin: 0,
              lineHeight: 1.3
            }}
          >
            <Zap style={{ color: "#f59e0b", flexShrink: 0 }} size={24} />
            <span>Automated Workflows & Omnichannel Rules</span>
          </h1>
          <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "6px", margin: "6px 0 0 0", lineHeight: 1.45 }}>
            Configure automated CRM triggers, WhatsApp reminders, and background sales rep tasks.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunNow}
          disabled={executing}
          style={{
            padding: "10px 18px",
            backgroundColor: "#4f46e5",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "0.84rem",
            borderRadius: "10px",
            border: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            cursor: executing ? "not-allowed" : "pointer",
            opacity: executing ? 0.7 : 1,
            boxShadow: "0 2px 6px rgba(79, 70, 229, 0.25)",
            minHeight: "42px",
            width: "auto"
          }}
        >
          {executing ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
          <span>{executing ? "Evaluating Rules..." : "Run Workflows Now"}</span>
        </button>
      </div>

      {/* Manual Execution Result Banner */}
      {execResult && (
        <div
          style={{
            backgroundColor: "#ecfdf5",
            border: "1px solid #a7f3d0",
            padding: "14px 16px",
            borderRadius: "12px",
            color: "#065f46",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <CheckCircle2 style={{ color: "#059669", flexShrink: 0 }} size={22} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Automated Rules Executed Successfully!</div>
            <div style={{ fontSize: "0.8rem", marginTop: "2px", color: "#047857", lineHeight: 1.4 }}>
              Processed {execResult.processedCount || 0} overdue invoices &bull; Sent {execResult.remindersSent || 0} WhatsApp reminders &bull; Created {execResult.tasksCreated || 0} follow-up tasks
            </div>
          </div>
        </div>
      )}

      {/* Active Rules Grid */}
      <div>
        <h2
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: "#0f172a",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <Sliders size={18} style={{ color: "#4f46e5" }} />
          <span>Active Automation Triggers</span>
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "14px"
          }}
        >
          {rules.map(rule => (
            <div
              key={rule.id}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                padding: "16px",
                borderRadius: "14px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "14px"
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                    gap: "8px"
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      backgroundColor: "#eef2ff",
                      color: "#4338ca",
                      border: "1px solid #c7d2fe",
                      borderRadius: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em"
                    }}
                  >
                    {rule.trigger}
                  </span>
                  <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={rule.isActive}
                      onChange={() => handleToggle(rule.id, rule.isActive)}
                      style={{ cursor: "pointer", width: "20px", height: "20px", accentColor: "#4f46e5" }}
                    />
                  </label>
                </div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", margin: "0 0 6px 0" }}>
                  {rule.name}
                </h3>
                <p style={{ fontSize: "0.8rem", color: "#64748b", lineHeight: 1.45, margin: 0 }}>
                  {rule.description}
                </p>
              </div>

              <div
                style={{
                  paddingTop: "10px",
                  borderTop: "1px solid #f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "6px",
                  fontSize: "0.74rem"
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#059669", fontWeight: 600 }}>
                  <ShieldCheck size={14} /> Auto-Enforced
                </span>
                <span
                  style={{
                    color: "#475569",
                    fontWeight: 500,
                    backgroundColor: "#f8fafc",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    border: "1px solid #e2e8f0"
                  }}
                >
                  Action: {rule.action}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Omnichannel Message History */}
      <div>
        <h2
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: "#0f172a",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <MessageSquare size={18} style={{ color: "#059669" }} />
          <span>Omnichannel Message History</span>
        </h2>

        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}
        >
          {logs.length === 0 ? (
            <div style={{ padding: "36px 16px", textAlign: "center", color: "#94a3b8", fontSize: "0.84rem" }}>
              No WhatsApp or SMS communication logs recorded yet. Click &quot;Run Workflows Now&quot; above to trigger rules!
            </div>
          ) : (
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", minWidth: "600px", borderCollapse: "collapse", textAlign: "left", fontSize: "0.82rem" }}>
                <thead>
                  <tr
                    style={{
                      backgroundColor: "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em"
                    }}
                  >
                    <th style={{ padding: "10px 14px" }}>Channel</th>
                    <th style={{ padding: "10px 14px" }}>Recipient</th>
                    <th style={{ padding: "10px 14px" }}>Message</th>
                    <th style={{ padding: "10px 14px" }}>Trigger</th>
                    <th style={{ padding: "10px 14px" }}>Status</th>
                    <th style={{ padding: "10px 14px" }}>Sent At</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr key={log.id} style={{ borderBottom: idx === logs.length - 1 ? "none" : "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            padding: "2px 6px",
                            backgroundColor: "#ecfdf5",
                            color: "#047857",
                            fontWeight: 700,
                            borderRadius: "4px",
                            fontSize: "0.72rem"
                          }}
                        >
                          {log.type}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: "#0f172a" }}>+{log.recipient}</td>
                      <td
                        style={{
                          padding: "10px 14px",
                          color: "#475569",
                          maxWidth: "220px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {log.message}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#64748b", fontSize: "0.76rem" }}>
                        {log.triggerEvent || "MANUAL"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            padding: "2px 6px",
                            backgroundColor: "#dcfce7",
                            color: "#15803d",
                            fontWeight: 600,
                            borderRadius: "4px",
                            fontSize: "0.72rem"
                          }}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#64748b", fontSize: "0.76rem" }}>
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
