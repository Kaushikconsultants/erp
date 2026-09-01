"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import CreateOrderModal from "./CreateOrderModal";
import OrderSlipScannerModal from "@/components/orders/OrderSlipScannerModal";

interface CreateOrderButtonProps {
  customers: { id: string; companyName: string }[];
  products: { id: string; name: string; price: number; sku?: string; articleNumber?: string }[];
  employees?: { id: string; name: string }[];
}

export default function CreateOrderButton({ customers, products, employees = [] }: CreateOrderButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiScanOpen, setIsAiScanOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get('action') === 'add' || searchParams?.get('add_product')) {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      {/* AI Order Slip Scanner Button */}
      <button
        type="button"
        onClick={() => setIsAiScanOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "9px 16px",
          borderRadius: "10px",
          fontWeight: 500,
          fontSize: "0.85rem",
          backgroundColor: "#eff6ff",
          color: "#1d4ed8",
          border: "1px solid #bfdbfe",
          cursor: "pointer",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          transition: "all 0.15s ease"
        }}
      >
        <Sparkles size={16} color="#2563eb" />
        <span>AI Scan Order Slip</span>
      </button>

      {/* Manual Create Order Button */}
      <button 
        className="primary-btn hover-lift" 
        onClick={() => setIsModalOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "9px 18px",
          borderRadius: "10px",
          fontWeight: 500,
          fontSize: "0.875rem",
          backgroundColor: "var(--accent-primary, #4f46e5)",
          color: "#ffffff",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(79, 70, 229, 0.2)"
        }}
      >
        <Plus size={17} />
        <span>Create Order</span>
      </button>

      {isModalOpen && (
        <CreateOrderModal 
          onClose={() => setIsModalOpen(false)} 
          customers={customers} 
          products={products} 
          employees={employees}
        />
      )}

      {isAiScanOpen && (
        <OrderSlipScannerModal
          customers={customers}
          products={products}
          onClose={() => setIsAiScanOpen(false)}
        />
      )}
    </div>
  );
}
