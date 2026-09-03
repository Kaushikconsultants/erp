"use client";

import React, { useState, useMemo } from "react";
import { createProduct } from "@/app/actions/productActions";
import ProductImagesManager from "@/components/products/ProductImagesManager";
import { TrendingUp, DollarSign, ShieldAlert, Layers, Percent, Package } from "lucide-react";
import "@/components/ui/modal.css";

interface AddProductModalProps {
  onClose: () => void;
  categories?: string[];
}

export default function AddProductModal({ onClose, categories = [] }: AddProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [productImages, setProductImages] = useState<string[]>([]);

  // Controlled states for live financial & profit calculations
  const [purchasePrice, setPurchasePrice] = useState<string>("450");
  const [sellingPrice, setSellingPrice] = useState<string>("899");
  const [mrp, setMrp] = useState<string>("1299");
  const [initialStock, setInitialStock] = useState<string>("20");
  const [minStock, setMinStock] = useState<string>("10");

  const financialCalculations = useMemo(() => {
    const cost = parseFloat(purchasePrice) || 0;
    const sell = parseFloat(sellingPrice) || 0;
    const maxRetail = parseFloat(mrp) || 0;
    const stockQty = parseInt(initialStock, 10) || 0;

    const unitProfit = sell - cost;
    const marginPercent = sell > 0 ? ((unitProfit / sell) * 100) : 0;
    const markupPercent = cost > 0 ? ((unitProfit / cost) * 100) : 0;
    const discountFromMrp = maxRetail > 0 && maxRetail >= sell ? (((maxRetail - sell) / maxRetail) * 100) : 0;

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
      discountFromMrp: discountFromMrp.toFixed(1),
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
      <div className="modal-content glass-panel animate-in" style={{ maxWidth: '720px' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Add New Product</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Create product with cost price, selling price, profit margins & inventory controls.
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
          {error && <div className="error-message" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px', borderRadius: '8px', fontSize: '0.84rem' }}>{error}</div>}

          {/* Product Images Manager */}
          <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <ProductImagesManager
              initialImages={productImages}
              onChange={setProductImages}
              name="images"
            />
          </div>
          
          {/* Section 1: Identification */}
          <div className="form-group">
            <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Product Title / Name *</label>
            <input type="text" name="name" required placeholder="e.g. Classic Cotton Polo T-Shirt" style={{ borderRadius: '6px' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>SKU Code *</label>
              <input type="text" name="sku" required placeholder="e.g. POLO-BLK-001" style={{ borderRadius: '6px' }} />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Article Number</label>
              <input type="text" name="articleNumber" placeholder="e.g. ART-9021" style={{ borderRadius: '6px' }} />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>HSN / SAC Code</label>
              <input type="text" name="hsnCode" placeholder="e.g. 610910" style={{ borderRadius: '6px' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Category *</label>
              <input 
                type="text" 
                name="category" 
                list="category-options" 
                placeholder="Select or type category..." 
                required 
                style={{ width: '100%', borderRadius: '6px' }}
              />
              <datalist id="category-options">
                {categories.map((c, i) => (
                  <option key={i} value={c} />
                ))}
              </datalist>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Fabric / Material</label>
              <input type="text" name="fabric" placeholder="e.g. 100% Bio-Wash Cotton" style={{ borderRadius: '6px' }} />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Color / Size</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input type="text" name="color" placeholder="Color" style={{ borderRadius: '6px', width: '55%' }} />
                <input type="text" name="size" placeholder="Size" style={{ borderRadius: '6px', width: '45%' }} />
              </div>
            </div>
          </div>

          {/* Section 2: Financials & Profit Calculator (CORE NEW FEATURE) */}
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
                  Pricing, Purchase Cost & Profit Margin
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.8rem', color: '#334155' }}>
                  Purchase / Cost Price (₹) *
                </label>
                <input 
                  type="number" 
                  name="purchasePrice" 
                  step="0.01" 
                  required 
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="e.g. 450.00"
                  style={{ borderColor: '#93c5fd', backgroundColor: '#ffffff', borderRadius: '6px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.8rem', color: '#334155' }}>
                  Selling Price (₹) *
                </label>
                <input 
                  type="number" 
                  name="price" 
                  step="0.01" 
                  required 
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="e.g. 899.00"
                  style={{ borderColor: '#86efac', backgroundColor: '#ffffff', borderRadius: '6px', fontWeight: 600 }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.8rem', color: '#334155' }}>
                  MRP / Max Retail (₹)
                </label>
                <input 
                  type="number" 
                  name="mrp" 
                  step="0.01" 
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  placeholder="e.g. 1299.00"
                  style={{ borderRadius: '6px' }}
                />
              </div>
            </div>

            {/* Live Calculation Bar */}
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
                <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Unit Gross Profit</div>
                <div style={{ fontSize: '0.96rem', fontWeight: 700, color: financialCalculations.unitProfit >= 0 ? '#059669' : '#dc2626' }}>
                  {financialCalculations.unitProfit >= 0 ? `+₹${financialCalculations.unitProfit.toFixed(2)}` : `-₹${Math.abs(financialCalculations.unitProfit).toFixed(2)}`}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Gross Margin</div>
                <div style={{ fontSize: '0.96rem', fontWeight: 700, color: Number(financialCalculations.marginPercent) >= 20 ? '#059669' : '#d97706' }}>
                  {financialCalculations.marginPercent}%
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Cost Markup</div>
                <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#2563eb' }}>
                  {financialCalculations.markupPercent}%
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Discount from MRP</div>
                <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#7c3aed' }}>
                  {financialCalculations.discountFromMrp}%
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Stock Quantity & Reorder Point */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Initial Stock (Units)</label>
              <input 
                type="number" 
                name="stock" 
                value={initialStock} 
                onChange={(e) => setInitialStock(e.target.value)}
                min="0"
                style={{ borderRadius: '6px' }}
              />
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
              <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Unit Weight (kg)</label>
              <input type="number" name="weight" step="0.01" placeholder="e.g. 0.35" style={{ borderRadius: '6px' }} />
            </div>
          </div>

          {/* Batch Valuation Preview */}
          {financialCalculations.stockQty > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: '#f1f5f9',
              borderRadius: '6px',
              fontSize: '0.76rem',
              color: '#475569'
            }}>
              <span>Initial Inventory Cost: <strong>₹{financialCalculations.totalBatchCost.toLocaleString('en-IN')}</strong></span>
              <span>Initial Retail Potential: <strong>₹{financialCalculations.totalBatchRevenue.toLocaleString('en-IN')}</strong></span>
              <span>Potential Profit: <strong style={{ color: '#059669' }}>+₹{financialCalculations.totalBatchProfit.toLocaleString('en-IN')}</strong></span>
            </div>
          )}
          
          <div className="form-group">
            <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Description & Specifications</label>
            <textarea name="description" rows={2} placeholder="Add product details, washing instructions, or material composition..." style={{
              padding: '10px 14px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              fontSize: '0.84rem',
              color: '#0f172a',
              outline: 'none',
              resize: 'vertical'
            }}></textarea>
          </div>

          <div className="modal-footer" style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '0.84rem' }}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={loading} style={{ padding: '8px 20px', borderRadius: '6px', fontSize: '0.84rem', fontWeight: 600 }}>
              {loading ? "Saving Product..." : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
