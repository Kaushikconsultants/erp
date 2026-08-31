"use client";

import React, { useState } from "react";
import { ShoppingBag, Package, Send, CheckCircle, Tag, Check, Copy, ExternalLink } from "lucide-react";

export default function WhatsAppCommercePage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [products] = useState([
    { id: "ESP-902", name: "Premium Cotton Polo T-Shirt", category: "Apparel", price: 290, stock: 450, sku: "SKU-902-M" },
    { id: "ESP-404", name: "Slim Fit Stretch Chino Pants", category: "Bottomwear", price: 450, stock: 280, sku: "SKU-404-32" },
    { id: "ESP-108", name: "Fleece Casual Tracksuit Set", category: "Winterwear", price: 890, stock: 120, sku: "SKU-108-L" }
  ]);

  const handleSendWhatsAppCard = (p: any) => {
    const text = `🛍️ *PRODUCT CATALOG CARD*\n\n*${p.name}* (Art #${p.id})\n• Category: ${p.category}\n• Wholesale Slab: ₹${p.price}/pc\n• Available Godown Stock: ${p.stock} pcs\n\n👉 Reply directly to book an order.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleCopyCard = (p: any) => {
    const text = `🛍️ *PRODUCT CATALOG CARD*\n\n*${p.name}* (Art #${p.id})\n• Category: ${p.category}\n• Wholesale Slab: ₹${p.price}/pc\n• Available Godown Stock: ${p.stock} pcs\n\n👉 Reply directly to book an order.`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(p.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>WhatsApp Product Catalogs & Commerce Integration</h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>Share interactive product catalog cards directly inside WhatsApp conversations.</p>
        </div>

        <a
          href="/catalog"
          target="_blank"
          rel="noreferrer"
          style={{
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            backgroundColor: "#ffffff",
            color: "#334155",
            fontSize: "0.82rem",
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <ExternalLink size={14} /> Open Public Lookbook
        </a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
        {products.map((p) => (
          <div key={p.id} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div style={{ width: "100%", height: "120px", background: "#f3f4f6", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
              <Package size={40} color="#9ca3af" />
            </div>

            <span style={{ fontSize: "10.5px", fontWeight: 700, background: "#e0e7ff", color: "#3730a3", padding: "2px 6px", borderRadius: "4px" }}>{p.id}</span>
            <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#111827", margin: "4px 0 2px 0" }}>{p.name}</h4>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 14px 0" }}>Wholesale Slab: <strong>₹{p.price}/pc</strong> • Stock: {p.stock} pcs</p>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => handleCopyCard(p)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  background: "#f8fafc",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                  padding: "8px",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {copiedId === p.id ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                <span>{copiedId === p.id ? "Copied" : "Copy"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendWhatsAppCard(p)}
                style={{
                  flex: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  background: "#10b981",
                  color: "#ffffff",
                  border: "none",
                  padding: "8px",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                <Send size={14} /> Send in WhatsApp
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
