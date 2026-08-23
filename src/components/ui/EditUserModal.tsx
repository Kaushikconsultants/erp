"use client";

import React, { useState } from "react";
import { updateUser } from "@/app/actions/userActions";
import { KeyRound, Eye, EyeOff, Sparkles, ShieldCheck } from "lucide-react";
import "./modal.css";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  canManageSettings: boolean;
  allowedSections?: string | null;
}

interface EditUserModalProps {
  user: User;
  onClose: () => void;
}

const ALL_SECTIONS = [
  { id: 'dashboard', label: '📊 Main Dashboard', desc: 'Overview metrics & executive summary' },
  { id: 'customers', label: '👥 Customers & CRM', desc: 'Customer accounts, profiles & details' },
  { id: 'calls_tasks', label: '📞 Calls & Tasks', desc: 'Call logs, follow-ups & task management' },
  { id: 'orders', label: '🛒 Sales Orders', desc: 'Order creation, status & details' },
  { id: 'quotations', label: '📋 Quotations', desc: 'Estimate pipeline & quote creation' },
  { id: 'invoices', label: '🧾 Invoices & Billing', desc: 'Tax invoices & billing document section' },
  { id: 'payments', label: '💳 Payments (Inward)', desc: 'Customer payment tracking & receipts' },
  { id: 'products', label: '📦 Products Catalog', desc: 'Item pricing, SKU & product management' },
  { id: 'dispatches', label: '🚚 Dispatches', desc: 'Shipping pipeline & delivery tracking' },
  { id: 'purchases', label: '🛍️ Purchases & Vendors', desc: 'Vendors, purchase orders, bills, payments made, vendor credits' },
  { id: 'hrms', label: '💼 HRMS & Payroll', desc: 'Payroll, attendance, expenses, leaves & hiring' },
  { id: 'reports', label: '📈 Reports & Analytics', desc: 'Analytics charts, reports center & audit logs' },
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
      return ['dashboard', 'products', 'purchases', 'dispatches'];
    case 'DISPATCH':
      return ['dashboard', 'dispatches'];
    case 'ACCOUNTS':
      return ['dashboard', 'invoices', 'payments', 'orders', 'hrms'];
    case 'HR':
      return ['dashboard', 'hrms'];
    case 'SUPPORT':
      return ['dashboard', 'customers', 'calls_tasks'];
    case 'MANAGER':
      return ['dashboard', 'customers', 'calls_tasks', 'orders', 'quotations', 'products', 'reports'];
    default:
      return ['dashboard'];
  }
};

