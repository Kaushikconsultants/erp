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
  Check
} from "lucide-react";
import PhoneDialerModal from "@/components/ui/PhoneDialerModal";
import { getEmployeeCallAnalytics, getTelecallingQueue, deleteCall, updateCall } from "@/app/actions/callActions";
import LogCallModal from "@/components/ui/LogCallModal";

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

  // Phone Dialer State
  const [isDialerOpen, setIsDialerOpen] = useState<boolean>(false);
  const [dialerPhone, setDialerPhone] = useState<string>("");
  const [dialerName, setDialerName] = useState<string>("");
  const [dialerCustomerId, setDialerCustomerId] = useState<string | undefined>(undefined);
  const [dialerLeadId, setDialerLeadId] = useState<string | undefined>(undefined);

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
  }, []);

  const openDialerWithContact = (phone: string, name: string, customerId?: string, leadId?: string) => {
    setDialerPhone(phone || "");
    setDialerName(name || "");
    setDialerCustomerId(customerId);
    setDialerLeadId(leadId);
    setIsDialerOpen(true);
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
    <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto", paddingBottom: "80px" }}>
      
      {/* ─── ENTERPRISE TELECRM HEADER ─── */}
      <div style={{
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
        borderRadius: "24px",
        padding: "20px 22px",
        color: "#ffffff",
        marginBottom: "20px",
        boxShadow: "0 10px 30px rgba(49, 46, 129, 0.25)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Subtle decorative glow */}
        <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "160px", height: "160px", background: "radial-gradient(circle, rgba(129, 140, 248, 0.35) 0%, rgba(0,0,0,0) 70%)", borderRadius: "50%", pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "14px", backgroundColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Headphones size={22} color="#a5b4fc" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
                  TeleCRM Calling Hub
                </h1>
                <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "2px 7px", borderRadius: "12px", backgroundColor: "#10b981", color: "#ffffff", letterSpacing: "0.5px" }}>
                  ENTERPRISE
                </span>
              </div>
              <span style={{ fontSize: "0.76rem", color: "#c7d2fe" }}>
                Call tracking, duration analytics & employee metrics
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => openDialerWithContact("", "")}
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "12px",
                padding: "8px 14px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.35)"
              }}
            >
              <PhoneCall size={16} /> Open Dialer
            </button>
          </div>
        </div>

        {/* ─── LIVE KPI METRIC CHIPS ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
          <div style={{ backgroundColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(6px)", borderRadius: "14px", padding: "12px 14px", border: "1px solid rgba(255,255,255,0.12)" }}>
            <div style={{ fontSize: "0.72rem", color: "#c7d2fe", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>Total Calls</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#ffffff", display: "flex", alignItems: "baseline", gap: "6px" }}>
              {metrics.totalCalls}
              <span style={{ fontSize: "0.72rem", color: "#86efac", fontWeight: 600 }}>calls</span>
            </div>
          </div>

          <div style={{ backgroundColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(6px)", borderRadius: "14px", padding: "12px 14px", border: "1px solid rgba(255,255,255,0.12)" }}>
            <div style={{ fontSize: "0.72rem", color: "#c7d2fe", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>Connect Rate</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#ffffff", display: "flex", alignItems: "baseline", gap: "6px" }}>
              {metrics.connectRate}%
              <span style={{ fontSize: "0.72rem", color: "#93c5fd", fontWeight: 600 }}>({metrics.connectedCalls})</span>
            </div>
          </div>

          <div style={{ backgroundColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(6px)", borderRadius: "14px", padding: "12px 14px", border: "1px solid rgba(255,255,255,0.12)" }}>
            <div style={{ fontSize: "0.72rem", color: "#c7d2fe", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>Total Talk Time</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#ffffff", display: "flex", alignItems: "baseline", gap: "6px" }}>
              {formatTotalTime(metrics.totalDurationSec)}
            </div>
          </div>

          <div style={{ backgroundColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(6px)", borderRadius: "14px", padding: "12px 14px", border: "1px solid rgba(255,255,255,0.12)" }}>
            <div style={{ fontSize: "0.72rem", color: "#c7d2fe", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>Avg Duration</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#ffffff", display: "flex", alignItems: "baseline", gap: "6px" }}>
              {formatDuration(metrics.avgDurationSec)}
            </div>
          </div>
        </div>
      </div>

      {/* ─── SUB-NAVIGATION PILL TABS ─── */}
      <div style={{
        display: "flex",
        backgroundColor: "#ffffff",
        padding: "6px",
        borderRadius: "16px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        border: "1px solid #e2e8f0",
        marginBottom: "20px",
        gap: "6px",
        overflowX: "auto"
      }}>
        <button
          type="button"
          onClick={() => setActiveTab("ANALYTICS")}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "12px",
            border: "none",
            fontSize: "0.85rem",
            fontWeight: 800,
            cursor: "pointer",
            backgroundColor: activeTab === "ANALYTICS" ? "#4f46e5" : "transparent",
            color: activeTab === "ANALYTICS" ? "#ffffff" : "#475569",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            boxShadow: activeTab === "ANALYTICS" ? "0 4px 12px rgba(79, 70, 229, 0.3)" : "none",
            whiteSpace: "nowrap"
          }}
        >
          <BarChart3 size={16} /> Employee Analytics
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("QUEUE")}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "12px",
            border: "none",
            fontSize: "0.85rem",
            fontWeight: 800,
            cursor: "pointer",
            backgroundColor: activeTab === "QUEUE" ? "#4f46e5" : "transparent",
            color: activeTab === "QUEUE" ? "#ffffff" : "#475569",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            boxShadow: activeTab === "QUEUE" ? "0 4px 12px rgba(79, 70, 229, 0.3)" : "none",
            whiteSpace: "nowrap"
          }}
        >
          <Flame size={16} /> Calling Queue
          {queueData.overdue?.length > 0 && (
            <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: "10px", backgroundColor: "#ef4444", color: "#ffffff", fontWeight: 800 }}>
              {queueData.overdue.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("HISTORY")}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "12px",
            border: "none",
            fontSize: "0.85rem",
            fontWeight: 800,
            cursor: "pointer",
            backgroundColor: activeTab === "HISTORY" ? "#4f46e5" : "transparent",
            color: activeTab === "HISTORY" ? "#ffffff" : "#475569",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            boxShadow: activeTab === "HISTORY" ? "0 4px 12px rgba(79, 70, 229, 0.3)" : "none",
            whiteSpace: "nowrap"
          }}
        >
          <Clock size={16} /> Call History & Logs
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PLAYBOOK")}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "12px",
            border: "none",
            fontSize: "0.85rem",
            fontWeight: 800,
            cursor: "pointer",
            backgroundColor: activeTab === "PLAYBOOK" ? "#4f46e5" : "transparent",
            color: activeTab === "PLAYBOOK" ? "#ffffff" : "#475569",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            boxShadow: activeTab === "PLAYBOOK" ? "0 4px 12px rgba(79, 70, 229, 0.3)" : "none",
            whiteSpace: "nowrap"
          }}
        >
          <BookOpen size={16} /> Playbook & Scripts
        </button>
      </div>

      {/* ─── TAB 1: EMPLOYEE PERFORMANCE & ANALYTICS ─── */}
      {activeTab === "ANALYTICS" && (
        <div>
          {/* Timeframe Filter Bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", gap: "6px", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "10px" }}>
              {(["today", "yesterday", "this_week", "this_month", "all"] as const).map(tf => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    backgroundColor: timeframe === tf ? "#ffffff" : "transparent",
                    color: timeframe === tf ? "#4f46e5" : "#64748b",
                    boxShadow: timeframe === tf ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
                    textTransform: "capitalize"
                  }}
                >
                  {tf.replace("_", " ")}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => loadAnalytics(timeframe)}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 12px", fontSize: "0.78rem", fontWeight: 600, color: "#475569", cursor: "pointer" }}
            >
              <RefreshCw size={13} className={loadingAnalytics ? "animate-spin" : ""} /> Refresh Stats
            </button>
          </div>

          {/* Employee Leaderboard Cards Grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {analyticsData?.employeeStats?.map((emp: any, index: number) => (
              <div
                key={emp.id}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  padding: "16px 18px",
                  border: index === 0 && emp.totalCalls > 0 ? "2px solid #818cf8" : "1px solid #e2e8f0",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                  position: "relative"
                }}
              >
                {/* Top Performer Badge */}
                {index === 0 && emp.totalCalls > 0 && (
                  <div style={{ position: "absolute", right: "16px", top: "-10px", backgroundColor: "#4f46e5", color: "#ffffff", fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Award size={12} /> TOP PERFORMER
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1rem" }}>
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.96rem", fontWeight: 800, color: "#0f172a" }}>{emp.name}</div>
                      <div style={{ fontSize: "0.74rem", color: "#64748b" }}>{emp.role} • {emp.email}</div>
                    </div>
                  </div>

                  {/* Target Achievement */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#0f172a" }}>
                      {emp.totalCalls} <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>/ {emp.target} calls</span>
                    </div>
                    <span style={{ fontSize: "0.72rem", color: emp.targetPercent >= 100 ? "#16a34a" : "#4f46e5", fontWeight: 700 }}>
                      {emp.targetPercent}% target met
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ height: "6px", backgroundColor: "#f1f5f9", borderRadius: "3px", overflow: "hidden", marginBottom: "14px" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${emp.targetPercent}%`,
                      backgroundColor: emp.targetPercent >= 100 ? "#10b981" : "#4f46e5",
                      borderRadius: "3px",
                      transition: "width 0.3s ease"
                    }}
                  />
                </div>

                {/* Metrics 4-Box Row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", backgroundColor: "#f8fafc", padding: "10px", borderRadius: "10px" }}>
                  <div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Connected</div>
                    <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#0f172a" }}>{emp.connectedCalls}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Connect %</div>
                    <div style={{ fontSize: "0.92rem", fontWeight: 800, color: emp.connectRate >= 40 ? "#16a34a" : "#d97706" }}>{emp.connectRate}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Talk Time</div>
                    <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#0f172a" }}>{formatTotalTime(emp.totalDurationSec)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Avg Call</div>
                    <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#0f172a" }}>{formatDuration(emp.avgDurationSec)}</div>
                  </div>
                </div>
              </div>
            ))}

            {(!analyticsData?.employeeStats || analyticsData.employeeStats.length === 0) && (
              <div style={{ textAlign: "center", padding: "36px", backgroundColor: "#ffffff", borderRadius: "16px", color: "#64748b" }}>
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
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#991b1b" }}>
                  Overdue Follow-ups ({queueData.overdue.length})
                </h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {queueData.overdue.map((c: any) => {
                  const name = c.customer?.businessName || c.lead?.shopName || c.lead?.name || "Customer";
                  const phone = c.customer?.mobile || c.customer?.whatsappNumber || c.lead?.whatsappNumber || "";
                  return (
                    <div key={c.id} style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#991b1b" }}>{name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#7f1d1d" }}>
                          Due: {new Date(c.followUpDate).toLocaleDateString()} • Outcome: {c.outcome}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {phone && (
                          <button
                            type="button"
                            onClick={() => openWhatsApp(phone)}
                            style={{ padding: "6px", borderRadius: "8px", backgroundColor: "#25d366", color: "#ffffff", border: "none", cursor: "pointer" }}
                            title="WhatsApp"
                          >
                            <MessageSquare size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openDialerWithContact(phone, name, c.customerId, c.leadId)}
                          style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: "#dc2626", color: "#ffffff", border: "none", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
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
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                Today's Scheduled Calls ({queueData.todayDue?.length || 0})
              </h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {queueData.todayDue?.map((c: any) => {
                const name = c.customer?.businessName || c.lead?.shopName || c.lead?.name || "Customer";
                const phone = c.customer?.mobile || c.customer?.whatsappNumber || c.lead?.whatsappNumber || "";
                return (
                  <div key={c.id} style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a" }}>{name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        Time: {new Date(c.followUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Prev: {c.outcome}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {phone && (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(phone)}
                          style={{ padding: "6px", borderRadius: "8px", backgroundColor: "#25d366", color: "#ffffff", border: "none", cursor: "pointer" }}
                        >
                          <MessageSquare size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openDialerWithContact(phone, name, c.customerId, c.leadId)}
                        style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: "#4f46e5", color: "#ffffff", border: "none", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        <PhoneCall size={14} /> Call Now
                      </button>
                    </div>
                  </div>
                );
              })}
              {(!queueData.todayDue || queueData.todayDue.length === 0) && (
                <div style={{ textAlign: "center", padding: "24px", backgroundColor: "#ffffff", borderRadius: "12px", color: "#64748b", fontSize: "0.85rem" }}>
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
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                  Fresh Uncontacted Leads ({queueData.freshLeads.length})
                </h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {queueData.freshLeads.map((l: any) => (
                  <div key={l.id} style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a" }}>{l.shopName || l.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Contact: {l.name} • {l.whatsappNumber}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openDialerWithContact(l.whatsappNumber, l.name, undefined, l.id)}
                      style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: "#059669", color: "#ffffff", border: "none", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
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
              style={{ padding: "9px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.82rem", backgroundColor: "#ffffff", fontWeight: 600 }}
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
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>{customerName}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        {new Date(call.createdAt).toLocaleDateString("en-GB")} at {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Rep: {repName}
                      </div>
                    </div>

                    {/* Duration Badge & Call Type */}
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
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
                        fontWeight: 700,
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
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "8px 0" }}>
                    <span style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      backgroundColor: "#e0e7ff",
                      color: "#3730a3"
                    }}>
                      {call.outcome}
                    </span>
                    {call.followUpDate && (
                      <span style={{ fontSize: "0.72rem", color: isOverdue ? "#dc2626" : "#16a34a", fontWeight: 700, display: "flex", alignItems: "center", gap: "3px" }}>
                        <Calendar size={12} /> Follow-up: {new Date(call.followUpDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {call.notes && (
                    <p style={{ margin: "6px 0 10px 0", fontSize: "0.8rem", color: "#475569", lineHeight: 1.4, backgroundColor: "#f8fafc", padding: "8px 10px", borderRadius: "8px" }}>
                      {call.notes}
                    </p>
                  )}

                  {/* Card Actions */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {phone && (
                        <button
                          type="button"
                          onClick={() => openDialerWithContact(phone, customerName, call.customerId, call.leadId)}
                          style={{ padding: "5px 10px", borderRadius: "6px", backgroundColor: "#eef2ff", color: "#4f46e5", border: "1px solid #c7d2fe", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <PhoneCall size={12} /> Re-dial
                        </button>
                      )}
                      {phone && (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(phone)}
                          style={{ padding: "5px 10px", borderRadius: "6px", backgroundColor: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
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
              <div style={{ textAlign: "center", padding: "36px", backgroundColor: "#ffffff", borderRadius: "14px", color: "#64748b" }}>
                No call records matched your search.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: PLAYBOOK & SCRIPTS ─── */}
      {activeTab === "PLAYBOOK" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ padding: "14px", backgroundColor: "#eef2ff", borderRadius: "14px", border: "1px solid #c7d2fe" }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#3730a3", marginBottom: "4px" }}>
              🎯 Tele-calling Golden Rules
            </div>
            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.8rem", color: "#4338ca", lineHeight: 1.5 }}>
              <li>Introduce yourself clearly with company name in the first 5 seconds.</li>
              <li>Ask open-ended questions about their current inventory & stock demand.</li>
              <li>Always schedule a specific follow-up date and time before disconnecting.</li>
              <li>Send WhatsApp catalog or quotation immediately after ending the call.</li>
            </ul>
          </div>

          <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", padding: "16px", border: "1px solid #e2e8f0" }}>
            <h4 style={{ margin: "0 0 10px 0", fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
              Handling Common Objections
            </h4>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#dc2626", marginBottom: "4px" }}>
                  "Price is too high / Other vendors are cheaper"
                </div>
                <div style={{ fontSize: "0.78rem", color: "#334155" }}>
                  → "I completely understand price is vital. However, our items come with zero-defect warranty, GST input credit, and 24-hr dispatch. A small test order will show you the higher retail profit margins."
                </div>
              </div>

              <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#dc2626", marginBottom: "4px" }}>
                  "I already have a regular supplier"
                </div>
                <div style={{ fontSize: "0.78rem", color: "#334155" }}>
                  → "That's great! We don't ask you to leave them. Keep us as a backup supplier for festive high-demand items where stock runs out."
                </div>
              </div>

              <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#dc2626", marginBottom: "4px" }}>
                  "Send details on WhatsApp, I will check later"
                </div>
                <div style={{ fontSize: "0.78rem", color: "#334155" }}>
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
            <h3 style={{ margin: "0 0 14px 0", fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>Edit Call Record</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>Outcome</label>
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
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>Duration (Seconds)</label>
                <input
                  type="number"
                  value={editDurationSec}
                  onChange={(e) => setEditDurationSec(parseInt(e.target.value, 10) || 0)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>Discussion Notes</label>
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
                style={{ padding: "8px 18px", borderRadius: "8px", border: "none", backgroundColor: "#4f46e5", color: "#ffffff", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Phone Dialer Modal */}
      <PhoneDialerModal
        isOpen={isDialerOpen}
        onClose={() => {
          setIsDialerOpen(false);
          loadAnalytics(timeframe);
        }}
        initialPhone={dialerPhone}
        initialName={dialerName}
        initialCustomerId={dialerCustomerId}
        initialLeadId={dialerLeadId}
      />

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
