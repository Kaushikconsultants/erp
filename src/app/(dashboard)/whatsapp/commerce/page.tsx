"use client";

import React, { useState } from "react";
import { ShoppingBag, Package, Send, CheckCircle, Tag } from "lucide-react";

export default function WhatsAppCommercePage() {
  const [products] = useState([
    { id: "ESP-902", name: "Premium Cotton Polo T-Shirt", category: "Apparel", price: 290, stock: 450, sku: "SKU-902-M" },
    { id: "ESP-404", name: "Slim Fit Stretch Chino Pants", category: "Bottomwear", price: 450, stock: 280, sku: "SKU-404-32" },
    { id: "ESP-108", name: "Fleece Casual Tracksuit Set", category: "Winterwear", price: 890, stock: 120, sku: "SKU-108-L" }
  ]);

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>WhatsApp Product Catalogs & Commerce Integration</h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>Share interactive product catalog cards directly inside WhatsApp conversations.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
        {products.map((p) => (
          <div key={p.id} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div style={{ width: "100%", height: "120px", background: "#f3f4f6", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
              <Package size={40} color="#9ca3af" />
            </div>

            <span style={{ fontSize: "10.5px", fontWeight: 700, background: "#e0e7ff", color: "#3730a3", padding: "2px 6px", borderRadius: "4px" }}>{p.id}</span>
            <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#111827", margin: "4px 0 2px 0" }}>{p.name}</h4>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 10px 0" }}>Wholesale Slab: ₹{p.price}/pc • Stock: {p.stock} pcs</p>

            <button style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "#10b981", color: "#ffffff", border: "none", padding: "8px", borderRadius: "6px", fontSize: "12.5px", fontWeight: 700, cursor: "pointer" }}>
              <Send size={14} /> Send Catalog Card in Chat
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
