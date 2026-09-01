"use client";

import React, { useState } from "react";
import { updateUser } from "@/app/actions/userActions";
import { KeyRound, Eye, EyeOff, Sparkles, ShieldCheck, RotateCcw } from "lucide-react";
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
  onClose: (updatedUser?: Partial<User> & { id: string }) => void;
}

const ALL_SECTIONS = [
  { id: 'dashboard', label: '📊 Main Dashboard', desc: 'Executive metrics & summary' },
  { id: 'customers', label: '👥 Customers & CRM', desc: 'Customer accounts & Khata ledger' },
  { id: 'calls_tasks', label: '📞 Calls & Tasks', desc: 'Call logs & task manager' },
  { id: 'orders', label: '🛒 Sales Orders', desc: 'Order creation & approval' },
  { id: 'quotations', label: '📋 Quotations', desc: 'Estimate pipeline & quotes' },
  { id: 'invoices', label: '🧾 Invoices & Billing', desc: 'Tax invoices & receipts' },
  { id: 'credit_notes', label: '📄 Credit Notes', desc: 'Credit notes & sales returns' },
  { id: 'payments', label: '💳 Payments (Inward)', desc: 'Payment tracking & receipts' },
  { id: 'accounting', label: '⚖️ Accounting & Ledgers', desc: 'P&L, Balance Sheet, COA, JV, Ageing & BRS' },
  { id: 'products', label: '📦 Products Catalog', desc: 'Item pricing & inventory' },
  { id: 'delivery-challans', label: '🚚 Delivery Challans', desc: 'Material dispatch & invoice converter' },
  { id: 'dispatches', label: '📦 Dispatches', desc: 'Shipping & logistics tracking' },
  { id: 'eway_bills', label: '📜 E-Way Bills', desc: 'E-way bill generation & transport tracking' },
  { id: 'purchases', label: '🛍️ Purchases & Vendors', desc: 'Purchase orders, bills & vendors' },
  { id: 'hrms', label: '💼 HRMS & Payroll', desc: 'Payroll, attendance, leaves & expenses' },
  { id: 'hiring', label: '👥 Hiring & Interviews', desc: 'Job openings & candidates' },
  { id: 'reports', label: '📈 Reports & Analytics', desc: 'Sales, inventory & financial reports' },
  { id: 'gst_filing', label: '🏛️ GST Filing & Tax', desc: 'GSTR-1, GSTR-3B compliance' },
  { id: 'settings', label: '⚙️ Settings & Admin', desc: 'System settings, roles & org profile' }
];

const getDefaultSectionsForRole = (role: string): string[] => {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return ALL_SECTIONS.map(s => s.id);
    case 'SALES':
      return ['dashboard', 'customers', 'calls_tasks', 'orders', 'quotations', 'products', 'delivery-challans'];
    case 'PURCHASE':
      return ['dashboard', 'purchases', 'products', 'delivery-challans'];
    case 'WAREHOUSE':
      return ['dashboard', 'products', 'purchases', 'dispatches', 'eway_bills', 'delivery-challans'];
    case 'DISPATCH':
      return ['dashboard', 'dispatches', 'eway_bills', 'delivery-challans'];
    case 'ACCOUNTS':
      return ['dashboard', 'accounting', 'invoices', 'payments', 'orders', 'credit_notes', 'purchases', 'hrms', 'gst_filing', 'reports', 'delivery-challans'];
    case 'HR':
      return ['dashboard', 'hrms', 'hiring'];
    case 'SUPPORT':
      return ['dashboard', 'customers', 'calls_tasks'];
    case 'MANAGER':
      return ['dashboard', 'customers', 'calls_tasks', 'orders', 'quotations', 'products', 'reports', 'accounting', 'delivery-challans'];
    default:
      return ['dashboard'];
  }
};

