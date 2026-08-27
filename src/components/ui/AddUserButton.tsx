"use client";

import React, { useState } from "react";
import AddUserModal from "./AddUserModal";
import { UserPlus } from "lucide-react";

export default function AddUserButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="primary-btn hover-lift"
        onClick={() => setIsModalOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 20px",
          borderRadius: "10px",
          fontWeight: 700,
          fontSize: "0.88rem",
          backgroundColor: "var(--accent-primary, #4f46e5)",
          color: "#ffffff",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(79, 70, 229, 0.25)",
          transition: "all 0.15s ease"
        }}
      >
        <UserPlus size={16} />
        <span>Add New User</span>
      </button>

      {isModalOpen && (
        <AddUserModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}
