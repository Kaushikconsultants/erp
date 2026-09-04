"use client";

import React, { useState } from "react";
import { X, BookOpen, Plus, Trash2, Edit2, Save, ChevronDown } from "lucide-react";
import { saveBom, deleteBom } from "@/app/actions/productionActions";

const UNITS = ["pcs","mtr","kg","ltr","roll","box","sheet","set","pair","bundle","gm","ml"];
const SECTORS = ["Apparel","Electronics","FMCG","Fabrication","General"];

interface Props {
  boms: any[];
  products: any[];
  onClose: () => void;
  onSaved: (updatedBoms: any[]) => void;
}

export default function BomManagerModal({ boms: initialBoms, products, onClose, onSaved }: Props) {
  const [boms, setBoms] = useState<any[]>(initialBoms);
  const [showForm, setShowForm] = useState(false);
  const [editingBom, setEditingBom] = useState<any | null>(null);
  const [expandedBom, setExpandedBom] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [sector, setSector] = useState("General");
  const [finishedGoodsName, setFinishedGoodsName] = useState("");
  const [productId, setProductId] = useState("");
  const [outputQty, setOutputQty] = useState("1");
  const [outputUnit, setOutputUnit] = useState("pcs");
  const [laborCost, setLaborCost] = useState("0");
  const [overheadCost, setOverheadCost] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ productId: "", materialName: "", unit: "pcs", quantity: 1, wastagePercent: 0, unitCost: 0 }]);

  const resetForm = () => {
    setName(""); setSector("General"); setFinishedGoodsName(""); setProductId("");
    setOutputQty("1"); setOutputUnit("pcs"); setLaborCost("0"); setOverheadCost("0");
    setNotes(""); setItems([{ productId: "", materialName: "", unit: "pcs", quantity: 1, wastagePercent: 0, unitCost: 0 }]);
    setEditingBom(null);
  };

  const handleEdit = (bom: any) => {
    setEditingBom(bom);
    setName(bom.name); setSector(bom.sector); setFinishedGoodsName(bom.finishedGoodsName);
    setProductId(bom.productId || ""); setOutputQty(String(bom.outputQty)); setOutputUnit(bom.outputUnit);
    setLaborCost(String(bom.laborCostPerUnit)); setOverheadCost(String(bom.overheadPerUnit));
    setNotes(bom.notes || "");
    setItems(bom.items.map((i: any) => ({
      productId: i.productId || "",
      materialName: i.materialName,
      unit: i.unit,
      quantity: i.quantity,
      wastagePercent: i.wastagePercent,
      unitCost: i.unitCost
    })));
    setShowForm(true);
  };

  const handleDelete = async (bom: any) => {
    if (!confirm(`Are you sure you want to delete BOM "${bom.bomCode} - ${bom.name}"?\n\nThis will remove all associated material components.`)) return;
    setDeletingId(bom.id);
    const res = await deleteBom(bom.id);
    setDeletingId(null);
    if (res.error) {
      alert("Error: " + res.error);
      return;
    }
    const updated = boms.filter(b => b.id !== bom.id);
    setBoms(updated);
    onSaved(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { alert("BOM name required."); return; }
    if (!finishedGoodsName.trim()) { alert("Finished goods name required."); return; }
    if (items.filter(i => i.materialName.trim()).length === 0) { alert("Add at least one material."); return; }

    setSaving(true);
    const res = await saveBom({
      id: editingBom?.id,
      name, sector, finishedGoodsName,
      productId: productId || undefined,
      outputQty: parseFloat(outputQty) || 1,
      outputUnit,
      laborCostPerUnit: parseFloat(laborCost) || 0,
      overheadPerUnit: parseFloat(overheadCost) || 0,
      notes: notes || undefined,
      items: items.filter(i => i.materialName.trim()).map(i => ({
        productId: i.productId || undefined,
        materialName: i.materialName,
        unit: i.unit,
        quantity: i.quantity,
        wastagePercent: i.wastagePercent,
        unitCost: i.unitCost
      }))
    });
    setSaving(false);

    if (res.error) { alert("Error: " + res.error); return; }

    let updatedBoms;
    if (editingBom) {
      updatedBoms = boms.map(b => b.id === editingBom.id ? res.bom : b);
    } else {
      updatedBoms = [res.bom, ...boms];
    }
    setBoms(updatedBoms);
    onSaved(updatedBoms);
    resetForm();
    setShowForm(false);
  };

  const totalMaterialCost = items.reduce((acc, i) => {
    return acc + i.quantity * (1 + i.wastagePercent / 100) * i.unitCost;
  }, 0);
  const totalUnitCost = totalMaterialCost + (parseFloat(laborCost) || 0) + (parseFloat(overheadCost) || 0);

  const inputStyle = {
    width: "100%", height: "36px", padding: "0 10px", borderRadius: "7px",
    border: "1.5px solid #cbd5e1", fontSize: "0.82rem", fontWeight: 600, color: "#0f172a",
    outline: "none", backgroundColor: "#ffffff", boxSizing: "border-box" as const
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "16px" }} onClick={onClose}>
      <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", width: "100%", maxWidth: "900px", maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "9px", backgroundColor: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={18} color="#0284c7" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>Bill of Materials Manager</h3>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748b" }}>Create product recipes for any sector — links materials to finished products for cost and stock tracking</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {!showForm && (
              <button onClick={() => { resetForm(); setShowForm(true); }} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px", border: "none", backgroundColor: "#0284c7", color: "#fff", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>
                <Plus size={14} /> New BOM
              </button>
            )}
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={20} /></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

          {/* BOM Form */}
          {showForm && (
            <form onSubmit={handleSubmit} style={{ backgroundColor: "#f0f9ff", border: "1.5px solid #bae6fd", borderRadius: "12px", padding: "18px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h4 style={{ margin: 0, fontSize: "0.86rem", fontWeight: 800, color: "#0369a1" }}>
                  {editingBom ? `Edit BOM: ${editingBom.bomCode}` : "Create New Bill of Materials"}
                </h4>
                <button type="button" onClick={() => { resetForm(); setShowForm(false); }} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}><X size={16} /></button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>BOM NAME *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Men's Trackpant — Standard" required style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>SECTOR</label>
                  <select value={sector} onChange={e => setSector(e.target.value)} style={inputStyle}>
                    {SECTORS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>FINISHED GOODS NAME *</label>
                  <input type="text" value={finishedGoodsName} onChange={e => setFinishedGoodsName(e.target.value)} placeholder="End product name" required style={inputStyle} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.8fr 0.8fr 0.8fr 0.8fr", gap: "10px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>LINK TO PRODUCT CATALOG</label>
                  <select value={productId} onChange={e => setProductId(e.target.value)} style={inputStyle}>
                    <option value="">— Optional —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>OUTPUT QTY</label>
                  <input type="number" value={outputQty} onChange={e => setOutputQty(e.target.value)} min="1" style={{ ...inputStyle, textAlign: "center" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>OUTPUT UNIT</label>
                  <select value={outputUnit} onChange={e => setOutputUnit(e.target.value)} style={inputStyle}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>LABOR ₹/UNIT</label>
                  <input type="number" value={laborCost} onChange={e => setLaborCost(e.target.value)} min="0" step="0.01" style={{ ...inputStyle, textAlign: "right" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>OVERHEAD ₹/UNIT</label>
                  <input type="number" value={overheadCost} onChange={e => setOverheadCost(e.target.value)} min="0" step="0.01" style={{ ...inputStyle, textAlign: "right" }} />
                </div>
              </div>

              {/* BOM Items */}
              <div style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#334155" }}>MATERIALS / COMPONENTS</span>
                  <button type="button" onClick={() => setItems([...items, { productId: "", materialName: "", unit: "pcs", quantity: 1, wastagePercent: 0, unitCost: 0 }])} style={{ padding: "3px 8px", borderRadius: "5px", border: "1px solid #bae6fd", backgroundColor: "#fff", color: "#0284c7", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}>+ Add</button>
                </div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
                    <thead style={{ background: "#f1f5f9" }}>
                      <tr>
                        {["Material / Component", "Product Link", "Unit", "Qty/Batch", "Wastage%", "Unit Cost ₹", "Total ₹", ""].map(h => (
                          <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: "0.68rem" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "4px 6px" }}>
                            <input type="text" value={item.materialName} onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, materialName: e.target.value } : it))} placeholder="Material name" style={{ width: "100%", height: "30px", padding: "0 6px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "0.76rem", fontWeight: 600 }} />
                          </td>
                          <td style={{ padding: "4px 6px" }}>
                            <select value={item.productId} onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, productId: e.target.value } : it))} style={{ width: "100%", height: "30px", padding: "0 4px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "0.72rem" }}>
                              <option value="">—</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: "4px 4px", width: "70px" }}>
                            <select value={item.unit} onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, unit: e.target.value } : it))} style={{ width: "100%", height: "30px", padding: "0 4px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "0.72rem" }}>
                              {UNITS.map(u => <option key={u}>{u}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: "4px 4px", width: "70px" }}>
                            <input type="number" value={item.quantity} onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, quantity: parseFloat(e.target.value) || 0 } : it))} style={{ width: "100%", height: "30px", padding: "0 6px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "0.76rem", textAlign: "center" }} />
                          </td>
                          <td style={{ padding: "4px 4px", width: "60px" }}>
                            <input type="number" value={item.wastagePercent} onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, wastagePercent: parseFloat(e.target.value) || 0 } : it))} style={{ width: "100%", height: "30px", padding: "0 4px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "0.76rem", textAlign: "center" }} />
                          </td>
                          <td style={{ padding: "4px 4px", width: "80px" }}>
                            <input type="number" value={item.unitCost} onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, unitCost: parseFloat(e.target.value) || 0 } : it))} step="0.01" style={{ width: "100%", height: "30px", padding: "0 6px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "0.76rem", textAlign: "right" }} />
                          </td>
                          <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700, color: "#0f172a", fontSize: "0.78rem", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                            ₹{(item.quantity * (1 + item.wastagePercent / 100) * item.unitCost).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "4px" }}>
                            <button type="button" onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cost summary */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", backgroundColor: "#ffffff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "12px", marginBottom: "12px" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>MATERIAL COST/UNIT</div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0284c7", fontVariantNumeric: "tabular-nums" }}>₹{(totalMaterialCost / (parseFloat(outputQty) || 1)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>LABOR + OVERHEAD/UNIT</div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#7c3aed", fontVariantNumeric: "tabular-nums" }}>₹{(parseFloat(laborCost) + parseFloat(overheadCost)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                </div>
                <div style={{ textAlign: "center", backgroundColor: "#f0fdf4", borderRadius: "6px", padding: "4px" }}>
                  <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>TOTAL COST/UNIT</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#059669", fontVariantNumeric: "tabular-nums" }}>₹{(totalMaterialCost / (parseFloat(outputQty) || 1) + parseFloat(laborCost) + parseFloat(overheadCost)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => { resetForm(); setShowForm(false); }} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#fff", color: "#475569", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: "8px 18px", borderRadius: "8px", border: "none", backgroundColor: "#0284c7", color: "#fff", fontSize: "0.82rem", fontWeight: 700, cursor: saving ? "wait" : "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Save size={14} /> {saving ? "Saving..." : editingBom ? "Update BOM" : "Save BOM"}
                </button>
              </div>
            </form>
          )}

          {/* BOM List */}
          {boms.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px", color: "#94a3b8" }}>
              <BookOpen size={40} style={{ margin: "0 auto 12px", opacity: 0.3, display: "block" }} />
              <p style={{ margin: 0, fontWeight: 600 }}>No BOMs created yet</p>
              <p style={{ margin: "4px 0 0", fontSize: "0.78rem" }}>Create your first Bill of Materials recipe to standardize production costs</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {boms.map(bom => (
                <div key={bom.id} style={{ border: "1.5px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", backgroundColor: "#ffffff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", cursor: "pointer" }} onClick={() => setExpandedBom(expandedBom === bom.id ? null : bom.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ padding: "3px 8px", borderRadius: "5px", backgroundColor: "#e0f2fe", color: "#0284c7", fontSize: "0.72rem", fontWeight: 800 }}>{bom.bomCode}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.86rem" }}>{bom.name}</div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{bom.finishedGoodsName} — {bom.sector} — {bom.outputQty} {bom.outputUnit} output — {bom.items?.length || 0} materials</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Cost/Unit</div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#059669", fontVariantNumeric: "tabular-nums" }}>₹{Number(bom.estimatedCostPerUnit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                      </div>
                      <button title="Edit BOM" onClick={e => { e.stopPropagation(); handleEdit(bom); }} style={{ padding: "5px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#fff", color: "#2563eb", cursor: "pointer" }}><Edit2 size={13} /></button>
                      <button title="Delete BOM" disabled={deletingId === bom.id} onClick={e => { e.stopPropagation(); handleDelete(bom); }} style={{ padding: "5px", borderRadius: "6px", border: "1px solid #fecdd3", background: "#fff1f2", color: "#e11d48", cursor: deletingId === bom.id ? "wait" : "pointer" }}><Trash2 size={13} /></button>
                      <ChevronDown size={16} color="#94a3b8" style={{ transform: expandedBom === bom.id ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                    </div>
                  </div>
                  {expandedBom === bom.id && bom.items?.length > 0 && (
                    <div style={{ borderTop: "1px solid #f1f5f9", padding: "0 16px 14px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem", marginTop: "10px" }}>
                        <thead><tr style={{ backgroundColor: "#f8fafc" }}>{["Material","Unit","Qty","Wastage %","Unit Cost","Total/Batch"].map(h => <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: "0.68rem" }}>{h}</th>)}</tr></thead>
                        <tbody>
                          {bom.items.map((item: any, i: number) => (
                            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "6px 8px", fontWeight: 600 }}>{item.materialName}</td>
                              <td style={{ padding: "6px 8px", color: "#64748b" }}>{item.unit}</td>
                              <td style={{ padding: "6px 8px", textAlign: "center" }}>{item.quantity}</td>
                              <td style={{ padding: "6px 8px", textAlign: "center", color: "#d97706" }}>{item.wastagePercent}%</td>
                              <td style={{ padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>₹{Number(item.unitCost).toFixed(2)}</td>
                              <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>₹{Number(item.totalCost).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
