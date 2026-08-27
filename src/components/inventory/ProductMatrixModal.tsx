"use client";

import React, { useState } from "react";
import { Grid, Plus, Check, X, Layers } from "lucide-react";
import { generateProductMatrixVariants } from "@/app/actions/matrixInventoryActions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
}

const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL"];
const DEFAULT_COLORS = ["Black", "Navy Blue", "White", "Olive Green", "Maroon"];

export default function ProductMatrixModal({ isOpen, onClose, categories }: Props) {
  const [baseProductName, setBaseProductName] = useState("");
  const [category, setCategory] = useState(categories[0] || "Men's Apparel");
  const [baseSkuPrefix, setBaseSkuPrefix] = useState("");
  const [fabric, setFabric] = useState("100% Combed Cotton");
  const [hsnCode, setHsnCode] = useState("6109");
  const [basePurchasePrice, setBasePurchasePrice] = useState(250);
  const [baseSellingPrice, setBaseSellingPrice] = useState(599);
  const [baseMrp, setBaseMrp] = useState(999);

  const [sizes, setSizes] = useState<string[]>(DEFAULT_SIZES);
  const [colors, setColors] = useState<string[]>(DEFAULT_COLORS);
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
    if (newSize.trim() && !sizes.includes(newSize.trim().toUpperCase())) {
      setSizes([...sizes, newSize.trim().toUpperCase()]);
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
        fabric,
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
        setSuccessMsg(`Successfully generated ${res.totalVariants} product variant SKUs!`);
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
      <div className="glass-panel" style={{ width: "100%", maxWidth: "860px", padding: "24px", background: "#fff", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Layers size={22} style={{ color: "var(--primary, #4f46e5)" }} />
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
                Apparel Matrix & Parameterized Variant Generator (Size $\times$ Color)
              </h2>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Busy-Style 2D variant generation across sizes and colors
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer" }}>×</button>
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
              <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Base Product Name *</label>
              <input
                type="text"
                placeholder="e.g. Classic Oxford Polo T-Shirt"
                value={baseProductName}
                onChange={(e) => setBaseProductName(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>SKU Prefix *</label>
              <input
                type="text"
                placeholder="e.g. POLO-OXF"
                value={baseSkuPrefix}
                onChange={(e) => setBaseSkuPrefix(e.target.value.toUpperCase())}
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Category</label>
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
              <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Purchase Price (₹)</label>
              <input
                type="number"
                value={basePurchasePrice}
                onChange={(e) => setBasePurchasePrice(parseFloat(e.target.value) || 0)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Selling Price (₹)</label>
              <input
                type="number"
                value={baseSellingPrice}
                onChange={(e) => setBaseSellingPrice(parseFloat(e.target.value) || 0)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>MRP (₹)</label>
              <input
                type="number"
                value={baseMrp}
                onChange={(e) => setBaseMrp(parseFloat(e.target.value) || 0)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>HSN Code</label>
              <input
                type="text"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* 2D Matrix Grid: Sizes x Colors */}
          <div style={{ marginTop: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div>
                <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>2D Matrix Quantities Grid</span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginLeft: "8px" }}>
                  (Total Stock: {totalMatrixStock} units across {sizes.length * colors.length} SKUs)
                </span>
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => handleQuickFill(10)}
                  className="action-btn"
                  style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                >
                  Fill 10
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill(25)}
                  className="action-btn"
                  style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                >
                  Fill 25
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
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "center", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Color / Size</th>
                    {sizes.map(s => (
                      <th key={s} style={{ padding: "8px 10px", fontWeight: 700 }}>{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {colors.map(color => (
                    <tr key={color} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: "#1e293b" }}>{color}</td>
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
                              style={{ width: "70px", padding: "4px 6px", textAlign: "center", fontSize: "0.85rem" }}
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

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              className="action-btn"
              style={{ padding: "8px 16px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="primary-btn"
              style={{ padding: "8px 22px" }}
            >
              {isSaving ? "Generating Variants..." : `Generate ${sizes.length * colors.length} SKUs`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
