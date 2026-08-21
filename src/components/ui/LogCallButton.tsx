"use client";

import React, { useState } from "react";
import LogCallModal from "./LogCallModal";

import { useSearchParams } from "next/navigation";

interface LogCallButtonProps {
  customers: { id: string; companyName: string; contactPerson: string }[];
  isAdmin?: boolean;
}

export default function LogCallButton({ customers, isAdmin }: LogCallButtonProps) {
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);

  React.useEffect(() => {
    const action = searchParams?.get('action') || searchParams?.get('modal');
    if (action === 'log' || action === 'add' || searchParams?.get('openLogModal') === 'true') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  return (
    <>
      <button 
        className="primary-btn hover-lift" 
        onClick={() => setIsModalOpen(true)}
      >
        + Log Call
      </button>

      {isModalOpen && (
        <LogCallModal onClose={() => setIsModalOpen(false)} customers={customers} isAdmin={isAdmin} />
      )}
    </>
  );
}
