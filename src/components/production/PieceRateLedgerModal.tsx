"use client";

import React, { useState } from "react";
import { X, Users, Plus, CheckCircle2, Clock, TrendingUp, IndianRupee } from "lucide-react";
import { logWorkerPieceRate } from "@/app/actions/productionActions";

interface Props {
  workOrder: any;
  employees: any[];
  onClose: () => void;
  onLogged: (log: any) => void;
}

export default function PieceRateLedgerModal({ workOrder, employees, onClose, onLogged }: Props) {
  const [workerName, setWorkerName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [operation, setOperation] = useState("");
  const [qtyProduced, setQtyProduced] = useState("");
  const [qtyRejected, setQtyRejected] = useState("0");
  const [pieceRate, setPieceRate] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const totalLogs = workOrder.workerLogs || [];
  const totalEarned = totalLogs.reduce((acc: number, l: any) => acc + l.earnedAmount, 0);
  const totalProduced = totalLogs.reduce((acc: number, l: any) => acc + l.qtyProduced, 0);

  const handleEmployeeChange = (id: string) => {
    setEmployeeId(id);
    const emp = employees.find((e: any) => e.id === id);
    if (emp) setWorkerName(emp.user?.name || emp.department || 'Worker');
  };

  const earned = (parseFloat(qtyProduced) || 0) * (parseFloat(pieceRate) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName.trim()) { alert("Enter worker name."); return; }
    if (!operation.trim()) { alert("Enter operation name."); return; }
    if (!qtyProduced || parseFloat(qtyProduced) <= 0) { alert("Enter quantity produced."); return; }
    if (!pieceRate || parseFloat(pieceRate) < 0) { alert("Enter piece rate."); return; }

    setSaving(true);
    const res = await logWorkerPieceRate({
      workOrderId: workOrder.id,
      workerName,
      employeeId: employeeId || undefined,
      operation,
      qtyProduced: parseFloat(qtyProduced),
      qtyRejected: parseFloat(qtyRejected) || 0,
      pieceRate: parseFloat(pieceRate),
      logDate,
      notes: notes || undefined
    });
    setSaving(false);

    if (res.error) { alert("Error: " + res.error); return; }
    onLogged(res.log);

    // Reset form
    setOperation("");
    setQtyProduced("");
    setQtyRejected("0");
    setPieceRate("");
    setNotes("");
  };

  const inputStyle = {
    width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px",
    border: "1.5px solid #cbd5e1", fontSize: "0.84rem", fontWeight: 600, color: "#0f172a",
    outline: "none", backgroundColor: "#ffffff", boxSizing: "border-box" as const
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "16px" }} onClick={onClose}>
      <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", width: "100%", maxWidth: "760px", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "9px", backgroundColor: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={18} color="#7c3aed" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>Worker Piece-Rate Ledger</h3>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748b" }}>{workOrder.woNumber} — {workOrder.finishedGoodsName}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* KPI Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            {[
              { label: "Total Logs", value: totalLogs.length, icon: Clock, color: "#2563eb", bg: "#dbeafe" },
              { label: "Total Units Produced", value: totalProduced.toLocaleString("en-IN"), icon: TrendingUp, color: "#059669", bg: "#d1fae5" },
              { label: "Total Wages Earned", value: `₹${totalEarned.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, icon: IndianRupee, color: "#7c3aed", bg: "#ede9fe" }
            ].map(kpi => (
              <div key={kpi.label} style={{ backgroundColor: kpi.bg, borderRadius: "10px", padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.7rem", color: kpi.color, fontWeight: 700, marginBottom: "4px" }}>{kpi.label}</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: kpi.color, fontVariantNumeric: "tabular-nums" }}>{kpi.value}</div>
                </div>
                <kpi.icon size={22} color={kpi.color} />
              </div>
            ))}
          </div>

          {/* Add Log Form */}
          <form onSubmit={handleSubmit} style={{ backgroundColor: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "16px" }}>
            <h4 style={{ margin: "0 0 14px", fontSize: "0.82rem", fontWeight: 800, color: "#334155" }}>+ LOG WORKER PRODUCTION</h4>

            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "12px", marginBottom: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>LINK TO EMPLOYEE (OPTIONAL)</label>
                <select value={employeeId} onChange={e => handleEmployeeChange(e.target.value)} style={inputStyle}>
                  <option value="">— External Contractor / Worker —</option>
                  {employees.map((e: any) => <option key={e.id} value={e.id}>{e.user?.name || 'Employee'} ({e.department || 'General'})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>WORKER NAME *</label>
                <input type="text" value={workerName} onChange={e => setWorkerName(e.target.value)} placeholder="e.g. Ramesh Kumar, Ahmed Karigar" required style={inputStyle} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.8fr 0.8fr 0.8fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>OPERATION / TASK *</label>
                <input type="text" value={operation} onChange={e => setOperation(e.target.value)} placeholder="e.g. Stitching, PCB Soldering, Filling" required style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>QTY PRODUCED *</label>
                <input type="number" value={qtyProduced} onChange={e => setQtyProduced(e.target.value)} placeholder="0" min="1" required style={{ ...inputStyle, textAlign: "center", fontVariantNumeric: "tabular-nums" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>QTY REJECTED</label>
                <input type="number" value={qtyRejected} onChange={e => setQtyRejected(e.target.value)} placeholder="0" min="0" style={{ ...inputStyle, textAlign: "center", color: "#dc2626" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>PIECE RATE (₹/unit) *</label>
                <input type="number" value={pieceRate} onChange={e => setPieceRate(e.target.value)} placeholder="e.g. 3.50" step="0.01" min="0" required style={{ ...inputStyle, textAlign: "right" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>LOG DATE</label>
                <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "0.84rem" }}>
                Wages Earned: <strong style={{ color: "#7c3aed", fontSize: "1.05rem", fontVariantNumeric: "tabular-nums" }}>₹{earned.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
              </div>
              <button type="submit" disabled={saving} style={{ padding: "8px 18px", borderRadius: "8px", border: "none", backgroundColor: "#7c3aed", color: "#fff", fontSize: "0.82rem", fontWeight: 700, cursor: saving ? "wait" : "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                <Plus size={15} /> {saving ? "Saving..." : "Log Production"}
              </button>
            </div>
          </form>

          {/* Existing Logs Table */}
          {totalLogs.length > 0 && (
            <div>
              <h4 style={{ fontSize: "0.8rem", fontWeight: 800, color: "#334155", margin: "0 0 10px" }}>PRODUCTION LOG HISTORY ({totalLogs.length} entries)</h4>
              <div style={{ border: "1.5px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead style={{ background: "linear-gradient(180deg,#f8fafc,#f1f5f9)", borderBottom: "1.5px solid #e2e8f0" }}>
                    <tr>
                      {["Date", "Worker", "Operation", "Produced", "Rejected", "Rate", "Wages Earned"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: "0.7rem", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {totalLogs.map((log: any, i: number) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 10px", color: "#475569" }}>{new Date(log.logDate).toLocaleDateString("en-GB")}</td>
                        <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0f172a" }}>{log.workerName}</td>
                        <td style={{ padding: "8px 10px", color: "#475569" }}>{log.operation}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "#059669" }}>{log.qtyProduced}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", color: "#dc2626" }}>{log.qtyRejected}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: "#475569", fontVariantNumeric: "tabular-nums" }}>₹{Number(log.pieceRate).toFixed(2)}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, color: "#7c3aed", fontVariantNumeric: "tabular-nums" }}>₹{Number(log.earnedAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: "#faf5ff", borderTop: "1.5px solid #c4b5fd" }}>
                      <td colSpan={5} style={{ padding: "8px 10px", fontWeight: 800, color: "#7c3aed", textAlign: "right" }}>TOTAL WAGES PAYABLE:</td>
                      <td />
                      <td style={{ padding: "8px 10px", fontWeight: 900, color: "#7c3aed", textAlign: "right", fontSize: "0.92rem", fontVariantNumeric: "tabular-nums" }}>₹{totalEarned.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
