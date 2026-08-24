"use client";

import React, { useState } from 'react';
import { Map, Plus, Edit2, Trash2, X, CheckCircle2, Loader2, Search } from 'lucide-react';
import { createTerritory, updateTerritory, deleteTerritory } from '@/app/actions/territoryActions';

interface TerritoryItem {
  id: string;
  name: string;
  pincodes?: string | null;
  description?: string | null;
  _count?: {
    customers: number;
  };
}

export default function TerritoryManagerClient({ initialTerritories }: { initialTerritories: TerritoryItem[] }) {
  const [territories, setTerritories] = useState<TerritoryItem[]>(initialTerritories);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    pincodes: "",
    description: ""
  });

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedId(null);
    setFormData({ name: "", pincodes: "", description: "" });
    setErrorMsg("");
    setSuccessMsg("");
    setIsModalOpen(true);
  };

  const openEditModal = (t: TerritoryItem) => {
    setIsEditing(true);
    setSelectedId(t.id);
    setFormData({
      name: t.name,
      pincodes: t.pincodes || "",
      description: t.description || ""
    });
    setErrorMsg("");
    setSuccessMsg("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("Territory Name is required");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (isEditing && selectedId) {
      const res = await updateTerritory(selectedId, formData);
      if (res.success && res.territory) {
        setTerritories(prev => prev.map(t => t.id === selectedId ? { ...t, ...res.territory } : t));
        setSuccessMsg("Territory updated successfully!");
        setTimeout(() => setIsModalOpen(false), 600);
      } else {
        setErrorMsg(res.error || "Failed to update territory");
      }
    } else {
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("pincodes", formData.pincodes);
      fd.append("description", formData.description);

      const res = await createTerritory(fd);
      if (res.success && res.territory) {
        setTerritories(prev => [res.territory, ...prev]);
        setSuccessMsg("Territory created successfully!");
        setTimeout(() => setIsModalOpen(false), 600);
      } else {
        setErrorMsg(res.error || "Failed to create territory");
      }
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    const res = await deleteTerritory(id);
    if (res.success) {
      setTerritories(prev => prev.filter(t => t.id !== id));
    } else {
      alert(res.error || "Failed to delete territory");
    }
  };

  const filtered = territories.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.pincodes && t.pincodes.toLowerCase().includes(search.toLowerCase())) ||
    (t.description && t.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search territories or pincodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
          />
        </div>

        <button 
          onClick={openCreateModal}
          className="primary-btn" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '8px', fontWeight: 600 }}
        >
          <Plus size={16} /> Add Territory
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%', margin: 0 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '12px 16px' }}>Territory Name</th>
                <th style={{ padding: '12px 16px' }}>Covered Pincodes</th>
                <th style={{ padding: '12px 16px' }}>Description</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Customers</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Map size={16} color="#4f46e5" />
                      {t.name}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem', maxWidth: '280px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                      {t.pincodes || 'All Pincodes'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                    {t.description || '-'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#2563eb' }}>
                    {t._count?.customers || 0}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => openEditModal(t)}
                        style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', cursor: 'pointer' }}
                        title="Edit Territory"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        style={{ padding: '6px', borderRadius: '6px', border: '1px solid #fecdd3', backgroundColor: '#fff1f2', color: '#e11d48', cursor: 'pointer' }}
                        title="Delete Territory"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    No territories found. Click <strong>+ Add Territory</strong> to create your first sales region.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {isEditing ? "Edit Territory" : "Add New Territory"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {errorMsg && <div className="alert-error" style={{ marginBottom: '16px' }}>{errorMsg}</div>}
            {successMsg && <div className="alert-success" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={16} /> {successMsg}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Territory Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. North Delhi, Maharashtra West"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Covered Pincodes (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 110001, 110002, 110005"
                  value={formData.pincodes}
                  onChange={e => setFormData({ ...formData, pincodes: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Description / Notes
                </label>
                <textarea
                  placeholder="Optional regional notes..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="primary-btn"
                  style={{ padding: '9px 20px', borderRadius: '8px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  {loading ? <Loader2 size={16} className="spinner" /> : isEditing ? "Update Territory" : "Create Territory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
