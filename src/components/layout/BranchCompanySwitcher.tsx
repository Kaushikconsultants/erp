"use client";

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Check, 
  Plus, 
  Globe, 
  Store, 
  Settings, 
  Loader2, 
  Layers, 
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { 
  getBranches, 
  setActiveBranch, 
  createBranch, 
  BranchData 
} from '@/app/actions/branchActions';
import { 
  getAllOrganizations, 
  switchUserOrganization, 
  createSisterOrganization 
} from '@/app/actions/tenantActions';
import Link from 'next/link';

interface BranchCompanySwitcherProps {
  onCloseDropdown?: () => void;
}

export default function BranchCompanySwitcher({ onCloseDropdown }: BranchCompanySwitcherProps = {}) {
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [activeBranchId, setActiveBranchIdState] = useState<string>('ALL');
  const [companyName, setCompanyName] = useState<string>('Company');
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Tab State: 'ORGANIZATION' | 'BRANCH'
  const [activeTab, setActiveTab] = useState<'ORGANIZATION' | 'BRANCH'>('ORGANIZATION');

  // Quick Add Branch Modal state
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchCity, setNewBranchCity] = useState('');
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [branchModalError, setBranchModalError] = useState<string | null>(null);

  // Quick Add Organization Modal state
  const [isAddOrgModalOpen, setIsAddOrgModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgTradeName, setNewOrgTradeName] = useState('');
  const [newOrgIndustry, setNewOrgIndustry] = useState('Glassware & Barware Exporter');
  const [newOrgGstin, setNewOrgGstin] = useState('');
  const [newOrgCity, setNewOrgCity] = useState('Firozabad');
  const [newOrgState, setNewOrgState] = useState('Uttar Pradesh');
  const [newOrgPhone, setNewOrgPhone] = useState('');
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [autoSwitchOrg, setAutoSwitchOrg] = useState(true);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgModalError, setOrgModalError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [branchRes, orgRes] = await Promise.all([
        getBranches(),
        getAllOrganizations()
      ]);

      if (branchRes.success) {
        setBranches(branchRes.branches || []);
        setActiveBranchIdState(branchRes.activeBranchId || 'ALL');
        setCompanyName(branchRes.companyName || 'Company');
      }

      if (orgRes.success) {
        setOrganizations(orgRes.organizations || []);
        setActiveOrgId(orgRes.activeOrgId || '');
      }
    } catch (e) {
      console.error("Error loading switcher data:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectBranch = async (branchId: string) => {
    setActiveBranchIdState(branchId);
    if (onCloseDropdown) onCloseDropdown();
    await setActiveBranch(branchId);
    window.location.reload();
  };

  const handleSelectOrganization = async (orgId: string) => {
    if (orgId === activeOrgId) return;
    setActiveOrgId(orgId);
    if (onCloseDropdown) onCloseDropdown();
    const res = await switchUserOrganization(orgId);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error || "Failed to switch organization");
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    setCreatingBranch(true);
    setBranchModalError(null);

    const fd = new FormData();
    fd.set("name", newBranchName.trim());
    fd.set("code", newBranchCode.trim());
    fd.set("city", newBranchCity.trim());

    const res = await createBranch(fd);
    setCreatingBranch(false);

    if (res.success) {
      setIsAddBranchModalOpen(false);
      setNewBranchName('');
      setNewBranchCode('');
      setNewBranchCity('');
      loadData();
    } else {
      setBranchModalError(res.error || "Failed to create branch");
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setCreatingOrg(true);
    setOrgModalError(null);

    const res = await createSisterOrganization({
      companyName: newOrgName.trim(),
      tradeName: newOrgTradeName.trim() || undefined,
      industry: newOrgIndustry || "Glassware & Barware Exporter",
      gstin: newOrgGstin.trim() || undefined,
      city: newOrgCity.trim() || "Firozabad",
      state: newOrgState.trim() || "Uttar Pradesh",
      phone: newOrgPhone.trim() || undefined,
      email: newOrgEmail.trim() || undefined
    });

    setCreatingOrg(false);

    if (res.success) {
      setIsAddOrgModalOpen(false);
      setNewOrgName('');
      setNewOrgTradeName('');
      setNewOrgGstin('');
      setNewOrgPhone('');
      setNewOrgEmail('');
      
      if (autoSwitchOrg && res.organization?.id) {
        await switchUserOrganization(res.organization.id);
      }
      if (onCloseDropdown) onCloseDropdown();
      window.location.reload();
    } else {
      setOrgModalError(res.error || "Failed to create company");
    }
  };

  // Find active branch and org names
  const activeBranchName = activeBranchId === 'ALL'
    ? 'All Branches'
    : branches.find(b => b.id === activeBranchId)?.name || 'Main Branch';

  const currentOrg = organizations.find(o => o.id === activeOrgId) || { name: companyName };

  return (
    <div className="profile-branch-company-section">
      {/* 1. TAB SELECTOR */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        padding: '4px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('ORGANIZATION')}
          style={{
            flex: 1,
            padding: '6px 10px',
            fontSize: '0.74rem',
            fontWeight: 700,
            borderRadius: '6px',
            border: 'none',
            backgroundColor: activeTab === 'ORGANIZATION' ? '#ffffff' : 'transparent',
            color: activeTab === 'ORGANIZATION' ? '#4f46e5' : '#64748b',
            boxShadow: activeTab === 'ORGANIZATION' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}
        >
          <Building2 size={13} />
          <span>Companies ({organizations.length || 1})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BRANCH')}
          style={{
            flex: 1,
            padding: '6px 10px',
            fontSize: '0.74rem',
            fontWeight: 700,
            borderRadius: '6px',
            border: 'none',
            backgroundColor: activeTab === 'BRANCH' ? '#ffffff' : 'transparent',
            color: activeTab === 'BRANCH' ? '#4f46e5' : '#64748b',
            boxShadow: activeTab === 'BRANCH' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}
        >
          <Store size={13} />
          <span>Branches ({branches.length})</span>
        </button>
      </div>

      {/* 2. TAB CONTENT: ORGANIZATIONS */}
      {activeTab === 'ORGANIZATION' && (
        <div style={{ padding: '10px 14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Entity
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#059669', backgroundColor: '#ecfdf5', padding: '1px 6px', borderRadius: '4px' }}>
              Lifetime Active
            </span>
          </div>

          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'hidden',
            maxHeight: '160px',
            overflowY: 'auto'
          }}>
            {organizations.map(org => {
              const isSelected = activeOrgId === org.id;
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => handleSelectOrganization(org.id)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: 'none',
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: isSelected ? '#eef2ff' : 'transparent',
                    color: isSelected ? '#4f46e5' : '#1e293b',
                    fontSize: '0.8rem',
                    fontWeight: isSelected ? 700 : 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <Building2 size={14} style={{ color: isSelected ? '#4f46e5' : '#64748b', flexShrink: 0 }} />
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span>{org.name}</span>
                      {org.city && (
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: '4px' }}>
                          ({org.city})
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check size={14} style={{ color: '#4f46e5', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '8px',
            padding: '2px 2px'
          }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddOrgModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                color: '#4f46e5',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: '4px'
              }}
            >
              <Plus size={13} /> Add Company
            </button>

            <Link
              href="/settings/organization"
              onClick={() => {
                if (onCloseDropdown) onCloseDropdown();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: '#64748b',
                fontSize: '0.76rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <Settings size={12} /> Company Settings
            </Link>
          </div>
        </div>
      )}

      {/* 3. TAB CONTENT: BRANCHES */}
      {activeTab === 'BRANCH' && (
        <div style={{ padding: '10px 14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Branch / Location
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#4f46e5' }}>
              {activeBranchName}
            </span>
          </div>

          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'hidden',
            maxHeight: '160px',
            overflowY: 'auto'
          }}>
            <button
              type="button"
              onClick={() => handleSelectBranch('ALL')}
              style={{
                width: '100%',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: 'none',
                borderBottom: '1px solid #f1f5f9',
                backgroundColor: activeBranchId === 'ALL' ? '#f0fdf4' : 'transparent',
                color: activeBranchId === 'ALL' ? '#166534' : '#1e293b',
                fontSize: '0.8rem',
                fontWeight: activeBranchId === 'ALL' ? 700 : 500,
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={14} style={{ color: activeBranchId === 'ALL' ? '#16a34a' : '#64748b', flexShrink: 0 }} />
                <span>All Branches (Consolidated)</span>
              </div>
              {activeBranchId === 'ALL' && <Check size={14} style={{ color: '#16a34a', flexShrink: 0 }} />}
            </button>

            {branches.map(branch => {
              const isSelected = activeBranchId === branch.id;
              return (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => handleSelectBranch(branch.id)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: 'none',
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: isSelected ? '#eef2ff' : 'transparent',
                    color: isSelected ? '#4f46e5' : '#1e293b',
                    fontSize: '0.8rem',
                    fontWeight: isSelected ? 700 : 500,
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <Store size={14} style={{ color: isSelected ? '#4f46e5' : '#64748b', flexShrink: 0 }} />
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span>{branch.name}</span>
                      {branch.city && (
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: '4px' }}>
                          ({branch.city})
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check size={14} style={{ color: '#4f46e5', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '8px',
            padding: '2px 2px'
          }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddBranchModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                color: '#4f46e5',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: '4px'
              }}
            >
              <Plus size={13} /> Add Branch
            </button>

            <Link
              href="/settings/branches"
              onClick={() => {
                if (onCloseDropdown) onCloseDropdown();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: '#64748b',
                fontSize: '0.76rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <Settings size={12} /> Branch Settings
            </Link>
          </div>
        </div>
      )}

      {/* QUICK ADD BRANCH MODAL */}
      {isAddBranchModalOpen && (
        <div 
          className="modal-backdrop" 
          style={{ zIndex: 1000050, padding: '16px 12px' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsAddBranchModalOpen(false);
              if (onCloseDropdown) onCloseDropdown();
            }
          }}
        >
          <div 
            className="modal-content" 
            style={{ maxWidth: '440px', width: '100%', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                <Store size={18} style={{ color: '#4f46e5' }} /> Add New Branch
              </h3>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => {
                  setIsAddBranchModalOpen(false);
                  if (onCloseDropdown) onCloseDropdown();
                }}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {branchModalError && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.82rem', fontWeight: 500 }}>
                  {branchModalError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delhi Warehouse / Surat Outlet"
                  value={newBranchName}
                  onChange={e => setNewBranchName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Branch Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DEL-01"
                    value={newBranchCode}
                    onChange={e => setNewBranchCode(e.target.value.toUpperCase())}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. New Delhi"
                    value={newBranchCity}
                    onChange={e => setNewBranchCity(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddBranchModalOpen(false);
                    if (onCloseDropdown) onCloseDropdown();
                  }}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.84rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBranch || !newBranchName.trim()}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                    color: '#fff',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: creatingBranch ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  {creatingBranch ? <Loader2 size={15} className="animate-spin" /> : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD ORGANIZATION / SISTER COMPANY MODAL */}
      {isAddOrgModalOpen && (
        <div 
          className="modal-backdrop" 
          style={{ zIndex: 1000050, padding: '16px 12px' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsAddOrgModalOpen(false);
              if (onCloseDropdown) onCloseDropdown();
            }
          }}
        >
          <div 
            className="modal-content" 
            style={{ maxWidth: '520px', width: '100%', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    Add New Company / Entity
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                    Create a sister organization under your ERP group
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => {
                  setIsAddOrgModalOpen(false);
                  if (onCloseDropdown) onCloseDropdown();
                }}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateOrganization} className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {orgModalError && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.82rem', fontWeight: 500 }}>
                  {orgModalError}
                </div>
              )}

              {/* Company Legal Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  Company Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. R3 Exports / R3 Glassware Pvt Ltd"
                  value={newOrgName}
                  onChange={e => setNewOrgName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              {/* Trade Name & Industry Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    Brand / Trade Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. R3 Crystal Barware"
                    value={newOrgTradeName}
                    onChange={e => setNewOrgTradeName(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    Industry / Business
                  </label>
                  <select
                    value={newOrgIndustry}
                    onChange={e => setNewOrgIndustry(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', backgroundColor: '#ffffff' }}
                  >
                    <option value="Glassware & Barware Exporter">Glassware & Barware Exporter</option>
                    <option value="Crystal & Tableware">Crystal & Tableware</option>
                    <option value="Apparel & Garments">Apparel & Garments</option>
                    <option value="Manufacturing & Export">Manufacturing & Export</option>
                    <option value="Trading & Distribution">Trading & Distribution</option>
                    <option value="General Enterprise">General Enterprise</option>
                  </select>
                </div>
              </div>

              {/* GSTIN & State Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 06AAHCE7721Q1Z4"
                    value={newOrgGstin}
                    onChange={e => setNewOrgGstin(e.target.value.toUpperCase())}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', textTransform: 'uppercase' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    Registered State *
                  </label>
                  <select
                    value={newOrgState}
                    onChange={e => setNewOrgState(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', backgroundColor: '#ffffff' }}
                  >
                    <option value="Delhi">Delhi (07)</option>
                    <option value="Uttar Pradesh">Uttar Pradesh (09)</option>
                    <option value="Haryana">Haryana (06)</option>
                    <option value="Gujarat">Gujarat (24)</option>
                    <option value="Maharashtra">Maharashtra (27)</option>
                    <option value="Rajasthan">Rajasthan (08)</option>
                    <option value="Punjab">Punjab (03)</option>
                    <option value="Karnataka">Karnataka (29)</option>
                    <option value="Tamil Nadu">Tamil Nadu (33)</option>
                    <option value="West Bengal">West Bengal (19)</option>
                    <option value="Telangana">Telangana (36)</option>
                    <option value="Andhra Pradesh">Andhra Pradesh (37)</option>
                    <option value="Kerala">Kerala (32)</option>
                    <option value="Madhya Pradesh">Madhya Pradesh (23)</option>
                  </select>
                </div>
              </div>

              {/* City & Contact Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Firozabad / Delhi"
                    value={newOrgCity}
                    onChange={e => setNewOrgCity(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    Mobile / Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={newOrgPhone}
                    onChange={e => setNewOrgPhone(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Auto Switch Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '2px' }}>
                <input
                  type="checkbox"
                  id="autoSwitchOrg"
                  checked={autoSwitchOrg}
                  onChange={e => setAutoSwitchOrg(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#4f46e5', cursor: 'pointer' }}
                />
                <label htmlFor="autoSwitchOrg" style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600, cursor: 'pointer' }}>
                  Switch active ERP session to this company immediately
                </label>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOrgModalOpen(false);
                    if (onCloseDropdown) onCloseDropdown();
                  }}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.84rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingOrg || !newOrgName.trim()}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                    color: '#fff',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: creatingOrg ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  {creatingOrg ? <Loader2 size={16} className="animate-spin" /> : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
