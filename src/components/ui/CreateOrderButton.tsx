"use client";

import React, { useState } from "react";
import CreateOrderModal from "./CreateOrderModal";

interface CreateOrderButtonProps {
  customers: { id: string; companyName: string }[];
  products: { id: string; name: string; price: number }[];
  employees?: { id: string; name: string }[];
}

export default function CreateOrderButton({ customers, products, employees = [] }: CreateOrderButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button 
        className="primary-btn hover-lift" 
        onClick={() => setIsModalOpen(true)}
      >
        + Create Order
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
