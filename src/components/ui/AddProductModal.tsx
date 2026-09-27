"use client";

import React, { useState, useMemo } from "react";
import { createProduct } from "@/app/actions/productActions";
import ProductImagesManager from "@/components/products/ProductImagesManager";
import { DollarSign, Package, Layers, Info, Sparkles, CheckCircle2, ShieldAlert } from "lucide-react";
import "@/components/ui/modal.css";

interface AddProductModalProps {
  onClose: () => void;
  categories?: string[];
}

const DEFAULT_GLASSWARE_CATEGORIES = [
  "Water Bottles & Flasks",
  "Double-Wall Cups & Glasses",
  "Whiskey Tumblers & Old Fashioned",
  "Carafes & Beverage Servers",
  "Teapots & Infusers",
  "Coffee & Tea Mugs",
  "Airtight Storage Jars & Canisters",
  "Wine Glasses (Bordeaux / Burgundy)",
  "Champagne Flutes",
  "Cocktail & Martini Glasses",
  "Decanters & Aerators",
  "Beer Mugs & Pilsners",
  "Crystal Tableware & Bowls",
  "Barware Sets & Gift Boxes"
];

const GLASS_MATERIALS = [
  "Lead-Free Crystal Glass",
  "High Borosilicate Glass (Heat Resistant -20°C to 150°C)",
  "Soda-Lime Commercial Glass",
  "Hand-Blown Artisan Crystal",
  "Tempered Toughened Glass",
  "Double-Wall Thermal Insulated Glass"
];

