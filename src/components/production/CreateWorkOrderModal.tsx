"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, Factory, Calendar, Package2, Layers, Cpu, Wrench, Leaf, AlertCircle } from "lucide-react";
import { createWorkOrder } from "@/app/actions/productionActions";

const SECTOR_STAGES: Record<string, string[]> = {
  Apparel:     ["Fabric Inwarding", "Cutting", "Stitching/Assembly", "Washing & Ironing", "QA Checking", "Packing & Dispatch"],
  Electronics: ["Component Kitting", "PCB Assembly/Soldering", "Sub-Assembly", "Firmware/Testing", "QA Inspection", "Packaging & Labelling"],
  FMCG:        ["Raw Material Receipt", "Compounding/Mixing", "Filling & Sealing", "Labelling", "QA & Batch Check", "Carton Packing"],
  Fabrication: ["Material Cutting/Shearing", "Machining/Forming", "Welding/Joining", "Surface Treatment", "QA Inspection", "Dispatch"],
  General:     ["Stage 1 – Preparation", "Stage 2 – Processing", "Stage 3 – Assembly", "Stage 4 – Quality Check", "Stage 5 – Packing"],
};

const UNITS = ["pcs", "mtr", "kg", "ltr", "roll", "box", "sheet", "set", "pair", "bundle"];

interface Props {
  products: any[];
  boms: any[];
  employees: any[];
  onClose: () => void;
  onCreated: (wo: any) => void;
}

