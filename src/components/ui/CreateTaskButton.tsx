"use client";

import React, { useState } from "react";
import CreateTaskModal from "./CreateTaskModal";

interface CreateTaskButtonProps {
  employees: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  className?: string;
  style?: React.CSSProperties;
  buttonText?: string;
  children?: React.ReactNode;
}

export default function CreateTaskButton({ 
  employees, 
  customers,
  className,
  style,
  buttonText = "+ Create Task",
  children
}: CreateTaskButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button 
        className={className || "primary-btn hover-lift"} 
        style={style}
        onClick={() => setIsModalOpen(true)}
      >
        {children || buttonText}
      </button>

      {isModalOpen && (
        <CreateTaskModal onClose={() => setIsModalOpen(false)} employees={employees} customers={customers} />
      )}
    </>
  );
}
