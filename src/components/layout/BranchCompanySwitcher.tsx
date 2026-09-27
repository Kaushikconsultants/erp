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
  const [newOrgGstin, setNewOrgGstin] = useState('');
  const [newOrgCity, setNewOrgCity] = useState('Rohtak');
  const [newOrgState, setNewOrgState] = useState('Haryana');
  const [newOrgPhone, setNewOrgPhone] = useState('');
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
      gstin: newOrgGstin.trim() || undefined,
      city: newOrgCity.trim() || "Rohtak",
      state: newOrgState.trim() || "Haryana",
      phone: newOrgPhone.trim() || undefined
    });

    setCreatingOrg(false);

    if (res.success) {
      setIsAddOrgModalOpen(false);
      setNewOrgName('');
      setNewOrgTradeName('');
      setNewOrgGstin('');
      loadData();
      if (res.organization?.id) {
        await switchUserOrganization(res.organization.id);
        window.location.reload();
      }
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
              onClick={() => {
                if (onCloseDropdown) onCloseDropdown();
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
                fontWeight: 600,
                cursor: 'pointer'
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
              onClick={() => {
                if (onCloseDropdown) onCloseDropdown();
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
                fontWeight: 600,
                cursor: 'pointer'
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
              <Settings size={12} /> Manage Branches
            </Link>
          </div>
        </div>
      )}

      {/* QUICK ADD BRANCH MODAL */}
      {isAddBranchModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 100050, padding: '12px 8px' }}>
          <div className="modal-content" style={{ maxWidth: '440px', width: '100%', backgroundColor: '#ffffff', borderRadius: '14px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store size={18} style={{ color: '#4f46e5' }} /> Add New Branch
              </h3>
              <button className="modal-close" onClick={() => setIsAddBranchModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleCreateBranch} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {branchModalError && (
                <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.8rem' }}>
                  {branchModalError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delhi Hub / Surat Branch"
                  value={newBranchName}
                  onChange={e => setNewBranchName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Branch Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DEL"
                    value={newBranchCode}
                    onChange={e => setNewBranchCode(e.target.value.toUpperCase())}
                    className="form-input"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. New Delhi"
                    value={newBranchCity}
                    onChange={e => setNewBranchCity(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddBranchModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBranch || !newBranchName.trim()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#4f46e5',
                    color: '#fff',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: creatingBranch ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {creatingBranch ? <Loader2 size={14} className="animate-spin" /> : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD ORGANIZATION / SISTER COMPANY MODAL */}
      {isAddOrgModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 100050, padding: '12px 8px' }}>
          <div className="modal-content" style={{ maxWidth: '480px', width: '100%', backgroundColor: '#ffffff', borderRadius: '14px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} style={{ color: '#4f46e5' }} /> Add Sister Company / Entity
              </h3>
              <button className="modal-close" onClick={() => setIsAddOrgModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleCreateOrganization} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {orgModalError && (
                <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.8rem' }}>
                  {orgModalError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Company Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. R3 TexFab Pvt Ltd"
                  value={newOrgName}
                  onChange={e => setNewOrgName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Trade Name / Brand (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. R3 Glassware"
                  value={newOrgTradeName}
                  onChange={e => setNewOrgTradeName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    GSTIN
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 06AAAAA0000A1Z5"
                    value={newOrgGstin}
                    onChange={e => setNewOrgGstin(e.target.value.toUpperCase())}
                    className="form-input"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rohtak"
                    value={newOrgCity}
                    onChange={e => setNewOrgCity(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddOrgModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingOrg || !newOrgName.trim()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#4f46e5',
                    color: '#fff',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: creatingOrg ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {creatingOrg ? <Loader2 size={14} className="animate-spin" /> : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
