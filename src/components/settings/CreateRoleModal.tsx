"use client";

import React, { useState } from 'react';
import { X, Shield, Check } from 'lucide-react';
import { createRole } from '@/app/actions/roleActions';

interface CreateRoleModalProps {
  onClose: () => void;
}

export const PERMISSION_GROUPS = [
  {
    category: "🛍️ Purchases & Procurement",
    permissions: [
      { id: "Manage Purchases", desc: "Create, view & approve purchase orders" },
      { id: "Manage Bills", desc: "Create, view & edit vendor purchase bills" },
      { id: "Manage Vendor Payments", desc: "Disburse & record payments made to vendors" },
      { id: "Manage Vendor Credits", desc: "Issue debit notes & allocate credits to bills" },
      { id: "Manage Vendors", desc: "Add, edit & view vendor directory & balances" },
      { id: "Manage Warehouses", desc: "Manage warehouse stock locations & inventory transactions" },
      { id: "Manage Procurement", desc: "Full procurement suite access" }
    ]
  },
  {
    category: "⚖️ Accounting & Ledgers",
    permissions: [
      { id: "Manage Accounting", desc: "Full access to Balance Sheet, P&L, Trial Balance & Hub" },
      { id: "Manage Chart of Accounts", desc: "Create & configure account groups and general ledgers" },
      { id: "Manage Journal Vouchers", desc: "Create & post double-entry journal & contra vouchers" },
      { id: "Manage Bank Reconciliation", desc: "Reconcile bank statements and clear transactions (BRS)" },
      { id: "View Ageing Reports", desc: "Access 0-90+ day debtor & creditor ageing reports" },
      { id: "Manage Delivery Challans", desc: "Issue material delivery challans and convert to invoices" }
    ]
  },
  {
    category: "🛒 Sales & CRM",
    permissions: [
      { id: "Manage Orders", desc: "Create, process & manage customer sales orders" },
      { id: "Manage Quotations", desc: "Create & convert sales quotations / estimates" },
      { id: "Manage Invoices", desc: "Generate & manage customer GST tax invoices" },
      { id: "Manage Payments", desc: "Record customer incoming payments & receipts" },
      { id: "Manage Customers", desc: "Create & edit customer accounts & credit limits" },
      { id: "View All Customers", desc: "View all customer accounts in the CRM" },
      { id: "Manage Dispatches", desc: "Manage shipments, logistics & delivery tracking" },
      { id: "Manage Inventory", desc: "Manage product catalog, prices & stock levels" }
    ]
  },
  {
    category: "💼 HRMS & Operations",
    permissions: [
      { id: "Manage HRMS", desc: "Full employee directory & HR dashboard" },
      { id: "Manage Payroll", desc: "Process monthly salaries, deductions & payslips" },
      { id: "Approve Leaves", desc: "Review & approve employee leave applications" },
      { id: "Manage Attendance", desc: "Manage attendance check-in logs & work hours" },
      { id: "Manage Expenses", desc: "Review & approve staff expense claims" },
      { id: "Manage Hiring", desc: "Candidate interview evaluations & job applications" }
    ]
  },
  {
    category: "⚙️ Administration & Intelligence",
    permissions: [
      { id: "Manage Settings", desc: "System settings, organization profile & workflows" },
      { id: "Manage Users", desc: "Add/edit team user accounts & section access" },
      { id: "View Analytics", desc: "Access intelligence reports & analytics center" },
      { id: "Delete Records", desc: "Permission to delete data records & documents" }
    ]
  }
];

export default function CreateRoleModal({ onClose }: CreateRoleModalProps) {
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    "Manage Orders", "Manage Quotations", "Manage Customers"
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTogglePermission = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission) 
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSelectGroup = (groupPerms: string[]) => {
    const allSelected = groupPerms.every(p => selectedPermissions.includes(p));
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(p => !groupPerms.includes(p)));
    } else {
      setSelectedPermissions(prev => Array.from(new Set([...prev, ...groupPerms])));
    }
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

    const res = await createRole({ name: roleName.trim(), permissions: selectedPermissions });
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || "Failed to create role.");
    }
  };

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: '#4f46e5', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Create Custom Role</h2>
              <p style={{ fontSize: '0.78rem', margin: '2px 0 0', color: '#64748b' }}>Define role name and granular permission policies</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#94a3b8', cursor: 'pointer' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>{error}</div>}
          
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
              Role Name *
            </label>
            <input 
              type="text" 
              value={roleName}
              onChange={e => setRoleName(e.target.value)}
              placeholder="e.g. Purchase Executive, Senior Sales Manager, Auditor"
              required
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                Permissions Matrix ({selectedPermissions.length} selected)
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {PERMISSION_GROUPS.map((group, gIdx) => {
                const groupPermIds = group.permissions.map(p => p.id);
                const allSelected = groupPermIds.every(p => selectedPermissions.includes(p));

                return (
                  <div key={gIdx} style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                        {group.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectGroup(groupPermIds)}
                        style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {allSelected ? 'Deselect Group' : 'Select All'}
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                      {group.permissions.map(p => {
                        const isChecked = selectedPermissions.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              backgroundColor: isChecked ? '#eff6ff' : '#ffffff',
                              border: `1px solid ${isChecked ? '#93c5fd' : '#cbd5e1'}`,
                              cursor: 'pointer'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(p.id)}
                              style={{ marginTop: '2px', accentColor: '#2563eb' }}
                            />
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isChecked ? '#1d4ed8' : '#334155' }}>
                                {p.id}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                {p.desc}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              style={{ padding: '8px 22px', borderRadius: '8px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? "Creating..." : "Save Role"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
