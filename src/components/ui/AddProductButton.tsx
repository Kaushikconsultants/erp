"use client";

import React, { useState } from "react";
import AddProductModal from "./AddProductModal";

import { useSearchParams } from "next/navigation";

export default function AddProductButton({ 
  categories = [],
  style,
  className
}: { 
  categories?: string[]; 
  style?: React.CSSProperties;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);

  React.useEffect(() => {
    const action = searchParams?.get('action');
    if (action === 'add' || action === 'new' || searchParams?.get('openAddModal') === 'true') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const buttonStyle: React.CSSProperties = {
    height: "32px",
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "0 13px",
    backgroundColor: "#10b981",
    color: "#ffffff",
    border: "none",
    borderRadius: "7px",
    fontSize: "0.78rem",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(16, 185, 129, 0.2)",
    transition: "all 0.15s ease",
    ...style
  };

  return (
    <>
      <button 
        className={className || "hover-lift"} 
        style={buttonStyle}
        onClick={() => setIsModalOpen(true)}
      >
        + Add Product
      </button>

      {isModalOpen && (
        <AddProductModal onClose={() => setIsModalOpen(false)} categories={categories} />
      )}
    </>
  );
}
