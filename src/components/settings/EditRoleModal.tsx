"use client";

import React, { useState } from 'react';
import { X, Shield, Trash2 } from 'lucide-react';
import { updateRole, deleteRole } from '@/app/actions/roleActions';
import { PERMISSION_GROUPS } from './CreateRoleModal';

interface EditRoleModalProps {
  role: {
    id: string;
    name: string;
    permissions: string;
    _count?: { users: number };
  };
  onClose: () => void;
}

export default function EditRoleModal({ role, onClose }: EditRoleModalProps) {
  const initialPerms: string[] = (() => {
    try {
      return JSON.parse(role.permissions || '[]');
    } catch {
      return [];
    }
  })();

  const [roleName, setRoleName] = useState(role.name);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(initialPerms);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleTogglePermission = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission) 
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSelectGroup = (groupPerms: string[]) => {
    const allSelected = groupPerms.every(p => selectedPermissions.includes(p));
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(p => !groupPerms.includes(p)));
    } else {
      setSelectedPermissions(prev => Array.from(new Set([...prev, ...groupPerms])));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      setError("Role name is required.");
      return;
    }
    if (selectedPermissions.length === 0) {
      setError("Please select at least one permission.");
      return;
    }

    setLoading(true);
    setError('');

    const res = await updateRole(role.id, { name: roleName.trim(), permissions: selectedPermissions });
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || "Failed to update role.");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete role "${role.name}"?`)) return;
    setDeleting(true);
    const res = await deleteRole(role.id);
    setDeleting(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || "Failed to delete role.");
    }
  };

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: '#4f46e5', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Edit Role: {role.name}</h2>
              <p style={{ fontSize: '0.78rem', margin: '2px 0 0', color: '#64748b' }}>Modify permissions policy for this role</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#94a3b8', cursor: 'pointer' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>{error}</div>}
          
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
              Role Name *
            </label>
            <input 
              type="text" 
              value={roleName}
              onChange={e => setRoleName(e.target.value)}
              required
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                Permissions Matrix ({selectedPermissions.length} selected)
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {PERMISSION_GROUPS.map((group, gIdx) => {
                const groupPermIds = group.permissions.map(p => p.id);
                const allSelected = groupPermIds.every(p => selectedPermissions.includes(p));

                return (
                  <div key={gIdx} style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                        {group.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectGroup(groupPermIds)}
                        style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {allSelected ? 'Deselect Group' : 'Select All'}
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                      {group.permissions.map(p => {
                        const isChecked = selectedPermissions.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              backgroundColor: isChecked ? '#eff6ff' : '#ffffff',
                              border: `1px solid ${isChecked ? '#93c5fd' : '#cbd5e1'}`,
                              cursor: 'pointer'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(p.id)}
                              style={{ marginTop: '2px', accentColor: '#2563eb' }}
                            />
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isChecked ? '#1d4ed8' : '#334155' }}>
                                {p.id}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                {p.desc}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
            <div>
              {role._count?.users === 0 && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #fecdd3', backgroundColor: '#fff1f2', color: '#e11d48', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  <Trash2 size={14} /> {deleting ? 'Deleting...' : 'Delete Role'}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                onClick={onClose}
                style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                style={{ padding: '8px 22px', borderRadius: '8px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? "Saving..." : "Update Role"}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
