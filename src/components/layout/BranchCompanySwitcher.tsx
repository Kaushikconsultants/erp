"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  ChevronDown, 
  Check, 
  Plus, 
  MapPin, 
  Settings, 
  Globe, 
  Building, 
  Store,
  X,
  Loader2
} from 'lucide-react';
import { 
  getBranches, 
  setActiveBranch, 
  createBranch, 
  BranchData, 
  getUserOrganizations, 
  switchUserOrganization 
} from '@/app/actions/branchActions';
import Link from 'next/link';

export default function BranchCompanySwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [activeBranchId, setActiveBranchIdState] = useState<string>('ALL');
  const [companyName, setCompanyName] = useState<string>('Company');
  const [organizations, setOrganizations] = useState<{ id: string; name: string; isCurrent: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Add Branch Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchCity, setNewBranchCity] = useState('');
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    const [branchRes, orgRes] = await Promise.all([
      getBranches(),
      getUserOrganizations()
    ]);

    if (branchRes.success) {
      setBranches(branchRes.branches || []);
      setActiveBranchIdState(branchRes.activeBranchId || 'ALL');
      setCompanyName(branchRes.companyName || 'Company');
    }

    if (orgRes.success) {
      setOrganizations(orgRes.organizations || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectBranch = async (branchId: string) => {
    setActiveBranchIdState(branchId);
    setIsOpen(false);
    await setActiveBranch(branchId);
    window.location.reload();
  };

  const handleSwitchOrg = async (orgId: string) => {
    setIsOpen(false);
    await switchUserOrganization(orgId);
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
    <div className="branch-company-switcher" ref={containerRef} style={{ position: 'relative' }}>
      {/* TRIGGER PILL */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '20px',
          backgroundColor: '#f1f5f9',
          border: '1px solid #e2e8f0',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#1e293b',
          transition: 'all 0.15s ease',
          maxWidth: '240px'
        }}
      >
        <Building2 size={15} style={{ color: '#4f46e5', flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {companyName} • <span style={{ color: '#4f46e5' }}>{activeBranchName}</span>
        </span>
        <ChevronDown size={14} style={{ color: '#64748b', flexShrink: 0 }} />
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          width: '320px',
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0',
          zIndex: 10000,
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out'
        }}>
          {/* Company Section Header */}
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={16} style={{ color: '#4f46e5' }} />
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  ACTIVE COMPANY
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                  {companyName}
                </div>
              </div>
            </div>

            {organizations.length > 1 && (
              <select
                value={organizations.find(o => o.isCurrent)?.id}
                onChange={e => handleSwitchOrg(e.target.value)}
                style={{
                  fontSize: '0.74rem',
                  padding: '4px 6px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#4f46e5',
                  fontWeight: 600
                }}
              >
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Branch List */}
          <div style={{ padding: '8px 0', maxHeight: '260px', overflowY: 'auto' }}>
            <div style={{ padding: '4px 16px 8px', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Select Branch / Location
            </div>

            {/* Option: All Branches */}
            <button
              type="button"
              onClick={() => handleSelectBranch('ALL')}
              style={{
                width: '100%',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: 'none',
                backgroundColor: activeBranchId === 'ALL' ? '#f0fdf4' : 'transparent',
                color: activeBranchId === 'ALL' ? '#166534' : '#1e293b',
                fontSize: '0.82rem',
                fontWeight: activeBranchId === 'ALL' ? 700 : 500,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background-color 0.1s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={15} style={{ color: activeBranchId === 'ALL' ? '#16a34a' : '#64748b' }} />
                <span>All Branches (Consolidated)</span>
              </div>
              {activeBranchId === 'ALL' && <Check size={16} style={{ color: '#16a34a' }} />}
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
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: 'none',
                    backgroundColor: isSelected ? '#eef2ff' : 'transparent',
                    color: isSelected ? '#4f46e5' : '#1e293b',
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? 700 : 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <Store size={15} style={{ color: isSelected ? '#4f46e5' : '#64748b', flexShrink: 0 }} />
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span>{branch.name}</span>
                      {branch.city && (
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '6px' }}>
                          ({branch.city})
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check size={16} style={{ color: '#4f46e5', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>

          {/* Switcher Footer */}
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsAddModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                color: '#4f46e5',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Plus size={14} /> Add Branch
            </button>

            <Link
              href="/settings/branches"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: '#64748b',
                fontSize: '0.78rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <Settings size={13} /> Manage
            </Link>
          </div>
        </div>
      )}

      {/* QUICK ADD BRANCH MODAL */}
      {isAddModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 100050 }}>
          <div className="modal-content" style={{ maxWidth: '440px', width: '100%', backgroundColor: '#ffffff', borderRadius: '14px' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
