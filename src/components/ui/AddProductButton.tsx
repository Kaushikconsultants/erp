"use client";

import React, { useState } from "react";
import AddProductModal from "./AddProductModal";

import { useSearchParams } from "next/navigation";

export default function AddProductButton({ categories = [] }: { categories?: string[] }) {
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);

  React.useEffect(() => {
    const action = searchParams?.get('action');
    if (action === 'add' || action === 'new' || searchParams?.get('openAddModal') === 'true') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  return (
    <>
      <button 
        className="primary-btn hover-lift" 
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
