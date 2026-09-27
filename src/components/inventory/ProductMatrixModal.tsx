"use client";

import React, { useState } from "react";
import { Grid, Plus, Check, X, Layers, Wine } from "lucide-react";
import { generateProductMatrixVariants } from "@/app/actions/matrixInventoryActions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
}

const DEFAULT_CAPACITIES = ["250ml", "350ml", "450ml", "650ml", "750ml"];
const DEFAULT_MATERIALS = ["Lead-Free Crystal", "Borosilicate Glass", "Soda-Lime Glass", "Amber Tinted Glass", "Smoky Grey Crystal"];

export default function ProductMatrixModal({ isOpen, onClose, categories }: Props) {
  const [baseProductName, setBaseProductName] = useState("Royal Bordeaux Crystal Wine Glass");
  const [category, setCategory] = useState(categories.find(c => c.toLowerCase().includes("wine") || c.toLowerCase().includes("glass")) || categories[0] || "Wine Glasses");
  const [baseSkuPrefix, setBaseSkuPrefix] = useState("WINE-BOR");
  const [material, setMaterial] = useState("Lead-Free Crystal Glass");
  const [hsnCode, setHsnCode] = useState("7013");
  const [basePurchasePrice, setBasePurchasePrice] = useState(120);
  const [baseSellingPrice, setBaseSellingPrice] = useState(280);
  const [baseMrp, setBaseMrp] = useState(499);

  const [sizes, setSizes] = useState<string[]>(DEFAULT_CAPACITIES);
  const [colors, setColors] = useState<string[]>(DEFAULT_MATERIALS);
  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState("");

  const [matrixQuantities, setMatrixQuantities] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleQtyChange = (size: string, color: string, qty: number) => {
    setMatrixQuantities(prev => ({
      ...prev,
      [`${size}_${color}`]: Math.max(0, qty)
    }));
  };

  const handleAddSize = () => {
    if (newSize.trim() && !sizes.includes(newSize.trim())) {
      setSizes([...sizes, newSize.trim()]);
      setNewSize("");
    }
  };

  const handleAddColor = () => {
    if (newColor.trim() && !colors.includes(newColor.trim())) {
      setColors([...colors, newColor.trim()]);
      setNewColor("");
    }
  };

  const handleQuickFill = (val: number) => {
    const filled: Record<string, number> = {};
    sizes.forEach(s => {
      colors.forEach(c => {
        filled[`${s}_${c}`] = val;
      });
    });
    setMatrixQuantities(filled);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseProductName.trim() || !baseSkuPrefix.trim()) {
      setError("Product Name and SKU Prefix are required.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const res = await generateProductMatrixVariants({
        baseProductName,
        category,
        fabric: material,
        hsnCode,
        baseSkuPrefix,
        sizes,
        colors,
        basePurchasePrice,
        baseSellingPrice,
        baseMrp,
        matrixQuantities
      });

      if (res.success) {
        setSuccessMsg(`Successfully generated ${res.totalVariants} glassware variant SKUs!`);
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1200);
      } else {
        setError(res.error || "Failed to generate matrix variants");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const totalMatrixStock = Object.values(matrixQuantities).reduce((a, b) => a + (Number(b) || 0), 0);

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.6)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1100,
      padding: "20px"
    }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "900px", padding: "24px", background: "#fff", maxHeight: "92vh", overflowY: "auto", borderRadius: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Wine size={20} style={{ color: "#7c3aed" }} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                Glassware Variant & Capacity Matrix Generator (Capacity × Material / Finish)
              </h2>
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                Batch generate matrix variant SKUs across volumes (ml) and crystal/glass specifications
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.4rem", color: "#64748b", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {error && (
          <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#dc2626", borderRadius: "6px", marginBottom: "12px", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}
        {successMsg && (
          <div style={{ padding: "8px 12px", background: "#ecfdf5", color: "#059669", borderRadius: "6px", marginBottom: "12px", fontSize: "0.85rem" }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Base Product Info */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "10px" }}>
            <div>
              <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: 600 }}>Base Product Name *</label>
              <input
                type="text"
                placeholder="e.g. Royal Bordeaux Crystal Wine Glass"
                value={baseProductName}
                onChange={(e) => setBaseProductName(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: 600 }}>SKU Prefix *</label>
              <input
                type="text"
                placeholder="e.g. WINE-BOR"
                value={baseSkuPrefix}
                onChange={(e) => setBaseSkuPrefix(e.target.value.toUpperCase())}
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: 600 }}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="form-input"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
            <div>
              <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: 600 }}>Purchase Cost (₹)</label>
              <input
                type="number"
                value={basePurchasePrice}
                onChange={(e) => setBasePurchasePrice(parseFloat(e.target.value) || 0)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: 600 }}>Wholesale Price (₹)</label>
              <input
                type="number"
                value={baseSellingPrice}
                onChange={(e) => setBaseSellingPrice(parseFloat(e.target.value) || 0)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: 600 }}>MRP (₹)</label>
              <input
                type="number"
                value={baseMrp}
                onChange={(e) => setBaseMrp(parseFloat(e.target.value) || 0)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: "0.82rem", fontWeight: 600 }}>HSN / Export Code</label>
              <input
                type="text"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* Add Capacity & Material Tags */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>
                Capacities / Volumes (ml / oz)
              </label>
              <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                <input
                  type="text"
                  placeholder="Add capacity (e.g. 500ml)"
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  className="form-input"
                  style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                />
                <button type="button" onClick={handleAddSize} className="action-btn" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
                  <Plus size={13} /> Add
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {sizes.map((s) => (
                  <span key={s} style={{ backgroundColor: "#eff6ff", color: "#1e40af", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    {s}
                    <X size={12} style={{ cursor: "pointer" }} onClick={() => setSizes(sizes.filter(x => x !== s))} />
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>
                Materials & Finishes
              </label>
              <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                <input
                  type="text"
                  placeholder="Add material / finish (e.g. Frost Tinted)"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="form-input"
                  style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                />
                <button type="button" onClick={handleAddColor} className="action-btn" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
                  <Plus size={13} /> Add
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {colors.map((c) => (
                  <span key={c} style={{ backgroundColor: "#f5f3ff", color: "#6d28d9", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    {c}
                    <X size={12} style={{ cursor: "pointer" }} onClick={() => setColors(colors.filter(x => x !== c))} />
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 2D Matrix Grid: Capacities x Materials */}
          <div style={{ marginTop: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div>
                <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0f172a" }}>2D Stock Matrix & Initial Batch Quantities</span>
                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginLeft: "8px" }}>
                  (Total Stock: <strong>{totalMatrixStock}</strong> units across {sizes.length * colors.length} SKUs)
                </span>
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => handleQuickFill(12)}
                  className="action-btn"
                  style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                  title="Fill standard dozen pack"
                >
                  Fill 12 pcs
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill(24)}
                  className="action-btn"
                  style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                  title="Fill standard carton (24 pcs)"
                >
                  Fill 24 pcs (1 Ctn)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill(0)}
                  className="action-btn"
                  style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "center", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left", color: "#475569", fontWeight: 600 }}>Material / Finish ↓  |  Capacity →</th>
                    {sizes.map(s => (
                      <th key={s} style={{ padding: "8px 10px", fontWeight: 700, color: "#1e293b" }}>{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {colors.map(color => (
                    <tr key={color} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: "#334155" }}>{color}</td>
                      {sizes.map(size => {
                        const key = `${size}_${color}`;
                        return (
                          <td key={size} style={{ padding: "6px 8px", textAlign: "center" }}>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={matrixQuantities[key] || ""}
                              onChange={(e) => handleQtyChange(size, color, parseInt(e.target.value) || 0)}
                              className="form-input"
                              style={{ width: "75px", padding: "4px 6px", textAlign: "center", fontSize: "0.82rem" }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
            <button
              type="button"
              onClick={onClose}
              className="action-btn"
              style={{ padding: "8px 16px", borderRadius: "6px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="primary-btn"
              style={{ padding: "8px 22px", borderRadius: "6px", backgroundColor: "#7c3aed", color: "#fff", fontWeight: 600 }}
            >
              {isSaving ? "Generating Variants..." : `Generate ${sizes.length * colors.length} Glassware SKUs`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
