"use client";

import React, { useState } from "react";
import InventoryReportsModal from "./InventoryReportsModal";
import { FileText } from "lucide-react";

export default function InventoryReportsButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '6px', 
          border: '1px solid #cbd5e1', 
          backgroundColor: '#ffffff',
          color: '#334155',
          height: '34px',
          padding: '0 14px', 
          borderRadius: '8px', 
          fontWeight: 600,
          fontSize: '0.8rem',
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
      >
        <FileText size={15} color="#475569" /> Reports
      </button>

      {isModalOpen && (
        <InventoryReportsModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}
