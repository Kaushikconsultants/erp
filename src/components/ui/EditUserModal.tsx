"use client";

import React, { useState } from "react";
import { updateUser } from "@/app/actions/userActions";
import "./modal.css";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  canManageSettings: boolean;
}

interface EditUserModalProps {
  user: User;
  onClose: () => void;
}

export default function EditUserModal({ user, onClose }: EditUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    if (!formData.get("canManageSettings")) formData.set("canManageSettings", "false");
    if (!formData.get("isActive")) formData.set("isActive", "false");

    const result = await updateUser(user.id, formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel animate-in">
        <div className="modal-header">
          <h2>Edit User: {user.name}</h2>
          <button type="button" className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Role</label>
            <select name="role" defaultValue={user.role} required>
              <option value="SALES">Sales Executive</option>
              <option value="MANAGER">Manager / Team Leader</option>
              <option value="HR">HR / Admin Staff</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>

          <div className="form-group" style={{ alignItems: 'center', marginTop: '8px' }}>
            <label style={{ width: '150px', paddingTop: 0 }}>Permissions</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto', cursor: 'pointer', paddingTop: 0, flex: 1 }}>
              <input 
                type="checkbox" 
                name="canManageSettings" 
                value="true"
                defaultChecked={user.canManageSettings}
                style={{ width: 'auto', accentColor: '#4f46e5' }}
              />
              <span style={{ fontSize: '0.875rem', color: '#1e293b' }}>Can Manage Settings</span>
            </label>
          </div>

          <div className="form-group" style={{ alignItems: 'center' }}>
            <label style={{ width: '150px', paddingTop: 0 }}>Account Status</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto', cursor: 'pointer', paddingTop: 0, flex: 1 }}>
              <input 
                type="checkbox" 
                name="isActive" 
                value="true"
                defaultChecked={user.isActive}
                style={{ width: 'auto', accentColor: '#4f46e5' }}
              />
              <span style={{ fontSize: '0.875rem', color: '#1e293b' }}>Active</span>
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
