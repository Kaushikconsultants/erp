"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createOrder } from "@/app/actions/orderActions";
import { lookupBarcode } from "@/app/actions/scannerActions";
import ShippingRateCalculator from "./ShippingRateCalculator";
import QuickBarcodeScannerBar from "@/components/scanner/QuickBarcodeScannerBar";
import "@/components/ui/modal.css";

interface CreateOrderModalProps {
  onClose: () => void;
  customers: { id: string; companyName: string }[];
  products: { id: string; name: string; price: number; sku?: string; articleNumber?: string }[];
  employees?: { id: string; name: string }[];
}

export default function CreateOrderModal({ onClose, customers, products, employees = [] }: CreateOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [shippingCharge, setShippingCharge] = useState(0);

  const handleBarcodeScan = async (code: string) => {
    if (!code || !code.trim()) return;
    const q = code.trim().toLowerCase();

    let matched = products.find((p: any) =>
      (p.sku && p.sku.toLowerCase() === q) ||
      (p.articleNumber && p.articleNumber.toLowerCase() === q) ||
      (p.id && p.id.toLowerCase() === q) ||
      (p.name && p.name.toLowerCase() === q)
    );

    if (!matched) {
      matched = products.find((p: any) => p.name && p.name.toLowerCase().includes(q));
    }

    if (!matched) {
      const res = await lookupBarcode(code);
      if (res.type === "PRODUCT" && res.product) {
        matched = products.find((p) => p.id === res.product?.id);
      }
    }

    if (matched) {
      if (selectedProductId === matched.id) {
        setQuantity((prev) => prev + 1);
      } else {
        setSelectedProductId(matched.id);
        setQuantity(1);
      }
    } else {
      alert(`No product found matching barcode "${code}"`);
    }
  };

  const searchParams = useSearchParams();
  useEffect(() => {
    const addProductParam = searchParams?.get('add_product');
    if (addProductParam && products?.length > 0) {
      handleBarcodeScan(addProductParam);
      
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('add_product');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams, products]);

  const orderValue = useMemo(() => {
    const product = products.find(p => p.id === selectedProductId);
    return (product?.price || 0) * quantity;
  }, [selectedProductId, quantity, products]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createOrder(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose(); // Close modal on success
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel animate-in">
        <div className="modal-header">
          <h2>Create New Order</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Customer</label>
            <select name="customerId" required>
              <option value="">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
          </div>

          {/* Quick Barcode Scanner */}
          <QuickBarcodeScannerBar
            onScan={handleBarcodeScan}
            compact
            label="Product Barcode Scanner"
            placeholder="Scan barcode or type SKU to auto-select item..."
          />

          <div className="form-group">
            <label>Product</label>
            <select 
              name="productId" 
              required 
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              <option value="">Select a product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} - ₹{p.price.toLocaleString()}</option>
              ))}
            </select>
          </div>

          {employees.length > 0 && (
            <div className="form-group">
              <label>Salesperson (Owner)</label>
              <select name="salespersonId" required>
                <option value="">Select salesperson...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Quantity</label>
            <input 
              type="number" 
              name="quantity" 
              required 
              min="1" 
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select name="status" required defaultValue="PENDING">
              <option value="PENDING">Pending Approval</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {orderValue > 0 && (
            <ShippingRateCalculator 
              orderValue={orderValue}
              onSelectRate={(rate) => setShippingCharge(rate.charge)}
            />
          )}

          {shippingCharge > 0 && (
            <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', marginTop: '16px', fontWeight: 600 }}>
              Selected Shipping Charge: ₹{shippingCharge}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Creating..." : "Create Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
