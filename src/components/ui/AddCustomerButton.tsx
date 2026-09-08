"use client";

import React, { useState } from "react";
import AddCustomerModal from "./AddCustomerModal";
import DataImportWizardModal from "@/components/common/DataImportWizardModal";
import { FileSpreadsheet, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function AddCustomerButton({ employees = [] }: { employees?: { id: string; name: string }[] }) {
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  React.useEffect(() => {
    const action = searchParams?.get('action') || searchParams?.get('modal');
    if (action === 'add' || action === 'new' || searchParams?.get('openAddModal') === 'true') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  return (
    <>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button 
          className="action-btn hover-lift" 
          onClick={() => setIsBulkOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '10px', border: '1px solid #10b981', color: '#059669', background: '#ecfdf5', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
          title="Bulk Import Customers from Excel or CSV"
        >
          <FileSpreadsheet size={15} />
          <span>Import Excel / Sheets</span>
        </button>
        <button 
          className="primary-btn hover-lift" 
          onClick={() => setIsModalOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={16} />
          <span>Add Customer</span>
        </button>
      </div>

      {isModalOpen && (
        <AddCustomerModal 
          onClose={() => setIsModalOpen(false)} 
          employees={employees}
        />
      )}

      {isBulkOpen && (
        <DataImportWizardModal 
          isOpen={isBulkOpen}
          onClose={() => setIsBulkOpen(false)} 
          defaultEntityType="CUSTOMERS"
          onSuccess={() => setIsBulkOpen(false)}
        />
      )}
    </>
  );
}
