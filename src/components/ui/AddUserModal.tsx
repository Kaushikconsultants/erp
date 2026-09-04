"use client";

import React, { useState, useEffect, useRef } from "react";
import { createUser, getHiredCandidates } from "@/app/actions/userActions";
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
  IndianRupee,
  Phone,
  Calendar,
  HeartPulse,
  PhoneCall,
  MapPin,
  FileText,
  Upload,
  CreditCard,
  Camera,
  Briefcase,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2
} from "lucide-react";
import "./modal.css";

interface AddUserModalProps {
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
  { id: 'products', label: '📦 Product Master', desc: 'Item pricing & inventory' },
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

export default function AddUserModal({ onClose, onSuccess }: AddUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "job" | "docs" | "access">("profile");

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [role, setRole] = useState("SALES");
  const [department, setDepartment] = useState("Sales & CRM");
  const [designation, setDesignation] = useState("");
  const [employeeCode, setEmployeeCode] = useState(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [salary, setSalary] = useState("");
  
  // Personal & Emergency Info
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("Male");
  const [bloodGroup, setBloodGroup] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [address, setAddress] = useState("");

  // Photo & CV Files
  const [avatarUrl, setAvatarUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");

  // Banking & Statutory
  const [bankName, setBankName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");

  // Access Permissions
  const [canManageSettings, setCanManageSettings] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>(getDefaultSectionsForRole("SALES"));

  // Hired Candidates Integration
  const [hiredCandidates, setHiredCandidates] = useState<any[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadCandidates() {
      const res = await getHiredCandidates();
      if (res.success && res.candidates) {
        setHiredCandidates(res.candidates);
      }
    }
    loadCandidates();
    handleGeneratePassword();
  }, []);

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    setSelectedSections(getDefaultSectionsForRole(newRole));

    const roleDeptMap: Record<string, string> = {
      HR: "HR & Recruitment",
      SALES: "Sales & CRM",
      DISPATCH: "Dispatch & Logistics",
      ACCOUNTS: "Accounts & Finance",
      WAREHOUSE: "Warehouse & Stock",
      PURCHASE: "Purchase & Procurement",
      SUPPORT: "Customer Support",
      MANAGER: "Operations Management",
      ADMIN: "Administration & Management",
      SUPER_ADMIN: "Executive Leadership"
    };

    if (roleDeptMap[newRole]) {
      setDepartment(roleDeptMap[newRole]);
    }
    if (newRole === 'SUPER_ADMIN' || newRole === 'ADMIN') {
      setCanManageSettings(true);
    }
  };

  const handleCandidateSelect = (candId: string) => {
    setSelectedCandidateId(candId);
    if (!candId) return;

    const cand = hiredCandidates.find(c => c.id === candId);
    if (cand) {
      if (cand.name) setName(cand.name);
      if (cand.email) setEmail(cand.email);
      if (cand.phone) setMobile(cand.phone);
      if (cand.expectedSalary) {
        const cleanSalary = cand.expectedSalary.replace(/[^0-9.]/g, '');
        if (cleanSalary) setSalary(cleanSalary);
      }
      if (cand.resumeUrl) {
        setResumeUrl(cand.resumeUrl);
        setResumeFileName("Candidate Resume Link");
      }
      if (cand.appliedRole) {
        setDesignation(cand.appliedRole);
        const lower = cand.appliedRole.toLowerCase();
        if (lower.includes("sales") || lower.includes("crm")) {
          handleRoleChange("SALES");
        } else if (lower.includes("account") || lower.includes("finance")) {
          handleRoleChange("ACCOUNTS");
        } else if (lower.includes("hr") || lower.includes("recruit")) {
          handleRoleChange("HR");
        } else if (lower.includes("dispatch") || lower.includes("logistics")) {
          handleRoleChange("DISPATCH");
        } else if (lower.includes("warehouse") || lower.includes("inventory")) {
          handleRoleChange("WAREHOUSE");
        } else if (lower.includes("purchase") || lower.includes("procurement")) {
          handleRoleChange("PURCHASE");
        }
      }
    }
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

  const handleCVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setError("CV document must be less than 8MB.");
        return;
      }
      setResumeFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setResumeUrl(reader.result as string);
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
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      setActiveTab("profile");
      setLoading(false);
      return;
    }
    if (!password.trim() || password.length < 4) {
      setError("Password must be at least 4 characters long.");
      setActiveTab("access");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("email", email.trim().toLowerCase());
    formData.set("password", password.trim());
    formData.set("role", role);
    formData.set("department", department);
    formData.set("designation", designation.trim());
    formData.set("employeeCode", employeeCode.trim());
    formData.set("mobile", mobile.trim());
    formData.set("joiningDate", joiningDate);
    formData.set("salary", salary.trim());

    // Personal & Emergency
    formData.set("birthday", birthday);
    formData.set("gender", gender);
    formData.set("bloodGroup", bloodGroup);
    formData.set("emergencyContactName", emergencyContactName.trim());
    formData.set("emergencyContactPhone", emergencyContactPhone.trim());
    formData.set("address", address.trim());

    // Documents & Photos
    formData.set("avatarUrl", avatarUrl);
    formData.set("resumeUrl", resumeUrl);
    if (selectedCandidateId) {
      formData.set("candidateId", selectedCandidateId);
    }

    // Banking & Statutory
    formData.set("bankName", bankName.trim());
    formData.set("bankAccountNo", bankAccountNo.trim());
    formData.set("ifscCode", ifscCode.trim().toUpperCase());
    formData.set("panNumber", panNumber.trim().toUpperCase());
    formData.set("aadhaarNumber", aadhaarNumber.trim());

    // Access Permissions
    formData.set("canManageSettings", String(canManageSettings));
    formData.set("allowedSections", JSON.stringify(selectedSections));

    try {
      const result = await createUser(formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to onboard staff member");
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
              <UserPlus size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Onboard New Staff Member
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Add complete employee record, upload CV & photo, assign salary, role & system access.
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

        {/* Quick Hired Candidate Import Banner */}
        {hiredCandidates.length > 0 && (
          <div 
            style={{ 
              padding: '10px 22px', 
              backgroundColor: '#f0fdf4', 
              borderBottom: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              fontSize: '0.82rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 600 }}>
              <Sparkles size={15} color="#16a34a" />
              <span>Import details from candidate pipeline:</span>
            </div>
            <select
              value={selectedCandidateId}
              onChange={(e) => handleCandidateSelect(e.target.value)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #86efac',
                backgroundColor: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#15803d',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">-- Select Hired Candidate to Auto-fill --</option>
              {hiredCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  🏆 {c.name} ({c.appliedRole || 'Candidate'} - {c.email})
                </option>
              ))}
            </select>
          </div>
        )}

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
            { id: 'docs', label: '3. CV & Bank Details', icon: <FileText size={14} /> },
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

        {/* Form Body with Scroll */}
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
                        width: '74px', 
                        height: '74px', 
                        borderRadius: '50%', 
                        backgroundColor: '#e0e7ff', 
                        border: '2px solid #818cf8',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#4338ca',
                        fontSize: '1.5rem',
                        fontWeight: 700
                      }}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Staff photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        name.charAt(0).toUpperCase() || <Camera size={26} color="#6366f1" />
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
                      JPG, PNG or WEBP (Max 3MB). Appears in avatar and HR records.
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
                        Emergency Contact Person & Relation
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

                {/* Residential Address */}
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
                {/* Department & Role */}
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
                      System Role & Access Tier *
                    </label>
                    <select
                      value={role}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff', fontWeight: 600 }}
                    >
                      <option value="SALES">💼 SALES (CRM, Orders & Follow-ups)</option>
                      <option value="ACCOUNTS">💰 ACCOUNTS (Invoices, Payments & Ledgers)</option>
                      <option value="HR">👥 HR (Payroll, Attendance & Hiring)</option>
                      <option value="DISPATCH">🚚 DISPATCH (Shipping, Logistics & Delivery)</option>
                      <option value="WAREHOUSE">🏬 WAREHOUSE (Stock, Batches & Transfers)</option>
                      <option value="PURCHASE">🛒 PURCHASE (Vendors & Purchase Orders)</option>
                      <option value="MANAGER">👔 MANAGER (Cross-Department Supervision)</option>
                      <option value="SUPPORT">📞 SUPPORT (Customer Calls & Tasks)</option>
                      <option value="ADMIN">🛡️ ADMIN (Department Management)</option>
                      <option value="SUPER_ADMIN">👑 SUPER_ADMIN (Full System Access)</option>
                    </select>
                  </div>
                </div>

                {/* Designation & Employee ID */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      Designation / Job Title
                    </label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Senior Sales Executive / Accountant"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      Employee Code / ID
                    </label>
                    <input
                      type="text"
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      placeholder="e.g. EMP-1045"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 700 }}
                    />
                  </div>
                </div>

                {/* Salary & Joining Date */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      Monthly Basic Salary (₹)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={salary}
                        onChange={(e) => setSalary(e.target.value)}
                        placeholder="e.g. 25000"
                        style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700 }}
                      />
                      <IndianRupee size={15} color="#059669" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                    <span style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                      Automatically feeds into Staff Salaries & Payroll calculation.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      Joining Date
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="date"
                        value={joiningDate}
                        onChange={(e) => setJoiningDate(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                      <Calendar size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 3: CV & BANK DETAILS ─── */}
            {activeTab === 'docs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* CV / Resume Upload Box */}
                <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1.5px dashed #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={16} color="#4f46e5" /> Upload CV / Resume & Documents
                    </span>
                    {resumeFileName && (
                      <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={13} /> {resumeFileName}
                      </span>
                    )}
                  </div>

                  <input
                    ref={cvInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    style={{ display: 'none' }}
                    onChange={handleCVUpload}
                  />

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => cvInputRef.current?.click()}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid #818cf8',
                        backgroundColor: '#eef2ff',
                        color: '#4338ca',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Upload size={14} /> Select CV File (PDF / Word)
                    </button>

                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>or paste URL below:</span>
                  </div>

                  <div style={{ marginTop: '10px' }}>
                    <input
                      type="url"
                      value={resumeUrl.startsWith("data:") ? "" : resumeUrl}
                      onChange={(e) => {
                        setResumeUrl(e.target.value);
                        setResumeFileName(e.target.value ? "External Link" : "");
                      }}
                      placeholder="https://drive.google.com/file/d/... or document cloud link"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', backgroundColor: '#fff' }}
                    />
                  </div>
                </div>

                {/* Bank Account Details */}
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <CreditCard size={16} color="#059669" /> Bank Account & Statutory Info
                  </span>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Bank Name & Branch
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. HDFC Bank, Connaught Place"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Bank Account Number
                      </label>
                      <input
                        type="text"
                        value={bankAccountNo}
                        onChange={(e) => setBankAccountNo(e.target.value)}
                        placeholder="e.g. 50100234567890"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value)}
                        placeholder="e.g. HDFC0001234"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', textTransform: 'uppercase' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        PAN Card Number
                      </label>
                      <input
                        type="text"
                        value={panNumber}
                        onChange={(e) => setPanNumber(e.target.value)}
                        placeholder="e.g. ABCDE1234F"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', textTransform: 'uppercase' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Aadhaar Card Number
                      </label>
                      <input
                        type="text"
                        value={aadhaarNumber}
                        onChange={(e) => setAadhaarNumber(e.target.value)}
                        placeholder="e.g. 1234 5678 9012"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 4: SYSTEM ACCESS & ROLES ─── */}
            {activeTab === 'access' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Security Credentials */}
                <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    Login Password Credentials *
                  </label>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password..."
                        style={{ width: '100%', padding: '9px 36px 9px 34px', borderRadius: '8px', border: '1.5px solid #818cf8', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'monospace' }}
                      />
                      <Lock size={15} color="#818cf8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      style={{
                        padding: '9px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#4f46e5',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Sparkles size={14} /> Auto-Generate
                    </button>
                  </div>
                </div>