export default function EditUserModal({ user, onClose }: EditUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);

  // Parse existing allowed sections
  const initialAllowed: string[] = (() => {
    if (!user.allowedSections) return getDefaultSectionsForRole(user.role);
    try {
      if (user.allowedSections.startsWith('[')) {
        return JSON.parse(user.allowedSections);
      }
      return user.allowedSections.split(',').map(s => s.trim());
    } catch {
      return getDefaultSectionsForRole(user.role);
    }
  })();

  const [selectedSections, setSelectedSections] = useState<string[]>(initialAllowed);

  const toggleSection = (id: string) => {
    setSelectedSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedSections(ALL_SECTIONS.map(s => s.id));
  const deselectAll = () => setSelectedSections([]);

  const handleGeneratePassword = () => {
    const randomChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let rand = "";
    for (let i = 0; i < 8; i++) {
      rand += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    const generated = `Espon@${rand}`;
    setNewPassword(generated);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    if (!formData.get("canManageSettings")) formData.set("canManageSettings", "false");
    if (!formData.get("isActive")) formData.set("isActive", "false");
    
    // Store allowed sections as JSON string
    formData.set("allowedSections", JSON.stringify(selectedSections));
    if (newPassword.trim()) {
      formData.set("newPassword", newPassword.trim());
    }

    const result = await updateUser(user.id, formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" style={{ overflowY: 'auto', padding: '20px 10px', zIndex: 10000 }}>
      <div className="modal-content glass-panel animate-in" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div className="modal-header" style={{ paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Edit Access & Password: {user.name}</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Configure department role, password reset, and section access permissions.</p>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '16px' }}>
          {error && <div className="error-message" style={{ padding: '10px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '6px', fontSize: '0.85rem' }}>{error}</div>}
          
          {/* ROLE SELECTOR */}
          <div className="form-group">
            <label style={{ fontWeight: 700, color: '#334155', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
              Assign Department Role
            </label>
            <select 
              name="role" 
              defaultValue={user.role} 
              required
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', backgroundColor: '#f8fafc' }}
            >
              <option value="SUPER_ADMIN">👑 Super Admin (Full Unrestricted Access)</option>
              <option value="ADMIN">🛡️ Admin (System Administrator)</option>
              <option value="MANAGER">👔 Operations Manager</option>
              <option value="SALES">💼 Sales Executive / CRM</option>
              <option value="DISPATCH">🚚 Dispatch & Logistics Team</option>
              <option value="ACCOUNTS">💰 Accounts & Finance Team</option>
              <option value="HR">👥 HR & Recruitment Manager</option>
              <option value="WAREHOUSE">🏬 Warehouse & Stock Manager</option>
              <option value="PURCHASE">🛒 Purchase & Procurement</option>
              <option value="SUPPORT">📞 Customer Support & Calls</option>
              <option value="CLIENT">🌐 Portal Client / Partner</option>
            </select>
          </div>

          {/* ADMIN PASSWORD CHANGE SECTION */}
          <div style={{ backgroundColor: 'var(--accent-light, #f0f4ff)', padding: '14px', borderRadius: '10px', border: '1px solid var(--accent-light, #e0e7ff)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontWeight: 700, color: 'var(--accent-primary, #4f46e5)', fontSize: '0.85rem', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <KeyRound size={16} /> Admin Password Change (Optional)
              </label>
              <button 
                type="button" 
                onClick={handleGeneratePassword} 
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary, #4f46e5)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Sparkles size={13} /> Auto-Generate
              </button>
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep existing password, or enter new password"
                style={{ 
                  width: '100%', 
                  padding: '9px 36px 9px 12px', 
                  borderRadius: '6px', 
                  border: '1px solid var(--accent-light, #cbd5e1)', 
                  fontSize: '0.85rem', 
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  fontFamily: showPassword && newPassword ? 'monospace' : 'inherit'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary, #4f46e5)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '4px 0 0 0' }}>
              Type a new password or auto-generate. You can view the text while typing.
            </p>
          </div>

          {/* SECTION VISIBILITY CONTROL (ADMIN DECIDES WHO CAN SEE WHICH SECTION) */}
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <label style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', margin: 0 }}>
                  Section Visibility Permissions (Admin Controls)
                </label>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Select which sections this user can view in the software menu:
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={selectAll} style={{ background: 'none', border: 'none', color: 'var(--accent-primary, #4f46e5)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Select All</button>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <button type="button" onClick={deselectAll} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Deselect All</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
              {ALL_SECTIONS.map(sec => (
                <label 
                  key={sec.id} 
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: selectedSections.includes(sec.id) ? '#ffffff' : 'transparent',
                    border: selectedSections.includes(sec.id) ? '1px solid var(--accent-primary, #cbd5e1)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input 
                    type="checkbox"
                    checked={selectedSections.includes(sec.id)}
                    onChange={() => toggleSection(sec.id)}
                    style={{ marginTop: '2px', accentColor: 'var(--accent-primary, #4f46e5)' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>{sec.label}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{sec.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* PERMISSIONS & STATUS TOGGLES */}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                name="canManageSettings" 
                value="true"
                defaultChecked={user.canManageSettings}
                style={{ accentColor: 'var(--accent-primary, #4f46e5)' }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>Can Manage System Settings</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                name="isActive" 
                value="true"
                defaultChecked={user.isActive}
                style={{ accentColor: '#16a34a' }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>Account Active</span>
            </label>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading} style={{ padding: '8px 20px', borderRadius: '6px', backgroundColor: 'var(--accent-primary, #4f46e5)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              {loading ? "Saving Settings..." : "Save Role, Password & Permissions"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
