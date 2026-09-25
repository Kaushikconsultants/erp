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
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  PieChart,
  ArrowRight,
  Volume2,
  VolumeX,
  Copy,
  CheckCircle2
} from "lucide-react";
import { WhatsAppLogo } from "@/components/ui/PhoneDialerModal";
import { openPhoneDialer } from "@/lib/dialer";
import { getEmployeeCallAnalytics, getTelecallingQueue, deleteCall, deleteCallRecording, updateCall, syncDeviceCallLogs } from "@/app/actions/callActions";
import { isAndroidNativeApp, hasCallLogPermission, requestCallLogPermission, getDeviceCallLogs } from "@/lib/capacitor";
import LogCallModal from "@/components/ui/LogCallModal";
import { formatTranscriptWithNames } from "@/lib/transcriptUtils";
import CallTranscriptViewer from "./CallTranscriptViewer";
import "./telecrm.css";

const WhatsAppIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

interface TeleCrmMobileHubProps {
  initialCalls: any[];
  availableOutcomes?: string[];
  availableCallTypes?: string[];
  customers: any[];
  isAdmin?: boolean;
  currentEmployeeId?: string | null;
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
  isAdmin = false,
  currentEmployeeId = null
}: TeleCrmMobileHubProps) {
  const [activeTab, setActiveTab] = useState<"ANALYTICS" | "QUEUE" | "HISTORY" | "PLAYBOOK">("ANALYTICS");
  const [timeframe, setTimeframe] = useState<"today" | "yesterday" | "this_week" | "this_month" | "all">("today");
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [queueData, setQueueData] = useState<any>({ overdue: [], todayDue: [], freshLeads: [] });
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(true);
  const [loadingQueue, setLoadingQueue] = useState<boolean>(false);

  // Manual Log Call Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [isSyncingDeviceCalls, setIsSyncingDeviceCalls] = useState<boolean>(false);

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

  // Clickable Section States & Drill-downs
  const [selectedKpiModal, setSelectedKpiModal] = useState<"TOTAL_CALLS" | "CONNECT_RATE" | "TALK_TIME" | "AVG_DURATION" | null>(null);
  const [kpiSearch, setKpiSearch] = useState<string>("");
  const [kpiOutcomeFilter, setKpiOutcomeFilter] = useState<string>("ALL");
  const [kpiEmployeeFilter, setKpiEmployeeFilter] = useState<string>("ALL");

  // Expandable Employee Section State
  const [expandedEmpId, setExpandedEmpId] = useState<string | null>(null);
  const [empOutcomeFilter, setEmpOutcomeFilter] = useState<string>("ALL");

  // Expandable Queue & History States
  const [expandedQueueId, setExpandedQueueId] = useState<string | null>(null);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  // Viewing Transcript & Recording Modal State
  const [viewingTranscriptCall, setViewingTranscriptCall] = useState<any | null>(null);
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);
  const [deletingRecordingId, setDeletingRecordingId] = useState<string | null>(null);
  const [deletingCallId, setDeletingCallId] = useState<string | null>(null);


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
    window.addEventListener("native-call-log-permission-granted", handleRefresh);
    return () => {
      window.removeEventListener("native-call-state", handleRefresh);
      window.removeEventListener("dialer-closed", handleRefresh);
      window.removeEventListener("native-call-log-permission-granted", handleRefresh);
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
    if (!confirm(`Are you sure you want to delete the call record for "${name || "this contact"}"?`)) {
      return;
    }
    setDeletingCallId(callId);
    const res = await deleteCall(callId);
    setDeletingCallId(null);
    if (res?.error) {
      alert(res.error);
      return;
    }
    if (viewingTranscriptCall?.id === callId) {
      setViewingTranscriptCall(null);
    }
    loadAnalytics(timeframe);
  };

  const handleDeleteRecording = async (callId: string) => {
    if (!confirm("Are you sure you want to delete the audio recording for this call? The call details, notes, and AI summary will remain.")) {
      return;
    }
    setDeletingRecordingId(callId);
    const res = await deleteCallRecording(callId);
    setDeletingRecordingId(null);
    if (res?.error) {
      alert(res.error);
      return;
    }
    if (viewingTranscriptCall?.id === callId) {
      setViewingTranscriptCall((prev: any) => prev ? { ...prev, recordingUrl: null } : null);
    }
    loadAnalytics(timeframe);
  };

  const activeCalls = analyticsData?.calls || initialCalls || [];

  // Filter calls
  const filteredCalls = (activeCalls || []).filter((c: any) => {
    const q = historySearch.toLowerCase();
    const customerName = (c.customerName || c.contactPerson || c.customer?.businessName || c.lead?.shopName || c.lead?.name || "").toLowerCase();
    const phone = (c.phone || c.customer?.mobile || c.customer?.whatsappNumber || c.lead?.whatsappNumber || "").toLowerCase();
    const repName = (c.employeeName || c.employee?.user?.name || "").toLowerCase();
    const notes = (c.notes || "").toLowerCase();

    const matchesQuery = !q || customerName.includes(q) || phone.includes(q) || repName.includes(q) || notes.includes(q);
    const matchesOutcome = selectedOutcomeFilter === "ALL" || (c.outcome || "").toLowerCase() === selectedOutcomeFilter.toLowerCase();
    return matchesQuery && matchesOutcome;
  });

  const metrics = analyticsData?.metrics || {
    totalCalls: activeCalls.length,
    connectedCalls: activeCalls.filter((c: any) => !["No Answer", "Busy", "Voicemail", "Missed", "Switched Off", "Wrong Number"].some(k => (c.outcome || "").toLowerCase().includes(k.toLowerCase()))).length,
    connectRate: activeCalls.length > 0 ? Math.round((activeCalls.filter((c: any) => !["No Answer", "Busy", "Voicemail", "Missed", "Switched Off", "Wrong Number"].some(k => (c.outcome || "").toLowerCase().includes(k.toLowerCase()))).length / activeCalls.length) * 100) : 0,
    totalDurationSec: activeCalls.reduce((sum: number, c: any) => sum + (c.durationSec || 0), 0),
    avgDurationSec: activeCalls.length > 0 ? Math.round(activeCalls.reduce((sum: number, c: any) => sum + (c.durationSec || 0), 0) / activeCalls.length) : 0
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
            {isAndroidNativeApp() && (
              <button
                type="button"
                className="btn-telecrm-secondary"
                disabled={isSyncingDeviceCalls}
                onClick={async () => {
                  try {
                    setIsSyncingDeviceCalls(true);
                    const hasPerm = hasCallLogPermission();
                    if (!hasPerm) {
                      requestCallLogPermission();
                    } else {
                      const devLogs = await getDeviceCallLogs(60, "ALL");
                      if (devLogs && devLogs.length > 0) {
                        await syncDeviceCallLogs(devLogs);
                        await loadAnalytics(timeframe);
                        await loadQueue();
                      }
                    }
                  } catch (e) {
                    console.warn("Device sync error:", e);
                  } finally {
                    setIsSyncingDeviceCalls(false);
                  }
                }}
                title="Sync missed & incoming calls from device"
                style={{
                  height: "38px",
                  borderRadius: "10px",
                  padding: "0 14px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "7px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#1e293b",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                  cursor: isSyncingDeviceCalls ? "not-allowed" : "pointer"
                }}
              >
                <RefreshCw size={15} color="#2563eb" className={isSyncingDeviceCalls ? "animate-spin" : ""} />
                {isSyncingDeviceCalls ? "Syncing..." : "Sync Calls"}
              </button>
            )}

            <button
              type="button"
              className="btn-telecrm-primary"
              onClick={() => setIsLogModalOpen(true)}
              title="Manually log a past call"
              style={{
                height: "38px",
                borderRadius: "10px",
                padding: "0 16px",
                fontSize: "0.85rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                color: "#ffffff",
                border: "none",
                boxShadow: "0 2px 8px rgba(79, 70, 229, 0.28)",
                cursor: "pointer"
              }}
            >
              <FileText size={15} color="#ffffff" /> Log Call
            </button>
          </div>
        </div>

        {/* ─── LIVE KPI METRIC CARDS (CLICKABLE FOR DETAIL BREAKDOWN) ─── */}
        <div className="telecrm-kpi-grid">
          {/* Total Calls */}
          <div
            className="telecrm-kpi-card clickable"
            role="button"
            tabIndex={0}
            onClick={() => {
              setSelectedKpiModal("TOTAL_CALLS");
              setKpiSearch("");
              setKpiOutcomeFilter("ALL");
              setKpiEmployeeFilter("ALL");
            }}
            title="Click to view all call logs and activity breakdown"
          >
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
            <div className="kpi-click-hint">
              <span>View details</span> <ChevronRight size={12} />
            </div>
          </div>

          {/* Connect Rate */}
          <div
            className="telecrm-kpi-card clickable"
            role="button"
            tabIndex={0}
            onClick={() => {
              setSelectedKpiModal("CONNECT_RATE");
              setKpiSearch("");
              setKpiOutcomeFilter("ALL");
              setKpiEmployeeFilter("ALL");
            }}
            title="Click to view connected calls and connection rate breakdown"
          >
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
            <div className="kpi-click-hint">
              <span>View details</span> <ChevronRight size={12} />
            </div>
          </div>

          {/* Total Talk Time */}
          <div
            className="telecrm-kpi-card clickable"
            role="button"
            tabIndex={0}
            onClick={() => {
              setSelectedKpiModal("TALK_TIME");
              setKpiSearch("");
              setKpiOutcomeFilter("ALL");
              setKpiEmployeeFilter("ALL");
            }}
            title="Click to view talk time leaderboard and call duration analysis"
          >
            <div className="telecrm-kpi-top">
              <span className="telecrm-kpi-label">Total Talk Time</span>
              <div className="telecrm-kpi-icon-wrap sky">
                <Clock size={16} />
              </div>
            </div>
            <div className="telecrm-kpi-val">
              {formatTotalTime(metrics.totalDurationSec)}
            </div>
            <div className="kpi-click-hint">
              <span>View details</span> <ChevronRight size={12} />
            </div>
          </div>

          {/* Avg Duration */}
          <div
            className="telecrm-kpi-card clickable"
            role="button"
            tabIndex={0}
            onClick={() => {
              setSelectedKpiModal("AVG_DURATION");
              setKpiSearch("");
              setKpiOutcomeFilter("ALL");
              setKpiEmployeeFilter("ALL");
            }}
            title="Click to view duration distribution and averages"
          >
            <div className="telecrm-kpi-top">
              <span className="telecrm-kpi-label">Avg Duration</span>
              <div className="telecrm-kpi-icon-wrap violet">
                <Zap size={16} />
              </div>
            </div>
            <div className="telecrm-kpi-val">
              {formatDuration(metrics.avgDurationSec)}
            </div>
            <div className="kpi-click-hint">
              <span>View details</span> <ChevronRight size={12} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── SUB-NAVIGATION SEGMENTED TAB BAR (RESPONSIVE NON-SLIDING GRID ON MOBILE) ─── */}
      <div className="telecrm-tabs-bar" role="tablist" aria-label="TeleCRM Hub Navigation">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "ANALYTICS"}
          className={`telecrm-tab-item ${activeTab === "ANALYTICS" ? "active" : ""}`}
          onClick={() => setActiveTab("ANALYTICS")}
        >
          <BarChart3 size={17} className="telecrm-tab-icon" />
          <span className="telecrm-tab-label">
            <span className="tab-label-desktop">Employee Analytics</span>
            <span className="tab-label-mobile">Analytics</span>
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "QUEUE"}
          className={`telecrm-tab-item ${activeTab === "QUEUE" ? "active" : ""}`}
          onClick={() => setActiveTab("QUEUE")}
        >
          <Flame size={17} className="telecrm-tab-icon" />
          <span className="telecrm-tab-label">
            <span className="tab-label-desktop">Calling Queue</span>
            <span className="tab-label-mobile">Calling Queue</span>
          </span>
          {queueData.overdue?.length > 0 && (
            <span className="tab-count-badge">
              {queueData.overdue.length}
            </span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "HISTORY"}
          className={`telecrm-tab-item ${activeTab === "HISTORY" ? "active" : ""}`}
          onClick={() => setActiveTab("HISTORY")}
        >
          <Clock size={17} className="telecrm-tab-icon" />
          <span className="telecrm-tab-label">
            <span className="tab-label-desktop">Call History & Logs</span>
            <span className="tab-label-mobile">Call History</span>
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "PLAYBOOK"}
          className={`telecrm-tab-item ${activeTab === "PLAYBOOK" ? "active" : ""}`}
          onClick={() => setActiveTab("PLAYBOOK")}
        >
          <BookOpen size={17} className="telecrm-tab-icon" />
          <span className="telecrm-tab-label">
            <span className="tab-label-desktop">Playbook & Scripts</span>
            <span className="tab-label-mobile">Playbooks</span>
          </span>
        </button>
      </div>

      {/* ─── TAB 1: EMPLOYEE PERFORMANCE & ANALYTICS ─── */}
      {activeTab === "ANALYTICS" && (
        <div>
          {/* Modern Mobile Filter Bar */}
          <div className="telecrm-mobile-filter-bar">
            <div className="telecrm-segmented-scroll">
              {(["today", "yesterday", "this_week", "this_month", "all"] as const).map(tf => {
                const label =
                  tf === "today" ? "Today" :
                  tf === "yesterday" ? "Yesterday" :
                  tf === "this_week" ? "This Week" :
                  tf === "this_month" ? "This Month" : "All";
                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={`telecrm-pill-btn ${timeframe === tf ? "active" : ""}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => loadAnalytics(timeframe)}
              className="telecrm-refresh-circle"
              title="Refresh Stats"
            >
              <RefreshCw size={14} className={loadingAnalytics ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Employee Leaderboard Cards */}
          <div className="telecrm-employee-grid">
            {(analyticsData?.employeeStats || []).filter((emp: any) => isAdmin || !currentEmployeeId || emp.id === currentEmployeeId).map((emp: any, index: number) => {
              const isTop = index === 0 && emp.totalCalls > 0;
              const isExpanded = expandedEmpId === emp.id;

              const empCallsFiltered = (emp.allCalls || []).filter((c: any) => {
                if (empOutcomeFilter === "ALL") return true;
                if (empOutcomeFilter === "__CONNECTED__") {
                  return !["no answer", "busy", "voicemail", "missed", "switched off", "wrong number"].some(k => (c.outcome || "").toLowerCase().includes(k));
                }
                return (c.outcome || "").toLowerCase() === empOutcomeFilter.toLowerCase();
              });

              return (
                <div
                  key={emp.id}
                  className={`telecrm-emp-card-v2 ${isTop ? "top-performer" : ""} expandable`}
                >
                  {/* Top Performer Tag */}
                  {isTop && (
                    <div className="top-performer-tag">
                      <Award size={12} /> TOP PERFORMER
                    </div>
                  )}

                  {/* Header Row */}
                  <div
                    className="telecrm-card-header-v2 telecrm-emp-header-clickable"
                    onClick={() => {
                      setExpandedEmpId(isExpanded ? null : emp.id);
                      setEmpOutcomeFilter("ALL");
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                      <div className="telecrm-avatar-wrap">
                        <div className="telecrm-avatar-circle">
                          {emp.name ? emp.name.charAt(0).toUpperCase() : "U"}
                        </div>
                      </div>

                      <div className="telecrm-rep-meta-col">
                        <h3 className="telecrm-rep-name-v2">{emp.name}</h3>
                        <div className="telecrm-rep-tags-row">
                          <span className="telecrm-role-badge">{emp.role}</span>
                          <span className="telecrm-rep-email-text">{emp.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="telecrm-header-right-v2">
                      <button
                        type="button"
                        className="btn-view-calls-v2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedEmpId(isExpanded ? null : emp.id);
                          setEmpOutcomeFilter("ALL");
                        }}
                      >
                        <Eye size={13} />
                        <span>{isExpanded ? "Hide" : `View ${emp.allCalls?.length || emp.totalCalls} Calls`}</span>
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Progress & Target Capsule */}
                  <div className="telecrm-target-capsule">
                    <span style={{ fontWeight: 600, color: "#475569" }}>
                      Target Progress: <strong style={{ color: "#0f172a" }}>{emp.totalCalls}</strong> / {emp.target} calls
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: emp.targetPercent >= 100 ? "#059669" : emp.targetPercent >= 50 ? "#4f46e5" : "#d97706"
                      }}
                    >
                      {emp.targetPercent}% target met
                    </span>
                  </div>

                  <div className="telecrm-progress-track-v2">
                    <div
                      className="telecrm-progress-fill-v2"
                      style={{
                        width: `${Math.min(100, Math.max(3, emp.targetPercent))}%`,
                        background: emp.targetPercent >= 100
                          ? "linear-gradient(90deg, #10b981 0%, #059669 100%)"
                          : "linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%)"
                      }}
                    />
                  </div>

                  {/* 2x2 Metric Grid */}
                  <div className="telecrm-kpi-grid-2x2">
                    {/* Tile 1: Connected */}
                    <div
                      className="telecrm-metric-tile"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedEmpId(emp.id);
                        setEmpOutcomeFilter("__CONNECTED__");
                      }}
                      title="Filter connected calls"
                    >
                      <div className="telecrm-metric-tile-icon" style={{ backgroundColor: "#ecfdf5", color: "#059669" }}>
                        <PhoneCall size={16} />
                      </div>
                      <div className="telecrm-metric-tile-content">
                        <span className="telecrm-metric-tile-label">Connected</span>
                        <span className="telecrm-metric-tile-val" style={{ color: "#059669" }}>{emp.connectedCalls}</span>
                      </div>
                    </div>

                    {/* Tile 2: Connect % */}
                    <div
                      className="telecrm-metric-tile"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedEmpId(emp.id);
                        setEmpOutcomeFilter("ALL");
                      }}
                      title="View all calls"
                    >
                      <div className="telecrm-metric-tile-icon" style={{ backgroundColor: "#eef2ff", color: "#4f46e5" }}>
                        <TrendingUp size={16} />
                      </div>
                      <div className="telecrm-metric-tile-content">
                        <span className="telecrm-metric-tile-label">Connect %</span>
                        <span className="telecrm-metric-tile-val" style={{ color: emp.connectRate >= 40 ? "#059669" : "#d97706" }}>
                          {emp.connectRate}%
                        </span>
                      </div>
                    </div>

                    {/* Tile 3: Talk Time */}
                    <div
                      className="telecrm-metric-tile"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedEmpId(emp.id);
                        setEmpOutcomeFilter("ALL");
                      }}
                      title="View talk time details"
                    >
                      <div className="telecrm-metric-tile-icon" style={{ backgroundColor: "#f0fdfa", color: "#0891b2" }}>
                        <Clock size={16} />
                      </div>
                      <div className="telecrm-metric-tile-content">
                        <span className="telecrm-metric-tile-label">Talk Time</span>
                        <span className="telecrm-metric-tile-val">{formatTotalTime(emp.totalDurationSec)}</span>
                      </div>
                    </div>

                    {/* Tile 4: Avg Duration */}
                    <div
                      className="telecrm-metric-tile"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedEmpId(emp.id);
                        setEmpOutcomeFilter("ALL");
                      }}
                      title="View call history"
                    >
                      <div className="telecrm-metric-tile-icon" style={{ backgroundColor: "#fffbeb", color: "#d97706" }}>
                        <Zap size={16} />
                      </div>
                      <div className="telecrm-metric-tile-content">
                        <span className="telecrm-metric-tile-label">Avg Call</span>
                        <span className="telecrm-metric-tile-val">{formatDuration(emp.avgDurationSec)}</span>
                      </div>
                    </div>
                  </div>


                  {/* ─── EXPANDABLE EMPLOYEE CALL HISTORY & DETAILS ─── */}
                  {isExpanded && (
                    <div className="emp-expanded-details">
                      {/* Outcome Filter Chips */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                          <FileText size={14} color="#4f46e5" />
                          <span>Calls by {emp.name} ({empCallsFiltered.length})</span>
                        </div>

                        <div className="emp-outcome-chips-row">
                          <button
                            type="button"
                            className={`emp-outcome-chip ${empOutcomeFilter === "ALL" ? "active" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEmpOutcomeFilter("ALL");
                            }}
                          >
                            All ({emp.allCalls?.length || emp.totalCalls})
                          </button>
                          {emp.connectedCalls > 0 && (
                            <button
                              type="button"
                              className={`emp-outcome-chip ${empOutcomeFilter === "__CONNECTED__" ? "active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEmpOutcomeFilter("__CONNECTED__");
                              }}
                            >
                              Connected ({emp.connectedCalls})
                            </button>
                          )}
                          {Object.entries(emp.outcomes || {}).map(([oc, count]) => {
                            if (!count || (count as number) <= 0) return null;
                            return (
                              <button
                                key={oc}
                                type="button"
                                className={`emp-outcome-chip ${empOutcomeFilter === oc ? "active" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEmpOutcomeFilter(oc);
                                }}
                              >
                                {oc} ({count as number})
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Calls List */}
                      <div className="emp-calls-list">
                        {empCallsFiltered.map((call: any) => {
                          const contactName = call.customerName || call.contactPerson || "Contact";
                          const phone = call.phone || "";
                          const isConnected = !["no answer", "busy", "voicemail", "missed", "switched off", "wrong number"].some(k => (call.outcome || "").toLowerCase().includes(k));

                          return (
                            <div key={call.id} className="emp-call-item">
                              {/* Top Row: Info on left, action buttons on right */}
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", width: "100%" }}>
                                <div style={{ flex: 1, minWidth: "220px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                    <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>{contactName}</span>
                                    <span style={{
                                      fontSize: "0.68rem",
                                      fontWeight: 600,
                                      padding: "2px 7px",
                                      borderRadius: "6px",
                                      backgroundColor: isConnected ? "#ecfdf5" : "#fef2f2",
                                      color: isConnected ? "#059669" : "#dc2626"
                                    }}>
                                      {call.outcome}
                                    </span>
                                    <span style={{
                                      fontSize: "0.68rem",
                                      fontWeight: 600,
                                      padding: "2px 6px",
                                      borderRadius: "6px",
                                      backgroundColor: call.callType === "INBOUND" ? "#e0e7ff" : "#f1f5f9",
                                      color: call.callType === "INBOUND" ? "#4338ca" : "#64748b"
                                    }}>
                                      {call.callType || "OUTBOUND"}
                                    </span>
                                  </div>

                                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                                    {phone && <span>📞 {phone}</span>}
                                    <span>🕒 {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span>⏳ {formatDuration(call.durationSec)}</span>
                                    {call.followUpDate && (
                                      <span style={{ color: "#4f46e5", fontWeight: 600 }}>
                                        📅 Follow-up: {new Date(call.followUpDate).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Action buttons */}
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", maxWidth: "100%" }}>
                                  {phone && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openDialerWithContact(phone, contactName, call.customerId, call.leadId);
                                      }}
                                      style={{ height: "28px", padding: "0 10px", borderRadius: "6px", backgroundColor: "#4f46e5", color: "#ffffff", border: "none", fontSize: "0.74rem", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px", flexShrink: 0 }}
                                      title="Call Contact"
                                    >
                                      <PhoneCall size={12} /> Call
                                    </button>
                                  )}
                                  {phone && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openWhatsApp(phone);
                                      }}
                                      style={{ height: "28px", width: "28px", borderRadius: "6px", backgroundColor: "#25d366", color: "#ffffff", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                                      title="Chat on WhatsApp"
                                    >
                                      <WhatsAppIcon size={14} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDialerWithContact(phone, contactName, call.customerId, call.leadId, "POST_CALL");
                                    }}
                                    style={{ height: "28px", padding: "0 8px", borderRadius: "6px", backgroundColor: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", fontSize: "0.74rem", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "3px", flexShrink: 0 }}
                                    title="AI Debrief"
                                  >
                                    <Sparkles size={12} /> Debrief
                                  </button>
                                  {(call.summary || call.notes || call.recordingUrl) && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setViewingTranscriptCall(call);
                                      }}
                                      style={{ height: "28px", padding: "0 8px", borderRadius: "6px", backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", fontSize: "0.74rem", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "3px", flexShrink: 0 }}
                                      title="View Full Transcript & Recording"
                                    >
                                      <FileText size={12} /> Transcript
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditCall(call);
                                    }}
                                    style={{ height: "28px", width: "28px", borderRadius: "6px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", fontSize: "0.74rem", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                                    title="Edit Record"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCall(call.id, contactName);
                                    }}
                                    disabled={deletingCallId === call.id}
                                    style={{ height: "28px", width: "28px", borderRadius: "6px", backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", fontSize: "0.74rem", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                                    title="Delete Call Record"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>

                              {/* Full width Audio Player */}
                              {call.recordingUrl && (
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#f0fdf4", padding: "6px 10px", borderRadius: "8px", border: "1px solid #bbf7d0", flexWrap: "wrap", width: "100%" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.72rem", fontWeight: 700, color: "#16a34a" }}>
                                    <Volume2 size={13} />
                                    <span>Recording</span>
                                  </div>
                                  <audio controls src={call.recordingUrl} style={{ height: "30px", flex: 1, minWidth: "160px" }} />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteRecording(call.id);
                                    }}
                                    disabled={deletingRecordingId === call.id}
                                    style={{
                                      padding: "3px 8px",
                                      borderRadius: "6px",
                                      backgroundColor: "#ffffff",
                                      border: "1px solid #fca5a5",
                                      color: "#dc2626",
                                      fontSize: "0.7rem",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "3px"
                                    }}
                                    title="Delete audio recording only"
                                  >
                                    <Trash2 size={11} /> Delete Audio
                                  </button>
                                </div>
                              )}

                              {/* Full width AI Summary & Transcript */}
                              {call.summary && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingTranscriptCall(call);
                                  }}
                                  style={{
                                    fontSize: "0.78rem",
                                    color: "#1e293b",
                                    backgroundColor: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    lineHeight: 1.45,
                                    cursor: "pointer",
                                    width: "100%"
                                  }}
                                  title="Click to view full transcript & recording"
                                >
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#4f46e5", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                      <Sparkles size={11} /> AI Summary & Transcript
                                    </span>
                                    <span style={{ fontSize: "0.68rem", color: "#6366f1", fontWeight: 600 }}>View full ↗</span>
                                  </div>
                                  <div>{call.summary}</div>
                                </div>
                              )}

                              {/* Full width Notes */}
                              {call.notes && !call.summary && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingTranscriptCall(call);
                                  }}
                                  style={{
                                    fontSize: "0.78rem",
                                    color: "#334155",
                                    backgroundColor: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    lineHeight: 1.45,
                                    cursor: "pointer",
                                    width: "100%"
                                  }}
                                  title="Click to view full transcript & recording"
                                >
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b" }}>
                                      {call.notes.includes("[Auto-Transcript]") ? "🎙️ Transcript & Notes" : "📝 Call Notes"}
                                    </span>
                                    <span style={{ fontSize: "0.68rem", color: "#4f46e5", fontWeight: 600 }}>View full ↗</span>
                                  </div>
                                  <div style={{ whiteSpace: "pre-wrap", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                    {formatTranscriptWithNames(
                                      call.notes,
                                      call.employeeName || (call.employee as any)?.user?.name || (call.employee as any)?.name,
                                      call.customerName || call.contactPerson,
                                      Boolean(call.customerId || call.isCustomer || call.isOldCustomer)
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {empCallsFiltered.length === 0 && (
                          <div style={{ textAlign: "center", padding: "20px", color: "#64748b", fontSize: "0.8rem", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                            No calls found for this filter.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
                  const isExpanded = expandedQueueId === c.id;

                  return (
                    <div
                      key={c.id}
                      onClick={() => setExpandedQueueId(isExpanded ? null : c.id)}
                      style={{
                        backgroundColor: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: "12px",
                        padding: "12px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                      title="Click to view full customer follow-up details"
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#991b1b", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>{name}</span>
                            <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "1px 6px", borderRadius: "4px", backgroundColor: "#fee2e2", color: "#b91c1c" }}>
                              OVERDUE
                            </span>
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#7f1d1d", marginTop: "2px" }}>
                            Due: {new Date(c.followUpDate).toLocaleDateString()} • Prev Outcome: {c.outcome}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {phone && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openWhatsApp(phone);
                              }}
                              style={{ height: "28px", width: "28px", borderRadius: "8px", backgroundColor: "#25d366", color: "#ffffff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                              title="Chat on WhatsApp"
                            >
                              <WhatsAppIcon size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDialerWithContact(phone, name, c.customerId, c.leadId);
                            }}
                            style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: "#dc2626", color: "#ffffff", border: "none", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            <PhoneCall size={14} /> Call Now
                          </button>
                          <div style={{ color: "#991b1b" }}>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ borderTop: "1px dashed #fca5a5", paddingTop: "8px", marginTop: "4px", fontSize: "0.78rem", color: "#7f1d1d" }}>
                          {phone && <div>📞 <strong>Phone:</strong> {phone}</div>}
                          {c.notes && <div style={{ marginTop: "4px" }}>📝 <strong>Follow-up Notes:</strong> {c.notes}</div>}
                          {c.summary && <div style={{ marginTop: "4px" }}>✨ <strong>AI Summary:</strong> {c.summary}</div>}
                          <div style={{ marginTop: "4px", fontSize: "0.72rem", color: "#991b1b" }}>
                            Scheduled for: {new Date(c.followUpDate).toLocaleString()}
                          </div>
                        </div>
                      )}
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
                const isExpanded = expandedQueueId === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => setExpandedQueueId(isExpanded ? null : c.id)}
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                    title="Click to view scheduled call notes and contact info"
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>{name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                          Time: {new Date(c.followUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Prev: {c.outcome}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        {phone && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openWhatsApp(phone);
                            }}
                            style={{ padding: "6px 10px", borderRadius: "8px", backgroundColor: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", fontWeight: 600 }}
                          >
                            <WhatsAppLogo size={14} /> WhatsApp
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDialerWithContact(phone, name, c.customerId, c.leadId);
                          }}
                          style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: "#4f46e5", color: "#ffffff", border: "none", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <PhoneCall size={14} /> Call Now
                        </button>
                        <div style={{ color: "#64748b" }}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "8px", marginTop: "4px", fontSize: "0.78rem", color: "#334155" }}>
                        {phone && <div>📞 <strong>Phone:</strong> {phone}</div>}
                        {c.notes && <div style={{ marginTop: "4px" }}>📝 <strong>Discussion / Reason:</strong> {c.notes}</div>}
                        {c.summary && <div style={{ marginTop: "4px" }}>✨ <strong>AI Summary:</strong> {c.summary}</div>}
                        <div style={{ marginTop: "4px", fontSize: "0.72rem", color: "#64748b" }}>
                          Follow-up Scheduled: {new Date(c.followUpDate).toLocaleString()}
                        </div>
                      </div>
                    )}
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
                {queueData.freshLeads.map((l: any) => {
                  const isExpanded = expandedQueueId === l.id;
                  return (
                    <div
                      key={l.id}
                      onClick={() => setExpandedQueueId(isExpanded ? null : l.id)}
                      style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "12px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                      title="Click to view full lead details"
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>{l.shopName || l.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>Contact: {l.name} • {l.whatsappNumber}</div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {l.whatsappNumber && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openWhatsApp(l.whatsappNumber);
                              }}
                              style={{ padding: "6px 10px", borderRadius: "8px", backgroundColor: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                            >
                              <WhatsAppLogo size={14} /> WhatsApp
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDialerWithContact(l.whatsappNumber, l.name, undefined, l.id);
                            }}
                            style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: "#059669", color: "#ffffff", border: "none", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            <Phone size={14} /> Start Call
                          </button>
                          <div style={{ color: "#64748b" }}>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "8px", marginTop: "4px", fontSize: "0.78rem", color: "#334155" }}>
                          <div>🏪 <strong>Business / Shop:</strong> {l.shopName || "N/A"}</div>
                          <div>👤 <strong>Contact Person:</strong> {l.name}</div>
                          <div>📱 <strong>Mobile / WhatsApp:</strong> {l.whatsappNumber || "N/A"}</div>
                          <div style={{ marginTop: "4px", fontSize: "0.72rem", color: "#059669", fontWeight: 600 }}>
                            Status: Ready for first outreach call
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
              const isExpanded = expandedCallId === call.id;

              return (
                <div
                  key={call.id}
                  onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    border: isExpanded ? "1px solid #c7d2fe" : "1px solid #e2e8f0",
                    boxShadow: isExpanded ? "0 4px 14px rgba(79, 70, 229, 0.08)" : "0 1px 3px rgba(0,0,0,0.02)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  title="Click to expand/collapse full call conversation notes & details"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>{customerName}</span>
                        {call.customer && <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "1px 6px", borderRadius: "4px", backgroundColor: "#eff6ff", color: "#2563eb" }}>Customer</span>}
                        {call.lead && <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "1px 6px", borderRadius: "4px", backgroundColor: "#ecfdf5", color: "#059669" }}>Lead</span>}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                        {new Date(call.createdAt).toLocaleDateString("en-GB")} at {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Rep: <strong>{repName}</strong>
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
                      <div style={{ color: "#94a3b8", marginLeft: "2px" }}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
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

                  {call.notes && (!call.summary || isExpanded) && (
                    <p style={{ margin: "6px 0 10px 0", fontSize: "0.8rem", color: "#475569", lineHeight: 1.4, backgroundColor: "#f8fafc", padding: "8px 10px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                      <strong>Notes:</strong> {call.notes}
                    </p>
                  )}

                  {/* Expanded Additional Details */}
                  {isExpanded && (
                    <div style={{ backgroundColor: "#fafafa", borderRadius: "8px", padding: "8px 10px", margin: "6px 0 10px 0", fontSize: "0.75rem", color: "#475569", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "6px" }}>
                      {phone && <div>📞 <strong>Phone:</strong> {phone}</div>}
                      {call.customer?.contactPerson && <div>👤 <strong>Contact:</strong> {call.customer.contactPerson}</div>}
                      {call.customer?.city && <div>📍 <strong>City:</strong> {call.customer.city}</div>}
                      <div>⏱️ <strong>Talk Time:</strong> {formatDuration(call.durationSec)} ({call.durationSec || 0} seconds)</div>
                    </div>
                  )}

                  {/* Call Audio Recording if exists */}
                  {call.recordingUrl && (
                    <div style={{ marginTop: "8px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#f0fdf4", padding: "6px 10px", borderRadius: "8px", border: "1px solid #bbf7d0", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.72rem", fontWeight: 700, color: "#16a34a" }}>
                        <Volume2 size={13} />
                        <span>Recording</span>
                      </div>
                      <audio controls src={call.recordingUrl} style={{ height: "30px", flex: 1, minWidth: "160px", maxWidth: "340px" }} />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRecording(call.id);
                        }}
                        disabled={deletingRecordingId === call.id}
                        style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          backgroundColor: "#ffffff",
                          border: "1px solid #fca5a5",
                          color: "#dc2626",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px"
                        }}
                        title="Delete audio recording only"
                      >
                        <Trash2 size={11} /> Delete Audio
                      </button>
                    </div>
                  )}

                  {/* Card Actions */}
                  <div
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {phone && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDialerWithContact(phone, customerName, call.customerId, call.leadId);
                          }}
                          style={{ padding: "5px 10px", borderRadius: "6px", backgroundColor: "#eef2ff", color: "#4f46e5", border: "1px solid #c7d2fe", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <PhoneCall size={12} /> Re-dial
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDialerWithContact(phone, customerName, call.customerId, call.leadId, "POST_CALL");
                        }}
                        style={{ padding: "5px 10px", borderRadius: "6px", backgroundColor: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                        title="Log or update call details"
                      >
                        <Clock size={12} /> Log Details
                      </button>
                      {(call.summary || call.notes || call.recordingUrl) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingTranscriptCall(call);
                          }}
                          style={{ padding: "5px 10px", borderRadius: "6px", backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                          title="View Full Transcript & Debrief"
                        >
                          <FileText size={12} /> Transcript
                        </button>
                      )}
                      {phone && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openWhatsApp(phone);
                          }}
                          style={{ height: "28px", width: "28px", borderRadius: "6px", backgroundColor: "#25d366", color: "#ffffff", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                          title="Chat on WhatsApp"
                        >
                          <WhatsAppIcon size={14} />
                        </button>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCall(call);
                        }}
                        style={{ padding: "5px 8px", borderRadius: "6px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", fontSize: "0.75rem", cursor: "pointer" }}
                        title="Edit Record"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCall(call.id, customerName);
                        }}
                        disabled={deletingCallId === call.id}
                        style={{ padding: "5px 8px", borderRadius: "6px", backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", fontSize: "0.75rem", cursor: "pointer" }}
                        title="Delete Record"
                      >
                        <Trash2 size={13} />
                      </button>
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

      {/* ─── INTERACTIVE KPI DRILL-DOWN MODAL ─── */}
      {selectedKpiModal && (() => {
        let baseList = analyticsData?.calls || initialCalls || [];
        let title = "Total Calls Overview & Logs";
        let subtitle = `Complete record of calls in selected timeframe (${timeframe.replace("_", " ")})`;
        let icon = <PhoneCall size={20} color="#4f46e5" />;

        if (selectedKpiModal === "CONNECT_RATE") {
          title = "Connect Rate & Reached Contacts";
          subtitle = `Calls where contacts answered & engaged (${metrics.connectRate}% connect rate)`;
          icon = <TrendingUp size={20} color="#059669" />;
          baseList = baseList.filter((c: any) => !["no answer", "busy", "voicemail", "missed", "switched off", "wrong number"].some(k => (c.outcome || "").toLowerCase().includes(k)));
        } else if (selectedKpiModal === "TALK_TIME") {
          title = "Total Talk Time & Conversation Logs";
          subtitle = `Detailed breakdown of calls with active duration (${formatTotalTime(metrics.totalDurationSec)} total talk time)`;
          icon = <Clock size={20} color="#0284c7" />;
          baseList = baseList.filter((c: any) => (c.durationSec || 0) > 0).sort((a: any, b: any) => (b.durationSec || 0) - (a.durationSec || 0));
        } else if (selectedKpiModal === "AVG_DURATION") {
          title = "Average Call Duration & Length Breakdown";
          subtitle = `Average conversation time: ${formatDuration(metrics.avgDurationSec)} across calls`;
          icon = <Zap size={20} color="#7c3aed" />;
          baseList = [...baseList].sort((a: any, b: any) => (b.durationSec || 0) - (a.durationSec || 0));
        }

        // Apply filters
        let displayList = baseList;
        if (kpiSearch) {
          const q = kpiSearch.toLowerCase();
          displayList = displayList.filter((c: any) => {
            const cName = (c.customerName || c.contactPerson || c.customer?.businessName || c.lead?.shopName || "").toLowerCase();
            const phone = (c.phone || c.customer?.mobile || c.lead?.whatsappNumber || "").toLowerCase();
            const rep = (c.employeeName || c.employee?.user?.name || "").toLowerCase();
            const notes = (c.notes || "").toLowerCase();
            return cName.includes(q) || phone.includes(q) || rep.includes(q) || notes.includes(q);
          });
        }

        if (kpiOutcomeFilter !== "ALL") {
          displayList = displayList.filter((c: any) => (c.outcome || "").toLowerCase() === kpiOutcomeFilter.toLowerCase());
        }

        if (kpiEmployeeFilter !== "ALL") {
          displayList = displayList.filter((c: any) => c.employeeId === kpiEmployeeFilter);
        }

        const uniqueOutcomes = Array.from(new Set(baseList.map((c: any) => c.outcome).filter(Boolean)));
        const uniqueReps = Array.from(
          new Map(
            baseList.map((c: any) => [c.employeeId, c.employeeName || c.employee?.user?.name || "Rep"]).filter(([id]: any) => Boolean(id))
          ).entries()
        );

        const totalViewDuration = displayList.reduce((sum: number, c: any) => sum + (c.durationSec || 0), 0);
        const avgViewDuration = displayList.length > 0 ? Math.round(totalViewDuration / displayList.length) : 0;

        return (
          <div
            className="telecrm-modal-backdrop"
            onClick={() => setSelectedKpiModal(null)}
          >
            <div
              className="telecrm-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="telecrm-modal-header">
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {icon}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                      {title}
                    </h3>
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                      {subtitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="telecrm-modal-close-btn"
                  onClick={() => setSelectedKpiModal(null)}
                  title="Close Modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="telecrm-modal-body">
                {/* Stats quick bar */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
                  <div style={{ backgroundColor: "#f8fafc", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Total Matching</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>{displayList.length} <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b" }}>calls</span></div>
                  </div>
                  <div style={{ backgroundColor: "#f8fafc", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Total Duration</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>{formatTotalTime(totalViewDuration)}</div>
                  </div>
                  <div style={{ backgroundColor: "#f8fafc", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Avg Duration</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>{formatDuration(avgViewDuration)}</div>
                  </div>
                </div>

                {/* Filter Controls */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
                    <Search size={15} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      type="text"
                      value={kpiSearch}
                      onChange={(e) => setKpiSearch(e.target.value)}
                      placeholder="Search contact, phone, rep..."
                      style={{ width: "100%", padding: "8px 12px 8px 34px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem", outline: "none", backgroundColor: "#ffffff" }}
                    />
                  </div>

                  <select
                    value={kpiOutcomeFilter}
                    onChange={(e) => setKpiOutcomeFilter(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.8rem", backgroundColor: "#ffffff", fontWeight: 500, color: "#334155" }}
                  >
                    <option value="ALL">All Outcomes ({baseList.length})</option>
                    {uniqueOutcomes.map((oc: any) => (
                      <option key={oc} value={oc}>{oc}</option>
                    ))}
                  </select>

                  {isAdmin && uniqueReps.length > 1 && (
                    <select
                      value={kpiEmployeeFilter}
                      onChange={(e) => setKpiEmployeeFilter(e.target.value)}
                      style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.8rem", backgroundColor: "#ffffff", fontWeight: 500, color: "#334155" }}
                    >
                      <option value="ALL">All Sales Reps</option>
                      {uniqueReps.map(([id, name]: any) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Calls Listing */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "420px", overflowY: "auto", paddingRight: "4px" }}>
                  {displayList.map((c: any) => {
                    const contactName = c.customerName || c.contactPerson || c.customer?.businessName || c.lead?.shopName || c.lead?.name || "Contact";
                    const phone = c.phone || c.customer?.mobile || c.customer?.whatsappNumber || c.lead?.whatsappNumber || "";
                    const rep = c.employeeName || c.employee?.user?.name || "Agent";
                    const isConnected = !["no answer", "busy", "voicemail", "missed", "switched off", "wrong number"].some(k => (c.outcome || "").toLowerCase().includes(k));

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
                          gap: "12px",
                          flexWrap: "wrap",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                        }}
                      >
                        <div style={{ flex: 1, minWidth: "220px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>{contactName}</span>
                            <span style={{
                              fontSize: "0.68rem",
                              fontWeight: 600,
                              padding: "2px 7px",
                              borderRadius: "6px",
                              backgroundColor: isConnected ? "#ecfdf5" : "#fef2f2",
                              color: isConnected ? "#059669" : "#dc2626"
                            }}>
                              {c.outcome}
                            </span>
                            <span style={{
                              fontSize: "0.68rem",
                              fontWeight: 600,
                              padding: "2px 6px",
                              borderRadius: "6px",
                              backgroundColor: c.callType === "INBOUND" ? "#e0e7ff" : "#f1f5f9",
                              color: c.callType === "INBOUND" ? "#4338ca" : "#64748b"
                            }}>
                              {c.callType || "OUTBOUND"}
                            </span>
                          </div>

                          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "3px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            {phone && <span>📞 {phone}</span>}
                            <span>👤 Rep: <strong>{rep}</strong></span>
                            <span>🕒 {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>⏳ {formatDuration(c.durationSec)}</span>
                            {c.followUpDate && (
                              <span style={{ color: "#4f46e5", fontWeight: 600 }}>
                                📅 Follow-up: {new Date(c.followUpDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {c.summary && (
                            <div style={{ marginTop: "5px", fontSize: "0.75rem", color: "#1e293b", backgroundColor: "#f8fafc", padding: "5px 8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                              ✨ {c.summary}
                            </div>
                          )}
                          {c.notes && !c.summary && (
                            <div style={{ marginTop: "4px", fontSize: "0.75rem", color: "#475569" }}>
                              {c.notes}
                            </div>
                          )}
                        </div>

                        {/* Direct action buttons */}
                        {/* Call Audio Recording if exists */}
                        {c.recordingUrl && (
                          <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#f0fdf4", padding: "6px 10px", borderRadius: "8px", border: "1px solid #bbf7d0", flexWrap: "wrap", width: "100%" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.72rem", fontWeight: 700, color: "#16a34a" }}>
                              <Volume2 size={13} />
                              <span>Recording</span>
                            </div>
                            <audio controls src={c.recordingUrl} style={{ height: "30px", flex: 1, minWidth: "160px", maxWidth: "340px" }} />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRecording(c.id);
                              }}
                              disabled={deletingRecordingId === c.id}
                              style={{
                                padding: "3px 8px",
                                borderRadius: "6px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #fca5a5",
                                color: "#dc2626",
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px"
                              }}
                              title="Delete audio recording only"
                            >
                              <Trash2 size={11} /> Delete Audio
                            </button>
                          </div>
                        )}

                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, marginTop: "4px" }}>
                          {phone && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedKpiModal(null);
                                openDialerWithContact(phone, contactName, c.customerId, c.leadId);
                              }}
                              style={{ padding: "6px 10px", borderRadius: "6px", backgroundColor: "#4f46e5", color: "#ffffff", border: "none", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                              title="Call Contact"
                            >
                              <PhoneCall size={12} /> Call
                            </button>
                          )}
                          {phone && (
                            <button
                              type="button"
                              onClick={() => openWhatsApp(phone)}
                              style={{ height: "28px", width: "28px", borderRadius: "6px", backgroundColor: "#25d366", color: "#ffffff", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                              title="Chat on WhatsApp"
                            >
                              <WhatsAppIcon size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedKpiModal(null);
                              openDialerWithContact(phone, contactName, c.customerId, c.leadId, "POST_CALL");
                            }}
                            style={{ padding: "6px 8px", borderRadius: "6px", backgroundColor: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
                            title="AI Debrief"
                          >
                            <Sparkles size={12} /> Debrief
                          </button>
                          {(c.summary || c.notes || c.recordingUrl) && (
                            <button
                              type="button"
                              onClick={() => {
                                setViewingTranscriptCall(c);
                              }}
                              style={{ padding: "6px 8px", borderRadius: "6px", backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
                              title="View Full Transcript & Recording"
                            >
                              <FileText size={12} /> Transcript
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedKpiModal(null);
                              handleEditCall(c);
                            }}
                            style={{ padding: "6px 8px", borderRadius: "6px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", fontSize: "0.75rem", cursor: "pointer" }}
                            title="Edit Record"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleDeleteCall(c.id, contactName);
                            }}
                            disabled={deletingCallId === c.id}
                            style={{ padding: "6px 8px", borderRadius: "6px", backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", fontSize: "0.75rem", cursor: "pointer" }}
                            title="Delete Call Record"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {displayList.length === 0 && (
                    <div style={{ textAlign: "center", padding: "36px", color: "#64748b", fontSize: "0.85rem", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                      No call records match the current filter.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================
          CALL TRANSCRIPT & RECORDING MODAL (READABLE & EXPANDED)
          ========================================================= */}
      {viewingTranscriptCall && (
        <div className="telecrm-modal-backdrop" onClick={() => setViewingTranscriptCall(null)}>
          <div className="telecrm-modal-card" style={{ maxWidth: "720px", width: "95%" }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="telecrm-modal-header">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                    {viewingTranscriptCall.customerName || viewingTranscriptCall.contactPerson || "Contact"}
                  </h3>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", backgroundColor: "#e0e7ff", color: "#3730a3" }}>
                    {viewingTranscriptCall.outcome || "Call Log"}
                  </span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 6px", borderRadius: "6px", backgroundColor: "#f1f5f9", color: "#64748b" }}>
                    {viewingTranscriptCall.callType || "OUTBOUND"}
                  </span>
                </div>
                <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "4px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {viewingTranscriptCall.phone && <span>📞 {viewingTranscriptCall.phone}</span>}
                  <span>🕒 {new Date(viewingTranscriptCall.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
                  <span>⏳ {formatDuration(viewingTranscriptCall.durationSec)}</span>
                  {(viewingTranscriptCall.employeeName || viewingTranscriptCall.employee?.user?.name || viewingTranscriptCall.employee?.name) && (
                    <span>👤 Agent: {viewingTranscriptCall.employeeName || viewingTranscriptCall.employee?.user?.name || viewingTranscriptCall.employee?.name}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="telecrm-modal-close-btn"
                onClick={() => setViewingTranscriptCall(null)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="telecrm-modal-body" style={{ gap: "14px", maxHeight: "75vh", overflowY: "auto" }}>
              {/* Audio Recording Player */}
              {viewingTranscriptCall.recordingUrl ? (
                <div style={{ padding: "14px", borderRadius: "12px", backgroundColor: "#f0fdf4", border: "1.5px solid #86efac" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Volume2 size={16} style={{ color: "#16a34a" }} />
                      <span style={{ fontSize: "0.84rem", fontWeight: 800, color: "#15803d" }}>
                        Call Audio Recording
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecording(viewingTranscriptCall.id)}
                      disabled={deletingRecordingId === viewingTranscriptCall.id}
                      style={{
                        padding: "4px 9px",
                        borderRadius: "6px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #fca5a5",
                        color: "#dc2626",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                      title="Delete this audio recording"
                    >
                      <Trash2 size={12} /> Delete Recording
                    </button>
                  </div>
                  <audio controls src={viewingTranscriptCall.recordingUrl} style={{ width: "100%", height: "36px", borderRadius: "8px" }} />
                </div>
              ) : (
                <div style={{ padding: "10px 14px", borderRadius: "10px", backgroundColor: "#f8fafc", border: "1px dashed #cbd5e1", fontSize: "0.78rem", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
                  <VolumeX size={15} />
                  <span>No audio recording file attached to this call record.</span>
                </div>
              )}

              {/* Call Transcript, AI Summary & Dialogue */}
              {(viewingTranscriptCall.notes || viewingTranscriptCall.summary) && (
                <CallTranscriptViewer
                  notes={viewingTranscriptCall.notes}
                  summary={viewingTranscriptCall.summary}
                  repName={viewingTranscriptCall.employeeName || viewingTranscriptCall.employee?.user?.name || viewingTranscriptCall.employee?.name}
                  customerName={viewingTranscriptCall.customerName || viewingTranscriptCall.customer?.businessName || viewingTranscriptCall.contactPerson || viewingTranscriptCall.lead?.shopName || viewingTranscriptCall.lead?.name}
                  isOldCustomer={Boolean(viewingTranscriptCall.customerId || viewingTranscriptCall.isCustomer || viewingTranscriptCall.isOldCustomer || viewingTranscriptCall.customer)}
                  callId={viewingTranscriptCall.id}
                  initialExpanded={true}
                  durationSec={viewingTranscriptCall.durationSec}
                  outcome={viewingTranscriptCall.outcome}
                  status={viewingTranscriptCall.status}
                />
              )}

              {/* Follow-up Date */}
              {viewingTranscriptCall.followUpDate && (
                <div style={{ padding: "10px 14px", borderRadius: "10px", backgroundColor: "#eef2ff", border: "1px solid #c7d2fe", fontSize: "0.82rem", color: "#3730a3", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Calendar size={15} />
                  <span>
                    <strong>Scheduled Follow-up:</strong> {new Date(viewingTranscriptCall.followUpDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => {
                  const cName = viewingTranscriptCall.customerName || viewingTranscriptCall.contactPerson || "this contact";
                  handleDeleteCall(viewingTranscriptCall.id, cName);
                }}
                disabled={deletingCallId === viewingTranscriptCall.id}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  backgroundColor: "#fee2e2",
                  border: "1px solid #fca5a5",
                  color: "#dc2626",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px"
                }}
                title="Delete call record"
              >
                <Trash2 size={14} /> Delete Call Record
              </button>

              <button
                type="button"
                onClick={() => setViewingTranscriptCall(null)}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
