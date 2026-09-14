"use client";

import React, { useState, useEffect } from "react";
import {
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  User,
  Search,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Award,
  Users,
  Sparkles,
  Zap,
  Filter,
  ArrowUpRight,
  ChevronRight,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Headphones,
  Flame,
  Check,
  FileText
} from "lucide-react";
import { openPhoneDialer } from "@/lib/dialer";
import { getEmployeeCallAnalytics, getTelecallingQueue, deleteCall, updateCall } from "@/app/actions/callActions";
import LogCallModal from "@/components/ui/LogCallModal";
import "./telecrm.css";

interface TeleCrmMobileHubProps {
  initialCalls: any[];
  availableOutcomes?: string[];
  availableCallTypes?: string[];
  customers: any[];
  isAdmin?: boolean;
}

export default function TeleCrmMobileHub({
  initialCalls,
  availableOutcomes = [
    "Interested / Follow-up Needed",
    "Order Placed / Deal Closed",
    "Quotation Requested",
    "Price Negotiation / Discount Discussion",
    "No Answer / Busy",
    "Voicemail / Switched Off",
    "Callback Scheduled",
    "Not Interested / Lost",
    "Wrong / Invalid Number",
    "Support / General Inquiry"
  ],
  availableCallTypes = ["OUTBOUND", "INBOUND"],
  customers,
  isAdmin = false
}: TeleCrmMobileHubProps) {
  const [activeTab, setActiveTab] = useState<"ANALYTICS" | "QUEUE" | "HISTORY" | "PLAYBOOK">("ANALYTICS");
  const [timeframe, setTimeframe] = useState<"today" | "yesterday" | "this_week" | "this_month" | "all">("today");
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [queueData, setQueueData] = useState<any>({ overdue: [], todayDue: [], freshLeads: [] });
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(true);
  const [loadingQueue, setLoadingQueue] = useState<boolean>(false);

  // Manual Log Call Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);

  // Search & Filter in History
  const [historySearch, setHistorySearch] = useState<string>("");
  const [selectedOutcomeFilter, setSelectedOutcomeFilter] = useState<string>("ALL");

  // Edit Call State
  const [editingCall, setEditingCall] = useState<any | null>(null);
  const [editOutcome, setEditOutcome] = useState("");
  const [editCallType, setEditCallType] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDurationSec, setEditDurationSec] = useState<number>(0);
  const [savingEdit, setSavingEdit] = useState(false);

  // Fetch Analytics
  const loadAnalytics = async (tf: typeof timeframe) => {
    setLoadingAnalytics(true);
    const res = await getEmployeeCallAnalytics({ timeframe: tf });
    if (res.success) {
      setAnalyticsData(res);
    }
    setLoadingAnalytics(false);
  };

  // Fetch Queue
  const loadQueue = async () => {
    setLoadingQueue(true);
    const res = await getTelecallingQueue();
    if (res.success) {
      setQueueData(res);
    }
    setLoadingQueue(false);
  };

  useEffect(() => {
    loadAnalytics(timeframe);
  }, [timeframe]);

  useEffect(() => {
    loadQueue();

    const handleRefresh = () => {
      loadAnalytics(timeframe);
      loadQueue();
    };

    window.addEventListener("native-call-state", handleRefresh);
    window.addEventListener("dialer-closed", handleRefresh);
    return () => {
      window.removeEventListener("native-call-state", handleRefresh);
      window.removeEventListener("dialer-closed", handleRefresh);
    };
  }, [timeframe]);

  const openDialerWithContact = (
    phone: string,
    name: string,
    customerId?: string,
    leadId?: string,
    tab: "DIALPAD" | "CALL_LOGS" | "CONTACTS" | "POST_CALL" | "WHATSAPP" | "SCRIPTS" = "DIALPAD"
  ) => {
    openPhoneDialer({ phone, name, customerId, leadId, tab });
  };

  const openWhatsApp = (phone: string, text?: string) => {
    const cleanNum = (phone || "").replace(/\D/g, "");
    if (!cleanNum) return;
    const formatted = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;
    const url = text ? `https://wa.me/${formatted}?text=${encodeURIComponent(text)}` : `https://wa.me/${formatted}`;
    window.open(url, "_blank");
  };

  const formatDuration = (sec: number | null | undefined) => {
    if (!sec) return "0s";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const formatTotalTime = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const handleEditCall = (call: any) => {
    setEditingCall(call);
    setEditOutcome(call.outcome || availableOutcomes[0] || "Interested / Follow-up Needed");
    setEditCallType(call.callType || "OUTBOUND");
    setEditNotes(call.notes || "");
    setEditDurationSec(call.durationSec || 0);
  };

  const handleSaveEdit = async () => {
    if (!editingCall) return;
    setSavingEdit(true);
    await updateCall(editingCall.id, {
      outcome: editOutcome,
      callType: editCallType,
      notes: editNotes,
      durationSec: editDurationSec
    });
    setSavingEdit(false);
    setEditingCall(null);
    loadAnalytics(timeframe);
  };

  const handleDeleteCall = async (callId: string, name: string) => {
    if (confirm(`Delete call record for ${name}?`)) {
      await deleteCall(callId);
      loadAnalytics(timeframe);
    }
  };

  // Filter calls
  const filteredCalls = (initialCalls || []).filter(c => {
    const q = historySearch.toLowerCase();
    const customerName = (c.customer?.businessName || c.lead?.shopName || c.lead?.name || c.customer?.contactPerson || "").toLowerCase();
    const phone = (c.customer?.mobile || c.customer?.whatsappNumber || c.lead?.whatsappNumber || "").toLowerCase();
    const repName = (c.employee?.user?.name || "").toLowerCase();
    const notes = (c.notes || "").toLowerCase();

    const matchesQuery = !q || customerName.includes(q) || phone.includes(q) || repName.includes(q) || notes.includes(q);
    const matchesOutcome = selectedOutcomeFilter === "ALL" || (c.outcome || "").toLowerCase() === selectedOutcomeFilter.toLowerCase();
    return matchesQuery && matchesOutcome;
  });

  const metrics = analyticsData?.metrics || {
    totalCalls: initialCalls.length,
    connectedCalls: initialCalls.filter(c => !["No Answer", "Busy", "Voicemail", "Missed"].includes(c.outcome)).length,
    connectRate: initialCalls.length > 0 ? Math.round((initialCalls.filter(c => !["No Answer", "Busy", "Voicemail", "Missed"].includes(c.outcome)).length / initialCalls.length) * 100) : 0,
    totalDurationSec: initialCalls.reduce((sum, c) => sum + (c.durationSec || 0), 0),
    avgDurationSec: initialCalls.length > 0 ? Math.round(initialCalls.reduce((sum, c) => sum + (c.durationSec || 0), 0) / initialCalls.length) : 0
  };

  return (
    <div className="telecrm-container">
      
      {/* ─── THEME-MATCHED HERO BANNER & HEADER CARD ─── */}
      <div className="telecrm-hero-card">
        <div className="telecrm-hero-header">
          <div className="telecrm-hero-left">
            <div className="telecrm-icon-badge">
              <Headphones size={24} />
            </div>
            <div className="telecrm-title-group">
              <div className="telecrm-title-row">
                <h1 className="telecrm-title">
                  TeleCRM Calling Hub
                </h1>
                <span className="telecrm-enterprise-badge">
                  Enterprise
                </span>
              </div>
              <p className="telecrm-subtitle">
                Real-time call tracking, duration analytics & employee sales performance metrics
              </p>
            </div>
          </div>

          <div className="telecrm-hero-actions">
            <button
              type="button"
              className="btn-telecrm-secondary"
              onClick={() => setIsLogModalOpen(true)}
              title="Manually log a past call"
            >
              <FileText size={16} /> Log Call
            </button>

            <button
              type="button"
              className="btn-telecrm-primary"
              onClick={() => openDialerWithContact("", "")}
              title="Open Smart Phone Dialer"
            >
              <PhoneCall size={16} /> Open Dialer
            </button>
          </div>
        </div>

        {/* ─── LIVE KPI METRIC CARDS ─── */}
        <div className="telecrm-kpi-grid">
          {/* Total Calls */}
          <div className="telecrm-kpi-card">
            <div className="telecrm-kpi-top">
              <span className="telecrm-kpi-label">Total Calls</span>
              <div className="telecrm-kpi-icon-wrap indigo">
                <PhoneCall size={16} />
              </div>
            </div>
            <div className="telecrm-kpi-val">
              {metrics.totalCalls}
              <span className="telecrm-kpi-meta">calls</span>
            </div>
          </div>

          {/* Connect Rate */}
          <div className="telecrm-kpi-card">
            <div className="telecrm-kpi-top">
              <span className="telecrm-kpi-label">Connect Rate</span>
              <div className="telecrm-kpi-icon-wrap emerald">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="telecrm-kpi-val">
              {metrics.connectRate}%
              <span className="telecrm-kpi-meta">({metrics.connectedCalls} connected)</span>
            </div>
          </div>

          {/* Total Talk Time */}
          <div className="telecrm-kpi-card">
            <div className="telecrm-kpi-top">
              <span className="telecrm-kpi-label">Total Talk Time</span>
              <div className="telecrm-kpi-icon-wrap sky">
                <Clock size={16} />
              </div>
            </div>
            <div className="telecrm-kpi-val">
              {formatTotalTime(metrics.totalDurationSec)}
            </div>
          </div>

          {/* Avg Duration */}
          <div className="telecrm-kpi-card">
            <div className="telecrm-kpi-top">
              <span className="telecrm-kpi-label">Avg Duration</span>
              <div className="telecrm-kpi-icon-wrap violet">
                <Zap size={16} />
              </div>
            </div>
            <div className="telecrm-kpi-val">
              {formatDuration(metrics.avgDurationSec)}
            </div>
          </div>
        </div>
      </div>

      {/* ─── SUB-NAVIGATION SEGMENTED TAB BAR ─── */}
      <div className="telecrm-tabs-bar">
        <button
          type="button"
          className={`telecrm-tab-item ${activeTab === "ANALYTICS" ? "active" : ""}`}
          onClick={() => setActiveTab("ANALYTICS")}
        >
          <BarChart3 size={16} /> Employee Analytics
        </button>

        <button
          type="button"
          className={`telecrm-tab-item ${activeTab === "QUEUE" ? "active" : ""}`}
          onClick={() => setActiveTab("QUEUE")}
        >
          <Flame size={16} /> Calling Queue
          {queueData.overdue?.length > 0 && (
            <span className="tab-count-badge">
              {queueData.overdue.length}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`telecrm-tab-item ${activeTab === "HISTORY" ? "active" : ""}`}
          onClick={() => setActiveTab("HISTORY")}
        >
          <Clock size={16} /> Call History & Logs
        </button>

        <button
          type="button"
          className={`telecrm-tab-item ${activeTab === "PLAYBOOK" ? "active" : ""}`}
          onClick={() => setActiveTab("PLAYBOOK")}
        >
          <BookOpen size={16} /> Playbook & Scripts
        </button>
      </div>

      {/* ─── TAB 1: EMPLOYEE PERFORMANCE & ANALYTICS ─── */}
      {activeTab === "ANALYTICS" && (
        <div>
          {/* Timeframe Filter Bar */}
          <div className="telecrm-filter-row">
            <div className="telecrm-timeframe-pills">
              {(["today", "yesterday", "this_week", "this_month", "all"] as const).map(tf => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`telecrm-timeframe-btn ${timeframe === tf ? "active" : ""}`}
                >
                  {tf.replace("_", " ")}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => loadAnalytics(timeframe)}
              className="btn-refresh-telecrm"
            >
              <RefreshCw size={13} className={loadingAnalytics ? "animate-spin" : ""} />
              <span>Refresh Stats</span>
            </button>
          </div>

          {/* Employee Leaderboard Cards */}
          <div className="telecrm-employee-grid">
            {analyticsData?.employeeStats?.map((emp: any, index: number) => {
              const isTop = index === 0 && emp.totalCalls > 0;
              return (
                <div
                  key={emp.id}
                  className={`telecrm-emp-card ${isTop ? "top-performer" : ""}`}
                >
                  {/* Top Performer Badge */}
                  {isTop && (
                    <div className="top-performer-tag">
                      <Award size={12} /> TOP PERFORMER
                    </div>
                  )}

                  <div className="telecrm-emp-header">
                    <div className="telecrm-emp-info">
                      <div className="telecrm-emp-avatar">
                        {emp.name ? emp.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <h3 className="telecrm-emp-name">{emp.name}</h3>
                        <p className="telecrm-emp-meta">{emp.role} • {emp.email}</p>
                      </div>
                    </div>

                    {/* Target Achievement */}
                    <div className="telecrm-emp-target-box">
                      <div className="telecrm-emp-target-val">
                        {emp.totalCalls}{" "}
                        <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>
                          / {emp.target} calls
                        </span>
                      </div>
                      <span
                        className="telecrm-emp-target-sub"
                        style={{ color: emp.targetPercent >= 100 ? "#16a34a" : "#4f46e5" }}
                      >
                        {emp.targetPercent}% target met
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="telecrm-progress-track">
                    <div
                      className="telecrm-progress-fill"
                      style={{
                        width: `${Math.min(100, emp.targetPercent)}%`,
                        backgroundColor: emp.targetPercent >= 100 ? "#10b981" : "#4f46e5"
                      }}
                    />
                  </div>

                  {/* Metrics 4-Box Row */}
                  <div className="telecrm-emp-metrics-row">
                    <div>
                      <div className="emp-metric-cell-label">Connected</div>
                      <div className="emp-metric-cell-val">{emp.connectedCalls}</div>
                    </div>
                    <div>
                      <div className="emp-metric-cell-label">Connect %</div>
                      <div
                        className="emp-metric-cell-val"
                        style={{ color: emp.connectRate >= 40 ? "#16a34a" : "#d97706" }}
                      >
                        {emp.connectRate}%
                      </div>
                    </div>
                    <div>
                      <div className="emp-metric-cell-label">Talk Time</div>
                      <div className="emp-metric-cell-val">{formatTotalTime(emp.totalDurationSec)}</div>
                    </div>
                    <div>
                      <div className="emp-metric-cell-label">Avg Call</div>
                      <div className="emp-metric-cell-val">{formatDuration(emp.avgDurationSec)}</div>
                    </div>
                  </div>
                </div>
              );
            })}

            {(!analyticsData?.employeeStats || analyticsData.employeeStats.length === 0) && (
              <div style={{ textAlign: "center", padding: "36px", backgroundColor: "#ffffff", borderRadius: "16px", color: "#64748b", border: "1px solid #e2e8f0" }}>
                No employee call metrics recorded for this timeframe.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: CALLING QUEUE & SPEED DIAL ─── */}
      {activeTab === "QUEUE" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          
          {/* Overdue Follow-ups */}
          {queueData.overdue?.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                <AlertCircle size={18} color="#dc2626" />
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#991b1b" }}>
                  Overdue Follow-ups ({queueData.overdue.length})
                </h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {queueData.overdue.map((c: any) => {
                  const name = c.customer?.businessName || c.lead?.shopName || c.lead?.name || "Customer";
                  const phone = c.customer?.mobile || c.customer?.whatsappNumber || c.lead?.whatsappNumber || "";
                  return (
                    <div
                      key={c.id}
                      style={{
                        backgroundColor: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: "12px",
                        padding: "12px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                        flexWrap: "wrap"
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#991b1b" }}>{name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#7f1d1d", marginTop: "2px" }}>
                          Due: {new Date(c.followUpDate).toLocaleDateString()} • Outcome: {c.outcome}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {phone && (
                          <button
                            type="button"
                            onClick={() => openWhatsApp(phone)}
                            style={{ padding: "6px 10px", borderRadius: "8px", backgroundColor: "#25d366", color: "#ffffff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", fontWeight: 600 }}
                            title="WhatsApp"
                          >
                            <MessageSquare size={14} /> WhatsApp
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openDialerWithContact(phone, name, c.customerId, c.leadId)}
                          style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: "#dc2626", color: "#ffffff", border: "none", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <PhoneCall size={14} /> Call Now
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Today's Scheduled Calls */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
              <Calendar size={18} color="#4f46e5" />
              <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                Today's Scheduled Calls ({queueData.todayDue?.length || 0})
              </h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {queueData.todayDue?.map((c: any) => {
                const name = c.customer?.businessName || c.lead?.shopName || c.lead?.name || "Customer";
                const phone = c.customer?.mobile || c.customer?.whatsappNumber || c.lead?.whatsappNumber || "";
                return (
                  <div
                    key={c.id}
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      flexWrap: "wrap",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>{name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                        Time: {new Date(c.followUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Prev: {c.outcome}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {phone && (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(phone)}
                          style={{ padding: "6px 10px", borderRadius: "8px", backgroundColor: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", fontWeight: 600 }}
                        >
                          <MessageSquare size={14} /> WhatsApp
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openDialerWithContact(phone, name, c.customerId, c.leadId)}
                        style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: "#4f46e5", color: "#ffffff", border: "none", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        <PhoneCall size={14} /> Call Now
                      </button>
                    </div>
                  </div>
                );
              })}
              {(!queueData.todayDue || queueData.todayDue.length === 0) && (
                <div style={{ textAlign: "center", padding: "24px", backgroundColor: "#ffffff", borderRadius: "12px", color: "#64748b", fontSize: "0.85rem", border: "1px solid #e2e8f0" }}>
                  No scheduled callbacks due for today.
                </div>
              )}
            </div>
          </div>

          {/* Fresh Leads Queue */}
          {queueData.freshLeads?.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                <Sparkles size={18} color="#059669" />
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                  Fresh Uncontacted Leads ({queueData.freshLeads.length})
                </h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {queueData.freshLeads.map((l: any) => (
                  <div
                    key={l.id}
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      flexWrap: "wrap",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>{l.shopName || l.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>Contact: {l.name} • {l.whatsappNumber}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openDialerWithContact(l.whatsappNumber, l.name, undefined, l.id)}
                      style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: "#059669", color: "#ffffff", border: "none", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      <Phone size={14} /> Start Call
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ─── TAB 3: CALL HISTORY & LOGS ─── */}
      {activeTab === "HISTORY" && (
        <div>
          {/* Search & Filter Controls */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "220px", position: "relative" }}>
              <Search size={16} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search contact, rep, notes..."
                style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none", backgroundColor: "#ffffff" }}
              />
            </div>

            <select
              value={selectedOutcomeFilter}
              onChange={(e) => setSelectedOutcomeFilter(e.target.value)}
              style={{ padding: "9px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.82rem", backgroundColor: "#ffffff", fontWeight: 500, color: "#334155" }}
            >
              <option value="ALL">All Outcomes</option>
              {availableOutcomes.map(oc => (
                <option key={oc} value={oc}>{oc}</option>
              ))}
            </select>
          </div>

          {/* Call Log Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredCalls.map((call: any) => {
              const customerName = call.customer?.businessName || call.lead?.shopName || call.lead?.name || call.customer?.contactPerson || "Customer";
              const phone = call.customer?.mobile || call.customer?.whatsappNumber || call.lead?.whatsappNumber || "";
              const repName = call.employee?.user?.name || "Agent";
              const isOverdue = call.followUpDate && new Date(call.followUpDate) < new Date();

              return (
                <div
                  key={call.id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>{customerName}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                        {new Date(call.createdAt).toLocaleDateString("en-GB")} at {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Rep: {repName}
                      </div>
                    </div>

                    {/* Duration Badge & Call Type */}
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        backgroundColor: (call.durationSec || 0) > 0 ? "#ecfdf5" : "#f1f5f9",
                        color: (call.durationSec || 0) > 0 ? "#059669" : "#64748b",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}>
                        <Clock size={12} /> {formatDuration(call.durationSec)}
                      </span>
                      <span style={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        padding: "3px 6px",
                        borderRadius: "6px",
                        backgroundColor: call.callType === "INBOUND" ? "#e0e7ff" : "#f1f5f9",
                        color: call.callType === "INBOUND" ? "#4338ca" : "#475569"
                      }}>
                        {call.callType || "OUTBOUND"}
                      </span>
                    </div>
                  </div>

                  {/* Outcome Tag & Discussion */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "8px 0", flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      backgroundColor: "#eef2ff",
                      color: "#4338ca",
                      border: "1px solid #e0e7ff"
                    }}>
                      {call.outcome}
                    </span>
                    {call.followUpDate && (
                      <span style={{ fontSize: "0.72rem", color: isOverdue ? "#dc2626" : "#16a34a", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}>
                        <Calendar size={12} /> Follow-up: {new Date(call.followUpDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* AI Summary Highlight */}
                  {call.summary && (
                    <div
                      style={{
                        margin: "6px 0 8px 0",
                        fontSize: "0.8rem",
                        color: "#1e293b",
                        lineHeight: 1.45,
                        backgroundColor: call.summary.includes("🔥") ? "#fff5f5" : call.summary.includes("❄️") ? "#f0f9ff" : "#f8fafc",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        border: `1px solid ${call.summary.includes("🔥") ? "#fecaca" : call.summary.includes("❄️") ? "#bae6fd" : "#e2e8f0"}`,
                        fontWeight: 500
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", fontWeight: 700, color: "#6366f1", marginBottom: "2px" }}>
                        <Sparkles size={12} /> AI Deal Summary
                      </div>
                      {call.summary}
                    </div>
                  )}

                  {call.notes && !call.summary && (
                    <p style={{ margin: "6px 0 10px 0", fontSize: "0.8rem", color: "#475569", lineHeight: 1.4, backgroundColor: "#f8fafc", padding: "8px 10px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                      {call.notes}
                    </p>
                  )}

                  {/* Card Actions */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {phone && (
                        <button
                          type="button"
                          onClick={() => openDialerWithContact(phone, customerName, call.customerId, call.leadId)}
                          style={{ padding: "5px 10px", borderRadius: "6px", backgroundColor: "#eef2ff", color: "#4f46e5", border: "1px solid #c7d2fe", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <PhoneCall size={12} /> Re-dial
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openDialerWithContact(phone, customerName, call.customerId, call.leadId, "POST_CALL")}
                        style={{ padding: "5px 10px", borderRadius: "6px", backgroundColor: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                        title="Record AI Voice Debrief for this call"
                      >
                        <Sparkles size={12} /> AI Debrief
                      </button>
                      {phone && (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(phone)}
                          style={{ padding: "5px 10px", borderRadius: "6px", backgroundColor: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <MessageSquare size={12} /> WhatsApp
                        </button>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => handleEditCall(call)}
                        style={{ padding: "5px 8px", borderRadius: "6px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", fontSize: "0.75rem", cursor: "pointer" }}
                        title="Edit Record"
                      >
                        <Pencil size={13} />
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCall(call.id, customerName)}
                          style={{ padding: "5px 8px", borderRadius: "6px", backgroundColor: "#fef2f2", color: "#dc2626", border: "none", fontSize: "0.75rem", cursor: "pointer" }}
                          title="Delete Record"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredCalls.length === 0 && (
              <div style={{ textAlign: "center", padding: "36px", backgroundColor: "#ffffff", borderRadius: "14px", color: "#64748b", border: "1px solid #e2e8f0" }}>
                No call records matched your search.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: PLAYBOOK & SCRIPTS ─── */}
      {activeTab === "PLAYBOOK" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ padding: "16px", backgroundColor: "#eef2ff", borderRadius: "14px", border: "1px solid #c7d2fe" }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#3730a3", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
              🎯 Telecalling Best Practices
            </div>
            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.8rem", color: "#4338ca", lineHeight: 1.6 }}>
              <li>Introduce yourself clearly with company name within the first 5 seconds.</li>
              <li>Ask open-ended questions about their current inventory & retail demand.</li>
              <li>Always lock in a specific follow-up date and time before disconnecting.</li>
              <li>Send WhatsApp catalog or quotation immediately after ending the call.</li>
            </ul>
          </div>

          <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", padding: "18px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
              Handling Common Objections
            </h4>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#dc2626", marginBottom: "4px" }}>
                  "Price is too high / Other vendors are cheaper"
                </div>
                <div style={{ fontSize: "0.78rem", color: "#334155", lineHeight: 1.4 }}>
                  → "I completely understand price is vital. However, our items come with zero-defect warranty, GST input credit, and 24-hr dispatch. A small test order will show you the higher retail profit margins."
                </div>
              </div>

              <div style={{ padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#dc2626", marginBottom: "4px" }}>
                  "I already have a regular supplier"
                </div>
                <div style={{ fontSize: "0.78rem", color: "#334155", lineHeight: 1.4 }}>
                  → "That's great! We don't ask you to leave them. Keep us as a backup supplier for festive high-demand items where stock runs out."
                </div>
              </div>

              <div style={{ padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#dc2626", marginBottom: "4px" }}>
                  "Send details on WhatsApp, I will check later"
                </div>
                <div style={{ fontSize: "0.78rem", color: "#334155", lineHeight: 1.4 }}>
                  → "Absolutely, I am sending the catalog on WhatsApp right now. Which category should I highlight for you: Wholesale or Premium Retail?"
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT CALL MODAL ─── */}
      {editingCall && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "16px" }}>
          <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", maxWidth: "480px", width: "100%", padding: "20px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 14px 0", fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>Edit Call Record</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>Outcome</label>
                <select
                  value={editOutcome}
                  onChange={(e) => setEditOutcome(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                >
                  {availableOutcomes.map(oc => (
                    <option key={oc} value={oc}>{oc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>Duration (Seconds)</label>
                <input
                  type="number"
                  value={editDurationSec}
                  onChange={(e) => setEditDurationSec(parseInt(e.target.value, 10) || 0)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>Discussion Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setEditingCall(null)}
                style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#f8fafc", color: "#475569", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                style={{ padding: "8px 18px", borderRadius: "8px", border: "none", backgroundColor: "#4f46e5", color: "#ffffff", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Log Call Modal */}
      {isLogModalOpen && (
        <LogCallModal
          onClose={() => {
            setIsLogModalOpen(false);
            loadAnalytics(timeframe);
          }}
          customers={customers}
          isAdmin={isAdmin}
          onCallLogged={() => loadAnalytics(timeframe)}
        />
      )}

    </div>
  );
}
