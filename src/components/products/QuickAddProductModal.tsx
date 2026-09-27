"use client";

import React, { useState, useEffect } from "react";
import { createProduct } from "@/app/actions/productActions";
import { Package, X, Loader2, AlertCircle, Sparkles, Tag, DollarSign, Layers } from "lucide-react";
import "@/components/ui/modal.css";

interface QuickAddProductModalProps {
  isOpen: boolean;
  initialName?: string;
  onClose: () => void;
  onSuccess: (product: {
    id: string;
    name: string;
    sku?: string | null;
    sellingPrice: number;
    purchasePrice?: number | null;
    category?: string | null;
    gstRate?: number;
  }) => void;
}

const DEFAULT_CATEGORIES = [
  "Wine Glasses",
  "Champagne Flutes",
  "Whiskey Tumblers",
  "Cocktail & Martini Glasses",
  "Decanters & Carafes",
  "Beer Mugs & Pilsners",
  "Crystal Tableware",
  "Barware Sets",
  "Glassware & Accessories"
];

export default function QuickAddProductModal({
  isOpen,
  initialName = "",
  onClose,
  onSuccess
}: QuickAddProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(initialName);
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("Wine Glasses");
  const [purchasePrice, setPurchasePrice] = useState<string>("100");
  const [sellingPrice, setSellingPrice] = useState<string>("150");
  const [exportPriceUsd, setExportPriceUsd] = useState<string>("2.50");
  const [capacityMl, setCapacityMl] = useState<string>("450");
  const [material, setMaterial] = useState<string>("Lead-Free Crystal Glass");
  const [gstRate, setGstRate] = useState<number>(18);
  const [hsnCode, setHsnCode] = useState("7013");
  const [stock, setStock] = useState<string>("0");
  const [minStock, setMinStock] = useState<string>("100");
  const [uom, setUom] = useState("Pcs");

  // Auto-generate a clean SKU whenever name changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setName(initialName || "");
      const cleanPrefix = (initialName || "ITEM")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 4) || "ITEM";
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setSku(`${cleanPrefix}-${randomSuffix}`);
      setError("");
    }
  }, [isOpen, initialName]);

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Auto-suggest selling price based on purchase price (e.g. 1.4x)
  const handleCostChange = (val: string) => {
    setPurchasePrice(val);
    const cost = parseFloat(val);
    if (!isNaN(cost) && cost > 0) {
      setSellingPrice(Math.round(cost * 1.4).toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Product / Item Name is required");
      return;
    }
    if (!sku.trim()) {
      setError("SKU / Code is required");
      return;
    }

    setLoading(true);
    setError("");

    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("sku", sku.trim().toUpperCase());
    fd.set("articleNumber", sku.trim().toUpperCase());
    fd.set("category", category);
    fd.set("price", sellingPrice || purchasePrice || "100");
    fd.set("purchasePrice", purchasePrice || "100");
    fd.set("exportPriceUsd", exportPriceUsd || "");
    fd.set("capacityMl", capacityMl || "");
    fd.set("material", material || "");
    fd.set("hsnCode", hsnCode.trim() || "7013");
    fd.set("stock", stock || "0");
    fd.set("minimumStock", minStock || "100");
    fd.set("description", `UOM: ${uom} • ${capacityMl ? `${capacityMl}ml ` : ''}${material}`);

    try {
      const res = await createProduct(fd);
      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else if (res?.success && res.product) {
        setLoading(false);
        onSuccess({
          id: res.product.id,
          name: res.product.name,
          sku: res.product.sku,
          sellingPrice: res.product.sellingPrice || 0,
          purchasePrice: res.product.purchasePrice || res.product.sellingPrice || 0,
          category: res.product.category,
          gstRate: gstRate
        });
        onClose();
      } else {
        setError("Failed to create product");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      style={{
        zIndex: 99999999,
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        className="modal-content animate-in"
        style={{
          maxWidth: "540px",
          width: "95%",
          borderRadius: "14px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          position: "relative",
          zIndex: 100000000
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: "rgba(79, 70, 229, 0.1)",
                color: "var(--accent-primary, #4f46e5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              <Package size={20} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: "1.1rem" }}>
                Quick Add Product / Item
              </h2>
              <p className="modal-subtitle">Add a new item to catalogue and select it immediately</p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Error Banner */}
            {error && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fca5a5",
                  color: "#991b1b",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <AlertCircle size={16} color="#dc2626" />
                <span>{error}</span>
              </div>
            )}

            {/* Item Name */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                Product / Item Name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cotton Lycra Fabric 220 GSM"
                required
                className="form-input"
                autoFocus
              />
            </div>

            {/* SKU & Category in 2 columns */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                  SKU / Item Code <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="e.g. COT-LYC-01"
                  required
                  className="form-input"
                  style={{ textTransform: "uppercase", fontFamily: "monospace", fontWeight: 600 }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="form-input"
                >
                  {DEFAULT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pricing Grid: Cost Price (Purchase), Selling Price (INR), Export Price (USD $) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.1fr", gap: "12px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                  Cost Rate (₹) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontWeight: 600, fontSize: "0.8rem", pointerEvents: "none" }}>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => handleCostChange(e.target.value)}
                    required
                    className="form-input"
                    style={{ paddingLeft: "24px" }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                  India Price (₹)
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontWeight: 600, fontSize: "0.8rem", pointerEvents: "none" }}>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: "24px" }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#2563eb" }}>
                  Export Price (USD $)
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#2563eb", fontWeight: 700, fontSize: "0.85rem", pointerEvents: "none" }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={exportPriceUsd}
                    onChange={(e) => setExportPriceUsd(e.target.value)}
                    placeholder="2.50"
                    className="form-input"
                    style={{ paddingLeft: "24px", borderColor: "#93c5fd", fontWeight: 700, color: "#1e40af", backgroundColor: "#eff6ff" }}
                  />
                </div>
              </div>
            </div>

            {/* Glassware Specs: Capacity (ml) & Material */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "12px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                  Capacity (ml / oz)
                </label>
                <input
                  type="number"
                  value={capacityMl}
                  onChange={(e) => setCapacityMl(e.target.value)}
                  placeholder="e.g. 450"
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                  Glass Material
                </label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="form-input"
                >
                  <option value="Lead-Free Crystal Glass">Lead-Free Crystal Glass</option>
                  <option value="Borosilicate Glass">Borosilicate Glass (Heat Resistant)</option>
                  <option value="Soda-Lime Glass">Soda-Lime Glass (Standard)</option>
                  <option value="Hand-Blown Crystal">Hand-Blown Artisan Crystal</option>
                  <option value="Tempered Glass">Tempered Toughened Glass</option>
                </select>
              </div>
            </div>

            {/* HSN Code & UOM (Unit of Measurement) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                  HSN / SAC Code
                </label>
                <input
                  type="text"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  placeholder="e.g. 61091000"
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                  Unit of Measure (UOM)
                </label>
                <select
                  value={uom}
                  onChange={(e) => setUom(e.target.value)}
                  className="form-input"
                >
                  <option value="Pcs">Pcs (Pieces)</option>
                  <option value="Mtr">Mtr (Meters)</option>
                  <option value="Kg">Kg (Kilograms)</option>
                  <option value="Box">Box</option>
                  <option value="Roll">Roll</option>
                  <option value="Set">Set</option>
                  <option value="Pair">Pair</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ padding: "14px 20px", borderTop: "1px solid #e2e8f0" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={loading}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              <span>{loading ? "Saving Item..." : "Create & Select Item"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