const parseAllowedSections = (raw: string | null | undefined, userRole: string): string[] => {
  if (!raw || !raw.trim()) return getDefaultSectionsForRole(userRole);
  const trimmed = raw.trim();
  try {
    if (trimmed.startsWith('[')) {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const split = trimmed.split(',').map(s => s.trim().replace(/^["'\[\]]+|["'\[\]]+$/g, '')).filter(Boolean);
    if (split.length > 0) return split;
  } catch (e) {
    console.warn("Failed to parse allowedSections:", e);
  }
  return getDefaultSectionsForRole(userRole);
};

export default function EditUserModal({ user, onClose }: EditUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState(user.role || "SALES");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [canManageSettings, setCanManageSettings] = useState(Boolean(user.canManageSettings));
  const [isActive, setIsActive] = useState(user.isActive ?? true);

  // Parse existing allowed sections with robust fallback
  const [selectedSections, setSelectedSections] = useState<string[]>(() =>
    parseAllowedSections(user.allowedSections, user.role || "SALES")
  );

  const toggleSection = (id: string) => {
    setSelectedSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedSections(ALL_SECTIONS.map(s => s.id));
  const deselectAll = () => setSelectedSections([]);
  const resetToRoleDefault = () => setSelectedSections(getDefaultSectionsForRole(selectedRole));

  const handleRoleChange = (newRole: string) => {
    setSelectedRole(newRole);
    // When changing the role, automatically pre-fill with default preset for that role
    setSelectedSections(getDefaultSectionsForRole(newRole));
  };

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
    formData.set("role", selectedRole);
    formData.set("canManageSettings", String(canManageSettings));
    formData.set("isActive", String(isActive));
    
    // Store allowed sections as JSON string
    const sectionsJson = JSON.stringify(selectedSections);
    formData.set("allowedSections", sectionsJson);
    if (newPassword.trim()) {
      formData.set("newPassword", newPassword.trim());
    }

    const result = await updateUser(user.id, formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose({
        id: user.id,
        role: selectedRole,
        allowedSections: sectionsJson,
        canManageSettings,
        isActive
      });
    }
  };

  return (
    <div 
      className="modal-backdrop" 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ 
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
        overflowY: 'auto'
      }}
    >
      <div 
        className="animate-in" 
        style={{ 
          maxWidth: '680px', 
          width: '100%', 
          maxHeight: '90vh', 
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div 
          style={{ 
            padding: '18px 24px', 
            borderBottom: '1px solid #e2e8f0', 
            backgroundColor: '#ffffff',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
              Edit Access & Permissions: {user.name}
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Configure department role, password reset, and section access permissions.
            </p>
          </div>
          <button 
            type="button" 
            onClick={() => onClose()}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem'
            }}
          >
            ×
          </button>
        </div>
        
        <form 
          onSubmit={handleSubmit} 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            flex: 1, 
            overflow: 'hidden', 
            minHeight: 0 
          }}
        >
          <div 
            style={{ 
              padding: '20px 24px', 
              overflowY: 'auto', 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '18px' 
            }}
          >
            {error && <div className="error-message" style={{ padding: '10px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '6px', fontSize: '0.85rem' }}>{error}</div>}
          
          {/* ROLE SELECTOR */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontWeight: 700, color: '#334155', fontSize: '0.85rem', margin: 0 }}>
                Assign Department Role
              </label>
              <button
                type="button"
                onClick={resetToRoleDefault}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary, #4f46e5)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RotateCcw size={12} /> Reset Sections to {selectedRole} Defaults
              </button>
            </div>
            <select 
              name="role" 
              value={selectedRole}
              onChange={(e) => handleRoleChange(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', backgroundColor: '#f8fafc', fontWeight: 600 }}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <label style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', margin: 0 }}>
                  Section Visibility Permissions ({selectedSections.length} of {ALL_SECTIONS.length} Enabled)
                </label>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Select which sections this user can access in the navigation menu:
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button type="button" onClick={selectAll} style={{ background: 'none', border: 'none', color: 'var(--accent-primary, #4f46e5)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Select All</button>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <button type="button" onClick={deselectAll} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Deselect All</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
              {ALL_SECTIONS.map(sec => {
                const isChecked = selectedSections.includes(sec.id);
                return (
                  <label 
                    key={sec.id} 
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: isChecked ? '#ffffff' : '#f1f5f9',
                      border: isChecked ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                      boxShadow: isChecked ? '0 1px 3px rgba(16,185,129,0.1)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSection(sec.id)}
                      style={{ marginTop: '2px', accentColor: '#10b981', width: '16px', height: '16px' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: isChecked ? 700 : 500, color: isChecked ? '#0f172a' : '#64748b' }}>{sec.label}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{sec.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* PERMISSIONS & STATUS TOGGLES */}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={canManageSettings}
                onChange={(e) => setCanManageSettings(e.target.checked)}
                style={{ accentColor: 'var(--accent-primary, #4f46e5)', width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>Can Manage System Settings</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ accentColor: '#16a34a', width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>Account Active</span>
            </label>
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '12px', flexShrink: 0 }}>
          <button type="button" onClick={() => onClose()} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 600, color: '#475569', fontSize: '0.875rem' }}>Cancel</button>
          <button type="submit" disabled={loading} className="primary-btn" style={{ padding: '9px 20px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700 }}>
            {loading ? "Saving Settings..." : "Save Role, Password & Permissions"}
          </button>
        </div>
      </form>
    </div>
  </div>
  );
}
