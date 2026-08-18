"use client";

import React, { useState } from "react";
import InventoryReportsModal from "./InventoryReportsModal";
import { FileText } from "lucide-react";

export default function InventoryReportsButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button 
        className="action-btn hover-lift" 
        onClick={() => setIsModalOpen(true)}
        style={{ 
          display: 'flex', alignItems: 'center', gap: '6px', 
          border: '1px solid var(--border)', backgroundColor: 'var(--surface-color)',
          padding: '8px 16px', borderRadius: 'var(--radius-md)', fontWeight: 500
        }}
      >
        <FileText size={16} /> Reports
      </button>

      {isModalOpen && (
        <InventoryReportsModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}
