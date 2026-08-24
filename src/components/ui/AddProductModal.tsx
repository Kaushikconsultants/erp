"use client";

import React, { useState } from "react";
import { createProduct } from "@/app/actions/productActions";
import ProductImagesManager from "@/components/products/ProductImagesManager";
import "@/components/ui/modal.css";

interface AddProductModalProps {
  onClose: () => void;
  categories?: string[];
}

export default function AddProductModal({ onClose, categories = [] }: AddProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [productImages, setProductImages] = useState<string[]>([]);

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
      onClose(); // Close modal on success (revalidatePath will refresh data)
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div className="modal-content glass-panel animate-in" style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <h2>Add New Product</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && <div className="error-message">{error}</div>}

          {/* Product Images Manager */}
          <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <ProductImagesManager
              initialImages={productImages}
              onChange={setProductImages}
              name="images"
            />
          </div>
          
          <div className="form-group">
            <label>Product Name</label>
            <input type="text" name="name" required placeholder="Sportswear T-Shirt Pro" />
          </div>

          <div className="grid-row">
            <div className="form-group">
              <label>SKU</label>
              <input type="text" name="sku" required placeholder="TSH-PRO-001" />
            </div>

            <div className="form-group">
              <label>Article No.</label>
              <input type="text" name="articleNumber" placeholder="ART-12345" />
            </div>
          </div>

          <div className="grid-row">
            <div className="form-group">
              <label>HSN Code</label>
              <input type="text" name="hsnCode" placeholder="6205" />
            </div>

            <div className="form-group">
              <label>Category</label>
              <input 
                type="text" 
                name="category" 
                list="category-options" 
                placeholder="Select or type a category..." 
                required 
                style={{ width: '100%' }}
              />
              <datalist id="category-options">
                {categories.map((c, i) => (
                  <option key={i} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div className="form-group">
              <label>Weight (kg)</label>
              <input type="number" name="weight" step="0.01" placeholder="e.g. 0.25" />
            </div>

            <div className="form-group">
              <label>Selling Price (₹)</label>
              <input type="number" name="price" step="0.01" required placeholder="1499.00" />
            </div>

            <div className="form-group">
              <label>Initial Stock</label>
              <input type="number" name="stock" defaultValue="0" />
            </div>
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea name="description" rows={2} placeholder="Premium quality sportswear..." style={{
              padding: '10px 14px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              outline: 'none',
              resize: 'vertical'
            }}></textarea>
          </div>

          <div className="modal-footer" style={{ marginTop: '10px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Saving..." : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
