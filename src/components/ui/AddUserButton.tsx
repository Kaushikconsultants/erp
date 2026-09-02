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
        className="hover-lift"
        onClick={() => setIsModalOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 16px",
          borderRadius: "8px",
          fontWeight: 700,
          fontSize: "0.85rem",
          backgroundColor: "#16a34a",
          color: "#ffffff",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(22, 163, 74, 0.25)",
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
