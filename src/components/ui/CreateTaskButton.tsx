"use client";

import React, { useState } from "react";
import CreateTaskModal from "./CreateTaskModal";

interface CreateTaskButtonProps {
  employees: { id: string; name: string }[];
  customers: { id: string; name: string }[];
}

export default function CreateTaskButton({ employees, customers }: CreateTaskButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button 
        className="primary-btn hover-lift" 
        onClick={() => setIsModalOpen(true)}
      >
        + Create Task
      </button>

      {isModalOpen && (
        <CreateTaskModal onClose={() => setIsModalOpen(false)} employees={employees} customers={customers} />
      )}
    </>
  );
}
