"use client";

import React, { useState, useMemo } from "react";
import {
  Factory, Plus, Search, Filter, Layers, Cpu, Package2, Wrench, Leaf,
  ChevronRight, Clock, CheckCircle2, AlertCircle, PlayCircle, XCircle,
  BarChart3, TrendingUp, Boxes, Users, Receipt, Printer, Trash2,
  Eye, ArrowRight, Sparkles, BookOpen, ClipboardList
} from "lucide-react";
import { createWorkOrder, completeWorkOrder, deleteWorkOrder } from "@/app/actions/productionActions";
import CreateWorkOrderModal from "./CreateWorkOrderModal";
import WorkOrderDetailModal from "./WorkOrderDetailModal";
import BomManagerModal from "./BomManagerModal";
import PieceRateLedgerModal from "./PieceRateLedgerModal";

// ─── Sector config ─────────────────────────────────────────────
const SECTORS = [
  { key: "All", label: "All Sectors", icon: Factory, color: "#4f46e5" },
  { key: "Apparel", label: "Apparel & Textiles", icon: Layers, color: "#0284c7" },
  { key: "Electronics", label: "Electronics & Hardware", icon: Cpu, color: "#7c3aed" },
  { key: "FMCG", label: "FMCG & Packaging", icon: Package2, color: "#059669" },
  { key: "Fabrication", label: "Fabrication & Engineering", icon: Wrench, color: "#d97706" },
  { key: "General", label: "General / Custom", icon: Leaf, color: "#64748b" },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: any }> = {
  Draft:               { color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1", icon: ClipboardList },
  "In Planning":       { color: "#0284c7", bg: "#e0f2fe", border: "#7dd3fc", icon: Clock },
  "Material Allocated":{ color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd", icon: Boxes },
  "In Production":     { color: "#d97706", bg: "#fef3c7", border: "#fde68a", icon: PlayCircle },
  "QA & Packing":      { color: "#0891b2", bg: "#cffafe", border: "#a5f3fc", icon: CheckCircle2 },
  Completed:           { color: "#059669", bg: "#d1fae5", border: "#6ee7b7", icon: CheckCircle2 },
  Cancelled:           { color: "#dc2626", bg: "#fee2e2", border: "#fca5a5", icon: XCircle },
};

interface WorkOrder {
  id: string;
  woNumber: string;
  title: string;
  sector: string;
  finishedGoodsName: string;
  targetQty: number;
  completedQty: number;
  rejectedQty: number;
  status: string;
  currentStage: string;
  priority: string;
  estimatedCost: number;
  actualCost: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualEndDate?: string;
  product?: { id: string; name: string; sku?: string; stockQuantity: number } | null;
  bom?: { id: string; bomCode: string; name: string } | null;
  stages: any[];
  materials: any[];
  workerLogs: any[];
  variantMatrix?: string | null;
  notes?: string | null;
}

export default function ProductionClient({
  initialWorkOrders,
  initialBoms,
  initialSummary,
  products,
  employees,
}: {
  initialWorkOrders: WorkOrder[];
  initialBoms: any[];
  initialSummary: any;
  products: any[];
  employees: any[];
}) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialWorkOrders);
  const [boms, setBoms] = useState<any[]>(initialBoms);
  const [summary, setSummary] = useState(initialSummary);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<"workorders" | "bom">("workorders");

  const [showCreateWO, setShowCreateWO] = useState(false);
  const [showBomManager, setShowBomManager] = useState(false);
  const [viewWorkOrder, setViewWorkOrder] = useState<WorkOrder | null>(null);
  const [showPieceRateModal, setShowPieceRateModal] = useState<WorkOrder | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return workOrders.filter(wo => {
      const matchSector = sectorFilter === "All" || wo.sector === sectorFilter;
      const matchStatus = statusFilter === "All" || wo.status === statusFilter;
      const matchSearch = !searchQuery || [wo.woNumber, wo.title, wo.finishedGoodsName, wo.currentStage].some(
        s => s?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return matchSector && matchStatus && matchSearch;
    });
  }, [workOrders, sectorFilter, statusFilter, searchQuery]);

  const handleDeleteWO = async (wo: WorkOrder) => {
    if (!confirm(`Delete Work Order ${wo.woNumber}?\n\n"${wo.title}"\n\nThis cannot be undone.`)) return;
    setDeletingId(wo.id);
    const res = await deleteWorkOrder(wo.id);
    setDeletingId(null);
    if (res.error) { alert("Error: " + res.error); return; }
    setWorkOrders(prev => prev.filter(w => w.id !== wo.id));
  };

  const handleComplete = async (wo: WorkOrder) => {
    const input = prompt(`Complete Work Order ${wo.woNumber}?\n\nEnter completed quantity (max ${wo.targetQty}):`);
    if (!input) return;
    const completedQty = parseFloat(input);
    if (isNaN(completedQty) || completedQty < 0) { alert("Invalid quantity."); return; }
    const rejected = wo.targetQty - completedQty;
    const res = await completeWorkOrder(wo.id, completedQty, rejected > 0 ? rejected : 0);
    if (res.error) { alert("Error: " + res.error); return; }
    setWorkOrders(prev => prev.map(w => w.id === wo.id ? { ...w, status: "Completed", completedQty, rejectedQty: rejected } : w));
    alert(`✅ Work Order ${wo.woNumber} completed! ${completedQty} units inwarded to stock.`);
  };

  const handlePrint = (wo: WorkOrder) => {
    const pwin = window.open("", "_blank");
    if (!pwin) { alert("Allow popups to print."); return; }
    const efficiency = wo.targetQty > 0 ? ((wo.completedQty / wo.targetQty) * 100).toFixed(1) : "0";
    const stagesHtml = wo.stages.map((s: any, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td style="font-weight:600">${s.stageName}</td>
        <td style="text-align:center">${s.assignedTo || '-'}</td>
        <td style="text-align:center">${s.completedQty}</td>
        <td style="text-align:center">${s.rejectedQty}</td>
        <td style="text-align:center;font-weight:700;color:${s.status === 'Completed' ? '#059669' : '#d97706'}">${s.status}</td>
      </tr>
    `).join("");
    const materialsHtml = wo.materials.map((m: any) => `
      <tr>
        <td style="font-weight:600">${m.materialName}</td>
        <td style="text-align:center">${m.requiredQty} ${m.unit}</td>
        <td style="text-align:center">${m.consumedQty} ${m.unit}</td>
        <td style="text-align:right">₹${Number(m.totalCost).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
        <td style="text-align:center;font-weight:700;color:#2563eb">${m.status}</td>
      </tr>
    `).join("");
    pwin.document.write(`<!DOCTYPE html><html><head><title>Job Card ${wo.woNumber}</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;margin:28px;color:#0f172a}.header{display:flex;justify-content:space-between;border-bottom:2px solid #0f172a;padding-bottom:14px;margin-bottom:20px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}.card-title{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px}table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px}th{background:#f1f5f9;padding:7px 10px;text-align:left;font-weight:700;border-bottom:1px solid #cbd5e1}td{padding:7px 10px;border-bottom:1px solid #f1f5f9}.badge{display:inline-block;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700}.footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:16px;display:flex;justify-content:space-between;font-size:10px;color:#64748b}@media print{body{margin:0}}</style></head><body>
<div class="header"><div><h2 style="margin:0;font-size:18px;font-weight:800">PRODUCTION JOB CARD</h2><div style="font-size:12px;color:#64748b;margin-top:2px">Manufacturing Work Order & Stage Tracker</div><span class="badge" style="background:${STATUS_CONFIG[wo.status]?.bg || '#f1f5f9'};color:${STATUS_CONFIG[wo.status]?.color || '#64748b'};margin-top:6px">${wo.status.toUpperCase()}</span></div>
<div style="text-align:right"><div style="font-size:16px;font-weight:800;color:#2563eb">${wo.woNumber}</div><div style="font-size:12px;color:#64748b">Sector: ${wo.sector}</div><div style="font-size:12px;color:#64748b">Priority: ${wo.priority}</div></div></div>
<div class="grid"><div class="card"><div class="card-title">Product / Job Details</div><div style="font-size:14px;font-weight:800">${wo.finishedGoodsName}</div><div style="font-size:12px;color:#475569;margin-top:3px">${wo.title}</div><div style="font-size:12px;color:#64748b;margin-top:4px">Target Qty: <strong>${wo.targetQty} units</strong></div><div style="font-size:12px;color:#059669">Completed: <strong>${wo.completedQty} units</strong></div><div style="font-size:12px;color:#dc2626">Rejected: <strong>${wo.rejectedQty} units</strong></div></div>
<div class="card"><div class="card-title">Schedule & Costing</div><div style="font-size:12px">Start: <strong>${wo.plannedStartDate ? new Date(wo.plannedStartDate).toLocaleDateString('en-GB') : 'N/A'}</strong></div><div style="font-size:12px">End: <strong>${wo.plannedEndDate ? new Date(wo.plannedEndDate).toLocaleDateString('en-GB') : 'N/A'}</strong></div><div style="font-size:12px;margin-top:6px">Est. Cost: <strong>₹${Number(wo.estimatedCost).toLocaleString('en-IN')}</strong></div><div style="font-size:12px">Current Stage: <strong>${wo.currentStage}</strong></div><div style="font-size:12px">Efficiency: <strong>${efficiency}%</strong></div></div></div>
<h4 style="font-size:12px;font-weight:700;color:#334155;margin:16px 0 8px">PRODUCTION STAGES</h4>
<table><thead><tr><th>#</th><th>Stage</th><th style="text-align:center">Assigned To</th><th style="text-align:center">Completed</th><th style="text-align:center">Rejected</th><th style="text-align:center">Status</th></tr></thead><tbody>${stagesHtml}</tbody></table>
<h4 style="font-size:12px;font-weight:700;color:#334155;margin:16px 0 8px">RAW MATERIALS / COMPONENTS</h4>
<table><thead><tr><th>Material</th><th style="text-align:center">Required</th><th style="text-align:center">Consumed</th><th style="text-align:right">Cost</th><th style="text-align:center">Status</th></tr></thead><tbody>${materialsHtml}</tbody></table>
${wo.notes ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;font-size:12px;margin-bottom:16px"><strong>Notes:</strong> ${wo.notes}</div>` : ''}
<div class="footer"><div>Generated by Antigravity ERP — Production & Workshop Suite</div><div>Verified by: _________________________ | Date: _______</div></div>
<script>window.onload=function(){window.print()}</script></body></html>`);
    pwin.document.close();
  };

  const kpis = [
    { label: "Active Work Orders", value: summary.active, color: "#d97706", bg: "#fef3c7", icon: PlayCircle },
    { label: "Completed", value: summary.completed, color: "#059669", bg: "#dcfce7", icon: CheckCircle2 },
    { label: "Units In Production", value: (summary.totalTargetQty - summary.totalCompletedQty - summary.totalRejectedQty).toLocaleString("en-IN"), color: "#2563eb", bg: "#dbeafe", icon: Boxes },
    { label: "Units Finished", value: summary.totalCompletedQty.toLocaleString("en-IN"), color: "#059669", bg: "#d1fae5", icon: TrendingUp },
    { label: "WIP Capital Value", value: `₹${Number(summary.wipValue).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, color: "#7c3aed", bg: "#ede9fe", icon: BarChart3 },
    { label: "Efficiency Rate", value: `${summary.efficiencyRate}%`, color: "#0891b2", bg: "#cffafe", icon: TrendingUp },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: "100%", fontFamily: "var(--font-sans, system-ui)" }}>

      {/* PAGE HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(79,70,229,0.3)" }}>
            <Factory size={26} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary, #0f172a)" }}>
              Production & Workshop
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-muted, #64748b)" }}>
              Universal Manufacturing Suite — Apparel, Electronics, FMCG, Fabrication & More
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => setShowBomManager(true)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", border: "1.5px solid #cbd5e1", backgroundColor: "#ffffff", color: "#334155", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}>
            <BookOpen size={15} /> Bill of Materials
          </button>
          <button onClick={() => setShowCreateWO(true)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", color: "#ffffff", fontSize: "0.86rem", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(79,70,229,0.25)" }}>
            <Plus size={17} /> New Work Order
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} style={{ backgroundColor: "#ffffff", border: "1px solid var(--border, #e2e8f0)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted, #64748b)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{kpi.label}</span>
              <div style={{ width: "30px", height: "30px", borderRadius: "8px", backgroundColor: kpi.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <kpi.icon size={16} color={kpi.color} />
              </div>
            </div>
            <span style={{ fontSize: "1.4rem", fontWeight: 800, color: kpi.color, fontVariantNumeric: "tabular-nums" }}>{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* SECTOR FILTER TABS */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "18px", overflowX: "auto", paddingBottom: "4px" }}>
        {SECTORS.map(s => {
          const active = sectorFilter === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setSectorFilter(s.key)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "7px 14px", borderRadius: "8px", border: `1.5px solid ${active ? s.color : "#e2e8f0"}`,
                backgroundColor: active ? s.color : "#ffffff",
                color: active ? "#ffffff" : "#475569",
                fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                boxShadow: active ? `0 4px 12px ${s.color}30` : "none", transition: "all 0.15s ease"
              }}
            >
              <s.icon size={14} /> {s.label}
            </button>
          );
        })}
      </div>

      {/* SEARCH & STATUS FILTER */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "18px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Search Work Orders, products, stages..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: "100%", height: "40px", paddingLeft: "36px", paddingRight: "12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "0.84rem", color: "#0f172a", outline: "none", backgroundColor: "#ffffff", boxSizing: "border-box" }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ height: "40px", padding: "0 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "0.84rem", fontWeight: 600, color: "#0f172a", backgroundColor: "#ffffff", outline: "none" }}
        >
          <option value="All">All Statuses</option>
          {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* WORK ORDERS TABLE */}
      <div style={{ backgroundColor: "#ffffff", border: "1.5px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ background: "linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)", borderBottom: "1.5px solid #e2e8f0" }}>
                {["Work Order", "Title / Product", "Sector", "Progress", "Stage", "Dates", "Est. Cost", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "60px", color: "#94a3b8" }}>
                    <Factory size={40} style={{ margin: "0 auto 12px", opacity: 0.3, display: "block" }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No Work Orders found</p>
                    <p style={{ margin: "4px 0 0", fontSize: "0.78rem" }}>Click "New Work Order" to create your first manufacturing job</p>
                  </td>
                </tr>
              ) : filteredOrders.map(wo => {
                const statusCfg = STATUS_CONFIG[wo.status] || STATUS_CONFIG["Draft"];
                const progress = wo.targetQty > 0 ? Math.min(100, (wo.completedQty / wo.targetQty) * 100) : 0;
                const sectorCfg = SECTORS.find(s => s.key === wo.sector) || SECTORS[SECTORS.length - 1];
                const isDeleting = deletingId === wo.id;

                return (
                  <tr key={wo.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.12s" }} onMouseEnter={e => e.currentTarget.style.background = "#fafafa"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "12px", fontWeight: 800, color: "#2563eb", whiteSpace: "nowrap" }}>
                      {wo.woNumber}
                      <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 500, marginTop: "1px" }}>P:{wo.priority}</div>
                    </td>
                    <td style={{ padding: "12px", maxWidth: "200px" }}>
                      <div style={{ fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wo.finishedGoodsName}</div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wo.title}</div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "5px", backgroundColor: sectorCfg.color + "18", color: sectorCfg.color, fontSize: "0.72rem", fontWeight: 700 }}>
                        <sectorCfg.icon size={11} /> {wo.sector}
                      </span>
                    </td>
                    <td style={{ padding: "12px", minWidth: "120px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#64748b", marginBottom: "4px" }}>
                        <span>{wo.completedQty}/{wo.targetQty}</span>
                        <span style={{ fontWeight: 700, color: progress >= 100 ? "#059669" : "#d97706" }}>{progress.toFixed(0)}%</span>
                      </div>
                      <div style={{ height: "6px", backgroundColor: "#f1f5f9", borderRadius: "99px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${progress}%`, borderRadius: "99px", background: progress >= 100 ? "linear-gradient(90deg,#059669,#10b981)" : "linear-gradient(90deg,#4f46e5,#7c3aed)", transition: "width 0.3s" }} />
                      </div>
                    </td>
                    <td style={{ padding: "12px", color: "#475569", fontWeight: 600, whiteSpace: "nowrap", fontSize: "0.78rem" }}>
                      {wo.currentStage}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.72rem", color: "#64748b", whiteSpace: "nowrap" }}>
                      {wo.plannedStartDate ? new Date(wo.plannedStartDate).toLocaleDateString("en-GB") : "–"}
                      <div>{wo.plannedEndDate ? new Date(wo.plannedEndDate).toLocaleDateString("en-GB") : "–"}</div>
                    </td>
                    <td style={{ padding: "12px", fontWeight: 700, color: "#0f172a", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                      ₹{Number(wo.estimatedCost).toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: "5px", backgroundColor: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}`, fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {wo.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                        <button title="View Details" onClick={() => setViewWorkOrder(wo)} style={{ padding: "5px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#fff", color: "#2563eb", cursor: "pointer" }}>
                          <Eye size={14} />
                        </button>
                        <button title="Print Job Card" onClick={() => handlePrint(wo)} style={{ padding: "5px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer" }}>
                          <Printer size={14} />
                        </button>
                        <button title="Worker Piece-Rate Log" onClick={() => setShowPieceRateModal(wo)} style={{ padding: "5px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#fff", color: "#7c3aed", cursor: "pointer" }}>
                          <Users size={14} />
                        </button>
                        {wo.status !== "Completed" && wo.status !== "Cancelled" && (
                          <button title="Complete Work Order" onClick={() => handleComplete(wo)} style={{ padding: "5px 8px", borderRadius: "6px", border: "none", background: "#059669", color: "#fff", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}>
                            <CheckCircle2 size={13} /> Done
                          </button>
                        )}
                        <button title="Delete" disabled={isDeleting} onClick={() => handleDeleteWO(wo)} style={{ padding: "5px", borderRadius: "6px", border: "1px solid #fecdd3", background: "#fff1f2", color: "#e11d48", cursor: isDeleting ? "wait" : "pointer" }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {showCreateWO && (
        <CreateWorkOrderModal
          products={products}
          boms={boms}
          employees={employees}
          onClose={() => setShowCreateWO(false)}
          onCreated={(newWO) => {
            setWorkOrders(prev => [newWO, ...prev]);
            setSummary((prev: any) => ({ ...prev, total: prev.total + 1, active: prev.active + 1 }));
            setShowCreateWO(false);
          }}
        />
      )}

      {viewWorkOrder && (
        <WorkOrderDetailModal
          workOrder={viewWorkOrder}
          onClose={() => setViewWorkOrder(null)}
          onPrint={() => handlePrint(viewWorkOrder)}
          onComplete={() => handleComplete(viewWorkOrder)}
          onUpdated={(updated) => setWorkOrders(prev => prev.map(w => w.id === updated.id ? updated : w))}
        />
      )}

      {showBomManager && (
        <BomManagerModal
          boms={boms}
          products={products}
          onClose={() => setShowBomManager(false)}
          onSaved={(updatedBoms) => setBoms(updatedBoms)}
        />
      )}

      {showPieceRateModal && (
        <PieceRateLedgerModal
          workOrder={showPieceRateModal}
          employees={employees}
          onClose={() => setShowPieceRateModal(null)}
          onLogged={(log) => {
            setWorkOrders(prev => prev.map(w =>
              w.id === showPieceRateModal.id
                ? { ...w, workerLogs: [...w.workerLogs, log] }
                : w
            ));
          }}
        />
      )}
    </div>
  );
}
