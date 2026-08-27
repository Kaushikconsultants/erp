"use client";

import React, { useState } from "react";
import { createUser } from "@/app/actions/userActions";
import { 
  UserPlus, 
  X, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Shield, 
  Check, 
  Building2, 
  Lock, 
  Mail, 
  User, 
  IndianRupee 
} from "lucide-react";
import "./modal.css";

interface AddUserModalProps {
  onClose: () => void;
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
  { id: 'eway_bills', label: '📜 E-Way Bills', desc: 'E-way bill generation & status' },
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

export default function AddUserModal({ onClose }: AddUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState("SALES");
  const [selectedSections, setSelectedSections] = useState<string[]>(getDefaultSectionsForRole("SALES"));
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);

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

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let rand = "";
    for (let i = 0; i < 8; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const gen = `Espon@${rand}`;
    setPassword(gen);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("allowedSections", JSON.stringify(selectedSections));
    if (password) {
      formData.set("password", password);
    }
    
    const result = await createUser(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose();
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
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Pinned Modal Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: '#e0e7ff', color: '#4338ca' }}>
              <UserPlus size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                Create New Team Member
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Add an employee account with department role and granular section permissions.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
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
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
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
              gap: '16px' 
            }}
          >
            {error && (
              <div style={{ padding: '12px 14px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid #fecaca' }}>
                {error}
              </div>
            )}
            
            {/* Full Name & Email */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                  <User size={14} style={{ color: '#64748b' }} /> Full Name *
                </label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  placeholder="e.g. Rahul Sharma" 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', backgroundColor: '#f8fafc' }} 
                />
              </div>

              <div>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                  <Mail size={14} style={{ color: '#64748b' }} /> Email Address (Login ID) *
                </label>
                <input 
                  type="email" 
                  name="email" 
                  required 
                  placeholder="rahul@espon.in" 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', backgroundColor: '#f8fafc' }} 
                />
              </div>
            </div>

            {/* Password & Monthly Salary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '5px', margin: 0 }}>
                    <Lock size={14} style={{ color: '#64748b' }} /> Initial Password *
                  </label>
                  <button 
                    type="button" 
                    onClick={handleGeneratePassword}
                    style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Sparkles size={12} /> Auto-Generate
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    name="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Temporary password" 
                    style={{ width: '100%', padding: '10px 38px 10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', backgroundColor: '#f8fafc', fontFamily: showPassword ? 'inherit' : 'monospace' }} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                  <IndianRupee size={14} style={{ color: '#64748b' }} /> Monthly Base Salary (₹)
                </label>
                <input 
                  type="number" 
                  name="salary" 
                  min="0" 
                  step="500" 
                  placeholder="e.g. 35000" 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', backgroundColor: '#f8fafc' }} 
                />
              </div>
            </div>

            {/* Department Role Selector */}
            <div>
              <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Shield size={15} style={{ color: '#4f46e5' }} /> Department Role & Pre-sets *
              </label>
              <select 
                name="role" 
                required 
                value={selectedRole}
                onChange={e => handleRoleChange(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '11px 14px', 
                  borderRadius: '8px', 
                  border: '1px solid #cbd5e1', 
                  fontSize: '0.9rem', 
                  backgroundColor: '#f8fafc',
                  fontWeight: 600,
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="SALES">💼 Sales Executive / CRM</option>
                <option value="MANAGER">👔 Operations & Sales Manager</option>
                <option value="ACCOUNTS">💰 Accounts & Finance Team</option>
                <option value="PURCHASE">🛒 Purchase & Procurement</option>
                <option value="WAREHOUSE">🏬 Warehouse & Stock Manager</option>
                <option value="DISPATCH">🚚 Dispatch & Logistics Team</option>
                <option value="HR">👥 HR & Recruitment Manager</option>
                <option value="SUPPORT">📞 Customer Support & Calls</option>
                <option value="ADMIN">🛡️ Admin (System Administrator)</option>
                <option value="SUPER_ADMIN">👑 Super Admin (Full Unrestricted Access)</option>
                <option value="CLIENT">🌐 Portal Client / Partner</option>
              </select>
            </div>

            {/* Section Visibility Controls */}
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                    Allowed Section Access ({selectedSections.length}/{ALL_SECTIONS.length} Active)
                  </div>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Fine-tune software navigation visibility for this specific user:
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    type="button" 
                    onClick={selectAll} 
                    style={{ background: '#e0e7ff', border: 'none', color: '#4338ca', fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Select All
                  </button>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <button 
                    type="button" 
                    onClick={deselectAll} 
                    style={{ background: '#fee2e2', border: 'none', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                {ALL_SECTIONS.map(sec => {
                  const isChecked = selectedSections.includes(sec.id);
                  return (
                    <label 
                      key={sec.id} 
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        backgroundColor: isChecked ? '#ffffff' : '#f1f5f9',
                        border: `1px solid ${isChecked ? '#818cf8' : '#e2e8f0'}`,
                        boxShadow: isChecked ? '0 1px 3px rgba(79, 70, 229, 0.1)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => toggleSection(sec.id)}
                        style={{ marginTop: '3px', accentColor: '#4f46e5', width: '15px', height: '15px' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: isChecked ? 700 : 500, color: isChecked ? '#0f172a' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sec.label}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.2, marginTop: '2px' }}>
                          {sec.desc}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pinned Modal Footer */}
          <div 
            style={{ 
              padding: '14px 24px', 
              borderTop: '1px solid #e2e8f0', 
              backgroundColor: '#f8fafc', 
              display: 'flex', 
              justifyContent: 'flex-end', 
              alignItems: 'center',
              gap: '12px',
              flexShrink: 0 
            }}
          >
            <button 
              type="button" 
              onClick={onClose} 
              disabled={loading} 
              style={{ 
                padding: '9px 18px', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                backgroundColor: '#ffffff', 
                color: '#475569', 
                fontSize: '0.875rem', 
                fontWeight: 600, 
                cursor: 'pointer' 
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="primary-btn" 
              style={{ 
                padding: '9px 24px', 
                borderRadius: '8px', 
                fontSize: '0.875rem', 
                fontWeight: 700, 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}
            >
              {loading ? "Creating User..." : "Create Team Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
