"use client";

import React, { useState } from "react";
import { createUser } from "@/app/actions/userActions";
import "./modal.css";

interface AddUserModalProps {
  onClose: () => void;
}

const ALL_SECTIONS = [
  { id: 'dashboard', label: '📊 Main Dashboard', desc: 'Overview metrics & executive summary' },
  { id: 'customers', label: '👥 Customers & CRM', desc: 'Customer accounts, profiles & details' },
  { id: 'calls_tasks', label: '📞 Calls & Tasks', desc: 'Call logs, follow-ups & task management' },
  { id: 'orders', label: '🛒 Sales Orders', desc: 'Order creation, status & details' },
  { id: 'quotations', label: '📋 Quotations', desc: 'Estimate pipeline & quote creation' },
  { id: 'invoices', label: '🧾 Invoices & Billing', desc: 'Tax invoices & billing document section' },
  { id: 'credit_notes', label: '📄 Credit Notes', desc: 'Credit notes & sales return management' },
  { id: 'payments', label: '💳 Payments (Inward)', desc: 'Customer payment tracking & receipts' },
  { id: 'products', label: '📦 Products Catalog', desc: 'Item pricing, SKU & product management' },
  { id: 'dispatches', label: '🚚 Dispatches', desc: 'Shipping pipeline & delivery tracking' },
  { id: 'eway_bills', label: '📜 E-Way Bills', desc: 'E-way bill generation & transport tracking' },
  { id: 'purchases', label: '🛍️ Purchases & Vendors', desc: 'Vendors, purchase orders, bills, payments made, vendor credits' },
  { id: 'hrms', label: '💼 HRMS & Employee Portal', desc: 'Payroll, attendance, expenses & leaves' },
  { id: 'hiring', label: '👥 Hiring & Interviews', desc: 'Job postings, candidates & interview pipelines' },
  { id: 'reports', label: '📈 Reports & Analytics', desc: 'Analytics charts, reports center & audit logs' },
  { id: 'gst_filing', label: '🏛️ GST Filing & Compliances', desc: 'GSTR-1, GSTR-3B & GST returns' },
  { id: 'settings', label: '⚙️ Settings & Admin', desc: 'System settings, roles & user management' }
];

const getDefaultSectionsForRole = (role: string): string[] => {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return ALL_SECTIONS.map(s => s.id);
    case 'SALES':
      return ['dashboard', 'customers', 'calls_tasks', 'orders', 'quotations', 'products'];
    case 'PURCHASE':
      return ['dashboard', 'purchases', 'products'];
    case 'WAREHOUSE':
      return ['dashboard', 'products', 'purchases', 'dispatches', 'eway_bills'];
    case 'DISPATCH':
      return ['dashboard', 'dispatches', 'eway_bills'];
    case 'ACCOUNTS':
      return ['dashboard', 'invoices', 'payments', 'orders', 'credit_notes', 'purchases', 'hrms', 'gst_filing'];
    case 'HR':
      return ['dashboard', 'hrms', 'hiring'];
    case 'SUPPORT':
      return ['dashboard', 'customers', 'calls_tasks'];
    case 'MANAGER':
      return ['dashboard', 'customers', 'calls_tasks', 'orders', 'quotations', 'products', 'reports'];
    default:
      return ['dashboard'];
  }
};

export default function AddUserModal({ onClose }: AddUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState("SALES");
  const [selectedSections, setSelectedSections] = useState<string[]>(getDefaultSectionsForRole("SALES"));

  const handleRoleChange = (newRole: string) => {
    setSelectedRole(newRole);
    setSelectedSections(getDefaultSectionsForRole(newRole));
  };

  const toggleSection = (id: string) => {
    setSelectedSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedSections(ALL_SECTIONS.map(s => s.id));
  const deselectAll = () => setSelectedSections([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("allowedSections", JSON.stringify(selectedSections));
    
    const result = await createUser(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" style={{ overflowY: 'auto', padding: '20px 10px' }}>
      <div className="modal-container" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Create New Team Member</h2>
            <p className="modal-subtitle">Add employee account with role and custom access permissions</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          {error && <div className="error-message" style={{ padding: '10px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '6px', fontSize: '0.85rem' }}>{error}</div>}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>Full Name *</label>
              <input type="text" name="name" required placeholder="John Doe" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>Email Address *</label>
              <input type="email" name="email" required placeholder="john@espon.in" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>Password *</label>
              <input type="password" name="password" required placeholder="Temporary password" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>Monthly Base Salary (₹)</label>
              <input type="number" name="salary" min="0" step="500" placeholder="e.g. 35000" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
            </div>
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>Department Role *</label>
            <select 
              name="role" 
              required 
              value={selectedRole}
              onChange={e => handleRoleChange(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', backgroundColor: '#f8fafc' }}
            >
              <option value="SALES">💼 Sales Executive / CRM</option>
              <option value="MANAGER">👔 Operations Manager</option>
              <option value="DISPATCH">🚚 Dispatch & Logistics Team</option>
              <option value="ACCOUNTS">💰 Accounts & Finance Team</option>
              <option value="HR">👥 HR & Recruitment Manager</option>
              <option value="WAREHOUSE">🏬 Warehouse & Stock Manager</option>
              <option value="PURCHASE">🛒 Purchase & Procurement</option>
              <option value="SUPPORT">📞 Customer Support & Calls</option>
              <option value="ADMIN">🛡️ Admin (System Administrator)</option>
              <option value="SUPER_ADMIN">👑 Super Admin (Full Unrestricted Access)</option>
              <option value="CLIENT">🌐 Portal Client / Partner</option>
            </select>
          </div>

          {/* SECTION VISIBILITY CONTROL */}
          <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <label style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem', margin: 0 }}>
                  Allowed Section Access (Admin Controls)
                </label>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Check sections this user can access in software navigation (e.g. grant or restrict Purchases):
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={selectAll} style={{ background: 'none', border: 'none', color: 'var(--accent-primary, #4f46e5)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Select All</button>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <button type="button" onClick={deselectAll} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Deselect All</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
              {ALL_SECTIONS.map(sec => (
                <label 
                  key={sec.id} 
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    backgroundColor: selectedSections.includes(sec.id) ? '#ffffff' : 'transparent',
                    border: `1px solid ${selectedSections.includes(sec.id) ? '#cbd5e1' : 'transparent'}`,
                    cursor: 'pointer'
                  }}
                >
                  <input 
                    type="checkbox"
                    checked={selectedSections.includes(sec.id)}
                    onChange={() => toggleSection(sec.id)}
                    style={{ marginTop: '2px', accentColor: 'var(--accent-primary, #4f46e5)' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: selectedSections.includes(sec.id) ? '#0f172a' : '#64748b' }}>
                      {sec.label}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{sec.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={loading} style={{ padding: '8px 20px', borderRadius: '6px' }}>
              {loading ? "Creating User..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
