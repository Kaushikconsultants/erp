"use client";

import React, { useState } from "react";
import AddCustomerModal from "./AddCustomerModal";
import BulkImportModal from "./BulkImportModal";
import { FileSpreadsheet } from "lucide-react";

import { useSearchParams } from "next/navigation";

export default function AddCustomerButton({ employees = [] }: { employees?: { id: string; name: string }[] }) {
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  React.useEffect(() => {
    const action = searchParams?.get('action') || searchParams?.get('modal');
    if (action === 'add' || searchParams?.get('openAddModal') === 'true') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  return (
    <>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          className="action-btn hover-lift" 
          onClick={() => setIsBulkOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)', color: 'var(--success)', background: 'transparent' }}
        >
          <FileSpreadsheet size={16} /> Bulk Import
        </button>
        <button 
          className="primary-btn hover-lift" 
          onClick={() => setIsModalOpen(true)}
        >
          + Add Customer
        </button>
      </div>

      {isModalOpen && (
        <AddCustomerModal 
          onClose={() => setIsModalOpen(false)} 
          employees={employees}
        />
      )}

      {isBulkOpen && (
        <BulkImportModal 
          onClose={() => setIsBulkOpen(false)} 
          onSuccess={() => setIsBulkOpen(false)}
        />
      )}
    </>
  );
}
