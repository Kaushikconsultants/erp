"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