                {/* Section Visibility Permissions */}
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <label style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem', margin: 0 }}>
                        Section Access Permissions ({selectedSections.length} of {ALL_SECTIONS.length} Enabled)
                      </label>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                        Check or uncheck which sections this user can access in the navigation bar:
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button type="button" onClick={selectAll} style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Select All</button>
                      <span style={{ color: '#cbd5e1' }}>|</span>
                      <button type="button" onClick={deselectAll} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Deselect All</button>
                      <span style={{ color: '#cbd5e1' }}>|</span>
                      <button type="button" onClick={() => setSelectedSections(getDefaultSectionsForRole(role))} style={{ background: 'none', border: 'none', color: '#059669', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Role Defaults</button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                    {ALL_SECTIONS.map(sec => {
                      const isChecked = selectedSections.includes(sec.id);
                      return (
                        <label 
                          key={sec.id} 
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            padding: '7px 10px',
                            borderRadius: '8px',
                            backgroundColor: isChecked ? '#ffffff' : '#f8fafc',
                            border: isChecked ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => toggleSection(sec.id)}
                            style={{ marginTop: '2px', accentColor: '#10b981', width: '15px', height: '15px' }}
                          />
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: isChecked ? 700 : 500, color: isChecked ? '#0f172a' : '#64748b' }}>{sec.label}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{sec.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Settings Admin Checkbox */}
                <div style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={canManageSettings}
                      onChange={(e) => setCanManageSettings(e.target.checked)}
                      style={{ accentColor: '#4f46e5', width: '18px', height: '18px' }}
                    />
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                        Can Manage System Settings & Access Control
                      </span>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.73rem', color: '#64748b' }}>
                        Allow this staff member to configure company settings, manage user accounts, and view security credentials.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div 
            style={{ 
              padding: '14px 24px', 
              borderTop: '1px solid #e2e8f0', 
              backgroundColor: '#f8fafc', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', gap: '6px' }}>
              {activeTab !== 'profile' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'job') setActiveTab('profile');
                    else if (activeTab === 'docs') setActiveTab('job');
                    else if (activeTab === 'access') setActiveTab('docs');
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#fff',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  ← Back
                </button>
              )}
              {activeTab !== 'access' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'profile') setActiveTab('job');
                    else if (activeTab === 'job') setActiveTab('docs');
                    else if (activeTab === 'docs') setActiveTab('access');
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #818cf8',
                    backgroundColor: '#eef2ff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#4338ca',
                    cursor: 'pointer'
                  }}
                >
                  Next Step →
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                disabled={loading} 
                onClick={onClose} 
                style={{ 
                  padding: '9px 18px', 
                  borderRadius: '8px', 
                  border: '1px solid #cbd5e1', 
                  backgroundColor: '#fff', 
                  cursor: loading ? 'not-allowed' : 'pointer', 
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
                style={{ 
                  padding: '9px 22px', 
                  borderRadius: '8px', 
                  backgroundColor: '#16a34a', 
                  color: '#ffffff', 
                  border: 'none', 
                  fontWeight: 700, 
                  fontSize: '0.875rem', 
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)'
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Onboarding Staff Member...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Complete & Onboard Staff
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
