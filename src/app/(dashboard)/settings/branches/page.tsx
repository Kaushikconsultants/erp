"use client";

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Store, 
  Plus, 
  MapPin, 
  Phone, 
  Users, 
  Package, 
  Edit, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Building,
  ArrowRight
} from 'lucide-react';
import { 
  getBranches, 
  createBranch, 
  updateBranch, 
  deleteBranch, 
  BranchData, 
  setActiveBranch 
} from '@/app/actions/branchActions';

export default function BranchesSettingsPage() {
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>('ALL');
  const [companyName, setCompanyName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT' | null>(null);
  const [editingBranch, setEditingBranch] = useState<BranchData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });

  const loadData = async () => {
    setLoading(true);
    const res = await getBranches();
    if (res.success) {
      setBranches(res.branches || []);
      setActiveBranchId(res.activeBranchId || 'ALL');
      setCompanyName(res.companyName || 'Company');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingBranch(null);
    setFormData({
      name: '',
      code: '',
      phone: '',
      address: '',
      city: '',
      state: 'Haryana',
      pincode: ''
    });
    setErrorMsg(null);
    setModalMode('CREATE');
  };

  const openEditModal = (branch: BranchData) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name || '',
      code: branch.code || '',
      phone: branch.phone || '',
      address: branch.address || '',
      city: branch.city || '',
      state: branch.state || 'Haryana',
      pincode: branch.pincode || ''
    });
    setErrorMsg(null);
    setModalMode('EDIT');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const fd = new FormData();
    Object.entries(formData).forEach(([key, val]) => fd.set(key, val));

    let res: any;
    if (modalMode === 'CREATE') {
      res = await createBranch(fd);
    } else if (modalMode === 'EDIT' && editingBranch) {
      res = await updateBranch(editingBranch.id, fd);
    }

    setIsSubmitting(false);

    if (res?.success) {
      setSuccessMsg(modalMode === 'CREATE' ? 'Branch created successfully!' : 'Branch updated successfully!');
      setModalMode(null);
      loadData();
      setTimeout(() => setSuccessMsg(null), 3500);
    } else {
      setErrorMsg(res?.error || 'Operation failed');
    }
  };

  const handleDelete = async (branch: BranchData) => {
    if (!confirm(`Are you sure you want to delete branch "${branch.name}"?`)) return;

    const res = await deleteBranch(branch.id);
    if (res.success) {
      setSuccessMsg(`Branch "${branch.name}" deleted.`);
      loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      alert(res.error || "Failed to delete branch");
    }
  };

  const handleSetActive = async (branchId: string) => {
    setActiveBranchId(branchId);
    await setActiveBranch(branchId);
    window.location.reload();
  };

  return (
    <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
      
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#e0e7ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Store size={20} />
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Multi-Company & Branch Management
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b' }}>
            Configure and manage physical branches, hubs, and multi-location operations under <strong>{companyName}</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.86rem',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
          }}
        >
          <Plus size={16} /> Add New Branch
        </button>
      </div>

      {/* TOAST SUCCESS */}
      {successMsg && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          fontSize: '0.84rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} color="#059669" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* BRANCH CARDS GRID */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
          <span>Loading branch network...</span>
        </div>
      ) : branches.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1'
        }}>
          <Store size={36} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#1e293b' }}>No Branches Found</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#64748b' }}>
            Add your primary head office and branches to organize sales reps, customers, and warehouses.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            + Create First Branch
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {branches.map(branch => {
            const isCurrentActive = activeBranchId === branch.id;
            return (
              <div
                key={branch.id}
                className="glass-panel"
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  border: `2px solid ${isCurrentActive ? '#4f46e5' : '#e2e8f0'}`,
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  position: 'relative'
                }}
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: isCurrentActive ? '#eef2ff' : '#f8fafc',
                        color: isCurrentActive ? '#4f46e5' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #e2e8f0'
                      }}>
                        <Store size={22} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                          {branch.name}
                        </h3>
                        {branch.code && (
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#e0e7ff',
                            color: '#4338ca',
                            marginTop: '2px'
                          }}>
                            CODE: {branch.code}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(branch)}
                        title="Edit Branch"
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(branch)}
                        title="Delete Branch"
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Location info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                      <span>{branch.address || `${branch.city || 'City'}, ${branch.state || 'State'} ${branch.pincode || ''}`}</span>
                    </div>
                    {branch.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                        <span>{branch.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Branch Stats */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    padding: '10px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9',
                    marginBottom: '16px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>CUSTOMERS</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                        {branch._count?.customers || 0}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>STAFF</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                        {branch._count?.employees || 0}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>WAREHOUSES</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                        {branch._count?.warehouses || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div>
                  {isCurrentActive ? (
                    <div style={{
                      padding: '8px',
                      borderRadius: '8px',
                      backgroundColor: '#eef2ff',
                      color: '#4f46e5',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}>
                      <CheckCircle2 size={15} /> Active Workspace Branch
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetActive(branch.id)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#334155',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Switch to this Branch
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT BRANCH MODAL */}
      {modalMode && (
        <div className="modal-backdrop" style={{ zIndex: 100050 }}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '100%', backgroundColor: '#ffffff', borderRadius: '14px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store size={20} style={{ color: '#4f46e5' }} />
                {modalMode === 'CREATE' ? 'Add New Branch' : `Edit Branch "${editingBranch?.name}"`}
              </h3>
              <button className="modal-close" onClick={() => setModalMode(null)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {errorMsg && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.84rem' }}>
                  {errorMsg}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohtak Head Office / Delhi Distribution Hub"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Branch Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HO / DEL / MUM"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Street Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sco 71A, Ashoka Plaza, Delhi Road"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 0.8fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rohtak"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    State
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Haryana"
                    value={formData.state}
                    onChange={e => setFormData({ ...formData, state: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Pincode
                  </label>
                  <input
                    type="text"
                    placeholder="124001"
                    value={formData.pincode}
                    onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.84rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#4f46e5',
                    color: '#fff',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    modalMode === 'CREATE' ? 'Create Branch' : 'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