export default function CreateWorkOrderModal({ products, boms, employees, onClose, onCreated }: Props) {
  const [sector, setSector] = useState("General");
  const [title, setTitle] = useState("");
  const [finishedGoodsName, setFinishedGoodsName] = useState("");
  const [productId, setProductId] = useState("");
  const [targetQty, setTargetQty] = useState("100");
  const [priority, setPriority] = useState("Normal");
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [bomId, setBomId] = useState("");
  const [notes, setNotes] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");

  const [stages, setStages] = useState<string[]>(SECTOR_STAGES["General"]);
  const [stageAssignees, setStageAssignees] = useState<string[]>(Array(5).fill(""));
  const [materials, setMaterials] = useState([
    { productId: "", materialName: "", unit: "pcs", requiredQty: 1, unitCost: 0 }
  ]);

  const [variantRows, setVariantRows] = useState([{ label: "Unit", qty: 0 }]);
  const [showVariants, setShowVariants] = useState(false);

  const [saving, setSaving] = useState(false);

  const handleSectorChange = (newSector: string) => {
    setSector(newSector);
    const preset = SECTOR_STAGES[newSector] || SECTOR_STAGES["General"];
    setStages(preset);
    setStageAssignees(Array(preset.length).fill(""));
    setShowVariants(newSector === "Apparel");
    if (newSector === "Apparel") {
      setVariantRows([
        { label: "S", qty: 0 }, { label: "M", qty: 0 }, { label: "L", qty: 0 }, { label: "XL", qty: 0 }
      ]);
    } else {
      setVariantRows([{ label: "Unit", qty: 0 }]);
    }
  };

  const handleProductChange = (id: string) => {
    setProductId(id);
    const p = products.find(p => p.id === id);
    if (p) setFinishedGoodsName(p.name);
  };

  const handleBomChange = (id: string) => {
    setBomId(id);
    if (!id) return;
    const bom = boms.find(b => b.id === id);
    if (bom) {
      setFinishedGoodsName(bom.finishedGoodsName);
      setMaterials(bom.items.map((item: any) => ({
        productId: item.productId || "",
        materialName: item.materialName,
        unit: item.unit,
        requiredQty: Number(item.quantity),
        unitCost: Number(item.unitCost)
      })));
      setEstimatedCost(String(bom.estimatedCostPerUnit * (parseFloat(targetQty) || 1)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finishedGoodsName.trim()) { alert("Please enter the finished goods / product name."); return; }
    if (parseFloat(targetQty) <= 0) { alert("Target quantity must be greater than 0."); return; }
    if (stages.filter(s => s.trim()).length === 0) { alert("Add at least one production stage."); return; }

    setSaving(true);

    const variantMatrix: Record<string, number> = {};
    if (showVariants) {
      variantRows.forEach(r => { if (r.label.trim()) variantMatrix[r.label] = r.qty; });
    }

    const res = await createWorkOrder({
      title: title || `${finishedGoodsName} — ${targetQty} units`,
      sector,
      finishedGoodsName,
      productId: productId || undefined,
      targetQty: parseFloat(targetQty),
      variantMatrix: Object.keys(variantMatrix).length > 0 ? variantMatrix : undefined,
      bomId: bomId || undefined,
      plannedStartDate: plannedStart || undefined,
      plannedEndDate: plannedEnd || undefined,
      priority,
      estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
      notes: notes || undefined,
      stages: stages.filter(s => s.trim()).map((stageName, i) => ({
        stageName,
        stageOrder: i,
        assignedTo: stageAssignees[i] || undefined
      })),
      materials: materials.filter(m => m.materialName.trim()).map(m => ({
        productId: m.productId || undefined,
        materialName: m.materialName,
        unit: m.unit,
        requiredQty: m.requiredQty,
        unitCost: m.unitCost
      }))
    });

    setSaving(false);

    if (res.error) { alert("Error: " + res.error); return; }
    onCreated(res.workOrder);
  };

  const sectorOptions = [
    { key: "Apparel", icon: "🧵" }, { key: "Electronics", icon: "💡" },
    { key: "FMCG", icon: "🧴" }, { key: "Fabrication", icon: "🔩" }, { key: "General", icon: "🏭" }
  ];

  const inputStyle = {
    width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px",
    border: "1px solid #e2e8f0", fontSize: "0.84rem", fontWeight: 400, color: "var(--text-primary, #0f172a)",
    outline: "none", backgroundColor: "#ffffff", boxSizing: "border-box" as const
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "16px" }} onClick={onClose}>
      <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", width: "100%", maxWidth: "860px", maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Factory size={20} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--text-primary, #0f172a)" }}>New Work Order / Job Card</h3>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748b" }}>Universal manufacturing — works for Apparel, Electronics, FMCG, Fabrication & General</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={20} /></button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

          {/* Sector Selector */}
          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, color: "var(--text-secondary, #64748b)", marginBottom: "8px" }}>Manufacturing Sector</label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {sectorOptions.map(s => (
                <button
                  key={s.key} type="button" onClick={() => handleSectorChange(s.key)}
                  style={{
                    padding: "7px 14px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer",
                    border: `1.5px solid ${sector === s.key ? "#4f46e5" : "#e2e8f0"}`,
                    backgroundColor: sector === s.key ? "#4f46e5" : "#ffffff",
                    color: sector === s.key ? "#ffffff" : "#475569",
                    boxShadow: sector === s.key ? "0 2px 8px rgba(79,70,229,0.25)" : "none"
                  }}
                >
                  {s.icon} {s.key}
                </button>
              ))}
            </div>
          </div>

          {/* Row 1 */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "14px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, color: "var(--text-secondary, #64748b)", marginBottom: "4px" }}>Finished Goods / Product Name *</label>
              <input type="text" value={finishedGoodsName} onChange={e => setFinishedGoodsName(e.target.value)} placeholder="e.g. Men's Trackpants / PCB v2.1" required style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, color: "var(--text-secondary, #64748b)", marginBottom: "4px" }}>Link to Product Catalog (Optional)</label>
              <select value={productId} onChange={e => handleProductChange(e.target.value)} style={inputStyle}>
                <option value="">— Select Product —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ""}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, color: "var(--text-secondary, #64748b)", marginBottom: "4px" }}>Use Bill of Materials (Optional)</label>
              <select value={bomId} onChange={e => handleBomChange(e.target.value)} style={inputStyle}>
                <option value="">— Select BOM —</option>
                {boms.map(b => <option key={b.id} value={b.id}>{b.bomCode}: {b.name}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.8fr 0.8fr 1fr 0.8fr", gap: "14px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, color: "var(--text-secondary, #64748b)", marginBottom: "4px" }}>Job Title (Optional)</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Lot 081 — Sports Trackpants Q3" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, color: "var(--text-secondary, #64748b)", marginBottom: "4px" }}>Target Qty *</label>
              <input type="number" value={targetQty} onChange={e => setTargetQty(e.target.value)} min="1" required style={{ ...inputStyle, textAlign: "center", fontVariantNumeric: "tabular-nums" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, color: "var(--text-secondary, #64748b)", marginBottom: "4px" }}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle}>
                {["Low","Normal","High","Urgent"].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 500, color: "var(--text-secondary, #64748b)", marginBottom: "4px" }}>Start Date</label>
                <input type="date" value={plannedStart} onChange={e => setPlannedStart(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 500, color: "var(--text-secondary, #64748b)", marginBottom: "4px" }}>Due Date</label>
                <input type="date" value={plannedEnd} onChange={e => setPlannedEnd(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, color: "var(--text-secondary, #64748b)", marginBottom: "4px" }}>Est. Cost (₹)</label>
              <input type="number" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} placeholder="0.00" style={{ ...inputStyle, textAlign: "right" }} />
            </div>
          </div>

          {/* Variant Matrix (Apparel only) */}
          {showVariants && (
            <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "14px", marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1e40af" }}>📐 Size / Variant Matrix (Apparel)</span>
                <button type="button" onClick={() => setVariantRows([...variantRows, { label: "", qty: 0 }])} style={{ padding: "3px 8px", borderRadius: "5px", border: "1px solid #bfdbfe", backgroundColor: "#fff", color: "#2563eb", fontSize: "0.72rem", fontWeight: 500, cursor: "pointer" }}>+ Add Size</button>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {variantRows.map((v, i) => (
                  <div key={i} style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    <input
                      type="text"
                      placeholder="Size"
                      value={v.label}
                      onChange={e => setVariantRows(prev => prev.map((r, idx) => idx === i ? { ...r, label: e.target.value } : r))}
                      style={{ width: "50px", height: "34px", padding: "0 6px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.8rem", fontWeight: 400, textAlign: "center" }}
                    />
                    <input
                      type="number"
                      placeholder="0"
                      value={v.qty || ""}
                      onChange={e => setVariantRows(prev => prev.map((r, idx) => idx === i ? { ...r, qty: parseInt(e.target.value) || 0 } : r))}
                      style={{ width: "60px", height: "34px", padding: "0 6px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.8rem", fontWeight: 400, textAlign: "center" }}
                    />
                    <button type="button" onClick={() => setVariantRows(prev => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stage Routing */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "0.72rem", fontWeight: 500, color: "var(--text-secondary, #64748b)" }}>Production Stages & Routing</label>
              <button type="button" onClick={() => { setStages([...stages, ""]); setStageAssignees([...stageAssignees, ""]); }} style={{ padding: "3px 10px", borderRadius: "5px", border: "1px solid #e2e8f0", backgroundColor: "#fff", fontSize: "0.72rem", fontWeight: 500, cursor: "pointer", color: "#475569", display: "flex", alignItems: "center", gap: "4px" }}>
                <Plus size={12} /> Add Stage
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "8px" }}>
              {stages.map((stage, i) => (
                <div key={i} style={{ display: "flex", gap: "6px", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "8px 10px" }}>
                  <span style={{ width: "22px", height: "22px", borderRadius: "50%", backgroundColor: "#4f46e5", color: "#fff", fontSize: "0.7rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                  <input
                    type="text"
                    value={stage}
                    onChange={e => setStages(prev => prev.map((s, idx) => idx === i ? e.target.value : s))}
                    placeholder="Stage name..."
                    style={{ flex: 1, height: "30px", padding: "0 8px", borderRadius: "5px", border: "1px solid #e2e8f0", fontSize: "0.78rem", fontWeight: 400, color: "var(--text-primary, #0f172a)" }}
                  />
                  <input
                    type="text"
                    value={stageAssignees[i]}
                    onChange={e => setStageAssignees(prev => prev.map((s, idx) => idx === i ? e.target.value : s))}
                    placeholder="Assigned..."
                    style={{ width: "90px", height: "30px", padding: "0 6px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "0.72rem", color: "#475569" }}
                  />
                  <button type="button" onClick={() => { setStages(prev => prev.filter((_, idx) => idx !== i)); setStageAssignees(prev => prev.filter((_, idx) => idx !== i)); }} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Materials / BOM */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "0.72rem", fontWeight: 500, color: "var(--text-secondary, #64748b)" }}>Raw Materials / Components</label>
              <button type="button" onClick={() => setMaterials([...materials, { productId: "", materialName: "", unit: "pcs", requiredQty: 1, unitCost: 0 }])} style={{ padding: "3px 10px", borderRadius: "5px", border: "1px solid #e2e8f0", backgroundColor: "#fff", fontSize: "0.72rem", fontWeight: 500, cursor: "pointer", color: "#475569", display: "flex", alignItems: "center", gap: "4px" }}>
                <Plus size={12} /> Add Material
              </button>
            </div>
            <div style={{ border: "1.5px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead style={{ background: "linear-gradient(180deg,#f8fafc,#f1f5f9)", borderBottom: "1.5px solid #e2e8f0" }}>
                  <tr>
                    {["Material / Component", "Link to Product", "Unit", "Required Qty", "Unit Cost (₹)", ""].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 500, color: "var(--text-secondary, #64748b)", fontSize: "0.72rem" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "6px 8px" }}>
                        <input type="text" value={m.materialName} onChange={e => setMaterials(prev => prev.map((mat, idx) => idx === i ? { ...mat, materialName: e.target.value } : mat))} placeholder="e.g. Lycra Fabric / Resistor 10kΩ" style={{ width: "100%", height: "34px", padding: "0 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.8rem", fontWeight: 400 }} />
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <select value={m.productId} onChange={e => setMaterials(prev => prev.map((mat, idx) => idx === i ? { ...mat, productId: e.target.value } : mat))} style={{ width: "100%", height: "34px", padding: "0 8px", borderRadius: "6px", border: "1.5px solid #cbd5e1", fontSize: "0.76rem" }}>
                          <option value="">— Optional —</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "6px 6px", width: "80px" }}>
                        <select value={m.unit} onChange={e => setMaterials(prev => prev.map((mat, idx) => idx === i ? { ...mat, unit: e.target.value } : mat))} style={{ width: "100%", height: "34px", padding: "0 6px", borderRadius: "6px", border: "1.5px solid #cbd5e1", fontSize: "0.78rem", textAlign: "center" }}>
                          {UNITS.map(u => <option key={u}>{u}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "6px 6px", width: "90px" }}>
                        <input type="number" value={m.requiredQty} onChange={e => setMaterials(prev => prev.map((mat, idx) => idx === i ? { ...mat, requiredQty: parseFloat(e.target.value) || 0 } : mat))} style={{ width: "100%", height: "34px", padding: "0 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.84rem", fontWeight: 400, textAlign: "center" }} />
                      </td>
                      <td style={{ padding: "6px 6px", width: "100px" }}>
                        <input type="number" value={m.unitCost} onChange={e => setMaterials(prev => prev.map((mat, idx) => idx === i ? { ...mat, unitCost: parseFloat(e.target.value) || 0 } : mat))} style={{ width: "100%", height: "34px", padding: "0 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.84rem", fontWeight: 400, textAlign: "right" }} />
                      </td>
                      <td style={{ padding: "6px", textAlign: "center" }}>
                        <button type="button" onClick={() => setMaterials(prev => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total cost summary */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px", fontSize: "0.82rem" }}>
              <span style={{ color: "#64748b" }}>Total Material Cost:</span>
              <strong style={{ marginLeft: "8px", color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                ₹{materials.reduce((acc, m) => acc + m.requiredQty * m.unitCost, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, color: "var(--text-secondary, #64748b)", marginBottom: "4px" }}>Notes / Special Instructions</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any special quality specs, order reference, client requirements..." style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "0.82rem", color: "#0f172a", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Footer Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 18px", borderRadius: "8px", border: "1.5px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontSize: "0.84rem", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: "10px 24px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#ffffff", fontSize: "0.86rem", fontWeight: 600, cursor: saving ? "wait" : "pointer", boxShadow: "0 2px 8px rgba(79,70,229,0.2)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Factory size={16} /> {saving ? "Creating Work Order..." : "Create Work Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
