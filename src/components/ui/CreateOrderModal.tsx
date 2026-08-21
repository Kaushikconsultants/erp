"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
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

  // Searchable customer picker
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setCustomerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCustomers = customers.filter((c) => c.companyName.toLowerCase().includes(customerSearch.toLowerCase()));

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
    if (selectedCustomerId) formData.set("customerId", selectedCustomerId);
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
          
          <div className="form-group" style={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
            <label style={{ width: "150px", paddingTop: "10px", flexShrink: 0, fontWeight: 500, fontSize: "0.875rem", color: "#475569" }}>Customer</label>
            <input type="hidden" name="customerId" value={selectedCustomerId} />
            <div ref={customerDropdownRef} style={{ position: "relative", flex: 1, width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: customerDropdownOpen ? "1px solid var(--accent-primary, #4f46e5)" : "1px solid #e2e8f0",
                  borderRadius: "8px",
                  backgroundColor: customerDropdownOpen ? "#ffffff" : "#f8fafc",
                  boxShadow: customerDropdownOpen ? "0 0 0 3px rgba(79, 70, 229, 0.15)" : "inset 0 1px 2px rgba(0,0,0,0.02)",
                  padding: "0 12px",
                  cursor: "text",
                  minHeight: "42px",
                  height: "42px",
                  gap: "8px",
                  width: "100%",
                  boxSizing: "border-box",
                  transition: "all 0.2s ease"
                }}
                onClick={() => setCustomerDropdownOpen(true)}
              >
                <span style={{ color: "#94a3b8", fontSize: "0.85rem", display: "flex", alignItems: "center" }}>🔍</span>
                {selectedCustomerId && !customerDropdownOpen ? (
                  <span style={{ flex: 1, fontSize: "0.875rem", color: "#1e293b", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedCustomerLabel}</span>
                ) : (
                  <input
                    type="text"
                    placeholder="Search customer by name..."
                    value={customerSearch}
                    onChange={(e) => { setCustomerSearch(e.target.value); setCustomerDropdownOpen(true); }}
                    onFocus={() => setCustomerDropdownOpen(true)}
                    style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "0.875rem", color: "#1e293b", padding: "0", height: "100%", width: "100%", boxShadow: "none" }}
                  />
                )}
                {selectedCustomerId && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedCustomerId(""); setSelectedCustomerLabel(""); setCustomerDropdownOpen(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem", padding: "0 4px" }}>×</button>
                )}
              </div>
              {customerDropdownOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)", zIndex: 9999, maxHeight: "200px", overflowY: "auto" }}>
                  {filteredCustomers.length === 0 ? (
                    <div style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "0.85rem", textAlign: "center" }}>No customers found</div>
                  ) : (
                    filteredCustomers.map((c) => (
                      <div key={c.id} onClick={() => { setSelectedCustomerId(c.id); setSelectedCustomerLabel(c.companyName); setCustomerSearch(""); setCustomerDropdownOpen(false); }}
                        style={{ padding: "10px 14px", cursor: "pointer", fontSize: "0.875rem", background: selectedCustomerId === c.id ? "#eff6ff" : "transparent" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = selectedCustomerId === c.id ? "#eff6ff" : "transparent")}
                      >
                        <span style={{ fontWeight: 600 }}>{c.companyName}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
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
