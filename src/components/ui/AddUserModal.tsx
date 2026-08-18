"use client";

import React, { useState } from "react";
import { createUser } from "@/app/actions/userActions";
import "./modal.css";

interface AddUserModalProps {
  onClose: () => void;
}

export default function AddUserModal({ onClose }: AddUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createUser(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose(); // Close modal on success (revalidatePath will refresh data)
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel animate-in">
        <div className="modal-header">
          <h2>Add New User</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" name="name" required placeholder="John Doe" />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input type="email" name="email" required placeholder="john@company.com" />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" required placeholder="Temporary password" />
          </div>

          <div className="form-group">
            <label>Role</label>
            <select name="role" required>
              <option value="SALES">Sales Executive</option>
              <option value="MANAGER">Manager / Team Leader</option>
              <option value="HR">HR / Admin Staff</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label>Monthly Base Salary (₹)</label>
            <input type="number" name="salary" min="0" step="500" placeholder="e.g. 35000" />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
