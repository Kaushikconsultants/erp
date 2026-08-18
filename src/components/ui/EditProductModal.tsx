"use client";

import React, { useState } from "react";
import { updateProduct } from "@/app/actions/productActions";
import "@/components/ui/modal.css";

interface EditProductModalProps {
  product: any;
  categories?: string[];
  onClose: () => void;
}

export default function EditProductModal({ product, categories = [], onClose }: EditProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await updateProduct(product.id, formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel animate-in">
        <div className="modal-header">
          <h2>Edit Product</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Product Name</label>
            <input type="text" name="name" defaultValue={product.name} required />
          </div>

          <div className="form-group">
            <label>SKU</label>
            <input type="text" name="sku" defaultValue={product.sku || ''} />
          </div>

          <div className="form-group">
            <label>Article No.</label>
            <input type="text" name="articleNumber" defaultValue={product.articleNumber || ''} />
          </div>

          <div className="form-group">
            <label>HSN Code</label>
            <input type="text" name="hsnCode" defaultValue={product.hsnCode || ''} />
          </div>

          <div className="form-group">
            <label>Category</label>
            <input 
              type="text" 
              name="category" 
              defaultValue={product.category || ''}
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

          <div className="form-group">
            <label>Weight (kg)</label>
            <input type="number" name="weight" step="0.01" defaultValue={product.weight || ''} placeholder="e.g. 0.25" />
          </div>

          <div className="form-group">
            <label>Price (₹)</label>
            <input type="number" name="price" step="0.01" defaultValue={product.sellingPrice} required />
          </div>

          <div className="form-group">
            <label>Stock Quantity</label>
            <input type="number" name="stock" defaultValue={product.stockQuantity} />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea 
              name="description" 
              rows={3} 
              defaultValue={product.description || ''}
              style={{
                padding: '12px 16px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.875rem',
                color: 'var(--text-primary)',
                outline: 'none',
                resize: 'vertical'
              }} 
            />
          </div>

          <div className="modal-footer" style={{ marginTop: '20px' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
