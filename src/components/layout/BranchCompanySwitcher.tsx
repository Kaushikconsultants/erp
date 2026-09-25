"use client";

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Check, 
  Plus, 
  Globe, 
  Store,
  Settings,
  Loader2
} from 'lucide-react';
import { 
  getBranches, 
  setActiveBranch, 
  createBranch, 
  BranchData 
} from '@/app/actions/branchActions';
import Link from 'next/link';

interface BranchCompanySwitcherProps {
  onCloseDropdown?: () => void;
}

export default function BranchCompanySwitcher({ onCloseDropdown }: BranchCompanySwitcherProps = {}) {
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [activeBranchId, setActiveBranchIdState] = useState<string>('ALL');
  const [companyName, setCompanyName] = useState<string>('Company');
  const [loading, setLoading] = useState(true);

  // Quick Add Branch Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchCity, setNewBranchCity] = useState('');
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const branchRes = await getBranches();

    if (branchRes.success) {
      setBranches(branchRes.branches || []);
      setActiveBranchIdState(branchRes.activeBranchId || 'ALL');
      setCompanyName(branchRes.companyName || 'Company');
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

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    setCreatingBranch(true);
    setModalError(null);

    const fd = new FormData();
    fd.set("name", newBranchName.trim());
    fd.set("code", newBranchCode.trim());
    fd.set("city", newBranchCity.trim());

    const res = await createBranch(fd);
    setCreatingBranch(false);

    if (res.success) {
      setIsAddModalOpen(false);
      setNewBranchName('');
      setNewBranchCode('');
      setNewBranchCity('');
      loadData();
    } else {
      setModalError(res.error || "Failed to create branch");
    }
  };

  // Find active branch name
  const activeBranchName = activeBranchId === 'ALL'
    ? 'All Branches'
    : branches.find(b => b.id === activeBranchId)?.name || 'Main Branch';

  return (
    <div className="profile-branch-company-section">
      {/* 1. CURRENT COMPANY */}
      <div style={{
        padding: '10px 16px',
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #f1f5f9',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px'
        }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Company
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 10px',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <Building2 size={16} style={{ color: '#4f46e5', flexShrink: 0 }} />
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {companyName}
          </span>
        </div>
      </div>

      {/* 2. SELECT BRANCH / LOCATION SECTION */}
      <div style={{ padding: '10px 16px 6px 16px' }}>
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

        {/* Branch List Scroll Area */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          overflow: 'hidden',
          maxHeight: '160px',
          overflowY: 'auto'
        }}>
          {/* Option: All Branches */}
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
              cursor: 'pointer',
              transition: 'background-color 0.1s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={14} style={{ color: activeBranchId === 'ALL' ? '#16a34a' : '#64748b', flexShrink: 0 }} />
              <span>All Branches (Consolidated)</span>
            </div>
            {activeBranchId === 'ALL' && <Check size={15} style={{ color: '#16a34a', flexShrink: 0 }} />}
          </button>

          {/* Individual Branches */}
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
                  cursor: 'pointer',
                  transition: 'background-color 0.1s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <Store size={14} style={{ color: isSelected ? '#4f46e5' : '#64748b', flexShrink: 0 }} />
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span>{branch.name}</span>
                    {branch.city && (
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '4px' }}>
                        ({branch.city})
                      </span>
                    )}
                  </div>
                </div>
                {isSelected && <Check size={15} style={{ color: '#4f46e5', flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>

        {/* Footer Actions: Add Branch & Manage */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '8px',
          padding: '2px 4px'
        }}>
          <button
            type="button"
            onClick={() => {
              if (onCloseDropdown) onCloseDropdown();
              setIsAddModalOpen(true);
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
            <Settings size={12} /> Manage
          </Link>
        </div>
      </div>

      {/* QUICK ADD BRANCH MODAL */}
      {isAddModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 100050, padding: '12px 8px' }}>
          <div className="modal-content" style={{ maxWidth: '440px', width: '100%', maxHeight: 'calc(94dvh - 16px)', overflowY: 'auto', backgroundColor: '#ffffff', borderRadius: '14px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store size={18} style={{ color: '#4f46e5' }} /> Add New Branch
              </h3>
              <button className="modal-close" onClick={() => setIsAddModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleCreateBranch} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {modalError && (
                <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.8rem' }}>
                  {modalError}
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
                  onClick={() => setIsAddModalOpen(false)}
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
    </div>
  );
}
