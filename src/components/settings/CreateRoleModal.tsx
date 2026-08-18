"use client";

import React, { useState } from 'react';
import { X, Shield } from 'lucide-react';
import { createRole } from '@/app/actions/roleActions';

interface CreateRoleModalProps {
  onClose: () => void;
}

const AVAILABLE_PERMISSIONS = [
  "Manage Users",
  "View Analytics",
  "Manage Orders",
  "Manage Invoices",
  "Manage Payments",
  "Manage Procurement",
  "Manage Inventory",
  "Manage Warehouses",
  "Manage Purchases",
  "Manage Vendors",
  "Manage Expenses",
  "View All Customers",
  "Manage Settings",
  "Approve Leaves",
  "Manage Payroll",
  "Delete Records"
];

export default function CreateRoleModal({ onClose }: CreateRoleModalProps) {
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTogglePermission = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission) 
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      setError("Role name is required.");
      return;
    }
    if (selectedPermissions.length === 0) {
      setError("Please select at least one permission.");
      return;
    }

    setLoading(true);
    setError('');

    const res = await createRole({ name: roleName, permissions: selectedPermissions });
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || "Failed to create role.");
    }
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="zoho-form-card" style={{ width: '500px', maxWidth: '90vw', padding: 0, overflow: 'hidden' }}>
        <div className="zoho-form-header" style={{ padding: '20px 24px', margin: 0, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <h2 className="zoho-form-title" style={{ margin: 0, fontSize: '1.2rem' }}>
            <Shield size={20} className="text-primary" /> Create Custom Role
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '6px', marginBottom: '16px', fontSize: '0.9rem' }}>{error}</div>}
          
          <div className="zoho-field-group" style={{ marginBottom: '24px' }}>
            <label className="zoho-field-label zoho-field-required">Role Name</label>
            <input 
              type="text" 
              value={roleName}
              onChange={e => setRoleName(e.target.value)}
              placeholder="e.g. Sales Manager"
              className="zoho-input-field"
              required
            />
          </div>

          <div className="zoho-section-box" style={{ marginBottom: '24px' }}>
            <h3 className="zoho-section-title">Select Permissions</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {AVAILABLE_PERMISSIONS.map(permission => (
                <label key={permission} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: selectedPermissions.includes(permission) ? '#e0e7ff' : '#ffffff', borderColor: selectedPermissions.includes(permission) ? '#4f46e5' : '#e2e8f0' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedPermissions.includes(permission)}
                    onChange={() => handleTogglePermission(permission)}
                    style={{ accentColor: '#4f46e5' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: selectedPermissions.includes(permission) ? '#3730a3' : '#475569' }}>
                    {permission}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={onClose} className="secondary-btn" style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="primary-btn" style={{ padding: '10px 20px', borderRadius: '6px', backgroundColor: '#4f46e5', color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? "Creating..." : "Save Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
