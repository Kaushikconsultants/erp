"use client";

import React, { useState } from "react";
import {
  X, Factory, CheckCircle2, PlayCircle, Clock, Boxes, Package2,
  ChevronRight, Users, Layers, TrendingUp, AlertCircle, Edit2
} from "lucide-react";
import { updateWorkOrderStage } from "@/app/actions/productionActions";

interface Props {
  workOrder: any;
  onClose: () => void;
  onPrint: () => void;
  onComplete: () => void;
  onUpdated: (updated: any) => void;
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  Pending:      { color: "#64748b", bg: "#f1f5f9" },
  "In Progress":{ color: "#d97706", bg: "#fef3c7" },
  Completed:    { color: "#059669", bg: "#d1fae5" },
  Skipped:      { color: "#7c3aed", bg: "#ede9fe" },
};

export default function WorkOrderDetailModal({ workOrder, onClose, onPrint, onComplete, onUpdated }: Props) {
  const [stages, setStages] = useState<any[]>(workOrder.stages);
  const [updatingStageId, setUpdatingStageId] = useState<string | null>(null);
  const [editingStage, setEditingStage] = useState<any | null>(null);
  const [editCompletedQty, setEditCompletedQty] = useState("");
  const [editRejectedQty, setEditRejectedQty] = useState("0");
  const [editStatus, setEditStatus] = useState("In Progress");
  const [editRemarks, setEditRemarks] = useState("");

  const progress = workOrder.targetQty > 0 ? Math.min(100, (workOrder.completedQty / workOrder.targetQty) * 100) : 0;
  const efficiency = workOrder.targetQty > 0
    ? ((workOrder.completedQty / workOrder.targetQty) * 100).toFixed(1)
    : "0";
  const totalWages = (workOrder.workerLogs || []).reduce((acc: number, l: any) => acc + l.earnedAmount, 0);
  const materialCost = (workOrder.materials || []).reduce((acc: number, m: any) => acc + m.totalCost, 0);

  const variantData = (() => {
    try { return workOrder.variantMatrix ? JSON.parse(workOrder.variantMatrix) : null; }
    catch { return null; }
  })();

  const handleSaveStage = async () => {
    if (!editingStage) return;
    setUpdatingStageId(editingStage.id);
    const res = await updateWorkOrderStage({
      workOrderId: workOrder.id,
      stageId: editingStage.id,
      completedQty: parseFloat(editCompletedQty) || 0,
      rejectedQty: parseFloat(editRejectedQty) || 0,
      status: editStatus,
      remarks: editRemarks || undefined
    });
    setUpdatingStageId(null);
    if (res.error) { alert("Error: " + res.error); return; }
    const updatedStage = res.stage;
    const newStages = stages.map(s => s.id === updatedStage.id ? updatedStage : s);
    setStages(newStages);
    setEditingStage(null);
    onUpdated({ ...workOrder, stages: newStages });
  };

  const infoCard = (label: string, value: string | number, color?: string) => (
    <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px" }}>
      <div style={{ fontSize: "0.68rem", color: "var(--text-secondary, #64748b)", fontWeight: 500, marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
      <div style={{ fontSize: "0.95rem", fontWeight: 600, color: color || "var(--text-primary, #0f172a)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "16px" }} onClick={onClose}>
      <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", width: "100%", maxWidth: "880px", maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", background: "linear-gradient(180deg,#f8fafc,#f1f5f9)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Factory size={20} color="#fff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary, #0f172a)" }}>{workOrder.woNumber}</span>
                <span style={{ padding: "2px 7px", borderRadius: "5px", backgroundColor: "#ede9fe", color: "#7c3aed", fontSize: "0.7rem", fontWeight: 500 }}>{workOrder.sector}</span>
                <span style={{ padding: "2px 7px", borderRadius: "5px", backgroundColor: "#fef3c7", color: "#d97706", fontSize: "0.7rem", fontWeight: 500 }}>{workOrder.priority} Priority</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary, #475569)", fontWeight: 400, marginTop: "1px" }}>{workOrder.finishedGoodsName} — {workOrder.title}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={onPrint} style={{ padding: "6px 12px", borderRadius: "7px", border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#475569", fontSize: "0.78rem", fontWeight: 500, cursor: "pointer" }}>🖨 Print Job Card</button>
            {workOrder.status !== "Completed" && workOrder.status !== "Cancelled" && (
              <button onClick={onComplete} style={{ padding: "6px 12px", borderRadius: "7px", border: "none", backgroundColor: "#059669", color: "#fff", fontSize: "0.78rem", fontWeight: 500, cursor: "pointer" }}>✅ Complete WO</button>
            )}
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={20} /></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

          {/* KPI Overview */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px", marginBottom: "18px" }}>
            {infoCard("Target Qty", `${workOrder.targetQty} units`)}
            {infoCard("Completed", `${workOrder.completedQty} units`, "#059669")}
            {infoCard("Rejected", `${workOrder.rejectedQty} units`, "#dc2626")}
            {infoCard("Efficiency", `${efficiency}%`, parseFloat(efficiency) >= 80 ? "#059669" : "#d97706")}
            {infoCard("Material Cost", `₹${materialCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, "#0284c7")}
            {infoCard("Wages Payable", `₹${totalWages.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, "#7c3aed")}
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#64748b", marginBottom: "6px" }}>
              <span style={{ fontWeight: 500, color: "var(--text-secondary, #64748b)" }}>Overall Production Progress</span>
              <span style={{ fontWeight: 600, color: "var(--accent-primary, #4f46e5)" }}>{progress.toFixed(1)}%</span>
            </div>
            <div style={{ height: "10px", backgroundColor: "#f1f5f9", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, borderRadius: "99px", background: "linear-gradient(90deg,#4f46e5,#7c3aed)", transition: "width 0.5s ease" }} />
            </div>
          </div>

          {/* Variant / Size Matrix */}
          {variantData && (
            <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: "0.78rem", fontWeight: 600, color: "#1e40af" }}>📐 Size / Variant Breakdown</h4>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {Object.entries(variantData).map(([size, qty]: any) => (
                  <div key={size} style={{ backgroundColor: "#ffffff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "8px 14px", textAlign: "center", minWidth: "60px" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary, #64748b)", fontWeight: 500 }}>{size}</div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1e40af", fontVariantNumeric: "tabular-nums" }}>{qty}</div>
                  </div>
                ))}
                <div style={{ backgroundColor: "#1e40af", border: "1px solid #1e40af", borderRadius: "8px", padding: "8px 14px", textAlign: "center", minWidth: "60px" }}>
                  <div style={{ fontSize: "0.7rem", color: "#93c5fd", fontWeight: 500 }}>TOTAL</div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "#ffffff", fontVariantNumeric: "tabular-nums" }}>
                    {(Object.values(variantData).reduce((a: any, b: any) => a + b, 0) as number)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stage Tracker */}
          <div style={{ marginBottom: "18px" }}>
            <h4 style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-secondary, #64748b)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Production Stages</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {stages.map((stage, i) => {
                const cfg = STATUS_COLORS[stage.status] || STATUS_COLORS["Pending"];
                const isEditing = editingStage?.id === stage.id;
                return (
                  <div key={stage.id} style={{ border: `1.5px solid ${stage.status === "Completed" ? "#6ee7b7" : "#e2e8f0"}`, borderRadius: "10px", overflow: "hidden", backgroundColor: stage.status === "Completed" ? "#f0fdf4" : "#ffffff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "26px", height: "26px", borderRadius: "50%", backgroundColor: cfg.bg, border: `1px solid ${cfg.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: "0.72rem", color: cfg.color, flexShrink: 0 }}>{i + 1}</div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: "0.84rem", color: "var(--text-primary, #0f172a)" }}>{stage.stageName}</div>
                          {stage.assignedTo && <div style={{ fontSize: "0.7rem", color: "#64748b" }}>👤 {stage.assignedTo}</div>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ display: "flex", gap: "16px", fontSize: "0.76rem" }}>
                          <span style={{ color: "#059669", fontWeight: 500 }}>✓ {stage.completedQty}</span>
                          <span style={{ color: "#dc2626", fontWeight: 500 }}>✗ {stage.rejectedQty}</span>
                        </div>
                        <span style={{ padding: "3px 8px", borderRadius: "5px", backgroundColor: cfg.bg, color: cfg.color, fontSize: "0.7rem", fontWeight: 500 }}>{stage.status}</span>
                        {stage.status !== "Completed" && (
                          <button onClick={() => {
                            setEditingStage(stage);
                            setEditCompletedQty(String(stage.completedQty));
                            setEditRejectedQty(String(stage.rejectedQty));
                            setEditStatus(stage.status === "Pending" ? "In Progress" : stage.status);
                            setEditRemarks(stage.remarks || "");
                          }} style={{ padding: "4px 8px", borderRadius: "5px", border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "var(--accent-primary, #4f46e5)", fontSize: "0.72rem", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}>
                            <Edit2 size={11} /> Update
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div style={{ borderTop: "1px solid #e2e8f0", padding: "12px 14px", backgroundColor: "#fafafa" }}>
                        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
                          <div>
                            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 500, color: "var(--text-secondary, #64748b)", marginBottom: "3px" }}>Completed Qty</label>
                            <input type="number" value={editCompletedQty} onChange={e => setEditCompletedQty(e.target.value)} style={{ width: "90px", height: "34px", padding: "0 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.84rem", textAlign: "center", fontWeight: 400 }} />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 500, color: "var(--text-secondary, #64748b)", marginBottom: "3px" }}>Rejected Qty</label>
                            <input type="number" value={editRejectedQty} onChange={e => setEditRejectedQty(e.target.value)} style={{ width: "90px", height: "34px", padding: "0 8px", borderRadius: "6px", border: "1px solid #fecdd3", fontSize: "0.84rem", textAlign: "center", fontWeight: 400, color: "#dc2626" }} />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 500, color: "var(--text-secondary, #64748b)", marginBottom: "3px" }}>Status</label>
                            <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ height: "34px", padding: "0 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.82rem", fontWeight: 400 }}>
                              {["In Progress","Completed","Skipped"].map(s => <option key={s}>{s}</option>)}
                            </select>
                          </div>
                          <div style={{ flex: 1, minWidth: "150px" }}>
                            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 500, color: "var(--text-secondary, #64748b)", marginBottom: "3px" }}>Remarks</label>
                            <input type="text" value={editRemarks} onChange={e => setEditRemarks(e.target.value)} placeholder="Optional remarks..." style={{ width: "100%", height: "34px", padding: "0 8px", borderRadius: "6px", border: "1.5px solid #cbd5e1", fontSize: "0.8rem", boxSizing: "border-box" as const }} />
                          </div>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button onClick={() => setEditingStage(null)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#475569", fontSize: "0.78rem", fontWeight: 400, cursor: "pointer" }}>Cancel</button>
                            <button onClick={handleSaveStage} disabled={!!updatingStageId} style={{ padding: "6px 14px", borderRadius: "6px", border: "none", backgroundColor: "#059669", color: "#fff", fontSize: "0.78rem", fontWeight: 500, cursor: updatingStageId ? "wait" : "pointer" }}>
                              {updatingStageId === stage.id ? "Saving..." : "Save Stage"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Materials */}
          {workOrder.materials.length > 0 && (
            <div style={{ marginBottom: "18px" }}>
              <h4 style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-secondary, #64748b)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Raw Materials / Components</h4>
              <div style={{ border: "1.5px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead style={{ background: "linear-gradient(180deg,#f8fafc,#f1f5f9)", borderBottom: "1.5px solid #e2e8f0" }}>
                    <tr>
                      {["Material", "Unit", "Required", "Allocated", "Consumed", "Cost", "Status"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 500, color: "var(--text-secondary, #64748b)", fontSize: "0.72rem" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {workOrder.materials.map((mat: any, i: number) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 500, color: "var(--text-primary, #0f172a)" }}>{mat.materialName}</td>
                        <td style={{ padding: "8px 10px", color: "#64748b" }}>{mat.unit}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>{mat.requiredQty}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", color: "#2563eb" }}>{mat.allocatedQty}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", color: "#7c3aed" }}>{mat.consumedQty}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>₹{Number(mat.totalCost).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "#f1f5f9", color: "#475569", fontSize: "0.68rem", fontWeight: 400 }}>{mat.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Worker Logs Summary */}
          {workOrder.workerLogs.length > 0 && (
            <div>
              <h4 style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-secondary, #64748b)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Worker Production Logs ({workOrder.workerLogs.length})</h4>
              <div style={{ border: "1.5px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead style={{ background: "linear-gradient(180deg,#f8fafc,#f1f5f9)", borderBottom: "1.5px solid #e2e8f0" }}>
                    <tr>
                      {["Date", "Worker", "Operation", "Produced", "Rejected", "Rate", "Wages"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 500, color: "var(--text-secondary, #64748b)", fontSize: "0.72rem" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {workOrder.workerLogs.map((log: any, i: number) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 10px", color: "#475569" }}>{new Date(log.logDate).toLocaleDateString("en-GB")}</td>
                        <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0f172a" }}>{log.workerName}</td>
                        <td style={{ padding: "8px 10px", color: "#475569" }}>{log.operation}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 500, color: "#059669" }}>{log.qtyProduced}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", color: "#dc2626" }}>{log.qtyRejected}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>₹{Number(log.pieceRate).toFixed(2)}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: "#7c3aed", fontVariantNumeric: "tabular-nums" }}>₹{Number(log.earnedAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: "#faf5ff", borderTop: "1.5px solid #c4b5fd" }}>
                      <td colSpan={6} style={{ padding: "8px 10px", fontWeight: 500, color: "#7c3aed", textAlign: "right" }}>Total Wages Payable:</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#7c3aed", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>₹{totalWages.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {workOrder.notes && (
            <div style={{ marginTop: "14px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", fontSize: "0.82rem", color: "#475569" }}>
              <strong>Notes:</strong> {workOrder.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
