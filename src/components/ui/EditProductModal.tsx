"use client";

import React, { useState, useMemo } from "react";
import { updateProduct } from "@/app/actions/productActions";
import ProductImagesManager from "@/components/products/ProductImagesManager";
import { DollarSign } from "lucide-react";
import "@/components/ui/modal.css";

interface EditProductModalProps {
  product: any;
  categories?: string[];
  onClose: () => void;
}

export default function EditProductModal({ product, categories = [], onClose }: EditProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [productImages, setProductImages] = useState<string[]>(product.images || []);

  // Controlled states for live financial & profit calculations
  const [purchasePrice, setPurchasePrice] = useState<string>(
    product.purchasePrice !== undefined && product.purchasePrice !== null
      ? String(product.purchasePrice)
      : String(Math.round((product.sellingPrice || 0) * 0.7))
  );
  const [sellingPrice, setSellingPrice] = useState<string>(
    product.sellingPrice !== undefined && product.sellingPrice !== null
      ? String(product.sellingPrice)
      : ""
  );
  const [mrp, setMrp] = useState<string>(
    product.mrp !== undefined && product.mrp !== null
      ? String(product.mrp)
      : String(Math.round((product.sellingPrice || 0) * 1.2))
  );
  const [stockQuantity, setStockQuantity] = useState<string>(
    product.stockQuantity !== undefined && product.stockQuantity !== null
      ? String(product.stockQuantity)
      : "0"
  );
  const [minStock, setMinStock] = useState<string>(
    product.minimumStock !== undefined && product.minimumStock !== null
      ? String(product.minimumStock)
      : "10"
  );

  const financialCalculations = useMemo(() => {
    const cost = parseFloat(purchasePrice) || 0;
    const sell = parseFloat(sellingPrice) || 0;
    const maxRetail = parseFloat(mrp) || 0;
    const stockQty = parseInt(stockQuantity, 10) || 0;

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
  }, [purchasePrice, sellingPrice, mrp, stockQuantity]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("images", JSON.stringify(productImages));
    
    const result = await updateProduct(product.id, formData);

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
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Edit Product Master</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Update purchase cost, wholesale price, stock buffer limits and product metadata.
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
          {error && <div className="error-message" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px', borderRadius: '8px', fontSize: '0.84rem' }}>{error}</div>}

          {/* Multiple Product Images Manager */}
          <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <ProductImagesManager
              initialImages={productImages}
              onChange={setProductImages}
              name="images"
            />
          </div>
          
          <div className="form-group">
            <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Product Title / Name *</label>
            <input type="text" name="name" defaultValue={product.name} required style={{ borderRadius: '6px' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>SKU Code</label>
              <input type="text" name="sku" defaultValue={product.sku || ''} style={{ borderRadius: '6px' }} />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Article No.</label>
              <input type="text" name="articleNumber" defaultValue={product.articleNumber || ''} style={{ borderRadius: '6px' }} />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>HSN / SAC Code</label>
              <input type="text" name="hsnCode" defaultValue={product.hsnCode || ''} style={{ borderRadius: '6px' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Category *</label>
              <input 
                type="text" 
                name="category" 
                defaultValue={product.category || ''}
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
              <input type="text" name="fabric" defaultValue={product.fabric || ''} placeholder="e.g. Cotton Twill" style={{ borderRadius: '6px' }} />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Color / Size</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input type="text" name="color" defaultValue={product.color || ''} placeholder="Color" style={{ borderRadius: '6px', width: '55%' }} />
                <input type="text" name="size" defaultValue={product.size || ''} placeholder="Size" style={{ borderRadius: '6px', width: '45%' }} />
              </div>
            </div>
          </div>

          {/* Pricing, Purchase Price & Profit Margin Engine */}
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
                  placeholder="450.00"
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
                  placeholder="899.00"
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
                  placeholder="1299.00"
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

          {/* Section 3: Stock Quantity, Minimum Stock & Weight */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Stock On Hand (Units)</label>
              <input 
                type="number" 
                name="stock" 
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
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
              <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Weight (kg)</label>
              <input type="number" name="weight" step="0.01" defaultValue={product.weight || ''} placeholder="e.g. 0.25" style={{ borderRadius: '6px' }} />
            </div>
          </div>

          {/* Stock Valuation Summary */}
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
              <span>Live Stock Cost Value: <strong>₹{financialCalculations.totalBatchCost.toLocaleString('en-IN')}</strong></span>
              <span>Stock Retail Value: <strong>₹{financialCalculations.totalBatchRevenue.toLocaleString('en-IN')}</strong></span>
              <span>Potential Profit: <strong style={{ color: '#059669' }}>+₹{financialCalculations.totalBatchProfit.toLocaleString('en-IN')}</strong></span>
            </div>
          )}
          
          <div className="form-group">
            <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>Description</label>
            <textarea 
              name="description" 
              rows={2} 
              defaultValue={product.description || ''}
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

          <div className="modal-footer" style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '0.84rem' }}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={loading} style={{ padding: '8px 20px', borderRadius: '6px', fontSize: '0.84rem', fontWeight: 600 }}>
              {loading ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
