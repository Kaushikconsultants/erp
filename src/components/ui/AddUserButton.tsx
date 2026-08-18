"use client";

import React, { useState } from "react";
import AddUserModal from "./AddUserModal";

export default function AddUserButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button 
        className="primary-btn hover-lift" 
        onClick={() => setIsModalOpen(true)}
      >
        + Add User
      </button>

      {isModalOpen && (
        <AddUserModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}
