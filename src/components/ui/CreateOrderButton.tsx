"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import CreateOrderModal from "./CreateOrderModal";

interface CreateOrderButtonProps {
  customers: { id: string; companyName: string }[];
  products: { id: string; name: string; price: number; sku?: string; articleNumber?: string }[];
  employees?: { id: string; name: string }[];
}

export default function CreateOrderButton({ customers, products, employees = [] }: CreateOrderButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get('action') === 'add' || searchParams?.get('add_product')) {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  return (
    <>
      <button 
        className="primary-btn hover-lift" 
        onClick={() => setIsModalOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 22px",
          borderRadius: "10px",
          fontWeight: 700,
          fontSize: "0.9rem",
          backgroundColor: "var(--accent-primary, #4f46e5)",
          color: "#ffffff",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
        }}
      >
        <Plus size={18} />
        <span>+ Create Order</span>
      </button>

      {isModalOpen && (
        <CreateOrderModal 
          onClose={() => setIsModalOpen(false)} 
          customers={customers} 
          products={products} 
          employees={employees}
        />
      )}
    </>
  );
}