export default function AddProductModal({ onClose, categories = [] }: AddProductModalProps) {
  const [activeTab, setActiveTab] = useState<"general" | "specs" | "pricing" | "packaging">("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [productImages, setProductImages] = useState<string[]>([]);

  // Controlled states for live financial & profit calculations
  const [purchasePrice, setPurchasePrice] = useState<string>("450");
  const [sellingPrice, setSellingPrice] = useState<string>("899");
  const [mrp, setMrp] = useState<string>("1499");
  const [initialStock, setInitialStock] = useState<string>("240");
  const [minStock, setMinStock] = useState<string>("48");

  const mergedCategories = useMemo(() => {
    const set = new Set([...categories, ...DEFAULT_GLASSWARE_CATEGORIES]);
    return Array.from(set).filter(Boolean);
  }, [categories]);

  const financialCalculations = useMemo(() => {
    const cost = parseFloat(purchasePrice) || 0;
    const sell = parseFloat(sellingPrice) || 0;
    const maxRetail = parseFloat(mrp) || 0;
    const stockQty = parseInt(initialStock, 10) || 0;

    const unitProfit = sell - cost;
    const marginPercent = sell > 0 ? ((unitProfit / sell) * 100) : 0;
    const markupPercent = cost > 0 ? ((unitProfit / cost) * 100) : 0;
    const retailerGrossMargin = maxRetail > 0 ? maxRetail - sell : 0;
    const retailerMarginPercent = maxRetail > 0 ? ((retailerGrossMargin / maxRetail) * 100) : 0;

    const totalBatchCost = stockQty * cost;
    const totalBatchRevenue = stockQty * sell;
    const totalBatchProfit = totalBatchRevenue - totalBatchCost;

    let marginBadge = { label: "✓ Healthy Margin", bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" };
    if (unitProfit < 0) {
      marginBadge = { label: "🚨 Negative Margin (Loss)", bg: "#fef2f2", color: "#dc2626", border: "#fecaca" };
    } else if (marginPercent < 15) {
      marginBadge = { label: "⚠️ Low Margin (<15%)", bg: "#fffbeb", color: "#d97706", border: "#fde68a" };
    } else if (marginPercent >= 35) {
      marginBadge = { label: "🔥 High Margin (>35%)", bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" };
    }

    return {
      cost,
      sell,
      maxRetail,
      stockQty,
      unitProfit,
      marginPercent: marginPercent.toFixed(1),
      markupPercent: markupPercent.toFixed(1),
      retailerGrossMargin: retailerGrossMargin.toFixed(2),
      retailerMarginPercent: retailerMarginPercent.toFixed(1),
      totalBatchCost,
      totalBatchRevenue,
      totalBatchProfit,
      marginBadge
    };
  }, [purchasePrice, sellingPrice, mrp, initialStock]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("images", JSON.stringify(productImages));
    
    const result = await createProduct(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div className="modal-content glass-panel animate-in" style={{ maxWidth: '820px', width: '95%' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={18} />
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Add New Product / Article Master
              </h2>
            </div>
            <p style={{ margin: '3px 0 0 40px', fontSize: '0.78rem', color: '#64748b' }}>
              Create product with instant synchronization to public catalog, stock counts, and wholesale pricing.
            </p>
          </div>
          <button className="close-btn" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748b' }}>×</button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 20px', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            style={{
              padding: '10px 14px',
              border: 'none',
              borderBottom: activeTab === "general" ? '2px solid #4f46e5' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === "general" ? '#4f46e5' : '#64748b',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Info size={14} /> Basic & Media
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("specs")}
            style={{
              padding: '10px 14px',
              border: 'none',
              borderBottom: activeTab === "specs" ? '2px solid #4f46e5' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === "specs" ? '#4f46e5' : '#64748b',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sparkles size={14} /> Glassware & Specs
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pricing")}
            style={{
              padding: '10px 14px',
              border: 'none',
              borderBottom: activeTab === "pricing" ? '2px solid #4f46e5' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === "pricing" ? '#4f46e5' : '#64748b',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <DollarSign size={14} /> Pricing & Margins
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("packaging")}
            style={{
              padding: '10px 14px',
              border: 'none',
              borderBottom: activeTab === "packaging" ? '2px solid #4f46e5' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === "packaging" ? '#4f46e5' : '#64748b',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Layers size={14} /> Packaging & Stock
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: BASIC & MEDIA */}
          <div style={{ display: activeTab === "general" ? "flex" : "none", flexDirection: "column", gap: "14px" }}>
            
            {/* Multiple Product Images Manager */}
            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <ProductImagesManager
                initialImages={productImages}
                onChange={setProductImages}
                name="images"
              />
            </div>
            
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>
                Product Title / Lookbook Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. R3 Royal 450ml Lead-Free Crystal Bordeaux Wine Glass"
                style={{ borderRadius: '6px', padding: '9px 12px', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>SKU Code <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" name="sku" required placeholder="e.g. R3-WG-450" style={{ borderRadius: '6px', textTransform: 'uppercase', fontFamily: 'monospace' }} />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Article / Model Number</label>
                <input type="text" name="articleNumber" placeholder="e.g. ART-7013-01" style={{ borderRadius: '6px' }} />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>HSN Code</label>
                <input type="text" name="hsnCode" defaultValue="7013" placeholder="7013 (Glassware)" style={{ borderRadius: '6px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Category <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="text" 
                  name="category" 
                  defaultValue="Wine Glasses (Bordeaux / Burgundy)"
                  list="category-options-add" 
                  placeholder="Select or type category..." 
                  required 
                  style={{ width: '100%', borderRadius: '6px' }}
                />
                <datalist id="category-options-add">
                  {mergedCategories.map((c, i) => (
                    <option key={i} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Subcategory / Collection Tag</label>
                <input type="text" name="subCategory" placeholder="e.g. Executive Stemware Series" style={{ borderRadius: '6px' }} />
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Catalog Description & Specifications</label>
              <textarea 
                name="description" 
                rows={3} 
                placeholder="Detailed features, care instructions, and buyer selling points..."
                style={{
                  padding: '10px 14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  fontSize: '0.84rem',
                  color: '#0f172a',
                  outline: 'none',
                  resize: 'vertical'
                }} 
              />
            </div>
          </div>

          {/* TAB 2: GLASSWARE SPECS */}
          <div style={{ display: activeTab === "specs" ? "flex" : "none", flexDirection: "column", gap: "14px" }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Glass Material</label>
                <select name="material" defaultValue={GLASS_MATERIALS[0]} style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}>
                  {GLASS_MATERIALS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Capacity (ml / oz)</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="number" name="capacityMl" defaultValue="450" placeholder="450" style={{ borderRadius: '6px', width: '60%' }} />
                  <input type="text" name="size" defaultValue="450ml" placeholder="ml" style={{ borderRadius: '6px', width: '40%' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', backgroundColor: '#f1f5f9', padding: '14px', borderRadius: '8px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>Height (mm)</label>
                <input type="number" name="heightMm" placeholder="e.g. 230" style={{ borderRadius: '5px', padding: '7px 8px', fontSize: '0.82rem' }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>Diameter (mm)</label>
                <input type="number" name="diameterMm" placeholder="e.g. 85" style={{ borderRadius: '5px', padding: '7px 8px', fontSize: '0.82rem' }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>Unit Weight (kg)</label>
                <input type="number" step="0.01" name="weight" placeholder="e.g. 0.28" style={{ borderRadius: '5px', padding: '7px 8px', fontSize: '0.82rem' }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>Color / Tint</label>
                <input type="text" name="color" defaultValue="Ultra Clear" placeholder="Ultra Clear" style={{ borderRadius: '5px', padding: '7px 8px', fontSize: '0.82rem' }} />
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Customization & Branding Options</label>
              <input
                type="text"
                name="customizationOptions"
                defaultValue="Screen Printing, Laser Logo Etching, Gold Rim, Custom Gift Box"
                placeholder="e.g. Screen Printing, Laser Logo Etching, Gold Rim, Custom Gift Box"
                style={{ borderRadius: '6px' }}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                Displayed to wholesale buyers interested in OEM / Custom Design requests.
              </span>
            </div>

          </div>

          {/* TAB 3: PRICING & MARGINS */}
          <div style={{ display: activeTab === "pricing" ? "flex" : "none", flexDirection: "column", gap: "14px" }}>
            
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DollarSign size={16} color="#059669" />
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                    Wholesale Trade Pricing & Retailer Margin Breakdown
                  </span>
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '5px',
                  backgroundColor: financialCalculations.marginBadge.bg,
                  color: financialCalculations.marginBadge.color,
                  border: `1px solid ${financialCalculations.marginBadge.border}`
                }}>
                  {financialCalculations.marginBadge.label}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.78rem', color: '#334155' }}>
                    Mfg / Cost Price (₹) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="number" 
                    name="purchasePrice" 
                    step="0.01" 
                    required 
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="100.00"
                    style={{ borderColor: '#93c5fd', backgroundColor: '#ffffff', borderRadius: '6px' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Internal factory cost</span>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 700, fontSize: '0.78rem', color: '#059669' }}>
                    Trade Wholesale Rate (₹) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="number" 
                    name="price" 
                    step="0.01" 
                    required 
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="150.00"
                    style={{ borderColor: '#86efac', backgroundColor: '#ffffff', borderRadius: '6px', fontWeight: 700, color: '#059669' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Base rate (Slab 1: 1-99 pcs)</span>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 700, fontSize: '0.78rem', color: '#7c3aed' }}>
                    Suggested Retail Price / MRP (₹)
                  </label>
                  <input 
                    type="number" 
                    name="mrp" 
                    step="0.01" 
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value)}
                    placeholder="299.00"
                    style={{ borderColor: '#ddd6fe', backgroundColor: '#ffffff', borderRadius: '6px', fontWeight: 700, color: '#7c3aed' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Shown on storefront for retailers</span>
                </div>
              </div>

              {/* Retailer & Factory Profit Summary Matrix */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                backgroundColor: '#ffffff',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Factory Gross Profit</div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 700, color: financialCalculations.unitProfit >= 0 ? '#059669' : '#dc2626' }}>
                    {financialCalculations.unitProfit >= 0 ? `+₹${financialCalculations.unitProfit.toFixed(2)}` : `-₹${Math.abs(financialCalculations.unitProfit).toFixed(2)}`}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Factory Margin</div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 700, color: Number(financialCalculations.marginPercent) >= 20 ? '#059669' : '#d97706' }}>
                    {financialCalculations.marginPercent}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Retailer Margin ₹</div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#2563eb' }}>
                    ₹{financialCalculations.retailerGrossMargin}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Retailer Margin %</div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#7c3aed' }}>
                    {financialCalculations.retailerMarginPercent}%
                  </div>
                </div>
              </div>

              {/* International Export Pricing Row */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '8px' }}>
                  International Export Multi-Currency FOB Rates
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb' }}>Export FOB (USD $)</label>
                    <input type="number" step="0.01" name="exportPriceUsd" placeholder="e.g. 2.50" style={{ borderRadius: '5px', padding: '6px 8px', borderColor: '#93c5fd', backgroundColor: '#eff6ff', fontWeight: 700 }} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed' }}>Export FOB (EUR €)</label>
                    <input type="number" step="0.01" name="exportPriceEur" placeholder="e.g. 2.30" style={{ borderRadius: '5px', padding: '6px 8px', borderColor: '#ddd6fe', backgroundColor: '#f5f3ff', fontWeight: 700 }} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669' }}>Export FOB (GBP £)</label>
                    <input type="number" step="0.01" name="exportPriceGbp" placeholder="e.g. 1.95" style={{ borderRadius: '5px', padding: '6px 8px', borderColor: '#a7f3d0', backgroundColor: '#ecfdf5', fontWeight: 700 }} />
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* TAB 4: PACKAGING & STOCK */}
          <div style={{ display: activeTab === "packaging" ? "flex" : "none", flexDirection: "column", gap: "14px" }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>
                  Live Stock on Hand (Pcs) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="number" 
                  name="stock" 
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  min="0"
                  style={{ borderRadius: '6px', fontWeight: 700, color: '#0f172a' }}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Shown as live in-stock count on catalog</span>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>
                  Reorder Buffer (Min Stock)
                </label>
                <input 
                  type="number" 
                  name="minimumStock" 
                  value={minStock} 
                  onChange={(e) => setMinStock(e.target.value)}
                  min="0"
                  placeholder="10" 
                  style={{ borderRadius: '6px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Export MOQ (Units)</label>
                <input type="number" name="moq" defaultValue="100" placeholder="100 pcs" style={{ borderRadius: '6px' }} />
              </div>
            </div>

            {/* Carton & Master Box Details */}
            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                  Master Outer Carton Qty (Pcs)
                </label>
                <input type="number" name="masterCartonQty" defaultValue="24" placeholder="24 pcs" style={{ borderRadius: '6px' }} />
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Storefront rounds order up to carton / box multiples</span>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                  Carton CBM (m³)
                </label>
                <input type="number" step="0.001" name="cbm" defaultValue="0.045" placeholder="0.045" style={{ borderRadius: '6px' }} />
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Used for container & transporter freight calculation</span>
              </div>
            </div>

            {/* Stock Valuation Summary */}
            {financialCalculations.stockQty > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: '#ecfdf5',
                borderRadius: '8px',
                border: '1px solid #a7f3d0',
                fontSize: '0.8rem',
                color: '#065f46'
              }}>
                <span>Initial Stock Cost Value: <strong>₹{financialCalculations.totalBatchCost.toLocaleString('en-IN')}</strong></span>
                <span>Wholesale Revenue Value: <strong>₹{financialCalculations.totalBatchRevenue.toLocaleString('en-IN')}</strong></span>
                <span>Potential Profit: <strong>+₹{financialCalculations.totalBatchProfit.toLocaleString('en-IN')}</strong></span>
              </div>
            )}

          </div>

          <div className="modal-footer" style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '0.84rem' }}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={loading} style={{ padding: '8px 22px', borderRadius: '6px', fontSize: '0.84rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} />
              {loading ? "Creating Item..." : "Create & Publish to Storefront"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
