"use client";

import React, { useState, useRef } from "react";
import { updateEmployee } from "@/app/actions/userActions";
import { 
  User, 
  Briefcase, 
  FileText, 
  Shield, 
  X, 
  Upload, 
  Camera, 
  Mail, 
  Phone, 
  Calendar, 
  HeartPulse, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  Check, 
  RotateCcw,
  UserCheck,
  UserX,
  CreditCard
} from "lucide-react";
import "./modal.css";

interface EditEmployeeModalProps {
  employee: any;
  onClose: () => void;
  onSuccess?: () => void;
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

const DEPARTMENTS = [
  "Sales & CRM",
  "Accounts & Finance",
  "HR & Recruitment",
  "Dispatch & Logistics",
  "Warehouse & Stock",
  "Purchase & Procurement",
  "Operations Management",
  "Administration & Management",
  "Executive Leadership",
  "Customer Support"
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

export default function EditEmployeeModal({ employee, onClose, onSuccess }: EditEmployeeModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "job" | "banking" | "access">("profile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const user = employee.user || {};

  // Parse Notes & BankDetails JSON
  let parsedNotes: any = {};
  try {
    if (employee.notes) parsedNotes = JSON.parse(employee.notes);
  } catch {}

  let parsedBank: any = {};
  try {
    if (employee.bankDetails) parsedBank = JSON.parse(employee.bankDetails);
  } catch {}

  // Parse emergency contact name/phone
  let initialEmergName = "";
  let initialEmergPhone = "";
  if (employee.emergencyContact) {
    const match = employee.emergencyContact.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      initialEmergName = match[1]?.trim() || "";
      initialEmergPhone = match[2]?.trim() || "";
    } else {
      initialEmergName = employee.emergencyContact;
    }
  }

  // 1. Personal Profile State
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [mobile, setMobile] = useState(employee.mobile || "");
  const [birthday, setBirthday] = useState(parsedNotes.birthday || "");
  const [gender, setGender] = useState(parsedNotes.gender || "Male");
  const [bloodGroup, setBloodGroup] = useState(parsedNotes.bloodGroup || "");
  const [emergencyContactName, setEmergencyContactName] = useState(initialEmergName);
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(initialEmergPhone);
  const [address, setAddress] = useState(employee.address || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");

  // 2. Job & Compensation State
  const [department, setDepartment] = useState(employee.department || "Sales & CRM");
  const [designation, setDesignation] = useState(employee.designation || "");
  const [employeeCode, setEmployeeCode] = useState(employee.employeeId || "");
  const [joiningDate, setJoiningDate] = useState(
    employee.joiningDate ? new Date(employee.joiningDate).toISOString().split('T')[0] : ""
  );
  const [salary, setSalary] = useState(employee.salary !== null && employee.salary !== undefined ? String(employee.salary) : "");
  const [target, setTarget] = useState(employee.target !== null && employee.target !== undefined ? String(employee.target) : "");

  // 3. Bank & Statutory State
  const [bankName, setBankName] = useState(parsedBank.bankName || "");
  const [bankAccountNo, setBankAccountNo] = useState(parsedBank.bankAccountNo || "");
  const [ifscCode, setIfscCode] = useState(parsedBank.ifscCode || "");
  const [panNumber, setPanNumber] = useState(parsedBank.panNumber || "");
  const [aadhaarNumber, setAadhaarNumber] = useState(parsedBank.aadhaarNumber || "");

  // 4. Access & Security State
  const [role, setRole] = useState(user.role || "SALES");
  const [canManageSettings, setCanManageSettings] = useState(Boolean(user.canManageSettings));
  const [isActive, setIsActive] = useState(user.isActive ?? (employee.employmentStatus !== "Inactive"));
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [selectedSections, setSelectedSections] = useState<string[]>(() =>
    parseAllowedSections(user.allowedSections, user.role || "SALES")
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    setSelectedSections(getDefaultSectionsForRole(newRole));
  };

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let rand = "";
    for (let i = 0; i < 8; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const gen = `Espon@${rand}`;
    setNewPassword(gen);
    setShowPassword(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setError("Profile photo must be less than 3MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleSection = (id: string) => {
    setSelectedSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedSections(ALL_SECTIONS.map(s => s.id));
  const deselectAll = () => setSelectedSections([]);
  const resetToRoleDefault = () => setSelectedSections(getDefaultSectionsForRole(role));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!name.trim()) {
      setError("Please enter the full name.");
      setActiveTab("profile");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("email", email.trim().toLowerCase());
    formData.set("mobile", mobile.trim());
    formData.set("birthday", birthday);
    formData.set("gender", gender);
    formData.set("bloodGroup", bloodGroup);
    formData.set("emergencyContactName", emergencyContactName.trim());
    formData.set("emergencyContactPhone", emergencyContactPhone.trim());
    formData.set("address", address.trim());
    formData.set("avatarUrl", avatarUrl);

    // Job & Salary
    formData.set("department", department);
    formData.set("designation", designation.trim());
    formData.set("employeeCode", employeeCode.trim());
    formData.set("joiningDate", joiningDate);
    formData.set("salary", salary.trim());
    formData.set("target", target.trim());

    // Banking
    formData.set("bankName", bankName.trim());
    formData.set("bankAccountNo", bankAccountNo.trim());
    formData.set("ifscCode", ifscCode.trim().toUpperCase());
    formData.set("panNumber", panNumber.trim().toUpperCase());
    formData.set("aadhaarNumber", aadhaarNumber.trim());

    // Access & Security
    formData.set("role", role);
    formData.set("canManageSettings", String(canManageSettings));
    formData.set("isActive", String(isActive));
    formData.set("allowedSections", JSON.stringify(selectedSections));
    if (newPassword.trim()) {
      formData.set("newPassword", newPassword.trim());
    }

    try {
      const res = await updateEmployee(employee.id, formData);
      if (res.error) {
        setError(res.error);
        setLoading(false);
      } else {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to update employee details.");
      setLoading(false);
    }
  };

  return (
    <div 
      className="modal-backdrop" 
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto'
      }}
    >
      <div 
        className="animate-in" 
        style={{ 
          maxWidth: '780px', 
          width: '100%', 
          maxHeight: '92vh', 
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div 
          style={{ 
            padding: '16px 22px', 
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
              <Briefcase size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Edit Employee Details: {user.name || name}
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Modify staff designation, base salary, department, contact, bank info & permissions.
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
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div 
          style={{ 
            display: 'flex', 
            borderBottom: '1px solid #e2e8f0', 
            backgroundColor: '#f8fafc',
            padding: '0 16px',
            gap: '4px',
            flexShrink: 0
          }}
        >
          {[
            { id: 'profile', label: '1. Personal Profile & Photo', icon: <User size={14} /> },
            { id: 'job', label: '2. Job Role & Salary', icon: <Briefcase size={14} /> },
            { id: 'banking', label: '3. Bank & Statutory', icon: <CreditCard size={14} /> },
            { id: 'access', label: '4. System Access & Roles', icon: <Shield size={14} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 14px',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2.5px solid #4f46e5' : '2.5px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? '#4f46e5' : '#64748b',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {error && (
              <div 
                style={{ 
                  padding: '10px 14px', 
                  borderRadius: '8px', 
                  backgroundColor: '#fee2e2', 
                  color: '#991b1b', 
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* ─── TAB 1: PERSONAL PROFILE & PHOTO ─── */}
            {activeTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Photo & Basic Header */}
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ position: 'relative' }}>
                    <div 
                      style={{ 
                        width: '70px', 
                        height: '70px', 
                        borderRadius: '50%', 
                        backgroundColor: '#e0e7ff', 
                        border: '2px solid #818cf8',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#4338ca',
                        fontSize: '1.4rem',
                        fontWeight: 700
                      }}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Staff photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        name.charAt(0).toUpperCase() || <Camera size={24} color="#6366f1" />
                      )}
                    </div>

                    <input 
                      ref={fileInputRef} 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={handlePhotoUpload} 
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#334155',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Upload size={13} /> Upload Photo
                      </button>
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl("")}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fff',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: '#dc2626',
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      JPG, PNG or WEBP (Max 3MB). Appears in avatar and company staff directory.
                    </span>
                  </div>
                </div>

                {/* Name & Work Email */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      Full Name *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                      <User size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      Work Email Address *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. ramesh@company.com"
                        style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                      <Mail size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>
                </div>

                {/* Mobile & Birthday */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      Mobile / Phone Number
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="e.g. +91 9876543210"
                        style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                      <Phone size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      🎂 Birthday / Date of Birth
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="date"
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                      <Calendar size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>
                </div>

                {/* Gender & Blood Group */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      Blood Group
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
                    >
                      <option value="">-- Select Blood Group --</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div style={{ backgroundColor: '#fff7ed', padding: '14px 16px', borderRadius: '10px', border: '1px solid #fed7aa' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#9a3412', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <HeartPulse size={15} /> Emergency Contact Information
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Contact Person & Relation
                      </label>
                      <input
                        type="text"
                        value={emergencyContactName}
                        onChange={(e) => setEmergencyContactName(e.target.value)}
                        placeholder="e.g. Sunita Kumar (Spouse / Parent)"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', backgroundColor: '#fff' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Emergency Phone Number
                      </label>
                      <input
                        type="tel"
                        value={emergencyContactPhone}
                        onChange={(e) => setEmergencyContactPhone(e.target.value)}
                        placeholder="e.g. +91 9123456780"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', backgroundColor: '#fff' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                    Residential / Permanent Address
                  </label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House/Street, Area, City, State, PIN Code"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            )}

            {/* ─── TAB 2: JOB ROLE & SALARY ─── */}
            {activeTab === 'job' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      Department *
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      Designation / Job Title *
                    </label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Senior Sales Manager"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      Employee Code / ID
                    </label>
                    <input
                      type="text"
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      placeholder="e.g. EMP-1045"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      Joining Date
                    </label>
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div style={{ backgroundColor: '#ecfdf5', padding: '14px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#065f46', marginBottom: '5px' }}>
                      Monthly Base Salary (₹)
                    </label>
                    <input
                      type="number"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      placeholder="e.g. 25000"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #6ee7b7', fontSize: '0.95rem', fontWeight: 700, backgroundColor: '#ffffff', color: '#047857' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#047857', marginTop: '4px', display: 'block' }}>
                      Default base pay calculated in monthly payroll runs.
                    </span>
                  </div>

                  <div style={{ backgroundColor: '#eff6ff', padding: '14px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e40af', marginBottom: '5px' }}>
                      Monthly Sales Target (₹)
                    </label>
                    <input
                      type="number"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      placeholder="e.g. 500000"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #93c5fd', fontSize: '0.95rem', fontWeight: 700, backgroundColor: '#ffffff', color: '#1d4ed8' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#1d4ed8', marginTop: '4px', display: 'block' }}>
                      Used for sales incentive slab thresholds & metrics.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 3: BANK & STATUTORY ─── */}
            {activeTab === 'banking' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank / ICICI Bank"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      value={bankAccountNo}
                      onChange={(e) => setBankAccountNo(e.target.value)}
                      placeholder="e.g. 50100456789123"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      placeholder="e.g. HDFC0001234"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textTransform: 'uppercase' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      PAN Card Number
                    </label>
                    <input
                      type="text"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. ABCDE1234F"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textTransform: 'uppercase' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      Aadhaar Number
                    </label>
                    <input
                      type="text"
                      value={aadhaarNumber}
                      onChange={(e) => setAadhaarNumber(e.target.value)}
                      placeholder="e.g. 1234 5678 9012"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 4: ACCESS & SECURITY ─── */}
            {activeTab === 'access' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* ROLE SELECTOR */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontWeight: 700, color: '#334155', fontSize: '0.85rem', margin: 0 }}>
                      System Role
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
                      <RotateCcw size={12} /> Reset to {role} Defaults
                    </button>
                  </div>
                  <select 
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', backgroundColor: '#f8fafc', fontWeight: 600 }}
                  >
                    <option value="SUPER_ADMIN">👑 Super Admin (Full Access)</option>
                    <option value="ADMIN">🛡️ Admin (System Administrator)</option>
                    <option value="MANAGER">👔 Operations Manager</option>
                    <option value="SALES">💼 Sales Executive / CRM</option>
                    <option value="DISPATCH">🚚 Dispatch & Logistics Team</option>
                    <option value="ACCOUNTS">💰 Accounts & Finance Team</option>
                    <option value="HR">👥 HR & Recruitment Manager</option>
                    <option value="WAREHOUSE">🏬 Warehouse & Stock Manager</option>
                    <option value="PURCHASE">🛒 Purchase & Procurement</option>
                    <option value="SUPPORT">📞 Customer Support & Calls</option>
                  </select>
                </div>

                {/* Password Reset */}
                <div style={{ backgroundColor: 'var(--accent-light, #f0f4ff)', padding: '14px', borderRadius: '10px', border: '1px solid var(--accent-light, #e0e7ff)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontWeight: 700, color: 'var(--accent-primary, #4f46e5)', fontSize: '0.85rem', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <KeyRound size={16} /> Admin Password Reset (Optional)
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
                </div>

                {/* Section Permissions */}
                <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <label style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem', margin: 0 }}>
                        Section Permissions ({selectedSections.length} of {ALL_SECTIONS.length})
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button type="button" onClick={selectAll} style={{ background: 'none', border: 'none', color: 'var(--accent-primary, #4f46e5)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Select All</button>
                      <span style={{ color: '#cbd5e1' }}>|</span>
                      <button type="button" onClick={deselectAll} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Deselect All</button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                    {ALL_SECTIONS.map(sec => {
                      const isChecked = selectedSections.includes(sec.id);
                      return (
                        <label 
                          key={sec.id} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            backgroundColor: isChecked ? '#ffffff' : '#f1f5f9',
                            border: isChecked ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: isChecked ? 600 : 400
                          }}
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSection(sec.id)}
                            style={{ accentColor: '#10b981', width: '15px', height: '15px' }}
                          />
                          <span>{sec.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Account Status Toggle */}
                <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      style={{ accentColor: '#16a34a', width: '18px', height: '18px' }}
                    />
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isActive ? '#166534' : '#991b1b', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {isActive ? <UserCheck size={16} /> : <UserX size={16} />}
                        Employee Status: {isActive ? 'Active (Working & Login Allowed)' : 'Inactive / Relieved'}
                      </span>
                    </div>
                  </label>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={canManageSettings}
                        onChange={(e) => setCanManageSettings(e.target.checked)}
                        style={{ accentColor: 'var(--accent-primary, #4f46e5)', width: '18px', height: '18px' }}
                      />
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                          Can Manage System Settings
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div 
            style={{ 
              padding: '14px 22px', 
              borderTop: '1px solid #e2e8f0', 
              backgroundColor: '#f8fafc', 
              display: 'flex', 
              justifyContent: 'flex-end', 
              alignItems: 'center', 
              gap: '10px',
              flexShrink: 0 
            }}
          >
            <button 
              type="button" 
              onClick={onClose} 
              style={{ 
                padding: '8px 16px', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                backgroundColor: '#fff', 
                cursor: 'pointer', 
                fontWeight: 600, 
                color: '#475569', 
                fontSize: '0.85rem' 
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="primary-btn" 
              style={{ 
                padding: '8px 20px', 
                borderRadius: '8px', 
                fontSize: '0.85rem', 
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving Details...
                </>
              ) : (
                <>
                  <Check size={16} /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
